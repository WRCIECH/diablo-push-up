import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';

// ── Layout constants (exported for reuse in DungeonScreen minimap) ───────────
export const ROOM = 14;  // room square size (px)
export const COL  = 20;  // horizontal space per leaf slot — gap 6px, HIT 2px each side = no overlap
export const ROW  = 40;  // vertical space between depth levels
export const PAD  = 20;  // SVG padding on all sides

// ── Tree layout ───────────────────────────────────────────────────────────────
// Two-pass algorithm:
//   1. Assign x to leaf nodes left-to-right (DFS order)
//   2. Center each parent over the span of its outermost children (bottom-up)

export function computeLayout(nodes, rootId) {
  const pos = {};
  let leafIdx = 0;

  function placeLeaves(id) {
    const node = nodes[id];
    if (node.childrenIds.length === 0) {
      pos[id] = { x: leafIdx * COL, y: node.depth * ROW };
      leafIdx++;
      return;
    }
    for (const cid of node.childrenIds) placeLeaves(cid);
  }

  function placeParents(id) {
    const node = nodes[id];
    if (node.childrenIds.length === 0) return;
    for (const cid of node.childrenIds) placeParents(cid);
    const xs = node.childrenIds.map(cid => pos[cid].x);
    pos[id] = { x: (xs[0] + xs[xs.length - 1]) / 2, y: node.depth * ROW };
  }

  placeLeaves(rootId);
  placeParents(rootId);
  return pos;
}

// ── Fog of war ────────────────────────────────────────────────────────────────
// full   → player has been here
// dim    → adjacent to a visited node (exits seen but room not entered)
// hidden → not yet reachable from explored area

export function getVis(node, nodes) {
  if (node.visited) return 'full';
  if (node.parentId && nodes[node.parentId]?.visited) return 'dim';
  return 'hidden';
}

// ── Room colours ──────────────────────────────────────────────────────────────

function roomStyle(node, isCurrent, vis) {
  if (isCurrent)    return { fill: '#2a1e06', stroke: '#f0c040', sw: 1.5 };
  if (vis === 'dim') return { fill: '#0c0906', stroke: '#201812', sw: 0.8 };

  // Entrance and stairs keep their own colours; everything else visited = green
  switch (node.type) {
    case 'entrance': return { fill: '#1e1408', stroke: '#c4991e', sw: 1.2 };
    case 'level':    return { fill: '#141008', stroke: '#7a5a10', sw: 1 };
    default:         return { fill: '#071407', stroke: '#2a7a2a', sw: 1 };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────
// Props:
//   onClose     – when present, renders as a full-screen overlay with a close button
//   inline      – when true, renders as a normal flex block (no fixed positioning)
//   onNavigate  – called with nodeId when player clicks an adjacent child node
//   onBack      – called when player clicks the parent node

export default function DungeonMap({ dungeon, onClose, inline, onNavigate, onBack }) {
  const { nodes, rootId, currentNodeId } = dungeon;

  const pos = useMemo(() => computeLayout(nodes, rootId), [nodes, rootId]);

  // Compute SVG viewport
  const allPos = useMemo(() => Object.values(pos), [pos]);
  const minX   = Math.min(...allPos.map(p => p.x));
  const maxX   = Math.max(...allPos.map(p => p.x));
  const maxY   = Math.max(...allPos.map(p => p.y));
  const ox     = -minX + PAD;   // x offset so everything is inside padding
  const svgW   = maxX - minX + ROOM + PAD * 2;
  const svgH   = maxY        + ROOM + PAD * 2;

  // Pan + zoom state
  const containerRef   = useRef(null);
  const [pan, setPan]  = useState({ x: 0, y: 0 });
  const [zoom, _setZoom] = useState(1);
  const zoomRef        = useRef(1);          // always-current zoom for use in callbacks
  const dragging       = useRef(false);
  const lastPt         = useRef({ x: 0, y: 0 });
  const activePointers = useRef({});         // pointerId → {x,y}
  const lastPinchDist  = useRef(null);

  function setZoom(z) { zoomRef.current = z; _setZoom(z); }

  // Re-centre (and reset zoom) whenever the player moves to a new node
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !pos[currentNodeId]) return;
    const { width, height } = el.getBoundingClientRect();
    const cx = pos[currentNodeId].x + ox + ROOM / 2;
    const cy = pos[currentNodeId].y       + ROOM / 2 + PAD;
    setPan({ x: width / 2 - cx, y: height / 2 - cy });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // All visited rooms (except current) are clickable — player can jump to any visited location
  const clickableIds = useMemo(() => {
    const ids = new Set();
    // Fast-travel: any previously visited room
    for (const [id, node] of Object.entries(nodes)) {
      if (node.visited && id !== currentNodeId) ids.add(id);
    }
    // Explore: unvisited children of current node (adjacent, not yet entered)
    for (const childId of (nodes[currentNodeId]?.childrenIds ?? [])) {
      if (!nodes[childId]?.visited) ids.add(childId);
    }
    return ids;
  }, [nodes, currentNodeId]);

  function handleNodeClick(node) {
    onNavigate?.(node.id);
  }

  const isNavMode = !!onNavigate;

  // Mouse-wheel zoom (desktop) — zooms toward cursor position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = e => {
      e.preventDefault();
      const rect   = el.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const next   = Math.min(Math.max(zoomRef.current * factor, 0.25), 5);
      const ratio  = next / zoomRef.current;
      setPan(p => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
      setZoom(next);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer handlers — single finger: drag-to-pan; two fingers: pinch-to-zoom
  const onDown = useCallback(e => {
    activePointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (Object.keys(activePointers.current).length === 1) {
      dragging.current = true;
      lastPt.current = { x: e.clientX, y: e.clientY };
    } else {
      dragging.current = false;
      const pts = Object.values(activePointers.current);
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const onMove = useCallback(e => {
    activePointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const pts = Object.values(activePointers.current);

    if (pts.length === 2) {
      const dx   = pts[0].x - pts[1].x;
      const dy   = pts[0].y - pts[1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current > 0) {
        const factor = dist / lastPinchDist.current;
        const cx     = (pts[0].x + pts[1].x) / 2;
        const cy     = (pts[0].y + pts[1].y) / 2;
        const el     = containerRef.current;
        if (el) {
          const rect  = el.getBoundingClientRect();
          const mx    = cx - rect.left;
          const my    = cy - rect.top;
          const next  = Math.min(Math.max(zoomRef.current * factor, 0.25), 5);
          const ratio = next / zoomRef.current;
          setPan(p => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
          setZoom(next);
        }
      }
      lastPinchDist.current = dist;
    } else if (pts.length === 1 && dragging.current) {
      const dx = e.clientX - lastPt.current.x;
      const dy = e.clientY - lastPt.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPt.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onUp = useCallback(e => {
    delete activePointers.current[e.pointerId];
    const remaining = Object.keys(activePointers.current);
    if (remaining.length === 0) {
      dragging.current = false;
      lastPinchDist.current = null;
    } else if (remaining.length === 1) {
      const pt = activePointers.current[remaining[0]];
      lastPt.current = { x: pt.x, y: pt.y };
      dragging.current = true;
      lastPinchDist.current = null;
    }
  }, []);

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);

  // Stats for header
  const totalRooms   = nodeList.length - 1; // exclude entrance
  const visitedRooms = nodeList.filter(n => n.visited && n.type !== 'entrance').length;
  const clearedFights = nodeList.filter(n => n.type === 'fight' && n.defeated).length;
  const remainFights  = nodeList.filter(n => n.type === 'fight' && !n.defeated && n.visited).length;


  return (
    <div style={{
      ...(inline ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
                 : { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.93)',
                     display: 'flex', flexDirection: 'column' }),
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '8px 14px', flexShrink: 0,
        borderBottom: '1px solid var(--border-dark)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {visitedRooms}/{totalRooms} explored
          {clearedFights > 0 && ` · ${clearedFights} slain`}
          {isNavMode && <span style={{ fontStyle: 'italic' }}> · tap any visited room</span>}
          {!isNavMode && <span style={{ fontStyle: 'italic' }}> · drag to pan</span>}
        </div>
        {onClose && (
          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                  onClick={onClose}>
            Close ✕
          </button>
        )}
      </div>

      {/* ── Map canvas ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative',
                 cursor: 'grab', touchAction: 'none', background: '#050402' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div style={{
          position: 'absolute',
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}>
          <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>

            {/* ── Corridors (drawn beneath rooms) ── */}
            {nodeList.map(node => {
              if (!node.parentId) return null;
              const parent = nodes[node.parentId];
              if (!parent.visited) return null; // corridor only visible once you've been in parent

              const vis = getVis(node, nodes);
              const isDim = vis === 'dim';

              // L-shaped path: down from parent, across, down to child
              const px  = pos[node.parentId].x + ox + ROOM / 2;
              const py  = pos[node.parentId].y       + ROOM + PAD;
              const cx  = pos[node.id].x       + ox + ROOM / 2;
              const cy  = pos[node.id].y             + PAD;
              const mid = (py + cy) / 2;

              return (
                <path
                  key={`c-${node.id}`}
                  d={`M${px},${py} L${px},${mid} L${cx},${mid} L${cx},${cy}`}
                  fill="none"
                  stroke={isDim ? '#1c1610' : '#3a2e1c'}
                  strokeWidth="2"
                />
              );
            })}

            {/* ── Rooms ── */}
            {nodeList.map(node => {
              const vis = getVis(node, nodes);
              if (vis === 'hidden') return null;

              const isCurrent   = node.id === currentNodeId;
              const isAdjacent  = isNavMode && clickableIds.has(node.id);
              const rx = pos[node.id].x + ox;
              const ry = pos[node.id].y      + PAD;
              const { fill, stroke, sw } = roomStyle(node, isCurrent, vis);

              // Larger invisible hit area for adjacent nodes (tap target)
              const HIT = 2;  // 2px extension each side — 14+4=18px total, 2px gap to next node (no overlap)

              return (
                <g key={`r-${node.id}`}
                   style={{ cursor: isAdjacent ? 'pointer' : 'default' }}>
                  {/* Outer glow for current node */}
                  {isCurrent && (
                    <rect x={rx - 5} y={ry - 5} width={ROOM + 10} height={ROOM + 10} rx="5"
                          fill="#c4991e" opacity="0.18"/>
                  )}
                  {/* Room square */}
                  <rect x={rx} y={ry} width={ROOM} height={ROOM} rx="2"
                        fill={fill} stroke={stroke} strokeWidth={sw}/>
                  {/* Red dot = enemy present (dim when unvisited but adjacent, bright when visited) */}
                  {node.type === 'fight' && !node.defeated && vis !== 'hidden' && (
                    <circle cx={rx + ROOM/2} cy={ry + ROOM/2} r="1.8" fill="#cc2222"
                            opacity={vis === 'dim' ? 0.55 : 1}/>
                  )}
                  {/* Stairs glyph */}
                  {vis === 'full' && node.type === 'level' && (
                    <text x={rx + ROOM/2} y={ry + ROOM/2 + 2.5}
                          textAnchor="middle" fontSize="7" fill="#c4991e">𓊍</text>
                  )}
                  {/* Current position marker */}
                  {isCurrent && (
                    <circle cx={rx + ROOM/2} cy={ry + ROOM/2} r="2.8" fill="#f0c040"/>
                  )}
                  {/* Hit target: stops pointer capture so onClick fires */}
                  {isAdjacent && (
                    <rect x={rx - HIT} y={ry - HIT} width={ROOM + HIT*2} height={ROOM + HIT*2}
                          fill="transparent"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={() => handleNodeClick(node)}/>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: '10px 16px', flexShrink: 0,
        borderTop: '1px solid var(--border-dark)',
        display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        {[
          { color: '#f0c040', border: '#f0c040', label: 'You are here', dot: null },
          { color: '#071407', border: '#2a7a2a', label: 'Visited',       dot: null },
          { color: '#071407', border: '#2a7a2a', label: 'Enemy inside',  dot: '#cc2222' },
          { color: '#141008', border: '#7a5a10', label: 'Stairs ↓',      dot: null },
          { color: '#0c0906', border: '#201812', label: 'Unseen',        dot: null },
        ].map(({ color, border, label, dot }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: 9, height: 9, flexShrink: 0, borderRadius: '2px',
              background: color, border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {dot && <div style={{ width: 3, height: 3, borderRadius: '50%', background: dot }}/>}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

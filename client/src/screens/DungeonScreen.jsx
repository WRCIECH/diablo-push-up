import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useMusic } from '../hooks/useMusic.js';
import {
  getChildDescription,
  getArrivalMessage,
  getLevelDef,
  depthLabel,
  nodeIcon,
} from '../utils/dungeon.js';

const DIRECTIONS = ['Left', 'Forward', 'Right'];

// ── Colour coding per node type ───────────────────────────────────────────────

function nodeButtonStyle(node) {
  const base = {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    padding: '12px 14px', width: '100%', textAlign: 'left',
    borderRadius: '2px', cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)',
    transition: 'all 0.15s ease',
  };
  if (node.type === 'fight' && !node.defeated) {
    return { ...base, background: 'rgba(100,0,0,0.25)', boxShadow: '0 0 0 1px #5a1010' };
  }
  if (node.type === 'fight' && node.defeated) {
    return { ...base, background: 'rgba(30,30,30,0.5)', boxShadow: '0 0 0 1px var(--border-dark)', opacity: 0.65 };
  }
  if (node.type === 'level') {
    return { ...base, background: 'rgba(100,80,0,0.2)', boxShadow: '0 0 0 1px var(--border-mid)' };
  }
  return { ...base, background: 'var(--bg-input)', boxShadow: '0 0 0 1px var(--border-dark)' };
}

function nodeIconColor(node) {
  if (node.type === 'fight' && !node.defeated) return 'var(--red-text)';
  if (node.type === 'fight' &&  node.defeated) return 'var(--green-text)';
  if (node.type === 'level')   return 'var(--text-gold)';
  if (node.cryptic)            return 'var(--text-dim)';
  return 'var(--text-dim)';
}

// ── Intro screen ──────────────────────────────────────────────────────────────

function IntroScreen({ introText, levelName, onProceed }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', gap: '12px' }}>
      <div className="panel panel-gold" style={{ padding: '16px', textAlign: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: '20px' }}>Cathedral Level 1</div>
        <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.12em', marginTop: '4px' }}>
          {levelName?.toUpperCase() || 'LEVEL 1'}
        </div>
      </div>

      <div className="panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="text-flavor" style={{ fontSize: '14px', lineHeight: 2, textAlign: 'center' }}>
          {introText}
        </div>
      </div>

      <button
        className="btn btn-primary btn-full"
        style={{ fontSize: '14px', padding: '16px', flexShrink: 0 }}
        onClick={onProceed}
      >
        Descend into darkness
      </button>
    </div>
  );
}

// ── Main dungeon navigation ───────────────────────────────────────────────────

export default function DungeonScreen() {
  useMusic(null);   // stop Tristram music on dungeon entry
  const { state, dispatchAndSave, setScreen, gameData } = useGame();
  const dungeon = state.dungeon;

  const [phase, setPhase]           = useState('loading');
  const [arrivalMsg, setArrivalMsg] = useState(null);
  const [levelConfirm, setLevelConfirm] = useState(false);

  const currentNode = dungeon?.nodes[dungeon?.currentNodeId];
  const levelDef    = getLevelDef(dungeon?.levelId, gameData?.locations);

  // ── On mount: decide initial phase ───────────────────────────────────────

  useEffect(() => {
    if (!dungeon || !currentNode) return;

    // Resume mid-fight if app was closed during one
    if (currentNode.type === 'fight' && !currentNode.defeated) {
      setScreen('fight_pre');
      return;
    }

    if (!dungeon.introShown) {
      setPhase('intro');
    } else {
      setPhase('navigating');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation handler ───────────────────────────────────────────────────

  const navigateTo = useCallback((nodeId) => {
    const target = dungeon.nodes[nodeId];
    if (!target) return;

    setLevelConfirm(false);
    dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId } });

    if (target.type === 'fight' && !target.defeated) {
      setScreen('fight_pre');
      return;
    }

    if (target.type === 'level') {
      setLevelConfirm(true);
      setArrivalMsg(null);
      return;
    }

    const msg = getArrivalMessage(target);
    setArrivalMsg(msg);
  }, [dungeon, dispatchAndSave, setScreen]);

  const goBack = useCallback(() => {
    if (!currentNode) return;
    setLevelConfirm(false);
    setArrivalMsg(null);

    if (!currentNode.parentId) {
      // At root — return to Tristram
      dispatchAndSave({ type: 'LEAVE_DUNGEON' });
      setScreen('tristram');
    } else {
      dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId: currentNode.parentId } });
    }
  }, [currentNode, dispatchAndSave, setScreen]);

  const returnToTristram = useCallback(() => {
    setLevelConfirm(false);
    dispatchAndSave({ type: 'LEAVE_DUNGEON' });
    setScreen('tristram');
  }, [dispatchAndSave, setScreen]);

  // ── Intro flow ────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <IntroScreen
        introText={dungeon.introText}
        levelName={dungeon.levelName}
        onProceed={() => {
          dispatchAndSave({ type: 'DUNGEON_INTRO_SHOWN' });
          dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId: dungeon.rootId } });
          setPhase('navigating');
        }}
      />
    );
  }

  if (phase === 'loading' || !currentNode || !levelDef) {
    return (
      <div className="loading-screen">
        <div className="loading-sigil" />
        <span className="text-gold" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', letterSpacing: '0.1em' }}>
          DESCENDING...
        </span>
      </div>
    );
  }

  // ── Navigation phase ──────────────────────────────────────────────────────

  const children     = currentNode.childrenIds.map(id => dungeon.nodes[id]).filter(Boolean);
  const isRoot       = !currentNode.parentId;
  const isLeaf       = children.length === 0;
  const roomDepth    = depthLabel(currentNode.depth);

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div className="title-small" style={{ fontSize: '11px' }}>Cathedral Level 1</div>
          <div className="text-dim" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>{roomDepth}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={() => setScreen('character')}
          >
            ⚔ Character
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={returnToTristram}
          >
            ← Tristram
          </button>
        </div>
      </div>

      {/* Current room */}
      <div className="panel" style={{ padding: '12px', flexShrink: 0 }}>
        <CurrentRoomInfo node={currentNode} arrivalMsg={arrivalMsg} />
      </div>

      {/* Level descent confirmation */}
      {levelConfirm && (
        <div className="panel" style={{ padding: '14px', flexShrink: 0, boxShadow: '0 0 0 2px var(--border-gold), inset 0 0 20px rgba(0,0,0,0.8)' }}>
          <div className="title-small" style={{ marginBottom: '8px', color: 'var(--text-gold)' }}>
            Descend to Level 2?
          </div>
          <div className="text-flavor" style={{ fontSize: '12px', marginBottom: '12px' }}>
            The stairs lead deeper into the earth. There is no telling what awaits below.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost btn-full"
              style={{ fontSize: '12px' }}
              onClick={() => setLevelConfirm(false)}
            >
              Not yet
            </button>
            <button
              className="btn btn-primary btn-full"
              style={{ fontSize: '12px' }}
              onClick={() => {
                setLevelConfirm(false);
                setArrivalMsg('Level 2 is not yet accessible. The path ahead is sealed.');
              }}
            >
              Descend (Phase 5+)
            </button>
          </div>
        </div>
      )}

      {/* Passages */}
      <div className="panel scrollable" style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>

        {isLeaf ? (
          <div style={{ padding: '12px 0', textAlign: 'center' }}>
            <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic' }}>
              The corridor dead-ends here. No further passage.
            </div>
          </div>
        ) : (
          <>
            <div className="title-small" style={{ marginBottom: '2px' }}>Passages</div>
            {children.map((child, idx) => (
              <PassageButton
                key={child.id}
                direction={DIRECTIONS[idx] || 'Forward'}
                child={child}
                levelDef={levelDef}
                onClick={() => navigateTo(child.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Back / Tristram */}
      <button
        className="btn btn-ghost btn-full"
        style={{ flexShrink: 0, fontSize: '12px' }}
        onClick={goBack}
      >
        {isRoot ? '← Return to Tristram' : '← Back'}
      </button>
    </div>
  );
}

// ── Current room description ──────────────────────────────────────────────────

function CurrentRoomInfo({ node, arrivalMsg }) {
  if (node.type === 'entrance') {
    return (
      <div className="text-flavor" style={{ fontSize: '12px' }}>
        You stand at the entrance to the cathedral crypts. Torchlight flickers ahead.
      </div>
    );
  }

  if (arrivalMsg) {
    return <div className="text-flavor" style={{ fontSize: '12px' }}>{arrivalMsg}</div>;
  }

  if (node.type === 'fight' && node.defeated) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span className="text-green" style={{ fontSize: '16px' }}>✓</span>
        <span className="text-flavor" style={{ fontSize: '12px' }}>
          {node.monster} slain. The chamber is clear.
        </span>
      </div>
    );
  }

  if (node.type === 'nothing' && node.visited) {
    return (
      <div className="text-flavor" style={{ fontSize: '12px' }}>
        An empty chamber. Nothing of value here.
      </div>
    );
  }

  if (node.type === 'level') {
    return (
      <div className="text-flavor" style={{ fontSize: '12px' }}>
        Stone steps descend into deeper darkness. The cold rises from below.
      </div>
    );
  }

  return (
    <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic' }}>
      You look around for exits.
    </div>
  );
}

// ── Passage selection button ──────────────────────────────────────────────────

function PassageButton({ direction, child, levelDef, onClick }) {
  const desc    = getChildDescription(child, levelDef);
  const icon    = nodeIcon(child);
  const iconClr = nodeIconColor(child);
  const style   = nodeButtonStyle(child);

  return (
    <button style={style} onClick={onClick}>
      <span style={{ color: iconClr, fontSize: '16px', minWidth: '20px', flexShrink: 0, marginTop: '1px' }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
          {direction}
        </div>
        <div style={{
          color: child.type === 'fight' && !child.defeated ? 'var(--text-cream)' : 'var(--text)',
          fontSize: '13px',
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          lineHeight: 1.5,
          textDecoration: child.defeated ? 'line-through' : 'none',
        }}>
          {desc}
        </div>
      </div>
    </button>
  );
}

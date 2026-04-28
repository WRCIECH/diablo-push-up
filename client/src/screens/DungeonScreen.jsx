import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useMusic } from '../hooks/useMusic.js';
import { getArrivalMessage, getLevelDef, depthLabel, generateDungeon } from '../utils/dungeon.js';
import { rollChestLoot } from '../utils/loot.js';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';
import ItemIcon from '../components/ItemIcon.jsx';
import DungeonMap from '../components/DungeonMap.jsx';

// ── CSS animations ────────────────────────────────────────────────────────────

const CHEST_STYLES = `
  @keyframes chest-pulse {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(196,153,30,0.2)); }
    50%       { filter: drop-shadow(0 0 16px rgba(196,153,30,0.7)); }
  }
  @keyframes chest-tap {
    0%, 100% { transform: translateY(0);   opacity: 0.55; }
    50%       { transform: translateY(-4px); opacity: 1; }
  }
  @keyframes chest-loot-pop {
    0%   { transform: scale(0.4) translateY(12px); opacity: 0; }
    65%  { transform: scale(1.08) translateY(-3px); opacity: 1; }
    100% { transform: scale(1) translateY(0);      opacity: 1; }
  }
`;

// ── Chest sounds ──────────────────────────────────────────────────────────────

function playChestOpenSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Wooden creak
    const creak = ctx.createOscillator();
    const cg    = ctx.createGain();
    creak.connect(cg); cg.connect(ctx.destination);
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(160, ctx.currentTime);
    creak.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.25);
    cg.gain.setValueAtTime(0.18, ctx.currentTime);
    cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    creak.start(); creak.stop(ctx.currentTime + 0.3);

    // Thud of lid
    const thud = ctx.createOscillator();
    const tg   = ctx.createGain();
    thud.connect(tg); tg.connect(ctx.destination);
    thud.type = 'square';
    thud.frequency.setValueAtTime(70, ctx.currentTime + 0.15);
    thud.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.35);
    tg.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    tg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    thud.start(ctx.currentTime + 0.15); thud.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function playChestLootSound(drop) {
  try {
    const ctx     = new (window.AudioContext || window.webkitAudioContext)();
    const hasItem = drop?.type === 'item';
    const hasGold = drop?.type === 'gold';

    if (hasItem && drop.item?.quality !== 'normal') {
      // Magic/unique: ascending arpeggio
      [523, 659, 784, 1047].forEach((hz, i) => {
        const t = ctx.currentTime + 0.35 + i * 0.1;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.setValueAtTime(hz, t);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t); o.stop(t + 0.5);
      });
    } else if (hasGold) {
      [1047, 1319, 987].forEach((hz, i) => {
        const t = ctx.currentTime + 0.35 + i * 0.09;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.setValueAtTime(hz, t);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.start(t); o.stop(t + 0.38);
      });
    } else if (hasItem) {
      // Normal item: single chime
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(660, ctx.currentTime + 0.35);
      g.gain.setValueAtTime(0.2, ctx.currentTime + 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      o.start(ctx.currentTime + 0.35); o.stop(ctx.currentTime + 0.75);
    }
  } catch (_) {}
}

// ── Chest SVG ─────────────────────────────────────────────────────────────────

function ChestSVG({ opened }) {
  return (
    <svg viewBox="0 0 80 56" width="100" height="70" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="40" cy="54" rx="28" ry="3" fill="#000" opacity="0.3"/>
      {/* Body */}
      <rect x="6" y="28" width="68" height="24" rx="3" fill="#4a2e0e" stroke="#8a6228" strokeWidth="1.5"/>
      {/* Gold band on body */}
      <rect x="6" y="37" width="68" height="5" fill="#c4991e" opacity="0.6"/>
      {/* Lid — pivots open when opened */}
      <rect x="6" y={opened ? 4 : 12} width="68" height="18" rx="3"
            fill="#5a3a14" stroke="#8a6228" strokeWidth="1.5"/>
      {/* Gold band on lid */}
      <rect x="6" y={opened ? 16 : 24} width="68" height="4" fill="#c4991e" opacity="0.6"/>
      {/* Lock */}
      {!opened && (
        <>
          <rect x="33" y="22" width="14" height="10" rx="2" fill="#c4991e"/>
          <circle cx="40" cy="28" r="3" fill="#8a6010"/>
          <rect x="38.5" y="28" width="3" height="5" rx="1" fill="#8a6010"/>
        </>
      )}
      {/* Hinge left */}
      <rect x="10" y={opened ? 19 : 27} width="8" height="5" rx="1" fill="#7a5220"/>
      {/* Hinge right */}
      <rect x="62" y={opened ? 19 : 27} width="8" height="5" rx="1" fill="#7a5220"/>
      {/* Interior glow when open */}
      {opened && (
        <ellipse cx="40" cy="32" rx="26" ry="8" fill="#c4991e" opacity="0.15"/>
      )}
    </svg>
  );
}

// ── Chest panel ───────────────────────────────────────────────────────────────

function ChestPanel({ node, gameData, onOpen }) {
  const [opened, setOpened] = useState(false);
  const [drop,   setDrop]   = useState(null);

  function handleTap() {
    if (opened) return;
    const result = rollChestLoot(gameData.items);
    playChestOpenSound();
    playChestLootSound(result);
    setDrop(result);
    setOpened(true);
    onOpen(result);
  }

  const item    = drop?.type === 'item' ? drop.item : null;
  const gold    = drop?.type === 'gold' ? drop.amount : 0;
  const nothing = opened && !item && !gold;

  return (
    <div className="panel" style={{ padding: '12px', flexShrink: 0 }}>
      <style>{CHEST_STYLES}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

        {/* Chest */}
        <div
          onClick={handleTap}
          style={{
            flexShrink: 0, cursor: opened ? 'default' : 'pointer',
            animation: opened ? 'none' : 'chest-pulse 2s ease-in-out infinite',
          }}
        >
          <ChestSVG opened={opened}/>
        </div>

        {/* Content */}
        {!opened ? (
          <div style={{
            color: 'var(--text-gold)', fontSize: '12px', letterSpacing: '0.1em',
            animation: 'chest-tap 1.5s ease-in-out infinite',
          }}>
            TAP TO OPEN
          </div>
        ) : nothing ? (
          <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic',
                                              animation: 'chest-loot-pop 0.4s ease-out both' }}>
            Empty. Dust and cobwebs.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px',
                        animation: 'chest-loot-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {gold > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🪙</span>
                <span style={{ color: 'var(--text-gold)', fontSize: '20px',
                               fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  +{gold}g
                </span>
              </div>
            )}
            {item && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ItemIcon item={item} size={36}/>
                <div>
                  <div style={{ color: qualityColor(item.quality), fontSize: '13px', fontWeight: 700 }}>
                    {resolveItemName(item)}
                    {item.quality === 'unique' && (
                      <span style={{ color: 'var(--text-gold)', fontSize: '9px',
                                     marginLeft: '6px', letterSpacing: '0.1em' }}>UNIQUE</span>
                    )}
                  </div>
                  {getItemStatLine(item) && (
                    <div className="text-dim" style={{ fontSize: '11px' }}>{getItemStatLine(item)}</div>
                  )}
                  {item.quality !== 'normal' && !item.identified && (
                    <div style={{ fontSize: '10px', color: 'var(--blue-text)' }}>Unidentified</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Intro screen ──────────────────────────────────────────────────────────────

function IntroScreen({ introText, levelName, onProceed }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', gap: '12px' }}>
      <div className="panel panel-gold" style={{ padding: '16px', textAlign: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: '20px' }}>{levelName}</div>
        <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.12em', marginTop: '4px' }}>
          {levelName?.toUpperCase()}
        </div>
      </div>
      <div className="panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="text-flavor" style={{ textAlign: 'center' }}>{introText}</div>
      </div>
      <button className="btn btn-primary btn-full" style={{ padding: '16px', flexShrink: 0 }} onClick={onProceed}>
        Descend into darkness
      </button>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DungeonScreen() {
  const { muted, toggleMute, blocked } = useMusic('/audio/dungeon.mp3');
  const { state, dispatchAndSave, setScreen, gameData } = useGame();
  const dungeon     = state.dungeon;
  const player      = state.player;
  const currentNode = dungeon?.nodes[dungeon?.currentNodeId];
  const levelDef    = getLevelDef(dungeon?.levelId, gameData?.locations);

  const [phase,          setPhase]          = useState('loading');
  const [levelConfirm,   setLevelConfirm]   = useState(false);
  const [levelUpConfirm, setLevelUpConfirm] = useState(false);

  useEffect(() => {
    if (!dungeon || !currentNode) return;
    if (currentNode.type === 'fight' && !currentNode.defeated) { setScreen('fight_pre'); return; }
    setPhase(dungeon.introShown ? 'navigating' : 'intro');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = useCallback((nodeId) => {
    const target = dungeon.nodes[nodeId];
    if (!target) return;
    setLevelConfirm(false);
    setLevelUpConfirm(false);
    dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId } });
    if (target.type === 'fight'    && !target.defeated) { setScreen('fight_pre'); return; }
    if (target.type === 'level')                        { setLevelConfirm(true);   return; }
    if (target.type === 'level_up')                     { setLevelUpConfirm(true); return; }
  }, [dungeon, dispatchAndSave, setScreen]);

  const goBack = useCallback(() => {
    if (!currentNode) return;
    setLevelConfirm(false);
    if (!currentNode.parentId) {
      dispatchAndSave({ type: 'LEAVE_DUNGEON' });
      setScreen('tristram');
    } else {
      dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId: currentNode.parentId } });
    }
  }, [currentNode, dispatchAndSave, setScreen]);

  // Set dungeon entry point to a specific node type and mark ancestors visited
  function enterAt(dungeon, nodeType) {
    const entry = Object.values(dungeon.nodes).find(n => n.type === nodeType);
    if (!entry) return;
    dungeon.currentNodeId = entry.id;
    let id = entry.id;
    while (id) {
      dungeon.nodes[id] = { ...dungeon.nodes[id], visited: true };
      id = dungeon.nodes[id].parentId;
    }
  }

  function handleChestOpen(drop) {
    dispatchAndSave({ type: 'MARK_CHEST_LOOTED', payload: currentNode.id });
    if (drop?.type === 'gold') dispatchAndSave({ type: 'ADD_GOLD', payload: drop.amount });
    if (drop?.type === 'item') dispatchAndSave({ type: 'ADD_ITEM', payload: drop.item });
  }

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <IntroScreen
        introText={dungeon.introText}
        levelName={dungeon.levelName}
        onProceed={() => {
          dispatchAndSave({ type: 'DUNGEON_INTRO_SHOWN' });
          // Navigate to current entry node (root on first entry, level_up when descending)
          dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId: dungeon.currentNodeId } });
          setPhase('navigating');
        }}
      />
    );
  }

  if (phase === 'loading' || !currentNode || !levelDef) {
    return (
      <div className="loading-screen">
        <div className="loading-sigil"/>
        <span className="text-gold" style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '0.1em' }}>
          DESCENDING...
        </span>
      </div>
    );
  }

  // ── Navigating ─────────────────────────────────────────────────────────────

  const roomDepth = depthLabel(currentNode.depth);
  const hasChest  = currentNode.type === 'nothing' && !currentNode.chestLooted;

  return (
    <div className="screen" style={{ gap: '6px' }}>

      {/* Compact header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="title-small" style={{ fontSize: 'clamp(11px, 1.1vw, 14px)' }}>
          L{dungeon.levelId} · {roomDepth}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '13px' }}
                  onClick={toggleMute} title={blocked ? 'Start music' : muted ? 'Unmute' : 'Mute'}>
            {blocked ? '▶' : muted ? '🔇' : '🔊'}
          </button>
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '12px' }}
                  onClick={() => setScreen('character')}>
            ⚔ Char
          </button>
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '12px' }}
                  onClick={() => { dispatchAndSave({ type: 'LEAVE_DUNGEON' }); setScreen('tristram'); }}>
            ← Town
          </button>
        </div>
      </div>

      {/* Chest — shown when on an unlooted empty room */}
      {hasChest && gameData && (
        <ChestPanel
          key={currentNode.id}
          node={currentNode}
          gameData={gameData}
          onOpen={handleChestOpen}
        />
      )}

      {/* Level confirm */}
      {levelConfirm && currentNode && (
        <div className="panel" style={{ padding: '12px', flexShrink: 0, boxShadow: '0 0 0 2px var(--border-gold)' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>
            Descend to Level {currentNode.targetLevel}?
          </div>
          <div className="text-flavor" style={{ fontSize: '12px', marginBottom: '10px' }}>
            The stairs lead deeper. Whatever waits below has not seen living prey in a long time.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-full" style={{ fontSize: '12px' }}
                    onClick={() => setLevelConfirm(false)}>Not yet</button>
            <button className="btn btn-primary btn-full" style={{ fontSize: '12px' }}
                    onClick={() => {
                      const nextId     = currentNode.targetLevel;
                      const newDungeon = generateDungeon(nextId, gameData.locations);
                      // Arrive at the level_up node (you came down from above)
                      enterAt(newDungeon, 'level_up');
                      dispatchAndSave({ type: 'SET_DUNGEON', payload: newDungeon });
                      setLevelConfirm(false);
                      setPhase('intro');
                    }}>
              Descend
            </button>
          </div>
        </div>
      )}

      {/* Ascend confirm */}
      {levelUpConfirm && (
        <div className="panel" style={{ padding: '12px', flexShrink: 0, boxShadow: '0 0 0 2px #148a8a' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>
            {dungeon.levelId === 1 ? 'Return to Tristram?' : `Ascend to Level ${dungeon.levelId - 1}?`}
          </div>
          <div className="text-flavor" style={{ fontSize: '12px', marginBottom: '10px' }}>
            {dungeon.levelId === 1
              ? 'The surface and safety lie above. You can always return.'
              : 'The stairs lead back up. Your progress on this level will be lost.'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-full" style={{ fontSize: '12px' }}
                    onClick={() => setLevelUpConfirm(false)}>Stay</button>
            <button className="btn btn-primary btn-full" style={{ fontSize: '12px' }}
                    onClick={() => {
                      if (dungeon.levelId === 1) {
                        dispatchAndSave({ type: 'LEAVE_DUNGEON' });
                        setScreen('tristram');
                      } else {
                        const prevId     = dungeon.levelId - 1;
                        const newDungeon = generateDungeon(prevId, gameData.locations);
                        // Arrive at the level (down staircase) — you came up from below
                        enterAt(newDungeon, 'level');
                        newDungeon.introShown = true; // skip intro when ascending
                        dispatchAndSave({ type: 'SET_DUNGEON', payload: newDungeon });
                        setLevelUpConfirm(false);
                        setPhase('navigating');
                      }
                    }}>
              Ascend
            </button>
          </div>
        </div>
      )}

      {/* Full dungeon map — inline, navigable */}
      <DungeonMap
        dungeon={dungeon}
        inline
        onNavigate={navigateTo}
      />
    </div>
  );
}

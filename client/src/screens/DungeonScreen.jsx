import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useMusic } from '../hooks/useMusic.js';
import { getArrivalMessage, getLevelDef, depthLabel, generateDungeon } from '../utils/dungeon.js';
import { rollChestLoot } from '../utils/loot.js';
import DungeonMap from '../components/DungeonMap.jsx';


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
  const { state, dispatchAndSave, setScreen, gameData, setChestResult } = useGame();
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

  function handleOpenChest() {
    const drop  = rollChestLoot(gameData.items);
    const gold  = drop?.type === 'gold' ? drop.amount : 0;
    const loots = drop?.type === 'item' ? [drop.item] : [];
    dispatchAndSave({ type: 'MARK_CHEST_LOOTED', payload: currentNode.id });
    if (gold)         dispatchAndSave({ type: 'ADD_GOLD', payload: gold });
    for (const item of loots) dispatchAndSave({ type: 'ADD_ITEM', payload: item });
    setChestResult({ gold, loots });
    setScreen('chest');
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

      {/* Chest — compact prompt when on an unlooted empty room */}
      {hasChest && gameData && (
        <div className="panel" style={{ padding: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>📦</span>
          <div style={{ flex: 1 }}>
            <div className="title-small" style={{ marginBottom: '2px' }}>Treasure Chest</div>
            <div className="text-dim" style={{ fontSize: '12px' }}>A chest lies here, waiting to be opened.</div>
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}
                  onClick={handleOpenChest}>
            Open
          </button>
        </div>
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
                      // Root IS the level_up node — just mark it visited
                      newDungeon.nodes[newDungeon.rootId] = {
                        ...newDungeon.nodes[newDungeon.rootId], visited: true,
                      };
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

import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useMusic } from '../hooks/useMusic.js';
import { getArrivalMessage, getLevelDef, depthLabel } from '../utils/dungeon.js';
import DungeonMap from '../components/DungeonMap.jsx';

// ── Intro screen ──────────────────────────────────────────────────────────────

function IntroScreen({ introText, levelName, onProceed }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', gap: '12px' }}>
      <div className="panel panel-gold" style={{ padding: '16px', textAlign: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: '20px' }}>Cathedral Level 1</div>
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
  const { muted, toggleMute, blocked } = useMusic('/audio/dungeon.wav');
  const { state, dispatchAndSave, setScreen, gameData } = useGame();
  const dungeon     = state.dungeon;
  const player      = state.player;
  const currentNode = dungeon?.nodes[dungeon?.currentNodeId];
  const levelDef    = getLevelDef(dungeon?.levelId, gameData?.locations);

  const [phase,        setPhase]        = useState('loading');
  const [levelConfirm, setLevelConfirm] = useState(false);

  useEffect(() => {
    if (!dungeon || !currentNode) return;
    if (currentNode.type === 'fight' && !currentNode.defeated) { setScreen('fight_pre'); return; }
    setPhase(dungeon.introShown ? 'navigating' : 'intro');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = useCallback((nodeId) => {
    const target = dungeon.nodes[nodeId];
    if (!target) return;
    setLevelConfirm(false);
    dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId } });
    if (target.type === 'fight' && !target.defeated) { setScreen('fight_pre'); return; }
    if (target.type === 'level') { setLevelConfirm(true); return; }
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

  // ── Intro ──────────────────────────────────────────────────────────────────

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
        <div className="loading-sigil"/>
        <span className="text-gold" style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '0.1em' }}>
          DESCENDING...
        </span>
      </div>
    );
  }

  // ── Navigating — map is the primary UI ────────────────────────────────────

  const isRoot    = !currentNode.parentId;
  const roomDepth = depthLabel(currentNode.depth);

  return (
    <div className="screen" style={{ gap: '6px' }}>

      {/* Compact header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="title-small" style={{ fontSize: 'clamp(11px, 1.1vw, 14px)' }}>
          Cathedral · {roomDepth}
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

      {/* Level confirm */}
      {levelConfirm && (
        <div className="panel" style={{ padding: '12px', flexShrink: 0, boxShadow: '0 0 0 2px var(--border-gold)' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>Descend to Level 2?</div>
          <div className="text-flavor" style={{ fontSize: '12px', marginBottom: '10px' }}>
            The stairs lead deeper. No telling what awaits below.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-full" style={{ fontSize: '12px' }}
                    onClick={() => setLevelConfirm(false)}>Not yet</button>
            <button className="btn btn-primary btn-full" style={{ fontSize: '12px' }}
                    onClick={() => setLevelConfirm(false)}>
              Descend (coming soon)
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

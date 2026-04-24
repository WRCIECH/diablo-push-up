import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { isPenaltyActive, penaltyRemaining } from '../utils/player.js';
import { generateDungeon } from '../utils/dungeon.js';
import { useMusic } from '../hooks/useMusic.js';

export default function Tristram() {
  const { state, dispatchAndSave, setScreen, generateShop, gameData } = useGame();
  const player = state?.player;
  const [penaltyText, setPenaltyText] = useState('');
  const penaltyOn = isPenaltyActive(state.penaltyUntil);

  const { muted, toggleMute, blocked } = useMusic('/audio/tristram.mp3', { volume: 0.45 });

  // Clear expired penalty
  useEffect(() => {
    if (state.penaltyUntil && !isPenaltyActive(state.penaltyUntil)) {
      dispatchAndSave({ type: 'SET_PENALTY', payload: null });
    }
  }, []);

  // Countdown tick
  useEffect(() => {
    if (!penaltyOn) return;
    const tick = () => setPenaltyText(penaltyRemaining(state.penaltyUntil) || '');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.penaltyUntil, penaltyOn]);

  // Generate shop on first Tristram visit
  useEffect(() => {
    generateShop();
  }, [generateShop]);

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: 'clamp(18px, 5vw, 26px)' }}>Tristram</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Music toggle — only shown when audio file is present */}
          <MuteButton muted={muted} blocked={blocked} onToggle={toggleMute} />
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={() => setScreen('character')}
          >
            ⚔ Character
          </button>
        </div>
      </div>

      {/* Penalty banner */}
      {penaltyOn && (
        <div className="penalty-banner" style={{ flexShrink: 0 }}>
          <div className="text-red" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>
            WOUNDED — CANNOT ENTER DUNGEON
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            You may return in: <span style={{ color: 'var(--red-text)', fontWeight: 600 }}>{penaltyText}</span>
          </div>
        </div>
      )}

      {/* Flavor text */}
      <div className="panel" style={{ padding: '12px', flexShrink: 0 }}>
        <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8 }}>
          The village of Tristram sits in uneasy silence. The old cathedral looms at the edge of town,
          its shadow long and cold even at noon. You can feel the evil seeping upward from below.
        </div>
      </div>

      {/* NPC list */}
      <div className="panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <div className="title-small" style={{ marginBottom: '4px' }}>Townspeople</div>

        <NpcButton
          name="Deckard Cain"
          desc="Identify magic items · 100g each"
          onClick={() => setScreen('cain')}
        />
        <NpcButton
          name="Griswold"
          desc="Weapons, armor · Buy &amp; sell"
          onClick={() => setScreen('griswold')}
        />
        <NpcButton
          name="Pepin the Healer"
          desc="Free healing · Potions for sale"
          onClick={() => setScreen('pepin')}
        />
      </div>

      {/* Dungeon entrance */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '6px' }}>
        <button
          className="btn btn-primary btn-full"
          style={{ fontSize: '15px', padding: '16px', letterSpacing: '0.1em' }}
          disabled={penaltyOn || !gameData}
          onClick={() => {
            const dungeon = generateDungeon(1, gameData.locations);
            dispatchAndSave({ type: 'SET_DUNGEON', payload: dungeon });
            setScreen('dungeon');
          }}
        >
          {penaltyOn ? `Wounded — Return in ${penaltyText}` : '⬇  Enter Cathedral'}
        </button>

        <div className="divider" />

        <button
          className="btn btn-ghost btn-full"
          style={{ fontSize: '11px' }}
          onClick={() => setScreen('settings')}
        >
          Settings
        </button>
      </div>
    </div>
  );
}

function MuteButton({ muted, blocked, onToggle }) {
  const label = blocked ? '▶ Music' : muted ? '🔇' : '🔊';
  const title = blocked
    ? 'Click to start music'
    : muted ? 'Unmute music' : 'Mute music';

  return (
    <button
      className="btn btn-ghost"
      style={{ padding: '6px 10px', fontSize: '13px', minWidth: '36px' }}
      onClick={onToggle}
      title={title}
    >
      {label}
    </button>
  );
}

function NpcButton({ name, desc, onClick }) {
  return (
    <button
      className="btn btn-ghost btn-full"
      onClick={onClick}
      style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' }}
    >
      <span style={{ color: 'var(--text-gold)', fontSize: '13px' }}>{name}</span>
      <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em' }}
        dangerouslySetInnerHTML={{ __html: desc }}
      />
    </button>
  );
}

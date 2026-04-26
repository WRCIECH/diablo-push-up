import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { isPenaltyActive, penaltyRemaining } from '../utils/player.js';
import { generateDungeon } from '../utils/dungeon.js';
import { useMusic } from '../hooks/useMusic.js';
import HeroToken from '../components/HeroToken.jsx';

// ── NPC icons ─────────────────────────────────────────────────────────────────

function CainIcon() {
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill="#0e0a06"/>
      <rect x="2" y="2" width="56" height="56" rx="6" fill="none" stroke="#4a3a10" strokeWidth="1"/>
      {/* Scroll / book */}
      <rect x="14" y="16" width="32" height="28" rx="2" fill="#2a1e08" stroke="#8b6914" strokeWidth="1.5"/>
      <line x1="21" y1="23" x2="39" y2="23" stroke="#c4991e" strokeWidth="1.2" opacity="0.8"/>
      <line x1="21" y1="29" x2="39" y2="29" stroke="#c4991e" strokeWidth="1.2" opacity="0.6"/>
      <line x1="21" y1="35" x2="33" y2="35" stroke="#c4991e" strokeWidth="1.2" opacity="0.5"/>
      {/* Scroll rollers */}
      <rect x="12" y="14" width="36" height="5" rx="2.5" fill="#6b4f1a" stroke="#c4991e" strokeWidth="0.8"/>
      <rect x="12" y="41" width="36" height="5" rx="2.5" fill="#6b4f1a" stroke="#c4991e" strokeWidth="0.8"/>
    </svg>
  );
}

function GriswoldIcon() {
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill="#0a0a0a"/>
      <rect x="2" y="2" width="56" height="56" rx="6" fill="none" stroke="#3a3a3a" strokeWidth="1"/>
      {/* Hammer */}
      <rect x="26" y="12" width="16" height="12" rx="2" fill="#808080" stroke="#aaaaaa" strokeWidth="1"/>
      <rect x="32" y="22" width="4" height="26" rx="1" fill="#6b4f1a" stroke="#8b6914" strokeWidth="0.8"/>
      {/* Anvil */}
      <rect x="14" y="42" width="32" height="8" rx="2" fill="#555" stroke="#888" strokeWidth="1"/>
      <rect x="18" y="36" width="24" height="8" rx="1" fill="#666" stroke="#888" strokeWidth="1"/>
    </svg>
  );
}

function PepinIcon() {
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill="#050d05"/>
      <rect x="2" y="2" width="56" height="56" rx="6" fill="none" stroke="#1a4a1a" strokeWidth="1"/>
      {/* Potion bottle */}
      <rect x="25" y="10" width="10" height="8" rx="2" fill="#2a5a2a" stroke="#4a8a4a" strokeWidth="1"/>
      <path d="M18,22 Q18,18 25,18 L35,18 Q42,18 42,22 L46,46 Q46,50 30,50 Q14,50 14,46 Z" fill="#8b0000" stroke="#cc2222" strokeWidth="1" opacity="0.9"/>
      {/* Red cross */}
      <rect x="26" y="28" width="8" height="14" rx="1" fill="#ff4444" opacity="0.7"/>
      <rect x="22" y="32" width="16" height="6" rx="1" fill="#ff4444" opacity="0.7"/>
      {/* Liquid glow */}
      <ellipse cx="30" cy="42" rx="10" ry="5" fill="#cc0000" opacity="0.3"/>
    </svg>
  );
}

function CathedralIcon({ locked }) {
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="8" fill="#08050a"/>
      <rect x="2" y="2" width="56" height="56" rx="6" fill="none" stroke={locked ? '#2a1a2a' : '#4a2a6a'} strokeWidth="1"/>
      {/* Cathedral facade */}
      <rect x="14" y="28" width="32" height="22" fill="#1a1020" stroke="#4a2a6a" strokeWidth="1"/>
      {/* Central arch door */}
      <path d="M24,50 L24,36 Q24,28 30,28 Q36,28 36,36 L36,50" fill="#0a0610" stroke="#6a3a9a" strokeWidth="1"/>
      {/* Towers */}
      <rect x="10" y="20" width="10" height="30" fill="#1a1020" stroke="#4a2a6a" strokeWidth="1"/>
      <rect x="40" y="20" width="10" height="30" fill="#1a1020" stroke="#4a2a6a" strokeWidth="1"/>
      {/* Cross on top */}
      <rect x="28.5" y="8" width="3" height="12" fill={locked ? '#3a2a4a' : '#8a4aaa'} rx="1"/>
      <rect x="24" y="12" width="12" height="3" fill={locked ? '#3a2a4a' : '#8a4aaa'} rx="1"/>
      {locked && (
        <>
          <rect x="23" y="36" width="14" height="10" rx="2" fill="#1a1020" stroke="#5a1010" strokeWidth="1.5"/>
          <path d="M26,36 Q26,30 30,30 Q34,30 34,36" fill="none" stroke="#5a1010" strokeWidth="2"/>
          <circle cx="30" cy="41" r="2" fill="#5a1010"/>
        </>
      )}
    </svg>
  );
}

// ── NPC compass slot ──────────────────────────────────────────────────────────

function NpcSlot({ name, subtitle, icon: Icon, onClick, locked, highlight }) {
  const size = 'clamp(90px, 24vw, 138px)';
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      style={{
        width: size, height: size,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '5px',
        background: highlight ? 'rgba(139,0,0,0.2)' : 'var(--bg-panel)',
        border: `1px solid ${highlight ? '#5a1010' : locked ? 'var(--border-dark)' : 'var(--border-mid)'}`,
        borderRadius: '8px',
        cursor: locked ? 'not-allowed' : 'pointer',
        padding: '8px',
        opacity: locked ? 0.45 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
        <Icon />
      </div>
      <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
        <div style={{ fontSize: 'clamp(10px, 2vw, 13px)', color: 'var(--text-gold)', fontWeight: 600 }}>
          {name}
        </div>
        <div style={{ fontSize: 'clamp(9px, 1.6vw, 11px)', color: 'var(--text-dim)' }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

// ── Hero token ────────────────────────────────────────────────────────────────

// ── Compass layout ────────────────────────────────────────────────────────────

function Compass({ north, west, center, east, south }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gridTemplateRows:    '1fr auto 1fr',
      gap: 'clamp(8px, 2vw, 14px)',
      alignItems: 'center', justifyItems: 'center',
      flex: 1, width: '100%',
      maxWidth: 'min(420px, 100%)', margin: '0 auto',
    }}>
      <div />{north}<div />
      {west}{center}{east}
      <div />{south}<div />
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Tristram() {
  const { state, dispatchAndSave, setScreen, generateShop, gameData } = useGame();
  const player   = state?.player;
  const penaltyOn = isPenaltyActive(state.penaltyUntil);
  const [penaltyText, setPenaltyText] = useState('');

  const { muted, toggleMute, blocked } = useMusic('/audio/tristram.mp3', { volume: 0.45 });

  useEffect(() => {
    if (state.penaltyUntil && !isPenaltyActive(state.penaltyUntil)) {
      dispatchAndSave({ type: 'SET_PENALTY', payload: null });
    }
  }, []);

  useEffect(() => {
    if (!penaltyOn) return;
    const tick = () => setPenaltyText(penaltyRemaining(state.penaltyUntil) || '');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.penaltyUntil, penaltyOn]);

  useEffect(() => { generateShop(); }, [generateShop]);

  function enterCathedral() {
    const dungeon = generateDungeon(1, gameData.locations);
    dispatchAndSave({ type: 'SET_DUNGEON', payload: dungeon });
    setScreen('dungeon');
  }

  const muteLabel = blocked ? '▶' : muted ? '🔇' : '🔊';

  return (
    <div className="screen" style={{ gap: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: 'clamp(18px, 2.2vw, 28px)' }}>Tristram</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '13px' }}
                  onClick={toggleMute} title={blocked ? 'Start music' : muted ? 'Unmute' : 'Mute'}>
            {muteLabel}
          </button>
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 'clamp(11px, 1.1vw, 13px)' }}
                  onClick={() => setScreen('settings')}>
            ⚙
          </button>
        </div>
      </div>

      {/* Penalty banner */}
      {penaltyOn && (
        <div className="penalty-banner" style={{ flexShrink: 0 }}>
          <div className="text-red" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em' }}>
            WOUNDED — CANNOT ENTER DUNGEON
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Return in: <span style={{ color: 'var(--red-text)', fontWeight: 600 }}>{penaltyText}</span>
          </div>
        </div>
      )}

      {/* Compass */}
      <Compass
        north={
          <NpcSlot
            name="Cathedral"
            subtitle={penaltyOn ? penaltyText : 'Enter'}
            icon={CathedralIcon}
            onClick={enterCathedral}
            locked={penaltyOn || !gameData}
            highlight={penaltyOn}
          />
        }
        west={
          <NpcSlot name="Cain" subtitle="Identify" icon={CainIcon} onClick={() => setScreen('cain')} />
        }
        center={player && <HeroToken player={player} onClick={() => setScreen('character')} />}
        east={
          <NpcSlot name="Griswold" subtitle="Shop" icon={GriswoldIcon} onClick={() => setScreen('griswold')} />
        }
        south={
          <NpcSlot name="Pepin" subtitle="Heal" icon={PepinIcon} onClick={() => setScreen('pepin')} />
        }
      />
    </div>
  );
}

import React, { useState } from 'react';
import { useGame, CLASS_TEMPLATES } from '../context/GameContext.jsx';

const CLASS_INFO = {
  warrior: {
    label: 'Warrior',
    tagline: 'Strength incarnate. Lives and dies in melee.',
    stats: 'STR 30 / DEX 20 / VIT 25',
    life: 70,
    weapon: 'Short Sword + Club',
    armor: 'Buckler',
    flavor: '"The way of the warrior is a road paved with iron and bone."',
    icon: WarriorIcon,
  },
  rogue: {
    label: 'Rogue',
    tagline: 'Swift and precise. Keeps enemies at distance.',
    stats: 'STR 20 / DEX 30 / VIT 20',
    life: 45,
    weapon: 'Short Bow',
    armor: '—',
    flavor: '"A shadow strikes where the eye cannot follow."',
    icon: RogueIcon,
  },
  sorcerer: {
    label: 'Sorcerer',
    tagline: 'Arcane power beyond mortal comprehension.',
    stats: '— / — / —',
    life: '?',
    weapon: '?',
    armor: '?',
    flavor: '"His secrets are not yet yours to know."',
    icon: SorcererIcon,
    locked: true,
  },
};

function WarriorIcon({ selected }) {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="wg" cx="50%" cy="40%" r="50%">
          <stop offset="0%"   stopColor={selected ? '#c4991e' : '#8b6914'} stopOpacity="0.2"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <ellipse cx="40" cy="50" rx="38" ry="48" fill="url(#wg)"/>
      {/* Helm */}
      <rect x="28" y="10" width="24" height="22" rx="2" fill={selected ? '#8b6914' : '#4a3a1a'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1.5"/>
      <rect x="26" y="28" width="28" height="6" rx="1" fill={selected ? '#6b4f1a' : '#3a2a0e'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
      {/* Face visor slit */}
      <rect x="32" y="18" width="16" height="4" rx="1" fill="#0a0605"/>
      {/* Pauldrons */}
      <rect x="12" y="30" width="18" height="10" rx="3" fill={selected ? '#6b4f1a' : '#3a2a0e'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
      <rect x="50" y="30" width="18" height="10" rx="3" fill={selected ? '#6b4f1a' : '#3a2a0e'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
      {/* Torso / chest */}
      <rect x="22" y="38" width="36" height="28" rx="3" fill={selected ? '#8b6914' : '#4a3a1a'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1.5"/>
      {/* Chest cross */}
      <line x1="40" y1="40" x2="40" y2="64" stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
      <line x1="26" y1="52" x2="54" y2="52" stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
      {/* Sword */}
      <rect x="60" y="20" width="4" height="50" rx="1" fill={selected ? '#c8b78a' : '#7a6a4a'}/>
      <rect x="56" y="44" width="12" height="3" rx="1" fill={selected ? '#c4991e' : '#6b4f1a'}/>
      {/* Shield */}
      <path d="M14,42 L24,42 L24,62 L19,68 L14,62 Z" fill={selected ? '#6b4f1a' : '#3a2a0e'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1.5"/>
      {/* Shield emblem */}
      <circle cx="19" cy="54" r="4" fill="none" stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
    </svg>
  );
}

function RogueIcon({ selected }) {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rg" cx="50%" cy="40%" r="50%">
          <stop offset="0%"   stopColor={selected ? '#c4991e' : '#8b6914'} stopOpacity="0.15"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <ellipse cx="40" cy="50" rx="38" ry="48" fill="url(#rg)"/>
      {/* Hood */}
      <path d="M28,8 Q40,2 52,8 L56,32 Q40,26 24,32 Z" fill={selected ? '#5a3a1a' : '#2a1a08'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1.5"/>
      {/* Face */}
      <ellipse cx="40" cy="26" rx="10" ry="12" fill={selected ? '#6b4f1a' : '#3a2a0e'}/>
      {/* Eyes */}
      <ellipse cx="36" cy="24" rx="2" ry="1.5" fill={selected ? '#c4991e' : '#8b6914'} opacity="0.9"/>
      <ellipse cx="44" cy="24" rx="2" ry="1.5" fill={selected ? '#c4991e' : '#8b6914'} opacity="0.9"/>
      {/* Torso — leather */}
      <rect x="26" y="36" width="28" height="26" rx="2" fill={selected ? '#5a3a1a' : '#2a1a08'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1.5"/>
      {/* Quiver on back (right side) */}
      <rect x="55" y="30" width="8" height="22" rx="2" fill={selected ? '#4a2a0e' : '#2a1a08'} stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="1"/>
      <line x1="57" y1="30" x2="57" y2="52" stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="0.5" strokeDasharray="2,2"/>
      <line x1="61" y1="30" x2="61" y2="52" stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="0.5" strokeDasharray="2,2"/>
      {/* Arrows in quiver */}
      <line x1="58" y1="28" x2="60" y2="28" stroke={selected ? '#c8b78a' : '#7a6a4a'} strokeWidth="1.5"/>
      <line x1="57" y1="25" x2="59" y2="25" stroke={selected ? '#c8b78a' : '#7a6a4a'} strokeWidth="1.5"/>
      <line x1="59" y1="22" x2="61" y2="22" stroke={selected ? '#c8b78a' : '#7a6a4a'} strokeWidth="1.5"/>
      {/* Bow held in left hand */}
      <path d="M18,28 Q12,48 18,68" fill="none" stroke={selected ? '#c8b78a' : '#7a6a4a'} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="28" x2="18" y2="68" stroke={selected ? '#c4991e' : '#6b4f1a'} strokeWidth="0.8"/>
    </svg>
  );
}

function SorcererIcon({ selected }) {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      {/* Locked X overlay */}
      <ellipse cx="40" cy="50" rx="38" ry="48" fill="#0a0605" opacity="0.7"/>
      {/* Faint robe outline */}
      <path d="M32,10 Q40,4 48,10 L60,80 L20,80 Z" fill="#1a1010" stroke="#2a1a1a" strokeWidth="1"/>
      <ellipse cx="40" cy="22" rx="10" ry="11" fill="#1a1010" stroke="#2a1a1a" strokeWidth="1"/>
      {/* Lock icon */}
      <rect x="30" y="44" width="20" height="16" rx="3" fill="#2a1a1a" stroke="#5a3a3a" strokeWidth="1.5"/>
      <path d="M34,44 Q34,34 40,34 Q46,34 46,44" fill="none" stroke="#5a3a3a" strokeWidth="2"/>
      <circle cx="40" cy="52" r="3" fill="#5a3a3a"/>
      <rect x="38.5" y="52" width="3" height="4" fill="#5a3a3a"/>
      {/* "LOCKED" text */}
      <text x="40" y="76" textAnchor="middle" fontFamily="serif" fontSize="7" fill="#5a3a3a" letterSpacing="1">LOCKED</text>
    </svg>
  );
}

export default function CharacterSelect() {
  const { dispatchAndSave, setScreen } = useGame();
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  function handleSelect(cls) {
    if (cls === 'sorcerer') return;
    setSelected(cls);
    setConfirming(false);
  }

  function handleBegin() {
    if (!selected) return;
    if (!confirming) { setConfirming(true); return; }

    const player = JSON.parse(JSON.stringify(CLASS_TEMPLATES[selected]));
    const newState = {
      player,
      currentLocation: 'tristram',
      currentLevel: null,
      dungeon: null,
      defeatedMonsters: [],
      penaltyUntil: null,
      history: [],
    };
    dispatchAndSave({ type: 'LOAD', payload: newState });
    setScreen('tristram');
  }

  const info = selected ? CLASS_INFO[selected] : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', gap: '10px', overflowY: 'auto' }} className="scrollable">

      {/* Title */}
      <div style={{ textAlign: 'center', paddingTop: '8px' }}>
        <div className="title-large" style={{ fontSize: 'clamp(18px, 5vw, 28px)' }}>Diablo Push-Up</div>
        <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.15em', marginTop: '4px' }}>
          CHOOSE YOUR CLASS
        </div>
        <div className="divider" style={{ marginTop: '10px' }} />
      </div>

      {/* Class cards */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {Object.entries(CLASS_INFO).map(([cls, data]) => {
          const Icon = data.icon;
          const isSelected = selected === cls;
          const isLocked = data.locked;
          return (
            <div
              key={cls}
              onClick={() => handleSelect(cls)}
              className="panel"
              style={{
                flex: 1,
                maxWidth: '120px',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 0.45 : 1,
                transition: 'all 0.15s ease',
                boxShadow: isSelected
                  ? '0 0 0 2px var(--border-gold), inset 0 0 0 1px var(--border-dark), 0 0 20px rgba(196,153,30,0.25), inset 0 0 20px rgba(0,0,0,0.8)'
                  : undefined,
              }}
            >
              <Icon selected={isSelected} />
              <div className="title-small" style={{ fontSize: '11px', textAlign: 'center' }}>
                {data.label}
              </div>
              {isLocked && (
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                  COMING SOON
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Class detail panel */}
      {info && (
        <div className="panel panel-gold" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="title-medium">{info.label}</span>
            <span className="text-dim" style={{ fontSize: '11px' }}>Level 1</span>
          </div>
          <div className="divider" />
          <div style={{ fontSize: '12px', color: 'var(--text-cream)', fontStyle: 'italic' }}>
            {info.tagline}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <div className="stat-row">
              <span className="stat-label">Strength</span>
              <span className="stat-value">{CLASS_TEMPLATES[selected].stats.strength}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Life</span>
              <span className="stat-value text-red">{info.life}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Dexterity</span>
              <span className="stat-value">{CLASS_TEMPLATES[selected].stats.dexterity}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Gold</span>
              <span className="stat-value text-gold">100</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Vitality</span>
              <span className="stat-value">{CLASS_TEMPLATES[selected].stats.vitality}</span>
            </div>
          </div>

          <div className="divider" />

          <div className="stat-row">
            <span className="stat-label">Weapon</span>
            <span className="stat-value" style={{ fontSize: '12px' }}>{info.weapon}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Shield</span>
            <span className="stat-value" style={{ fontSize: '12px' }}>{info.armor}</span>
          </div>

          <div className="divider" />
          <div className="text-flavor" style={{ fontSize: '12px', textAlign: 'center' }}>
            {info.flavor}
          </div>
        </div>
      )}

      {!info && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px', fontStyle: 'italic' }}>
          Select a class to see details
        </div>
      )}

      {/* Begin button */}
      <button
        className="btn btn-primary btn-full"
        onClick={handleBegin}
        disabled={!selected}
        style={{ fontSize: '14px', padding: '14px', flexShrink: 0 }}
      >
        {confirming
          ? `⚔  Begin as ${CLASS_INFO[selected]?.label} — Are you certain?`
          : 'Begin Journey'}
      </button>

      {confirming && (
        <button
          className="btn btn-ghost btn-full"
          onClick={() => setConfirming(false)}
          style={{ flexShrink: 0 }}
        >
          Cancel
        </button>
      )}

      <div style={{ height: '8px', flexShrink: 0 }} />
    </div>
  );
}

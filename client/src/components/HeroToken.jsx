import React from 'react';

// ── Warrior figure ────────────────────────────────────────────────────────────

function WarriorFigure() {
  return (
    <svg viewBox="0 0 54 66" xmlns="http://www.w3.org/2000/svg"
         style={{ width: '70%', height: '70%' }}>
      {/* Helmet — flat-top, wide, clearly armoured */}
      <rect x="17" y="2"  width="20" height="13" rx="3"  fill="#8a8a9e" stroke="#b0b0c4" strokeWidth="1"/>
      <rect x="15" y="12" width="24" height="5"  rx="1.5" fill="#6a6a7e" stroke="#9a9ab0" strokeWidth="1"/>
      {/* Visor slit */}
      <rect x="19" y="5"  width="16" height="6"  rx="1"   fill="#1e1e2c"/>
      {/* Neck */}
      <rect x="21" y="16" width="12" height="7"  rx="2"   fill="#7a4a30"/>
      {/* Pauldrons (wide shoulders = armoured look) */}
      <ellipse cx="11" cy="27" rx="8"  ry="5" fill="#7e7e90" stroke="#a8a8c0" strokeWidth="1"/>
      <ellipse cx="43" cy="27" rx="8"  ry="5" fill="#7e7e90" stroke="#a8a8c0" strokeWidth="1"/>
      {/* Chest plate */}
      <rect x="15" y="22" width="24" height="20" rx="3" fill="#8a8a9e" stroke="#b0b0c4" strokeWidth="1"/>
      {/* Chest cross detail */}
      <line x1="27" y1="23" x2="27" y2="41" stroke="#6a6a7e" strokeWidth="1"/>
      <line x1="16" y1="32" x2="38" y2="32" stroke="#6a6a7e" strokeWidth="1"/>
      {/* Legs */}
      <rect x="16" y="42" width="9"  height="20" rx="3" fill="#7a7a8e" stroke="#a0a0b8" strokeWidth="1"/>
      <rect x="29" y="42" width="9"  height="20" rx="3" fill="#7a7a8e" stroke="#a0a0b8" strokeWidth="1"/>
      {/* Axe — right side, raised */}
      <rect x="40" y="12" width="3"  height="28" rx="1.5" fill="#a07830"/> {/* handle */}
      <path d="M43,12 L51,7 L53,18 L43,22 Z" fill="#c0c0c0" stroke="#e0e0e0" strokeWidth="0.7"/> {/* head */}
      <line x1="43" y1="17" x2="53" y2="12" stroke="#e8e8e8" strokeWidth="0.5"/> {/* edge glint */}
      {/* Shield — left side */}
      <path d="M4,21 L4,35 L10,43 L16,35 L16,21 Z"
            fill="#7a5a20" stroke="#c4991e" strokeWidth="1.2"/>
      <circle cx="10" cy="31" r="3.5" fill="none" stroke="#c4991e" strokeWidth="1"/>
    </svg>
  );
}

// ── Rogue figure ──────────────────────────────────────────────────────────────

function RogueFigure() {
  return (
    <svg viewBox="0 0 54 66" xmlns="http://www.w3.org/2000/svg"
         style={{ width: '70%', height: '70%' }}>
      {/* Hood — pointed top, most recognisable rogue feature */}
      <path d="M27,1 Q16,3 13,13 Q11,21 14,27 Q19,34 27,34 Q35,34 40,27 Q43,21 41,13 Q38,3 27,1 Z"
            fill="#2a1808" stroke="#3e2610" strokeWidth="1.2"/>
      {/* Pointed hood peak */}
      <path d="M27,1 L31,10 L27,8 L23,10 Z" fill="#1a1004"/>
      {/* Shadow on face */}
      <ellipse cx="27" cy="20" rx="9" ry="10" fill="#321c0c"/>
      {/* Glowing eyes — the rogue's signature */}
      <ellipse cx="22.5" cy="19" rx="2.8" ry="2" fill="#c4991e" opacity="0.95"/>
      <ellipse cx="31.5" cy="19" rx="2.8" ry="2" fill="#c4991e" opacity="0.95"/>
      <ellipse cx="22.5" cy="19" rx="1.4" ry="1" fill="#f0c040" opacity="0.7"/>
      <ellipse cx="31.5" cy="19" rx="1.4" ry="1" fill="#f0c040" opacity="0.7"/>
      {/* Cloak body — tapers to feet */}
      <path d="M13,32 Q7,37 7,48 L8,66 L46,66 L47,48 Q47,37 41,32 Z"
            fill="#2a1808" stroke="#3e2610" strokeWidth="1.2"/>
      {/* Cloak centre fold line */}
      <line x1="27" y1="34" x2="27" y2="66" stroke="#1e1004" strokeWidth="2"/>
      {/* Bow — left side, classic D-curve */}
      <path d="M4,15 Q0,27 4,41"
            fill="none" stroke="#a07830" strokeWidth="3" strokeLinecap="round"/>
      <line x1="4" y1="15" x2="4" y2="41" stroke="#6a5018" strokeWidth="1"/>
      {/* Arrow nocked on bow */}
      <line x1="4" y1="28" x2="18" y2="21" stroke="#d4a820" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M4,28 L8,24 L7,30 Z" fill="#d4a820"/>
      {/* Quiver hint — right shoulder */}
      <rect x="39" y="28" width="6" height="14" rx="2" fill="#3a2210" stroke="#6b4f1a" strokeWidth="1"/>
      <line x1="41" y1="28" x2="41" y2="42" stroke="#6b4f1a" strokeWidth="0.7" strokeDasharray="2,2"/>
    </svg>
  );
}

// ── Shared hero token ─────────────────────────────────────────────────────────

export default function HeroToken({ player, onClick, size }) {
  const sz = size ?? 'clamp(80px, 22vw, 118px)';
  return (
    <div
      onClick={onClick}
      style={{
        width: sz, height: sz,
        borderRadius: '50%',
        border: '2px solid var(--border-gold)',
        background: 'radial-gradient(circle at 40% 35%, #221408 0%, #0a0605 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '2px',
        boxShadow: '0 0 18px rgba(196,153,30,0.2), inset 0 0 14px rgba(0,0,0,0.7)',
        flexShrink: 0,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 0 28px rgba(196,153,30,0.45), inset 0 0 14px rgba(0,0,0,0.7)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(196,153,30,0.2), inset 0 0 14px rgba(0,0,0,0.7)'; }}
    >
      {player.class === 'warrior' ? <WarriorFigure /> : <RogueFigure />}
      <span style={{
        fontSize: 'clamp(9px, 1.8vw, 11px)',
        color: 'var(--text-dim)',
        letterSpacing: '0.04em',
        lineHeight: 1,
        marginTop: '2px',
      }}>
        Lv.{player.level}
      </span>
    </div>
  );
}

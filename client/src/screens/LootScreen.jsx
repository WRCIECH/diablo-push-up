import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';

// ── CSS animations ────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes corpse-pulse {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(196,153,30,0.2)); }
    50%       { filter: drop-shadow(0 0 20px rgba(196,153,30,0.65)); }
  }
  @keyframes tap-bounce {
    0%, 100% { transform: translateY(0);    opacity: 0.5; }
    50%       { transform: translateY(-5px); opacity: 1; }
  }
  @keyframes loot-pop {
    0%   { transform: scale(0.35) translateY(20px); opacity: 0; }
    65%  { transform: scale(1.1)  translateY(-5px); opacity: 1; }
    100% { transform: scale(1)    translateY(0);    opacity: 1; }
  }
  @keyframes btn-fadein {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ── Synthesised reward sounds ─────────────────────────────────────────────────

function note(ctx, type, hz, amp, t, dur) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(hz, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(amp, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur);
}

function playLootSound(loot, hasGold) {
  try {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const hasItem  = !!loot;
    const isPotion = loot?.slot === 'potion';

    if (hasItem && !isPotion) {
      // Magic item: ascending arpeggio + shimmer tail
      [523, 659, 784, 1047].forEach((hz, i) =>
        note(ctx, 'sine', hz, 0.28, ctx.currentTime + i * 0.1, 0.55)
      );
      const sh = ctx.createOscillator();
      const sg = ctx.createGain();
      sh.connect(sg); sg.connect(ctx.destination);
      sh.type = 'triangle';
      sh.frequency.setValueAtTime(1760, ctx.currentTime + 0.15);
      sh.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 0.75);
      sg.gain.setValueAtTime(0.08, ctx.currentTime + 0.15);
      sg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      sh.start(ctx.currentTime + 0.15);
      sh.stop(ctx.currentTime + 0.85);

    } else if (isPotion) {
      // Healing potion: three rising bubbles
      [440, 523, 659].forEach((hz, i) => {
        const t   = ctx.currentTime + i * 0.09;
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hz * 0.85, t);
        osc.frequency.exponentialRampToValueAtTime(hz * 1.18, t + 0.18);
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.start(t); osc.stop(t + 0.42);
      });

    } else if (hasGold) {
      // Gold coins: metallic triangle pings
      [1047, 1319, 987].forEach((hz, i) =>
        note(ctx, 'triangle', hz, 0.22, ctx.currentTime + i * 0.09, 0.38)
      );

    } else {
      // Nothing: dull thud
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.28);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    }
  } catch (_) { /* audio unavailable */ }
}

// ── Dead monster portrait ─────────────────────────────────────────────────────

function CorpsePortrait({ monster }) {
  const isAnimal = monster?.type === 'Animal';
  const pal = isAnimal
    ? { bg: '#060806', border: '#162510', body: '#1a3010' }
    : { bg: '#100606', border: '#300a0a', body: '#3a1010' };

  return (
    <svg viewBox="0 0 96 96" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" fill={pal.bg} rx="4"/>
      <rect x="2" y="2" width="92" height="92" fill="none" stroke={pal.border} strokeWidth="1.5" rx="3"/>
      {/* Creature tilted ~18° — looks knocked over */}
      <g transform="rotate(18, 48, 60)">
        <ellipse cx="48" cy="36" rx="22" ry="20" fill={pal.body} opacity="0.65"/>
        {/* X left eye */}
        <line x1="35" y1="28" x2="42" y2="35" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
        <line x1="42" y1="28" x2="35" y2="35" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
        {/* X right eye */}
        <line x1="54" y1="28" x2="61" y2="35" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
        <line x1="61" y1="28" x2="54" y2="35" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
        {/* Body */}
        <path d="M28,52 Q22,68 26,88 L70,88 Q74,68 68,52 Q58,60 48,58 Q38,60 28,52 Z"
              fill={pal.body} opacity="0.45"/>
        {/* Limp arms */}
        <path d="M28,54 Q10,65 8,80"  fill="none" stroke={pal.body} strokeWidth="7" strokeLinecap="round" opacity="0.5"/>
        <path d="M68,54 Q86,65 88,80" fill="none" stroke={pal.body} strokeWidth="7" strokeLinecap="round" opacity="0.5"/>
      </g>
      {/* Defeat sparkles */}
      <text x="7"  y="18" fontSize="10" fill="#c4991e" opacity="0.38">✦</text>
      <text x="76" y="13" fontSize="7"  fill="#c4991e" opacity="0.28">✦</text>
      <text x="83" y="32" fontSize="9"  fill="#c4991e" opacity="0.32">✦</text>
    </svg>
  );
}

// ── Loot reveal ───────────────────────────────────────────────────────────────

function LootReveal({ loot, gold }) {
  const hasGold  = gold > 0;
  const hasItem  = !!loot;
  const isPotion = loot?.slot === 'potion';
  const name     = hasItem ? resolveItemName(loot)     : null;
  const stat     = hasItem ? getItemStatLine(loot)     : null;
  const color    = hasItem ? qualityColor(loot.quality) : 'var(--text-gold)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      animation: 'loot-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      {hasGold && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🪙</span>
          <span style={{ color: 'var(--text-gold)', fontSize: '28px', fontWeight: 800,
                         fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            +{gold}g
          </span>
        </div>
      )}

      {hasItem && (
        <div style={{
          textAlign: 'center', padding: '12px 18px',
          background: 'rgba(196,153,30,0.07)',
          border: '1px solid rgba(196,153,30,0.25)', borderRadius: '4px',
        }}>
          <div style={{ fontSize: isPotion ? '30px' : '20px', marginBottom: '6px' }}>
            {isPotion ? '🧪' : '⚔'}
          </div>
          <div style={{ color, fontSize: '14px', fontWeight: 700 }}>
            {name}
            {loot.quality === 'unique' && (
              <span style={{ color: 'var(--text-gold)', fontSize: '10px',
                             marginLeft: '8px', letterSpacing: '0.1em' }}>UNIQUE</span>
            )}
          </div>
          {stat && (
            <div className="text-dim" style={{ fontSize: '12px', marginTop: '4px' }}>{stat}</div>
          )}
          <div className="text-dim" style={{ fontSize: '11px', marginTop: '3px', fontStyle: 'italic' }}>
            Sell value: {loot.sell_price}g
          </div>
          {loot.quality !== 'normal' && !loot.identified && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--blue-text)' }}>
              Unidentified — visit Deckard Cain (100g)
            </div>
          )}
        </div>
      )}

      {!hasGold && !hasItem && (
        <div className="text-dim" style={{ fontSize: '13px', fontStyle: 'italic' }}>
          Nothing of value.
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LootScreen() {
  const { lootResult, setScreen } = useGame();
  const [opened, setOpened] = useState(false);

  const { gold = 0, exp = 0, newLevel, leveledUp, loot, monster } = lootResult || {};

  function handleCorpseClick() {
    if (opened) return;
    playLootSound(loot, gold > 0);
    setOpened(true);
  }

  if (!lootResult) {
    return (
      <div className="screen">
        <div className="panel" style={{ padding: '20px', textAlign: 'center', margin: 'auto' }}>
          <div className="text-dim">No loot data.</div>
          <button className="btn btn-primary" style={{ marginTop: '12px' }}
                  onClick={() => setScreen('dungeon')}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <style>{STYLES}</style>

      {/* Victory header */}
      <div className="panel panel-gold" style={{ padding: '14px', textAlign: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: '20px' }}>⚔ Victory!</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
          {exp  > 0  && <Badge label="EXP"                value={`+${exp}`} color="var(--text-gold)" />}
          {leveledUp && <Badge label={`Level ${newLevel}!`} value="↑"       color="var(--green-text)" />}
        </div>
        {leveledUp && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Spend your +5 stat points in the Character screen.
          </div>
        )}
      </div>

      {/* Corpse + loot reveal */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '18px', padding: '20px 16px',
      }}>
        {monster && (
          <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.1em',
                                             textTransform: 'uppercase' }}>
            {monster.name} defeated
          </div>
        )}

        <div
          onClick={handleCorpseClick}
          style={{
            cursor: opened ? 'default' : 'pointer',
            animation: opened ? 'none' : 'corpse-pulse 2s ease-in-out infinite',
          }}
        >
          <CorpsePortrait monster={monster} />
        </div>

        {!opened ? (
          <div style={{
            color: 'var(--text-gold)', fontSize: '12px', letterSpacing: '0.12em',
            animation: 'tap-bounce 1.5s ease-in-out infinite',
          }}>
            TAP TO LOOT
          </div>
        ) : (
          <LootReveal loot={loot} gold={gold} />
        )}
      </div>

      {/* Continue — appears after looting */}
      {opened && (
        <button
          className="btn btn-primary btn-full"
          style={{ fontSize: '14px', padding: '16px', flexShrink: 0,
                   animation: 'btn-fadein 0.3s 0.45s ease-out both' }}
          onClick={() => setScreen('dungeon')}
        >
          Continue
        </button>
      )}
    </div>
  );
}

function Badge({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: '20px', fontWeight: 700 }}>{value}</div>
      <div className="text-dim" style={{ fontSize: '11px' }}>{label}</div>
    </div>
  );
}

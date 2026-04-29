import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';
import ItemIcon from '../components/ItemIcon.jsx';

// ── CSS animations ────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes chest-pulse {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(196,153,30,0.25)); }
    50%       { filter: drop-shadow(0 0 24px rgba(196,153,30,0.7)); }
  }
  @keyframes chest-tap {
    0%, 100% { transform: translateY(0);    opacity: 0.5; }
    50%       { transform: translateY(-5px); opacity: 1; }
  }
  @keyframes chest-pop {
    0%   { transform: scale(0.35) translateY(20px); opacity: 0; }
    65%  { transform: scale(1.1)  translateY(-5px); opacity: 1; }
    100% { transform: scale(1)    translateY(0);    opacity: 1; }
  }
  @keyframes btn-fadein {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ── Sounds ────────────────────────────────────────────────────────────────────

function playOpenSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Wooden creak
    const creak = ctx.createOscillator(); const cg = ctx.createGain();
    creak.connect(cg); cg.connect(ctx.destination);
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(160, ctx.currentTime);
    creak.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.25);
    cg.gain.setValueAtTime(0.18, ctx.currentTime);
    cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    creak.start(); creak.stop(ctx.currentTime + 0.3);
    // Thud of lid
    const thud = ctx.createOscillator(); const tg = ctx.createGain();
    thud.connect(tg); tg.connect(ctx.destination);
    thud.type = 'square';
    thud.frequency.setValueAtTime(70, ctx.currentTime + 0.15);
    thud.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.35);
    tg.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    tg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    thud.start(ctx.currentTime + 0.15); thud.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function playLootRevealSound(loots, hasGold) {
  try {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const hasItem  = loots.length > 0;
    const isMagic  = hasItem && loots[0].quality !== 'normal';
    const isPotion = hasItem && loots[0].slot === 'potion';

    if (hasItem && isMagic && !isPotion) {
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
    <svg viewBox="0 0 120 84" width="160" height="112" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="81" rx="42" ry="4" fill="#000" opacity="0.25"/>
      {/* Body */}
      <rect x="8" y="42" width="104" height="36" rx="4" fill="#4a2e0e" stroke="#8a6228" strokeWidth="2"/>
      <rect x="8" y="55" width="104" height="8"  fill="#c4991e" opacity="0.55"/>
      {/* Lid */}
      <rect x="8" y={opened ? 5  : 16} width="104" height="28" rx="4" fill="#5a3a14" stroke="#8a6228" strokeWidth="2"/>
      <rect x="8" y={opened ? 25 : 36} width="104" height="6"  fill="#c4991e" opacity="0.55"/>
      {/* Lock */}
      {!opened && (
        <>
          <rect x="50" y="33" width="20" height="14" rx="3" fill="#c4991e"/>
          <circle cx="60" cy="42" r="4"   fill="#8a6010"/>
          <rect   x="58" y="42" width="4" height="7" rx="1" fill="#8a6010"/>
        </>
      )}
      {/* Hinges */}
      <rect x="14" y={opened ? 29 : 40} width="12" height="7" rx="1.5" fill="#7a5220"/>
      <rect x="94" y={opened ? 29 : 40} width="12" height="7" rx="1.5" fill="#7a5220"/>
      {/* Inner glow */}
      {opened && <ellipse cx="60" cy="50" rx="38" ry="10" fill="#c4991e" opacity="0.12"/>}
    </svg>
  );
}

// ── Loot item card ────────────────────────────────────────────────────────────

function LootItemCard({ item, delay }) {
  const name  = resolveItemName(item);
  const stat  = getItemStatLine(item);
  const color = qualityColor(item.quality);
  return (
    <div style={{
      flex: '1 1 0', minWidth: 0, textAlign: 'center', padding: '10px 8px',
      background: 'rgba(196,153,30,0.07)',
      border: '1px solid rgba(196,153,30,0.25)', borderRadius: '4px',
      animation: `chest-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
        <ItemIcon item={item} size={44}/>
      </div>
      <div style={{ color, fontSize: '12px', fontWeight: 700, lineHeight: 1.3 }}>
        {name}
        {item.quality === 'unique' && (
          <div style={{ color: 'var(--text-gold)', fontSize: '9px', letterSpacing: '0.1em' }}>UNIQUE</div>
        )}
      </div>
      {stat && <div className="text-dim" style={{ fontSize: '10px', marginTop: '3px' }}>{stat}</div>}
      <div className="text-dim" style={{ fontSize: '10px', marginTop: '2px', fontStyle: 'italic' }}>
        {item.sell_price}g
      </div>
      {item.quality !== 'normal' && !item.identified && (
        <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--blue-text)' }}>Unidentified</div>
      )}
    </div>
  );
}

// ── Loot reveal ───────────────────────────────────────────────────────────────

function LootReveal({ loots, gold }) {
  const hasGold  = gold > 0;
  const hasItems = loots.length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
      {hasGold && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
                      animation: 'chest-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <span style={{ fontSize: '28px' }}>🪙</span>
          <span style={{ color: 'var(--text-gold)', fontSize: '28px', fontWeight: 800,
                         fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            +{gold}g
          </span>
        </div>
      )}
      {hasItems && (
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {loots.map((item, i) => (
            <LootItemCard key={item.uid} item={item} delay={hasGold ? (i + 1) * 120 : i * 120}/>
          ))}
        </div>
      )}
      {!hasGold && !hasItems && (
        <div className="text-dim" style={{ fontSize: '13px', fontStyle: 'italic',
                                            animation: 'chest-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          Empty. Dust and cobwebs.
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChestScreen() {
  const { chestResult, setScreen } = useGame();
  const [opened, setOpened] = useState(false);

  const { gold = 0, loots = [] } = chestResult || {};

  function handleChestClick() {
    if (opened) return;
    playOpenSound();
    playLootRevealSound(loots, gold > 0);
    setOpened(true);
  }

  if (!chestResult) {
    return (
      <div className="screen">
        <div className="panel" style={{ padding: '20px', textAlign: 'center', margin: 'auto' }}>
          <div className="text-dim">No chest data.</div>
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

      {/* Header */}
      <div className="panel panel-gold" style={{ padding: '14px', textAlign: 'center', flexShrink: 0 }}>
        <div className="title-large" style={{ fontSize: '20px' }}>Treasure Chest</div>
        <div className="text-dim" style={{ fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>
          Hidden in the darkness of the cathedral
        </div>
      </div>

      {/* Chest + reveal */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '18px', padding: '20px 16px',
      }}>
        <div
          onClick={handleChestClick}
          style={{
            cursor: opened ? 'default' : 'pointer',
            animation: opened ? 'none' : 'chest-pulse 2s ease-in-out infinite',
          }}
        >
          <ChestSVG opened={opened}/>
        </div>

        {!opened ? (
          <div style={{
            color: 'var(--text-gold)', fontSize: '12px', letterSpacing: '0.12em',
            animation: 'chest-tap 1.5s ease-in-out infinite',
          }}>
            TAP TO OPEN
          </div>
        ) : (
          <LootReveal loots={loots} gold={gold}/>
        )}
      </div>

      {/* Continue */}
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

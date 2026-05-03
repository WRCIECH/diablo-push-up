import React from 'react';

export default function LifeOrb({ current, max, size = 64 }) {
  const ratio    = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const pct      = ratio * 100;
  const lowLife  = ratio < 0.3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#130202', border: '2px solid #5a1212',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        boxShadow: lowLife ? '0 0 8px rgba(200,20,20,0.5)' : 'none',
      }}>
        {/* Liquid fill from bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: lowLife ? '#9a0808' : '#7a0a0a',
          transition: 'height 0.9s linear, background 0.5s',
        }}/>
        {/* Ripple line at fill surface */}
        {ratio > 0.01 && ratio < 0.99 && (
          <div style={{
            position: 'absolute', bottom: `${pct}%`, left: 0, right: 0,
            height: 3, background: 'rgba(204,34,34,0.55)',
          }}/>
        )}
        {/* Glass shine */}
        <div style={{
          position: 'absolute', top: '18%', left: '14%',
          width: '28%', height: '18%',
          background: 'rgba(255,255,255,0.13)', borderRadius: '50%',
        }}/>
      </div>
      <div style={{
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em',
        color: lowLife ? 'var(--red-text)' : 'var(--text-cream)',
      }}>
        {Math.ceil(Math.max(0, current))}
        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> / {Math.round(max)}</span>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { generateUID } from '../utils/items.js';
import { useMusic } from '../hooks/useMusic.js';
import ItemIcon from '../components/ItemIcon.jsx';

const POTION_CATALOG = [
  { id: 'healing_potion',      name: 'Healing Potion',     heal: 'partial', price: 50,  sell_price: 12,
    effect: '+30s fight time' },
  { id: 'full_healing_potion', name: 'Full Healing Potion', heal: 'full',    price: 150, sell_price: 37,
    effect: 'Restores full vitality buffer' },
];

const DIALOGS = {
  idle:    "Greetings, weary soul. The horrors below leave their mark on body and spirit. Come, let me tend to your wounds.",
  healed:  "There you are. Try to rest if you can, though I fear this land offers little comfort.",
  bought:  "These potions are my finest brew. They will buy you precious moments when the darkness presses close.",
  no_gold: "I wish I could give these freely, but my supplies are not without cost. I need gold to continue my work.",
};

// ── NPC portrait ──────────────────────────────────────────────────────────────

function PepinPortrait() {
  return (
    <svg viewBox="0 0 80 96" width="80" height="96" xmlns="http://www.w3.org/2000/svg">
      <path d="M22,44 Q18,62 16,90 L64,90 Q62,62 58,44 Z" fill="#1a2a1a" stroke="#2a4a2a" strokeWidth="1.5"/>
      <rect x="36" y="56" width="8" height="20" rx="1" fill="#c4991e" opacity="0.6"/>
      <rect x="30" y="62" width="20" height="8" rx="1" fill="#c4991e" opacity="0.6"/>
      <ellipse cx="40" cy="28" rx="13" ry="15" fill="#5a3a20" stroke="#4a3010" strokeWidth="1"/>
      <path d="M27,28 Q29,12 40,10 Q51,12 53,28 L51,32 Q40,24 29,32 Z" fill="#142214" stroke="#2a4a2a" strokeWidth="1.5"/>
      <ellipse cx="35" cy="28" rx="2" ry="1.5" fill="#c8b78a"/>
      <ellipse cx="45" cy="28" rx="2" ry="1.5" fill="#c8b78a"/>
      <path d="M36,34 Q40,37 44,34" fill="none" stroke="#c8b78a" strokeWidth="1"/>
      <ellipse cx="18" cy="68" rx="6" ry="10" fill="#5a1a1a" stroke="#8b2222" strokeWidth="1"/>
      <rect x="16" y="56" width="4" height="6" rx="1" fill="#6b4f1a"/>
      <ellipse cx="18" cy="68" rx="4" ry="6" fill="#cc3333" opacity="0.5"/>
      <ellipse cx="18" cy="68" rx="8" ry="12" fill="#cc3333" opacity="0.06"/>
    </svg>
  );
}

// ── Potion detail modal ───────────────────────────────────────────────────────

function PotionModal({ potion, playerGold, onClose, onBuy }) {
  const iconItem  = { id: potion.id, slot: 'potion', heal: potion.heal };
  const canAfford = playerGold >= potion.price;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: '100%', maxWidth: '320px', padding: '16px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + name */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            flexShrink: 0, background: '#09090e', borderRadius: '4px',
            border: '2px solid #383838', padding: '4px', lineHeight: 0,
          }}>
            <ItemIcon item={iconItem} size={56}/>
          </div>
          <div>
            <div style={{ color: 'var(--text-cream)', fontSize: '14px', fontWeight: 700 }}>
              {potion.name}
            </div>
            <div className="text-dim" style={{ fontSize: '11px', marginTop: '3px' }}>potion</div>
          </div>
        </div>

        <div className="divider" style={{ marginBottom: '10px' }}/>

        {/* Effect */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span className="text-dim" style={{ fontSize: '12px' }}>Effect</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green-text)' }}>
            {potion.effect}
          </span>
        </div>
        <div className="text-dim" style={{ fontSize: '11px', fontStyle: 'italic', marginBottom: '10px' }}>
          Usable only when vitality buffer is active.
        </div>

        <div className="divider" style={{ marginBottom: '10px' }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span className="text-dim" style={{ fontSize: '12px' }}>Price</span>
          <span style={{ color: 'var(--text-gold)', fontSize: '13px', fontWeight: 600 }}>
            {potion.price}g
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary btn-full"
            style={{ fontSize: '12px' }}
            disabled={!canAfford}
            onClick={onBuy}
          >
            {canAfford ? 'Buy' : 'Not enough gold'}
          </button>
          <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '13px' }}
                  onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Potion grid cell ──────────────────────────────────────────────────────────

function PotionCell({ potion, onSelect }) {
  const iconItem = { id: potion.id, slot: 'potion', heal: potion.heal };
  return (
    <div
      onClick={() => onSelect(potion)}
      style={{
        background: '#0c0c14', cursor: 'pointer', borderRadius: '3px',
        border: '2px solid #383838',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '8px 4px', gap: '4px',
      }}
    >
      <ItemIcon item={iconItem} size={42}/>
      <span style={{ fontSize: '10px', color: 'var(--text-cream)', textAlign: 'center', lineHeight: 1.2 }}>
        {potion.name}
      </span>
      <span style={{ fontSize: '9px', color: 'var(--text-gold)' }}>{potion.price}g</span>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PepinScreen() {
  useMusic('/audio/tristram.mp3');
  const { state, dispatchAndSave, setScreen } = useGame();
  const player = state.player;
  const [dialog,   setDialog]   = useState('idle');
  const [selected, setSelected] = useState(null);

  const isFullHealth = player.stats.life >= player.stats.maxLife;

  function handleHeal() {
    dispatchAndSave({ type: 'HEAL_FULL' });
    setDialog('healed');
  }

  function handleBuy(potion) {
    if (player.gold < potion.price) { setDialog('no_gold'); return; }
    const item = {
      ...potion,
      slot: 'potion', type: 'healing',
      quality: 'normal', identified: true,
      uid: generateUID('potion'),
    };
    dispatchAndSave({ type: 'SPEND_GOLD', payload: potion.price });
    dispatchAndSave({ type: 'ADD_ITEM',   payload: item });
    setDialog('bought');
    setSelected(null);
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => setScreen('tristram')}>
          ← Tristram
        </button>
        <span className="title-medium">Pepin the Healer</span>
      </div>

      {/* Portrait + dialog */}
      <div className="panel" style={{ padding: '14px', display: 'flex', gap: '14px',
                                       alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <PepinPortrait/>
        </div>
        <div style={{ flex: 1 }}>
          <div className="title-small" style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>Pepin</div>
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8 }}>
            "{DIALOGS[dialog]}"
          </div>
        </div>
      </div>

      {/* Free heal */}
      <div className="panel" style={{ padding: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="title-small">Your Health</span>
          <span className="text-red" style={{ fontSize: '14px', fontWeight: 700 }}>
            {player.stats.life} / {player.stats.maxLife}
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: '10px' }}>
          <div className="progress-fill" style={{
            width: `${(player.stats.life / player.stats.maxLife) * 100}%`,
            background: 'linear-gradient(90deg, #6b0000, #cc2222)',
          }}/>
        </div>
        <button className="btn btn-primary btn-full" onClick={handleHeal} disabled={isFullHealth}>
          {isFullHealth ? 'You are at full health' : 'Heal me — Free'}
        </button>
      </div>

      {/* Potion shop */}
      <div className="panel" style={{ padding: '12px', flexShrink: 0 }}>
        <div className="title-small" style={{ marginBottom: '10px' }}>Potions for Sale</div>
        <div className="divider" style={{ marginBottom: '10px' }}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {POTION_CATALOG.map(potion => (
            <PotionCell key={potion.id} potion={potion} onSelect={setSelected}/>
          ))}
        </div>
      </div>

      {/* Gold */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
        <span className="text-dim" style={{ fontSize: '12px' }}>Gold: </span>
        <span className="text-gold" style={{ fontSize: '14px', fontWeight: 700, marginLeft: '6px' }}>
          {player.gold}
        </span>
      </div>

      {/* Potion detail modal */}
      {selected && (
        <PotionModal
          potion={selected}
          playerGold={player.gold}
          onClose={() => setSelected(null)}
          onBuy={() => handleBuy(selected)}
        />
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { generateUID } from '../utils/items.js';

const POTIONS = [
  { id: 'healing_potion',      name: 'Healing Potion',      heal: 'partial', price: 50,  sell_price: 12 },
  { id: 'full_healing_potion', name: 'Full Healing Potion',  heal: 'full',    price: 150, sell_price: 37 },
];

const DIALOGS = {
  idle:    "Greetings, weary soul. The horrors below leave their mark on body and spirit. Come, let me tend to your wounds.",
  healed:  "There you are. Try to rest if you can, though I fear this land offers little comfort.",
  bought:  "These potions are my finest brew. They will buy you precious moments when the darkness presses close.",
  no_gold: "I wish I could give these freely, but my supplies are not without cost. I need gold to continue my work.",
};

function PepinPortrait() {
  return (
    <svg viewBox="0 0 80 96" width="80" height="96" xmlns="http://www.w3.org/2000/svg">
      {/* Robe */}
      <path d="M22,44 Q18,62 16,90 L64,90 Q62,62 58,44 Z" fill="#1a2a1a" stroke="#2a4a2a" strokeWidth="1.5"/>
      {/* Cross / healer symbol */}
      <rect x="36" y="56" width="8" height="20" rx="1" fill="#c4991e" opacity="0.6"/>
      <rect x="30" y="62" width="20" height="8" rx="1" fill="#c4991e" opacity="0.6"/>
      {/* Head */}
      <ellipse cx="40" cy="28" rx="13" ry="15" fill="#5a3a20" stroke="#4a3010" strokeWidth="1"/>
      {/* Hood */}
      <path d="M27,28 Q29,12 40,10 Q51,12 53,28 L51,32 Q40,24 29,32 Z" fill="#142214" stroke="#2a4a2a" strokeWidth="1.5"/>
      {/* Eyes — gentle */}
      <ellipse cx="35" cy="28" rx="2" ry="1.5" fill="#c8b78a"/>
      <ellipse cx="45" cy="28" rx="2" ry="1.5" fill="#c8b78a"/>
      {/* Smile */}
      <path d="M36,34 Q40,37 44,34" fill="none" stroke="#c8b78a" strokeWidth="1"/>
      {/* Potion in left hand */}
      <ellipse cx="18" cy="68" rx="6" ry="10" fill="#5a1a1a" stroke="#8b2222" strokeWidth="1"/>
      <rect x="16" y="56" width="4" height="6" rx="1" fill="#6b4f1a"/>
      <ellipse cx="18" cy="68" rx="4" ry="6" fill="#cc3333" opacity="0.5"/>
      {/* Glow from potion */}
      <ellipse cx="18" cy="68" rx="8" ry="12" fill="#cc3333" opacity="0.06"/>
    </svg>
  );
}

export default function PepinScreen() {
  const { state, dispatchAndSave, setScreen } = useGame();
  const player = state.player;
  const [dialog, setDialog] = useState('idle');
  const isFullHealth = player.stats.life >= player.stats.maxLife;

  function handleHeal() {
    dispatchAndSave({ type: 'HEAL_FULL' });
    setDialog('healed');
  }

  function handleBuy(potion) {
    if (player.gold < potion.price) { setDialog('no_gold'); return; }
    const item = {
      ...potion,
      slot: 'potion',
      type: 'healing',
      quality: 'normal',
      identified: true,
      uid: generateUID('potion'),
    };
    dispatchAndSave({ type: 'SPEND_GOLD', payload: potion.price });
    dispatchAndSave({ type: 'ADD_ITEM',   payload: item });
    setDialog('bought');
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setScreen('tristram')}>
          ← Tristram
        </button>
        <span className="title-medium">Pepin the Healer</span>
      </div>

      {/* Portrait + dialog */}
      <div className="panel" style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <PepinPortrait />
        </div>
        <div style={{ flex: 1 }}>
          <div className="title-small" style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>Pepin</div>
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8 }}>
            "{DIALOGS[dialog]}"
          </div>
        </div>
      </div>

      {/* Heal button */}
      <div className="panel" style={{ padding: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span className="title-small">Your Health</span>
          <span className="text-red" style={{ fontSize: '14px', fontWeight: 700 }}>
            {player.stats.life} / {player.stats.maxLife}
          </span>
        </div>

        {/* Life bar */}
        <div className="progress-bar" style={{ marginBottom: '12px' }}>
          <div
            className="progress-fill"
            style={{
              width: `${(player.stats.life / player.stats.maxLife) * 100}%`,
              background: 'linear-gradient(90deg, #6b0000, #cc2222)',
            }}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleHeal}
          disabled={isFullHealth}
        >
          {isFullHealth ? 'You are at full health' : 'Heal me — Free'}
        </button>
      </div>

      {/* Potion shop */}
      <div className="panel scrollable" style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <div className="title-small" style={{ marginBottom: '4px' }}>Potions for Sale</div>

        {POTIONS.map(potion => (
          <div
            key={potion.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '2px' }}
          >
            <div>
              <div style={{ color: 'var(--text-cream)', fontSize: '13px' }}>{potion.name}</div>
              <div className="text-dim" style={{ fontSize: '11px' }}>+30s fight time</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="text-gold" style={{ fontSize: '13px', fontWeight: 600 }}>{potion.price}g</span>
              <button
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '11px' }}
                disabled={player.gold < potion.price}
                onClick={() => handleBuy(potion)}
              >
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Gold */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
        <span className="text-dim" style={{ fontSize: '12px' }}>Gold: </span>
        <span className="text-gold" style={{ fontSize: '14px', fontWeight: 700, marginLeft: '6px' }}>{player.gold}</span>
      </div>
    </div>
  );
}

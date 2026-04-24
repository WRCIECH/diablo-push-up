import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';
import { useMusic } from '../hooks/useMusic.js';

const DIALOGS = {
  idle:      "Welcome, friend! Come to stock up before heading back into those cursed catacombs? Smart thinking. Have a look — finest quality, I assure you!",
  bought:    "Excellent choice! That'll serve you well down there. Come back if you need anything else.",
  sold:      "I'll take it off your hands. Always good to have a bit of extra gold, eh?",
  no_gold:   "Ha! I'd love to give it away but I've got a business to run. Come back when you've got the coin.",
  no_equip:  "Nothing in your pack worth selling? Get out there and bring me something interesting!",
};

function GriswoldPortrait() {
  return (
    <svg viewBox="0 0 80 96" width="80" height="96" xmlns="http://www.w3.org/2000/svg">
      {/* Body — stocky */}
      <rect x="18" y="44" width="44" height="42" rx="4" fill="#2a1a08" stroke="#6b4f1a" strokeWidth="1.5"/>
      {/* Apron */}
      <path d="M28,44 L52,44 L56,86 L24,86 Z" fill="#1a0e04" stroke="#6b4f1a" strokeWidth="1" opacity="0.8"/>
      {/* Head — wide/stocky */}
      <ellipse cx="40" cy="28" rx="16" ry="14" fill="#6b3a20" stroke="#5a3010" strokeWidth="1"/>
      {/* Hair / beard area */}
      <path d="M24,32 Q28,44 40,46 Q52,44 56,32" fill="#3a1a08" stroke="none"/>
      {/* Short beard */}
      <ellipse cx="40" cy="38" rx="12" ry="6" fill="#3a1a08"/>
      {/* Eyes — stern */}
      <ellipse cx="34" cy="25" rx="2.5" ry="2" fill="#c8b78a"/>
      <ellipse cx="46" cy="25" rx="2.5" ry="2" fill="#c8b78a"/>
      {/* Eyebrows — thick */}
      <rect x="31" y="22" width="7" height="2" rx="1" fill="#1a0e04"/>
      <rect x="42" y="22" width="7" height="2" rx="1" fill="#1a0e04"/>
      {/* Hammer in right hand */}
      <rect x="58" y="50" width="5" height="32" rx="2" fill="#5a3a20"/>
      <rect x="54" y="44" width="13" height="14" rx="2" fill="#6b6b6b" stroke="#4a4a4a" strokeWidth="1"/>
      {/* Anvil */}
      <rect x="8" y="76" width="20" height="8" rx="2" fill="#4a4a4a"/>
      <rect x="10" y="70" width="16" height="8" rx="1" fill="#5a5a5a"/>
      {/* Sparks */}
      <circle cx="32" cy="72" r="1.5" fill="#f0c040" opacity="0.8"/>
      <circle cx="36" cy="68" r="1"   fill="#f0c040" opacity="0.6"/>
      <circle cx="28" cy="74" r="1"   fill="#f0c040" opacity="0.7"/>
    </svg>
  );
}

function ItemRow({ item, action, actionLabel, actionDisabled, gold }) {
  const name = resolveItemName(item);
  const stat = getItemStatLine(item);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '2px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: qualityColor(item.quality), fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div className="text-dim" style={{ fontSize: '11px' }}>{stat}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span className="text-gold" style={{ fontSize: '13px', fontWeight: 600 }}>{gold}g</span>
        <button
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '11px' }}
          disabled={actionDisabled}
          onClick={action}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function GriswoldScreen() {
  useMusic('/audio/tristram.mp3');   // continue Tristram music
  const { state, dispatchAndSave, setScreen, shopInventory } = useGame();
  const player = state.player;
  const [tab, setTab] = useState('buy');
  const [dialog, setDialog] = useState('idle');

  const sellableItems = player.inventory.filter(i => i.slot !== 'potion');

  function handleBuy(item) {
    if (player.gold < item.price) { setDialog('no_gold'); return; }
    dispatchAndSave({ type: 'SPEND_GOLD', payload: item.price });
    dispatchAndSave({ type: 'ADD_ITEM',   payload: { ...item } });
    setDialog('bought');
  }

  function handleSell(item) {
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: item.uid });
    dispatchAndSave({ type: 'ADD_GOLD',    payload: item.sell_price });
    setDialog('sold');
  }

  const items = shopInventory || [];

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setScreen('tristram')}>
          ← Tristram
        </button>
        <span className="title-medium">Griswold's Shop</span>
      </div>

      {/* Portrait + dialog */}
      <div className="panel" style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <GriswoldPortrait />
        </div>
        <div style={{ flex: 1 }}>
          <div className="title-small" style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>Griswold</div>
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8 }}>
            "{DIALOGS[dialog]}"
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          className={`btn ${tab === 'buy' ? 'btn-primary' : 'btn-ghost'} btn-full`}
          onClick={() => setTab('buy')}
          style={{ fontSize: '12px' }}
        >
          Buy
        </button>
        <button
          className={`btn ${tab === 'sell' ? 'btn-primary' : 'btn-ghost'} btn-full`}
          onClick={() => setTab('sell')}
          style={{ fontSize: '12px' }}
        >
          Sell
        </button>
      </div>

      {/* Item list */}
      <div className="panel scrollable" style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        {tab === 'buy' && (
          <>
            <div className="title-small" style={{ marginBottom: '4px' }}>
              Griswold's Wares
              <span className="text-dim" style={{ marginLeft: '8px', fontSize: '11px', textTransform: 'none', letterSpacing: 0 }}>
                · {items.length} items
              </span>
            </div>
            {items.length === 0 && (
              <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic', padding: '12px 0' }}>
                Loading wares...
              </div>
            )}
            {items.map((item, i) => (
              <ItemRow
                key={item.uid || i}
                item={item}
                gold={item.price}
                actionLabel="Buy"
                actionDisabled={player.gold < item.price}
                action={() => handleBuy(item)}
              />
            ))}
          </>
        )}

        {tab === 'sell' && (
          <>
            <div className="title-small" style={{ marginBottom: '4px' }}>Your Inventory</div>
            {sellableItems.length === 0 && (
              <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic', padding: '12px 0' }}>
                Nothing to sell
              </div>
            )}
            {sellableItems.map(item => (
              <ItemRow
                key={item.uid}
                item={item}
                gold={item.sell_price}
                actionLabel="Sell"
                actionDisabled={false}
                action={() => handleSell(item)}
              />
            ))}
          </>
        )}
      </div>

      {/* Gold */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
        <span className="text-dim" style={{ fontSize: '12px' }}>Gold: </span>
        <span className="text-gold" style={{ fontSize: '14px', fontWeight: 700, marginLeft: '6px' }}>{player.gold}</span>
      </div>
    </div>
  );
}

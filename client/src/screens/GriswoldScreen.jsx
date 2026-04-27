import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { resolveItemName, qualityColor } from '../utils/items.js';
import { useMusic } from '../hooks/useMusic.js';
import ItemIcon from '../components/ItemIcon.jsx';

const DIALOGS = {
  idle:    "Welcome, friend! Come to stock up before heading back into those cursed catacombs? Smart thinking. Have a look — finest quality, I assure you!",
  bought:  "Excellent choice! That'll serve you well down there. Come back if you need anything else.",
  sold:    "I'll take it off your hands. Always good to have a bit of extra gold, eh?",
  no_gold: "Ha! I'd love to give it away but I've got a business to run. Come back when you've got the coin.",
};

// ── NPC portrait ──────────────────────────────────────────────────────────────

function GriswoldPortrait() {
  return (
    <svg viewBox="0 0 80 96" width="80" height="96" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="44" width="44" height="42" rx="4" fill="#2a1a08" stroke="#6b4f1a" strokeWidth="1.5"/>
      <path d="M28,44 L52,44 L56,86 L24,86 Z" fill="#1a0e04" stroke="#6b4f1a" strokeWidth="1" opacity="0.8"/>
      <ellipse cx="40" cy="28" rx="16" ry="14" fill="#6b3a20" stroke="#5a3010" strokeWidth="1"/>
      <path d="M24,32 Q28,44 40,46 Q52,44 56,32" fill="#3a1a08"/>
      <ellipse cx="40" cy="38" rx="12" ry="6" fill="#3a1a08"/>
      <ellipse cx="34" cy="25" rx="2.5" ry="2" fill="#c8b78a"/>
      <ellipse cx="46" cy="25" rx="2.5" ry="2" fill="#c8b78a"/>
      <rect x="31" y="22" width="7" height="2" rx="1" fill="#1a0e04"/>
      <rect x="42" y="22" width="7" height="2" rx="1" fill="#1a0e04"/>
      <rect x="58" y="50" width="5" height="32" rx="2" fill="#5a3a20"/>
      <rect x="54" y="44" width="13" height="14" rx="2" fill="#6b6b6b" stroke="#4a4a4a" strokeWidth="1"/>
      <rect x="8"  y="76" width="20" height="8" rx="2" fill="#4a4a4a"/>
      <rect x="10" y="70" width="16" height="8" rx="1" fill="#5a5a5a"/>
      <circle cx="32" cy="72" r="1.5" fill="#f0c040" opacity="0.8"/>
      <circle cx="36" cy="68" r="1"   fill="#f0c040" opacity="0.6"/>
      <circle cx="28" cy="74" r="1"   fill="#f0c040" opacity="0.7"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function qualityBorder(quality) {
  if (quality === 'unique') return '#9a6a10';
  if (quality === 'magic')  return '#3a5a90';
  return '#383838';
}

function buildStatRows(item) {
  if (item.type === 'healing') return [{ label: 'Fight time', value: '+30s', color: 'var(--green-text)' }];
  const b = {};
  if (item.identified) {
    for (const rolled of [item.prefix?.rolled, item.suffix?.rolled]) {
      for (const [k, v] of Object.entries(rolled || {})) b[k] = (b[k] || 0) + v;
    }
  }
  const rows = [];
  if (item.damage) {
    const flat = b.damage_flat || 0;
    rows.push({ label: 'Damage', value: `${item.damage[0]+flat}–${item.damage[1]+flat}` });
    if (b.damage_pct)  rows.push({ label: '+Damage', value: `+${b.damage_pct}%`,  color: 'var(--blue-text)' });
    if (b.to_hit_flat) rows.push({ label: '+To Hit', value: `+${b.to_hit_flat}%`, color: 'var(--blue-text)' });
  }
  if (item.ac !== undefined) rows.push({ label: 'Armor Class', value: `${item.ac+(b.ac||0)}` });
  if (b.str)  rows.push({ label: '+Strength',  value: `+${b.str}`,  color: 'var(--blue-text)' });
  if (b.dex)  rows.push({ label: '+Dexterity', value: `+${b.dex}`,  color: 'var(--blue-text)' });
  if (b.vit)  rows.push({ label: '+Vitality',  value: `+${b.vit}`,  color: 'var(--blue-text)' });
  if (b.life) rows.push({ label: '+Life',       value: `+${b.life}`, color: 'var(--blue-text)' });
  if (item.reqStr > 0) rows.push({ label: 'Req Strength',  value: item.reqStr, dim: true });
  if (item.reqDex > 0) rows.push({ label: 'Req Dexterity', value: item.reqDex, dim: true });
  return rows;
}

// ── Item grid cell ────────────────────────────────────────────────────────────

function GridCell({ item, price, onSelect }) {
  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        background: '#0c0c14', cursor: 'pointer', borderRadius: '3px',
        border: `2px solid ${qualityBorder(item.quality)}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '4px 2px', gap: '2px', position: 'relative',
      }}
    >
      <ItemIcon item={item} size={36}/>
      <span style={{ fontSize: '9px', color: 'var(--text-gold)', lineHeight: 1 }}>{price}g</span>
      {item.quality !== 'normal' && !item.identified && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          width: 5, height: 5, borderRadius: '50%', background: 'var(--blue-text)',
        }}/>
      )}
    </div>
  );
}

// ── Item detail modal ─────────────────────────────────────────────────────────

function ItemModal({ item, mode, playerGold, onClose, onAction }) {
  const name      = resolveItemName(item);
  const color     = qualityColor(item.quality);
  const rows      = buildStatRows(item);
  const price     = mode === 'buy' ? item.price : item.sell_price;
  const canAfford = playerGold >= (item.price || 0);

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
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{
            flexShrink: 0, background: '#09090e', borderRadius: '4px',
            border: `2px solid ${qualityBorder(item.quality)}`, padding: '4px', lineHeight: 0,
          }}>
            <ItemIcon item={item} size={56}/>
          </div>
          <div>
            <div style={{ color, fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }}>{name}</div>
            <div className="text-dim" style={{ fontSize: '11px', marginTop: '3px', textTransform: 'capitalize' }}>
              {item.quality !== 'normal' ? `${item.quality} ` : ''}{item.slot}
            </div>
            {item.quality !== 'normal' && !item.identified && (
              <div style={{ fontSize: '11px', color: 'var(--blue-text)', marginTop: '4px' }}>
                ? Unidentified
              </div>
            )}
          </div>
        </div>

        <div className="divider" style={{ marginBottom: '10px' }}/>

        {/* Stats */}
        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', color: r.dim ? '#484848' : 'var(--text-dim)' }}>{r.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: r.color || 'var(--text-cream)' }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Prefix / suffix */}
        {item.identified && (item.prefix || item.suffix) && (
          <>
            <div className="divider" style={{ marginBottom: '8px' }}/>
            <div style={{ fontSize: '11px', color: 'var(--blue-text)', marginBottom: '10px', fontStyle: 'italic' }}>
              {[item.prefix?.name, item.suffix?.name].filter(Boolean).join(' · ')}
            </div>
          </>
        )}

        <div className="divider" style={{ marginBottom: '10px' }}/>

        {/* Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span className="text-dim" style={{ fontSize: '12px' }}>
            {mode === 'buy' ? 'Price' : 'Sell value'}
          </span>
          <span style={{ color: 'var(--text-gold)', fontSize: '13px', fontWeight: 600 }}>{price}g</span>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary btn-full"
            style={{ fontSize: '12px' }}
            disabled={mode === 'buy' && !canAfford}
            onClick={onAction}
          >
            {mode === 'buy'
              ? (canAfford ? 'Buy' : 'Not enough gold')
              : 'Sell'}
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GriswoldScreen() {
  useMusic('/audio/tristram.mp3');
  const { state, dispatchAndSave, setScreen, shopInventory } = useGame();
  const player = state.player;
  const [tab,      setTab]      = useState('buy');
  const [dialog,   setDialog]   = useState('idle');
  const [selected, setSelected] = useState(null);

  const shopItems    = shopInventory || [];
  const sellableItems = player.inventory.filter(i => i.slot !== 'potion');
  const gridItems    = tab === 'buy' ? shopItems : sellableItems;

  function handleBuy(item) {
    if (player.gold < item.price) { setDialog('no_gold'); return; }
    dispatchAndSave({ type: 'SPEND_GOLD', payload: item.price });
    dispatchAndSave({ type: 'ADD_ITEM',   payload: { ...item } });
    setDialog('bought');
    setSelected(null);
  }

  function handleSell(item) {
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: item.uid });
    dispatchAndSave({ type: 'ADD_GOLD',    payload: item.sell_price });
    setDialog('sold');
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
        <span className="title-medium">Griswold's Shop</span>
      </div>

      {/* Portrait + dialog */}
      <div className="panel" style={{ padding: '14px', display: 'flex', gap: '14px',
                                       alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <GriswoldPortrait/>
        </div>
        <div style={{ flex: 1 }}>
          <div className="title-small" style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>
            Griswold
          </div>
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8 }}>
            "{DIALOGS[dialog]}"
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button className={`btn ${tab === 'buy'  ? 'btn-primary' : 'btn-ghost'} btn-full`}
                style={{ fontSize: '12px' }} onClick={() => { setTab('buy');  setSelected(null); }}>
          Buy
        </button>
        <button className={`btn ${tab === 'sell' ? 'btn-primary' : 'btn-ghost'} btn-full`}
                style={{ fontSize: '12px' }} onClick={() => { setTab('sell'); setSelected(null); }}>
          Sell
        </button>
      </div>

      {/* Item grid */}
      <div className="panel" style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        {gridItems.length === 0 ? (
          <div className="text-dim" style={{ textAlign: 'center', padding: '24px 0',
                                             fontStyle: 'italic', fontSize: '13px' }}>
            {tab === 'buy' ? 'Loading wares…' : 'Nothing to sell'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {gridItems.map((item, i) => (
              <GridCell
                key={item.uid || i}
                item={item}
                price={tab === 'buy' ? item.price : item.sell_price}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </div>

      {/* Gold */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
        <span className="text-dim" style={{ fontSize: '12px' }}>Gold: </span>
        <span className="text-gold" style={{ fontSize: '14px', fontWeight: 700, marginLeft: '6px' }}>
          {player.gold}
        </span>
      </div>

      {/* Item detail modal */}
      {selected && (
        <ItemModal
          item={selected}
          mode={tab}
          playerGold={player.gold}
          onClose={() => setSelected(null)}
          onAction={() => tab === 'buy' ? handleBuy(selected) : handleSell(selected)}
        />
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';

// ── Loot screen — shown after a fight victory ─────────────────────────────────
// Receives loot data via context's `lootResult` field set by FightPreScreen.

export default function LootScreen() {
  const { lootResult, setScreen, dispatchAndSave, state } = useGame();

  const player  = state.player;
  const { gold, exp, newLevel, leveledUp, loot } = lootResult || {};

  const [itemAction, setItemAction] = useState({}); // uid -> 'equipped' | 'sold'

  function equipItem(item) {
    dispatchAndSave({ type: 'EQUIP_ITEM', payload: item });
    setItemAction(a => ({ ...a, [item.uid]: 'equipped' }));
  }

  function sellItem(item) {
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: item.uid });
    dispatchAndSave({ type: 'ADD_GOLD',    payload: item.sell_price });
    setItemAction(a => ({ ...a, [item.uid]: 'sold' }));
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
      {/* Victory header */}
      <div className="panel panel-gold" style={{ padding: '16px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '32px', marginBottom: '6px' }}>⚔</div>
        <div className="title-large" style={{ fontSize: '20px' }}>Victory!</div>

        {/* Rewards row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
          {gold > 0  && <Badge label="Gold"     value={`+${gold}g`} color="var(--text-gold)" />}
          {exp  > 0  && <Badge label="EXP"      value={`+${exp}`}   color="var(--text-gold)" />}
          {leveledUp && <Badge label={`Level ${newLevel}!`} value="↑" color="var(--green-text)" />}
        </div>

        {leveledUp && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Spend your +5 stat points in the Character screen.
          </div>
        )}
      </div>

      {/* Loot item */}
      <div className="scrollable" style={{ flex: 1, overflowY: 'auto', display: 'flex',
                                           flexDirection: 'column', gap: '8px' }}>
        {!loot && gold > 0 ? (
          <div className="panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div className="text-dim" style={{ fontStyle: 'italic', fontSize: '13px' }}>
              The creature carried only gold.
            </div>
          </div>
        ) : !loot ? (
          <div className="panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div className="text-dim" style={{ fontStyle: 'italic', fontSize: '13px' }}>
              The creature carried nothing of value.
            </div>
          </div>
        ) : (
          <div className="panel" style={{ padding: '14px' }}>
            <div className="title-small" style={{ marginBottom: '10px' }}>Item Found</div>
            <div className="divider" style={{ marginBottom: '10px' }} />

            <LootItemCard
              item={loot}
              action={itemAction[loot.uid]}
              onEquip={() => equipItem(loot)}
              onSell={() => sellItem(loot)}
              playerGold={player.gold}
            />

            {loot.quality !== 'normal' && !loot.identified && (
              <div style={{ marginTop: '10px', padding: '8px 12px',
                            background: 'rgba(90,138,191,0.1)',
                            border: '1px solid var(--blue-text)', borderRadius: '2px' }}>
                <div style={{ color: 'var(--blue-text)', fontSize: '12px' }}>
                  This item is magical. Visit Deckard Cain to identify it (100g).
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue */}
      <button
        className="btn btn-primary btn-full"
        style={{ fontSize: '14px', padding: '16px', flexShrink: 0 }}
        onClick={() => setScreen('dungeon')}
      >
        Continue
      </button>
    </div>
  );
}

// ── Item card with equip / sell ───────────────────────────────────────────────

function LootItemCard({ item, action, onEquip, onSell }) {
  const name    = resolveItemName(item);
  const stat    = getItemStatLine(item);
  const color   = qualityColor(item.quality);
  const taken   = !!action;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
                  opacity: taken ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <div style={{ flex: 1 }}>
        <div style={{ color, fontSize: '14px', fontWeight: 600 }}>
          {name}
          {item.quality === 'unique' && (
            <span style={{ color: 'var(--text-gold)', fontSize: '10px',
                           marginLeft: '8px', letterSpacing: '0.1em' }}>UNIQUE</span>
          )}
        </div>
        {stat && <div className="text-dim" style={{ fontSize: '12px', marginTop: '2px' }}>{stat}</div>}
        <div className="text-dim" style={{ fontSize: '11px', marginTop: '2px', fontStyle: 'italic' }}>
          Sell: {item.sell_price}g
        </div>
      </div>

      {taken ? (
        <div style={{ color: action === 'equipped' ? 'var(--green-text)' : 'var(--text-dim)',
                      fontSize: '12px', fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>
          {action === 'equipped' ? 'Equipped' : 'Sold'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {item.slot !== 'potion' && (
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '11px' }}
                    onClick={onEquip}>
              Equip
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '11px' }}
                  onClick={onSell}>
            Sell
          </button>
        </div>
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

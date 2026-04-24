import React from 'react';
import { useGame, EXP_TABLE } from '../context/GameContext.jsx';
import { calcAC, calcToHit, calcReductionPoolRange, calcPushUpStats } from '../utils/player.js';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';

const STAT_LABELS = { strength: 'Strength', dexterity: 'Dexterity', vitality: 'Vitality' };
const CLASS_LABEL  = { warrior: 'Warrior', rogue: 'Rogue' };
const SLOT_LABELS  = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', shield: 'Shield' };

export default function CharacterScreen() {
  const { state, dispatchAndSave, setScreen } = useGame();
  const player = state.player;

  const ac      = calcAC(player);
  const toHit   = calcToHit(player);
  const redPool = calcReductionPoolRange(player);
  const { totalPushUps, fightsWon, fightsLost } = calcPushUpStats(state.history);

  const expNeeded = player.level < 20 ? EXP_TABLE[player.level] : null;
  const expPct    = expNeeded ? Math.min((player.exp / expNeeded) * 100, 100) : 100;

  const canAllocate = (player.statPoints || 0) > 0;

  function allocate(stat) {
    if (!canAllocate) return;
    dispatchAndSave({ type: 'ALLOCATE_STAT', payload: { stat } });
  }

  function equip(item) {
    dispatchAndSave({ type: 'EQUIP_ITEM', payload: item });
  }

  function sellItem(item) {
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: item.uid });
    dispatchAndSave({ type: 'ADD_GOLD',    payload: item.sell_price });
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => setScreen(state.currentLocation === 'dungeon' ? 'dungeon' : 'tristram')}>
          {state.currentLocation === 'dungeon' ? '← Dungeon' : '← Tristram'}
        </button>
        <span className="title-medium">{CLASS_LABEL[player.class]} — Level {player.level}</span>
      </div>

      <div className="scrollable" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>

        {/* EXP bar */}
        <div className="panel" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {player.level < 20 ? `EXP to Level ${player.level + 1}` : 'Maximum Level'}
            </span>
            <span className="text-gold" style={{ fontSize: '11px' }}>
              {player.level < 20 ? `${player.exp} / ${expNeeded}` : 'MAX'}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${expPct}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="panel" style={{ padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span className="title-small">Attributes</span>
            {canAllocate && (
              <span style={{ color: 'var(--text-gold-bright)', fontSize: '11px', fontWeight: 700 }}>
                {player.statPoints} point{player.statPoints !== 1 ? 's' : ''} to spend
              </span>
            )}
          </div>
          <div className="divider" style={{ marginBottom: '8px' }} />

          {['strength', 'dexterity', 'vitality'].map(stat => {
            const maxVal  = player.maxStats[stat];
            const atMax   = maxVal !== undefined && player.stats[stat] >= maxVal;
            return (
              <div key={stat} className="stat-row" style={{ padding: '5px 0' }}>
                <span className="stat-label">{STAT_LABELS[stat]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="stat-value">{player.stats[stat]}</span>
                  {canAllocate && !atMax && (
                    <button
                      onClick={() => allocate(stat)}
                      style={{
                        width: '20px', height: '20px', borderRadius: '2px',
                        background: 'var(--bg-panel-light)', border: '1px solid var(--border-gold)',
                        color: 'var(--text-gold-bright)', fontSize: '14px', lineHeight: 1,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                  )}
                  {atMax && <span className="text-dim" style={{ fontSize: '10px' }}>MAX</span>}
                </div>
              </div>
            );
          })}

          <div className="divider" style={{ margin: '8px 0' }} />

          <div className="stat-row">
            <span className="stat-label">Life</span>
            <span className="text-red" style={{ fontSize: '13px', fontWeight: 600 }}>
              {player.stats.life} / {player.stats.maxLife}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Gold</span>
            <span className="text-gold" style={{ fontSize: '13px', fontWeight: 600 }}>{player.gold}</span>
          </div>
        </div>

        {/* Computed stats */}
        <div className="panel" style={{ padding: '12px' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>Combat Stats</div>
          <div className="divider" style={{ marginBottom: '8px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <div className="stat-row">
              <span className="stat-label">Armor Class</span>
              <span className="stat-value">{ac}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">To Hit %</span>
              <span className="stat-value">{toHit}%</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Push-Up Pool</span>
              <span className="stat-value">{redPool}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Weapon DMG</span>
              <span className="stat-value">
                {player.equipment.weapon
                  ? `${player.equipment.weapon.damage[0]}–${player.equipment.weapon.damage[1]}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="panel" style={{ padding: '12px' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>Equipment</div>
          <div className="divider" style={{ marginBottom: '8px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {['weapon', 'armor', 'helm', 'shield'].map(slot => {
              const equipped = player.equipment[slot];
              return (
                <div
                  key={slot}
                  style={{
                    padding: '8px', background: 'var(--bg-input)', borderRadius: '2px',
                    border: `1px solid ${equipped ? 'var(--border-mid)' : 'var(--border-dark)'}`,
                  }}
                >
                  <div className="stat-label" style={{ marginBottom: '4px' }}>{SLOT_LABELS[slot]}</div>
                  {equipped ? (
                    <>
                      <div style={{ color: qualityColor(equipped.quality), fontSize: '12px', fontWeight: 600 }}>
                        {resolveItemName(equipped)}
                      </div>
                      <div className="text-dim" style={{ fontSize: '11px' }}>{getItemStatLine(equipped)}</div>
                    </>
                  ) : (
                    <div className="text-dim" style={{ fontSize: '11px', fontStyle: 'italic' }}>Empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory */}
        <div className="panel" style={{ padding: '12px' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>
            Backpack
            <span className="text-dim" style={{ marginLeft: '8px', fontSize: '11px', textTransform: 'none', letterSpacing: 0 }}>
              · {player.inventory.length} items
            </span>
          </div>
          <div className="divider" style={{ marginBottom: '8px' }} />

          {player.inventory.length === 0 && (
            <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>Empty</div>
          )}

          {player.inventory.map(item => (
            <div
              key={item.uid}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-dark)' }}
            >
              <div>
                <div style={{ color: qualityColor(item.quality), fontSize: '13px' }}>
                  {resolveItemName(item)}
                </div>
                <div className="text-dim" style={{ fontSize: '11px' }}>{getItemStatLine(item)}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {item.slot !== 'potion' && (
                  <button
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '10px' }}
                    onClick={() => equip(item)}
                  >
                    Equip
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '10px' }}
                  onClick={() => sellItem(item)}
                >
                  {item.sell_price}g
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Push-up stats */}
        <div className="panel" style={{ padding: '12px' }}>
          <div className="title-small" style={{ marginBottom: '6px' }}>Push-Up Record</div>
          <div className="divider" style={{ marginBottom: '8px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            <StatBox label="Total" value={totalPushUps} />
            <StatBox label="Won"   value={fightsWon}    color="var(--green-text)" />
            <StatBox label="Lost"  value={fightsLost}   color="var(--red-text)" />
          </div>
        </div>

        <div style={{ height: '8px' }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg-input)', borderRadius: '2px' }}>
      <div style={{ color: color || 'var(--text-cream)', fontSize: '18px', fontWeight: 700 }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '10px' }}>{label}</div>
    </div>
  );
}

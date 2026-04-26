import React, { useState } from 'react';
import { useGame, EXP_TABLE } from '../context/GameContext.jsx';
import { calcAC, calcToHit, calcPushUpStats } from '../utils/player.js';
import { resolveItemName, qualityColor, getItemStatLine } from '../utils/items.js';
import { useMusic, getCurrentTrack } from '../hooks/useMusic.js';
import { C } from '../utils/combat.js';

const CLASS_LABEL  = { warrior: 'Warrior', rogue: 'Rogue' };
const SLOT_LABELS  = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', shield: 'Shield' };
const STAT_LABELS  = { strength: 'Strength', dexterity: 'Dexterity', vitality: 'Vitality' };

// ── Tab content panels ────────────────────────────────────────────────────────

function StatsPanel({ player, canAllocate, onAllocate }) {
  const ac    = calcAC(player);
  const toHit = calcToHit(player);

  // Simplify = STR + weapon damage range — how much push-up difficulty gets reduced per fight
  const weap     = player.equipment.weapon;
  const simplify = weap
    ? `${player.stats.strength + weap.damage[0]}–${player.stats.strength + weap.damage[1]}`
    : `${player.stats.strength}`;

  // Time buffer from Vitality
  const buffer = player.stats.vitality * C.VITALITY_TO_SECONDS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Attributes — clean values, no sub-text */}
      <div className="panel" style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="title-small">Attributes</span>
          {canAllocate && (
            <span style={{ color: 'var(--text-gold-bright)', fontSize: '12px', fontWeight: 700 }}>
              {player.statPoints} point{player.statPoints !== 1 ? 's' : ''} to spend
            </span>
          )}
        </div>
        <div className="divider" style={{ marginBottom: '10px' }} />

        {['strength', 'dexterity', 'vitality'].map(stat => {
          const atMax = player.maxStats[stat] !== undefined && player.stats[stat] >= player.maxStats[stat];
          return (
            <div key={stat} className="stat-row" style={{ padding: '6px 0' }}>
              <span className="stat-label">{STAT_LABELS[stat]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="stat-value" style={{ fontSize: '16px' }}>{player.stats[stat]}</span>
                {canAllocate && !atMax && (
                  <button onClick={() => onAllocate(stat)} style={{
                    width: '22px', height: '22px', borderRadius: '3px',
                    background: 'var(--bg-panel-light)', border: '1px solid var(--border-gold)',
                    color: 'var(--text-gold-bright)', fontSize: '15px', lineHeight: 1,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
                )}
                {atMax && <span className="text-dim" style={{ fontSize: '10px' }}>MAX</span>}
              </div>
            </div>
          );
        })}

        <div className="divider" style={{ margin: '8px 0' }} />

        <div className="stat-row" style={{ padding: '4px 0' }}>
          <span className="stat-label">Life</span>
          <span className="text-red" style={{ fontSize: '15px', fontWeight: 700 }}>
            {player.stats.life} / {player.stats.maxLife}
          </span>
        </div>
        <div className="stat-row" style={{ padding: '4px 0' }}>
          <span className="stat-label">Gold</span>
          <span className="text-gold" style={{ fontSize: '15px', fontWeight: 700 }}>{player.gold}</span>
        </div>
      </div>

      {/* Combat — computed results, Diablo 1 style */}
      <div className="panel" style={{ padding: '14px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>Combat</div>
        <div className="divider" style={{ marginBottom: '10px' }} />

        <CombatRow label="Hit Resist"   value={ac}            />
        <CombatRow label="Skip Chance" value={`${toHit}%`}   />
        <CombatRow label="Ease"        value={simplify}      />
        <CombatRow label="Time Buffer" value={`+${buffer}s`} />
      </div>
    </div>
  );
}

function GearPanel({ player, onEquip, onSell }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Equipment slots */}
      <div className="panel" style={{ padding: '14px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>Equipped</div>
        <div className="divider" style={{ marginBottom: '10px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {['weapon', 'armor', 'helm', 'shield'].map(slot => {
            const item = player.equipment[slot];
            return (
              <div key={slot} style={{
                padding: '10px', background: 'var(--bg-input)', borderRadius: '4px',
                border: `1px solid ${item ? 'var(--border-mid)' : 'var(--border-dark)'}`,
                minHeight: '64px', display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                <div className="stat-label">{SLOT_LABELS[slot]}</div>
                {item ? (
                  <>
                    <div style={{ color: qualityColor(item.quality), fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>
                      {resolveItemName(item)}
                    </div>
                    <div className="text-dim" style={{ fontSize: '11px' }}>{getItemStatLine(item)}</div>
                  </>
                ) : (
                  <div className="text-dim" style={{ fontSize: '12px', fontStyle: 'italic' }}>Empty</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Backpack */}
      <div className="panel" style={{ padding: '14px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>
          Backpack
          <span className="text-dim" style={{ marginLeft: '8px', fontSize: '11px', textTransform: 'none', letterSpacing: 0 }}>
            · {player.inventory.length} items
          </span>
        </div>
        <div className="divider" style={{ marginBottom: '8px' }} />

        {player.inventory.length === 0 && (
          <div className="text-dim" style={{ fontSize: '13px', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
            Nothing in your pack
          </div>
        )}

        {player.inventory.map(item => (
          <div key={item.uid} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 0', borderBottom: '1px solid var(--border-dark)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: qualityColor(item.quality), fontSize: '14px', fontWeight: 600 }}>
                {resolveItemName(item)}
              </div>
              <div className="text-dim" style={{ fontSize: '12px' }}>{getItemStatLine(item)}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {item.slot !== 'potion' && (
                <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '11px' }}
                        onClick={() => onEquip(item)}>
                  Equip
                </button>
              )}
              <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '11px' }}
                      onClick={() => onSell(item)}>
                {item.sell_price}g
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogPanel({ history }) {
  const { totalPushUps, fightsWon, fightsLost } = calcPushUpStats(history);
  const typeBreakdown = history
    .filter(e => e.fight_result === 'won')
    .reduce((acc, e) => { acc[e.push_up_type] = (acc[e.push_up_type] || 0) + 1; return acc; }, {});
  const sorted = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Summary boxes */}
      <div className="panel" style={{ padding: '14px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>Summary</div>
        <div className="divider" style={{ marginBottom: '10px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <StatBox label="Push-ups"   value={totalPushUps} />
          <StatBox label="Fights won" value={fightsWon}    color="var(--green-text)" />
          <StatBox label="Fights lost" value={fightsLost}  color="var(--red-text)" />
        </div>
      </div>

      {/* Push-up type breakdown */}
      {sorted.length > 0 && (
        <div className="panel" style={{ padding: '14px' }}>
          <div className="title-small" style={{ marginBottom: '8px' }}>Push-up Breakdown</div>
          <div className="divider" style={{ marginBottom: '10px' }} />
          {sorted.map(([type, count]) => (
            <div key={type} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-cream)', textTransform: 'capitalize' }}>
                  {type.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-gold)' }}>{count}</span>
              </div>
              <div className="progress-bar" style={{ height: '5px' }}>
                <div className="progress-fill" style={{ width: `${(count / totalPushUps) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && (
        <div className="panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div className="text-dim" style={{ fontStyle: 'italic' }}>No fights recorded yet.</div>
          <div className="text-dim" style={{ fontSize: '12px', marginTop: '6px' }}>Enter the cathedral and start fighting.</div>
        </div>
      )}
    </div>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'stats', label: 'Stats'  },
  { id: 'gear',  label: 'Gear'   },
  { id: 'log',   label: 'Record' },
];

function BottomNav({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', flexShrink: 0,
      borderTop: '1px solid var(--border-dark)',
      background: 'var(--bg-panel)',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, padding: 'clamp(10px, 2vw, 16px) 0',
            background: 'transparent', border: 'none',
            borderTop: `2px solid ${active === tab.id ? 'var(--border-gold)' : 'transparent'}`,
            color: active === tab.id ? 'var(--text-gold)' : 'var(--text-dim)',
            fontFamily: 'var(--font-ui)', fontSize: 'clamp(12px, 1.2vw, 15px)',
            fontWeight: active === tab.id ? 700 : 400,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CharacterScreen() {
  useMusic(getCurrentTrack());
  const { state, dispatchAndSave, setScreen } = useGame();
  const player = state.player;
  const [tab, setTab] = useState('stats');

  const expNeeded = player.level < 20 ? EXP_TABLE[player.level] : null;
  const expPct    = expNeeded ? Math.min((player.exp / expNeeded) * 100, 100) : 100;
  const canAllocate = (player.statPoints || 0) > 0;

  function allocate(stat)  { dispatchAndSave({ type: 'ALLOCATE_STAT', payload: { stat } }); }
  function equipItem(item) { dispatchAndSave({ type: 'EQUIP_ITEM',    payload: item }); }
  function sellItem(item)  {
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: item.uid });
    dispatchAndSave({ type: 'ADD_GOLD',    payload: item.sell_price });
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 0 }}>

      {/* Persistent header */}
      <div style={{ padding: 'clamp(10px, 1.5vw, 16px) clamp(12px, 2vw, 20px)', flexShrink: 0, borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
                  onClick={() => setScreen(state.currentLocation === 'dungeon' ? 'dungeon' : 'tristram')}>
            {state.currentLocation === 'dungeon' ? '← Dungeon' : '← Tristram'}
          </button>
          <span className="title-small" style={{ fontSize: 'clamp(12px, 1.2vw, 15px)' }}>
            {CLASS_LABEL[player.class]} · Level {player.level}
            {canAllocate && (
              <span style={{ color: 'var(--text-gold-bright)', marginLeft: '10px' }}>
                +{player.statPoints}
              </span>
            )}
          </span>
        </div>
        {/* EXP bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-dim" style={{ fontSize: '11px' }}>
              {player.level < 20 ? `EXP → Level ${player.level + 1}` : 'Max level'}
            </span>
            <span className="text-gold" style={{ fontSize: '11px' }}>
              {player.level < 20 ? `${player.exp} / ${expNeeded}` : 'MAX'}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${expPct}%` }} />
          </div>
        </div>
      </div>

      {/* Scrollable tab content */}
      <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px, 1.5vw, 16px) clamp(12px, 2vw, 20px)' }}>
        {tab === 'stats' && (
          <StatsPanel
            player={player}
            canAllocate={canAllocate}
            onAllocate={allocate}
          />
        )}
        {tab === 'gear' && (
          <GearPanel
            player={player}
            onEquip={equipItem}
            onSell={sellItem}
          />
        )}
        {tab === 'log' && (
          <LogPanel history={state.history} />
        )}
        <div style={{ height: '8px' }} />
      </div>

      {/* Bottom navigation */}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function CombatRow({ label, value }) {
  return (
    <div className="stat-row" style={{ padding: '6px 0' }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ fontSize: '16px' }}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg-input)', borderRadius: '4px' }}>
      <div style={{ color: color || 'var(--text-cream)', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700 }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '11px' }}>{label}</div>
    </div>
  );
}

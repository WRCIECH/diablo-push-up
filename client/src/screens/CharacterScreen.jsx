import React, { useState } from 'react';
import { useGame, EXP_TABLE } from '../context/GameContext.jsx';
import { calcAC, calcToHit, calcPushUpStats } from '../utils/player.js';
import { resolveItemName, qualityColor, getEffectiveStats } from '../utils/items.js';
import { useMusic, getCurrentTrack } from '../hooks/useMusic.js';
import { C } from '../utils/combat.js';
import ItemIcon from '../components/ItemIcon.jsx';

const CLASS_LABEL = { warrior: 'Warrior', rogue: 'Rogue' };
const STAT_LABELS = { strength: 'Strength', dexterity: 'Dexterity', vitality: 'Vitality' };

// ── Quality border colour ─────────────────────────────────────────────────────

function qualityBorder(quality) {
  if (quality === 'unique') return '#9a6a10';
  if (quality === 'magic')  return '#3a5a90';
  return '#383838';
}

// ── Equipment slot cell ───────────────────────────────────────────────────────

const SLOT_LABEL = { helm: 'HEAD', armor: 'BODY', weapon: 'WEAPON', shield: 'SHIELD', ring1: 'RING', ring2: 'RING', talisman: 'TALISMAN' };

function EquipSlot({ slot, item, onSelect }) {
  const border = item ? qualityBorder(item.quality) : '#252525';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      <div
        onClick={() => item && onSelect({ item, source: 'equipped', slot })}
        style={{
          width: '100%', aspectRatio: '1',
          background: '#090910', border: `2px solid ${border}`, borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: item ? 'pointer' : 'default',
        }}
      >
        {item
          ? <ItemIcon item={item} size={44}/>
          : <span style={{ fontSize: '9px', color: '#303038', letterSpacing: '0.05em' }}>
              {SLOT_LABEL[slot]}
            </span>
        }
      </div>
      <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
        {SLOT_LABEL[slot]}
      </span>
    </div>
  );
}

// ── Inventory grid cell ───────────────────────────────────────────────────────

function InventoryCell({ item, onSelect }) {
  if (!item) {
    return (
      <div style={{
        aspectRatio: '1', background: '#07070c',
        border: '1px solid #151520', borderRadius: '3px',
      }}/>
    );
  }
  return (
    <div
      onClick={() => onSelect({ item, source: 'inventory' })}
      style={{
        aspectRatio: '1', background: '#0c0c14',
        border: `2px solid ${qualityBorder(item.quality)}`,
        borderRadius: '3px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}
    >
      <ItemIcon item={item} size={38}/>
      {item.quality !== 'normal' && !item.identified && (
        <div style={{
          position: 'absolute', bottom: 3, right: 3,
          width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-text)',
        }}/>
      )}
    </div>
  );
}

// ── Detailed stat rows for the modal ─────────────────────────────────────────

function collectBonuses(item) {
  if (!item.identified) return {};
  const out = {};
  for (const rolled of [item.prefix?.rolled, item.suffix?.rolled]) {
    for (const [k, v] of Object.entries(rolled || {})) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function buildStatRows(item) {
  if (item.type === 'healing') {
    return [{ label: 'Fight time', value: '+30s', color: 'var(--green-text)' }];
  }
  const b = collectBonuses(item);
  const rows = [];
  if (item.damage) {
    const flat = b.damage_flat || 0;
    rows.push({ label: 'Damage', value: `${item.damage[0]+flat}–${item.damage[1]+flat}` });
    if (b.damage_pct)  rows.push({ label: '+Damage',  value: `+${b.damage_pct}%`,   color: 'var(--blue-text)' });
    if (b.to_hit_flat) rows.push({ label: '+To Hit',  value: `+${b.to_hit_flat}%`,  color: 'var(--blue-text)' });
  }
  if (item.ac !== undefined) {
    rows.push({ label: 'Armor Class', value: `${item.ac+(b.ac||0)}` });
    if (b.ac) rows.push({ label: '+Armor', value: `+${b.ac}`, color: 'var(--blue-text)' });
  }
  if (b.str)  rows.push({ label: '+Strength',  value: `+${b.str}`,  color: 'var(--blue-text)' });
  if (b.dex)  rows.push({ label: '+Dexterity', value: `+${b.dex}`,  color: 'var(--blue-text)' });
  if (b.vit)  rows.push({ label: '+Vitality',  value: `+${b.vit}`,  color: 'var(--blue-text)' });
  if (b.life) rows.push({ label: '+Life',       value: `+${b.life}`, color: 'var(--blue-text)' });
  if (item.reqStr > 0) rows.push({ label: 'Req Strength',  value: item.reqStr,  dim: true });
  if (item.reqDex > 0) rows.push({ label: 'Req Dexterity', value: item.reqDex,  dim: true });
  return rows;
}

// ── Item detail modal ─────────────────────────────────────────────────────────

const DUNGEON_IDENTIFY_COST = 100;

function ItemDetailModal({ selection, onClose, onEquip, onUnequip, onSell, onUse, onIdentify, inDungeon, playerGold }) {
  const { item, source, slot } = selection;
  const name         = resolveItemName(item);
  const color        = qualityColor(item.quality);
  const isEquipped   = source === 'equipped';
  const isPotion     = item.slot === 'potion';
  const isUnidentified = item.quality !== 'normal' && !item.identified;
  const statRows     = item.identified || item.quality === 'normal' ? buildStatRows(item) : [];

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
            flexShrink: 0,
            background: '#09090e', borderRadius: '4px',
            border: `2px solid ${qualityBorder(item.quality)}`,
            padding: '4px', lineHeight: 0,
          }}>
            <ItemIcon item={item} size={56}/>
          </div>
          <div>
            <div style={{ color, fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }}>{name}</div>
            <div className="text-dim" style={{ fontSize: '11px', marginTop: '3px', textTransform: 'capitalize' }}>
              {item.quality !== 'normal' ? `${item.quality} ` : ''}{item.slot}
            </div>
            {isEquipped && (
              <div style={{ fontSize: '11px', color: 'var(--green-text)', marginTop: '4px' }}>● Equipped</div>
            )}
            {item.quality !== 'normal' && !item.identified && (
              <div style={{ fontSize: '11px', color: 'var(--blue-text)', marginTop: '4px' }}>? Unidentified</div>
            )}
          </div>
        </div>

        <div className="divider" style={{ marginBottom: '10px' }}/>

        {/* Stats */}
        {isUnidentified ? (
          <div style={{ padding: '4px 0 8px' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontStyle: 'italic', marginBottom: inDungeon ? '8px' : 0 }}>
              {inDungeon
                ? `Identify here for ${DUNGEON_IDENTIFY_COST}g, or visit Deckard Cain for 50g.`
                : 'Visit Deckard Cain in Tristram to identify (50g).'}
            </div>
            {inDungeon && (
              <button
                className="btn btn-primary btn-full"
                style={{ fontSize: '12px' }}
                disabled={playerGold < DUNGEON_IDENTIFY_COST}
                onClick={() => { onIdentify(item); onClose(); }}
              >
                {playerGold >= DUNGEON_IDENTIFY_COST ? `Identify (${DUNGEON_IDENTIFY_COST}g)` : 'Not enough gold'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {statRows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', color: r.dim ? '#484848' : 'var(--text-dim)' }}>{r.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: r.color || 'var(--text-cream)' }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="divider" style={{ marginBottom: '10px' }}/>

        {/* Sell value */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span className="text-dim" style={{ fontSize: '12px' }}>Sell value</span>
          <span style={{ color: 'var(--text-gold)', fontSize: '13px', fontWeight: 600 }}>{item.sell_price}g</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEquipped ? (
            <button className="btn btn-ghost btn-full" style={{ fontSize: '12px' }}
                    onClick={() => { onUnequip(slot); onClose(); }}>
              Unequip
            </button>
          ) : isPotion ? (
            <button className="btn btn-primary btn-full" style={{ fontSize: '12px' }}
                    onClick={() => { onUse(item); onClose(); }}>
              Drink
            </button>
          ) : (
            <button className="btn btn-primary btn-full" style={{ fontSize: '12px' }}
                    onClick={() => { onEquip(item); onClose(); }}>
              Equip
            </button>
          )}
          {!isEquipped && (
            <button className="btn btn-ghost btn-full" style={{ fontSize: '12px' }}
                    onClick={() => { onSell(item); onClose(); }}>
              Sell
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '13px' }}
                  onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gear tab ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 4 * 5; // 4 columns × 5 rows = 20 items per page

function GearPanel({ player, onEquip, onUnequip, onSell, onUse, onIdentify, inDungeon }) {
  const [selected, setSelected] = useState(null);
  const [page, setPage]         = useState(0);

  const inv        = player.inventory;
  const totalPages = Math.max(1, Math.ceil(inv.length / PAGE_SIZE));
  const pageItems  = inv.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const cells      = [...pageItems, ...Array(PAGE_SIZE - pageItems.length).fill(null)];

  return (
    <>
      {/* Equipment slots */}
      <div className="panel" style={{ padding: '12px', marginBottom: '10px' }}>
        <div className="title-small" style={{ marginBottom: '10px' }}>Equipped</div>
        <div className="divider" style={{ marginBottom: '12px' }}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {/* Row 1: empty — helm — talisman */}
          <div/>
          <EquipSlot slot="helm"     item={player.equipment.helm}              onSelect={setSelected}/>
          <EquipSlot slot="talisman" item={player.equipment?.talisman ?? null} onSelect={setSelected}/>
          {/* Row 2: weapon — armor — shield */}
          <EquipSlot slot="weapon"   item={player.equipment.weapon}            onSelect={setSelected}/>
          <EquipSlot slot="armor"    item={player.equipment.armor}             onSelect={setSelected}/>
          <EquipSlot slot="shield"   item={player.equipment.shield}            onSelect={setSelected}/>
          {/* Row 3: ring1 — empty — ring2 */}
          <EquipSlot slot="ring1"    item={player.equipment?.ring1 ?? null}    onSelect={setSelected}/>
          <div/>
          <EquipSlot slot="ring2"    item={player.equipment?.ring2 ?? null}    onSelect={setSelected}/>
        </div>
      </div>

      {/* Inventory grid */}
      <div className="panel" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span className="title-small">
            Backpack
            <span className="text-dim" style={{ marginLeft: '8px', fontSize: '11px',
                                                 textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
              · {inv.length} item{inv.length !== 1 ? 's' : ''}
            </span>
          </span>
          <span style={{ fontSize: '13px' }}>
            <span className="text-dim" style={{ fontSize: '11px' }}>Gold: </span>
            <span className="text-gold" style={{ fontWeight: 700 }}>{player.gold}</span>
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: '14px' }}
                      disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="text-dim" style={{ fontSize: '11px' }}>{page+1}/{totalPages}</span>
              <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: '14px' }}
                      disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
        <div className="divider" style={{ marginBottom: '10px' }}/>

        {inv.length === 0 ? (
          <div className="text-dim" style={{ textAlign: 'center', padding: '24px 0', fontStyle: 'italic', fontSize: '13px' }}>
            Nothing in your pack
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {cells.map((item, i) => (
              <InventoryCell key={item?.uid ?? `empty-${i}`} item={item} onSelect={setSelected}/>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <ItemDetailModal
          selection={selected}
          onClose={() => setSelected(null)}
          onEquip={item    => { onEquip(item);    setSelected(null); }}
          onUnequip={sl    => { onUnequip(sl);    setSelected(null); }}
          onSell={item     => { onSell(item);     setSelected(null); }}
          onUse={item      => { onUse(item);      setSelected(null); }}
          onIdentify={item => { onIdentify(item); setSelected(null); }}
          inDungeon={inDungeon}
          playerGold={player.gold}
        />
      )}
    </>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsPanel({ player, canAllocate, onAllocate }) {
  const ac    = calcAC(player);
  const toHit = calcToHit(player);
  const eff            = getEffectiveStats(player);
  const weap           = player.equipment.weapon;
  const weaponAvg      = weap ? (weap.damage[0] + weap.damage[1]) / 2 : 0;
  const easeChancePct  = Math.round(Math.min(0.95, Math.max(0.05,
    (40 + Math.floor(eff.strength / 2) + Math.floor(weaponAvg)) / 100
  )) * 100);
  const buffer         = eff.vitality * C.VITALITY_TO_SECONDS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="panel" style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="title-small">Attributes</span>
          {canAllocate && (
            <span style={{ color: 'var(--text-gold-bright)', fontSize: '12px', fontWeight: 700 }}>
              {player.statPoints} point{player.statPoints !== 1 ? 's' : ''} to spend
            </span>
          )}
        </div>
        <div className="divider" style={{ marginBottom: '10px' }}/>
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
        <div className="divider" style={{ margin: '8px 0' }}/>
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

      <div className="panel" style={{ padding: '14px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>Combat</div>
        <div className="divider" style={{ marginBottom: '10px' }}/>
        <CombatRow label="Hit Resist"   value={ac}/>
        <CombatRow label="Ease chance"  value={`${easeChancePct}%`}/>
        <CombatRow label="Skip chance"  value={`${toHit}%`}/>
        <CombatRow label="Time Buffer"  value={`+${buffer}s`}/>
      </div>
    </div>
  );
}

// ── Log tab ───────────────────────────────────────────────────────────────────

function LogPanel({ history }) {
  const { totalPushUps, fightsWon, fightsLost } = calcPushUpStats(history);
  const typeBreakdown = history
    .filter(e => e.fight_result === 'won')
    .reduce((acc, e) => { acc[e.push_up_type] = (acc[e.push_up_type] || 0) + 1; return acc; }, {});
  const sorted = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="panel" style={{ padding: '14px' }}>
        <div className="title-small" style={{ marginBottom: '8px' }}>Summary</div>
        <div className="divider" style={{ marginBottom: '10px' }}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <StatBox label="Push-ups"    value={totalPushUps}/>
          <StatBox label="Fights won"  value={fightsWon}  color="var(--green-text)"/>
          <StatBox label="Fights lost" value={fightsLost} color="var(--red-text)"/>
        </div>
      </div>
      {sorted.length > 0 && (
        <div className="panel" style={{ padding: '14px' }}>
          <div className="title-small" style={{ marginBottom: '8px' }}>Push-up Breakdown</div>
          <div className="divider" style={{ marginBottom: '10px' }}/>
          {sorted.map(([type, count]) => (
            <div key={type} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-cream)', textTransform: 'capitalize' }}>
                  {type.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-gold)' }}>{count}</span>
              </div>
              <div className="progress-bar" style={{ height: '5px' }}>
                <div className="progress-fill" style={{ width: `${(count/totalPushUps)*100}%` }}/>
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
  { id: 'stats', label: 'Stats' },
  { id: 'gear',  label: 'Gear'  },
  { id: 'log',   label: 'Record'},
];

function BottomNav({ active, onChange }) {
  return (
    <div style={{ display: 'flex', flexShrink: 0, borderTop: '1px solid var(--border-dark)', background: 'var(--bg-panel)' }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, padding: 'clamp(10px,2vw,16px) 0',
            background: 'transparent', border: 'none',
            borderTop: `2px solid ${active === tab.id ? 'var(--border-gold)' : 'transparent'}`,
            color: active === tab.id ? 'var(--text-gold)' : 'var(--text-dim)',
            fontFamily: 'var(--font-ui)', fontSize: 'clamp(12px,1.2vw,15px)',
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

  const expNeeded   = player.level < 20 ? EXP_TABLE[player.level] : null;
  const expPct      = expNeeded ? Math.min((player.exp / expNeeded) * 100, 100) : 100;
  const canAllocate = (player.statPoints || 0) > 0;

  const inDungeon = state.currentLocation === 'dungeon';

  function allocate(stat)      { dispatchAndSave({ type: 'ALLOCATE_STAT',  payload: { stat } }); }
  function equipItem(item)     { dispatchAndSave({ type: 'EQUIP_ITEM',     payload: item }); }
  function unequipItem(slot)   { dispatchAndSave({ type: 'UNEQUIP_SLOT',   payload: slot }); }
  function sellItem(item)      {
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: item.uid });
    dispatchAndSave({ type: 'ADD_GOLD',    payload: item.sell_price });
  }
  function usePotion(item)     { dispatchAndSave({ type: 'USE_POTION',     payload: item.uid }); }
  function identifyItem(item)  {
    dispatchAndSave({ type: 'SPEND_GOLD',    payload: DUNGEON_IDENTIFY_COST });
    dispatchAndSave({ type: 'IDENTIFY_ITEM', payload: item.uid });
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 0 }}>

      {/* Header */}
      <div style={{ padding: 'clamp(10px,1.5vw,16px) clamp(12px,2vw,20px)', flexShrink: 0, borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
                  onClick={() => setScreen(state.currentLocation === 'dungeon' ? 'dungeon' : 'tristram')}>
            {state.currentLocation === 'dungeon' ? '← Dungeon' : '← Tristram'}
          </button>
          <span className="title-small" style={{ fontSize: 'clamp(12px,1.2vw,15px)' }}>
            {CLASS_LABEL[player.class]} · Level {player.level}
            {canAllocate && (
              <span style={{ color: 'var(--text-gold-bright)', marginLeft: '10px' }}>+{player.statPoints}</span>
            )}
          </span>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-dim" style={{ fontSize: '11px' }}>
              {player.level < 20 ? `EXP → Level ${player.level+1}` : 'Max level'}
            </span>
            <span className="text-gold" style={{ fontSize: '11px' }}>
              {player.level < 20 ? `${player.exp} / ${expNeeded}` : 'MAX'}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${expPct}%` }}/>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px,1.5vw,16px) clamp(12px,2vw,20px)' }}>
        {tab === 'stats' && <StatsPanel player={player} canAllocate={canAllocate} onAllocate={allocate}/>}
        {tab === 'gear'  && (
          <GearPanel
            player={player}
            onEquip={equipItem}
            onUnequip={unequipItem}
            onSell={sellItem}
            onUse={usePotion}
            onIdentify={identifyItem}
            inDungeon={inDungeon}
          />
        )}
        {tab === 'log'   && <LogPanel history={state.history}/>}
        <div style={{ height: '8px' }}/>
      </div>

      <BottomNav active={tab} onChange={setTab}/>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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
      <div style={{ color: color || 'var(--text-cream)', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700 }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '11px' }}>{label}</div>
    </div>
  );
}

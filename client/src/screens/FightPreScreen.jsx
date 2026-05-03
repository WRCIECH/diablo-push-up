import React, { useEffect, useRef, useState } from 'react';
import { useGame, EXP_TABLE } from '../context/GameContext.jsx';
import { useMusic } from '../hooks/useMusic.js';
import { calculateFight, aggregatePushUps, formatTime, pct, C } from '../utils/combat.js';
import { rollBetween, generateUID } from '../utils/items.js';
import { rollLoot, rollBossLoot } from '../utils/loot.js';
import { getMonsters, resolveMonster } from '../utils/dungeon.js';
import ItemIcon from '../components/ItemIcon.jsx';

// ── Life orb ──────────────────────────────────────────────────────────────────

function LifeOrb({ current, max, size = 64 }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const r  = size / 2;
  const fillY = size * (1 - ratio);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <defs>
          <clipPath id="orb-shape">
            <circle cx={r} cy={r} r={r - 2}/>
          </clipPath>
        </defs>
        {/* Empty background */}
        <circle cx={r} cy={r} r={r - 2} fill="#130202"/>
        {/* Liquid fill */}
        <g clipPath="url(#orb-shape)">
          <rect x="0" y={fillY} width={size} height={size} fill="#7a0a0a"/>
          {/* Ripple highlight at fill surface */}
          {ratio > 0 && ratio < 1 && (
            <rect x="0" y={fillY} width={size} height="3" fill="#cc2222" opacity="0.5"/>
          )}
        </g>
        {/* Glass shine */}
        <ellipse cx={r * 0.72} cy={r * 0.6} rx={r * 0.28} ry={r * 0.18}
                 fill="white" opacity="0.12"/>
        {/* Border */}
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke="#5a1212" strokeWidth="2"/>
      </svg>
      <div style={{ fontSize: '12px', color: ratio < 0.3 ? 'var(--red-text)' : 'var(--text-cream)',
                    fontWeight: 600, letterSpacing: '0.04em' }}>
        {Math.ceil(current)} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ {Math.round(max)}</span>
      </div>
    </div>
  );
}

// ── Monster portrait (SVG, type-coloured) ─────────────────────────────────────

function MonsterPortrait({ monster, size = 80 }) {
  const variant  = monster?.variant || 'normal';
  const isAnimal = monster?.type === 'Animal';
  const pal = variant === 'boss'
    ? { bg: '#0a0800', border: '#c8a000', eye: '#ffd700', body: '#8a6000' }
    : variant === 'strong'
      ? (isAnimal
          ? { bg: '#080a08', border: '#287a1a', eye: '#66ee22', body: '#287a1a' }
          : { bg: '#200808', border: '#8a1414', eye: '#ff4444', body: '#8a1414' })
      : (isAnimal
          ? { bg: '#080a08', border: '#1a3010', eye: '#44aa22', body: '#1a3010' }
          : { bg: '#1a0808', border: '#5a1010', eye: '#cc2222', body: '#5a1010' });
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" fill={pal.bg} rx="4"/>
      <rect x="2" y="2" width="92" height="92" fill="none" stroke={pal.border} strokeWidth="1.5" rx="3"/>
      <ellipse cx="48" cy="36" rx="22" ry="20" fill={pal.body} opacity="0.9"/>
      <ellipse cx="40" cy="32" rx="5" ry="5" fill={pal.bg}/>
      <ellipse cx="56" cy="32" rx="5" ry="5" fill={pal.bg}/>
      <ellipse cx="40" cy="32" rx="3" ry="3" fill={pal.eye} opacity="0.9"/>
      <ellipse cx="56" cy="32" rx="3" ry="3" fill={pal.eye} opacity="0.9"/>
      <path d="M38,46 L40,50 L42,46 L44,50 L46,46 L48,50 L50,46 L52,50 L54,46 L56,50 L58,46"
            fill="none" stroke={pal.eye} strokeWidth="1" opacity="0.7"/>
      <path d="M28,52 Q20,70 24,90 L72,90 Q76,70 68,52 Q58,60 48,58 Q38,60 28,52 Z"
            fill={pal.body} opacity="0.7"/>
      <path d="M28,54 Q10,62 12,76" fill="none" stroke={pal.body} strokeWidth="6" strokeLinecap="round"/>
      <path d="M68,54 Q86,62 84,76" fill="none" stroke={pal.body} strokeWidth="6" strokeLinecap="round"/>
      {/* Boss crown */}
      {variant === 'boss' && (
        <path d="M32,18 L38,8 L48,14 L58,8 L64,18 L62,24 L34,24 Z"
              fill="#ffd700" opacity="0.9"/>
      )}
      {/* Strong indicator — double stripe */}
      {variant === 'strong' && (
        <>
          <line x1="4" y1="4" x2="16" y2="4" stroke={pal.eye} strokeWidth="3" strokeLinecap="round"/>
          <line x1="4" y1="9" x2="12" y2="9" stroke={pal.eye} strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

// ── Difficulty dots ───────────────────────────────────────────────────────────

function DiffDots({ difficulty, max = 7 }) {
  return (
    <span style={{ letterSpacing: '2px', fontSize: '10px' }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < difficulty ? 'var(--text-gold)' : 'var(--border-dark)' }}>◆</span>
      ))}
    </span>
  );
}

// ── Push-up row (expandable definition) ──────────────────────────────────────

function PushUpRow({ pushUp, count, expanded, onToggle }) {
  return (
    <div
      style={{ background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden',
               border: '1px solid var(--border-dark)', cursor: 'pointer' }}
      onClick={onToggle}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-gold-bright)', fontWeight: 700, fontSize: '18px',
                         minWidth: '28px' }}>
            {count}×
          </span>
          <div>
            <div style={{ color: 'var(--text-cream)', fontSize: '13px', fontWeight: 600 }}>
              {pushUp.name}
            </div>
            <DiffDots difficulty={pushUp.difficulty} />
          </div>
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border-dark)' }}>
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.8, marginTop: '8px' }}>
            {pushUp.definition}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timer display ─────────────────────────────────────────────────────────────

function TimerDisplay({ seconds, life, maxLife, isDraining, ended }) {
  const color = ended ? 'var(--red-text)' : isDraining ? '#e08020' : 'var(--text-white)';
  const display = isDraining
    ? `${Math.ceil(Math.max(0, life))}`
    : formatTime(seconds);
  const label = ended ? 'HP DEPLETED' : isDraining ? 'HP REMAINING' : 'REMAINING';

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px, 14vw, 72px)',
                    fontWeight: 900, color, letterSpacing: '0.04em',
                    textShadow: `0 0 20px ${color}66` }}>
        {display}
      </div>
      {isDraining && maxLife > 0 && (
        <div style={{ margin: '6px 16px 0', height: 6, background: 'var(--border-dark)', borderRadius: 3 }}>
          <div style={{ height: '100%', borderRadius: 3, background: ended ? 'var(--red-text)' : '#cc2222',
                        width: `${Math.max(0, Math.min(100, life / maxLife * 100))}%`,
                        transition: 'width 0.9s linear' }}/>
        </div>
      )}
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: ended ? 'var(--red-text)' : isDraining ? '#e08020' : 'var(--text-dim)',
                    marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNewLevel(player, expGain) {
  let lvl = player.level;
  let exp = player.exp + expGain;
  while (lvl < 20 && exp >= EXP_TABLE[lvl]) { exp -= EXP_TABLE[lvl]; lvl++; }
  return lvl;
}

// ── Main fight screen ─────────────────────────────────────────────────────────

export default function FightPreScreen() {
  useMusic('/audio/dungeon.mp3');
  const { state, dispatchAndSave, setScreen, gameData, setLootResult } = useGame();
  const dungeon  = state.dungeon;
  const node     = dungeon?.nodes[dungeon?.currentNodeId];
  const player   = state.player;
  const monsterNames = node ? getMonsters(node) : [];
  const monsters = monsterNames
    .map(name => resolveMonster(name, gameData?.monsters ?? []))
    .filter(Boolean);

  // ── Phase state: 'pre' | 'active' | 'result' ─────────────────────────────
  const [phase,    setPhase]    = useState('pre');
  const [fightData, setFightData] = useState(null);
  const [expanded, setExpanded] = useState(null);  // expanded push-up name
  const [lostConfirm, setLostConfirm] = useState(false);

  // Timer (managed via ref to avoid stale-closure bugs)
  const timerRef   = useRef({ buffer: 0, isDraining: false, life: 0, maxLife: 0, dps: 0 });
  const intervalId = useRef(null);
  const [timerDisp, setTimerDisp] = useState({ seconds: 0, life: 0, maxLife: 0, isDraining: false, ended: false });

  // ── Calculate on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!monsters.length || !gameData?.pushUps) return;
    const data = calculateFight(player, monsters, gameData.pushUps);
    setFightData(data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    intervalId.current = setInterval(() => {
      const t = timerRef.current;

      if (!t.isDraining) {
        if (t.buffer > 0) {
          t.buffer -= 1;
          setTimerDisp({ seconds: t.buffer, life: t.life, maxLife: t.maxLife, isDraining: false, ended: false });
        } else {
          t.isDraining = true;
          setTimerDisp({ seconds: 0, life: t.life, maxLife: t.maxLife, isDraining: true, ended: false });
        }
      } else {
        t.life = Math.max(0, t.life - t.dps);
        if (t.life <= 0) {
          clearInterval(intervalId.current);
          setTimerDisp({ seconds: 0, life: 0, maxLife: t.maxLife, isDraining: true, ended: true });
        } else {
          setTimerDisp({ seconds: 0, life: t.life, maxLife: t.maxLife, isDraining: true, ended: false });
        }
      }
    }, 1000);

    return () => clearInterval(intervalId.current);
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function startFight() {
    const currentLife = player.stats.life;
    timerRef.current = {
      buffer: Math.round(fightData.buffer),
      isDraining: false,
      life: currentLife,
      startingLife: currentLife,
      maxLife: fightData.maxLife,
      dps: fightData.damagePerSecond,
    };
    setTimerDisp({ seconds: Math.round(fightData.buffer), life: currentLife,
                   maxLife: fightData.maxLife, isDraining: false, ended: false });
    setPhase('active');
  }

  function drinkPotion(healType) {
    const potion = state.player.inventory.find(i => i.type === 'healing' && i.heal === healType);
    if (!potion || !timerRef.current.isDraining) return;
    const t = timerRef.current;
    t.life = healType === 'full'
      ? t.maxLife
      : Math.min(t.maxLife, t.life + C.HEALING_POTION_LIFE_ADDITION);
    setTimerDisp(d => ({ ...d, life: t.life }));
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: potion.uid });
  }

  function handleWin() {
    clearInterval(intervalId.current);

    // Apply HP damage: difference between life at fight start and life now
    if (phase === 'active' && timerRef.current.isDraining) {
      const lifeLost = Math.round(timerRef.current.startingLife - timerRef.current.life);
      if (lifeLost > 0) dispatchAndSave({ type: 'DAMAGE_PLAYER', payload: lifeLost });
    }

    const fightId  = generateUID('fight');
    const totalExp = monsters.reduce((s, m) => s + m.exp, 0);
    const newLevel = calcNewLevel(player, totalExp);

    // Roll loot per monster (boss guarantees magic/unique)
    let totalGold = 0;
    const lootItems = [];
    for (const monster of monsters) {
      const drop = monster.variant === 'boss'
        ? rollBossLoot(gameData.items)
        : rollLoot(monster, gameData.items);
      if (drop?.type === 'gold')      totalGold += drop.amount;
      else if (drop?.type === 'item') lootItems.push(drop.item);
    }

    // Apply game state changes
    dispatchAndSave({ type: 'DEFEAT_MONSTER', payload: node.id });
    dispatchAndSave({ type: 'GAIN_EXP',       payload: totalExp });
    if (totalGold > 0) dispatchAndSave({ type: 'ADD_GOLD', payload: totalGold });
    for (const item of lootItems) dispatchAndSave({ type: 'ADD_ITEM', payload: item });

    // One history entry per required push-up
    const monsterLabel = monsters.map(m => m.displayName || m.name).join(', ');
    for (const pu of fightData.finalPushUps) {
      dispatchAndSave({ type: 'ADD_HISTORY', payload: {
        timestamp:    new Date().toISOString(),
        fight_id:     fightId,
        push_up_type: pu.id,
        monster:      monsterLabel,
        level:        dungeon.levelId,
        fight_result: 'won',
      }});
    }

    setLootResult({
      gold:     totalGold,
      exp:      totalExp,
      newLevel,
      leveledUp: newLevel > player.level,
      loots:    lootItems,
      monsters,
    });
    setScreen('loot');
  }

  function handleLoss() {
    if (!lostConfirm && !timerDisp.ended) { setLostConfirm(true); return; }
    clearInterval(intervalId.current);
    dispatchAndSave({ type: 'SET_PENALTY', payload: new Date(Date.now() + C.PENALTY_MS).toISOString() });
    dispatchAndSave({ type: 'HEAL_FULL' });
    dispatchAndSave({ type: 'LEAVE_DUNGEON' });
    setScreen('tristram');
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!node || !monsters.length || !gameData) {
    return (
      <div className="loading-screen">
        <div className="loading-sigil" />
        <span className="text-gold" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', letterSpacing: '0.1em' }}>
          PREPARING FIGHT...
        </span>
      </div>
    );
  }

  // ── RESULT PHASE ──────────────────────────────────────────────────────────

  // ── ACTIVE PHASE ──────────────────────────────────────────────────────────

  if (phase === 'active') {
    const aggregated = aggregatePushUps(fightData.finalPushUps);
    const potionDefs = [
      { healType: 'partial', label: `+${C.HEALING_POTION_LIFE_ADDITION} HP`,
        placeholder: { id: 'healing_potion',      slot: 'potion', heal: 'partial' } },
      { healType: 'full',    label: 'Full HP',
        placeholder: { id: 'full_healing_potion', slot: 'potion', heal: 'full'    } },
    ].map(def => ({
      ...def,
      items: state.player.inventory.filter(i => i.type === 'healing' && i.heal === def.healType),
    }));

    return (
      <div className="screen">
        {/* Monster label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {monsters.map(m => (
            <MonsterPortrait key={m.displayName || m.name} monster={m} size={monsters.length > 1 ? 58 : 80}/>
          ))}
          <div>
            <div className="title-medium">{monsters.map(m => m.displayName || m.name).join(' · ')}</div>
            <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {[...new Set(monsters.map(m => m.type))].join(' & ')} · Level {dungeon.levelId}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="panel" style={{ flexShrink: 0, position: 'relative' }}>
          <TimerDisplay {...timerDisp} />
          {!timerDisp.isDraining && (
            <div style={{ textAlign: 'center', paddingBottom: '10px' }}>
              <span className="text-dim" style={{ fontSize: '11px' }}>
                {fightData.damagePerSecond.toFixed(1)} HP/s drain · {Math.round(fightData.maxLife)} max HP
              </span>
            </div>
          )}
        </div>

        {/* Push-up list */}
        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', display: 'flex',
                                             flexDirection: 'column', gap: '6px' }}>
          {aggregated.length === 0 ? (
            <div className="panel" style={{ padding: '16px', textAlign: 'center' }}>
              <div className="text-green" style={{ fontSize: '14px', fontWeight: 700 }}>
                No push-ups required!
              </div>
              <div className="text-dim" style={{ fontSize: '12px', marginTop: '4px' }}>
                Your dexterity evaded all demands.
              </div>
            </div>
          ) : (
            aggregated.map(({ pushUp, count }) => (
              <PushUpRow
                key={pushUp.name}
                pushUp={pushUp}
                count={count}
                expanded={expanded === pushUp.name}
                onToggle={() => setExpanded(e => e === pushUp.name ? null : pushUp.name)}
              />
            ))
          )}
        </div>

        {/* Potion + outcome buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          {/* Potion row — one slot per type, expandable for future potions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {potionDefs.map(({ healType, label, placeholder, items }) => {
              const count    = items.length;
              const iconItem = items[0] ?? placeholder;
              return (
                <div key={healType} style={{ position: 'relative' }}>
                  <button
                    onClick={() => drinkPotion(healType)}
                    disabled={count === 0 || !timerDisp.isDraining}
                    style={{
                      width: 56, height: 56, borderRadius: '4px',
                      cursor: count > 0 && timerDisp.isDraining ? 'pointer' : 'default',
                      background: count > 0 ? 'var(--bg-input)' : 'var(--bg-panel)',
                      border: `1px solid ${count > 0 ? 'var(--border-mid)' : 'var(--border-dark)'}`,
                      opacity: count > 0 && timerDisp.isDraining ? 1 : 0.35,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '2px',
                    }}
                  >
                    <ItemIcon item={iconItem} size={34}/>
                    <span style={{ fontSize: '9px', color: 'var(--text-dim)', lineHeight: 1 }}>
                      {label}
                    </span>
                  </button>
                  {count > 0 && (
                    <div style={{
                      position: 'absolute', top: -6, right: -6,
                      background: 'var(--bg-panel)', border: '1px solid var(--border-mid)',
                      borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: 'var(--text-cream)',
                    }}>
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary btn-full"
                  style={{ fontSize: '14px', padding: '15px' }}
                  onClick={handleWin}>
            ⚔  I finished all push-ups
          </button>

          {lostConfirm ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-full" style={{ fontSize: '12px' }}
                      onClick={() => setLostConfirm(false)}>
                Keep going
              </button>
              <button className="btn btn-danger btn-full" style={{ fontSize: '12px' }}
                      onClick={handleLoss}>
                Confirm defeat (2h penalty)
              </button>
            </div>
          ) : (
            <button className="btn btn-danger btn-full"
                    style={{ fontSize: '12px', padding: '12px' }}
                    onClick={handleLoss}>
              {timerDisp.ended ? "Time's up — I failed" : 'I failed'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── PRE-FIGHT PHASE ───────────────────────────────────────────────────────

  const aggregated = fightData ? aggregatePushUps(fightData.finalPushUps) : [];

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => {
                  // Retreat to parent node so DungeonScreen doesn't auto-redirect back here
                  const parentId = state.dungeon?.nodes[state.dungeon?.currentNodeId]?.parentId;
                  if (parentId) dispatchAndSave({ type: 'NAVIGATE_TO_NODE', payload: { nodeId: parentId } });
                  setScreen('dungeon');
                }}>
          ← Back
        </button>
        <span className="title-small">Encounter</span>
      </div>

      {/* Scrollable body — monster card + fight preview — button stays pinned below */}
      <div className="scrollable" style={{ flex: 1, overflowY: 'auto', display: 'flex',
                                           flexDirection: 'column', gap: '8px' }}>

        {/* Monster card */}
        <div className="panel panel-gold" style={{ padding: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            {monsters.map(m => (
              <MonsterPortrait key={m.displayName || m.name} monster={m} size={monsters.length > 1 ? 58 : 80}/>
            ))}
            <div style={{ flex: 1 }}>
              <div className="title-medium" style={{ marginBottom: '4px' }}>
                {monsters.map(m => m.displayName || m.name).join(' · ')}
              </div>
              <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {[...new Set(monsters.map(m => m.type))].join(' & ')} · Level {dungeon.levelId}
              </div>
            </div>
          </div>
          <div className="divider" style={{ marginBottom: '8px' }} />
          {monsters.map(m => (
            <div key={m.displayName || m.name} className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.7, marginBottom: '4px' }}>
              {monsters.length > 1 && <span style={{ color: 'var(--text-gold)', fontSize: '11px' }}>{m.displayName || m.name}: </span>}
              {m.description}
            </div>
          ))}
        </div>

        {/* Fight preview — push-ups + time */}
        {fightData ? (
          <>

          {/* Time overview */}
          <div className="panel" style={{ padding: '12px' }}>
            <div className="title-small" style={{ marginBottom: '8px' }}>Fight Overview</div>
            <div className="divider" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <LifeOrb current={player.stats.life} max={fightData.maxLife} size={64}/>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                <StatRow label="Prep buffer"  value={formatTime(fightData.buffer)} />
                <StatRow label="HP drain/sec" value={fightData.damagePerSecond.toFixed(1)} color="var(--red-text)" />
              </div>
            </div>
          </div>

          {/* Push-ups */}
          <div className="panel" style={{ padding: '12px' }}>
            <div className="title-small" style={{ marginBottom: '8px' }}>
              Required Push-ups
              {aggregated.length === 0 && (
                <span className="text-dim" style={{ marginLeft: '8px', fontSize: '11px',
                                                    textTransform: 'none', fontWeight: 400 }}>
                  · none (dex evaded all)
                </span>
              )}
            </div>
            <div className="divider" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {aggregated.map(({ pushUp, count }) => (
                <PushUpRow
                  key={pushUp.name}
                  pushUp={pushUp}
                  count={count}
                  expanded={expanded === pushUp.name}
                  onToggle={() => setExpanded(e => e === pushUp.name ? null : pushUp.name)}
                />
              ))}
            </div>
          </div>

          {/* Combat math (transparent) */}
          <div className="panel" style={{ padding: '12px' }}>
            <div className="title-small" style={{ marginBottom: '8px' }}>Combat Calculation</div>
            <div className="divider" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              <StatRow label="Skip chance (DEX)" value={pct(fightData.skipChance)} color="var(--green-text)" />
              {fightData.monsterStats.map(ms => (
                <React.Fragment key={ms.name}>
                  <StatRow label={`${ms.name} ease`}  value={`${ms.easeSteps}`}   color="var(--green-text)" />
                  <StatRow label={`${ms.name} HP/s`}  value={ms.dps.toFixed(1)}   color="var(--red-text)" />
                </React.Fragment>
              ))}
            </div>
          </div>
        </> ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-sigil" />
          </div>
        )}
      </div>

      {/* Start / Claim Victory */}
      <button
        className="btn btn-primary btn-full"
        style={{ fontSize: '15px', padding: '18px', letterSpacing: '0.08em', flexShrink: 0 }}
        disabled={!fightData}
        onClick={fightData?.finalPushUps.length === 0 ? handleWin : startFight}
      >
        {fightData?.finalPushUps.length === 0 ? '✓  Claim Victory — no push-ups required' : '⚔  Start Fight'}
      </button>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span className="stat-label">{label}</span>
      <span style={{ color: color || 'var(--text-cream)', fontSize: '13px', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}


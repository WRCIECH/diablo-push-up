import React, { useEffect, useRef, useState } from 'react';
import { useGame, EXP_TABLE } from '../context/GameContext.jsx';
import { useMusic } from '../hooks/useMusic.js';
import { calculateFight, aggregatePushUps, formatTime, pct, C } from '../utils/combat.js';
import { rollBetween, generateUID } from '../utils/items.js';
import { rollLoot } from '../utils/loot.js';

// ── Monster portrait (SVG, type-coloured) ─────────────────────────────────────

function MonsterPortrait({ monster }) {
  const pal = monster?.type === 'Animal'
    ? { bg: '#080a08', border: '#1a3010', eye: '#44aa22', body: '#1a3010' }
    : { bg: '#1a0808', border: '#5a1010', eye: '#cc2222', body: '#5a1010' };
  return (
    <svg viewBox="0 0 96 96" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
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

function TimerDisplay({ seconds, isBuffer, ended }) {
  const color = ended
    ? 'var(--red-text)'
    : isBuffer
      ? '#e08020'    // amber for buffer
      : 'var(--text-white)';

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px, 14vw, 72px)',
                    fontWeight: 900, color, letterSpacing: '0.04em',
                    textShadow: `0 0 20px ${color}66` }}>
        {ended ? 'TIME' : formatTime(seconds)}
      </div>
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: ended ? 'var(--red-text)' : isBuffer ? '#e08020' : 'var(--text-dim)',
                    marginTop: '4px' }}>
        {ended ? "TIME'S UP" : isBuffer ? 'VITALITY BUFFER' : 'REMAINING'}
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
  useMusic(null);   // no music during fights
  const { state, dispatchAndSave, setScreen, gameData, setLootResult } = useGame();
  const dungeon  = state.dungeon;
  const node     = dungeon?.nodes[dungeon?.currentNodeId];
  const player   = state.player;
  const monster  = gameData?.monsters?.find(m => m.name === node?.monster);

  // ── Phase state: 'pre' | 'active' | 'result' ─────────────────────────────
  const [phase,    setPhase]    = useState('pre');
  const [fightData, setFightData] = useState(null);
  const [expanded, setExpanded] = useState(null);  // expanded push-up name
  const [lostConfirm, setLostConfirm] = useState(false);

  // Timer (managed via ref to avoid stale-closure bugs)
  const timerRef   = useRef({ main: 0, buf: 0, isBuffer: false });
  const intervalId = useRef(null);
  const [timerDisp, setTimerDisp] = useState({ seconds: 0, isBuffer: false, ended: false });

  // ── Calculate on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!monster || !gameData?.pushUps) return;
    const data = calculateFight(player, monster, gameData.pushUps);
    setFightData(data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    intervalId.current = setInterval(() => {
      const t = timerRef.current;

      if (!t.isBuffer) {
        if (t.main > 0) {
          t.main -= 1;
          setTimerDisp({ seconds: t.main, isBuffer: false, ended: false });
        } else {
          // Switch to vitality buffer
          t.isBuffer = true;
          setTimerDisp({ seconds: t.buf, isBuffer: true, ended: false });
        }
      } else {
        if (t.buf > 0) {
          t.buf -= 1;
          setTimerDisp({ seconds: t.buf, isBuffer: true, ended: false });
        } else {
          // Time's up — stop timer, show ended state, player must confirm loss
          clearInterval(intervalId.current);
          setTimerDisp({ seconds: 0, isBuffer: true, ended: true });
        }
      }
    }, 1000);

    return () => clearInterval(intervalId.current);
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function startFight() {
    timerRef.current = { main: fightData.baseTime, buf: fightData.vitalityBuffer, isBuffer: false };
    setTimerDisp({ seconds: fightData.baseTime, isBuffer: false, ended: false });
    setPhase('active');
  }

  function drinkPotion() {
    const potion = state.player.inventory.find(i => i.type === 'healing');
    if (!potion || timerRef.current.isBuffer) return;
    timerRef.current.main += C.HEALING_POTION_SECONDS;
    setTimerDisp(d => ({ ...d, seconds: timerRef.current.main }));
    dispatchAndSave({ type: 'REMOVE_ITEM', payload: potion.uid });
  }

  function handleWin() {
    clearInterval(intervalId.current);
    const fightId  = generateUID('fight');
    const newLevel = calcNewLevel(player, monster.exp);

    // Roll loot drop
    const drop = rollLoot(monster, gameData.items);
    let goldFromDrop = 0;
    let lootItem     = null;

    if (drop?.type === 'gold') {
      goldFromDrop = drop.amount;
    } else if (drop?.type === 'item') {
      lootItem = drop.item;
    }

    // Apply game state changes
    dispatchAndSave({ type: 'DEFEAT_MONSTER', payload: node.id });
    dispatchAndSave({ type: 'GAIN_EXP',       payload: monster.exp });
    if (goldFromDrop > 0) dispatchAndSave({ type: 'ADD_GOLD', payload: goldFromDrop });
    if (lootItem)         dispatchAndSave({ type: 'ADD_ITEM', payload: lootItem });

    // One history entry per required push-up
    for (const pu of fightData.finalPushUps) {
      dispatchAndSave({ type: 'ADD_HISTORY', payload: {
        timestamp:    new Date().toISOString(),
        fight_id:     fightId,
        push_up_type: pu.id,
        monster:      monster.name,
        level:        dungeon.levelId,
        fight_result: 'won',
      }});
    }

    // Pass summary to LootScreen and navigate there
    setLootResult({
      gold:     goldFromDrop,
      exp:      monster.exp,
      newLevel,
      leveledUp: newLevel > player.level,
      loot:     lootItem,
      monster,
    });
    setScreen('loot');
  }

  function handleLoss() {
    if (!lostConfirm && !timerDisp.ended) { setLostConfirm(true); return; }
    clearInterval(intervalId.current);
    dispatchAndSave({ type: 'SET_PENALTY', payload: new Date(Date.now() + C.PENALTY_MS).toISOString() });
    dispatchAndSave({ type: 'LEAVE_DUNGEON' });
    setScreen('tristram');
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!node || !monster || !gameData) {
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
    const potionCount = state.player.inventory.filter(i => i.type === 'healing').length;
    const aggregated  = aggregatePushUps(fightData.finalPushUps);

    return (
      <div className="screen">
        {/* Monster label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <MonsterPortrait monster={monster} />
          <div>
            <div className="title-medium">{monster.name}</div>
            <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {monster.type} · Level {dungeon.levelId}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="panel" style={{ flexShrink: 0, position: 'relative' }}>
          <TimerDisplay {...timerDisp} />
          {!timerDisp.isBuffer && fightData.vitalityBuffer > 0 && (
            <div style={{ textAlign: 'center', paddingBottom: '10px' }}>
              <span className="text-dim" style={{ fontSize: '11px' }}>
                + {formatTime(fightData.vitalityBuffer)} vitality buffer
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
          <button
            className="btn btn-ghost btn-full"
            style={{ fontSize: '12px', opacity: potionCount > 0 && !timerDisp.isBuffer ? 1 : 0.4 }}
            disabled={potionCount === 0 || timerDisp.isBuffer}
            onClick={drinkPotion}
          >
            🧪 Drank Healing Potion (+{C.HEALING_POTION_SECONDS}s)
            {potionCount > 0 && <span className="text-dim" style={{ marginLeft: '6px' }}>· {potionCount} left</span>}
          </button>

          <button className="btn btn-primary btn-full"
                  style={{ fontSize: '14px', padding: '15px' }}
                  onClick={handleWin}>
            ⚔  I finished all push-ups — Victory
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

      {/* Monster card */}
      <div className="panel panel-gold" style={{ padding: '14px', display: 'flex',
                                                  gap: '14px', alignItems: 'center', flexShrink: 0 }}>
        <MonsterPortrait monster={monster} />
        <div style={{ flex: 1 }}>
          <div className="title-medium" style={{ marginBottom: '4px' }}>{monster.name}</div>
          <div className="text-dim" style={{ fontSize: '11px', letterSpacing: '0.06em',
                                             textTransform: 'uppercase', marginBottom: '8px' }}>
            {monster.type} · Level {dungeon.levelId}
          </div>
          <div className="divider" style={{ marginBottom: '8px' }} />
          <div className="text-flavor" style={{ fontSize: '12px', lineHeight: 1.7 }}>
            {monster.description}
          </div>
        </div>
      </div>

      {/* Fight preview — push-ups + time */}
      {fightData ? (
        <div className="scrollable" style={{ flex: 1, overflowY: 'auto', display: 'flex',
                                             flexDirection: 'column', gap: '8px' }}>

          {/* Time overview */}
          <div className="panel" style={{ padding: '12px' }}>
            <div className="title-small" style={{ marginBottom: '8px' }}>Fight Time</div>
            <div className="divider" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              <StatRow label="Base time"      value={formatTime(fightData.baseTime)} />
              <StatRow label="Vitality buffer" value={`+${formatTime(fightData.vitalityBuffer)}`}
                       color="var(--blue-text)" />
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
              <StatRow label="Ease chance (STR)" value={pct(fightData.easeChance)}      color="var(--green-text)" />
              <StatRow label="Ease amount"        value={`−${fightData.easeAmount} diff`} />
              <StatRow label="Skip chance (DEX)"  value={pct(fightData.skipChance)}      color="var(--green-text)" />
              <StatRow label="Monster hit%"       value={pct(fightData.monsterHitChance)} color="var(--red-text)" />
              <StatRow label="Player AC"          value={fightData.playerAC} />
              <StatRow label="Time lost"          value={`-${fightData.baseTimeReduction}s`}
                        color={fightData.baseTimeReduction > 0 ? 'var(--red-text)' : 'var(--text-dim)'} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-sigil" />
        </div>
      )}

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


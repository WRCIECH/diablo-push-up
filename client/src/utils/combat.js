// ── Combat constants — loaded from server/constants.js via /api/data/constants ─
// Edit server/constants.js to tune; the client picks up the values on load.
// Fallback defaults here are only used if the API call fails.

export const C = {
  PUSH_UP_RATIO:         0.5,
  DAMAGE_TO_SECONDS:     3,
  BASE_FIGHT_TIME:       120,
  VITALITY_TO_SECONDS:   2,
  HEALING_POTION_SECONDS:30,
  HIT_CHANCE_MIN:        0.05,
  HIT_CHANCE_MAX:        0.95,
  PENALTY_MS:            2 * 60 * 60 * 1000,
};

// Called by GameContext after fetching /api/data/constants from the server.
export function initConstants(serverC) {
  Object.assign(C, serverC);
  // Server uses PENALTY_DURATION_MS; client uses PENALTY_MS
  if (serverC.PENALTY_DURATION_MS !== undefined) C.PENALTY_MS = serverC.PENALTY_DURATION_MS;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function rollBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickFromWeightedPool(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Map a reduced difficulty number back to the canonical push-up at that level.
// Lower-difficulty push-ups always appear first in push_ups.json.
function diffToPushUp(difficulty, pushUpData) {
  return (
    pushUpData.find(p => p.difficulty === difficulty) ||
    pushUpData.find(p => p.difficulty <= difficulty)  ||
    pushUpData[0]
  );
}

function getArmorAC(player) {
  const { armor, shield, helm } = player.equipment;
  let ac = 0;
  if (armor)  ac += armor.ac  || 0;
  if (shield) ac += shield.ac || 0;
  if (helm)   ac += helm.ac   || 0;
  return ac;
}

// ── Main calculation ──────────────────────────────────────────────────────────

/**
 * Runs all 3 combat steps from the GDD and returns everything the fight
 * screen needs to display and act on.
 *
 * Steps:
 *  1. Generate push-up pool → apply Strength reduction (deterministic)
 *  2. Dexterity skip per push-up (probabilistic)
 *  3. Monster hit rolls against original pool → reduce base time (probabilistic)
 */
// monsters is always an array (single-monster fights pass a one-element array)
export function calculateFight(player, monsters, pushUpData) {

  // ── Weapon stats (shared across steps) ───────────────────────────────────
  const weaponAvgDamage = player.equipment.weapon
    ? (player.equipment.weapon.damage[0] + player.equipment.weapon.damage[1]) / 2
    : 0;
  const weaponDamage = player.equipment.weapon
    ? rollBetween(player.equipment.weapon.damage[0], player.equipment.weapon.damage[1])
    : 0;

  // ── Step 0: Generate raw pool from all monsters ───────────────────────────
  // Each monster contributes its own sub-pool; attacks resolve against that sub-pool only.
  const playerAC = Math.floor(player.stats.dexterity / 5) + getArmorAC(player);
  const rawPool  = [];
  let baseTimeReduction = 0;
  let hitsOnPlayer      = 0;
  const monsterStats    = [];

  for (const monster of monsters) {
    const count      = Math.max(1, Math.round(monster.vitality * C.PUSH_UP_RATIO));
    const subPool    = [];
    for (let i = 0; i < count; i++) {
      const typeId = pickFromWeightedPool(monster.push_up_types);
      const def    = pushUpData.find(p => p.id === typeId);
      if (def) subPool.push({ ...def });
    }
    rawPool.push(...subPool);

    // ── Step 3 (per monster): attacks against its own sub-pool ───────────
    const monsterHitChance = clamp((monster.toHit - playerAC) / 2 / 100,
                                   C.HIT_CHANCE_MIN, C.HIT_CHANCE_MAX);
    let monsterHits = 0;
    for (let i = 0; i < subPool.length; i++) {
      if (Math.random() < monsterHitChance) {
        baseTimeReduction += rollBetween(monster.damage[0], monster.damage[1]) * C.DAMAGE_TO_SECONDS;
        hitsOnPlayer++;
        monsterHits++;
      }
    }
    monsterStats.push({ name: monster.name, hitChance: monsterHitChance, hits: monsterHits });
  }

  // ── Step 1: Strength ease (probabilistic, per push-up) ───────────────────
  const easeChance = clamp(
    (40 + Math.floor(player.stats.strength / 2) + Math.floor(weaponAvgDamage)) / 100,
    C.HIT_CHANCE_MIN, C.HIT_CHANCE_MAX
  );
  const easeAmount = Math.max(1, Math.floor(weaponAvgDamage / 2));

  const easedPool = rawPool.map(pu => {
    if (Math.random() < easeChance) {
      const newDiff   = Math.max(1, pu.difficulty - easeAmount);
      const canonical = diffToPushUp(newDiff, pushUpData);
      return { ...canonical, _originalName: pu.name };
    }
    return { ...pu };
  });

  // ── Step 2: Dexterity skip (probabilistic, per push-up in easedPool) ─────
  // Use average monster AC so mixed groups scale the skip chance proportionally.
  const avgAC          = Math.round(monsters.reduce((s, m) => s + m.ac, 0) / monsters.length);
  const playerToHitPct = 50 + Math.floor(player.stats.dexterity / 2) + player.level;
  const skipChance     = clamp((playerToHitPct - avgAC) / 2 / 100,
                               C.HIT_CHANCE_MIN, C.HIT_CHANCE_MAX);
  const finalPushUps   = easedPool.filter(() => Math.random() >= skipChance);

  const baseTime       = Math.max(0, C.BASE_FIGHT_TIME - baseTimeReduction);
  const vitalityBuffer = player.stats.vitality * C.VITALITY_TO_SECONDS;

  return {
    rawPool,
    easedPool,
    finalPushUps,
    baseTime,
    vitalityBuffer,
    weaponDamage,
    weaponAvgDamage,
    easeChance,
    easeAmount,
    skipChance,
    playerToHitPct,
    playerAC,
    monsterStats,    // array — one entry per monster
    hitsOnPlayer,
    baseTimeReduction,
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function aggregatePushUps(pushUps) {
  const map = new Map();
  for (const pu of pushUps) {
    const key = pu.name;
    if (!map.has(key)) map.set(key, { pushUp: pu, count: 0 });
    map.get(key).count += 1;
  }
  return [...map.values()];
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function pct(ratio) {
  return `${Math.round(ratio * 100)}%`;
}

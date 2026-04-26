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
export function calculateFight(player, monster, pushUpData) {

  // ── Step 0: Generate raw push-up pool ────────────────────────────────────
  const count = Math.max(1, Math.round(monster.vitality * C.PUSH_UP_RATIO));
  const rawPool = [];
  for (let i = 0; i < count; i++) {
    const typeId = pickFromWeightedPool(monster.push_up_types);
    const def    = pushUpData.find(p => p.id === typeId);
    if (def) rawPool.push({ ...def });
  }

  // ── Step 1: Strength ease (probabilistic, per push-up) ───────────────────
  // Each push-up independently has a chance to have its difficulty reduced.
  // Ease chance is higher than DEX skip chance — easing is more common than skipping.
  const weaponAvgDamage = player.equipment.weapon
    ? (player.equipment.weapon.damage[0] + player.equipment.weapon.damage[1]) / 2
    : 0;
  const weaponDamage = player.equipment.weapon
    ? rollBetween(player.equipment.weapon.damage[0], player.equipment.weapon.damage[1])
    : 0;

  const easeChance = clamp(
    (40 + Math.floor(player.stats.strength / 2) + Math.floor(weaponAvgDamage)) / 100,
    C.HIT_CHANCE_MIN, C.HIT_CHANCE_MAX
  );
  const easeAmount = Math.max(1, Math.floor(weaponAvgDamage / 2));

  const easedPool = rawPool.map(pu => {
    if (Math.random() < easeChance) {
      const newDiff  = Math.max(1, pu.difficulty - easeAmount);
      const canonical = diffToPushUp(newDiff, pushUpData);
      return { ...canonical, _originalName: pu.name };
    }
    return { ...pu };
  });

  // ── Step 2: Dexterity skip (probabilistic, per push-up in easedPool) ─────
  const playerToHitPct = 50 + Math.floor(player.stats.dexterity / 2) + player.level;
  const skipChance     = clamp((playerToHitPct - monster.ac) / 2 / 100,
                               C.HIT_CHANCE_MIN, C.HIT_CHANCE_MAX);
  const finalPushUps   = easedPool.filter(() => Math.random() >= skipChance);

  // ── Step 3: Monster attacks against ORIGINAL pool ─────────────────────────
  const playerAC           = Math.floor(player.stats.dexterity / 5) + getArmorAC(player);
  const monsterHitChance   = clamp((monster.toHit - playerAC) / 2 / 100,
                                   C.HIT_CHANCE_MIN, C.HIT_CHANCE_MAX);
  let baseTimeReduction    = 0;
  let hitsOnPlayer         = 0;

  for (let i = 0; i < rawPool.length; i++) {
    if (Math.random() < monsterHitChance) {
      baseTimeReduction += rollBetween(monster.damage[0], monster.damage[1]) * C.DAMAGE_TO_SECONDS;
      hitsOnPlayer++;
    }
  }

  const baseTime      = Math.max(0, C.BASE_FIGHT_TIME - baseTimeReduction);
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
    monsterHitChance,
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

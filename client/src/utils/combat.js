import { getEffectiveStats, collectBonuses } from './items.js';

// ── Combat constants — loaded from server/constants.js via /api/data/constants ─
// Edit server/constants.js to tune; the client picks up the values on load.
// Fallback defaults here are only used if the API call fails.

export const C = {
  PUSH_UP_RATIO:                 0.5,
  HEALING_POTION_LIFE_ADDITION:  30,
  SKIP_CHANCE_PER_ONE_DEXTERITY: 0.003,
  LIFE_PER_LEVEL:                2,
  LIFE_POINTS_PER_ONE_VITALITY:  5.0,
  SECONDS_PER_PUSH_UP:           1.5,
  PUSH_UP_PREPARATION_TIME:      5.0,
  MINIMAL_DAMAGE_CHANCE:         0.01,
  MINIMAL_DAMAGE_PER_SECOND:     1,
  PENALTY_MS:                    2 * 60 * 60 * 1000,
};

// Called by GameContext after fetching /api/data/constants from the server.
export function initConstants(serverC) {
  Object.assign(C, serverC);
  if (serverC.PENALTY_DURATION_MS !== undefined) C.PENALTY_MS = serverC.PENALTY_DURATION_MS;
}

// MaxLife = LIFE_PER_LEVEL × level + vitality × LIFE_POINTS_PER_ONE_VITALITY + item +life bonuses
export function getMaxLife(player) {
  const stats = getEffectiveStats(player);
  const itemLifeBonus = Object.values(player.equipment)
    .filter(Boolean)
    .reduce((sum, item) => sum + (collectBonuses(item).life || 0), 0);
  return C.LIFE_PER_LEVEL * player.level
       + stats.vitality * C.LIFE_POINTS_PER_ONE_VITALITY
       + itemLifeBonus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────


function getArmorAC(player) {
  let ac = 0;
  for (const item of [player.equipment.armor, player.equipment.shield, player.equipment.helm]) {
    if (!item) continue;
    ac += (item.ac || 0) + (collectBonuses(item).ac || 0);
  }
  return ac;
}

// ── Main calculation ──────────────────────────────────────────────────────────

// monsters is always an array (single-monster fights pass a one-element array)
export function calculateFight(player, monsters, pushUpData) {
  const stats = getEffectiveStats(player);

  // Weapon damage including affix bonuses — used for ease steps
  const weaponBase    = player.equipment.weapon?.damage ?? 0;
  const weaponBonuses = player.equipment.weapon ? collectBonuses(player.equipment.weapon) : {};
  const weaponDamage  = Math.round(
    (weaponBase + (weaponBonuses.damage_flat || 0)) * (1 + (weaponBonuses.damage_pct || 0) / 100)
  );

  // ── Build raw pool + apply ease + resolve monster attacks (per monster) ───
  const playerAC  = getArmorAC(player);  // items only — DEX does not contribute to AC
  const rawPool   = [];
  const easedPool = [];
  const monsterStats = [];

  for (const monster of monsters) {
    const count   = Math.max(1, Math.round(monster.vitality * C.PUSH_UP_RATIO));
    const types   = monster.push_up_types;   // ordered degradation chain
    const maxTier = types.length - 1;

    // Ease steps = STR + weapon damage − monster AC, minimum 0.
    // Each step downgrades one push-up to the next type in the chain,
    // filling round-robin: all reach tier 1 before any reach tier 2, etc.
    const easeSteps      = Math.max(0, Math.floor((stats.strength + weaponDamage) * (1 - monster.ac / 100)));
    const effectiveSteps = Math.min(easeSteps, count * maxTier);
    const fullRounds     = maxTier > 0 ? Math.floor(effectiveSteps / count) : 0;
    const remainder      = maxTier > 0 ? effectiveSteps % count : 0;

    const subPool = [];
    for (let i = 0; i < count; i++) {
      const rawDef = pushUpData.find(p => p.id === types[0]);
      if (!rawDef) continue;
      subPool.push({ ...rawDef });

      const tier     = Math.min(fullRounds + (i < remainder ? 1 : 0), maxTier);
      const easedDef = pushUpData.find(p => p.id === types[tier]) || rawDef;
      const entry    = { ...easedDef };
      if (tier > 0) entry._originalName = rawDef.name;
      easedPool.push(entry);
    }
    rawPool.push(...subPool);

    // Per-monster life drain rate after the buffer expires.
    // effectiveChance = monster.toHit/100 − playerAC/100, floored at MINIMAL_DAMAGE_CHANCE.
    const monsterDPS = Math.max(
      monster.toHit / 100 - playerAC / 100,
      C.MINIMAL_DAMAGE_CHANCE
    ) * monster.damage;

    monsterStats.push({ name: monster.name, easeSteps, dps: monsterDPS });
  }

  // MINIMAL_DAMAGE_PER_SECOND applied once per fight, not per monster
  const totalDPS = monsterStats.reduce((s, ms) => s + ms.dps, 0) + C.MINIMAL_DAMAGE_PER_SECOND;

  // ── Dexterity skip ────────────────────────────────────────────────────────
  const skipChance   = stats.dexterity * C.SKIP_CHANCE_PER_ONE_DEXTERITY;
  const finalPushUps = easedPool.filter(() => Math.random() >= skipChance);

  // Buffer = estimated time to complete all push-ups; life drains only after this.
  const buffer  = finalPushUps.length * C.SECONDS_PER_PUSH_UP + C.PUSH_UP_PREPARATION_TIME;
  const maxLife = getMaxLife(player);

  return {
    rawPool,
    easedPool,
    finalPushUps,
    buffer,
    maxLife,
    damagePerSecond: totalDPS,
    weaponDamage,
    skipChance,
    playerAC,
    monsterStats,   // each entry: { name, easeSteps, dps }
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

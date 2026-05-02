import { collectBonuses } from './items.js';

export function calcAC(player) {
  let ac = 0;
  for (const item of [player.equipment.armor, player.equipment.shield, player.equipment.helm]) {
    if (!item) continue;
    ac += (item.ac || 0) + (collectBonuses(item).ac || 0);
  }
  return ac;
}

export function calcToHit(player) {
  const weapon = player.equipment.weapon;
  const toHitBonus = (weapon?.bonusToHit) || 0;
  return 50 + Math.floor(player.stats.dexterity / 2) + toHitBonus + player.level;
}

export function calcReductionPoolRange(player) {
  const weapon = player.equipment.weapon;
  const str = player.stats.strength;
  if (!weapon) return `${str}`;
  return `${str + weapon.damage}`;
}

export function calcPushUpStats(history) {
  const won  = history.filter(e => e.fight_result === 'won');
  const lost = history.filter(e => e.fight_result === 'lost');
  const wonFights  = new Set(won.map(e => e.fight_id)).size;
  const lostFights = new Set(lost.map(e => e.fight_id)).size;
  return {
    totalPushUps: won.length,
    fightsWon:    wonFights,
    fightsLost:   lostFights,
  };
}

export function isPenaltyActive(penaltyUntil) {
  if (!penaltyUntil) return false;
  return new Date(penaltyUntil) > new Date();
}

export function penaltyRemaining(penaltyUntil) {
  if (!penaltyUntil) return null;
  const ms = new Date(penaltyUntil) - new Date();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

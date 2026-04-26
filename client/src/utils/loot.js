import { rollBetween, generateUID, createMagicItem } from './items.js';

// Drop table weights from GDD (must sum to 100)
const DROP_TABLE = [
  { result: 'nothing', weight: 40 },
  { result: 'gold',    weight: 30 },
  { result: 'normal',  weight: 20 },
  { result: 'magic',   weight:  7 },
  { result: 'unique',  weight:  3 },
];

function weightedPick(table) {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of table) {
    r -= entry.weight;
    if (r <= 0) return entry.result;
  }
  return table[table.length - 1].result;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildBasePool(itemsData) {
  return [
    ...itemsData.weapons,
    ...itemsData.shields,
    ...itemsData.helms,
    ...itemsData.armor,
    ...itemsData.potions,   // potions can drop from monsters per GDD
  ];
}

/**
 * Roll a loot drop for one monster kill.
 * Returns null (nothing dropped), a gold amount (number), or an item object.
 */
export function rollLoot(monster, itemsData) {
  const result = weightedPick(DROP_TABLE);

  if (result === 'nothing') return null;

  if (result === 'gold') {
    return {
      type: 'gold',
      amount: rollBetween(monster.gold_drop[0], monster.gold_drop[1]),
    };
  }

  const basePool = buildBasePool(itemsData);
  const base     = pickRandom(basePool);

  if (result === 'normal') {
    return {
      type: 'item',
      item: { ...base, uid: generateUID('loot'), quality: 'normal', identified: true },
    };
  }

  if (result === 'magic') {
    const affixKey   = base.slot === 'weapon' ? 'weapon' : 'armor';
    const availPre   = itemsData.prefixes[affixKey] || [];
    const availSuf   = itemsData.suffixes[affixKey] || [];
    const wantPre    = Math.random() < 0.6;
    const wantSuf    = Math.random() < 0.6;
    const prefix     = (wantPre || !wantSuf) && availPre.length ? pickRandom(availPre) : null;
    const suffix     = (wantSuf || !prefix)  && availSuf.length ? pickRandom(availSuf) : null;
    return {
      type: 'item',
      item: createMagicItem(base, prefix, suffix),
    };
  }

  if (result === 'unique') {
    // Phase 5: uniques are rare magic items with both affixes forced
    const affixKey = base.slot === 'weapon' ? 'weapon' : 'armor';
    const availPre = itemsData.prefixes[affixKey] || [];
    const availSuf = itemsData.suffixes[affixKey] || [];
    const prefix   = availPre.length ? pickRandom(availPre) : null;
    const suffix   = availSuf.length ? pickRandom(availSuf) : null;
    const item     = createMagicItem(base, prefix, suffix);
    item.quality   = 'unique';
    item.uid       = generateUID('unique');
    return { type: 'item', item };
  }

  return null;
}

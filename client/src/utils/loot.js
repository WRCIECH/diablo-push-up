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
    ...itemsData.potions,
  ];
}

function buildEquipmentPool(itemsData) {
  return [
    ...itemsData.weapons,
    ...itemsData.shields,
    ...itemsData.helms,
    ...itemsData.armor,
    ...(itemsData.rings     || []),
    ...(itemsData.talismans || []),
  ];
}

function affixKey(slot) {
  if (slot === 'weapon')   return 'weapon';
  if (slot === 'ring' || slot === 'talisman') return 'jewelry';
  return 'armor';
}

// Chest loot — better odds than monsters (Diablo 1 chest distribution)
const CHEST_DROP_TABLE = [
  { result: 'nothing', weight: 20 },
  { result: 'gold',    weight: 35 },
  { result: 'normal',  weight: 28 },
  { result: 'magic',   weight: 14 },
  { result: 'unique',  weight:  3 },
];

/**
 * Roll a loot drop for a dungeon chest.
 * Returns null, { type:'gold', amount } or { type:'item', item }.
 */
export function rollChestLoot(itemsData) {
  const result = weightedPick(CHEST_DROP_TABLE);
  if (result === 'nothing') return null;

  if (result === 'gold') {
    return { type: 'gold', amount: rollBetween(10, 80) };
  }

  if (result === 'normal') {
    const base = pickRandom(buildBasePool(itemsData));
    return { type: 'item', item: { ...base, uid: generateUID('chest'), quality: 'normal', identified: true } };
  }

  if (result === 'magic') {
    const base     = pickRandom(buildEquipmentPool(itemsData));
    const key = affixKey(base.slot);
    const availPre = itemsData.prefixes[key] || [];
    const availSuf = itemsData.suffixes[key] || [];
    const wantPre  = Math.random() < 0.6;
    const wantSuf  = Math.random() < 0.6;
    const prefix   = (wantPre || !wantSuf) && availPre.length ? pickRandom(availPre) : null;
    const suffix   = (wantSuf || !prefix)  && availSuf.length ? pickRandom(availSuf) : null;
    return { type: 'item', item: createMagicItem(base, prefix, suffix) };
  }

  if (result === 'unique') {
    const base     = pickRandom(buildEquipmentPool(itemsData));
    const key = affixKey(base.slot);
    const availPre = itemsData.prefixes[key] || [];
    const availSuf = itemsData.suffixes[key] || [];
    const prefix   = availPre.length ? pickRandom(availPre) : null;
    const suffix   = availSuf.length ? pickRandom(availSuf) : null;
    const item     = createMagicItem(base, prefix, suffix);
    item.quality   = 'unique';
    item.uid       = generateUID('chest-unique');
    return { type: 'item', item };
  }

  return null;
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

  if (result === 'normal') {
    const base = pickRandom(buildBasePool(itemsData));
    return {
      type: 'item',
      item: { ...base, uid: generateUID('loot'), quality: 'normal', identified: true },
    };
  }

  if (result === 'magic') {
    const base       = pickRandom(buildEquipmentPool(itemsData));
    const key = affixKey(base.slot);
    const availPre   = itemsData.prefixes[key] || [];
    const availSuf   = itemsData.suffixes[key] || [];
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
    const base      = pickRandom(buildEquipmentPool(itemsData));
    const key = affixKey(base.slot);
    const availPre = itemsData.prefixes[key] || [];
    const availSuf = itemsData.suffixes[key] || [];
    const prefix   = availPre.length ? pickRandom(availPre) : null;
    const suffix   = availSuf.length ? pickRandom(availSuf) : null;
    const item     = createMagicItem(base, prefix, suffix);
    item.quality   = 'unique';
    item.uid       = generateUID('unique');
    return { type: 'item', item };
  }

  return null;
}

let uidSeq = 0;

export function generateUID(prefix = 'item') {
  return `${prefix}_${Date.now()}_${uidSeq++}`;
}

export function rollBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollAffix(affix) {
  const bonus = affix.bonus;
  const result = {};
  const keys = Object.keys(bonus);
  for (const key of keys) {
    if (key.endsWith('_min')) continue;
    if (key.endsWith('_max')) {
      const base = key.slice(0, -4);
      result[base] = rollBetween(bonus[`${base}_min`], bonus[key]);
    } else {
      result[key] = bonus[key];
    }
  }
  return result;
}

export function createMagicItem(baseItem, prefixDef, suffixDef) {
  const item = { ...baseItem, uid: generateUID('magic'), quality: 'magic', identified: false };

  const nameParts = [];
  let priceMult = 1;

  if (prefixDef) {
    item.prefix = { id: prefixDef.id, name: prefixDef.name, rolled: rollAffix(prefixDef) };
    nameParts.push(prefixDef.name);
    priceMult *= prefixDef.price_mult;
  }

  nameParts.push(baseItem.name);

  if (suffixDef) {
    item.suffix = { id: suffixDef.id, name: suffixDef.name, rolled: rollAffix(suffixDef) };
    nameParts.push(suffixDef.name);
    priceMult *= suffixDef.price_mult;
  }

  item.magic_name = nameParts.join(' ');
  item.price = Math.round(baseItem.price * priceMult);
  item.sell_price = Math.round(item.price / 4);

  return item;
}

export function generateShopInventory(itemsData) {
  const { weapons, shields, helms, armor, prefixes, suffixes } = itemsData;

  const basePool = [
    ...weapons.map(i => ({ ...i })),
    ...shields.map(i => ({ ...i })),
    ...helms.map(i => ({ ...i })),
    ...armor.map(i => ({ ...i })),
  ];

  const normalCount = rollBetween(10, 19);
  const normalItems = Array.from({ length: normalCount }, () => ({
    ...pickRandom(basePool),
    uid: generateUID('shop'),
    quality: 'normal',
    identified: true,
  }));

  const magicItems = Array.from({ length: 6 }, () => {
    const base = pickRandom(basePool);
    const affixKey = base.slot === 'weapon' ? 'weapon' : 'armor';
    const availPre = prefixes[affixKey] || [];
    const availSuf = suffixes[affixKey] || [];

    const wantPre = Math.random() < 0.6;
    const wantSuf = Math.random() < 0.6;
    const prefix = (wantPre || !wantSuf) && availPre.length ? pickRandom(availPre) : null;
    const suffix = (wantSuf || !prefix)  && availSuf.length ? pickRandom(availSuf) : null;

    return createMagicItem(base, prefix, suffix);
  });

  return [...normalItems, ...magicItems];
}

export function resolveItemName(item) {
  if (item.quality === 'magic' && !item.identified) return `Unidentified ${item.name}`;
  if (item.quality === 'magic' && item.identified) return item.magic_name || item.name;
  return item.name;
}

export function qualityColor(quality) {
  if (quality === 'magic')  return 'var(--blue-text)';
  if (quality === 'unique') return 'var(--text-gold-bright)';
  return 'var(--text-cream)';
}

export function getItemStatLine(item) {
  if (item.damage) return `DMG ${item.damage[0]}–${item.damage[1]}`;
  if (item.ac !== undefined) return `AC ${item.ac}`;
  if (item.type === 'healing') return `+${30} seconds in fight`;
  return '';
}

// ── Monster variant rolling ───────────────────────────────────────────────────

// 1% boss, 9% strong, 90% normal. Butcher is always called directly, not through this.
function pickVariant(baseName) {
  const r = Math.random();
  if (r < 0.01) return `${baseName} Boss`;
  if (r < 0.10) return `Stronger ${baseName}`;
  return baseName;
}

// Resolve a stored variant name back into a full monster object with multipliers applied.
export function resolveMonster(variantName, monstersData) {
  let variant = 'normal';
  let baseName = variantName;
  if (variantName.startsWith('Stronger '))  { variant = 'strong'; baseName = variantName.slice(9); }
  else if (variantName.endsWith(' Boss'))   { variant = 'boss';   baseName = variantName.slice(0, -5); }

  const base = monstersData.find(m => m.name === baseName);
  if (!base) return null;

  const displayName = variant === 'strong' ? `Stronger ${base.name}`
                    : variant === 'boss'   ? `${base.name} Boss`
                    : base.name;

  if (variant === 'normal') return { ...base, variant: 'normal', displayName: base.name };

  if (variant === 'strong') return {
    ...base, variant: 'strong', displayName,
    vitality:  Math.round(base.vitality  * 1.5),
    exp:       Math.round(base.exp       * 1.5),
    gold_drop: [Math.round(base.gold_drop[0] * 1.5), Math.round(base.gold_drop[1] * 1.5)],
  };

  // boss
  return {
    ...base, variant: 'boss', displayName,
    vitality: Math.round(base.vitality * 2),
    damage:   Math.round(base.damage   * 1.5),
    exp:      Math.round(base.exp      * 2.5),
  };
}

// ── Weighted random pick from pool ───────────────────────────────────────────

function weightedPick(pool) {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry;
  }
  return pool[pool.length - 1];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main dungeon generator ────────────────────────────────────────────────────

export function generateDungeon(levelId, locationsData) {
  const levelDef = locationsData.levels.find(l => l.id === levelId);
  const { depth, place_pool, intro_texts } = levelDef;

  let counter = 0;
  let levelPlaced   = false;  // exactly one staircase down per dungeon
  let butcherPlaced = false;  // The Butcher appears at most once
  const nodes = {};
  const chestEntry = place_pool.find(p => p.type === 'chest') ?? place_pool[0];

  function makeNode(parentId, currentDepth) {
    const id = String(counter++);
    const isRoot = parentId === null;

    let node;
    if (isRoot) {
      // Root = the staircase you entered from.
      // Level 1: stairs up go back to Tristram. Level 2+: stairs up go to the previous level.
      // The levelUpConfirm in DungeonScreen already handles both cases correctly.
      node = {
        id, depth: 0, type: 'level_up',
        parentId: null, childrenIds: [],
        visited: false, defeated: false,
      };
    } else {
      let place = weightedPick(place_pool);
      // Enforce exactly one staircase down per dungeon
      if (place.type === 'level') {
        if (levelPlaced) place = chestEntry;
        else levelPlaced = true;
      }
      if (place.type === 'butcher') {
        if (butcherPlaced) place = chestEntry;
        else butcherPlaced = true;
      }

      // Build monster list for fight / butcher nodes
      const monsters = [];
      if (place.type === 'fight') {
        monsters.push(pickVariant(place.monster));
        const addProb = levelDef.additional_enemy_probability ?? 0;
        while (Math.random() < addProb) {
          monsters.push(pickVariant(place.monster));
        }
      }
      if (place.type === 'butcher') {
        monsters.push('The Butcher'); // always solo, never a variant
      }

      // Butcher uses fight node type so the map renders it as a normal fight room
      const nodeType = place.type === 'butcher' ? 'fight' : place.type;

      node = {
        id,
        depth:       currentDepth,
        type:        nodeType,
        monsters,
        targetLevel: place.target_level || null,
        parentId,
        childrenIds: [],
        visited:  false,
        defeated: false,
      };
    }

    nodes[id] = node;

    if (currentDepth < depth) {
      for (let i = 0; i < 3; i++) {
        const childId = makeNode(id, currentDepth + 1);
        node.childrenIds.push(childId);
      }
    }

    return id;
  }

  const rootId = makeNode(null, 0);

  return {
    levelId,
    levelName: levelDef.name,
    introText:  pickRandom(intro_texts),
    introShown: false,
    nodes,
    rootId,
    currentNodeId: rootId,
  };
}

// ── Description helpers (deterministic by node id) ───────────────────────────

/** Returns the monsters array for a node, handling both new and old save formats. */
export function getMonsters(node) {
  if (node.monsters?.length) return node.monsters;
  if (node.monster) return [node.monster]; // backward compat with old saves
  return [];
}

export function getChildDescription(child, levelDef) {
  const monsters = getMonsters(child);
  if (child.type === 'fight' && child.defeated) {
    const names = monsters.length ? monsters.join(' & ') : 'a creature';
    return `Remains of ${names}. Passage clear.`;
  }
  if (child.type === 'fight') {
    const base = levelDef.descriptions.visible[monsters[0]] || 'A creature stirs ahead.';
    return monsters.length > 1 ? `${base} Others lurk nearby.` : base;
  }
  if (child.type === 'chest')    return levelDef.descriptions.visible.chest    || 'An old chest sits here.';
  if (child.type === 'level')    return levelDef.descriptions.visible.level    || 'Stairs descend further.';
  if (child.type === 'level_up') return levelDef.descriptions.visible.level_up || 'Stairs lead upward.';
  return 'A passage continues forward.';
}

export function getArrivalMessage(node) {
  if (node.type === 'chest' && node.chestLooted) return 'The chest has already been looted. Nothing remains.';
  if (node.type === 'chest') return 'An old chest sits here, waiting to be opened.';
  if (node.type === 'fight' && node.defeated) {
    const monsters = getMonsters(node);
    if (monsters[0] === 'The Butcher')
      return 'The Butcher lies slain. His cleaver is silent. The stench of blood lingers.';
    const names = monsters.length > 1 ? `${monsters[0]} and company` : monsters[0];
    return `${names} ${monsters.length > 1 ? 'have' : 'has'} been slain. The chamber falls silent.`;
  }
  if (node.type === 'level')    return 'Stone steps descend into deeper darkness. The cold rises from below.';
  if (node.type === 'level_up') return 'Ancient stairs wind upward. You could ascend from here.';
  return null;
}

export function getLevelDef(levelId, locationsData) {
  return locationsData?.levels.find(l => l.id === levelId);
}

// Depth → atmospheric label
export function depthLabel(depth) {
  const labels = ['Entrance', 'Outer Crypts', 'Inner Crypts', 'Deep Crypts', 'Deepest Crypts'];
  return labels[Math.min(depth, labels.length - 1)];
}

// Icon for a dungeon node based on type and state
export function nodeIcon(node) {
  if (node.type === 'fight')    return node.defeated ? '✓' : '⚔';
  if (node.type === 'level')    return '↓';
  if (node.type === 'level_up') return '↑';
  if (node.type === 'chest')    return '·';
  return '·';
}

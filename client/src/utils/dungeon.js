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
  let levelPlaced = false;   // only one level-transition per dungeon
  const nodes = {};
  const nothingEntry = place_pool.find(p => p.type === 'nothing') ?? place_pool[0];

  function makeNode(parentId, currentDepth) {
    const id = String(counter++);
    const isRoot = parentId === null;

    let node;
    if (isRoot) {
      node = {
        id, depth: 0, type: 'entrance',
        parentId: null, childrenIds: [],
        visited: false, defeated: false,
      };
    } else {
      let place = weightedPick(place_pool);
      // Enforce a single level-transition node in the whole dungeon
      if (place.type === 'level') {
        if (levelPlaced) place = nothingEntry;
        else levelPlaced = true;
      }
      const cryptic = Math.random() < (place.cryptic_chance ?? 0.5);
      node = {
        id,
        depth:       currentDepth,
        type:        place.type,
        monster:     place.monster      || null,
        targetLevel: place.target_level || null,
        cryptic,
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

export function getChildDescription(child, levelDef) {
  if (child.type === 'fight' && child.defeated) {
    return `Remains of ${child.monster || 'a creature'}. Passage clear.`;
  }
  if (child.cryptic) {
    const pool = levelDef.descriptions.cryptic[child.type] || ['A passage leads onward.'];
    return pool[parseInt(child.id, 10) % pool.length];
  }
  if (child.type === 'fight')   return levelDef.descriptions.visible[child.monster]  || 'A creature stirs ahead.';
  if (child.type === 'nothing') return levelDef.descriptions.visible.nothing;
  if (child.type === 'level')   return levelDef.descriptions.visible.level;
  return 'A passage continues forward.';
}

export function getArrivalMessage(node) {
  if (node.type === 'nothing')  return 'Nothing of value here. Your torch casts long shadows on the stone walls.';
  if (node.type === 'fight' && node.defeated) return `The ${node.monster} has been slain. The chamber falls silent.`;
  if (node.type === 'level')    return 'Stone steps descend into deeper darkness. The cold rises from below.';
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
  if (node.type === 'fight')   return node.defeated ? '✓' : '⚔';
  if (node.type === 'level')   return '↓';
  if (node.type === 'nothing') return '·';
  if (node.cryptic)            return '?';
  return '·';
}

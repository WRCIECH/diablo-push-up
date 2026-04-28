import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { loadState, saveState, loadGameData } from '../api.js';
import { generateShopInventory } from '../utils/items.js';
import { initConstants } from '../utils/combat.js';

// ── Class templates ──────────────────────────────────────────────────────────

export const CLASS_TEMPLATES = {
  warrior: {
    class: 'warrior',
    level: 1, exp: 0, statPoints: 0,
    stats: { strength: 30, dexterity: 20, vitality: 25, life: 70, maxLife: 70 },
    maxStats: { strength: 250, dexterity: 60, vitality: 100 },
    lifePerLevel: 2,
    equipment: {
      weapon: { id: 'short_sword', name: 'Short Sword', slot: 'weapon', damage: [2, 6], reqStr: 18, reqDex: 0, price: 120, sell_price: 30, quality: 'normal', identified: true },
      armor: null, helm: null,
      shield: { id: 'buckler', name: 'Buckler', slot: 'shield', ac: 3, reqStr: 0, price: 50, sell_price: 12, quality: 'normal', identified: true },
    },
    inventory: [
      { id: 'club', name: 'Club', slot: 'weapon', damage: [1, 6], reqStr: 0, reqDex: 0, price: 20, sell_price: 5, quality: 'normal', identified: true, uid: 'inv_0' },
      { id: 'healing_potion', name: 'Healing Potion', slot: 'potion', type: 'healing', heal: 'partial', price: 50, sell_price: 12, quality: 'normal', identified: true, uid: 'inv_1' },
      { id: 'healing_potion', name: 'Healing Potion', slot: 'potion', type: 'healing', heal: 'partial', price: 50, sell_price: 12, quality: 'normal', identified: true, uid: 'inv_2' },
    ],
    gold: 100,
  },
  rogue: {
    class: 'rogue',
    level: 1, exp: 0, statPoints: 0,
    stats: { strength: 20, dexterity: 30, vitality: 20, life: 45, maxLife: 45 },
    maxStats: { strength: 55, dexterity: 250, vitality: 80 },
    lifePerLevel: 2,
    equipment: {
      weapon: { id: 'short_bow', name: 'Short Bow', slot: 'weapon', damage: [1, 4], reqStr: 25, reqDex: 30, price: 100, sell_price: 25, quality: 'normal', identified: true },
      armor: null, helm: null, shield: null,
    },
    inventory: [
      { id: 'healing_potion', name: 'Healing Potion', slot: 'potion', type: 'healing', heal: 'partial', price: 50, sell_price: 12, quality: 'normal', identified: true, uid: 'inv_0' },
      { id: 'healing_potion', name: 'Healing Potion', slot: 'potion', type: 'healing', heal: 'partial', price: 50, sell_price: 12, quality: 'normal', identified: true, uid: 'inv_1' },
    ],
    gold: 100,
  },
};

export const EXP_TABLE = [0, 2000, 4620, 6440, 8360, 10700, 13600, 17100, 21400, 26800, 33400, 41600, 51800, 64200, 79400, 98200, 121000, 149000, 183600, 225600];

export const INITIAL_GAMESTATE = {
  player: null,
  currentLocation: 'tristram',
  currentLevel: null,
  dungeon: null,
  defeatedMonsters: [],
  penaltyUntil: null,
  history: [],
};

// ── Reducer ──────────────────────────────────────────────────────────────────

export function reducer(state, action) {
  switch (action.type) {

    case 'LOAD':
      return action.payload;

    case 'SET_LOCATION':
      return { ...state, currentLocation: action.payload };

    case 'SET_DUNGEON':
      return { ...state, dungeon: action.payload, currentLocation: 'dungeon' };

    case 'SET_DUNGEON_NODE':
      return { ...state, dungeon: { ...state.dungeon, currentNodeId: action.payload } };

    case 'DEFEAT_MONSTER': {
      const nodes = { ...state.dungeon.nodes, [action.payload]: { ...state.dungeon.nodes[action.payload], defeated: true } };
      return { ...state, dungeon: { ...state.dungeon, nodes }, defeatedMonsters: [...state.defeatedMonsters, action.payload] };
    }

    case 'RESET_DUNGEON': {
      const nodes = {};
      for (const [id, node] of Object.entries(state.dungeon.nodes)) {
        nodes[id] = { ...node, defeated: false };
      }
      return { ...state, dungeon: { ...state.dungeon, nodes, currentNodeId: state.dungeon.rootId }, defeatedMonsters: [], currentLocation: 'dungeon' };
    }

    case 'SET_PENALTY':
      return { ...state, penaltyUntil: action.payload };

    case 'GAIN_EXP': {
      const player = { ...state.player, stats: { ...state.player.stats } };
      player.exp += action.payload;
      while (player.level < 20 && player.exp >= EXP_TABLE[player.level]) {
        player.exp -= EXP_TABLE[player.level];
        player.level += 1;
        player.statPoints = (player.statPoints || 0) + 5;
        player.stats.maxLife += player.lifePerLevel;
        player.stats.life = player.stats.maxLife;
      }
      return { ...state, player };
    }

    case 'ALLOCATE_STAT': {
      const { stat } = action.payload;
      if ((state.player.statPoints || 0) <= 0) return state;
      const maxVal = state.player.maxStats[stat];
      if (maxVal !== undefined && state.player.stats[stat] >= maxVal) return state;
      const stats = { ...state.player.stats, [stat]: state.player.stats[stat] + 1 };
      if (stat === 'vitality') {
        stats.maxLife += state.player.lifePerLevel;
        stats.life = Math.min(stats.life + state.player.lifePerLevel, stats.maxLife);
      }
      return { ...state, player: { ...state.player, stats, statPoints: state.player.statPoints - 1 } };
    }

    case 'ADD_GOLD':
      return { ...state, player: { ...state.player, gold: state.player.gold + action.payload } };

    case 'SPEND_GOLD':
      return { ...state, player: { ...state.player, gold: Math.max(0, state.player.gold - action.payload) } };

    case 'ADD_ITEM':
      return { ...state, player: { ...state.player, inventory: [...state.player.inventory, action.payload] } };

    case 'REMOVE_ITEM':
      return { ...state, player: { ...state.player, inventory: state.player.inventory.filter(i => i.uid !== action.payload) } };

    case 'EQUIP_ITEM': {
      const item = action.payload;
      const old = state.player.equipment[item.slot];
      const inv = state.player.inventory.filter(i => i.uid !== item.uid);
      if (old) inv.push({ ...old, uid: `inv_${Date.now()}` });
      return { ...state, player: { ...state.player, equipment: { ...state.player.equipment, [item.slot]: item }, inventory: inv } };
    }

    case 'IDENTIFY_ITEM': {
      const uid = action.payload;
      const inv = state.player.inventory.map(i => i.uid === uid ? { ...i, identified: true } : i);
      return { ...state, player: { ...state.player, inventory: inv } };
    }

    case 'UNEQUIP_SLOT': {
      const slot = action.payload;
      const item = state.player.equipment[slot];
      if (!item) return state;
      return {
        ...state,
        player: {
          ...state.player,
          equipment: { ...state.player.equipment, [slot]: null },
          inventory: [...state.player.inventory, { ...item, uid: `inv_${Date.now()}` }],
        },
      };
    }

    case 'USE_POTION': {
      const potion = state.player.inventory.find(i => i.uid === action.payload);
      if (!potion) return state;
      const heal = potion.heal === 'full'
        ? state.player.stats.maxLife
        : Math.ceil(state.player.stats.maxLife / 2);
      return {
        ...state,
        player: {
          ...state.player,
          inventory: state.player.inventory.filter(i => i.uid !== action.payload),
          stats: { ...state.player.stats, life: Math.min(state.player.stats.maxLife, state.player.stats.life + heal) },
        },
      };
    }

    case 'DAMAGE_PLAYER': {
      const newLife = Math.max(1, state.player.stats.life - action.payload);
      return { ...state, player: { ...state.player, stats: { ...state.player.stats, life: newLife } } };
    }

    case 'HEAL_FULL':
      return { ...state, player: { ...state.player, stats: { ...state.player.stats, life: state.player.stats.maxLife } } };

    case 'ADD_HISTORY':
      return { ...state, history: [...state.history, action.payload] };

    // ── Dungeon navigation ─────────────────────────────────────────────────

    case 'NAVIGATE_TO_NODE': {
      const { nodeId } = action.payload;
      const nodes = { ...state.dungeon.nodes };
      if (!nodes[nodeId].visited) {
        nodes[nodeId] = { ...nodes[nodeId], visited: true };
      }
      return { ...state, dungeon: { ...state.dungeon, nodes, currentNodeId: nodeId } };
    }

    case 'DUNGEON_INTRO_SHOWN':
      return { ...state, dungeon: { ...state.dungeon, introShown: true } };

    case 'MARK_CHEST_LOOTED': {
      const nodeId = action.payload;
      const nodes  = { ...state.dungeon.nodes, [nodeId]: { ...state.dungeon.nodes[nodeId], chestLooted: true } };
      return { ...state, dungeon: { ...state.dungeon, nodes } };
    }

    case 'LEAVE_DUNGEON':
      return { ...state, currentLocation: 'tristram' };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch]       = useReducer(reducer, INITIAL_GAMESTATE);
  const stateRef                = useRef(state);
  const [screen, setScreen]     = useState('loading');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [gameData, setGameData] = useState(null);
  const [shopInventory, setShopInventory] = useState(null);
  const [lootResult,   setLootResult]    = useState(null);  // set by FightPreScreen, read by LootScreen
  const initializedRef          = useRef(false);

  // Keep stateRef in sync for dispatchAndSave
  useEffect(() => { stateRef.current = state; });

  // Load game state + static data on mount
  useEffect(() => {
    Promise.all([
      loadState(),
      loadGameData('items'),
      loadGameData('monsters'),
      loadGameData('push_ups'),
      loadGameData('locations'),
      loadGameData('constants'),
    ])
      .then(([stateResult, items, monsters, pushUps, locations, constants]) => {
        initConstants(constants);
        setGameData({ items, monsters, pushUps, locations });
        initializedRef.current = true;
        if (stateResult.exists && stateResult.state?.player) {
          dispatch({ type: 'LOAD', payload: stateResult.state });
          const savedLocation = stateResult.state.currentLocation;
          if (savedLocation === 'dungeon' && stateResult.state.dungeon) {
            setScreen('dungeon');
          } else {
            setScreen('tristram');
          }
        } else {
          setScreen('character_select');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Dispatch an action AND immediately persist the resulting state (no timing issues)
  const dispatchAndSave = useCallback((action) => {
    const next = reducer(stateRef.current, action);
    stateRef.current = next;
    dispatch(action);
    if (next.player) saveState(next).catch(console.error);
  }, []);

  // Regenerate Griswold's shop inventory
  const generateShop = useCallback(() => {
    if (gameData?.items) setShopInventory(generateShopInventory(gameData.items));
  }, [gameData]);

  return (
    <GameContext.Provider value={{
      state, dispatch, dispatchAndSave,
      screen, setScreen,
      loading, error,
      gameData,
      shopInventory, generateShop, setShopInventory,
      lootResult, setLootResult,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

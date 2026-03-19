/**
 * worlds.js — World definitions and rules system
 * World objects are STATIC CONFIG — never mutated at runtime.
 * All runtime state lives in Player.
 */

// ===== Player defaults (defined here so worlds.js is loaded first) =====
const HeroDefaults = () => ({
  name: 'Reality Warrior',
  hp: 100,
  maxHp: 100,
  attackBase: 10,
  defense: 5,
  critChance: 0.15,
  critMultiplier: 2.0,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
});

const CombatDefaults = () => ({
  active: false,
  waveNumber: 1,
  maxWave: 1,
  currentEnemy: null,
  battleLog: [],
  autoBattleEnabled: true,
  ticksSinceLastAttack: 0,
  attackIntervalTicks: 2, // recalculated from active world on apply
});

// The single source of truth for all game state
const Player = {
  saveVersion: 1,
  realityShards: 0,
  totalPrestiges: 0,
  gems: 0,
  gold: 0,
  lastSaveTime: Date.now(),
  lastTickTime: Date.now(),
  goldPerTick: 1,
  shardBonusMultiplier: 1.0,
  unlockedWorlds: ['fire', 'void'],
  activeWorldId: 'fire',
  fusedWorlds: [],
  hero: HeroDefaults(),
  combat: CombatDefaults(),
};

// ===== World Registry =====
const WORLDS = {
  fire: {
    id: 'fire',
    name: 'Fire World',
    description: 'Blazing fury — +300% damage bonus to all attacks.',
    color: '#ff4500',
    icon: '🔥',
    rules: {
      damageMultiplier: 4.0,
      speedMultiplier: 1.0,   // normal speed → attackIntervalTicks = 2
      critAllowed: true,
      idleGoldMultiplier: 1.5,
    },
    fusesWith: ['void'],
    fusionResult: 'toxic_inferno',
    requiresPrestigeCount: 0,
  },

  void: {
    id: 'void',
    name: 'Void World',
    description: 'Relentless tempo — no crits, but attacks twice as fast.',
    color: '#6366f1',
    icon: '🌀',
    rules: {
      damageMultiplier: 1.0,
      speedMultiplier: 0.5,   // fast → attackIntervalTicks = 1
      critAllowed: false,
      idleGoldMultiplier: 2.0,
    },
    fusesWith: ['fire'],
    fusionResult: 'toxic_inferno',
    requiresPrestigeCount: 0,
  },

  toxic_inferno: {
    id: 'toxic_inferno',
    name: 'Toxic Inferno',
    description: "Fire's wrath meets Void's tempo. Max damage. Max speed. No crits.",
    color: '#8b00ff',
    icon: '☠️',
    rules: {
      damageMultiplier: 4.0,
      speedMultiplier: 0.5,
      critAllowed: false,
      idleGoldMultiplier: 3.0,
    },
    fusesWith: [],
    fusionResult: null,
    requiresPrestigeCount: 0,
  },
};

// ===== WorldSystem =====
const WorldSystem = (() => {

  function getWorldDef(id) {
    return WORLDS[id] || null;
  }

  function getAllWorldDefs() {
    return Object.values(WORLDS);
  }

  function getUnlockedWorlds() {
    const all = [...Player.unlockedWorlds, ...Player.fusedWorlds];
    return all.map(id => WORLDS[id]).filter(Boolean);
  }

  function setActiveWorld(id) {
    if (!WORLDS[id]) return;
    Player.activeWorldId = id;
    applyActiveWorldRules();
    // World switch resets current combat wave (but not maxWave)
    Player.combat.active = false;
    Player.combat.currentEnemy = null;
    Player.combat.waveNumber = 1;
    Player.combat.ticksSinceLastAttack = 0;
    IdleEngine.recalculateGoldPerTick();
    UI.renderAll();
  }

  function applyActiveWorldRules() {
    const world = WORLDS[Player.activeWorldId];
    if (!world) return;

    // Speed: speedMultiplier 0.5 → twice as fast → attackIntervalTicks = 1
    //        speedMultiplier 1.0 → normal         → attackIntervalTicks = 2
    Player.combat.attackIntervalTicks = world.rules.speedMultiplier <= 0.5 ? 1 : 2;

    // Update CSS theme variable
    document.documentElement.style.setProperty('--world-color', world.color);
    document.documentElement.style.setProperty('--world-color-dim', hexToRgba(world.color, 0.15));
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { getWorldDef, getAllWorldDefs, getUnlockedWorlds, setActiveWorld, applyActiveWorldRules };
})();

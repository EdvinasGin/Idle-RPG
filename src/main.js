/**
 * main.js — Entry point and game loop
 * Single setInterval at 1000ms. World speed implemented via attackIntervalTicks.
 * Tab visibility: pause DOM-heavy updates when hidden, catch up on restore.
 */

const TICK_INTERVAL_MS = 1000;
const AUTO_SAVE_INTERVAL_MS = 30_000;
const OFFLINE_THRESHOLD_MS = 5_000; // show modal if away > 5s

let _gameLoopId   = null;
let _autoSaveId   = null;
let _tabHidden    = false;
let _hiddenSince  = null;

function gameTick() {
  if (_tabHidden) return; // let visibilitychange handle catch-up

  IdleEngine.tick();
  CombatSystem.tick();
  UI.renderTick();
  Player.lastTickTime = Date.now();
}

function bootstrap() {
  const hasSave = SaveSystem.load();

  if (hasSave) {
    // Clamp offline delta (guard against clock skew)
    const offlineDelta = Math.max(0, Date.now() - Player.lastTickTime);

    if (offlineDelta > OFFLINE_THRESHOLD_MS) {
      // Recompute derived state before crediting offline gold
      IdleEngine.recalculateGoldPerTick();
      const result = IdleEngine.computeOfflineProgress(offlineDelta);
      // Show modal after full render
      setTimeout(() => UI.showOfflineModal(result), 200);
    }
  }

  // Bake active world rules into combat state
  WorldSystem.applyActiveWorldRules();

  // Recompute shard bonus in case shards were earned before last save
  Player.shardBonusMultiplier = PrestigeSystem.calcShardBonus(Player.realityShards);
  IdleEngine.recalculateGoldPerTick();

  // Render initial state
  UI.bindEvents();
  UI.renderAll();

  // Start game loop (single interval, never recreated)
  _gameLoopId  = setInterval(gameTick, TICK_INTERVAL_MS);
  _autoSaveId  = setInterval(SaveSystem.save, AUTO_SAVE_INTERVAL_MS);

  Player.lastTickTime = Date.now();

  // Tab visibility handling
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

function _onVisibilityChange() {
  if (document.hidden) {
    _tabHidden = true;
    _hiddenSince = Date.now();
  } else {
    _tabHidden = false;
    if (_hiddenSince !== null) {
      const hiddenMs = Math.max(0, Date.now() - _hiddenSince);
      _hiddenSince = null;

      if (hiddenMs > OFFLINE_THRESHOLD_MS) {
        // Compute catch-up gold for time hidden
        const result = IdleEngine.computeOfflineProgress(hiddenMs);
        if (result.goldEarned > 0) {
          UI.showOfflineModal(result);
        }
      }

      Player.lastTickTime = Date.now();
      UI.renderTick();
    }
  }
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', bootstrap);

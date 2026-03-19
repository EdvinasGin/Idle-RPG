/**
 * idle.js — Resource generation and offline progress
 */

const IdleEngine = (() => {

  const OFFLINE_EFFICIENCY = 0.7;
  const MAX_OFFLINE_MS = 8 * 3600 * 1000; // 8 hours

  function recalculateGoldPerTick() {
    // Base is 1; future upgrades can modify Player.goldPerTick before calling this
    // For MVP, goldPerTick stays 1 as the base unit
    Player.goldPerTick = 1;
  }

  function _effectiveGoldPerTick() {
    const world = WORLDS[Player.activeWorldId];
    const idleMult = world ? world.rules.idleGoldMultiplier : 1;
    return Player.goldPerTick * idleMult * Player.shardBonusMultiplier;
  }

  function tick() {
    Player.gold += _effectiveGoldPerTick();
  }

  function computeOfflineProgress(deltaMs) {
    const effectiveDelta = Math.min(Math.max(0, deltaMs), MAX_OFFLINE_MS);
    const wasCapped = deltaMs > MAX_OFFLINE_MS;
    const ticks = Math.floor(effectiveDelta / 1000);

    const world = WORLDS[Player.activeWorldId];
    const idleMult = world ? world.rules.idleGoldMultiplier : 1;
    const effectiveRate = Player.goldPerTick * idleMult * Player.shardBonusMultiplier * OFFLINE_EFFICIENCY;

    const goldEarned = Math.floor(ticks * effectiveRate);
    Player.gold += goldEarned;

    return {
      elapsedMs: effectiveDelta,
      goldEarned,
      cappedAt: 8,
      wasCapped,
    };
  }

  return { tick, recalculateGoldPerTick, computeOfflineProgress };
})();

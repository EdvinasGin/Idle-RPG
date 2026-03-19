/**
 * prestige.js — Prestige / reset system
 * KEEP: realityShards, totalPrestiges, gems, unlockedWorlds, fusedWorlds
 * RESET: gold, hero, combat, activeWorldId, goldPerTick
 */

const PrestigeSystem = (() => {

  const MIN_WAVE_GATE = 10;

  function canPrestige() {
    return Player.combat.maxWave >= MIN_WAVE_GATE;
  }

  function calcShardsEarned() {
    const waveFactor = Math.floor(Math.sqrt(Player.combat.maxWave));
    const goldFactor = Math.floor(Math.log10(Math.max(Player.gold + 1, 10)));
    const prestigeBonus = 1 + Player.totalPrestiges * 0.1;
    return Math.max(1, Math.floor((waveFactor + goldFactor) * prestigeBonus));
  }

  function calcShardBonus(shards) {
    if (shards === 0) return 1.0;
    return 1 + 0.02 * shards * Math.log(shards + 1);
  }

  function doPrestige() {
    if (!canPrestige()) return false;
    // Prevent prestige while actively fighting
    if (Player.combat.active && Player.combat.currentEnemy) return false;

    const shardsEarned = calcShardsEarned();
    Player.realityShards += shardsEarned;
    Player.totalPrestiges++;
    Player.shardBonusMultiplier = calcShardBonus(Player.realityShards);

    // Reset run-scoped state
    Player.gold = 0;
    Player.hero = HeroDefaults();
    Player.combat = CombatDefaults();
    Player.activeWorldId = 'fire';

    // Re-apply world rules for fire world (default after prestige)
    WorldSystem.applyActiveWorldRules();
    IdleEngine.recalculateGoldPerTick();

    UI.renderAll();
    return true;
  }

  return { canPrestige, calcShardsEarned, calcShardBonus, doPrestige };
})();

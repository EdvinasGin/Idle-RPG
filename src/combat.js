/**
 * combat.js — Auto-battle system
 * Hero attacks every attackIntervalTicks ticks. Attacker advantage: hero resolves first.
 */

const CombatSystem = (() => {

  const BASE_HP      = 50;
  const BASE_ATTACK  = 5;
  const BASE_DEFENSE = 1;
  const BASE_GOLD    = 10;
  const BASE_XP      = 10;
  const BATTLE_LOG_CAP = 50;

  // ===== Enemy Generation =====

  function generateEnemy(waveNumber) {
    const w = waveNumber;
    return {
      name: _enemyName(waveNumber),
      hp: Math.floor(BASE_HP * Math.pow(1.15, w)),
      maxHp: Math.floor(BASE_HP * Math.pow(1.15, w)),
      attackBase: Math.floor(BASE_ATTACK * Math.pow(1.10, w)),
      defense: Math.floor(BASE_DEFENSE * Math.pow(1.05, w)),
      goldReward: Math.floor(BASE_GOLD * Math.pow(1.12, w)),
      xpReward: Math.floor(BASE_XP * Math.pow(1.10, w)),
      waveNumber: w,
    };
  }

  function _enemyName(wave) {
    const names = [
      'Ember Wraith','Void Shade','Chrono Stalker','Rift Beast','Infernal Drake',
      'Null Specter','Chaos Golem','Temporal Fiend','Astral Horror','Reality Eater',
    ];
    return names[(wave - 1) % names.length] + ` #${Math.ceil(wave / names.length)}`;
  }

  // ===== Damage Calculation =====

  function calcHeroDamage() {
    const h = Player.hero;
    const world = WORLDS[Player.activeWorldId];
    const enemy = Player.combat.currentEnemy;

    const rawBase = Math.max(1, h.attackBase - enemy.defense);
    const scaled = rawBase * world.rules.damageMultiplier;

    const critAllowed = world.rules.critAllowed;
    const isCrit = critAllowed && Math.random() < h.critChance;
    const finalDamage = Math.floor(isCrit ? scaled * h.critMultiplier : scaled);

    return { damage: finalDamage, isCrit };
  }

  function calcEnemyDamage() {
    const h = Player.hero;
    const enemy = Player.combat.currentEnemy;
    return Math.floor(Math.max(1, enemy.attackBase - h.defense));
  }

  // ===== Wave Management =====

  function spawnWave(waveNumber) {
    Player.combat.waveNumber = waveNumber;
    Player.combat.maxWave = Math.max(Player.combat.maxWave, waveNumber);
    Player.combat.currentEnemy = generateEnemy(waveNumber);
    Player.combat.ticksSinceLastAttack = 0;
    _log(`Wave ${waveNumber}: ${Player.combat.currentEnemy.name} appears!`, 'system');
  }

  function startBattle() {
    if (Player.combat.active) return;
    Player.combat.active = true;
    if (!Player.combat.currentEnemy) {
      spawnWave(Player.combat.waveNumber);
    }
    _log('Battle started!', 'system');
    UI.renderCombatPanel();
  }

  function setAutoBattle(enabled) {
    Player.combat.autoBattleEnabled = enabled;
    UI.renderCombatPanel();
  }

  // ===== Tick =====

  function tick() {
    const c = Player.combat;
    if (!c.active || !c.autoBattleEnabled || !c.currentEnemy) return;

    c.ticksSinceLastAttack++;
    if (c.ticksSinceLastAttack < c.attackIntervalTicks) return;
    c.ticksSinceLastAttack = 0;

    // Hero attacks first (attacker advantage)
    const { damage: heroDmg, isCrit } = calcHeroDamage();
    c.currentEnemy.hp -= heroDmg;

    if (isCrit) {
      _log(`⚡ CRIT! Hero strikes for ${heroDmg}!`, 'crit');
    } else {
      _log(`Hero attacks for ${heroDmg}.`, 'hero');
    }

    if (c.currentEnemy.hp <= 0) {
      c.currentEnemy.hp = 0;
      onEnemyDefeated();
      return; // no counterattack if enemy is dead
    }

    // Enemy counterattack
    const enemyDmg = calcEnemyDamage();
    Player.hero.hp -= enemyDmg;
    _log(`${c.currentEnemy.name} hits for ${enemyDmg}.`, 'enemy');

    if (Player.hero.hp <= 0) {
      Player.hero.hp = 0;
      onHeroDefeated();
    }
  }

  function onEnemyDefeated() {
    const enemy = Player.combat.currentEnemy;
    Player.gold += enemy.goldReward;
    _awardXP(enemy.xpReward);
    _log(`${enemy.name} defeated! +${enemy.goldReward} gold, +${enemy.xpReward} XP.`, 'system');

    Player.combat.currentEnemy = null;
    Player.combat.active = false;

    // Auto-advance: spawn next wave automatically (after a brief pause next tick will trigger it)
    // We just stop combat; the "Next Wave" button or auto-advance handles next spawn.
    // For good UX: auto-advance immediately if autoBattle is on
    if (Player.combat.autoBattleEnabled) {
      spawnWave(Player.combat.waveNumber + 1);
      Player.combat.active = true;
    }
  }

  function onHeroDefeated() {
    _log('Hero was defeated! Retreating to wave 1...', 'system');
    Player.hero.hp = Math.floor(Player.hero.maxHp * 0.5);
    Player.combat.active = false;
    Player.combat.currentEnemy = null;
    Player.combat.waveNumber = 1;
    Player.combat.ticksSinceLastAttack = 0;
    // maxWave is NOT decreased
  }

  function advanceWaveManual() {
    if (Player.combat.currentEnemy) return; // enemy still alive
    spawnWave(Player.combat.waveNumber + 1);
    Player.combat.active = true;
  }

  // ===== XP / Leveling =====

  function _awardXP(amount) {
    Player.hero.xp += amount;
    while (Player.hero.xp >= Player.hero.xpToNextLevel) {
      Player.hero.xp -= Player.hero.xpToNextLevel;
      Player.hero.level++;
      Player.hero.xpToNextLevel = Math.floor(100 * Math.pow(1.5, Player.hero.level - 1));
      Player.hero.maxHp += 20;
      Player.hero.hp = Player.hero.maxHp; // full heal on level up
      Player.hero.attackBase += 3;
      Player.hero.defense += 1;
      _log(`Level up! Hero is now level ${Player.hero.level}!`, 'system');
    }
  }

  // ===== Battle Log =====

  function _log(msg, type) {
    const c = Player.combat;
    c.battleLog.push({ msg, type });
    if (c.battleLog.length > BATTLE_LOG_CAP) {
      c.battleLog.splice(0, c.battleLog.length - BATTLE_LOG_CAP);
    }
  }

  return {
    tick,
    startBattle,
    setAutoBattle,
    spawnWave,
    advanceWaveManual,
    generateEnemy,
  };
})();

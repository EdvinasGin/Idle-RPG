/**
 * combat.js — Auto-battle system
 * Hero attacks every attackIntervalTicks ticks. Attacker advantage: hero resolves first.
 */

// Module-scope constant: avoids reallocating the array on every wave spawn
const _ENEMY_NAMES = [
  'Ember Wraith','Void Shade','Chrono Stalker','Rift Beast','Infernal Drake',
  'Null Specter','Chaos Golem','Temporal Fiend','Astral Horror','Reality Eater',
];

const CombatSystem = (() => {

  const BASE_HP      = 50;
  const BASE_ATTACK  = 5;
  const BASE_DEFENSE = 1;
  const BASE_GOLD    = 10;
  const BASE_XP      = 10;
  const BATTLE_LOG_CAP = 50;

  // ===== Enemy Generation =====

  function generateEnemy(waveNumber) {
    // Cache shared pow values to avoid redundant computation
    const hpScale  = Math.pow(1.15, waveNumber);
    const atkScale = Math.pow(1.10, waveNumber);
    const hp       = Math.floor(BASE_HP * hpScale);
    return {
      name:       _enemyName(waveNumber),
      hp,
      maxHp:      hp,
      attackBase: Math.floor(BASE_ATTACK  * atkScale),
      defense:    Math.floor(BASE_DEFENSE * Math.pow(1.05, waveNumber)),
      goldReward: Math.floor(BASE_GOLD    * Math.pow(1.12, waveNumber)),
      xpReward:   Math.floor(BASE_XP      * atkScale),
      waveNumber,
    };
  }

  function _enemyName(wave) {
    return _ENEMY_NAMES[(wave - 1) % _ENEMY_NAMES.length] + ` #${Math.ceil(wave / _ENEMY_NAMES.length)}`;
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

    if (Player.combat.autoBattleEnabled) {
      spawnWave(Player.combat.waveNumber + 1);
      // combat.active stays true — battle continues without toggling
    } else {
      Player.combat.active = false;
    }

    UI.renderCombatPanel();
  }

  function onHeroDefeated() {
    _log('Hero was defeated! Retreating to wave 1...', 'system');
    Player.hero.hp = Math.floor(Player.hero.maxHp * 0.5);
    Player.combat.active = false;
    Player.combat.currentEnemy = null;
    Player.combat.waveNumber = 1;
    Player.combat.ticksSinceLastAttack = 0;
    // maxWave is NOT decreased
    UI.renderCombatPanel();
  }

  function advanceWaveManual() {
    if (Player.combat.currentEnemy) return; // enemy still alive
    spawnWave(Player.combat.waveNumber + 1);
    Player.combat.active = true;
    UI.renderCombatPanel();
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
    // shift() is idiomatic for capped queues; splice(0,n) is O(n) for the same result
    if (c.battleLog.length > BATTLE_LOG_CAP) {
      c.battleLog.shift();
    }
  }

  return {
    tick,
    startBattle,
    setAutoBattle,
    spawnWave,
    advanceWaveManual,
    generateEnemy,
    BATTLE_LOG_CAP,
  };
})();

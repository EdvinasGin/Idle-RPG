/**
 * ui.js — All DOM manipulation and panel rendering
 *
 * DOM elements are cached once in _cacheElements() (called from bindEvents).
 * Shared sub-renderers (_renderHeroBars, _renderEnemyZone, _renderPrestigeState)
 * are called by both the full renderCombatPanel/renderPrestigePanel and the
 * lightweight per-tick renderTick, keeping the two paths in sync automatically.
 */

const UI = (() => {

  // ===== Cached DOM references (populated in _cacheElements) =====
  const _el = {};

  function _cacheElements() {
    _el.goldDisplay      = document.getElementById('gold-display');
    _el.shardsDisplay    = document.getElementById('shards-display');
    _el.gemsDisplay      = document.getElementById('gems-display');
    _el.activeWorldName  = document.getElementById('active-world-name');
    _el.heroName         = document.getElementById('hero-name');
    _el.heroLevelBadge   = document.getElementById('hero-level-badge');
    _el.heroHpBar        = document.getElementById('hero-hp-bar');
    _el.heroHpLabel      = document.getElementById('hero-hp-label');
    _el.heroXpBar        = document.getElementById('hero-xp-bar');
    _el.heroXpLabel      = document.getElementById('hero-xp-label');
    _el.heroAtk          = document.getElementById('hero-atk');
    _el.heroDef          = document.getElementById('hero-def');
    _el.heroCrit         = document.getElementById('hero-crit');
    _el.enemyName        = document.getElementById('enemy-name');
    _el.enemyHpBar       = document.getElementById('enemy-hp-bar');
    _el.enemyHpLabel     = document.getElementById('enemy-hp-label');
    _el.waveBadge        = document.getElementById('wave-badge');
    _el.startBattleBtn   = document.getElementById('start-battle-btn');
    _el.autoBattleBtn    = document.getElementById('auto-battle-btn');
    _el.nextWaveBtn      = document.getElementById('next-wave-btn');
    _el.battleLog        = document.getElementById('battle-log');
    _el.prestigeMaxWave  = document.getElementById('prestige-max-wave');
    _el.shardsPreview    = document.getElementById('shards-preview');
    _el.prestigeBtn      = document.getElementById('prestige-btn');
    _el.prestigeGateMsg  = document.getElementById('prestige-gate-msg');
    _el.prestigeCount    = document.getElementById('prestige-count');
    _el.shardBonusDisplay = document.getElementById('shard-bonus-display');
    _el.offlineModal     = document.getElementById('offline-modal');
    _el.offlineTimeMsg   = document.getElementById('offline-time-msg');
    _el.offlineGoldEarned = document.getElementById('offline-gold-earned');
    _el.offlineCapMsg    = document.getElementById('offline-cap-msg');
  }

  // ===== Pure Helpers =====

  function fmt(n) {
    return Math.floor(n).toLocaleString('en-US');
  }

  function pct(val, max) {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.max(0, (val / max) * 100));
  }

  function fmtTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // ===== Shared Sub-renderers =====

  // Updates the hero HP and XP bars + level badge. Called by both renderCombatPanel and renderTick.
  function _renderHeroBars(h) {
    _el.heroLevelBadge.textContent = `Lv.${h.level}`;
    _el.heroHpBar.style.width      = `${pct(h.hp, h.maxHp)}%`;
    _el.heroHpLabel.textContent    = `${Math.floor(h.hp)} / ${h.maxHp}`;
    _el.heroXpBar.style.width      = `${pct(h.xp, h.xpToNextLevel)}%`;
    _el.heroXpLabel.textContent    = `${Math.floor(h.xp)} / ${h.xpToNextLevel}`;
  }

  // Updates enemy name, HP bar, and HP label. Called by both renderCombatPanel and renderTick.
  function _renderEnemyZone(c) {
    if (c.currentEnemy) {
      _el.enemyName.textContent     = c.currentEnemy.name;
      _el.enemyHpBar.style.width    = `${pct(c.currentEnemy.hp, c.currentEnemy.maxHp)}%`;
      _el.enemyHpLabel.textContent  = `${Math.floor(c.currentEnemy.hp)} / ${c.currentEnemy.maxHp}`;
    } else {
      _el.enemyName.textContent     = '— No Enemy —';
      _el.enemyHpBar.style.width    = '0%';
      _el.enemyHpLabel.textContent  = '— / —';
    }
  }

  // Updates prestige gate message, button state, and shard preview. Single owner for this logic.
  function _renderPrestigeState(c) {
    _el.prestigeMaxWave.textContent = c.maxWave;
    if (PrestigeSystem.canPrestige()) {
      _el.shardsPreview.textContent = PrestigeSystem.calcShardsEarned();
      _el.prestigeBtn.disabled = false;
      _el.prestigeGateMsg.classList.add('hidden');
    } else {
      _el.prestigeBtn.disabled = true;
      _el.prestigeGateMsg.classList.remove('hidden');
    }
  }

  // ===== Full Re-render =====

  function renderAll() {
    renderTopBar();
    renderWorldPanel();
    renderCombatPanel();
    renderFusionPanel();
    renderPrestigePanel();
  }

  // ===== Top Bar =====

  function renderTopBar() {
    _el.goldDisplay.textContent   = `🪙 ${fmt(Player.gold)}`;
    _el.shardsDisplay.textContent = `💎 ${Player.realityShards}`;
    _el.gemsDisplay.textContent   = `✨ ${Player.gems}`;

    const world = WORLDS[Player.activeWorldId];
    if (world) _el.activeWorldName.textContent = world.name;
  }

  // ===== World Panel =====

  function renderWorldPanel() {
    const container = document.getElementById('world-cards-container');
    const worlds = WorldSystem.getUnlockedWorlds();
    container.innerHTML = '';

    worlds.forEach(world => {
      const card = document.createElement('div');
      card.className = 'world-card' + (world.id === Player.activeWorldId ? ' active' : '');
      card.dataset.worldId = world.id;

      const rules = world.rules;
      const dmgLine  = rules.damageMultiplier > 1
        ? `<span class="rule-positive">+${Math.round((rules.damageMultiplier - 1) * 100)}% Damage</span>`
        : '';
      const spdLine  = rules.speedMultiplier < 1
        ? `<span class="rule-positive">x${(1 / rules.speedMultiplier).toFixed(0)} Attack Speed</span>`
        : '';
      // Use actual hero crit chance instead of a hardcoded constant
      const critLine = !rules.critAllowed
        ? `<span class="rule-negative">No Critical Hits</span>`
        : `<span class="rule-positive">Crits: ${Math.round(Player.hero.critChance * 100)}% chance</span>`;
      const idleLine = `<span class="rule-neutral">Idle Gold: x${rules.idleGoldMultiplier.toFixed(1)}</span>`;

      const isActive = world.id === Player.activeWorldId;

      card.innerHTML = `
        <div class="world-card-header">
          <span class="world-icon">${world.icon}</span>
          <span>${world.name}</span>
        </div>
        <div class="world-rules">
          ${dmgLine}${spdLine}${critLine}${idleLine}
        </div>
        <button class="set-active-btn" data-world-id="${world.id}" ${isActive ? 'disabled' : ''}>
          ${isActive ? '✓ Active' : 'Set Active'}
        </button>
      `;

      container.appendChild(card);
    });
  }

  // ===== Combat Panel =====

  function renderCombatPanel() {
    const h = Player.hero;
    const c = Player.combat;

    // Hero zone — static fields + dynamic bars
    _el.heroName.textContent = h.name;
    const world = WORLDS[Player.activeWorldId];
    const critDisplay = world && world.rules.critAllowed ? `${Math.round(h.critChance * 100)}%` : 'N/A';
    _el.heroAtk.textContent  = h.attackBase;
    _el.heroDef.textContent  = h.defense;
    _el.heroCrit.textContent = critDisplay;
    _renderHeroBars(h);

    // Enemy zone
    _el.waveBadge.textContent = `Wave ${c.waveNumber}`;
    _renderEnemyZone(c);

    // Controls
    _el.startBattleBtn.disabled = c.active;
    _el.nextWaveBtn.disabled    = !!c.currentEnemy || c.active;
    _el.autoBattleBtn.textContent = c.autoBattleEnabled ? '🔄 Auto: ON' : '⏸ Auto: OFF';
    _el.autoBattleBtn.className   = c.autoBattleEnabled ? 'active' : '';

    _el.battleLog.scrollTop = _el.battleLog.scrollHeight;
  }

  // ===== Tick Update (lightweight, called every tick) =====

  function renderTick() {
    _el.goldDisplay.textContent = `🪙 ${fmt(Player.gold)}`;

    const h = Player.hero;
    const c = Player.combat;

    _renderHeroBars(h);
    _renderEnemyZone(c);

    _el.waveBadge.textContent = `Wave ${c.waveNumber}`;
    _el.startBattleBtn.disabled = c.active;
    _el.nextWaveBtn.disabled    = !!c.currentEnemy || c.active;

    _renderPrestigeState(c);
    _renderBattleLogTail();
  }

  // ===== Battle Log =====

  let _lastLogLength = 0;

  function _renderBattleLogTail() {
    const entries = Player.combat.battleLog;

    // Guard before any DOM access: early-return if nothing changed
    if (entries.length === _lastLogLength) return;

    // Self-heal: if the log was cleared (e.g. prestige resets battleLog to []),
    // wipe stale DOM entries and reset the tracker.
    if (entries.length < _lastLogLength) {
      _el.battleLog.innerHTML = '';
      _lastLogLength = 0;
    }

    // Append only new entries
    for (let i = _lastLogLength; i < entries.length; i++) {
      const { msg, type } = entries[i];
      const li = document.createElement('li');
      li.textContent = msg;
      li.className = `log-${type}`;
      _el.battleLog.appendChild(li);
    }

    // Trim DOM to match the data-layer cap (only runs when over cap)
    const cap = CombatSystem.BATTLE_LOG_CAP;
    if (_el.battleLog.children.length > cap) {
      const toRemove = _el.battleLog.children.length - cap;
      for (let i = 0; i < toRemove; i++) {
        _el.battleLog.removeChild(_el.battleLog.firstChild);
      }
    }

    _lastLogLength = entries.length;
    _el.battleLog.scrollTop = _el.battleLog.scrollHeight;
  }

  // ===== Fusion Panel =====

  function renderFusionPanel() {
    const hasFusion = Player.fusedWorlds.includes('toxic_inferno');
    const content   = document.getElementById('fusion-content');

    if (hasFusion) {
      content.innerHTML = `
        <div class="fusion-unlocked-msg">
          ☠️ <strong>Toxic Inferno Unlocked!</strong><br>
          <small>Available in Your Universes panel.</small>
        </div>
      `;
      return;
    }

    // Rebuild selector UI
    content.innerHTML = `
      <p class="fusion-desc">Combine two worlds to create something greater.</p>
      <div id="fusion-selector">
        <select id="fuse-world-a"><option value="">— World A —</option></select>
        <span>+</span>
        <select id="fuse-world-b"><option value="">— World B —</option></select>
      </div>
      <div id="fusion-preview" class="hidden">
        <span id="fusion-result-icon">☠️</span>
        <span id="fusion-result-name">Toxic Inferno</span>
      </div>
      <button id="fuse-btn" disabled>Fuse Worlds</button>
    `;

    const selA = document.getElementById('fuse-world-a');
    const selB = document.getElementById('fuse-world-b');

    // Build options once and assign to both selects
    const optionsHtml = WorldSystem.getUnlockedWorlds()
      .map(w => `<option value="${w.id}">${w.icon} ${w.name}</option>`)
      .join('');
    selA.innerHTML += optionsHtml;
    selB.innerHTML += optionsHtml;

    function onSelectionChange() {
      const check   = FusionSystem.canFuse(selA.value, selB.value);
      const fuseBtn = document.getElementById('fuse-btn');
      const preview = document.getElementById('fusion-preview');
      fuseBtn.disabled = !check.canFuse;
      preview.classList.toggle('hidden', !check.canFuse);
    }

    selA.addEventListener('change', onSelectionChange);
    selB.addEventListener('change', onSelectionChange);

    document.getElementById('fuse-btn').addEventListener('click', () => {
      if (FusionSystem.fuseWorlds(selA.value, selB.value)) {
        renderWorldPanel();
        renderFusionPanel();
      }
    });
  }

  // ===== Prestige Panel =====

  function renderPrestigePanel() {
    const bonus = ((Player.shardBonusMultiplier - 1) * 100).toFixed(1);
    _el.prestigeCount.textContent      = Player.totalPrestiges;
    _el.shardBonusDisplay.textContent  = `+${bonus}%`;
    // #shards-display is owned by renderTopBar — do not write it here
    _renderPrestigeState(Player.combat);
  }

  // ===== Offline Modal =====

  function showOfflineModal(result) {
    _el.offlineTimeMsg.textContent    = `You were away for ${fmtTime(result.elapsedMs)}.`;
    _el.offlineGoldEarned.textContent = `+${fmt(result.goldEarned)} Gold`;
    _el.offlineCapMsg.classList.toggle('hidden', !result.wasCapped);
    _el.offlineModal.classList.remove('hidden');
  }

  function hideOfflineModal() {
    _el.offlineModal.classList.add('hidden');
  }

  // ===== Event Binding =====

  function bindEvents() {
    _cacheElements();

    // World panel — event delegation on the container
    document.getElementById('world-cards-container').addEventListener('click', e => {
      const btn = e.target.closest('.set-active-btn');
      if (btn && !btn.disabled) {
        const worldId = btn.dataset.worldId;
        if (worldId && worldId !== Player.activeWorldId) {
          if (Player.combat.active) {
            if (!confirm(`Switch to ${WORLDS[worldId].name}? Combat will reset to Wave 1.`)) return;
          }
          WorldSystem.setActiveWorld(worldId);
        }
      }
    });

    // Combat controls
    _el.startBattleBtn.addEventListener('click', () => {
      CombatSystem.startBattle();
    });

    _el.autoBattleBtn.addEventListener('click', () => {
      CombatSystem.setAutoBattle(!Player.combat.autoBattleEnabled);
    });

    _el.nextWaveBtn.addEventListener('click', () => {
      if (!Player.combat.currentEnemy) {
        CombatSystem.advanceWaveManual();
      }
    });

    // Prestige button — event delegation on the panel
    document.getElementById('prestige-panel').addEventListener('click', e => {
      if (e.target.id === 'prestige-btn' && !e.target.disabled) {
        if (Player.combat.active && Player.combat.currentEnemy) {
          alert('Cannot prestige while in combat. Wait for the wave to end.');
          return;
        }
        if (confirm(`Prestige now? You will earn ${PrestigeSystem.calcShardsEarned()} Reality Shards. All progress will reset.`)) {
          PrestigeSystem.doPrestige();
          // _renderBattleLogTail self-heals on the next tick when it detects battleLog.length < _lastLogLength
        }
      }
    });

    // Offline modal dismiss
    document.getElementById('offline-continue-btn').addEventListener('click', hideOfflineModal);
  }

  return {
    renderAll,
    renderTick,
    renderTopBar,
    renderWorldPanel,
    renderCombatPanel,
    renderFusionPanel,
    renderPrestigePanel,
    showOfflineModal,
    hideOfflineModal,
    bindEvents,
  };
})();

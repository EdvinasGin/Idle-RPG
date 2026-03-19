/**
 * ui.js — All DOM manipulation and panel rendering
 * Uses event delegation on panel containers to avoid listener leaks on innerHTML re-renders.
 * CSS custom property --world-color drives theming; set in WorldSystem.applyActiveWorldRules().
 */

const UI = (() => {

  // ===== Helpers =====

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
    document.getElementById('gold-display').textContent   = `🪙 ${fmt(Player.gold)}`;
    document.getElementById('shards-display').textContent = `💎 ${Player.realityShards}`;
    document.getElementById('gems-display').textContent   = `✨ ${Player.gems}`;

    const world = WORLDS[Player.activeWorldId];
    if (world) {
      document.getElementById('active-world-name').textContent = world.name;
    }
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
      const critLine = !rules.critAllowed
        ? `<span class="rule-negative">No Critical Hits</span>`
        : `<span class="rule-positive">Crits: ${Math.round(15)}% chance</span>`;
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

    // Hero zone
    document.getElementById('hero-name').textContent      = 'Reality Warrior';
    document.getElementById('hero-level-badge').textContent = `Lv.${h.level}`;
    document.getElementById('hero-hp-bar').style.width    = `${pct(h.hp, h.maxHp)}%`;
    document.getElementById('hero-hp-label').textContent  = `${Math.floor(h.hp)} / ${h.maxHp}`;
    document.getElementById('hero-xp-bar').style.width    = `${pct(h.xp, h.xpToNextLevel)}%`;
    document.getElementById('hero-xp-label').textContent  = `${Math.floor(h.xp)} / ${h.xpToNextLevel}`;

    const world = WORLDS[Player.activeWorldId];
    const critDisplay = world && world.rules.critAllowed ? `${Math.round(h.critChance * 100)}%` : 'N/A';
    document.getElementById('hero-atk').textContent  = h.attackBase;
    document.getElementById('hero-def').textContent  = h.defense;
    document.getElementById('hero-crit').textContent = critDisplay;

    // Enemy zone
    const waveBadge = document.getElementById('wave-badge');
    waveBadge.textContent = `Wave ${c.waveNumber}`;

    if (c.currentEnemy) {
      document.getElementById('enemy-name').textContent     = c.currentEnemy.name;
      document.getElementById('enemy-hp-bar').style.width  = `${pct(c.currentEnemy.hp, c.currentEnemy.maxHp)}%`;
      document.getElementById('enemy-hp-label').textContent = `${Math.floor(c.currentEnemy.hp)} / ${c.currentEnemy.maxHp}`;
    } else {
      document.getElementById('enemy-name').textContent     = '— No Enemy —';
      document.getElementById('enemy-hp-bar').style.width  = '0%';
      document.getElementById('enemy-hp-label').textContent = '— / —';
    }

    // Controls
    const startBtn    = document.getElementById('start-battle-btn');
    const autoBtn     = document.getElementById('auto-battle-btn');
    const nextWaveBtn = document.getElementById('next-wave-btn');

    startBtn.disabled    = c.active;
    nextWaveBtn.disabled = !!c.currentEnemy || c.active;

    autoBtn.textContent = c.autoBattleEnabled ? '🔄 Auto: ON' : '⏸ Auto: OFF';
    autoBtn.className   = c.autoBattleEnabled ? 'active' : '';

    // Scroll battle log to bottom
    const logEl = document.getElementById('battle-log');
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ===== Tick Update (lightweight, called every tick) =====

  function renderTick() {
    // Currencies
    document.getElementById('gold-display').textContent = `🪙 ${fmt(Player.gold)}`;

    const h = Player.hero;
    const c = Player.combat;

    // HP bars
    document.getElementById('hero-hp-bar').style.width    = `${pct(h.hp, h.maxHp)}%`;
    document.getElementById('hero-hp-label').textContent  = `${Math.floor(h.hp)} / ${h.maxHp}`;

    if (c.currentEnemy) {
      document.getElementById('enemy-hp-bar').style.width  = `${pct(c.currentEnemy.hp, c.currentEnemy.maxHp)}%`;
      document.getElementById('enemy-hp-label').textContent = `${Math.floor(c.currentEnemy.hp)} / ${c.currentEnemy.maxHp}`;
      document.getElementById('enemy-name').textContent     = c.currentEnemy.name;
    } else {
      document.getElementById('enemy-hp-bar').style.width  = '0%';
      document.getElementById('enemy-hp-label').textContent = '— / —';
      document.getElementById('enemy-name').textContent     = '— No Enemy —';
    }

    document.getElementById('wave-badge').textContent = `Wave ${c.waveNumber}`;
    document.getElementById('hero-level-badge').textContent = `Lv.${h.level}`;
    document.getElementById('hero-xp-bar').style.width    = `${pct(h.xp, h.xpToNextLevel)}%`;
    document.getElementById('hero-xp-label').textContent  = `${Math.floor(h.xp)} / ${h.xpToNextLevel}`;

    // Control states
    document.getElementById('start-battle-btn').disabled    = c.active;
    document.getElementById('next-wave-btn').disabled       = !!c.currentEnemy || c.active;

    // Prestige preview update
    document.getElementById('prestige-max-wave').textContent = c.maxWave;
    if (PrestigeSystem.canPrestige()) {
      document.getElementById('shards-preview').textContent = PrestigeSystem.calcShardsEarned();
      document.getElementById('prestige-btn').disabled = false;
      document.getElementById('prestige-gate-msg').classList.add('hidden');
    } else {
      document.getElementById('prestige-btn').disabled = true;
      document.getElementById('prestige-gate-msg').classList.remove('hidden');
    }

    // Append new battle log lines
    _renderBattleLogTail();
  }

  let _lastLogLength = 0;

  function _renderBattleLogTail() {
    const logEl   = document.getElementById('battle-log');
    const entries = Player.combat.battleLog;

    if (entries.length === _lastLogLength) return;

    // Append only new entries
    for (let i = _lastLogLength; i < entries.length; i++) {
      const { msg, type } = entries[i];
      const li = document.createElement('li');
      li.textContent = msg;
      li.className = `log-${type}`;
      logEl.appendChild(li);
    }

    // Trim excess DOM nodes if log overflows (keep in sync with cap)
    while (logEl.children.length > 50) {
      logEl.removeChild(logEl.firstChild);
    }

    _lastLogLength = entries.length;
    logEl.scrollTop = logEl.scrollHeight;
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

    // Reset to selector UI
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

    const worlds = WorldSystem.getUnlockedWorlds();
    worlds.forEach(w => {
      selA.innerHTML += `<option value="${w.id}">${w.icon} ${w.name}</option>`;
      selB.innerHTML += `<option value="${w.id}">${w.icon} ${w.name}</option>`;
    });

    function onSelectionChange() {
      const idA = selA.value;
      const idB = selB.value;
      const check = FusionSystem.canFuse(idA, idB);
      const fuseBtn = document.getElementById('fuse-btn');
      const preview = document.getElementById('fusion-preview');

      fuseBtn.disabled = !check.canFuse;
      if (check.canFuse) {
        preview.classList.remove('hidden');
      } else {
        preview.classList.add('hidden');
      }
    }

    selA.addEventListener('change', onSelectionChange);
    selB.addEventListener('change', onSelectionChange);

    document.getElementById('fuse-btn').addEventListener('click', () => {
      const idA = document.getElementById('fuse-world-a').value;
      const idB = document.getElementById('fuse-world-b').value;
      if (FusionSystem.fuseWorlds(idA, idB)) {
        renderWorldPanel();
        renderFusionPanel();
      }
    });
  }

  // ===== Prestige Panel =====

  function renderPrestigePanel() {
    const bonus = ((Player.shardBonusMultiplier - 1) * 100).toFixed(1);
    document.getElementById('prestige-count').textContent        = Player.totalPrestiges;
    document.getElementById('shard-bonus-display').textContent  = `+${bonus}%`;
    document.getElementById('shards-display').textContent       = `💎 ${Player.realityShards}`;
    document.getElementById('prestige-max-wave').textContent    = Player.combat.maxWave;

    const canP    = PrestigeSystem.canPrestige();
    const gateMsg = document.getElementById('prestige-gate-msg');
    const btn     = document.getElementById('prestige-btn');

    if (canP) {
      document.getElementById('shards-preview').textContent = PrestigeSystem.calcShardsEarned();
      btn.disabled = false;
      gateMsg.classList.add('hidden');
    } else {
      btn.disabled = true;
      gateMsg.classList.remove('hidden');
    }
  }

  // ===== Offline Modal =====

  function showOfflineModal(result) {
    const modal = document.getElementById('offline-modal');
    document.getElementById('offline-time-msg').textContent =
      `You were away for ${fmtTime(result.elapsedMs)}.`;
    document.getElementById('offline-gold-earned').textContent =
      `+${fmt(result.goldEarned)} Gold`;

    const capMsg = document.getElementById('offline-cap-msg');
    if (result.wasCapped) {
      capMsg.classList.remove('hidden');
    } else {
      capMsg.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  function hideOfflineModal() {
    document.getElementById('offline-modal').classList.add('hidden');
  }

  // ===== Event Binding =====

  function bindEvents() {
    // World panel — event delegation
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
    document.getElementById('start-battle-btn').addEventListener('click', () => {
      CombatSystem.startBattle();
      renderCombatPanel();
    });

    document.getElementById('auto-battle-btn').addEventListener('click', () => {
      CombatSystem.setAutoBattle(!Player.combat.autoBattleEnabled);
    });

    document.getElementById('next-wave-btn').addEventListener('click', () => {
      if (!Player.combat.currentEnemy) {
        CombatSystem.advanceWaveManual();
        renderCombatPanel();
      }
    });

    // Prestige button
    document.getElementById('prestige-panel').addEventListener('click', e => {
      if (e.target.id === 'prestige-btn' && !e.target.disabled) {
        if (Player.combat.active && Player.combat.currentEnemy) {
          alert('Cannot prestige while in combat. Wait for the wave to end.');
          return;
        }
        if (confirm(`Prestige now? You will earn ${PrestigeSystem.calcShardsEarned()} Reality Shards. All progress will reset.`)) {
          PrestigeSystem.doPrestige();
          _lastLogLength = 0;
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

/**
 * save.js — LocalStorage persistence
 * Merge-on-load pattern: never replace Player directly, always Object.assign
 * so new fields from code updates get sensible defaults on old saves.
 */

const SAVE_KEY = 'chronoDominion_save';
const CURRENT_SAVE_VERSION = 1;

const SaveSystem = (() => {

  function save() {
    try {
      // Shallow spread avoids deep-cloning the full Player just to strip battleLog
      const combatData = { ...Player.combat, battleLog: [] };
      const saveData   = { ...Player, combat: combatData, lastSaveTime: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const saved = JSON.parse(raw);

      // Version migration hook (expand as needed)
      if (!saved.saveVersion || saved.saveVersion < CURRENT_SAVE_VERSION) {
        console.log('Save migration: old version detected, using defaults for new fields');
      }

      // Deep merge: hero and combat need separate handling
      if (saved.hero) {
        Object.assign(Player.hero, saved.hero);
      }
      if (saved.combat) {
        // battleLog is never saved, always starts empty
        const { battleLog: _bl, ...restCombat } = saved.combat;
        Object.assign(Player.combat, restCombat);
        // Always start with a clean combat state — safer than resuming mid-fight
        Player.combat.battleLog = [];
        Player.combat.active = false;
        Player.combat.currentEnemy = null;
        Player.combat.ticksSinceLastAttack = 0;
      }

      // Top-level scalar fields
      const topFields = [
        'saveVersion','realityShards','totalPrestiges','gems','gold',
        'lastSaveTime','lastTickTime','goldPerTick','shardBonusMultiplier',
        'unlockedWorlds','activeWorldId','fusedWorlds'
      ];
      for (const key of topFields) {
        if (key in saved) {
          Player[key] = saved[key];
        }
      }

      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  }

  function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  // TextEncoder/TextDecoder: correct UTF-8 base64 without deprecated escape/unescape
  function exportSave() {
    try {
      const raw    = localStorage.getItem(SAVE_KEY) || JSON.stringify(Player);
      const bytes  = new TextEncoder().encode(raw);
      const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
      return btoa(binary);
    } catch (e) {
      console.error('Export failed:', e);
      return '';
    }
  }

  function importSave(encoded) {
    try {
      const binary = atob(encoded);
      const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
      const raw    = new TextDecoder().decode(bytes);
      localStorage.setItem(SAVE_KEY, raw);
      return load();
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  return { save, load, deleteSave, exportSave, importSave };
})();

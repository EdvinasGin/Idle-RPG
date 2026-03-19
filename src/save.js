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
      // battleLog is ephemeral — strip it before saving
      const saveData = JSON.parse(JSON.stringify(Player));
      saveData.combat.battleLog = [];
      saveData.lastSaveTime = Date.now();
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
        Player.combat.battleLog = [];
        // currentEnemy can be null on reload — combat resumes but no active fight
        // (safer to require player to restart battle than resume mid-fight)
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

  function exportSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) || JSON.stringify(Player);
      return btoa(unescape(encodeURIComponent(raw)));
    } catch (e) {
      console.error('Export failed:', e);
      return '';
    }
  }

  function importSave(encoded) {
    try {
      const raw = decodeURIComponent(escape(atob(encoded)));
      localStorage.setItem(SAVE_KEY, raw);
      return load();
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  return { save, load, deleteSave, exportSave, importSave };
})();

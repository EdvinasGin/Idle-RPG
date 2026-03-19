/**
 * fusion.js — World fusion logic
 * Fusion is permanent, persists across prestiges (fusedWorlds is in the KEEP list).
 */

const FUSION_TABLE = {
  'fire+void': 'toxic_inferno',
};

const FusionSystem = (() => {

  function _fusionKey(idA, idB) {
    return [idA, idB].sort().join('+');
  }

  function getFusionResult(idA, idB) {
    return FUSION_TABLE[_fusionKey(idA, idB)] || null;
  }

  function canFuse(idA, idB) {
    if (!idA || !idB) return { canFuse: false, reason: 'Select two worlds.' };
    if (idA === idB) return { canFuse: false, reason: 'Cannot fuse a world with itself.' };

    const resultId = getFusionResult(idA, idB);
    if (!resultId) return { canFuse: false, reason: 'These worlds cannot be fused.' };

    if (Player.fusedWorlds.includes(resultId)) {
      return { canFuse: false, reason: 'Already fused — world already unlocked.' };
    }

    return { canFuse: true, reason: '' };
  }

  function fuseWorlds(idA, idB) {
    const { canFuse: ok, reason } = canFuse(idA, idB);
    if (!ok) {
      console.warn('Fusion blocked:', reason);
      return false;
    }

    const resultId = getFusionResult(idA, idB);
    // Idempotency guard (belt and suspenders)
    if (Player.fusedWorlds.includes(resultId)) return false;

    Player.fusedWorlds.push(resultId);
    return true;
  }

  return { canFuse, fuseWorlds, getFusionResult };
})();

/* Base Camp foundation only. Phase 1 defines progression and placement data;
   the world builder itself is intentionally deferred until the Journey and
   reward systems that feed it are mature. */
(function () {
  'use strict';

  var LEVELS = [0, 0, 250, 650, 1200, 1900, 2800, 3900, 5200, 6700, 8400, 10300, 12400, 14700, 17200, 19900, 22800, 25900, 29200, 32700, 36400, 40300, 44400, 48700, 53200, 57900, 62800, 67900, 73200, 78700, 84400];
  var LAND = {
    1: { cols: 6, rows: 6 },
    2: { cols: 8, rows: 7 },
    3: { cols: 10, rows: 8 },
    4: { cols: 12, rows: 10 }
  };
  var ITEMS = {
    'base-tent': { id: 'base-tent', category: 'shelter', size: [2, 2], starter: true },
    'base-fire-ring': { id: 'base-fire-ring', category: 'hearth', size: [1, 1], starter: true },
    'base-trail-marker': { id: 'base-trail-marker', category: 'memory', size: [1, 1], starter: true }
  };

  function levelForXp(xp) {
    xp = Math.max(0, Math.floor(+xp || 0));
    var level = 1;
    for (var i = 2; i < LEVELS.length; i++) if (xp >= LEVELS[i]) level = i; else break;
    return level;
  }
  function xpForLevel(level) {
    level = Math.max(1, Math.min(LEVELS.length - 1, Math.floor(+level || 1)));
    return LEVELS[level] || 0;
  }
  function landForTier(tier) { return LAND[Math.max(1, Math.min(4, Math.floor(+tier || 1)))] || LAND[1]; }
  function state() { return window.Store && Store.state ? Store.state().baseCamp : null; }
  function summary() {
    var s = state() || {};
    return {
      level: levelForXp(s.xp),
      xp: Math.max(0, Math.floor(+s.xp || 0)),
      land: landForTier(s.landTier),
      placed: Array.isArray(s.placed) ? s.placed.length : 0,
      collections: Array.isArray(s.collections) ? s.collections.length : 0,
      allowPartnerVisit: s.allowPartnerVisit !== false
    };
  }

  window.InSyncCamp = {
    schema: 1,
    levels: LEVELS.slice(),
    items: ITEMS,
    levelForXp: levelForXp,
    xpForLevel: xpForLevel,
    landForTier: landForTier,
    state: state,
    summary: summary
  };
})();

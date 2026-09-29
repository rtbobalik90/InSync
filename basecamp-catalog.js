/* Base Camp 1.0 starter catalog. This names only the objects already present
   in the local Base Camp state. Artwork and a reward economy remain separate. */
(function () {
  'use strict';

  var GRID = { cols: 6, rows: 6 };
  var ORDER = ['base-tent', 'base-fire-ring', 'base-trail-marker'];
  var ITEMS = {
    'base-tent': {
      id: 'base-tent', name: 'Canvas tent', shortName: 'Tent', mark: 'T',
      category: 'Shelter', width: 2, height: 2, variant: 'canvas'
    },
    'base-fire-ring': {
      id: 'base-fire-ring', name: 'Stone fire ring', shortName: 'Fire', mark: 'F',
      category: 'Hearth', width: 1, height: 1, variant: 'stone'
    },
    'base-trail-marker': {
      id: 'base-trail-marker', name: 'Wood trail marker', shortName: 'Marker', mark: 'M',
      category: 'Trail', width: 1, height: 1, variant: 'wood'
    }
  };

  function get(id) { return ITEMS[String(id || '')] || null; }
  function all() { return ORDER.map(get); }
  function normalizeRotation(rotation) {
    var n = Math.round((+rotation || 0) / 90) * 90;
    return ((n % 360) + 360) % 360;
  }
  function footprint(itemId, rotation) {
    var item = get(itemId);
    if (!item) return null;
    var turned = normalizeRotation(rotation) % 180 !== 0;
    return { width: turned ? item.height : item.width, height: turned ? item.width : item.height };
  }

  window.InSyncBaseCampCatalog = {
    version: 1,
    grid: { cols: GRID.cols, rows: GRID.rows },
    order: ORDER.slice(),
    get: get,
    all: all,
    footprint: footprint,
    normalizeRotation: normalizeRotation
  };
})();

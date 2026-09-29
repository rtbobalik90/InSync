/* Safe local-only editing for the Base Camp starter grid. Every change is
   validated in a cloned backup and committed through Store's atomic import. */
(function () {
  'use strict';

  var Catalog = window.InSyncBaseCampCatalog;
  var localCommit = false;

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function result(ok, code, message, extra) {
    var out = { ok: !!ok, code: code || '', message: message || '' };
    Object.keys(extra || {}).forEach(function (key) { out[key] = extra[key]; });
    return out;
  }
  function camp() {
    return window.Store && Store.state && Store.state().baseCamp ? Store.state().baseCamp : null;
  }
  function placements(source) {
    var value = source || camp();
    return value && Array.isArray(value.placed) ? value.placed : [];
  }
  function integer(value) { return Number.isInteger(+value) ? +value : null; }
  function cellsFor(itemId, x, y, rotation) {
    var size = Catalog && Catalog.footprint(itemId, rotation);
    x = integer(x); y = integer(y);
    if (!size || x === null || y === null) return [];
    var cells = [];
    for (var row = 0; row < size.height; row++) {
      for (var col = 0; col < size.width; col++) cells.push({ x: x + col, y: y + row });
    }
    return cells;
  }
  function occupiedMap(source, ignoreInstanceId) {
    var map = {};
    placements(source).forEach(function (placed) {
      if (placed.instanceId === ignoreInstanceId) return;
      cellsFor(placed.itemId, placed.x, placed.y, placed.rotation).forEach(function (cell) {
        map[cell.x + ',' + cell.y] = placed.instanceId;
      });
    });
    return map;
  }
  function check(itemId, x, y, rotation, ignoreInstanceId, source) {
    var item = Catalog && Catalog.get(itemId);
    if (!item) return result(false, 'unknown-item', 'That camp item is not available in this build.');
    x = integer(x); y = integer(y);
    if (x === null || y === null) return result(false, 'bad-position', 'Choose a square inside the camp.');
    rotation = Catalog.normalizeRotation(rotation);
    var cells = cellsFor(itemId, x, y, rotation), grid = Catalog.grid;
    if (!cells.length || cells.some(function (cell) {
      return cell.x < 0 || cell.y < 0 || cell.x >= grid.cols || cell.y >= grid.rows;
    })) return result(false, 'out-of-bounds', item.name + ' will not fit there.');
    var occupied = occupiedMap(source, ignoreInstanceId);
    var collision = cells.find(function (cell) { return occupied[cell.x + ',' + cell.y]; });
    if (collision) return result(false, 'collision', 'That space is already occupied.', { occupiedBy: occupied[collision.x + ',' + collision.y] });
    return result(true, 'valid', 'Ready to place.', { x: x, y: y, rotation: rotation, cells: cells });
  }
  function validateAll(baseCamp) {
    if (!baseCamp || !Array.isArray(baseCamp.placed)) return result(false, 'bad-state', 'Base Camp data is unavailable.');
    var ids = {}, occupied = {};
    for (var i = 0; i < baseCamp.placed.length; i++) {
      var placed = baseCamp.placed[i];
      if (!placed || !/^[a-z0-9:_-]{1,120}$/i.test(String(placed.instanceId || '')) || ids[placed.instanceId]) {
        return result(false, 'bad-instance', 'A camp object has an invalid identity.');
      }
      ids[placed.instanceId] = true;
      var valid = check(placed.itemId, placed.x, placed.y, placed.rotation, placed.instanceId, { placed: [] });
      if (!valid.ok) return valid;
      for (var c = 0; c < valid.cells.length; c++) {
        var key = valid.cells[c].x + ',' + valid.cells[c].y;
        if (occupied[key]) return result(false, 'collision', 'Two camp objects occupy the same square.');
        occupied[key] = placed.instanceId;
      }
    }
    return result(true, 'valid', 'Camp layout is valid.');
  }
  function transact(change) {
    if (!window.Store || !Store.exportState || !Store.importState) return result(false, 'store-unavailable', 'Local storage is unavailable.');
    var next = Store.exportState();
    if (!next.baseCamp || !Array.isArray(next.baseCamp.placed)) return result(false, 'bad-state', 'Base Camp data is unavailable.');
    var changed;
    try { changed = change(next.baseCamp); }
    catch (error) { return result(false, 'change-failed', error.message || 'The camp could not be changed.'); }
    if (changed && changed.ok === false) return changed;
    var valid = validateAll(next.baseCamp);
    if (!valid.ok) return valid;
    try {
      localCommit = true;
      Store.importState(next);
    }
    catch (error) { return result(false, 'save-failed', error.message || 'The camp could not be saved.'); }
    finally { localCommit = false; }
    return result(true, 'saved', 'Saved on this device.', changed || {});
  }
  function find(instanceId, source) {
    return placements(source).find(function (placed) { return placed.instanceId === instanceId; }) || null;
  }
  function nextInstanceId(itemId, source) {
    var stem = 'camp-' + String(itemId || '').replace(/^base-/, ''), number = 1;
    while (find(stem + '-' + number, source)) number++;
    return stem + '-' + number;
  }
  function unlocked(itemId, source) {
    var value = source || camp();
    return !!value && Array.isArray(value.unlocked) && value.unlocked.indexOf(itemId) >= 0;
  }
  function place(itemId, x, y, rotation) {
    var current = camp();
    if (!unlocked(itemId, current)) return result(false, 'locked', 'That camp item is not available.');
    var valid = check(itemId, x, y, rotation, '', current);
    if (!valid.ok) return valid;
    var instanceId = nextInstanceId(itemId, current);
    return transact(function (nextCamp) {
      nextCamp.placed.push({
        instanceId: instanceId, itemId: itemId, x: valid.x, y: valid.y,
        rotation: valid.rotation, variant: Catalog.get(itemId).variant
      });
      return { instanceId: instanceId };
    });
  }
  function move(instanceId, x, y) {
    var current = camp(), placed = find(instanceId, current);
    if (!placed) return result(false, 'not-found', 'That camp object is no longer here.');
    var valid = check(placed.itemId, x, y, placed.rotation, instanceId, current);
    if (!valid.ok) return valid;
    return transact(function (nextCamp) {
      var target = find(instanceId, nextCamp);
      target.x = valid.x; target.y = valid.y;
      return { instanceId: instanceId };
    });
  }
  function rotate(instanceId) {
    var current = camp(), placed = find(instanceId, current);
    if (!placed) return result(false, 'not-found', 'That camp object is no longer here.');
    var rotation = Catalog.normalizeRotation(placed.rotation + 90);
    var valid = check(placed.itemId, placed.x, placed.y, rotation, instanceId, current);
    if (!valid.ok) return valid;
    return transact(function (nextCamp) {
      find(instanceId, nextCamp).rotation = rotation;
      return { instanceId: instanceId, rotation: rotation };
    });
  }
  function remove(instanceId) {
    if (!find(instanceId)) return result(false, 'not-found', 'That camp object is no longer here.');
    return transact(function (nextCamp) {
      nextCamp.placed = nextCamp.placed.filter(function (placed) { return placed.instanceId !== instanceId; });
      return { instanceId: instanceId };
    });
  }
  function at(x, y, source) {
    var match = null;
    placements(source).some(function (placed) {
      var hit = cellsFor(placed.itemId, placed.x, placed.y, placed.rotation).some(function (cell) { return cell.x === +x && cell.y === +y; });
      if (hit) match = placed;
      return hit;
    });
    return match;
  }

  window.InSyncBaseCampState = {
    version: 1,
    camp: camp,
    placements: placements,
    cellsFor: cellsFor,
    occupiedMap: occupiedMap,
    check: check,
    validateAll: validateAll,
    find: find,
    at: at,
    place: place,
    move: move,
    rotate: rotate,
    remove: remove,
    isLocalCommit: function () { return localCommit; }
  };
})();

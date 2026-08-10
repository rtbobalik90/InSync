/* Reward/event foundation. No Phase 1 event grants XP yet. This module gives
   later game systems one deterministic seam instead of awarding progress from
   arbitrary click handlers. */
(function () {
  'use strict';

  var listeners = Object.create(null);
  var allowed = Object.create(null);
  if (window.InSyncContracts) Object.keys(InSyncContracts.events).forEach(function (k) {
    allowed[InSyncContracts.events[k]] = true;
  });

  function on(type, fn) {
    if (!allowed[type] || typeof fn !== 'function') return function () {};
    (listeners[type] || (listeners[type] = [])).push(fn);
    return function () {
      listeners[type] = (listeners[type] || []).filter(function (x) { return x !== fn; });
    };
  }

  function emit(type, detail) {
    if (!allowed[type]) return false;
    (listeners[type] || []).slice().forEach(function (fn) { fn(detail || {}); });
    return true;
  }

  window.InSyncRewards = { version: 1, on: on, emit: emit, eventTypes: allowed };
})();

/* Markup-only Base Camp renderer. The starter grid uses labeled controls and
   existing InSync surfaces so finished environment artwork can arrive later. */
(function () {
  'use strict';

  function esc(value) {
    return window.UI && UI.esc ? UI.esc(value) : String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cellLabel(x, y, placed, item) {
    var square = 'Row ' + (y + 1) + ', column ' + (x + 1);
    return placed && item ? square + ', ' + item.name + '. Tap to select.' : square + ', empty.';
  }
  function board(view) {
    var Catalog = window.InSyncBaseCampCatalog, State = window.InSyncBaseCampState;
    var selectedId = view.selectedInstanceId || '', cells = [];
    for (var y = 0; y < Catalog.grid.rows; y++) {
      for (var x = 0; x < Catalog.grid.cols; x++) {
        var placed = State.at(x, y), item = placed && Catalog.get(placed.itemId);
        var anchor = placed && placed.x === x && placed.y === y;
        var classes = 'basecamp-cell' + (placed ? ' occupied item-' + placed.itemId : '') +
          (placed && placed.instanceId === selectedId ? ' selected' : '');
        cells.push('<button class="' + classes + '" type="button" role="gridcell"' +
          ' data-basecamp-cell="1" data-x="' + x + '" data-y="' + y + '"' +
          (placed ? ' data-instance-id="' + esc(placed.instanceId) + '"' : '') +
          ' aria-label="' + esc(cellLabel(x, y, placed, item)) + '"' +
          (placed && placed.instanceId === selectedId ? ' aria-selected="true"' : ' aria-selected="false"') + '>' +
          (anchor && item ? '<span aria-hidden="true" class="basecamp-mark">' + esc(item.mark) + '</span><span aria-hidden="true" class="basecamp-cell-name">' + esc(item.shortName) + '</span>' : '') +
        '</button>');
      }
    }
    return '<div class="basecamp-board-wrap"><div class="basecamp-board" role="grid" aria-label="Base Camp, 6 rows by 6 columns">' + cells.join('') + '</div></div>';
  }
  function selection(view) {
    var Catalog = window.InSyncBaseCampCatalog, State = window.InSyncBaseCampState;
    var placed = view.selectedInstanceId ? State.find(view.selectedInstanceId) : null;
    var item = placed ? Catalog.get(placed.itemId) : null;
    if (placed && item) {
      return '<section class="basecamp-selection" aria-label="Selected camp object">' +
        '<div><span class="kicker sage">Selected</span><strong>' + esc(item.name) + '</strong>' +
          '<small>Row ' + (placed.y + 1) + ', column ' + (placed.x + 1) + ' · ' + placed.rotation + '°</small></div>' +
        '<div class="basecamp-actions">' +
          '<button class="btn ghost sm" type="button" data-basecamp-rotate="1">Rotate</button>' +
          '<button class="btn ghost sm" type="button" data-basecamp-remove="1">Remove</button>' +
          '<button class="btn ghost sm" type="button" data-basecamp-cancel="1">Done</button>' +
        '</div><p class="small">Tap an empty square to move it.</p></section>';
    }
    var pending = view.selectedItemId ? Catalog.get(view.selectedItemId) : null;
    if (pending) {
      return '<section class="basecamp-selection" aria-label="Placement mode"><div><span class="kicker gold">Placing</span><strong>' + esc(pending.name) + '</strong>' +
        '<small>Tap an empty square.</small></div><button class="btn ghost sm" type="button" data-basecamp-cancel="1">Cancel</button></section>';
    }
    return '<p class="small basecamp-help">Tap an object to select it, or choose a starter item to place another.</p>';
  }
  function palette(view) {
    var Catalog = window.InSyncBaseCampCatalog, State = window.InSyncBaseCampState, state = State.camp() || {};
    return '<div class="rulehead"><span class="kicker sage">Starter items</span><span></span><span class="note">Local only</span></div>' +
      '<div class="basecamp-palette">' + Catalog.all().map(function (item) {
        var unlocked = Array.isArray(state.unlocked) && state.unlocked.indexOf(item.id) >= 0;
        var on = view.selectedItemId === item.id;
        return '<button type="button" class="basecamp-palette-item' + (on ? ' selected' : '') + '" data-basecamp-item="' + esc(item.id) + '"' +
          (unlocked ? '' : ' disabled') + ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<span class="basecamp-palette-mark" aria-hidden="true">' + esc(item.mark) + '</span><span><strong>' + esc(item.name) + '</strong><small>' + item.width + ' × ' + item.height + ' squares</small></span></button>';
      }).join('') + '</div>';
  }
  function screen(view) {
    view = view || {};
    var count = window.InSyncBaseCampState ? InSyncBaseCampState.placements().length : 0;
    var status = view.message ? '<p class="basecamp-status ' + (view.messageKind === 'error' ? 'error' : '') + '" role="status" aria-live="polite">' + esc(view.message) + '</p>' : '';
    var body = '<article class="card pad basecamp-intro"><div><div class="kicker sage">Base Camp 1.0</div>' +
      '<h2>Your camp, kept on this phone.</h2><p class="small">A simple 6 × 6 starter clearing. Changes do not visit your partner or affect progress.</p></div>' +
      '<span class="basecamp-count" aria-label="' + count + ' objects placed">' + count + '</span></article>' +
      '<article class="card pad basecamp-builder">' + selection(view) + status + board(view) + '</article>' + palette(view) +
      '<button class="btn ghost block" data-route="journey">Back to Journey</button>';
    return UI.screen({
      tab: 'journey', rest: 310, restMeasure: true, screenClass: 'basecamp-screen',
      art: 'assets/art/camp-day.webp', photoPosition: 'center 48%', header: { back: 'journey', title: 'Base Camp' },
      overlay: '<div class="eyebrow">Your clearing</div><p class="verse">Make room for the journey.</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0">A small local place to arrange what matters.</p>',
      body: body
    });
  }
  function entryCard() {
    return '<article class="card pad accent basecamp-entry"><div class="kicker sage">Base Camp</div>' +
      '<h3>Your 6 × 6 clearing is ready.</h3><p class="small">Arrange the starter tent, fire ring and trail markers on this phone.</p>' +
      '<button class="btn block" data-route="base-camp">Enter Base Camp</button></article>';
  }

  window.InSyncBaseCampRenderer = { version: 1, screen: screen, entryCard: entryCard, board: board };
})();

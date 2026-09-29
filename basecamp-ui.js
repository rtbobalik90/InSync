/* Ephemeral Base Camp selection state and mobile tap controls. Placement mode
   never enters Store; only completed, validated layout changes are persisted. */
(function () {
  'use strict';

  var view = { selectedInstanceId: '', selectedItemId: '', message: '', messageKind: '' };

  function resetMessage() { view.message = ''; view.messageKind = ''; }
  function announce(outcome) {
    view.message = outcome && outcome.message ? outcome.message : '';
    view.messageKind = outcome && outcome.ok ? 'success' : 'error';
  }
  function normalizeSelection() {
    if (view.selectedInstanceId && !InSyncBaseCampState.find(view.selectedInstanceId)) view.selectedInstanceId = '';
    if (view.selectedItemId && !InSyncBaseCampCatalog.get(view.selectedItemId)) view.selectedItemId = '';
  }
  function model() { normalizeSelection(); return view; }
  function render() { return InSyncBaseCampRenderer.screen(model()); }

  function enhanceJourney(root, routeKey) {
    if (String(routeKey || '').split('/')[0] !== 'journey' || !root || !InSyncBaseCampRenderer) return;
    var stack = root.querySelector('.screen-route-journey .sheet .stack');
    if (!stack || stack.querySelector('.basecamp-entry')) return;
    var holder = document.createElement('div');
    holder.innerHTML = InSyncBaseCampRenderer.entryCard();
    var card = holder.firstElementChild;
    if (card) stack.insertBefore(card, stack.children[1] || null);
  }
  function bind(root, routeKey, requestRender) {
    enhanceJourney(root, routeKey);
    if (String(routeKey || '').split('/')[0] !== 'base-camp' || !root) return;
    var screen = root.querySelector('.basecamp-screen');
    if (!screen || screen.getAttribute('data-basecamp-bound') === '1') return;
    screen.setAttribute('data-basecamp-bound', '1');
    screen.addEventListener('click', function (event) {
      var itemButton = event.target.closest('[data-basecamp-item]');
      var cell = event.target.closest('[data-basecamp-cell]');
      var rotate = event.target.closest('[data-basecamp-rotate]');
      var remove = event.target.closest('[data-basecamp-remove]');
      var cancel = event.target.closest('[data-basecamp-cancel]');
      if (!itemButton && !cell && !rotate && !remove && !cancel) return;
      event.preventDefault();
      var saved = false;
      resetMessage();
      if (itemButton) {
        view.selectedItemId = itemButton.getAttribute('data-basecamp-item') || '';
        view.selectedInstanceId = '';
        view.message = 'Now tap an empty square.';
      } else if (cancel) {
        view.selectedItemId = ''; view.selectedInstanceId = '';
      } else if (rotate) {
        var rotated = InSyncBaseCampState.rotate(view.selectedInstanceId);
        announce(rotated);
        saved = rotated.ok;
      } else if (remove) {
        var removed = InSyncBaseCampState.remove(view.selectedInstanceId);
        announce(removed);
        saved = removed.ok;
        if (removed.ok) view.selectedInstanceId = '';
      } else if (cell) {
        var x = +cell.getAttribute('data-x'), y = +cell.getAttribute('data-y');
        var occupant = InSyncBaseCampState.at(x, y);
        if (occupant) {
          view.selectedInstanceId = occupant.instanceId;
          view.selectedItemId = '';
        } else if (view.selectedInstanceId) {
          var moved = InSyncBaseCampState.move(view.selectedInstanceId, x, y);
          announce(moved); saved = moved.ok;
        } else if (view.selectedItemId) {
          var placed = InSyncBaseCampState.place(view.selectedItemId, x, y, 0);
          announce(placed);
          saved = placed.ok;
          if (placed.ok) { view.selectedInstanceId = placed.instanceId; view.selectedItemId = ''; }
        } else {
          view.message = 'Choose an object or starter item first.';
        }
      }
      /* A successful Store commit already queues the app's safe render. For
         selection-only and rejected actions, wait until the tap completes. */
      if (!saved) setTimeout(requestRender, 0);
    });
  }

  window.InSyncBaseCampUI = { version: 1, model: model, render: render, bind: bind, enhanceJourney: enhanceJourney };
})();

/* Router + init. One container, one render pass, one scroll binding. */
(function () {
  'use strict';

  /* Safari exposes navigator.standalone on iOS even on versions where the
     display-mode media query can lag during Home Screen launch. Mark the root
     as well so CSS can always select the full standalone viewport. */
  var standaloneMode = !!(navigator.standalone ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  if (standaloneMode) document.documentElement.classList.add('insync-standalone');

  var app = document.getElementById('app');
  var TABS = ['home', 'coach', 'train', 'nutrition', 'together'];


  function current() {
    var h = (location.hash || '#home').slice(1);
    return h || 'home';
  }
  function base(key) { return key.split('/')[0]; }



  var lastRenderedKey = '';

  /* Store changes frequently re-render the current screen: toggling privacy,
     checking a shopping item, logging a set, receiving a background sync, etc.
     Replacing .innerHTML resets Safari's scroll container to zero. That made a
     tap halfway down a long screen look like navigation even though the route
     never changed. Preserve the sheet position only when we are re-rendering
     the exact same route; a real route change still opens at the top. */
  function restoreSheetScroll(key, top) {
    if (!top || top < 1) return;
    function apply() {
      if (current() !== key) return;
      var sheet = app.querySelector('.sheet');
      if (!sheet) return;
      var max = Math.max(0, sheet.scrollHeight - sheet.clientHeight);
      sheet.scrollTop = Math.min(top, max);
    }
    requestAnimationFrame(function () {
      if (window.UI && UI.restFor) UI.restFor(app);
      apply();
      /* iOS may finish safe-area/font/image layout a beat after the first
         frame. Re-apply once after that layout settles so the same card stays
         under the user's finger instead of snapping to the hero. */
      setTimeout(function () {
        if (window.UI && UI.restFor) UI.restFor(app);
        apply();
      }, 160);
    });
  }

  function render() {
    var key = current(), root = base(key);
    var html;
    var oldSheet = app.querySelector('.sheet');
    var keepScroll = lastRenderedKey === key && oldSheet ? oldSheet.scrollTop : 0;

    if (!Store.state().onboarded) { app.innerHTML = ''; lastRenderedKey = ''; return; }

    // Opening a verse surface is the evidence for the verse-reading badge.
    if ((root === 'home' || root === 'reflection') && Store.markVerseRead) Store.markVerseRead(Store.todayKey());

    if (TABS.indexOf(root) >= 0) html = Screens[root]();
    else if (root === 'settings') html = Screens.settings();
    else if (root === 'body') html = Screens.body();
    else if (root === 'records') html = Screens.records();
    else if (root === 'record') html = Screens.record();
    else if (root === 'workouts') html = Screens.workouts();
    else if (root === 'cardio') html = Screens.cardio();
    else if (root === 'arrival') html = Screens.arrival();
    else if (root === 'badges') html = Screens.badges();
    else if (root === 'earned') html = Screens.earnedMoment();
    else if (root === 'handshake') html = Screens.handshake();
    else if (root === 'reflection') html = Screens.reflection();
    else if (root === 'trends') html = Screens.trends();
    else if (root === 'planner') html = Screens.planner();
    else if (root === 'planned-meal') html = Screens.plannedMeal();
    else if (root === 'cookbook') html = Screens.cookbook();
    else if (root === 'history') html = Screens.history();
    else if (root === 'photos') html = Screens.photos();
    else if (root === 'capture') html = Screens.capture();
    else if (root === 'trainday') html = Screens.trainDay();
    else if (root === 'session') html = Screens.session();
    else if (root === 'session-done') html = Screens.sessionDone();
    else if (root === 'exercises') html = Screens.exercises();
    else if (root === 'exercise') html = Screens.exercise();
    else if (root === 'notifications') html = Screens.notifications();
    else if (root === 'meal') html = Screens.meal();
    else { location.hash = '#home'; return; }

    app.innerHTML = html;
    lastRenderedKey = key;
    UI.bindScroll(app);
    if (window.Media) Media.paint(app);
    maybeBadge(key);

    /* Every photo screen measures where its sheet rests. A constant cannot
       survive copy changes or a shorter viewport: too small and the next card
       peeks above the nav, too large and the first card is clipped behind it. */
    measureRest();
    if (keepScroll) restoreSheetScroll(key, keepScroll);
  }


  /* A stamp announces itself once, and only where an interruption is fair:
     never mid-session, mid-onboarding, or on top of another moment. */
  function maybeBadge(key) {
    if (!window.Badges || !Store.state().onboarded) return;
    var root = base(key);
    if (root === 'earned' || root === 'session' || root === 'arrival' || root === 'badges') return;
    if (Store.session && Store.session()) return;
    if (!Badges.fresh().length) return;
    badgeReturn = '#' + key;
    location.hash = '#earned';
  }
  var badgeReturn = '#home';

  /* ---- one meal: edit, photograph, delete ---------------------------- */
  function currentMealId() { return (location.hash.split('/')[1] || ''); }

  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
  function mealNameKey(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  app.addEventListener('change', function (e) {
    var pref = e.target.closest('[data-meal-pref-text]');
    if (pref) {
      var prefs = Object.assign({}, Store.state().mealPrefs || {});
      prefs[pref.getAttribute('data-meal-pref-text')] = String(pref.value || '').trim();
      Store.set('mealPrefs', prefs);
      return;
    }
    var f = e.target.closest('[data-meal-edit]');
    if (!f) return;
    var key = f.getAttribute('data-meal-edit');
    var val = key === 'name' ? f.value.trim() : Math.round(num(f.value));
    var patch = {}; patch[key] = val;
    Store.updateMeal(currentMealId(), patch);
  });

  app.addEventListener('click', function (e) {
    var slot = e.target.closest('[data-meal-slot]');
    if (slot) {
      Store.updateMeal(currentMealId(), { slot: slot.getAttribute('data-meal-slot') });
      render();
      return;
    }

    var drop = e.target.closest('[data-meal-dropitem]');
    if (drop) {
      var f = Store.findMeal(currentMealId());
      if (!f) return;
      var items = (f.meal.items || []).slice();
      items.splice(+drop.getAttribute('data-meal-dropitem'), 1);
      Store.updateMeal(currentMealId(), { items: items.length ? items : null });
      render();
      return;
    }

    if (e.target.closest('[data-meal-additem]')) {
      var name = prompt('What else is in it?');
      if (!name || !name.trim()) return;
      var g = Store.findMeal(currentMealId());
      if (!g) return;
      var list = (g.meal.items || []).slice();
      list.push({ name: name.trim(), weight: '', kcal: 0, protein: 0, carbs: 0, fat: 0 });
      Store.updateMeal(currentMealId(), { items: list });
      render();
      return;
    }

    if (e.target.closest('[data-meal-photo-clear]')) {
      var clearMeal = Store.findMeal(currentMealId());
      if (!clearMeal) return;
      var clearId = clearMeal.meal.photoId || '';
      function finishClear() {
        Store.updateMeal(currentMealId(), { photoId: '', photo: '' });
        render();
      }
      if (clearId) Media.del(clearId, finishClear); else finishClear();
      return;
    }

    if (e.target.closest('[data-meal-photo]')) {
      Media.capture(function (err, dataUrl) {
        if (err) return;
        Media.shrink(dataUrl, 1100, 0.8, function (e2, small) {
          if (e2) { alert('That photograph could not be prepared. Try it again.'); return; }
          var found = Store.findMeal(currentMealId());
          if (!found) return;
          var oldId = found.meal.photoId || '';
          var photoId = 'meal-' + currentMealId();
          Media.put(photoId, small, function (e3) {
            if (e3) { alert('The meal was kept, but its photograph could not be saved.'); return; }
            Store.updateMeal(currentMealId(), { photoId: photoId, photo: '' });
            if (oldId && oldId !== photoId) Media.del(oldId, function () {});
            render();
          });
        });
      });
      return;
    }

    if (e.target.closest('[data-meal-delete]')) {
      var m = Store.findMeal(currentMealId());
      if (!m) return;
      if (!confirm('Delete “' + m.meal.name + '”? This takes it off the day.')) return;
      var mealPhotoId = m.meal.photoId || '';
      Store.removeMeal(currentMealId());
      if (mealPhotoId) Media.del(mealPhotoId, function () {});
      location.hash = '#nutrition';
      return;
    }
  });

  app.addEventListener('click', function (e) {
    /* Toggles and the coach's suggested questions carry no data-action, and were
       being dropped by this selector — every notification and privacy switch, and
       every "ask it something" button, did nothing at all. */
    var el = e.target.closest('[data-route],[data-back],[data-action],[data-toggle],[data-ask]');
    if (!el) return;
    /* These controls are app commands, not browser navigation. Prevent any
       default anchor/submit behavior if a future screen changes the element
       type without changing the delegated handler. */
    e.preventDefault();

    if (el.hasAttribute('data-back')) {
      var backTo = el.getAttribute('data-back');
      if (backTo) location.hash = '#' + backTo;
      else if (history.length > 1) history.back();
      else location.hash = '#home';
      return;
    }

    var route = el.getAttribute('data-route');
    if (route) {
      // Opening Together is how her note stops being news.
      if (route === 'together') {
        var pd = Store.state().partnerData;
        if (pd && pd.note) Store.set('partnerNoteSeen', (pd.noteDate || pd.date) + '|' + pd.note);
      }
      location.hash = '#' + route;
      if (route === 'together' && window.Cloud && Cloud.hasGit && Cloud.hasGit() && Cloud.pull) {
        Cloud.pull(function (err) {
          if (err || location.hash.replace(/^#/, '').split('/')[0] !== 'together') return;
          var fresh = Store.state().partnerData;
          if (fresh && fresh.note) Store.set('partnerNoteSeen', (fresh.noteDate || fresh.date) + '|' + fresh.note);
        });
      }
      return;
    }

    var toggle = el.getAttribute('data-toggle');
    if (toggle) {
      var parts = toggle.split('.'), o = Store.state();
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      Store.set(toggle, !o[parts[parts.length - 1]]);
      return;
    }

    var action = el.getAttribute('data-action');

    /* Send a note: save it, then push if sync is configured. The status line
       only claims it was sent once the push actually returns. */
    if (action === 'note-send') {
      var input = app.querySelector('[data-note-input]');
      var text = input ? input.value.trim() : '';
      if (!text) { if (input) input.focus(); return; }
      Store.setPartnerNote(text);
      /* A message composer behaves like a message composer: once the user has
         committed the text locally, clear the box immediately. Delivery state
         is shown on the message in the thread instead of leaving sent text in
         an editable field. */
      if (input) input.value = '';
      el.disabled = true;
      el.textContent = 'Sending\u2026';
      if (!Cloud.hasGit()) {
        el.disabled = false;
        render();
        return;
      }
      Cloud.push(function (err) {
        if (err) {
          alert('The note is saved on this phone, but it did not sync yet. InSync will retry when the connection is available.\n\n' + err.message);
        }
        render();
      });
      return;
    }

    // ---- progress photos -------------------------------------------------
    if (action === 'take-photo') {
      Media.capture(function (err, dataUrl) {
        if (err) { alert(err.message); return; }
        Media.shrink(dataUrl, 1100, 0.8, function (e2, small) {
          if (e2) { alert(e2.message); return; }
          var id = 'p' + Date.now();
          Media.put(id, small, function (e3) {
            if (e3) { alert(e3.message); return; }
            Store.addPhoto(id, Store.todayKey());
            location.hash = '#photos/' + ((Store.state().photos || []).length - 1);
            render();
          });
        });
      });
      return;
    }
    if (action === 'delete-photo') {
      var pid = el.getAttribute('data-id');
      if (el.getAttribute('data-confirm') !== '1') {
        el.setAttribute('data-confirm', '1');
        el.textContent = 'Tap again to delete it';
        return;
      }
      Media.del(pid, function (photoErr) {
        if (photoErr) { alert(photoErr.message); return; }
        Store.removePhoto(pid);
        location.hash = '#photos';
        render();
      });
      return;
    }

    // ---- training plan ---------------------------------------------------
    if (action === 'write-plan') {
      var was = el.textContent;
      el.disabled = true;
      el.textContent = 'Writing the week\u2026';
      Cloud.writePlan(function (err) {
        el.disabled = false;
        if (err) { el.textContent = err.message; setTimeout(function () { el.textContent = was; }, 3200); return; }
        render();
      });
      return;
    }

    // ---- planner ---------------------------------------------------------
    if (action === 'plan-slot') {
      Log.pickForSlot(el.getAttribute('data-slot'));
      return;
    }
    if (action === 'plan-meal') {
      var raw = el.getAttribute('data-meal');
      if (Log.assignPlanned) Log.assignPlanned(raw);
      return;
    }
    if (action === 'planner-week') {
      var week = el.getAttribute('data-week');
      if (week) Store.set('mealPlannerWeek', week);
      return;
    }
    if (action === 'meal-pref-chip') {
      var prefKind = el.getAttribute('data-pref-kind'), prefValue = el.getAttribute('data-pref-value');
      if (['cuisines','proteins'].indexOf(prefKind) < 0 || !prefValue) return;
      var mprefs = Object.assign({}, Store.state().mealPrefs || {});
      var selected = Array.isArray(mprefs[prefKind]) ? mprefs[prefKind].slice() : [];
      var pos = selected.indexOf(prefValue);
      if (pos >= 0) selected.splice(pos, 1); else selected.push(prefValue);
      mprefs[prefKind] = selected;
      Store.set('mealPrefs', mprefs);
      return;
    }
    if (action === 'favorite-planned-meal') {
      var favKey = el.getAttribute('data-plan-key'), favMeal = (Store.state().mealPlan || {})[favKey];
      if (!favMeal) return;
      var favorites = (Store.state().mealFavorites || []).slice(), fkey = mealNameKey(favMeal.name);
      var existing = favorites.findIndex(function (m) { return mealNameKey(m.name) === fkey; });
      if (existing >= 0) favorites.splice(existing, 1);
      else favorites.push(Object.assign({}, favMeal, { source: 'favorite' }));
      Store.set('mealFavorites', favorites.slice(-60));
      if (existing < 0) {
        var dislikes = (Store.state().mealDislikedMeals || []).filter(function (n) { return mealNameKey(n) !== fkey; });
        Store.set('mealDislikedMeals', dislikes);
      }
      return;
    }
    if (action === 'dislike-planned-meal') {
      var badKey = el.getAttribute('data-plan-key'), badPlan = Object.assign({}, Store.state().mealPlan || {}), badMeal = badPlan[badKey];
      if (!badMeal) return;
      var badName = badMeal.name, bkey = mealNameKey(badName);
      var bads = (Store.state().mealDislikedMeals || []).filter(function (n) { return mealNameKey(n) !== bkey; });
      bads.push(badName);
      var favs = (Store.state().mealFavorites || []).filter(function (m) { return mealNameKey(m.name) !== bkey; });
      delete badPlan[badKey];
      Store.set('mealDislikedMeals', bads.slice(-120));
      Store.set('mealFavorites', favs);
      Store.set('mealPlan', badPlan);
      if (badMeal.photoId && window.Media) Media.del(badMeal.photoId, function () {});
      location.hash = '#planner';
      return;
    }
    if (action === 'add-planned-photo') {
      var photoKey = el.getAttribute('data-plan-key'), photoMeal = (Store.state().mealPlan || {})[photoKey];
      if (!photoKey || !photoMeal || !window.Media) return;
      Media.capture(function (err, dataUrl) {
        if (err || !dataUrl) return;
        Media.shrink(dataUrl, 1200, 0.82, function (shrinkErr, small) {
          if (shrinkErr) { alert('That photograph could not be prepared. Try it again.'); return; }
          var photoId = 'planned-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
          Media.put(photoId, small, function (putErr) {
            if (putErr) { alert('The recipe is safe, but its photograph could not be saved.'); return; }
            var latest = Object.assign({}, Store.state().mealPlan || {}), currentMeal = latest[photoKey];
            if (!currentMeal) { Media.del(photoId, function () {}); return; }
            var oldPhoto = currentMeal.photoId || '';
            latest[photoKey] = Object.assign({}, currentMeal, { photoId: photoId });
            Store.set('mealPlan', latest);
            var faves = (Store.state().mealFavorites || []).slice(), nkey = mealNameKey(currentMeal.name), changed = false;
            faves = faves.map(function (m) { if (mealNameKey(m.name) !== nkey) return m; changed = true; return Object.assign({}, m, { photoId: photoId }); });
            if (changed) Store.set('mealFavorites', faves);
            if (oldPhoto && oldPhoto !== photoId) Media.del(oldPhoto, function () {});
          });
        });
      });
      return;
    }
    if (action === 'remove-planned-photo') {
      var clearKey = el.getAttribute('data-plan-key'), clearPlan = Object.assign({}, Store.state().mealPlan || {}), clearPm = clearPlan[clearKey];
      if (!clearPm) return;
      var clearPhoto = clearPm.photoId || '', clearName = mealNameKey(clearPm.name);
      clearPlan[clearKey] = Object.assign({}, clearPm, { photoId: '' });
      Store.set('mealPlan', clearPlan);
      var clearFavs = (Store.state().mealFavorites || []).map(function (m) { return mealNameKey(m.name) === clearName ? Object.assign({}, m, { photoId: '' }) : m; });
      Store.set('mealFavorites', clearFavs);
      if (clearPhoto && window.Media) Media.del(clearPhoto, function () {});
      return;
    }
    if (action === 'build-meal-week') {
      var buildWeek = el.getAttribute('data-week') || Store.weekStart(Store.todayKey());
      var existingPlan = Store.state().mealPlan || {};
      var hasExisting = Object.keys(existingPlan).some(function (k) {
        return k.slice(0, 10) >= buildWeek && k.slice(0, 10) <= Store.shift(buildWeek, 6) && !!existingPlan[k];
      });
      if (hasExisting && !confirm('Rebuild this week? The 28 meal slots in this displayed week will be replaced. Other weeks stay untouched.')) return;
      var bw = el, bwText = bw.textContent;
      bw.disabled = true; bw.textContent = 'Building the week…';
      Cloud.planMealsWeek(buildWeek, function (err, weekMap) {
        bw.disabled = false; bw.textContent = bwText;
        if (err) { alert(err.message); return; }
        var merged = Object.assign({}, Store.state().mealPlan || {});
        var end = Store.shift(buildWeek, 6);
        Object.keys(merged).forEach(function (k) {
          var date = k.slice(0, 10);
          if (date >= buildWeek && date <= end) delete merged[k];
        });
        Object.keys(weekMap || {}).forEach(function (k) { merged[k] = weekMap[k]; });
        Store.set('mealPlan', merged);
        Store.set('mealPlannerWeek', buildWeek);
        Store.set('shopTicked', {});
      });
      return;
    }
    if (action === 'tick-shop') {
      var item = el.getAttribute('data-item').toLowerCase();
      var t = Object.assign({}, Store.state().shopTicked || {});
      if (t[item]) delete t[item]; else t[item] = true;
      Store.set('shopTicked', t);
      return;
    }
    if (action === 'clear-plan') {
      var clearWeek = el.getAttribute('data-week') || Store.state().mealPlannerWeek || Store.weekStart(Store.todayKey());
      if (confirm('Clear every planned meal in this displayed week?')) {
        var cp = Object.assign({}, Store.state().mealPlan || {}), clearEnd = Store.shift(clearWeek, 6);
        Object.keys(cp).forEach(function (k) {
          var date = k.slice(0, 10);
          if (date >= clearWeek && date <= clearEnd) delete cp[k];
        });
        Store.set('mealPlan', cp);
        Store.set('shopTicked', {});
      }
      return;
    }
    if (action === 'remove-planned-meal') {
      var removeKey = el.getAttribute('data-plan-key');
      var rp = Object.assign({}, Store.state().mealPlan || {});
      if (removeKey && rp[removeKey]) {
        delete rp[removeKey];
        Store.set('mealPlan', rp);
        location.hash = '#planner';
      }
      return;
    }
    if (action === 'replace-planned-meal') {
      var replaceKey = el.getAttribute('data-plan-key');
      if (replaceKey) Log.pickForSlot(replaceKey);
      return;
    }
    if (action === 'log-planned-meal') {
      var logKey = el.getAttribute('data-plan-key'), pm = (Store.state().mealPlan || {})[logKey];
      if (!pm) return;
      var lp = logKey.split('|'), now = new Date();
      function commitPlannedLog(photoId) {
        Store.addMeal({
          name: pm.name, slot: lp[1] || pm.slot || 'Meal',
          time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
          kcal: pm.kcal, protein: pm.protein, carbs: pm.carbs, fat: pm.fat,
          items: pm.items || null, photoId: photoId || ''
        });
        location.hash = '#nutrition';
      }
      if (pm.photoId && window.Media) {
        Media.get(pm.photoId, function (photoErr, dataUrl) {
          if (photoErr || !dataUrl) return commitPlannedLog('');
          var copyId = 'meal-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          Media.put(copyId, dataUrl, function (putErr) { commitPlannedLog(putErr ? '' : copyId); });
        });
      } else commitPlannedLog('');
      return;
    }
    if (action === 'write-planned-recipe') {
      var recipeKey = el.getAttribute('data-plan-key'), currentMeal = (Store.state().mealPlan || {})[recipeKey];
      if (!recipeKey || !currentMeal) return;
      var rb = el, rbt = rb.textContent;
      rb.disabled = true; rb.textContent = 'Writing the recipe…';
      Cloud.recipeForMeal(currentMeal, function (err, recipe) {
        rb.disabled = false; rb.textContent = rbt;
        if (err) { alert(err.message); return; }
        var rplan = Object.assign({}, Store.state().mealPlan || {}), ps = recipeKey.split('|');
        recipe.date = ps[0]; recipe.slot = ps[1] || recipe.slot;
        rplan[recipeKey] = recipe;
        Store.set('mealPlan', rplan);
      });
      return;
    }
    if (action === 'generate-meals') {
      var gb = el, gwas = gb.textContent;
      gb.disabled = true; gb.textContent = 'Thinking…';
      Cloud.suggestMeals(function (err, list) {
        gb.disabled = false; gb.textContent = gwas;
        if (err) { alert(err.message); return; }
        Store.set('mealIdeas', list || []);
      });
      return;
    }

    if (action === 'reset') {
      if (confirm('Clear everything on this device and start over? This removes the log, the badges, the expedition and every photograph.')) {
        Store.wipe(function (err) {
          if (err) { alert(err.message); return; }
          location.hash = '#home';
          location.reload();
        });
      }
      return;
    }

    /* ---- Session ---- */
    if (action === 'begin') {
      var S0 = Store.state(), plan0 = S0.plan || [];
      var DOWs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var todayName0 = DOWs[new Date().getDay()];
      var tp = null;
      for (var pp = 0; pp < plan0.length; pp++) if (plan0[pp].day === todayName0) tp = plan0[pp];
      if (!tp) return;
      var items = tp.ex && tp.ex.length ? Exercises.expand(tp.ex) : [];
      // A warm-up opens the session, drawn from the bodyweight set.
      var warm = Exercises.byGroup().filter(function (g) { return g.name === 'Warm-up'; })[0];
      if (warm && warm.items.length) {
        var pick = warm.items[new Date().getDate() % warm.items.length];
        items = [pick].concat(items);
      }
      Store.startSession(tp.name, items);
      location.hash = '#session';
      return;
    }
    if (action === 'add-set' || action === 'repeat-set') {
      var i1 = +el.getAttribute('data-i');
      var host = document.querySelector('.app');
      var wEl = host.querySelector('[data-set="w"][data-i="' + i1 + '"]');
      var rEl = host.querySelector('[data-set="r"][data-i="' + i1 + '"]');
      var rawW = parseFloat(wEl && wEl.value), rawR = parseInt(rEl && rEl.value, 10);
      if ((isFinite(rawW) && rawW < 0) || (isFinite(rawR) && rawR < 0)) { alert('Weight and reps cannot be negative.'); return; }
      var w = Store.weightToLb(isFinite(rawW) ? rawW : 0);
      var r = isFinite(rawR) ? rawR : 0;
      if (!w && !r) return;
      Store.logSet(i1, { weight: w, reps: r });
      return;
    }
    if (action === 'drop-set') {
      Store.dropSet(+el.getAttribute('data-i'), +el.getAttribute('data-s'));
      return;
    }
    if (action === 'drop-item') {
      Store.dropSessionItem(+el.getAttribute('data-i'));
      location.hash = '#session';
      return;
    }
    if (action === 'abandon-session') {
      if (confirm('Abandon this session? Nothing will be logged.')) {
        Store.abandonSession();
        location.hash = '#train';
      }
      return;
    }
    if (action === 'finish-session') {
      var res = Store.finishSession();
      if (!res) return;
      Store.set('lastFinish', res);
      location.hash = '#session-done';
      return;
    }

    if (action === 'export') {
      Media.all(function (err, media) {
        if (err) { alert('The backup could not read every photograph. Nothing was exported.'); return; }
        var bundle = {
          format: 'insync-backup', version: 1, exportedAt: new Date().toISOString(),
          state: Store.exportState(), media: media || {}
        };
        var blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
        var a = document.createElement('a');
        var url = URL.createObjectURL(blob);
        a.href = url;
        a.download = 'insync-backup-' + Store.todayKey() + '.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
      });
      return;
    }
    if (action === 'import') {
      var picker = document.createElement('input');
      picker.type = 'file'; picker.accept = 'application/json,.json';
      picker.onchange = function () {
        var file = picker.files && picker.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var bundle;
          try { bundle = JSON.parse(reader.result); } catch (ex) { alert('That file is not a valid InSync backup.'); return; }
          var state = bundle && bundle.format === 'insync-backup' ? bundle.state : bundle;
          if (!state || typeof state !== 'object' || !state.profile || !state.days) {
            alert('That file does not contain a valid InSync log.'); return;
          }
          if (!confirm('Restore this backup? It will replace the current log and photographs on this device. Connection keys stay unchanged.')) return;
          Media.all(function (oldErr, oldMedia) {
            if (oldErr) { alert('InSync could not protect the current photographs before restoring. Nothing was changed.'); return; }
            Media.importAll((bundle && bundle.media) || {}, function (mediaErr) {
              if (mediaErr) { alert('The backup data was readable, but its photographs could not be restored. Nothing was changed.'); return; }
              try {
                Store.importState(state);
              } catch (restoreErr) {
                Media.importAll(oldMedia || {}, function (rollbackErr) {
                  var message = restoreErr.message || 'The restored log could not be saved on this device.';
                  if (rollbackErr) message += '\n\nThe previous photographs also could not be restored. Do not clear the app; use your last backup to recover them.';
                  alert(message);
                });
                return;
              }
              location.hash = '#home';
              location.reload();
            });
          });
        };
        reader.readAsText(file);
      };
      picker.click();
      return;
    }
    if (action === 'sync-now') {
      var btn = el;
      btn.disabled = true;
      var was = btn.textContent;
      btn.textContent = 'Syncing…';
      Cloud.sync(function (err, data) {
        btn.disabled = false;
        btn.textContent = was;
        if (err) { alert(err.message); return; }
        if (!data) alert('Pushed. Nothing from ' + Store.partnerName() + ' yet — they have not synced from their device.');
      });
      return;
    }
    if (action === 'coach-write') {
      var b = el, label = b.textContent;
      b.disabled = true; b.textContent = 'Writing…';
      Cloud.coachLine(function (err) {
        b.disabled = false; b.textContent = label;
        if (err) alert(err.message);
      });
      return;
    }
    if (action === 'chat-send' || el.hasAttribute('data-ask')) {
      var q = el.hasAttribute('data-ask')
        ? el.getAttribute('data-ask')
        : (document.querySelector('[data-chat-input]') || {}).value;
      q = (q || '').trim();
      if (!q) return;
      pushChat('me', q);
      Store.set('coachPending', true);
      Cloud.ask(q, chatHistory(), function (err, text) {
        Store.set('coachPending', false);
        pushChat('coach', err ? err.message : text);
      });
      return;
    }
    if (action === 'chat-clear') {
      Store.set('coachChat', null);
      return;
    }
    if (action === 'chapter-write') {
      var cb = el, cl = cb.textContent;
      cb.disabled = true; cb.textContent = 'Writing…';
      Cloud.weeklyNote(function (err, text) {
        cb.disabled = false; cb.textContent = cl;
        if (err) { alert(err.message); return; }
        var list = (Store.state().chapters || []).slice();
        list.push({ from: Store.shift(Store.todayKey(), -6), to: Store.todayKey(), text: text });
        Store.set('chapters', list);
      });
      return;
    }
    if (action === 'log-meal') { Log.open('meal', { slot: el.getAttribute('data-slot') || '' }); return; }
    if (action === 'describe-meal') { Log.open('meal'); return; }
    if (action === 'photograph-meal') { Log.photograph(); return; }
    if (action === 'scan-barcode') { Log.open('barcode'); return; }
    if (action === 'add-restaurant') { Log.open('restaurant'); return; }
    if (action === 'start-session') { Log.open('workout'); return; }
    if (action === 'log-morning') { Log.open('morning'); return; }
    if (action === 'log-steps') { Log.open('steps'); return; }
    if (action === 'set-unit') {
      Store.set(el.getAttribute('data-path'), el.getAttribute('data-value'));
      return;
    }
    if (action === 'accept-proposal') { Store.acceptProposal(); return; }
    if (action === 'dismiss-proposal') { Store.dismissProposal(); return; }
    if (action === 'ack-badge') {
      Badges.markSeen();
      location.hash = el.getAttribute('data-to') ? '#' + el.getAttribute('data-to') : badgeReturn;
      return;
    }
    if (action === 'advance-leg') { if (Store.advanceLeg()) location.hash = '#arrival'; return; }

    /* ---- the handshake: propose, nudge, accept, counter ---- */
    if (action === 'propose-route') {
      var pid = el.getAttribute('data-id');
      Store.propose(pid, Screens.routeName(pid));
      if (Cloud.hasGit()) Cloud.push(function () {});
      return;
    }
    if (action === 'counter-route') {
      var cid = el.getAttribute('data-id');
      Store.counterInvite(cid, Screens.routeName(cid));
      location.hash = '#handshake';
      if (Cloud.hasGit()) Cloud.push(function () {});
      return;
    }
    if (action === 'accept-invite') {
      Store.acceptInvite();
      if (Cloud.hasGit()) Cloud.push(function () {});
      return;
    }
    if (action === 'nudge') {
      el.disabled = true;
      Store.nudgeInvite();
      if (Cloud.hasGit()) Cloud.push(function () {});
      return;
    }
    if (action === 'begin-expedition') {
      Store.beginExpedition(el.getAttribute('data-id'));
      location.hash = '#together';
      return;
    }
    if (action === 'hold-expedition') {
      Store.holdExpedition(el.getAttribute('data-id'));
      location.hash = '#together';
      return;
    }
    if (action === 'save-reflection') {
      var ta = document.getElementById('reflect');
      if (ta) {
        Store.saveReflection(ta.value);
        var b2 = el, l2 = b2.textContent;
        b2.textContent = 'Saved';
        setTimeout(function () { b2.textContent = l2; }, 1400);
      }
      return;
    }
  });

  // Text and key fields write straight through to the store on blur.
  app.addEventListener('change', function (e) {
    /* The evening page saves itself when he leaves the field. Losing an entry
       to a stray tap is not a thing a journal may do. */
    if (e.target.id === 'reflect') { Store.saveReflection(e.target.value); return; }
    var el = e.target.closest('[data-set]');
    if (!el) return;
    if (el.hasAttribute('data-secret')) {
      Store.setSecret(el.getAttribute('data-secret'), el.value.trim());
      return;
    }
    /* Names carry their avatar initials with them. */
    if (el.hasAttribute('data-name')) { Store.setProfileName(el.value); return; }
    if (el.hasAttribute('data-partner-name')) { Store.setPartnerName(el.value); return; }
    var setPath = el.getAttribute('data-set');
    if (setPath === 'connections.githubRepo' || setPath === 'connections.githubBranch') {
      Store.state().connections.lastSync = '';
    }
    /* A target typed as text would poison every comparison that reads it. */
    if (el.hasAttribute('data-num')) {
      var n = Math.round(parseFloat(String(el.value).replace(/[^0-9.\-]/g, '')));
      if (!isFinite(n) || n <= 0) { render(); return; }
      /* Typed in his units, stored in pounds — the conversion belongs here, not
         in the field. */
      if (el.getAttribute('data-unit') === 'weight') {
        Store.set(el.getAttribute('data-set'), Store.weightToLb(n));
        return;
      }
      Store.set(el.getAttribute('data-set'), n);
      return;
    }
    Store.set(setPath, el.value);
  });

  // Live word count while writing the evening.
  app.addEventListener('input', function (e) {
    if (e.target.id !== 'reflect') return;
    var out = document.getElementById('wordcount');
    if (!out) return;
    var t = e.target.value.trim();
    out.textContent = t ? t.split(/\s+/).length + ' words' : 'Blank page';
  });

  /* Any save re-renders. If a field has focus, that would replace the node
     mid-edit and drop the caret — so hold the render until the field is done. */
  var deferred = false, renderQueued = false;
  function editing() {
    var el = document.activeElement;
    return !!el && app.contains(el) &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }
  function safeRender() {
    if (editing()) { deferred = true; return; }
    if (renderQueued) return;
    renderQueued = true;
    /* Store emits synchronously. Rendering synchronously from inside a click
       handler destroys the button that handler is still using and resets the
       iOS scroll container before the tap has even completed. Queue and
       coalesce state-driven renders instead. Route hashchanges still render
       immediately through their own listener. */
    setTimeout(function () {
      renderQueued = false;
      if (editing()) { deferred = true; return; }
      render();
    }, 0);
  }
  document.addEventListener('focusout', function () {
    if (!deferred) return;
    deferred = false;
    safeRender();
  });

  window.addEventListener('hashchange', render);
  Store.on(safeRender);
  Store.on(function () {
    /* Pulling partner data writes it into Store too. Do not interpret those
       remote-applied writes as a new local change that needs to be pushed
       back to GitHub; that would create a needless sync/commit loop. */
    if (window.Cloud && Cloud.isApplyingRemote && Cloud.isApplyingRemote()) return;
    if (Store.state().onboarded && window.Cloud && Cloud.autoSync) Cloud.autoSync(false);
  });

  var storageAlerted = false;
  window.addEventListener('insync-storage-error', function (ev) {
    if (storageAlerted) return;
    storageAlerted = true;
    var msg = ev && ev.detail && ev.detail.message ? ev.detail.message : 'The device refused the save.';
    alert('InSync could not save your latest change. Do not clear this app. Create a backup if possible, then free some browser storage.\n\n' + msg);
    setTimeout(function () { storageAlerted = false; }, 30000);
  });

  window.App = { render: render };

  /* Never treat unreadable local data as a fresh install. Doing that would let
     onboarding overwrite the only copy of a damaged-but-potentially-recoverable
     log. Keep the bytes untouched, offer them for recovery, and require an
     explicit reset before this device may write a new store. */
  function showLoadRecovery() {
    app.innerHTML = '<main style="min-height:100vh;padding:32px 22px;display:flex;align-items:center;justify-content:center">' +
      '<article class="card pad" style="width:min(520px,100%)">' +
        '<div class="kicker" style="margin-bottom:10px">Local data needs attention</div>' +
        '<h2 style="margin:0 0 12px">InSync stopped before overwriting anything.</h2>' +
        '<p class="note">' + (Store.loadError ? Store.loadError() : 'The local log could not be read safely.') + '</p>' +
        '<p class="note">Save the damaged copy if you may want it recovered later. It can contain old connection settings, so keep that file private.</p>' +
        '<div class="btnrow" style="margin-top:18px">' +
          '<button class="btn ghost auto" id="save-damaged-data">Save damaged copy</button>' +
          '<button class="btn auto" id="reset-damaged-data">Start over on this device</button>' +
        '</div>' +
      '</article></main>';
    var saveBad = document.getElementById('save-damaged-data');
    if (saveBad) saveBad.addEventListener('click', function () {
      var raw = Store.corruptRaw ? Store.corruptRaw() : '';
      if (!raw) { alert('There is no damaged local copy available to save.'); return; }
      var blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'insync-damaged-local-data.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    var resetBad = document.getElementById('reset-damaged-data');
    if (resetBad) resetBad.addEventListener('click', function () {
      if (!confirm('Start over on this device? Save the damaged copy first if you may want it recovered.')) return;
      Store.wipe(function (err) {
        if (err) { alert(err.message || String(err)); return; }
        location.reload();
      });
    });
  }

  if (Store.loadError && Store.loadError()) { showLoadRecovery(); return; }

  if (window.Media && Media.migrateMealPhotos) Media.migrateMealPhotos();
  if (!Store.state().onboarded) Onboarding.start();

  render();
  if (Store.loadWarning && Store.loadWarning()) {
    setTimeout(function () { alert(Store.loadWarning()); }, 0);
  }
  if (Store.state().onboarded && window.Cloud && Cloud.autoSync) Cloud.autoSync(true);
  window.addEventListener('online', function () { if (window.Cloud && Cloud.autoSync) Cloud.autoSync(true); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Store.state().onboarded && window.Cloud && Cloud.autoSync) Cloud.autoSync(true);
  });

  /* iOS suspends a Home Screen PWA in the background, but while InSync is
     actually visible we can poll the tiny private sync files. This makes
     Together behave like a conversation without requiring Settings > Sync Now.
     The existing Cloud throttle/queue still serializes GitHub writes. */
  setInterval(function () {
    if (document.hidden || !navigator.onLine || !Store.state().onboarded) return;
    /* Poll is read-only. Local changes already push immediately/debounced, so
       a chat refresh must not create an empty Git commit every minute. */
    if (window.Cloud && Cloud.hasGit && Cloud.hasGit() && Cloud.pull) Cloud.pull(function () {});
  }, 60000);

  /* The coach chooses the day's verse once a day. Silent: if there is no key,
     or the call fails, the rotation has already rendered and stays. */
  (function dailyVerse() {
    if (!window.Cloud || !Cloud.hasClaude()) return;
    var c = Store.state().verseCache;
    if (!c || c.date !== Store.todayKey()) Cloud.chooseVerse(function () {});

    /* The plan is written for a week. On the first open of a new one, the
       coach rewrites it from what the last week actually looked like. */
    var meta = Store.state().planMeta || {};
    if (meta.weekOf !== Store.weekStart()) {
      Cloud.writePlan(function (err) { if (!err) render(); });
    }

    /* Targets are proposed, never imposed: once a fortnight at most, and only
       when the last proposal has been answered. Silent on failure — an
       unanswerable proposal is better not made. */
    (function targetProposal() {
      var p = Store.state().proposal;
      if (p && !p.answered) return;
      if (p && p.date && Store.shift(p.date, 14) > Store.todayKey()) return;
      Cloud.proposeTargets(function () {});
    })();
  })();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').then(function (reg) { reg.update().catch(function () {}); }).catch(function () {});
  }

  /* Chat lives for the day. A question from Tuesday is not context on Friday. */
  function chatHistory() {
    var c = Store.state().coachChat;
    return (c && c.date === Store.todayKey()) ? (c.messages || []) : [];
  }

  function pushChat(role, text) {
    var msgs = chatHistory().slice();
    msgs.push({ role: role, text: text });
    Store.set('coachChat', { date: Store.todayKey(), messages: msgs });
  }


  /* The sheet's rest position depends on rendered heights, which are not final
     on the first frame and change again whenever a screen re-renders itself
     (search filters, saved entries). Measure on a frame, again once artwork
     settles, and again on any subtree change. */
  var restTimer = null;
  function measureRest() {
    requestAnimationFrame(function () {
      UI.restFor(app);
      setTimeout(function () { UI.restFor(app); }, 140);
    });
  }
  /* Re-anchor the resting card whenever iOS changes the visual viewport. This
     keeps the fold attached to the real tab-bar position after launch,
     rotation, or browser-chrome changes instead of preserving an old gap. */
  window.addEventListener('resize', measureRest, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', measureRest, { passive: true });

  new MutationObserver(function () {
    clearTimeout(restTimer);
    restTimer = setTimeout(function () { UI.restFor(app); }, 60);
  }).observe(app, { childList: true, subtree: true });

  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('[data-sessionadd]');
    if (!sel || !sel.value) return;
    Store.addSessionItem(sel.value);
    sel.value = '';
  });

})();

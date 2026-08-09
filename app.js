/* Router + init. One container, one render pass, one scroll binding. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var TABS = ['home', 'coach', 'train', 'nutrition', 'together'];

  var STUBS = {};

  function current() {
    var h = (location.hash || '#home').slice(1);
    return h || 'home';
  }
  function base(key) { return key.split('/')[0]; }

  function stub(key) {
    var s = STUBS[key];
    return UI.screen({
      tab: null, rest: 260, blur: true,
      header: { back: true, title: s.title, right: '<div style="width:34px"></div>' },
      body:
        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">Not ported yet</div>' +
          '<p class="lede">' + UI.esc(s.title) + ' is designed but still lives in the design file.</p>' +
          '<p class="small" style="margin-top:12px">Port from <code>' + UI.esc(s.file) + '</code>. Strip the state-switcher buttons and the duplicated header and nav; keep everything inside the phone frame.</p>' +
        '</article>'
    });
  }

  function render() {
    var key = current(), root = base(key);
    var html;

    if (!Store.state().onboarded) { app.innerHTML = ''; return; }

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
    else if (STUBS[root]) html = stub(root);
    else { location.hash = '#home'; return; }

    app.innerHTML = html;
    UI.bindScroll(app);
    if (window.Media) Media.paint(app);
    maybeBadge(key);

    /* Every photo screen measures where its sheet rests. A constant cannot
       survive copy changes or a shorter viewport: too small and the next card
       peeks above the nav, too large and the first card is clipped behind it. */
    measureRest();
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

  app.addEventListener('change', function (e) {
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
      Store.updateMeal(currentMealId(), { photo: '' });
      render();
      return;
    }

    if (e.target.closest('[data-meal-photo]')) {
      Media.capture(function (err, dataUrl) {
        if (err) return;
        Media.shrink(dataUrl, 1100, 0.8, function (e2, small) {
          Store.updateMeal(currentMealId(), { photo: e2 ? dataUrl : small });
          render();
        });
      });
      return;
    }

    if (e.target.closest('[data-meal-delete]')) {
      var m = Store.findMeal(currentMealId());
      if (!m) return;
      if (!confirm('Delete \u201c' + m.meal.name + '\u201d? This takes it off the day.')) return;
      Store.removeMeal(currentMealId());
      history.back();
      return;
    }
  });

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-route],[data-back],[data-action]');
    if (!el) return;

    if (el.hasAttribute('data-back')) { history.back(); return; }

    var route = el.getAttribute('data-route');
    if (route) {
      // Opening Together is how her note stops being news.
      if (route === 'together') {
        var pd = Store.state().partnerData;
        if (pd && pd.note) Store.set('partnerNoteSeen', pd.date + '|' + pd.note);
      }
      location.hash = '#' + route;
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
      var day = Store.day();
      day.noteToPartner = text;
      Store.save();
      el.disabled = true;
      el.textContent = 'Sending\u2026';
      if (!Cloud.hasGit()) {
        el.disabled = false;
        render();
        return;
      }
      Cloud.push(function (err) {
        if (!err) {
          var d2 = Store.day();
          d2.noteSentAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          Store.save();
        }
        render();
      });
      return;
    }

    // ---- progress photos -------------------------------------------------
    if (action === 'take-photo') {
      Media.capture(function (err, dataUrl) {
        if (err) return;
        Media.shrink(dataUrl, 1100, 0.8, function (e2, small) {
          if (e2) return;
          var id = 'p' + Date.now();
          Media.put(id, small, function (e3) {
            if (e3) return;
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
      Media.del(pid, function () {
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
    if (action === 'tick-shop') {
      var item = el.getAttribute('data-item').toLowerCase();
      var t = Object.assign({}, Store.state().shopTicked || {});
      if (t[item]) delete t[item]; else t[item] = true;
      Store.set('shopTicked', t);
      return;
    }
    if (action === 'clear-plan') {
      if (confirm('Clear every planned meal for the week?')) {
        Store.set('mealPlan', {});
        Store.set('shopTicked', {});
      }
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
        Store.wipe(function () {
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
      var w = Store.weightToLb(parseFloat(wEl && wEl.value) || 0);
      var r = parseInt(rEl && rEl.value, 10) || 0;
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

    if (action === 'seed') {
      if (confirm('This overwrites the last eleven days with invented data, including anything you logged. Continue?')) {
        Store.seed();
        location.hash = '#home';
      }
      return;
    }
    if (action === 'export') {
      var blob = new Blob([JSON.stringify(Store.state(), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'insync-' + Store.todayKey() + '.json';
      a.click();
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
    if (action === 'log-meal') { Log.open('meal'); return; }
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
    if (action === 'advance-leg') { Store.advanceLeg(); location.hash = '#arrival'; return; }

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
    /* His name carries the avatar's initials with it. */
    if (el.hasAttribute('data-name')) { Store.setProfileName(el.value); return; }
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
    Store.set(el.getAttribute('data-set'), el.value);
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
  var deferred = false;
  function editing() {
    var el = document.activeElement;
    return !!el && app.contains(el) &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }
  function safeRender() {
    if (editing()) { deferred = true; return; }
    render();
  }
  document.addEventListener('focusout', function () {
    if (!deferred) return;
    deferred = false;
    setTimeout(function () { if (!editing()) render(); }, 0);
  });

  window.addEventListener('hashchange', render);
  Store.on(safeRender);

  window.App = { render: render };

  if (!Store.state().onboarded) Onboarding.start();

  render();

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
    navigator.serviceWorker.register('sw.js').catch(function () {});
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

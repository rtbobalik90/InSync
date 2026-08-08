/* Router + init. One container, one render pass, one scroll binding. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var TABS = ['home', 'coach', 'train', 'nutrition', 'together'];

  var STUBS = {
    records: { title: 'Records', file: 'Train - Records.dc.html' },
    body: { title: 'Body', file: 'Body.dc.html' },
    badges: { title: 'Badges', file: 'Badges.dc.html' },
    notifications: { title: 'Notifications', file: 'Together - Handshake.dc.html' },
    reflection: { title: 'Reflection', file: 'reflection.dc.html' }
  };

  function current() {
    var h = (location.hash || '#home').slice(1);
    return h || 'home';
  }

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
    var key = current();
    var html;

    if (!Store.state().onboarded) { app.innerHTML = ''; return; }

    if (TABS.indexOf(key) >= 0) html = Screens[key]();
    else if (key === 'settings') html = Screens.settings();
    else if (STUBS[key]) html = stub(key);
    else { location.hash = '#home'; return; }

    app.innerHTML = html;
    UI.bindScroll(app);

    // Home measures its rest position rather than trusting a constant.
    if (key === 'home') {
      requestAnimationFrame(function () {
        var first = app.querySelector('.stack > .card');
        if (first) UI.restFor(app, '.stack > .card', 14);
      });
    }
  }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-route],[data-back],[data-action]');
    if (!el) return;

    if (el.hasAttribute('data-back')) { history.back(); return; }

    var route = el.getAttribute('data-route');
    if (route) { location.hash = '#' + route; return; }

    var toggle = el.getAttribute('data-toggle');
    if (toggle) {
      var parts = toggle.split('.'), o = Store.state();
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      Store.set(toggle, !o[parts[parts.length - 1]]);
      return;
    }

    var action = el.getAttribute('data-action');
    if (action === 'reset') {
      if (confirm('Clear everything on this device and start over?')) {
        localStorage.removeItem('insync.v5');
        location.hash = '#home';
        location.reload();
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
      Store.set('connections.lastSync', new Date().toLocaleString());
      return;
    }
    if (action === 'log-meal') {
      Store.addMeal({ name: 'Chicken and quinoa bowl', slot: 'Dinner', time: nowTime(), kcal: 592, protein: 71, carbs: 43, fat: 22, photo: 'assets/art/meal-example.jpg' });
    } else if (action === 'start-session') {
      Store.addWorkout({ name: 'Push day', minutes: 46 });
    }
  });

  function nowTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // Text and key fields write straight through to the store on blur.
  app.addEventListener('change', function (e) {
    var el = e.target.closest('[data-set]');
    if (!el) return;
    Store.set(el.getAttribute('data-set'), el.value);
  });

  window.addEventListener('hashchange', render);
  Store.on(render);

  window.App = { render: render };

  if (!Store.state().onboarded) Onboarding.start();

  render();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();

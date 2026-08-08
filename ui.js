/* Shared chrome — the header, the nav, the photo-and-sheet construction.
   Every screen uses these instead of carrying its own copy. */
(function () {
  'use strict';

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M6 10v10h12V10"/></svg>',
    coach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 5.5h15v11h-9l-4 3.5v-3.5h-2z"/><path d="M9 10h6"/><path d="M9 13h3.5"/></svg>',
    train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12h8"/><path d="M6 8v8M18 8v8"/><path d="M3.5 10v4M20.5 10v4"/></svg>',
    nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18c0 5-4 8.5-9 8.5S3 16 3 11Z"/><path d="M12.5 10.5c0-2.8 1.8-5 4.5-5.5"/></svg>',
    together: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20c0-3.6 2.5-5.5 5.5-5.5s5.5 1.9 5.5 5.5"/><path d="M16 14.5c3 0 5.5 1.9 5.5 5.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 8.5h15v10.5h-15z"/><path d="M9 8.5 10.5 5h3L15 8.5"/><circle cx="12" cy="13.5" r="3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 10.5h13v9h-13z"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 8 9h8l-4-6Z"/><path d="M12 9v12"/><path d="M7 21h10"/></svg>'
  };

  var TABS = [
    { key: 'home', label: 'Home' },
    { key: 'coach', label: 'Coach' },
    { key: 'train', label: 'Train' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'together', label: 'Together' }
  ];

  var CAMP = {
    dawn: 'assets/art/camp-dawn.jpg',
    day: 'assets/art/camp-day.jpg',
    sunset: 'assets/art/camp-sunset.jpg',
    night: 'assets/art/camp-night.jpg'
  };

  /* Dark where the text sits, clear where the camp does. */
  var SCRIM = 'linear-gradient(180deg,rgba(10,12,8,.68) 0%,rgba(10,12,8,.54) 18%,rgba(10,12,8,.3) 32%,rgba(10,12,8,.06) 46%,rgba(20,21,15,.72) 74%,#14150F 92%)';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(name) { return ICONS[name] || ''; }

  /* Resolves an asset path against the standalone bundle when there is one,
     and returns the path untouched when there isn't. */
  function asset(p) {
    if (!p) return p;
    var id = p.split('/').pop().replace(/\.[^.]+$/, '');
    var r = window.__resources;
    return (r && r[id]) || p;
  }

  function header(opts) {
    opts = opts || {};
    var left = opts.back
      ? '<button class="iconbtn" data-back aria-label="Back">' + icon('back') + '</button>'
      : '<div class="wordmark">InSync</div>';
    var right = opts.right != null ? opts.right :
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<button class="iconbtn" data-route="notifications" aria-label="Notifications">' + icon('bell') + '</button>' +
        '<button class="avatar" data-route="settings" aria-label="Settings">' + esc(Store.state().profile.initials) + '</button>' +
      '</div>';
    var mid = opts.title ? '<div class="wordmark">' + esc(opts.title) + '</div>' : '';
    return '<div class="header">' + left + mid + right + '</div>';
  }

  function nav(active) {
    return '<nav class="nav">' + TABS.map(function (t) {
      var on = t.key === active;
      return '<button data-route="' + t.key + '"' + (on ? ' aria-current="page"' : '') +
        ' aria-label="' + t.label + '"><i></i>' + icon(t.key) + '</button>';
    }).join('') + '</nav>';
  }

  /* photo + overlay + sheet. restPx is where the sheet's content begins —
     measured against the nav so the first card always clears it. */
  function screen(opts) {
    var art = asset(opts.art || CAMP[Store.timeOfDay()]);
    var photoStyle = 'background-image:' + SCRIM + ',url(\'' + art + '\')';
    if (opts.photoHeight) photoStyle += ';height:' + opts.photoHeight;
    if (opts.photoPosition) photoStyle += ';background-position:' + opts.photoPosition;

    return '<section class="screen">' +
      '<div class="photo' + (opts.blur ? ' blurred' : '') + '" style="' + photoStyle + '"></div>' +
      header(opts.header || {}) +
      (opts.overlay ? '<div class="overlay">' + opts.overlay + '</div>' : '') +
      '<div class="sheet"><div class="spacer" style="height:' + (opts.rest || 470) + 'px"></div>' +
        '<div class="stack">' + opts.body + '</div>' +
      '</div>' +
      nav(opts.tab) +
    '</section>';
  }

  /* The photo blurs and the overlay fades as the sheet rises. */
  function bindScroll(root) {
    var sheet = root.querySelector('.sheet');
    if (!sheet) return;
    var photo = root.querySelector('.photo');
    var fades = root.querySelectorAll('.overlay');
    var RANGE = 300;
    function onScroll() {
      var p = Math.min(1, Math.max(0, sheet.scrollTop / RANGE));
      if (photo && !photo.classList.contains('blurred')) {
        photo.style.filter = 'blur(' + (p * 16).toFixed(2) + 'px)';
        photo.style.transform = 'scale(' + (1 + p * 0.04).toFixed(4) + ')';
      }
      var o = Math.max(0, 1 - p * 1.9).toFixed(3);
      Array.prototype.forEach.call(fades, function (el) { el.style.opacity = o; });
    }
    onScroll();
    sheet.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Sheet rest position measured, never hardcoded: the named card's bottom
     lands one clearance above the nav, whatever the copy does to its height. */
  function restFor(root, selector, clearance) {
    var sheet = root.querySelector('.sheet');
    var card = root.querySelector(selector);
    var navEl = root.querySelector('.nav');
    if (!sheet || !card || !navEl) return;
    var spacer = sheet.querySelector('.spacer');
    var avail = navEl.getBoundingClientRect().top - (clearance == null ? 14 : clearance);
    var h = card.getBoundingClientRect().height;
    spacer.style.height = Math.max(180, Math.round(avail - h)) + 'px';
  }

  window.UI = {
    icon: icon, esc: esc, asset: asset, header: header, nav: nav, screen: screen,
    bindScroll: bindScroll, restFor: restFor, CAMP: CAMP, TABS: TABS
  };
})();

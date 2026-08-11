/* Shared chrome — the header, the nav, the photo-and-sheet construction.
   Every screen uses these instead of carrying its own copy. */
(function () {
  'use strict';

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M6 10v10h12V10"/></svg>',
    coach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 5.5h15v11h-9l-4 3.5v-3.5h-2z"/><path d="M9 10h6"/><path d="M9 13h3.5"/></svg>',
    journey: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19 9 9l3 5 3-4 5 9"/><path d="M4 19h16"/><path d="M12 4v5"/><path d="m9.5 6.5 2.5-2.5 2.5 2.5"/></svg>',
    train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12h8"/><path d="M6 8v8M18 8v8"/><path d="M3.5 10v4M20.5 10v4"/></svg>',
    nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18c0 5-4 8.5-9 8.5S3 16 3 11Z"/><path d="M12.5 10.5c0-2.8 1.8-5 4.5-5.5"/></svg>',
    together: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20c0-3.6 2.5-5.5 5.5-5.5s5.5 1.9 5.5 5.5"/><path d="M16 14.5c3 0 5.5 1.9 5.5 5.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 8.5h15v10.5h-15z"/><path d="M9 8.5 10.5 5h3L15 8.5"/><circle cx="12" cy="13.5" r="3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    barcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6v12M7.5 6v12M11 6v9M14 6v12M17.5 6v9M20 6v12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 7h13M9.5 7V5h5v2M7 7l1 12h8l1-12"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    fork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v7a2 2 0 0 0 4 0V3"/><path d="M9 10v11"/><path d="M16.5 3c-1.5 2-1.5 5-1.5 7h3c0-2 0-5-1.5-7Z"/><path d="M16.5 10v11"/></svg>',
    quill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4c-7 1-11 5-13 9l-2.5 6.5"/><path d="M8 16c5 1 10-3 12-12"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.8c-2.2-2.2-5.8-1.8-7.8.6L12 7.6l-1-1.2c-2-2.4-5.6-2.8-7.8-.6-2.5 2.5-2.2 6.4.2 8.8L12 22l8.6-7.4c2.4-2.4 2.7-6.3.2-8.8Z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 10.5h13v9h-13z"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/></svg>',
    place: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3Z"/><path d="M17 7.5h2v12"/></svg>',
    basket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9h17l-1.5 10.5h-14z"/><path d="M8.5 9 12 3.5 15.5 9"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V4"/><path d="M4 19.5h16"/><path d="M7.5 16l4-5 3 3 4.5-6.5"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 8 9h8l-4-6Z"/><path d="M12 9v12"/><path d="M7 21h10"/></svg>'
  };

  var TABS = (window.InSyncDomains && InSyncDomains.primary) ? InSyncDomains.primary : [
    { key: 'home', label: 'Home' },
    { key: 'journey', label: 'Journey' },
    { key: 'train', label: 'Train' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'together', label: 'Together' }
  ];

  var CAMP = {
    dawn: 'assets/art/camp-dawn.webp',
    day: 'assets/art/camp-day.webp',
    sunset: 'assets/art/camp-sunset.webp',
    night: 'assets/art/camp-night.webp'
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

  /* Three bell states: quiet, new information, and an unresolved action.
     Informational items are marked read by opening the Notification Centre;
     actions stay counted until the underlying task is actually resolved. */
  function notificationStatus() {
    if (window.Screens && Screens.notificationStatus) return Screens.notificationStatus();
    var pending = (window.Screens && Screens.pendingCount) ? Screens.pendingCount() : 0;
    return { action: pending, info: 0 };
  }

  function bellButton() {
    var n = notificationStatus();
    var state = n.action ? ' has-action' : (n.info ? ' has-info' : '');
    var label = n.action
      ? 'Notifications, ' + n.action + ' need' + (n.action === 1 ? 's' : '') + ' your attention'
      : (n.info ? 'Notifications, new activity' : 'Notifications');
    var mark = n.action
      ? '<span class="notifcount">' + (n.action > 9 ? '9+' : n.action) + '</span>'
      : (n.info ? '<span class="notifdot"></span>' : '');
    return '<button class="iconbtn notifbell' + state + '" data-route="notifications" aria-label="' + esc(label) + '">' + icon('bell') + mark + '</button>';
  }

  function header(opts) {
    opts = opts || {};
    var backTarget = typeof opts.back === 'string' ? opts.back : '';
    var left = opts.back
      ? '<button class="iconbtn" data-back="' + esc(backTarget) + '" aria-label="Back">' + icon('back') + '</button>'
      : '<div class="wordmark">InSync</div>';
    var here = (location.hash || '').replace('#', '').split('/')[0];
    var right = opts.right != null ? opts.right :
      '<div style="display:flex;align-items:center;gap:8px">' +
        (here === 'coach' ? '' :
          '<button class="iconbtn coach-access" data-route="coach" aria-label="Open Coach">' + icon('coach') + '</button>') +
        (here === 'notifications' ? '' : bellButton()) +
        (here === 'settings' ? '' :
          '<button class="avatar" data-route="settings" aria-label="Settings">' + esc(Store.state().profile.initials) + '</button>') +
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
    var fallback = opts.artFallback ? asset(opts.artFallback) : '';
    var scrim = opts.scrim || SCRIM;
    /* Expedition art is produced independently from code. Reserved v2 paths
       ship as tiny transparent WebP placeholders over a known-good fallback.
       Dropping the finished art over the same path immediately replaces that
       transparent layer without changing screen code. */
    var photoStyle = 'background-image:' + scrim + ',url(\'' + art + '\')' +
      (fallback && fallback !== art ? ',url(\'' + fallback + '\')' : '');
    if (opts.photoHeight) photoStyle += ';height:' + opts.photoHeight;
    if (opts.photoPos) photoStyle += ';background-position:' + opts.photoPos;
    if (opts.photoPosition) photoStyle += ';background-position:' + opts.photoPosition;

    return '<section class="screen">' +
      '<div class="photo' + (opts.blur ? ' blurred' : '') + '"' + (opts.photoId ? ' data-photo="' + esc(opts.photoId) + '"' : '') + ' style="' + photoStyle + '"></div>' +
      header(opts.header || {}) +
      (opts.overlay ? '<div class="overlay">' + opts.overlay + '</div>' : '') +
      '<div class="sheet"' + (opts.restMeasure ? ' data-measure="1"' : '') + '><div class="spacer" style="height:' + (opts.rest || 470) + 'px"></div>' +
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

  /* Sheet rest position measured, never hardcoded: the sheet's first element
     lands one stack-gap above the nav, so it is fully visible and whatever
     follows begins exactly at the nav rather than peeking above it. */
  function restFor(root) {
    var sheet = root.querySelector('.sheet');
    var navEl = root.querySelector('.nav');
    if (!sheet || !navEl || !sheet.hasAttribute('data-measure')) return;
    var stack = sheet.querySelector(':scope > .stack') || sheet.querySelector('.stack');
    /* A screen can name which element should end at the fold; otherwise the
       sheet rests on whatever it opens with. */
    var anchor = stack && stack.querySelector('[data-rest-anchor]');
    var first = anchor || (stack && stack.firstElementChild);
    var spacer = sheet.querySelector('.spacer');
    if (!first || !spacer) return;

    /* A section label with nothing beneath it is not a resting state — if the
       sheet opens on a rulehead, rest on the card it introduces. */
    var last = first;
    if (!anchor && /rulehead/.test(first.className) && first.nextElementSibling) last = first.nextElementSibling;

    var gap = parseFloat(getComputedStyle(stack).rowGap) || 12;
    var navTop = navEl.getBoundingClientRect().top;
    var stackTop = stack.getBoundingClientRect().top;
    var sheetTop = sheet.getBoundingClientRect().top;
    var spacerH = parseFloat(spacer.style.height) || 0;
    var groupH = last.getBoundingClientRect().bottom - stackTop;
    var avail = navTop - sheetTop - gap;

    /* A tall first card would otherwise be pushed up over the hero, hiding the
       verse or the meal's name. The overlay's own bottom is the floor. */
    var floor = 160;
    var ov = root.querySelector('.overlay');
    if (ov) floor = Math.max(floor, Math.round(ov.getBoundingClientRect().bottom - sheetTop + gap));

    spacer.style.height = Math.max(floor, Math.round(avail - groupH)) + 'px';
  }


  /* "Thursday · Day 11" — the journal stamp used across the app. */
  function dayLabel() {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()] + ' \u00b7 Day ' + Store.daysIn();
  }

  window.UI = {
    icon: icon, esc: esc, asset: asset, header: header, nav: nav, screen: screen,
    bindScroll: bindScroll, restFor: restFor, dayLabel: dayLabel, CAMP: CAMP, TABS: TABS
  };
})();

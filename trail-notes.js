/* Notes from the Trail — local release journal + story wrapper.
   Facts are static release entries. AI may only rewrite those supplied facts
   into a short trail-journal paragraph; it never decides what changed. */
(function () {
  'use strict';

  var ENTRIES = [
    {
      id: 'p5.3-checkpoints', version: '6.0.0-p5.3', date: '2026-08-11',
      title: 'The route learned to remember places.',
      summary: 'Checkpoint arrivals became real destinations instead of mileage markers.',
      details: [
        'Every expedition now has a starting checkpoint, active travel legs, and unlockable arrival checkpoints.',
        'Unlocked checkpoints open their own destination page with route details and arrival history.',
        'The final checkpoint and the expedition completion ceremony are separate moments.'
      ]
    },
    {
      id: 'p5.4-grand-canyon', version: '6.0.0-p5.4', date: '2026-08-11',
      title: 'The Grand Canyon moved into camp.',
      summary: 'The first full expedition art pack now changes the world across the app.',
      details: [
        'Grand Canyon artwork now powers Home, Journey, Train, Nutrition, Together, Coach, Base Camp, travel legs, checkpoints and final arrival.',
        'Home changes between dawn, day, dusk and night artwork with the time of day.',
        'The artwork uses the expedition asset slots so future expeditions can be dropped in without rebuilding the feature.'
      ]
    },
    {
      id: 'p5.8-training-polish', version: '6.0.0-p5.8', date: '2026-08-11',
      title: 'Training camp got easier to read.',
      summary: 'The weekly plan became the doorway, and the workout details moved into each day.',
      details: [
        'Train opens on This Week with previous and next week navigation.',
        'Readiness, the walk timer and workout movements appear after opening a specific day.',
        'Past days can be corrected, including steps, while future days remain locked.',
        'The expedition artwork and card transitions were refined for the installed iPhone experience.'
      ]
    },
    {
      id: 'p6.0-together', version: '6.0.0-p6.0', date: '2026-08-11',
      title: 'The two-person trail found its rhythm.',
      summary: 'Together now has its own way of working as a pair, not just a shared status screen.',
      details: [
        'Together can be Cooperative, Competitive or Quiet Support on each person’s own phone.',
        'Duo Missions create bounded shared goals without changing health targets or training progression.',
        'Weekly Campfire reviews the week and prepares training, meals, Shared Dinner and a shared intention for the next one.',
        'Quick Encouragement lets one person send a small useful note without opening a scoreboard.'
      ]
    },
    {
      id: 'p6.1-followthrough', version: '6.0.0-p6.1', date: '2026-08-11',
      title: 'The Campfire learned when to leave.',
      summary: 'A completed weekly review now gets out of the way and becomes part of the record.',
      details: [
        'Closing a Campfire dismisses it only on the phone that closed it; the partner closes their own review separately.',
        'After closure, the current expedition leg moves into the prime Together position.',
        'Closed Campfires are retained in History & Calendar as read-only weekly records.',
        'Together styles now visibly reorganize the page, and Quick Encouragement reports saved, syncing and delivered states.'
      ]
    },
    {
      id: 'p6.2-trail-notes', version: '6.0.0-p6.2', date: '2026-08-11',
      title: 'Notes from the Trail arrived.',
      summary: 'InSync now tells you what changed while you were away.',
      details: [
        'Unseen app updates stack locally until that person clears them.',
        'Each update can be cleared on its own, or all unseen updates can be cleared together.',
        'Closing the popup hides it only for the current app session; uncleared notes return the next time InSync opens.',
        'View Trail Notes opens the complete release journal with the plain-language details behind each story.',
        'When Claude is available, it can turn only the exact supplied release facts into a short field-journal story. The deterministic fallback remains available offline.'
      ]
    }
  ];

  function esc(s) {
    if (window.UI && UI.esc) return UI.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function state() {
    var s = Store.state();
    if (!s.appUpdates || typeof s.appUpdates !== 'object') s.appUpdates = { seen: [], storyCache: { key: '', text: '' } };
    if (!Array.isArray(s.appUpdates.seen)) s.appUpdates.seen = [];
    if (!s.appUpdates.storyCache || typeof s.appUpdates.storyCache !== 'object') s.appUpdates.storyCache = { key: '', text: '' };
    return s.appUpdates;
  }

  function all() { return ENTRIES.slice(); }
  function unseen() {
    var seen = state().seen;
    return ENTRIES.filter(function (n) { return seen.indexOf(n.id) < 0; });
  }
  function seen(id) { return state().seen.indexOf(id) >= 0; }

  function persistSeen(list) {
    var u = state();
    u.seen = list.slice(-240);
    u.storyCache = { key: '', text: '' };
    return Store.save();
  }
  function dismiss(id) {
    if (!ENTRIES.some(function (n) { return n.id === id; })) return false;
    var list = state().seen.slice();
    if (list.indexOf(id) < 0) list.push(id);
    return persistSeen(list);
  }
  function clearAll() {
    var list = state().seen.slice();
    unseen().forEach(function (n) { if (list.indexOf(n.id) < 0) list.push(n.id); });
    return persistSeen(list);
  }

  function keyFor(list) { return (list || unseen()).map(function (n) { return n.id; }).join('|'); }
  function fallbackStory(list) {
    list = list || unseen();
    if (!list.length) return 'The trail is quiet. You are caught up.';
    if (list.length === 1) return 'One thing changed while you were away. ' + list[0].summary + ' The full field note is waiting below.';
    var first = list[0], last = list[list.length - 1];
    return 'A few things shifted on the trail while you were away. ' + first.summary + ' Since then, ' + last.summary.charAt(0).toLowerCase() + last.summary.slice(1) + ' The exact field notes are stacked below.';
  }
  function cachedStory(list) {
    var c = state().storyCache || {};
    return c.key === keyFor(list) && c.text ? c.text : '';
  }
  function saveStory(list, text) {
    text = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 900);
    if (!text) return false;
    state().storyCache = { key: keyFor(list), text: text };
    return Store.save();
  }

  function factsText(list) {
    return (list || []).map(function (n, i) {
      return (i + 1) + '. ' + n.title + '\nSummary: ' + n.summary + '\nDetails:\n- ' + n.details.join('\n- ');
    }).join('\n\n');
  }

  function modal(list, story) {
    list = list || unseen();
    if (!list.length) return '';
    story = story || cachedStory(list) || fallbackStory(list);
    return '<div class="trail-notes-layer" role="dialog" aria-modal="true" aria-labelledby="trail-notes-title">' +
      '<div class="trail-notes-scrim"></div>' +
      '<section class="trail-notes-card">' +
        '<div class="trail-notes-head">' +
          '<div><div class="kicker gold">Notes from the Trail</div><h2 id="trail-notes-title">While you were away.</h2></div>' +
          '<button class="trail-clear-all" type="button" data-action="trail-notes-clear-all">Clear all</button>' +
        '</div>' +
        '<div class="trail-notes-body">' +
          '<div class="trail-story"><span class="trail-story-mark">✦</span><p data-trail-story>' + esc(story) + '</p></div>' +
          '<div class="trail-notes-count">' + list.length + ' unread trail note' + (list.length === 1 ? '' : 's') + '</div>' +
          '<div class="trail-note-stack">' + list.map(function (n) {
            return '<article class="trail-note-item" data-trail-note="' + esc(n.id) + '">' +
              '<button class="trail-note-x" type="button" data-action="trail-note-dismiss" data-id="' + esc(n.id) + '" aria-label="Clear ' + esc(n.title) + '">×</button>' +
              '<div class="trail-note-version">' + esc(n.version) + '</div>' +
              '<h3>' + esc(n.title) + '</h3>' +
              '<p>' + esc(n.summary) + '</p>' +
            '</article>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="trail-notes-foot">' +
          '<button class="btn ghost" type="button" data-action="trail-notes-close">Close</button>' +
          '<button class="btn" type="button" data-action="trail-notes-view">View Trail Notes</button>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  function screen() {
    var notes = ENTRIES.slice().reverse();
    var art = (window.InSyncTheme && InSyncTheme.resolve) ? InSyncTheme.resolve('journey', UI.CAMP[Store.timeOfDay()]) : UI.CAMP[Store.timeOfDay()];
    var unread = unseen().length;
    var body = '<article class="card pad trail-journal-intro">' +
      '<div class="kicker sage">Field journal</div>' +
      '<p class="lede" style="margin:9px 0 0">What changed in InSync, written for the trail instead of a software changelog.</p>' +
      (unread ? '<button class="btn ghost block" style="margin-top:14px" data-action="trail-notes-clear-all">Clear ' + unread + ' unread note' + (unread === 1 ? '' : 's') + '</button>' : '<p class="small" style="margin:12px 0 0">You are caught up.</p>') +
    '</article>' + notes.map(function (n) {
      var isRead = seen(n.id);
      return '<article class="card trail-journal-entry' + (isRead ? '' : ' unread') + '">' +
        '<div class="cardhead"><div class="title"><i></i>' + esc(n.title) + '</div><div class="meta">' + (isRead ? 'Read' : 'New') + '</div></div>' +
        '<div class="pad-x" style="padding-top:14px;padding-bottom:16px">' +
          '<div class="trail-note-version">' + esc(n.version) + ' · ' + esc(n.date) + '</div>' +
          '<p class="lede" style="font-size:17px;margin:8px 0 11px">' + esc(n.summary) + '</p>' +
          '<ul class="plainlist">' + n.details.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
          (!isRead ? '<button class="btn ghost sm" style="margin-top:13px" data-action="trail-note-dismiss" data-id="' + esc(n.id) + '">Mark read</button>' : '') +
        '</div>' +
      '</article>';
    }).join('');
    return UI.screen({
      tab: null, rest: 310, photoHeight: '430px', screenClass: 'trail-notes-screen',
      header: { back: 'home', title: 'Trail Notes', right: '<div style="width:44px"></div>' },
      art: art, scrim: UI.SCRIMS.light, photoPosition: 'center 45%',
      overlay: '<div class="eyebrow">Notes from the Trail</div><p class="verse" style="font-size:26px">The road changes. The record stays.</p>',
      body: body
    });
  }

  window.InSyncTrailNotes = {
    version: '1.0.0', all: all, unseen: unseen, seen: seen, dismiss: dismiss, clearAll: clearAll,
    keyFor: keyFor, fallbackStory: fallbackStory, cachedStory: cachedStory, saveStory: saveStory,
    factsText: factsText, modal: modal, screen: screen
  };
})();

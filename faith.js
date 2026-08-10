/* InSync Faith Foundation.
   Faith is a first-class formation domain, but never a competitive score.
   Private prayer/reflection content stays local unless a single prayer request
   is explicitly selected for partner sharing. */
(function () {
  'use strict';

  var MEMORY_INTERVALS = [1, 3, 7, 14, 30, 60, 90];
  var PRAYER_CATEGORIES = ['General', 'Faith', 'Family', 'Relationship', 'Work', 'Health', 'Other'];
  var RULE_FIELDS = ['worship', 'scripture', 'prayer', 'rest', 'exercise', 'mealPrep', 'relationship'];

  function s() { return Store.state(); }
  function fs() { return s().faith || {}; }
  function clean(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n || 5000); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nowIso() { return new Date().toISOString(); }
  function id(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  function memory() { return Array.isArray(fs().memory) ? fs().memory : []; }
  function memoryItem(mid) { return memory().find(function (m) { return m.id === mid; }) || null; }
  function isDue(m, key) { return !!m && !!m.reviewDue && m.reviewDue <= (key || Store.todayKey()); }
  function memoryStatus(m) {
    if (!m) return 'Learning';
    if (isDue(m)) return 'Review due';
    if ((m.intervalDays || 0) >= 14 || m.stage >= 6) return 'Memorized';
    if (m.stage >= 4 || (m.intervalDays || 0) >= 3) return 'Familiar';
    return 'Learning';
  }
  function dueMemory() { return memory().filter(function (m) { return isDue(m); }); }
  function memorizedCount() { return memory().filter(function (m) { return memoryStatus(m) === 'Memorized'; }).length; }

  function addVerse(v) {
    v = v || (Store.verse && Store.verse());
    if (!v || !clean(v.text, 1600) || !clean(v.ref, 160)) return null;
    var existing = memory().find(function (m) { return m.ref === clean(v.ref,160) && m.text === clean(v.text,1600); });
    if (existing) return existing;
    var list = memory().slice();
    var item = {
      id: id('verse'), ref: clean(v.ref,160), text: clean(v.text,1600), createdAt: nowIso(),
      stage: 1, intervalDays: 0, reviewDue: '', lastReviewedAt: '', reviews: 0,
      typedAccuracy: null
    };
    list.push(item); Store.set('faith.memory', list); return item;
  }

  function advanceMemory(mid) {
    var list = memory().slice(), found = null;
    list = list.map(function (m) {
      if (m.id !== mid) return m;
      found = Object.assign({}, m, { stage: Math.min(5, Math.max(1, (+m.stage || 1) + 1)) });
      return found;
    });
    if (found) Store.set('faith.memory', list);
    return found;
  }

  function words(text) { return clean(text, 5000).split(/\s+/).filter(Boolean); }
  function hideWords(text, density) {
    density = Math.max(2, Math.min(5, +density || 3));
    return words(text).map(function (w, i) {
      if ((i + 1) % density !== 0) return w;
      var lead = w.match(/^[^A-Za-z0-9]*/)[0], tail = w.match(/[^A-Za-z0-9]*$/)[0];
      var core = w.slice(lead.length, w.length - tail.length);
      return lead + (core ? '____' : '') + tail;
    }).join(' ');
  }
  function firstLetters(text) {
    return words(text).map(function (w) {
      var m = w.match(/[A-Za-z0-9]/); return m ? m[0] + '…' : w;
    }).join(' ');
  }
  function normalized(text) { return clean(text, 10000).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(); }
  function typedAccuracy(expected, typed) {
    var a = normalized(expected).split(' ').filter(Boolean), b = normalized(typed).split(' ').filter(Boolean);
    if (!a.length) return 0;
    var hits = 0, max = Math.max(a.length, b.length);
    for (var i = 0; i < max; i++) if (a[i] && b[i] && a[i] === b[i]) hits++;
    return Math.max(0, Math.min(1, hits / a.length));
  }
  function checkTyped(mid, typed) {
    var target = memoryItem(mid); if (!target) return { ok:false, accuracy:0 };
    var accuracy = typedAccuracy(target.text, typed), list = memory().slice();
    list = list.map(function (m) {
      if (m.id !== mid) return m;
      var next = Object.assign({}, m, { typedAccuracy: +accuracy.toFixed(3), lastReviewedAt: nowIso() });
      if (accuracy >= 0.82) next.stage = 5;
      return next;
    });
    Store.set('faith.memory', list);
    return { ok: accuracy >= 0.82, accuracy: accuracy };
  }

  function reviewMemory(mid, rating) {
    rating = ['again','hard','good','easy'].indexOf(rating) >= 0 ? rating : 'good';
    var list = memory().slice(), changed = null;
    list = list.map(function (m) {
      if (m.id !== mid) return m;
      var reviews = Math.max(0, +m.reviews || 0), old = Math.max(0, +m.intervalDays || 0), days;
      if (rating === 'again') days = 1;
      else if (rating === 'hard') days = Math.max(1, old ? Math.round(old * 1.4) : 1);
      else if (rating === 'easy') days = MEMORY_INTERVALS[Math.min(MEMORY_INTERVALS.length - 1, reviews + 2)];
      else days = MEMORY_INTERVALS[Math.min(MEMORY_INTERVALS.length - 1, reviews + 1)];
      changed = Object.assign({}, m, {
        stage: 6, reviews: reviews + 1, intervalDays: days,
        lastReviewedAt: nowIso(), reviewDue: Store.shift(Store.todayKey(), days)
      });
      return changed;
    });
    if (changed) Store.set('faith.memory', list);
    return changed;
  }
  function removeMemory(mid) { Store.set('faith.memory', memory().filter(function (m) { return m.id !== mid; })); }

  function prayers() { return Array.isArray(fs().prayers) ? fs().prayers : []; }
  function prayer(pid) { return prayers().find(function (p) { return p.id === pid; }) || null; }
  function addPrayer(text, category) {
    text = clean(text, 2000); if (!text) return null;
    category = PRAYER_CATEGORIES.indexOf(category) >= 0 ? category : 'General';
    var p = { id:id('prayer'), text:text, category:category, status:'ongoing', createdAt:nowIso(), updatedAt:nowIso(), answeredAt:'', answer:'' };
    var list = prayers().slice(); list.push(p); Store.set('faith.prayers', list); return p;
  }
  function markAnswered(pid, answer) {
    var found = null, list = prayers().map(function (p) {
      if (p.id !== pid) return p;
      found = Object.assign({}, p, { status:'answered', answer:clean(answer,3000), answeredAt:nowIso(), updatedAt:nowIso() }); return found;
    });
    if (found) {
      Store.set('faith.prayers', list);
      if (fs().sharedPrayerId === pid) Store.set('faith.sharedPrayerId', '');
    }
    return found;
  }
  function reopenPrayer(pid) {
    var found = null, list = prayers().map(function (p) {
      if (p.id !== pid) return p;
      found = Object.assign({}, p, { status:'ongoing', answeredAt:'', updatedAt:nowIso() }); return found;
    });
    if (found) Store.set('faith.prayers', list); return found;
  }
  function removePrayer(pid) {
    Store.set('faith.prayers', prayers().filter(function (p) { return p.id !== pid; }));
    if (fs().sharedPrayerId === pid) Store.set('faith.sharedPrayerId', '');
  }
  function sharePrayer(pid) {
    var p = prayer(pid); if (!p || p.status !== 'ongoing') return false;
    Store.set('faith.sharedPrayerId', pid); return true;
  }
  function unsharePrayer(pid) { if (!pid || fs().sharedPrayerId === pid) Store.set('faith.sharedPrayerId', ''); }
  function sharedPrayerPayload() {
    var p = prayer(fs().sharedPrayerId);
    if (!p || p.status !== 'ongoing') return null;
    return { id:p.id, text:p.text, category:p.category, createdAt:p.createdAt };
  }
  function partnerSharedPrayer() {
    var pd = s().partnerData; return pd && pd.sharedPrayer ? clone(pd.sharedPrayer) : null;
  }
  function ackPartnerPrayer(pid) {
    var incoming = partnerSharedPrayer(); if (!incoming || incoming.id !== pid) return false;
    var acks = Object.assign({}, fs().partnerPrayerAcks || {}); acks[pid] = nowIso(); Store.set('faith.partnerPrayerAcks', acks); return true;
  }
  function sharedPrayerAcks() {
    var acks = fs().partnerPrayerAcks || {};
    return Object.keys(acks).slice(-80).map(function (pid) { return { id:pid, at:acks[pid] }; });
  }
  function prayedForPartner(pid) { return !!((fs().partnerPrayerAcks || {})[pid]); }
  function partnerAckForMine(pid) {
    var pd = s().partnerData, a = pd && Array.isArray(pd.prayerAcks) ? pd.prayerAcks : [];
    return a.find(function (x) { return x.id === pid; }) || null;
  }

  function gratitude(key) { key = key || Store.todayKey(); return clean((fs().gratitude || {})[key], 3000); }
  function saveGratitude(text, key) {
    key = key || Store.todayKey(); var g = Object.assign({}, fs().gratitude || {}), t = clean(text, 3000);
    if (t) g[key] = t; else delete g[key]; Store.set('faith.gratitude', g); return t;
  }
  function gratitudeEntries(limit) {
    var g = fs().gratitude || {};
    return Object.keys(g).sort().reverse().slice(0, limit || 30).map(function (k) { return { date:k, text:g[k] }; });
  }

  function isSabbath(key) {
    var sab = fs().sabbath || {}; if (!sab.enabled) return false;
    key = key || Store.todayKey(); var d = new Date(key + 'T12:00:00');
    return d.getDay() === Math.max(0, Math.min(6, +sab.day || 0));
  }
  function setSabbath(enabled, day) {
    var current = Object.assign({ enabled:true, day:0 }, fs().sabbath || {});
    if (typeof enabled === 'boolean') current.enabled = enabled;
    if (day != null && isFinite(+day)) current.day = Math.max(0, Math.min(6, Math.round(+day)));
    Store.set('faith.sabbath', current); return current;
  }

  function ruleOfLife() { return clone(fs().ruleOfLife || {}); }
  function ruleConfiguredCount() {
    var r = fs().ruleOfLife || {};
    return RULE_FIELDS.filter(function (k) { return !!clean(r[k], 1200); }).length;
  }
  function summary() {
    return {
      memoryTotal: memory().length, memoryDue: dueMemory().length, memorized: memorizedCount(),
      prayersOngoing: prayers().filter(function (p) { return p.status === 'ongoing'; }).length,
      prayersAnswered: prayers().filter(function (p) { return p.status === 'answered'; }).length,
      gratitudeCount: Object.keys(fs().gratitude || {}).length,
      sabbathToday: isSabbath(), ruleConfigured: ruleConfiguredCount(), partnerPrayer: partnerSharedPrayer()
    };
  }

  window.Faith = {
    version:'1.0.0', categories:PRAYER_CATEGORIES.slice(), ruleFields:RULE_FIELDS.slice(),
    memory:memory, memoryItem:memoryItem, memoryStatus:memoryStatus, dueMemory:dueMemory, memorizedCount:memorizedCount,
    addVerse:addVerse, advanceMemory:advanceMemory, hideWords:hideWords, firstLetters:firstLetters,
    typedAccuracy:typedAccuracy, checkTyped:checkTyped, reviewMemory:reviewMemory, removeMemory:removeMemory,
    prayers:prayers, prayer:prayer, addPrayer:addPrayer, markAnswered:markAnswered, reopenPrayer:reopenPrayer, removePrayer:removePrayer,
    sharePrayer:sharePrayer, unsharePrayer:unsharePrayer, sharedPrayerPayload:sharedPrayerPayload,
    partnerSharedPrayer:partnerSharedPrayer, ackPartnerPrayer:ackPartnerPrayer, sharedPrayerAcks:sharedPrayerAcks,
    prayedForPartner:prayedForPartner, partnerAckForMine:partnerAckForMine,
    gratitude:gratitude, saveGratitude:saveGratitude, gratitudeEntries:gratitudeEntries,
    isSabbath:isSabbath, setSabbath:setSabbath, ruleOfLife:ruleOfLife, ruleConfiguredCount:ruleConfiguredCount,
    summary:summary
  };
})();

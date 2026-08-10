/* InSync — the single source of truth.
   Rule: nothing that appears on screen is typed. Every figure, count and
   sentence containing a number is derived from this state. */
(function () {
  'use strict';

  /* Schema v10 migrates earlier installs and freezes each logged day’s scoring
     basis so future target or plan changes cannot rewrite history. Connection
     secrets live under a separate local key so backups and state exports cannot
     accidentally include them. */
  var KEY = 'insync.v10';
  var PREVIOUS_KEYS = ['insync.v9', 'insync.v8', 'insync.v7', 'insync.v6', 'insync.v5'];
  var SECRET_KEY = 'insync.secrets.v1';
  var lastSaveError = '';
  var loadError = '';
  var loadWarning = '';
  var corruptRaw = '';
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var COUNTER_CAP = 2;

  var DEFAULT = {
    /* Empty until onboarding, on either phone. Nothing in the app may assume
       whose device this is. */
    profile: { name: '', initials: '', heightIn: 0, age: 0, sex: '', startDate: '', startWeight: null },
    goal: 'lose-fat',
    targets: { calories: 2000, protein: 155, steps: 10000, weightGoal: 196 },
    units: { weight: 'lb', distance: 'mi', energy: 'kcal' },
    privacy: { weight: false, calories: true, workouts: true, steps: true },
    /* Notification-centre preferences. The daily logging
       reminder is deliberately absent: it fires hardest on the worst days. */
    notifs: { invite: true, accept: true, note: true, challengeExpiring: true, leg: true, badge: false },
    /* Stable ids of informational notifications already opened in the centre.
       Action-required items are never cleared merely by viewing them. */
    notificationInfoSeen: [],
    days: {},
    /* No expedition is chosen on a fresh install. The two of them pick the
       first one together, so nothing here may name a route. legStart is the day
       the current leg opened — the miles walked on it are derived from it. */
    expedition: { routeId: '', legIndex: 0, legStart: '', legStartSteps: 0, walked: [], next: '' },
    /* Empty until pairing. Nothing may assume a name, on either phone. */
    partner: { name: '', initials: '' },
    partnerLegMiles: 0,
    invite: null,
    partnerHistory: {},
    partnerLoggedHistory: {},
    earned: [],
    /* Forward-looking badge timestamps. Older earned ids are intentionally not
       backdated during migration; only genuinely new earning moments receive
       a date so weekly reviews never invent badge history. */
    badgeEarnedAt: {},
    photos: [],
    notesSent: 0,
    /* Messages this device has authored. The partner's messages live in partnerData.messages. */
    sentMessages: [],
    frequency: 4,
    partnerData: null,
    coachCache: null,
    /* In-flight AI requests cannot survive a page reload. Normalize this back
       to false at startup so a suspended/closed phone never stays stuck on Thinking. */
    coachPending: false,
    coachChat: null,
    chapters: [],
    verseCache: null,
    plan: [],
    planMeta: {},
    futurePlan: [],
    futurePlanMeta: {},
    mealIdeas: [],
    mealPlan: {},
    mealPlannerWeek: '',
    shopTicked: {},
    /* Meal-prep taste memory stays on this device. Favorites are full recipe
       snapshots so they can be reused even when the original planned week is gone. */
    mealPrefs: { cuisines: [], proteins: [], likes: '', avoid: '', lunchPrepDays: 0, dinnerLeftovers: false, cookDays: [] },
    mealFavorites: [],
    /* Date a recipe was most recently favorited. This lets weekly reviews say
       which favorites were actually added that week instead of guessing from
       the current cookbook. Keys are normalized recipe names. */
    mealFavoriteAt: {},
    mealDislikedMeals: [],
    exercisePrefs: { dislikedIds: [], discomfortIds: [], swapLog: [] },
    weeklyReviews: {},
    weeklyGoals: {},
    reactionsGiven: {},
    /* Base Camp is local-first in Phase 1. Nothing here is sent to the partner
       sync payload yet; later game phases can opt specific public-safe fields in. */
    baseCamp: {
      schema: 1, level: 1, xp: 0, landTier: 1, theme: 'base', allowPartnerVisit: true,
      unlocked: ['base-tent', 'base-fire-ring', 'base-trail-marker'],
      inventory: [], collections: [], expeditionRewards: [],
      placed: [
        { instanceId: 'starter-tent', itemId: 'base-tent', x: 1, y: 1, rotation: 0, variant: 'canvas' },
        { instanceId: 'starter-fire', itemId: 'base-fire-ring', x: 4, y: 3, rotation: 0, variant: 'stone' },
        { instanceId: 'starter-marker', itemId: 'base-trail-marker', x: 0, y: 4, rotation: 0, variant: 'wood' }
      ],
      lastLevelUpAt: ''
    },
    proposal: null,
    lastArrival: null,
    lastFinish: null,
    partnerNoteSeen: '',
    session: null,
    onboarded: false,
    connections: { githubRepo: '', githubBranch: 'main', claudeModel: 'claude-sonnet-5', lastSync: '', lastSyncError: '', lastSyncErrorAt: '' }
  };

  var SECRETS = loadSecrets();
  var S = load();
  migrateSecretsFromState();
  migrateState();

  /* Meals logged before ids existed would otherwise be unopenable. */
  (function backfillMealIds() {
    var changed = false;
    Object.keys(S.days || {}).forEach(function (k) {
      (S.days[k].meals || []).forEach(function (m, i) {
        if (!m.id) { m.id = 'm' + k.replace(/-/g, '') + i; changed = true; }
      });
    });
    if (changed) persistState();
  })();

  function loadSecrets() {
    try { return JSON.parse(localStorage.getItem(SECRET_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function reportSaveError(err, what) {
    lastSaveError = 'Could not save ' + (what || 'your data') + ' on this device. Storage may be full. ' +
      'Nothing should be cleared until you make a backup.';
    try {
      window.dispatchEvent(new CustomEvent('insync-storage-error', {
        detail: { message: lastSaveError, error: String(err || '') }
      }));
    } catch (e) {}
  }

  function saveSecrets() {
    try {
      localStorage.setItem(SECRET_KEY, JSON.stringify(SECRETS));
      return true;
    } catch (e) {
      reportSaveError(e, 'connection keys');
      return false;
    }
  }

  function secret(name) { return String(SECRETS[name] || ''); }
  function setSecret(name, value) {
    SECRETS[name] = String(value || '').trim();
    if (!SECRETS[name]) delete SECRETS[name];
    saveSecrets();
  }

  function load() {
    var keys = [KEY].concat(PREVIOUS_KEYS), sawUnreadable = false;
    for (var i = 0; i < keys.length; i++) {
      var raw = '';
      try { raw = localStorage.getItem(keys[i]) || ''; }
      catch (readErr) {
        loadError = 'InSync could not read its local data store on this device.';
        return clone(DEFAULT);
      }
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        if (!plainObject(parsed)) throw new Error('The saved state is not an object.');
        var state = merge(clone(DEFAULT), parsed);
        state.__loadedFrom = keys[i];
        if (sawUnreadable) {
          loadWarning = 'InSync recovered from an older readable local copy because the newest saved copy was damaged.';
        }
        return state;
      } catch (e) {
        sawUnreadable = true;
        if (!corruptRaw) corruptRaw = raw;
      }
    }
    if (sawUnreadable) {
      loadError = 'InSync found local data that it cannot read safely. The damaged copy has been left untouched.';
    }
    return clone(DEFAULT);
  }

  function migrateSecretsFromState() {
    var c = S.connections || {}, changed = false;
    if (c.githubToken) { SECRETS.githubToken = c.githubToken; changed = true; }
    if (c.claudeKey) { SECRETS.claudeKey = c.claudeKey; changed = true; }
    if (!changed || !saveSecrets()) return;
    delete c.githubToken;
    delete c.claudeKey;
    // Only remove the old plaintext copies after the separate secret write is safe.
    persistState();
  }


  function plainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function finiteOr(v, fallback, min, max) {
    var n = +v;
    if (!isFinite(n)) return fallback;
    if (min != null && n < min) return fallback;
    if (max != null && n > max) return fallback;
    return n;
  }
  function shortText(v, max) { return typeof v === 'string' ? v.slice(0, max || 5000) : ''; }


  function blankSessionWalk() {
    return { startedAt: 0, elapsedMs: 0, stoppedAt: 0, pace: '', elevation: '' };
  }
  function sanitizeSessionWalk(v) {
    var out = blankSessionWalk();
    if (!plainObject(v)) return out;
    out.startedAt = Math.round(finiteOr(v.startedAt, 0, 0, Number.MAX_SAFE_INTEGER));
    out.elapsedMs = Math.round(finiteOr(v.elapsedMs, 0, 0, 86400000));
    out.stoppedAt = Math.round(finiteOr(v.stoppedAt, 0, 0, Number.MAX_SAFE_INTEGER));
    out.pace = shortText(v.pace, 80).trim();
    out.elevation = shortText(v.elevation, 80).trim();
    return out;
  }
  function sanitizeWorkoutWalk(v) {
    if (!plainObject(v)) return null;
    var seconds = Math.round(finiteOr(v.seconds, 0, 0, 86400));
    var pace = shortText(v.pace, 80).trim();
    var elevation = shortText(v.elevation, 80).trim();
    if (!seconds && !pace && !elevation) return null;
    return { seconds: seconds, pace: pace, elevation: elevation };
  }
  function validDateKey(v) {
    var x = String(v || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
    var y = +x.slice(0, 4), m = +x.slice(5, 7), d = +x.slice(8, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var test = new Date(0);
    test.setHours(12, 0, 0, 0);
    test.setFullYear(y, m - 1, d);
    return test.getFullYear() === y && test.getMonth() === m - 1 && test.getDate() === d;
  }

  function validTimestamp(v) {
    var x = shortText(v, 80);
    return x && !isNaN(Date.parse(x)) ? x : '';
  }
  function validActivityIdKey(id) {
    id = String(id || '');
    if (!safeKey(id)) return false;
    var m = id.match(/^a:([a-z0-9-]{1,80}):(\d{4}-\d{2}-\d{2}):(score|protein|steps|workout:\d{1,3})$/);
    return !!(m && validDateKey(m[2]));
  }

  /* A backup is user-editable JSON and local browser storage can also be
     damaged by extensions or manual inspection. Normalize the shape before any
     screen reads it so one malformed field cannot make the whole app unopenable. */
  function normalizeStateShape() {
    if (!plainObject(S.profile)) S.profile = clone(DEFAULT.profile);
    S.profile.name = shortText(S.profile.name, 100);
    S.profile.initials = shortText(S.profile.initials, 4);
    S.profile.heightIn = Math.round(finiteOr(S.profile.heightIn, 0, 0, 120));
    S.profile.age = Math.round(finiteOr(S.profile.age, 0, 0, 120));
    S.profile.sex = shortText(S.profile.sex, 30);
    if (['Male', 'Female'].indexOf(S.profile.sex) < 0) S.profile.sex = '';
    S.profile.startDate = validDateKey(S.profile.startDate) ? String(S.profile.startDate) : '';
    S.profile.startWeight = S.profile.startWeight == null ? null : finiteOr(S.profile.startWeight, null, 20, 1500);

    if (['lose-fat', 'build', 'hold', 'strong'].indexOf(S.goal) < 0) S.goal = DEFAULT.goal;
    if (!plainObject(S.targets)) S.targets = clone(DEFAULT.targets);
    S.targets.calories = Math.round(finiteOr(S.targets.calories, DEFAULT.targets.calories, 500, 10000));
    S.targets.protein = Math.round(finiteOr(S.targets.protein, DEFAULT.targets.protein, 1, 1000));
    S.targets.steps = Math.round(finiteOr(S.targets.steps, DEFAULT.targets.steps, 1, 250000));
    S.targets.weightGoal = finiteOr(S.targets.weightGoal, DEFAULT.targets.weightGoal, 20, 1500);

    if (!plainObject(S.units)) S.units = clone(DEFAULT.units);
    if (['lb', 'kg'].indexOf(S.units.weight) < 0) S.units.weight = DEFAULT.units.weight;
    if (['mi', 'km'].indexOf(S.units.distance) < 0) S.units.distance = DEFAULT.units.distance;
    if (['kcal', 'kJ'].indexOf(S.units.energy) < 0) S.units.energy = DEFAULT.units.energy;

    if (!plainObject(S.privacy)) S.privacy = clone(DEFAULT.privacy);
    Object.keys(DEFAULT.privacy).forEach(function (k) {
      S.privacy[k] = typeof S.privacy[k] === 'boolean' ? S.privacy[k] : DEFAULT.privacy[k];
    });
    if (!plainObject(S.notifs)) S.notifs = clone(DEFAULT.notifs);
    Object.keys(DEFAULT.notifs).forEach(function (k) {
      S.notifs[k] = typeof S.notifs[k] === 'boolean' ? S.notifs[k] : DEFAULT.notifs[k];
    });
    var seenInfo = {};
    S.notificationInfoSeen = Array.isArray(S.notificationInfoSeen) ? S.notificationInfoSeen.map(function (x) {
      return shortText(x, 320).trim();
    }).filter(function (x) {
      if (!x || seenInfo[x]) return false;
      seenInfo[x] = true; return true;
    }).slice(-200) : [];

    if (!plainObject(S.days)) S.days = {};
    Object.keys(S.days).forEach(function (key) {
      if (!validDateKey(key) || !plainObject(S.days[key])) { delete S.days[key]; return; }
      var d = S.days[key];
      d.meals = Array.isArray(d.meals) ? d.meals.filter(plainObject).map(function (m) {
        m.name = shortText(m.name, 200) || 'Meal';
        m.slot = shortText(m.slot, 30) || 'Meal';
        ['kcal', 'protein', 'carbs', 'fat'].forEach(function (f) { m[f] = Math.max(0, finiteOr(m[f], 0, 0, 100000)); });
        if (m.items != null) {
          m.items = Array.isArray(m.items) ? m.items.filter(plainObject).map(function (it) {
            it.name = shortText(it.name, 200) || 'Ingredient';
            it.weight = shortText(it.weight, 80);
            ['kcal', 'protein', 'carbs', 'fat'].forEach(function (f) { it[f] = Math.max(0, finiteOr(it[f], 0, 0, 100000)); });
            return it;
          }) : null;
        }
        return m;
      }) : [];
      d.workouts = Array.isArray(d.workouts) ? d.workouts.filter(plainObject).map(function (w) {
        w.name = shortText(w.name, 120) || 'Session';
        w.minutes = Math.max(0, Math.round(finiteOr(w.minutes, 0, 0, 1440)));
        w.exercises = Array.isArray(w.exercises) ? w.exercises.filter(plainObject).map(function (e) {
          e.id = shortText(e.id, 120);
          e.name = shortText(e.name, 160) || 'Exercise';
          e.weight = Math.max(0, finiteOr(e.weight, 0, 0, 5000));
          e.reps = Math.max(0, Math.round(finiteOr(e.reps, 0, 0, 10000)));
          e.sets = Math.max(0, Math.round(finiteOr(e.sets, 0, 0, 1000)));
          return e;
        }) : [];
        w.walk = sanitizeWorkoutWalk(w.walk);
        return w;
      }) : [];
      /* Walks are a property of the calendar day, not of whether the user lifted.
         Migrate the old workout-owned walk once so 5.5.1/5.5.2 history is not lost. */
      var legacyWalk = null;
      for (var wi = 0; wi < d.workouts.length && !legacyWalk; wi++) {
        if (d.workouts[wi].walk && d.workouts[wi].walk.seconds) legacyWalk = d.workouts[wi].walk;
      }
      d.walk = sanitizeSessionWalk(d.walk);
      if (!d.walk.elapsedMs && !d.walk.startedAt && legacyWalk) {
        d.walk = sanitizeSessionWalk({ elapsedMs: legacyWalk.seconds * 1000, pace: legacyWalk.pace, elevation: legacyWalk.elevation });
      }
      d.steps = Math.max(0, Math.round(finiteOr(d.steps, 0, 0, 500000)));
      d.weight = d.weight == null ? null : finiteOr(d.weight, null, 20, 1500);
      d.restingHr = d.restingHr == null ? null : Math.round(finiteOr(d.restingHr, null, 20, 300));
      d.sleepHr = d.sleepHr == null ? null : finiteOr(d.sleepHr, null, 0, 24);
      d.reflection = shortText(d.reflection, 50000);
      d.noteToPartner = shortText(d.noteToPartner, 5000);
      if (d.scoreBasis && !validScoreBasis(d.scoreBasis)) delete d.scoreBasis;
    });

    if (!Array.isArray(S.plan)) S.plan = [];
    S.plan = S.plan.filter(plainObject).map(function (p) {
      return {
        day: WEEKDAYS.indexOf(p.day) >= 0 ? p.day : '',
        name: shortText(p.name, 40) || 'Session',
        ex: Array.isArray(p.ex) ? p.ex.filter(function (x) { return typeof x === 'string'; }).slice(0, 12) : undefined,
        detail: shortText(p.detail, 200)
      };
    }).filter(function (p) { return !!p.day; });

    if (!plainObject(S.expedition)) S.expedition = clone(DEFAULT.expedition);
    S.expedition.routeId = shortText(S.expedition.routeId, 100);
    S.expedition.legIndex = Math.max(0, Math.round(finiteOr(S.expedition.legIndex, 0, 0, 10000)));
    S.expedition.legStart = validDateKey(S.expedition.legStart) ? String(S.expedition.legStart) : '';
    S.expedition.legStartSteps = Math.max(0, Math.round(finiteOr(S.expedition.legStartSteps, 0, 0, 500000)));
    S.expedition.walked = Array.isArray(S.expedition.walked) ? S.expedition.walked.filter(function (x) { return typeof x === 'string'; }).slice(0, 1000) : [];
    S.expedition.next = shortText(S.expedition.next, 100);

    if (!plainObject(S.partner)) S.partner = clone(DEFAULT.partner);
    S.partner.name = shortText(S.partner.name, 100);
    S.partner.initials = shortText(S.partner.initials, 4);
    S.partnerLegMiles = Math.max(0, finiteOr(S.partnerLegMiles, 0, 0, 1000000));
    if (!plainObject(S.partnerHistory)) S.partnerHistory = {};
    Object.keys(S.partnerHistory).forEach(function (k) {
      var n = +S.partnerHistory[k];
      if (!validDateKey(k) || !isFinite(n) || n < 0 || n > 10) delete S.partnerHistory[k];
      else S.partnerHistory[k] = n;
    });
    if (!plainObject(S.partnerLoggedHistory)) S.partnerLoggedHistory = {};
    Object.keys(S.partnerLoggedHistory).forEach(function (k) {
      if (!validDateKey(k)) delete S.partnerLoggedHistory[k];
      else S.partnerLoggedHistory[k] = !!S.partnerLoggedHistory[k];
    });
    if (!Array.isArray(S.earned)) S.earned = [];
    S.earned = S.earned.filter(function (x, i, a) { return typeof x === 'string' && a.indexOf(x) === i; }).slice(0, 500);
    if (!plainObject(S.badgeEarnedAt)) S.badgeEarnedAt = {};
    Object.keys(S.badgeEarnedAt).forEach(function (id) {
      var d = S.badgeEarnedAt[id];
      if (!safeKey(id) || id.length > 120 || S.earned.indexOf(id) < 0 || !validDateKey(d) || d > todayKey()) delete S.badgeEarnedAt[id];
      else S.badgeEarnedAt[id] = String(d);
    });
    if (!Array.isArray(S.photos)) S.photos = [];
    S.photos = S.photos.filter(plainObject).map(function (p) { var pd=shortText(p.date,10); return { id: shortText(p.id, 200), date: validDateKey(pd) ? pd : '' }; }).filter(function (p) { return !!p.id; });
    S.notesSent = Math.max(0, Math.round(finiteOr(S.notesSent, 0, 0, 1000000)));
    if (!Array.isArray(S.sentMessages)) S.sentMessages = [];
    S.sentMessages = S.sentMessages.filter(plainObject).map(function (m) {
      var date = validDateKey(m.date) ? String(m.date) : '';
      var createdAt = shortText(m.createdAt, 80);
      if (!date && createdAt && !isNaN(Date.parse(createdAt))) date = createdAt.slice(0, 10);
      return {
        id: shortText(m.id, 120),
        date: validDateKey(date) ? date : todayKey(),
        text: shortText(m.text, 140).trim(),
        createdAt: createdAt && !isNaN(Date.parse(createdAt)) ? createdAt : '',
        sentAt: shortText(m.sentAt, 80),
        displayTime: shortText(m.displayTime, 40)
      };
    }).filter(function (m) { return !!m.id && !!m.text; }).slice(-100);
    S.frequency = Math.max(2, Math.min(6, Math.round(finiteOr(S.frequency, DEFAULT.frequency, 2, 6))));

    if (S.partnerData != null && !plainObject(S.partnerData)) S.partnerData = null;
    if (S.partnerData) {
      S.partnerData.name = shortText(S.partnerData.name, 100);
      S.partnerData.initials = shortText(S.partnerData.initials, 4);
      S.partnerData.date = validDateKey(S.partnerData.date) ? String(S.partnerData.date) : '';
      S.partnerData.startDate = validDateKey(S.partnerData.startDate) ? String(S.partnerData.startDate) : '';
      S.partnerData.note = shortText(S.partnerData.note, 2000);
      S.partnerData.noteDate = validDateKey(S.partnerData.noteDate) ? String(S.partnerData.noteDate) : S.partnerData.date;
      S.partnerData.points = finiteOr(S.partnerData.points, 0, 0, 10);
      S.partnerData.streak = Math.max(0, Math.round(finiteOr(S.partnerData.streak, 0, 0, 10000)));
      S.partnerData.earned = Array.isArray(S.partnerData.earned) ? S.partnerData.earned.filter(function (x) { return typeof x === 'string'; }).slice(0, 500) : [];
      S.partnerData.messages = Array.isArray(S.partnerData.messages) ? S.partnerData.messages.filter(plainObject).map(function (m) {
        var date = validDateKey(m.date) ? String(m.date) : '';
        var createdAt = shortText(m.createdAt, 80);
        if (!date && createdAt && !isNaN(Date.parse(createdAt))) date = createdAt.slice(0, 10);
        return {
          id: shortText(m.id, 120),
          date: validDateKey(date) ? date : S.partnerData.date,
          text: shortText(m.text, 140).trim(),
          createdAt: createdAt && !isNaN(Date.parse(createdAt)) ? createdAt : '',
          sentAt: shortText(m.sentAt, 80),
          displayTime: shortText(m.displayTime, 40)
        };
      }).filter(function (m) { return !!m.id && !!m.text; }).slice(-100) : [];
      ['calories','protein','workouts','steps','legMiles'].forEach(function (f) {
        if (S.partnerData[f] != null) {
          var n = finiteOr(S.partnerData[f], null, 0, 500000);
          if (n == null) delete S.partnerData[f]; else S.partnerData[f] = n;
        }
      });
      if (plainObject(S.partnerData.weightTrend)) {
        var wc = finiteOr(S.partnerData.weightTrend.change, null, -200, 200);
        var wd = finiteOr(S.partnerData.weightTrend.days, null, 2, 100);
        if (wc == null || wd == null) delete S.partnerData.weightTrend;
        else S.partnerData.weightTrend = { change: wc, days: Math.round(wd) };
      } else delete S.partnerData.weightTrend;
      if (plainObject(S.partnerData.expedition)) {
        S.partnerData.expedition = {
          routeId: shortText(S.partnerData.expedition.routeId, 100),
          legIndex: Math.max(0, Math.round(finiteOr(S.partnerData.expedition.legIndex, 0, 0, 1000))),
          legStart: validDateKey(S.partnerData.expedition.legStart) ? String(S.partnerData.expedition.legStart) : '',
          updatedAt: shortText(S.partnerData.expedition.updatedAt, 80),
          previousLegMiles: Math.max(0, finiteOr(S.partnerData.expedition.previousLegMiles, 0, 0, 1000000))
        };
        if (!S.partnerData.expedition.routeId) delete S.partnerData.expedition;
      } else delete S.partnerData.expedition;
      S.partnerData.updated = validTimestamp(S.partnerData.updated);
      S.partnerData.seenPartnerUpdated = validTimestamp(S.partnerData.seenPartnerUpdated);
      S.partnerData.activity = Array.isArray(S.partnerData.activity) ? S.partnerData.activity.filter(plainObject).map(function (a) {
        var id = shortText(a.id, 160), type = shortText(a.type, 40), date = validDateKey(a.date) ? String(a.date) : S.partnerData.date;
        return { id: id, date: date, type: type, text: shortText(a.text, 240), createdAt: validTimestamp(a.createdAt) };
      }).filter(function (a) {
        return validActivityIdKey(a.id) && ['score','workout','protein','steps'].indexOf(a.type) >= 0 && !!a.text && validDateKey(a.date);
      }).slice(-80) : [];
      if (!plainObject(S.partnerData.reactions)) S.partnerData.reactions = {};
      Object.keys(S.partnerData.reactions).forEach(function (id) {
        if (!validActivityIdKey(id) || ['heart','clap','fire'].indexOf(S.partnerData.reactions[id]) < 0) delete S.partnerData.reactions[id];
      });
      if (!S.partnerData.date || !S.partnerData.name) S.partnerData = null;
    }

    if (S.invite != null && !plainObject(S.invite)) S.invite = null;
    if (S.invite) {
      S.invite.routeId = shortText(S.invite.routeId, 100);
      S.invite.routeName = shortText(S.invite.routeName, 120) || S.invite.routeId;
      S.invite.from = S.invite.from === 'partner' ? 'partner' : 'me';
      S.invite.at = shortText(S.invite.at, 80); S.invite.updatedAt = shortText(S.invite.updatedAt, 80);
      S.invite.rev = Math.max(1, Math.round(finiteOr(S.invite.rev, 1, 1, 1000000)));
      S.invite.date = validDateKey(S.invite.date) ? String(S.invite.date) : todayKey();
      S.invite.counters = Math.max(0, Math.min(COUNTER_CAP, Math.round(finiteOr(S.invite.counters, 0))));
      S.invite.accepted = !!S.invite.accepted;
      S.invite.decidedBy = shortText(S.invite.decidedBy, 20); S.invite.nudgedAt = shortText(S.invite.nudgedAt, 80); S.invite.reply = shortText(S.invite.reply, 500);
      S.invite.trail = Array.isArray(S.invite.trail) ? S.invite.trail.filter(plainObject).map(function (t) {
        var id = shortText(t.id, 100), name = shortText(t.name, 120); return { id: id, name: name || id };
      }).filter(function (t) { return !!t.id; }).slice(0, 12) : [];
      if (!S.invite.routeId) S.invite = null;
    }

    function cleanPlannedMeal(m) {
      if (!plainObject(m)) return null;
      m.name = shortText(m.name, 200) || 'Meal';
      m.slot = shortText(m.slot, 30) || 'Meal';
      ['kcal', 'protein', 'carbs', 'fat'].forEach(function (f) {
        m[f] = Math.max(0, finiteOr(m[f], 0, 0, 100000));
      });
      m.items = Array.isArray(m.items) ? m.items.filter(plainObject).slice(0, 100).map(function (it) {
        return {
          name: shortText(it.name, 200) || 'Ingredient',
          weight: shortText(it.weight, 80),
          kcal: Math.max(0, finiteOr(it.kcal, 0, 0, 100000)),
          protein: Math.max(0, finiteOr(it.protein, 0, 0, 100000)),
          carbs: Math.max(0, finiteOr(it.carbs, 0, 0, 100000)),
          fat: Math.max(0, finiteOr(it.fat, 0, 0, 100000))
        };
      }) : null;
      m.servings = Math.max(1, Math.min(20, Math.round(finiteOr(m.servings, 1, 1, 20))));
      m.prepMinutes = Math.max(0, Math.min(360, Math.round(finiteOr(m.prepMinutes, 0, 0, 360))));
      m.instructions = Array.isArray(m.instructions) ? m.instructions.map(function (step) {
        return shortText(step, 500);
      }).filter(Boolean).slice(0, 16) : [];
      m.recipeNote = shortText(m.recipeNote, 600);
      m.cuisine = shortText(m.cuisine, 60);
      m.proteins = Array.isArray(m.proteins) ? m.proteins.map(function (x) { return shortText(x, 60); }).filter(Boolean).slice(0, 8) : [];
      m.photoId = shortText(m.photoId, 220);
      m.source = ['coach', 'saved', 'manual', 'favorite', 'prep'].indexOf(m.source) >= 0 ? m.source : '';
      m.batchId = shortText(m.batchId, 160);
      m.leftoverOf = shortText(m.leftoverOf, 200);
      m.batchSource = !!m.batchSource;
      return m;
    }

    S.mealIdeas = Array.isArray(S.mealIdeas)
      ? S.mealIdeas.filter(plainObject).slice(0, 60).map(cleanPlannedMeal).filter(Boolean)
      : [];
    if (!plainObject(S.mealPlan)) S.mealPlan = {};
    /* 5.2.x stored planner positions as Mon-Breakfast. Move any surviving
       entries onto the dated week once so a release update does not silently
       erase a plan somebody had already made. */
    var legacyPlanDays = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    var legacyWeek = weekStart(todayKey());
    Object.keys(S.mealPlan).forEach(function (k) {
      var m = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Breakfast|Lunch|Dinner|Snack)$/.exec(k);
      if (!m) return;
      var dated = shift(legacyWeek, legacyPlanDays[m[1]]) + '|' + m[2];
      if (!S.mealPlan[dated]) S.mealPlan[dated] = S.mealPlan[k];
      delete S.mealPlan[k];
    });
    var allowedPlanSlot = /^\d{4}-\d{2}-\d{2}\|(Breakfast|Lunch|Dinner|Snack)$/;
    Object.keys(S.mealPlan).forEach(function (k) {
      if (!safeKey(k) || !allowedPlanSlot.test(k)) { delete S.mealPlan[k]; return; }
      var cleaned = cleanPlannedMeal(S.mealPlan[k]);
      if (!cleaned) delete S.mealPlan[k]; else S.mealPlan[k] = cleaned;
    });
    S.mealPlannerWeek = validDateKey(S.mealPlannerWeek) ? String(S.mealPlannerWeek) : '';
    if (!plainObject(S.shopTicked)) S.shopTicked = {};
    Object.keys(S.shopTicked).slice(500).forEach(function (k) { delete S.shopTicked[k]; });
    Object.keys(S.shopTicked).forEach(function (k) {
      if (!safeKey(k) || k.length > 220 || !S.shopTicked[k]) delete S.shopTicked[k];
      else S.shopTicked[k] = true;
    });

    var allowedCuisines = ['Mexican','Chinese','Indian','American','Italian','Mediterranean','Thai','Japanese','Korean','Greek','Middle Eastern','Cajun'];
    var allowedProteins = ['Chicken','Beef','Turkey','Pork','Fish','Shrimp','Eggs','Vegetarian'];
    if (!plainObject(S.mealPrefs)) S.mealPrefs = clone(DEFAULT.mealPrefs);
    S.mealPrefs.cuisines = Array.isArray(S.mealPrefs.cuisines) ? S.mealPrefs.cuisines.filter(function (x, i, a) {
      return allowedCuisines.indexOf(x) >= 0 && a.indexOf(x) === i;
    }).slice(0, allowedCuisines.length) : [];
    S.mealPrefs.proteins = Array.isArray(S.mealPrefs.proteins) ? S.mealPrefs.proteins.filter(function (x, i, a) {
      return allowedProteins.indexOf(x) >= 0 && a.indexOf(x) === i;
    }).slice(0, allowedProteins.length) : [];
    S.mealPrefs.likes = shortText(S.mealPrefs.likes, 1200);
    S.mealPrefs.avoid = shortText(S.mealPrefs.avoid, 1200);
    S.mealPrefs.lunchPrepDays = Math.max(0, Math.min(5, Math.round(finiteOr(S.mealPrefs.lunchPrepDays, 0, 0, 5))));
    S.mealPrefs.dinnerLeftovers = !!S.mealPrefs.dinnerLeftovers;
    S.mealPrefs.cookDays = Array.isArray(S.mealPrefs.cookDays) ? S.mealPrefs.cookDays.filter(function (x, i, a) {
      return WEEKDAYS.indexOf(x) >= 0 && a.indexOf(x) === i;
    }).slice(0, 7) : [];
    S.mealFavorites = Array.isArray(S.mealFavorites) ? S.mealFavorites.filter(plainObject).map(cleanPlannedMeal).filter(Boolean).slice(-60) : [];
    /* One favorite per normalized recipe name. The newest snapshot wins. */
    var favoriteNames = {};
    S.mealFavorites = S.mealFavorites.slice().reverse().filter(function (m) {
      var k = String(m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!k || favoriteNames[k]) return false;
      favoriteNames[k] = true; return true;
    }).reverse();
    if (!plainObject(S.mealFavoriteAt)) S.mealFavoriteAt = {};
    Object.keys(S.mealFavoriteAt).forEach(function (k) {
      var d=S.mealFavoriteAt[k];
      if (!safeKey(k) || k.length > 220 || !favoriteNames[k] || !validDateKey(d) || d > todayKey()) delete S.mealFavoriteAt[k];
      else S.mealFavoriteAt[k]=String(d);
    });
    var dislikedNames = {};
    S.mealDislikedMeals = Array.isArray(S.mealDislikedMeals) ? S.mealDislikedMeals.map(function (x) { return shortText(x, 200).trim(); })
      .filter(function (x) {
        var k = x.toLowerCase();
        if (!x || dislikedNames[k]) return false;
        dislikedNames[k] = true; return true;
      }).slice(-120) : [];
    if (!plainObject(S.exercisePrefs)) S.exercisePrefs = clone(DEFAULT.exercisePrefs);
    ['dislikedIds','discomfortIds'].forEach(function (field) {
      S.exercisePrefs[field] = Array.isArray(S.exercisePrefs[field]) ? S.exercisePrefs[field].map(function (x) { return shortText(x, 120); })
        .filter(function (x, i, a) { return !!x && a.indexOf(x) === i; }).slice(-80) : [];
    });
    S.exercisePrefs.swapLog = Array.isArray(S.exercisePrefs.swapLog) ? S.exercisePrefs.swapLog.filter(plainObject).slice(-80).map(function (x) {
      return { date: validDateKey(x.date) ? String(x.date) : todayKey(), fromId: shortText(x.fromId, 120), toId: shortText(x.toId, 120), reason: ['occupied','discomfort','dislike'].indexOf(x.reason) >= 0 ? x.reason : 'occupied' };
    }) : [];
    if (!plainObject(S.weeklyReviews)) S.weeklyReviews = {};
    Object.keys(S.weeklyReviews).forEach(function (k) {
      if (!validDateKey(k) || !plainObject(S.weeklyReviews[k])) { delete S.weeklyReviews[k]; return; }
      var r = S.weeklyReviews[k];
      S.weeklyReviews[k] = { summary: shortText(r.summary, 1600), win: shortText(r.win, 800), pattern: shortText(r.pattern, 800), carry: shortText(r.carry, 800), generatedAt: shortText(r.generatedAt, 80) };
    });
    if (!plainObject(S.weeklyGoals)) S.weeklyGoals = {};
    Object.keys(S.weeklyGoals).forEach(function (k) {
      if (!validDateKey(k) || !Array.isArray(S.weeklyGoals[k])) { delete S.weeklyGoals[k]; return; }
      S.weeklyGoals[k] = S.weeklyGoals[k].filter(plainObject).slice(0, 4).map(function (g) {
        return { id: shortText(g.id, 60), label: shortText(g.label, 240), target: Math.max(1, Math.round(finiteOr(g.target, 1, 1, 20))) };
      }).filter(function (g) { return !!g.id && !!g.label; });
    });
    if (!plainObject(S.reactionsGiven)) S.reactionsGiven = {};
    Object.keys(S.reactionsGiven).forEach(function (id) {
      if (!validActivityIdKey(id) || ['heart','clap','fire'].indexOf(S.reactionsGiven[id]) < 0) delete S.reactionsGiven[id];
    });

    /* Base Camp state is future-facing but must already be safe to back up and
       restore. Clamp coordinates and identifiers now so the builder can trust
       its data model when Phase 8 turns this into an interactive world. */
    if (!plainObject(S.baseCamp)) S.baseCamp = clone(DEFAULT.baseCamp);
    S.baseCamp.schema = 1;
    S.baseCamp.xp = Math.max(0, Math.round(finiteOr(S.baseCamp.xp, 0, 0, 1000000000)));
    S.baseCamp.level = window.InSyncCamp && InSyncCamp.levelForXp ? InSyncCamp.levelForXp(S.baseCamp.xp) : Math.max(1, Math.round(finiteOr(S.baseCamp.level, 1, 1, 1000)));
    S.baseCamp.landTier = Math.max(1, Math.min(4, Math.round(finiteOr(S.baseCamp.landTier, 1, 1, 4))));
    S.baseCamp.theme = /^[a-z0-9-]{1,80}$/.test(String(S.baseCamp.theme || '')) ? String(S.baseCamp.theme) : 'base';
    S.baseCamp.allowPartnerVisit = S.baseCamp.allowPartnerVisit !== false;
    function cleanCampIds(list, limit) {
      var seen = {};
      return Array.isArray(list) ? list.map(function (x) { return shortText(x, 120).trim(); }).filter(function (x) {
        if (!x || !/^[a-z0-9:_-]{1,120}$/i.test(x) || seen[x]) return false;
        seen[x] = true; return true;
      }).slice(-limit) : [];
    }
    S.baseCamp.unlocked = cleanCampIds(S.baseCamp.unlocked, 1000);
    ['base-tent','base-fire-ring','base-trail-marker'].forEach(function (id) { if (S.baseCamp.unlocked.indexOf(id) < 0) S.baseCamp.unlocked.unshift(id); });
    S.baseCamp.inventory = cleanCampIds(S.baseCamp.inventory, 1000);
    S.baseCamp.collections = cleanCampIds(S.baseCamp.collections, 200);
    S.baseCamp.expeditionRewards = cleanCampIds(S.baseCamp.expeditionRewards, 1000);
    var inst = {};
    S.baseCamp.placed = Array.isArray(S.baseCamp.placed) ? S.baseCamp.placed.filter(plainObject).map(function (it) {
      var iid = shortText(it.instanceId, 120).trim(), itemId = shortText(it.itemId, 120).trim();
      if (!iid || !itemId || !/^[a-z0-9:_-]{1,120}$/i.test(iid) || !/^[a-z0-9:_-]{1,120}$/i.test(itemId) || inst[iid]) return null;
      inst[iid] = true;
      return {
        instanceId: iid, itemId: itemId,
        x: Math.max(0, Math.min(99, Math.round(finiteOr(it.x, 0, 0, 99)))),
        y: Math.max(0, Math.min(99, Math.round(finiteOr(it.y, 0, 0, 99)))),
        rotation: [0,90,180,270].indexOf(+it.rotation) >= 0 ? +it.rotation : 0,
        variant: shortText(it.variant, 80).trim()
      };
    }).filter(Boolean).slice(-500) : clone(DEFAULT.baseCamp.placed);
    S.baseCamp.lastLevelUpAt = validTimestamp(S.baseCamp.lastLevelUpAt);

    if (!plainObject(S.planMeta)) S.planMeta = {};
    S.planMeta.writtenBy = S.planMeta.writtenBy === 'coach' ? 'coach' : '';
    S.planMeta.weekOf = validDateKey(S.planMeta.weekOf) ? String(S.planMeta.weekOf) : '';
    S.planMeta.note = shortText(S.planMeta.note, 1000);
    if (!Array.isArray(S.futurePlan)) S.futurePlan = [];
    S.futurePlan = S.futurePlan.filter(plainObject).map(function (p) {
      return { day: WEEKDAYS.indexOf(p.day) >= 0 ? p.day : '', name: shortText(p.name,40) || 'Session',
        ex: Array.isArray(p.ex) ? p.ex.filter(function(x){return typeof x === 'string';}).slice(0,12) : undefined, detail: shortText(p.detail,200) };
    }).filter(function(p){return !!p.day;});
    if (!plainObject(S.futurePlanMeta)) S.futurePlanMeta = {};
    S.futurePlanMeta.writtenBy = S.futurePlanMeta.writtenBy === 'coach' ? 'coach' : '';
    S.futurePlanMeta.weekOf = validDateKey(S.futurePlanMeta.weekOf) ? String(S.futurePlanMeta.weekOf) : '';
    S.futurePlanMeta.note = shortText(S.futurePlanMeta.note,1000);
    if (S.proposal != null && (!plainObject(S.proposal) || !plainObject(S.proposal.targets))) S.proposal = null;
    if (S.proposal) {
      var pt = S.proposal.targets, cleanTargets = {};
      cleanTargets.calories = Math.round(finiteOr(pt.calories, S.targets.calories, 500, 10000));
      cleanTargets.protein = Math.round(finiteOr(pt.protein, S.targets.protein, 1, 1000));
      cleanTargets.steps = Math.round(finiteOr(pt.steps, S.targets.steps, 1, 250000));
      cleanTargets.weightGoal = finiteOr(pt.weightGoal, S.targets.weightGoal, 20, 1500);
      S.proposal.targets = cleanTargets;
      S.proposal.date = validDateKey(S.proposal.date) ? String(S.proposal.date) : todayKey();
      S.proposal.summary = shortText(S.proposal.summary, 1000);
      S.proposal.why = shortText(S.proposal.why, 5000);
      S.proposal.answered = !!S.proposal.answered;
      S.proposal.accepted = !!S.proposal.accepted;
    }
    if (S.verseCache != null && !plainObject(S.verseCache)) S.verseCache = null;
    if (S.verseCache) {
      S.verseCache.date = validDateKey(S.verseCache.date) ? String(S.verseCache.date) : '';
      S.verseCache.index = Math.round(finiteOr(S.verseCache.index, -1, 0, 10000));
      S.verseCache.why = shortText(S.verseCache.why, 1000);
      if (!S.verseCache.date || S.verseCache.index < 0) S.verseCache = null;
    }
    /* There is no network request to resume after an iOS PWA is relaunched. */
    S.coachPending = false;
    if (!Array.isArray(S.chapters)) S.chapters = [];
    var chapterWeeks = {};
    S.chapters.filter(plainObject).map(function (c) {
      var to = validDateKey(c.to) ? String(c.to) : '';
      var from = to ? weekStart(to) : (validDateKey(c.from) ? weekStart(String(c.from)) : '');
      return { from: from, to: to, text: shortText(c.text, 5000) };
    }).filter(function (c) { return !!c.from && !!c.to && c.from <= c.to && !!c.text; }).forEach(function (c) {
      /* Older builds stored rolling seven-day ranges. Canonicalize them to the
         Monday containing their end date. Assignment intentionally lets the
         later record win if an older build wrote two chapters in one week. */
      chapterWeeks[c.from] = c;
    });
    S.chapters = Object.keys(chapterWeeks).sort().map(function (k) { return chapterWeeks[k]; }).slice(-52);
    if (S.coachCache != null && !plainObject(S.coachCache)) S.coachCache = null;
    if (S.coachCache) {
      S.coachCache.date = validDateKey(S.coachCache.date) ? String(S.coachCache.date) : '';
      S.coachCache.line = shortText(S.coachCache.line, 2000);
      if (!S.coachCache.date || !S.coachCache.line) S.coachCache = null;
    }
    if (S.coachChat != null && !plainObject(S.coachChat)) S.coachChat = null;
    if (S.coachChat) {
      S.coachChat.date = validDateKey(S.coachChat.date) ? String(S.coachChat.date) : '';
      S.coachChat.messages = Array.isArray(S.coachChat.messages) ? S.coachChat.messages.filter(plainObject).slice(-100).map(function (m) {
        return { role: m.role === 'coach' ? 'coach' : 'me', text: shortText(m.text, 5000) };
      }).filter(function (m) { return !!m.text; }) : [];
      if (!S.coachChat.date) S.coachChat = null;
    }
    if (S.lastArrival != null && !plainObject(S.lastArrival)) S.lastArrival = null;
    if (S.lastArrival) {
      S.lastArrival.routeId = shortText(S.lastArrival.routeId, 100);
      S.lastArrival.legIndex = Math.max(0, Math.round(finiteOr(S.lastArrival.legIndex, 0, 0, 1000)));
      S.lastArrival.milesMine = Math.max(0, finiteOr(S.lastArrival.milesMine, 0, 0, 1000000));
      S.lastArrival.milesHers = Math.max(0, finiteOr(S.lastArrival.milesHers, 0, 0, 1000000));
      S.lastArrival.at = shortText(S.lastArrival.at, 80);
      if (!S.lastArrival.routeId) S.lastArrival = null;
    }
    if (S.lastFinish != null && !plainObject(S.lastFinish)) S.lastFinish = null;
    if (S.lastFinish) {
      S.lastFinish.name = shortText(S.lastFinish.name, 120) || 'Session';
      S.lastFinish.minutes = Math.max(0, Math.round(finiteOr(S.lastFinish.minutes, 0, 0, 1440)));
      S.lastFinish.volume = Math.max(0, finiteOr(S.lastFinish.volume, 0, 0, 100000000));
      S.lastFinish.pointsGained = Math.max(0, Math.min(10, Math.round(finiteOr(S.lastFinish.pointsGained, 0, 0, 10))));
      S.lastFinish.exercises = Array.isArray(S.lastFinish.exercises) ? S.lastFinish.exercises.filter(plainObject).slice(0, 100).map(function (x) {
        return {
          id: shortText(x.id, 120),
          name: shortText(x.name, 160) || 'Exercise',
          weight: Math.max(0, finiteOr(x.weight, 0, 0, 5000)),
          reps: Math.max(0, Math.round(finiteOr(x.reps, 0, 0, 10000))),
          sets: Math.max(0, Math.round(finiteOr(x.sets, 0, 0, 1000)))
        };
      }) : [];
      S.lastFinish.walk = sanitizeWorkoutWalk(S.lastFinish.walk);
      if (plainObject(S.lastFinish.best)) {
        S.lastFinish.best = { name: shortText(S.lastFinish.best.name, 160) || 'Exercise', weight: Math.max(0, finiteOr(S.lastFinish.best.weight, 0, 0, 5000)) };
      } else S.lastFinish.best = null;
    }
    S.partnerNoteSeen = shortText(S.partnerNoteSeen, 2300);
    delete S.seeded;
    if (S.session != null && (!plainObject(S.session) || !validDateKey(S.session.date) || !Array.isArray(S.session.items))) S.session = null;
    if (S.session) {
      S.session.name = shortText(S.session.name, 120) || 'Session';
      S.session.startedAt = finiteOr(S.session.startedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER);
      S.session.walk = sanitizeSessionWalk(S.session.walk);
      /* Upgrade an in-flight 5.5.2 workout walk into the day-level clock. */
      var sessionDay = S.days[S.session.date];
      if (!sessionDay) sessionDay = S.days[S.session.date] = { meals: [], workouts: [], walk: blankSessionWalk(), steps: 0, weight: null, restingHr: null, sleepHr: null, reflection: '', noteToPartner: '' };
      sessionDay.walk = sanitizeSessionWalk(sessionDay.walk);
      if (!sessionDay.walk.startedAt && !sessionDay.walk.elapsedMs && (S.session.walk.startedAt || S.session.walk.elapsedMs)) {
        sessionDay.walk = clone(S.session.walk);
      }
      S.session.walk = clone(sessionDay.walk);
      S.session.items = S.session.items.filter(plainObject).map(function (it) {
        it.id = shortText(it.id, 120); it.name = shortText(it.name, 160) || 'Exercise';
        it.sets = Array.isArray(it.sets) ? it.sets.filter(plainObject).map(function (set) {
          return { weight: Math.max(0, finiteOr(set.weight, 0, 0, 5000)), reps: Math.max(0, Math.round(finiteOr(set.reps, 0, 0, 10000))) };
        }) : [];
        return it;
      });
    }

    if (!plainObject(S.connections)) S.connections = clone(DEFAULT.connections);
    S.connections.githubRepo = shortText(S.connections.githubRepo, 200).trim();
    S.connections.githubBranch = shortText(S.connections.githubBranch, 200).trim() || 'main';
    S.connections.claudeModel = shortText(S.connections.claudeModel, 200).trim() || DEFAULT.connections.claudeModel;
    S.connections.lastSync = shortText(S.connections.lastSync, 80);
    S.connections.lastSyncError = shortText(S.connections.lastSyncError, 500);
    S.connections.lastSyncErrorAt = shortText(S.connections.lastSyncErrorAt, 80);
    S.onboarded = !!S.onboarded;
  }

  function migrateState(skipPersist) {
    var from = S.__loadedFrom;
    delete S.__loadedFrom;
    normalizeStateShape();
    if (!S.expedition) S.expedition = clone(DEFAULT.expedition);
    if (typeof S.expedition.legStartSteps !== 'number') S.expedition.legStartSteps = 0;
    if (!S.partnerLoggedHistory) S.partnerLoggedHistory = {};
    if (!S.notifs) S.notifs = clone(DEFAULT.notifs);
    delete S.notifs.highfive;
    delete S.notifs.challengeAccepted;
    if (!S.connections) S.connections = clone(DEFAULT.connections);
    if (!S.connections.githubBranch) S.connections.githubBranch = 'main';
    if (!S.connections.claudeModel || S.connections.claudeModel === 'claude-sonnet-4-5-20250929') {
      S.connections.claudeModel = DEFAULT.connections.claudeModel;
    }
    if (S.invite) {
      if (!(+S.invite.rev > 0)) S.invite.rev = Math.max(1, (+S.invite.counters || 0) + 1);
      if (!S.invite.updatedAt) S.invite.updatedAt = S.invite.nudgedAt || S.invite.at || '';
    }

    /* This migration turns the old single latest-note mailbox into a real rolling
       conversation. Preserve the latest legacy note once so an upgrade does
       not make a message the user just sent disappear. */
    if (!S.sentMessages.length) {
      var noteKeys = Object.keys(S.days || {}).filter(validDateKey).sort().reverse();
      for (var ni = 0; ni < noteKeys.length; ni++) {
        var nd = S.days[noteKeys[ni]], nt = nd && shortText(nd.noteToPartner, 140).trim();
        if (!nt) continue;
        S.sentMessages.push({
          id: 'legacy-' + noteKeys[ni] + '-' + Math.abs(nt.split('').reduce(function (a, c) { return ((a << 5) - a) + c.charCodeAt(0) | 0; }, 0)),
          date: noteKeys[ni],
          text: nt,
          createdAt: noteKeys[ni] + 'T12:00:00',
          sentAt: nd.noteSentAt ? noteKeys[ni] + 'T12:00:00' : '',
          displayTime: nd.noteSentAt || ''
        });
        break;
      }
    }

    /* v10 freezes the scoring rules on every day that already contains real
       activity. Before this, changing targets or rewriting the weekly plan could
       retroactively change old 10/10 days and even a completed Together result. */
    var basisChanged = false;
    Object.keys(S.days || {}).forEach(function (k) {
      if (!logged(k)) return;
      if (!validScoreBasis(S.days[k].scoreBasis)) {
        S.days[k].scoreBasis = makeScoreBasis(k);
        basisChanged = true;
      }
    });

    if (!skipPersist && from && from !== KEY) {
      if (persistState()) {
        try { localStorage.removeItem(from); } catch (e) {}
      }
    } else if (!skipPersist && basisChanged) {
      persistState();
    }
  }

  /* A day record is created the moment any screen looks at that date, so the
     empty ones are swept before every write. Otherwise scrolling back through a
     month would invent a month of history. Today is always kept: it is being
     filled in. */
  function prune() {
    var today = todayKey();
    Object.keys(S.days || {}).forEach(function (k) {
      if (k === today) return;
      var d = S.days[k];
      if (!d) return;
      var dw = sanitizeSessionWalk(d.walk);
      var empty = !(d.meals || []).length && !(d.workouts || []).length && !d.steps &&
        !(dw.elapsedMs || dw.startedAt || dw.pace || dw.elevation) &&
        d.weight == null && d.restingHr == null && d.sleepHr == null &&
        !(d.reflection || '').trim() && !(d.noteToPartner || '');
      if (empty) delete S.days[k];
    });
  }

  function persistState() {
    if (loadError) {
      lastSaveError = loadError;
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      lastSaveError = '';
      return true;
    } catch (e) {
      reportSaveError(e, 'your InSync log');
      return false;
    }
  }

  function save() {
    prune();
    return persistState();
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function safeKey(k) { return k !== '__proto__' && k !== 'prototype' && k !== 'constructor'; }
  function merge(base, over) {
    Object.keys(over || {}).forEach(function (k) {
      if (!safeKey(k)) return;
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) merge(base[k], over[k]);
      else base[k] = over[k];
    });
    return base;
  }

  // ---- dates ----
  function iso(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function todayKey() { return iso(new Date()); }
  function shift(key, n) {
    var d = new Date(key + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  function day(key) {
    key = key || todayKey();
    if (!S.days[key]) S.days[key] = { meals: [], workouts: [], walk: blankSessionWalk(), steps: 0, weight: null, restingHr: null, sleepHr: null, reflection: '', noteToPartner: '' };
    var dd = S.days[key];
    if (!dd.meals) dd.meals = [];
    if (!dd.workouts) dd.workouts = [];
    dd.walk = sanitizeSessionWalk(dd.walk);
    return S.days[key];
  }

  // ---- derived ----
  function totals(key) {
    var d = day(key);
    return d.meals.reduce(function (a, m) {
      a.kcal += m.kcal || 0; a.protein += m.protein || 0;
      a.carbs += m.carbs || 0; a.fat += m.fat || 0;
      return a;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function logged(key) {
    var d = S.days[key];
    if (!d) return false;
    return (d.meals || []).length > 0 || (d.workouts || []).length > 0 || (d.steps || 0) > 0 ||
      !!(d.walk && (d.walk.elapsedMs || d.walk.startedAt || d.walk.pace || d.walk.elevation)) ||
      d.weight != null || !!(d.reflection || '').trim();
  }

  function streak() {
    var n = 0, k = todayKey();
    if (!logged(k)) k = shift(k, -1);
    while (logged(k)) { n++; k = shift(k, -1); }
    return n;
  }

  /* One definition of the day counter. Onboarding writes today's date as the
     start, but history can predate that — imported, synced, or logged before
     the profile was set. The earliest logged day wins so "Day N" cannot
     disagree with itself from one screen to the next. */
  function startKey() {
    /* Only days with something in them. Reading a screen that looks back a month
       used to create empty records for every day it touched, which then counted
       as history and reported "Day 28" on the first morning. */
    var keys = Object.keys(S.days || {}).sort().filter(function (k) { return logged(k); });
    var first = keys.length ? keys[0] : null;
    var declared = S.profile.startDate;
    if (!declared) return first || todayKey();
    if (first && first < declared) return first;
    return declared;
  }

  /* Monday of the current week — the unit the coach writes a plan for. */
  function weekStart(key) {
    var k = key || todayKey();
    var d = new Date(k + 'T12:00:00');
    var back = (d.getDay() + 6) % 7;
    return shift(k, -back);
  }

  function dayOrdinal(key) {
    var p = String(key || '').split('-').map(Number);
    return p.length === 3 && p.every(isFinite) ? Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000) : 0;
  }
  function daysIn() {
    return Math.max(1, dayOrdinal(todayKey()) - dayOrdinal(startKey()) + 1);
  }

  // Weighted daily points. A logged day's targets and training requirement are
  // frozen the first time real activity is written, so later plan/target changes
  // cannot rewrite history or completed Together challenges.
  function planFor(key) {
    key = key || todayKey();
    var wk = weekStart(key), currentWeek = weekStart(todayKey()), list = [];
    /* A staged Sunday-night plan belongs to the coming Monday. Before this,
       planFor(nextMonday) still read the active week's plan until promotion,
       which made next-week previews and any future-day logic lie about what
       had actually been prepared. */
    if (S.futurePlanMeta && S.futurePlanMeta.weekOf === wk && Array.isArray(S.futurePlan) && S.futurePlan.length) {
      list = S.futurePlan;
    } else if (S.planMeta && S.planMeta.weekOf === wk && Array.isArray(S.plan)) {
      list = S.plan;
    } else if (wk === currentWeek && Array.isArray(S.plan)) {
      /* Legacy/template plans may not have a week stamp yet. They still own
         the current week, but must never be projected backward or forward. */
      list = S.plan;
    }
    var wd = WEEKDAYS[new Date(key + 'T12:00:00').getDay()];
    return list.filter(function (p) { return p.day === wd; })[0] || null;
  }
  function validScoreBasis(b) {
    return !!b && b.version === 1 && b.targets &&
      isFinite(+b.targets.calories) && +b.targets.calories > 0 &&
      isFinite(+b.targets.protein) && +b.targets.protein > 0 &&
      isFinite(+b.targets.steps) && +b.targets.steps > 0 &&
      ['rest', 'walk', 'session'].indexOf(b.trainingKind) >= 0;
  }
  function makeScoreBasis(key) {
    var p = planFor(key);
    return {
      version: 1,
      targets: {
        calories: Math.max(1, Math.round(+S.targets.calories || 1)),
        protein: Math.max(1, Math.round(+S.targets.protein || 1)),
        steps: Math.max(1, Math.round(+S.targets.steps || 1))
      },
      trainingKind: !p ? 'rest' : (/walk/i.test(p.name || '') ? 'walk' : 'session'),
      planName: p ? String(p.name || '').slice(0, 40) : ''
    };
  }
  function ensureScoreBasis(key) {
    key = key || todayKey();
    var d = day(key);
    if (!validScoreBasis(d.scoreBasis)) d.scoreBasis = makeScoreBasis(key);
    return d.scoreBasis;
  }
  function scoreTargets(key) {
    key = key || todayKey();
    var d = S.days[key], b = d && d.scoreBasis;
    return validScoreBasis(b) ? b.targets : makeScoreBasis(key).targets;
  }
  function trainingStatus(key) {
    key = key || todayKey();
    var d = day(key), b = d.scoreBasis;
    if (validScoreBasis(b)) {
      if (b.trainingKind === 'rest') return { label: 'Recovery day', done: true, kind: 'rest' };
      if (b.trainingKind === 'walk') return {
        label: 'Walk day', done: d.steps >= b.targets.steps, kind: 'walk',
        plan: { name: b.planName || 'Walk' }
      };
      return {
        label: 'Session done', done: (d.workouts || []).length > 0, kind: 'session',
        plan: { name: b.planName || 'Session' }
      };
    }
    var p = planFor(key), target = scoreTargets(key);
    if (!p) return { label: 'Recovery day', done: true, kind: 'rest' };
    if (/walk/i.test(p.name || '')) return { label: 'Walk day', done: d.steps >= target.steps, kind: 'walk', plan: p };
    return { label: 'Session done', done: (d.workouts || []).length > 0, kind: 'session', plan: p };
  }
  function calorieRange(key) {
    var target = Math.max(1, +scoreTargets(key).calories || 1);
    return { min: Math.round(target * 0.90), max: Math.round(target * 1.05) };
  }
  function caloriesInRange(key) {
    var kcal = totals(key).kcal, r = calorieRange(key);
    return kcal >= r.min && kcal <= r.max;
  }
  var POINTS = [
    { key: 'workout', value: 3, label: 'Session done', done: function (k) { return trainingStatus(k).done; } },
    { key: 'protein', value: 2, label: 'Protein target', done: function (k) { return totals(k).protein >= scoreTargets(k).protein; } },
    { key: 'calories', value: 2, label: 'Calories in range', done: caloriesInRange },
    { key: 'steps', value: 2, label: 'Step target', done: function (k) { return day(k).steps >= scoreTargets(k).steps; } },
    { key: 'weighin', value: 1, label: 'Weighed in', done: function (k) { return day(k).weight != null; } }
  ];

  function activeOn(key) {
    key = key || todayKey();
    return key >= startKey();
  }

  function points(key) {
    key = key || todayKey();
    /* Before the journey began there was no contest. Without this guard a
       scheduled recovery day is worth three points, so a brand-new Sunday
       install could appear to have earned points earlier in the same week. */
    if (!activeOn(key)) return 0;
    return POINTS.reduce(function (a, p) { return a + (p.done(key) ? p.value : 0); }, 0);
  }

  function pointRows(key) {
    key = key || todayKey();
    if (!activeOn(key)) {
      return POINTS.map(function (p) {
        return { key: p.key, label: p.label, value: p.value, done: false };
      });
    }
    var ts = trainingStatus(key);
    return POINTS.map(function (p) {
      return { key: p.key, label: p.key === 'workout' ? ts.label : p.label, value: p.value, done: p.done(key) };
    });
  }

  /* Where the sun is, approximated from the device timezone — no permission
     prompt, no location. Longitude and latitude come from the IANA zone; the
     rest is the standard sunrise equation. Fixed clock hours would put "sunset"
     at 5pm in June and 5pm in December, which is the one thing the camp
     artwork must not do. */
  var ZONES = {
    'America/New_York': [40.7, -74.0], 'America/Detroit': [42.3, -83.0],
    'America/Toronto': [43.7, -79.4], 'America/Chicago': [41.9, -87.6],
    'America/Winnipeg': [49.9, -97.1], 'America/Denver': [39.7, -105.0],
    'America/Edmonton': [53.5, -113.5], 'America/Phoenix': [33.4, -112.1],
    'America/Los_Angeles': [34.1, -118.2], 'America/Vancouver': [49.3, -123.1],
    'America/Anchorage': [61.2, -149.9], 'Pacific/Honolulu': [21.3, -157.9],
    'America/Mexico_City': [19.4, -99.1], 'America/Sao_Paulo': [-23.6, -46.6],
    'Europe/London': [51.5, -0.1], 'Europe/Dublin': [53.3, -6.3],
    'Europe/Paris': [48.9, 2.4], 'Europe/Madrid': [40.4, -3.7],
    'Europe/Berlin': [52.5, 13.4], 'Europe/Rome': [41.9, 12.5],
    'Europe/Stockholm': [59.3, 18.1], 'Europe/Moscow': [55.8, 37.6],
    'Africa/Johannesburg': [-26.2, 28.0], 'Asia/Dubai': [25.2, 55.3],
    'Asia/Kolkata': [19.1, 72.9], 'Asia/Singapore': [1.3, 103.8],
    'Asia/Tokyo': [35.7, 139.7], 'Asia/Shanghai': [31.2, 121.5],
    'Australia/Sydney': [-33.9, 151.2], 'Pacific/Auckland': [-36.9, 174.8]
  };

  function place(now) {
    var zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    if (ZONES[zone]) return ZONES[zone];
    // Unknown zone: longitude from the UTC offset, latitude assumed temperate.
    var offsetHours = -(now || new Date()).getTimezoneOffset() / 60;
    return [40, offsetHours * 15];
  }

  function sunHours(now) {
    now = now || new Date();
    var p = place(now), lat = p[0], lon = p[1];
    var start = new Date(now.getFullYear(), 0, 0);
    var doy = Math.floor((now - start) / 86400000);
    var rad = Math.PI / 180;

    var decl = 23.44 * Math.sin(rad * (360 / 365) * (doy - 81));
    var cosH = -Math.tan(lat * rad) * Math.tan(decl * rad);

    // Polar day or polar night — no sunrise to speak of.
    if (cosH <= -1) return { rise: 0, set: 24 };
    if (cosH >= 1) return { rise: 12, set: 12 };

    var half = Math.acos(cosH) / rad / 15;
    var offsetHours = -now.getTimezoneOffset() / 60;
    var noon = 12 - lon / 15 + offsetHours;
    return { rise: noon - half, set: noon + half };
  }

  /* dawn brackets sunrise, sunset brackets sundown, and the two long stretches
     between them are day and night. */
  function timeOfDay(now) {
    now = now || new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    var s = sunHours(now);
    if (h >= s.rise - 0.75 && h < s.rise + 1.5) return 'dawn';
    if (h >= s.rise + 1.5 && h < s.set - 1.5) return 'day';
    if (h >= s.set - 1.5 && h < s.set + 0.75) return 'sunset';
    return 'night';
  }

  // The next useful thing today. It can only claim 10/10 when the ledger does.
  function nextStep() {
    var k = todayKey(), t = totals(k), d = day(k), ts = trainingStatus(k), r = calorieRange(k), tg = scoreTargets(k);
    if (!ts.done && ts.kind === 'session') {
      return { line: 'Today is a scheduled ' + ((ts.plan && ts.plan.name) || 'training') + ' day. The session is still open.', action: 'Start the session', route: 'train' };
    }
    if (!ts.done && ts.kind === 'walk') {
      return { line: (tg.steps - d.steps).toLocaleString() + ' steps remain on today’s walk day.', action: 'Log your steps', route: 'train' };
    }
    if (t.protein < tg.protein) {
      return { line: 'Protein is the biggest nutrition gap. You are ' + (tg.protein - t.protein) + ' g short.', action: 'Log the next meal', route: 'nutrition' };
    }
    if (d.steps < tg.steps) {
      return { line: (tg.steps - d.steps).toLocaleString() + ' steps left. Those miles also move the expedition.', action: 'Log your steps', route: 'train' };
    }
    if (t.kcal < r.min) {
      return { line: 'Calories are below today’s range by ' + (r.min - t.kcal).toLocaleString() + ' kcal. Finish the day with enough food to stay in range.', action: 'Log the next meal', route: 'nutrition' };
    }
    if (d.weight == null) {
      return { line: 'The weigh-in point is still open. If you weighed this morning, add it now; otherwise leave it rather than guessing.', action: 'Log morning', route: 'body' };
    }
    if (t.kcal > r.max) {
      return { line: 'Everything you can still close is done. Calories finished above today’s range, so the score is ' + points(k) + ' of 10.', action: 'Write the evening', route: 'reflection' };
    }
    if (points(k) === 10) return { line: 'Nothing is outstanding. Ten of ten today.', action: 'Write the evening', route: 'reflection' };
    return { line: 'The day is at ' + points(k) + ' of 10. Open the ledger to see what remains.', action: 'Review today', route: 'together' };
  }

  // ---- mutations ----

  /* Meals are addressed by id so a screen can open one without caring which
     day it belongs to or where it sits in the list. */
  function findMeal(id) {
    var keys = Object.keys(S.days || {});
    for (var i = 0; i < keys.length; i++) {
      var meals = S.days[keys[i]].meals || [];
      for (var j = 0; j < meals.length; j++) {
        if (meals[j].id === id) return { key: keys[i], index: j, meal: meals[j] };
      }
    }
    return null;
  }

  function updateMeal(id, patch) {
    var f = findMeal(id);
    if (!f || !plainObject(patch)) return false;
    ensureScoreBasis(f.key);
    var meal = S.days[f.key].meals[f.index];
    Object.assign(meal, patch);
    meal.name = shortText(meal.name, 200) || 'Meal';
    meal.slot = shortText(meal.slot, 30) || 'Meal';
    ['kcal','protein','carbs','fat'].forEach(function (field) { meal[field] = Math.max(0, finiteOr(meal[field], 0, 0, 100000)); });
    save(); emit();
    return true;
  }

  function removeMeal(id) {
    var f = findMeal(id);
    if (!f) return false;
    ensureScoreBasis(f.key);
    S.days[f.key].meals.splice(f.index, 1);
    save(); emit();
    return true;
  }


  function mealId() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addMeal(meal, key) {
    key = key || todayKey();
    ensureScoreBasis(key);
    meal = plainObject(meal) ? meal : {};
    var entry = Object.assign({ id: mealId(), at: new Date().toISOString() }, meal);
    entry.name = shortText(entry.name, 200) || 'Meal';
    entry.slot = shortText(entry.slot, 30) || 'Meal';
    ['kcal','protein','carbs','fat'].forEach(function (field) { entry[field] = Math.max(0, finiteOr(entry[field], 0, 0, 100000)); });
    day(key).meals.push(entry);
    save(); emit();
    return entry;
  }

  function setSteps(n, key) {
    key = key || todayKey(); ensureScoreBasis(key);
    day(key).steps = Math.max(0, Math.round(finiteOr(n, 0, 0, 500000)));
    save(); emit();
  }
  function setMorning(v, key) {
    key = key || todayKey(); ensureScoreBasis(key); v = plainObject(v) ? v : {};
    var d = day(key), n;
    if (v.weight != null) { n = finiteOr(v.weight, null, 20, 1500); if (n != null) d.weight = n; }
    if (v.restingHr != null) { n = finiteOr(v.restingHr, null, 20, 300); if (n != null) d.restingHr = Math.round(n); }
    if (v.sleepHr != null) { n = finiteOr(v.sleepHr, null, 0, 24); if (n != null) d.sleepHr = n; }
    save(); emit();
  }
  function addWorkout(w, key) {
    key = key || todayKey(); ensureScoreBasis(key); w = plainObject(w) ? w : {};
    var entry = {
      name: shortText(w.name, 120) || 'Session',
      minutes: Math.max(0, Math.round(finiteOr(w.minutes, 0, 0, 1440))),
      exercises: Array.isArray(w.exercises) ? w.exercises.filter(plainObject).map(function (e) {
        return { id: shortText(e.id, 120), name: shortText(e.name, 160) || 'Exercise', weight: Math.max(0, finiteOr(e.weight, 0, 0, 5000)), reps: Math.max(0, Math.round(finiteOr(e.reps, 0, 0, 10000))), sets: Math.max(0, Math.round(finiteOr(e.sets, 0, 0, 1000))) };
      }) : [],
      walk: sanitizeWorkoutWalk(w.walk)
    };
    day(key).workouts.push(entry); save(); emit(); return entry;
  }


  /* An in-progress session. Held in the store rather than memory so locking
     the phone between sets does not lose the work. */
  function startSession(planName, items) {
    S.session = {
      date: todayKey(),
      name: planName || 'Session',
      startedAt: Date.now(),
      scoreBasis: clone(makeScoreBasis(todayKey())),
      walk: clone(dailyWalk(todayKey())),
      items: items.map(function (e) {
        return {
          id: e.id, name: e.name, gif: e.gif || null,
          equipment: e.equipment || '',
          targetSets: e.sets || 3, targetReps: e.reps || '10',
          warmup: e.group === 'Warm-up',
          sets: []
        };
      })
    };
    save(); emit();
  }
  function session() {
    /* A session begun before midnight may legitimately finish just after it. Keep
       yesterday's session, but discard anything older so a forgotten draft does
       not survive indefinitely. */
    if (S.session && S.session.date < shift(todayKey(), -1)) { S.session = null; save(); }
    return S.session || null;
  }
  /* A walk belongs to the calendar day. It is intentionally independent of a
     lifting session so rest/recovery days and already-completed workout days can
     still time a walk. Live timing is allowed only for today (or a session that
     legitimately crossed midnight); past dates accept manual corrections only. */
  function dailyWalk(key) {
    key = key || todayKey();
    var d = S.days[key], w = sanitizeSessionWalk(d && d.walk);
    /* One-release compatibility for an in-memory 5.5.2 session that still owns
       the walk object. This also protects a resume immediately after upgrading. */
    if (!w.startedAt && !w.elapsedMs && S.session && S.session.date === key) {
      var legacy = sanitizeSessionWalk(S.session.walk);
      if (legacy.startedAt || legacy.elapsedMs || legacy.pace || legacy.elevation) w = legacy;
    }
    return w;
  }
  function dailyWalkElapsedMs(key) {
    var w = dailyWalk(key);
    return Math.max(0, w.elapsedMs + (w.startedAt ? Date.now() - w.startedAt : 0));
  }
  function canRunWalkOn(key) {
    key = key || todayKey();
    return key === todayKey() || !!(S.session && S.session.date === key && key === shift(todayKey(), -1));
  }
  function mirrorSessionWalk(key, walk) {
    if (S.session && S.session.date === key) S.session.walk = clone(sanitizeSessionWalk(walk));
  }
  function startDailyWalk(key) {
    key = key || todayKey();
    if (!validDateKey(key) || !canRunWalkOn(key)) return false;
    var d = day(key); d.walk = sanitizeSessionWalk(d.walk);
    if (d.walk.startedAt) return true;
    d.walk.startedAt = Date.now();
    d.walk.stoppedAt = 0;
    ensureScoreBasis(key);
    mirrorSessionWalk(key, d.walk);
    save(); emit(); return true;
  }
  function stopDailyWalk(key) {
    key = key || todayKey();
    if (!validDateKey(key) || !canRunWalkOn(key)) return false;
    var d = day(key); d.walk = sanitizeSessionWalk(d.walk);
    if (!d.walk.startedAt) return false;
    d.walk.elapsedMs = Math.min(86400000, d.walk.elapsedMs + Math.max(0, Date.now() - d.walk.startedAt));
    d.walk.startedAt = 0;
    d.walk.stoppedAt = Date.now();
    mirrorSessionWalk(key, d.walk);
    save(); emit(); return true;
  }
  function updateDailyWalk(patch, key) {
    key = key || todayKey();
    if (!validDateKey(key) || key > todayKey() || !plainObject(patch)) return false;
    var d = day(key); d.walk = sanitizeSessionWalk(d.walk);
    if (patch.pace != null) d.walk.pace = shortText(String(patch.pace), 80).trim();
    if (patch.elevation != null) d.walk.elevation = shortText(String(patch.elevation), 80).trim();
    if (patch.elapsedMs != null && !d.walk.startedAt) d.walk.elapsedMs = Math.round(finiteOr(patch.elapsedMs, d.walk.elapsedMs, 0, 86400000));
    if (d.walk.elapsedMs || d.walk.pace || d.walk.elevation) ensureScoreBasis(key);
    mirrorSessionWalk(key, d.walk);
    save(); emit(); return true;
  }
  function setDailyWalkManual(key, minutes, pace, elevation) {
    key = key || todayKey();
    if (!validDateKey(key) || key > todayKey()) return false;
    var mins = finiteOr(minutes, null, 0, 1440);
    if (mins == null) return false;
    var d = day(key); d.walk = sanitizeSessionWalk(d.walk);
    if (d.walk.startedAt) return false;
    d.walk.elapsedMs = Math.round(mins * 60000);
    d.walk.pace = shortText(String(pace || ''), 80).trim();
    d.walk.elevation = shortText(String(elevation || ''), 80).trim();
    d.walk.stoppedAt = d.walk.elapsedMs ? Date.now() : 0;
    if (d.walk.elapsedMs || d.walk.pace || d.walk.elevation) ensureScoreBasis(key);
    mirrorSessionWalk(key, d.walk);
    save(); emit(); return true;
  }
  function resetDailyWalk(key) {
    key = key || todayKey();
    if (!validDateKey(key) || key > todayKey()) return false;
    var d = day(key);
    if (d.walk && d.walk.startedAt && !canRunWalkOn(key)) return false;
    d.walk = blankSessionWalk();
    mirrorSessionWalk(key, d.walk);
    save(); emit(); return true;
  }

  /* Compatibility names keep older call sites/backups safe while this build keeps
     the canonical clock to the day record. */
  function sessionWalkElapsedMs() { return dailyWalkElapsedMs(S.session ? S.session.date : todayKey()); }
  function startSessionWalk() { return S.session ? startDailyWalk(S.session.date) : false; }
  function stopSessionWalk() { return S.session ? stopDailyWalk(S.session.date) : false; }
  function updateSessionWalk(patch) { return S.session ? updateDailyWalk(patch, S.session.date) : false; }
  function resetSessionWalk() { return S.session ? resetDailyWalk(S.session.date) : false; }

  function logSet(itemIndex, set) {
    var s = S.session; if (!s || !s.items[itemIndex] || !plainObject(set)) return;
    s.items[itemIndex].sets.push({
      weight: Math.max(0, finiteOr(set.weight, 0, 0, 5000)),
      reps: Math.max(0, Math.round(finiteOr(set.reps, 0, 0, 10000)))
    });
    save(); emit();
  }
  function dropSet(itemIndex, setIndex) {
    var s = S.session; if (!s || !s.items[itemIndex]) return;
    s.items[itemIndex].sets.splice(setIndex, 1);
    save(); emit();
  }
  function addSessionItem(id) {
    var s = S.session; if (!s) return;
    var e = window.Exercises && Exercises.get(id); if (!e) return;
    if (s.items.some(function (i) { return i.id === id; })) return;
    s.items.push({
      id: e.id, name: e.name, gif: e.gif, equipment: e.equipment,
      targetSets: e.sets, targetReps: e.reps, warmup: e.group === 'Warm-up', sets: []
    });
    save(); emit();
  }
  function dropSessionItem(index) {
    var s = S.session; if (!s) return;
    s.items.splice(index, 1);
    save(); emit();
  }
  function abandonSession() { S.session = null; save(); emit(); }

  /* Finishing writes the workout and returns what it did, so the summary
     screen states facts rather than re-deriving them. */
  function finishSession() {
    var s = S.session; if (!s) return null;
    /* The daily walk is deliberately independent of lifting. Finishing the
       weights never stops that clock; it keeps running until the user stops it. */
    var logged = s.items.filter(function (i) { return i.sets.length; });
    if (!logged.length) return null;

    var key = s.date || todayKey(), d = day(key);
    if (!validScoreBasis(d.scoreBasis)) {
      d.scoreBasis = validScoreBasis(s.scoreBasis) ? clone(s.scoreBasis) : makeScoreBasis(key);
    }
    var before = points(key);
    var minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
    var volume = 0, best = null;
    var exercises = logged.map(function (i) {
      var top = null;
      i.sets.forEach(function (set) {
        volume += (set.weight || 0) * (set.reps || 0);
        if (!top || set.weight > top.weight) top = set;
      });
      if (top && (!best || top.weight > best.weight)) best = { name: i.name, weight: top.weight, reps: top.reps };
      return { id: i.id || '', name: i.name, weight: top ? top.weight : 0, reps: top ? top.reps : 0, sets: i.sets.length };
    });

    var dayWalk = dailyWalk(key);
    var walk = sanitizeWorkoutWalk({
      seconds: Math.round(dailyWalkElapsedMs(key) / 1000),
      pace: dayWalk.pace,
      elevation: dayWalk.elevation
    });
    d.workouts.push({ name: s.name, minutes: minutes, exercises: exercises, walk: walk });
    S.session = null;
    save(); emit();

    return {
      name: s.name, minutes: minutes, volume: Math.round(volume),
      exercises: exercises, best: best, walk: walk,
      pointsGained: points(key) - before
    };
  }

  /* The evening is saved with the time it was closed, so the screen can say so
     rather than implying it. */
  function saveReflection(text, key) {
    key = key || todayKey();
    var d = day(key);
    if ((text || '').trim()) ensureScoreBasis(key);
    d.reflection = text;
    d.reflectionAt = (text || '').trim()
      ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    save(); emit();
  }
  function markVerseRead(key) {
    var d = day(key || todayKey());
    if (d.verseRead) return;
    d.verseRead = true;
    save();
  }

  /* The coach chooses the day's verse against the week the user has had. Where it
     has not run — no key, offline, a past day — the list rotates by date, so
     both devices land on the same one. */
  var VERSES = [
    ['He makes my feet like the feet of a deer; he causes me to stand on the heights.', 'Habakkuk 3:19'],
    ['I can do all things through him who strengthens me.', 'Philippians 4:13'],
    ['Let us run with endurance the race that is set before us.', 'Hebrews 12:1'],
    ['Your word is a lamp to my feet and a light to my path.', 'Psalm 119:105'],
    ['Two are better than one, because they have a good reward for their toil.', 'Ecclesiastes 4:9'],
    ['The Lord is my shepherd; I shall not want.', 'Psalm 23:1'],
    ['Be strong and courageous. Do not be afraid.', 'Joshua 1:9'],
    ['They who wait for the Lord shall renew their strength.', 'Isaiah 40:31'],
    ['Commit your work to the Lord, and your plans will be established.', 'Proverbs 16:3'],
    ['This is the day that the Lord has made; let us rejoice and be glad in it.', 'Psalm 118:24'],
    ['Whatever you do, work heartily, as for the Lord.', 'Colossians 3:23'],
    ['The steadfast love of the Lord never ceases; his mercies are new every morning.', 'Lamentations 3:22\u201323'],
    ['Do you not know that your body is a temple of the Holy Spirit within you?', '1 Corinthians 6:19'],
    ['Trust in the Lord with all your heart, and do not lean on your own understanding.', 'Proverbs 3:5'],
    ['Let us not grow weary of doing good, for in due season we will reap, if we do not give up.', 'Galatians 6:9'],
    ['I press on toward the goal for the prize of the upward call of God in Christ Jesus.', 'Philippians 3:14'],
    ['Every athlete exercises self-control in all things.', '1 Corinthians 9:25'],
    ['A cheerful heart is good medicine.', 'Proverbs 17:22'],
    ['The Lord will fight for you, and you have only to be silent.', 'Exodus 14:14'],
    ['Cast all your anxieties on him, because he cares for you.', '1 Peter 5:7'],
    ['My grace is sufficient for you, for my power is made perfect in weakness.', '2 Corinthians 12:9'],
    ['Come to me, all who labor and are heavy laden, and I will give you rest.', 'Matthew 11:28'],
    ['He gives power to the faint, and to him who has no might he increases strength.', 'Isaiah 40:29'],
    ['The steps of a man are established by the Lord.', 'Psalm 37:23'],
    ['Iron sharpens iron, and one man sharpens another.', 'Proverbs 27:17'],
    ['Though he fall, he shall not be cast headlong, for the Lord upholds his hand.', 'Psalm 37:24'],
    ['Whoever is faithful in very little is also faithful in much.', 'Luke 16:10'],
    ['Better is the end of a thing than its beginning.', 'Ecclesiastes 7:8'],
    ['Do not despise the day of small things.', 'Zechariah 4:10'],
    ['In all toil there is profit, but mere talk tends only to poverty.', 'Proverbs 14:23'],
    ['The plans of the diligent lead surely to abundance.', 'Proverbs 21:5'],
    ['Rejoice in hope, be patient in tribulation, be constant in prayer.', 'Romans 12:12'],
    ['Bear one another\u2019s burdens, and so fulfill the law of Christ.', 'Galatians 6:2'],
    ['Encourage one another and build one another up.', '1 Thessalonians 5:11'],
    ['A threefold cord is not quickly broken.', 'Ecclesiastes 4:12'],
    ['So teach us to number our days that we may get a heart of wisdom.', 'Psalm 90:12'],
    ['The Lord is my strength and my shield; in him my heart trusts.', 'Psalm 28:7'],
    ['Wait for the Lord; be strong, and let your heart take courage.', 'Psalm 27:14'],
    ['Whatever you do, do all to the glory of God.', '1 Corinthians 10:31'],
    ['Discipline yourself for the purpose of godliness.', '1 Timothy 4:7']
  ];
  function verse(key) {
    var k = key || todayKey();
    var c = S.verseCache;
    if (c && c.date === k && VERSES[c.index]) {
      return { text: VERSES[c.index][0], ref: VERSES[c.index][1], why: c.why || '', chosen: true };
    }
    var n = Math.floor(new Date(k + 'T12:00:00').getTime() / 86400000);
    var v = VERSES[((n % VERSES.length) + VERSES.length) % VERSES.length];
    return { text: v[0], ref: v[1], why: '', chosen: false };
  }
  function verseList() { return VERSES.slice(); }

  /* Per-machine progression, newest first, with the best lift marked. */
  function records() {
    var byName = {};
    Object.keys(S.days).sort().forEach(function (k) {
      (S.days[k].workouts || []).forEach(function (w) {
        (w.exercises || []).forEach(function (e) {
          if (!e.name) return;
          if (!byName[e.name]) byName[e.name] = [];
          byName[e.name].push({ date: k, weight: e.weight, reps: e.reps, sets: e.sets });
        });
      });
    });
    return Object.keys(byName).map(function (name) {
      var series = byName[name];
      var best = series.reduce(function (a, s) { return s.weight > a.weight ? s : a; }, series[0]);
      var first = series[0], last = series[series.length - 1];
      return {
        name: name, series: series, best: best,
        latest: last, sessions: series.length,
        change: last.weight - first.weight,
        isPr: last.weight >= best.weight && series.length > 1
      };
    }).sort(function (a, b) { return b.sessions - a.sessions; });
  }
  /* Progress photos. The store keeps only the date and the id; the picture
     itself is in IndexedDB, because a dozen would exhaust localStorage. */
  function addPhoto(id, key) {
    S.photos = (S.photos || []).filter(function (p) { return p.id !== id; });
    S.photos.push({ id: id, date: key || todayKey() });
    S.photos.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    save();
    return id;
  }
  function removePhoto(id) {
    S.photos = (S.photos || []).filter(function (p) { return p.id !== id; });
    save();
  }
  /* The weight beside a photograph is the nearest morning entry to the day it
     was taken — never an interpolation, and null when nothing is close. */
  function weightNear(key, withinDays) {
    var limit = withinDays == null ? 10 : withinDays;
    var best = null, bestGap = Infinity;
    Object.keys(S.days).forEach(function (k) {
      var w = S.days[k] && S.days[k].weight;
      if (!w) return;
      var gap = Math.abs((new Date(k + 'T12:00:00') - new Date(key + 'T12:00:00')) / 86400000);
      if (gap < bestGap && gap <= limit) { bestGap = gap; best = w; }
    });
    return best;
  }

  /* One definition of distance from steps, so no two screens disagree. */
  function miles(steps) { return (steps || 0) / 2000; }

  /* Miles on this leg are not a counter someone has to remember to increment:
     they are the steps logged since the leg opened, converted once. The partner figure is
     derived on the partner device the same way and synced across. */
  function legMine() {
    var start = S.expedition.legStart;
    if (!start) return 0;
    var baseline = Math.max(0, +(S.expedition.legStartSteps || 0));
    var totalSteps = 0;
    Object.keys(S.days).forEach(function (k) {
      if (k < start) return;
      var steps = Math.max(0, +(S.days[k].steps || 0));
      if (k === start) steps = Math.max(0, steps - baseline);
      totalSteps += steps;
    });
    return +miles(totalSteps).toFixed(1);
  }

  function legHers() { return +(+(S.partnerLegMiles || 0)).toFixed(1); }

  /* The partner name where one is set, and something true where none is. Both phones
     run this same code, so neither may assume whose it is. */
  function partnerName() { return S.partner.name || 'your partner'; }
  function partnerInitials() { return S.partner.initials || ''; }
  function partnerRef() { return { name: partnerName(), initials: partnerInitials() }; }

  /* Arriving. The miles spent on the finished leg do not carry over — the
     next one starts from nothing, which is what makes it a leg. */
  function advanceLeg() {
    var e = S.expedition;
    if (!e || !e.routeId) return false;
    var total = window.Screens && Screens.legCount ? Screens.legCount() : 0;
    if (total && e.legIndex >= total) return false;
    var currentLeg = window.Screens && Screens.leg ? Screens.leg() : null;
    if (currentLeg && currentLeg.miles > 0) {
      var mine = legMine(), theirs = legHers(), required = +currentLeg.miles;
      if (mine + theirs < required || Math.min(mine, theirs) < required * 0.2) return false;
    }
    S.lastArrival = { routeId: e.routeId, legIndex: e.legIndex, at: new Date().toISOString(),
      milesMine: legMine(), milesHers: legHers() };
    e.legIndex = e.legIndex + 1;
    e.legStart = todayKey();
    e.legStartSteps = Math.max(0, +(day(todayKey()).steps || 0));
    S.partnerLegMiles = 0;
    save(); emit();
    return true;
  }

  /* Expedition progress is shared state. If the other phone has already opened
     the next leg, this device follows the monotonic leg index instead of
     treating their previous-leg miles as miles on the new leg. The local step
     baseline is taken at the safest available boundary, so old steps are never
     double-counted when a phone learns about an arrival late. */
  function syncExpeditionProgress(remote) {
    if (!plainObject(remote)) return false;
    var e = S.expedition, routeId = shortText(remote.routeId, 100);
    var incoming = Math.max(0, Math.round(finiteOr(remote.legIndex, 0, 0, 1000)));
    if (!routeId || !e.routeId || routeId !== e.routeId || incoming <= e.legIndex) return false;
    var oldIndex = e.legIndex, oldMine = legMine();
    if (incoming === oldIndex + 1) {
      S.lastArrival = {
        routeId: routeId, legIndex: oldIndex, at: shortText(remote.updatedAt, 80) || new Date().toISOString(),
        milesMine: oldMine,
        milesHers: Math.max(0, finiteOr(remote.previousLegMiles, 0, 0, 1000000))
      };
    }
    e.legIndex = incoming;
    var start = validDateKey(remote.legStart) ? String(remote.legStart) : todayKey();
    if (start > todayKey()) start = todayKey();
    e.legStart = start;
    var startDay = S.days[start];
    e.legStartSteps = Math.max(0, +(startDay && startDay.steps || 0));
    S.partnerLegMiles = 0;
    save(); emit();
    return true;
  }

  /* ---- the handshake ----------------------------------------------------
     An expedition needs two yeses, so a proposal is one object and whose turn
     it is lives in `from`. There is no decline: countering replaces the route
     and hands the proposal back, which costs the counterer a choice of their
     own. Two counters and the app settles it. */
  function touchInvite(inv) {
    inv.rev = Math.max(0, +inv.rev || 0) + 1;
    inv.updatedAt = new Date().toISOString();
  }

  function propose(routeId, name) {
    var now = new Date().toISOString();
    S.invite = {
      routeId: routeId, routeName: name || routeId, from: 'me',
      at: now, updatedAt: now, rev: 1, date: todayKey(),
      counters: 0, accepted: false, decidedBy: '', nudgedAt: '', reply: '',
      trail: [{ id: routeId, name: name || routeId }]
    };
    save(); emit();
  }

  /* A nudge is a timestamp, nothing more. What it says is fixed copy on the
     screen that sends it, so it can never grow into a count of the days. */
  function nudgeInvite() {
    if (!S.invite) return;
    S.invite.nudgedAt = new Date().toISOString();
    touchInvite(S.invite);
    save(); emit();
  }

  function acceptInvite() {
    if (!S.invite) return;
    S.invite.accepted = true;
    S.invite.decidedBy = 'me';
    touchInvite(S.invite);
    save(); emit();
  }

  function counterInvite(routeId, name) {
    if (!S.invite) return;
    var inv = S.invite;
    var trail = inv.trail || [{ id: inv.routeId, name: inv.routeName }];
    /* A route can only be offered once. Without this the settling rule could
       read the same route twice and "decide" on one already refused. */
    var seen = trail.some(function (t) { return t.id === routeId; });
    if (seen) return;
    inv.trail = trail.concat([{ id: routeId, name: name || routeId }]);
    inv.counters = (inv.counters || 0) + 1;
    inv.routeId = routeId;
    inv.routeName = name || routeId;
    inv.from = 'me';
    inv.at = new Date().toISOString();
    inv.date = todayKey();
    inv.nudgedAt = '';
    touchInvite(inv);
    if (inv.counters >= COUNTER_CAP) return settleInvite();
    save(); emit();
  }

  /* Two counters in and neither of you has moved. The app chooses between the
     routes on the table, and it takes the first one neither of you has walked
     — the oldest offer standing, so countering last is not a way to win. */
  function settleInvite() {
    var inv = S.invite;
    if (!inv) return;
    var walked = S.expedition.walked || [];
    var trail = inv.trail || [{ id: inv.routeId, name: inv.routeName }];
    var fresh = trail.filter(function (t) { return walked.indexOf(t.id) < 0; });
    var pick = (fresh.length ? fresh : trail)[0];
    inv.routeId = pick.id;
    inv.routeName = pick.name;
    inv.accepted = true;
    inv.decidedBy = 'app';
    save(); emit();
  }

  /* Agreeing does not move the route under your feet: an agreed expedition
     waits until the current one ends. Beginning it retires the old route to
     the walked list, which is what the settling rule reads. */
  function beginExpedition(routeId) {
    var e = S.expedition;
    if (e.routeId && e.routeId !== routeId && (e.walked || []).indexOf(e.routeId) < 0) {
      e.walked = (e.walked || []).concat([e.routeId]);
    }
    e.routeId = routeId;
    e.legIndex = 0;
    e.legStart = todayKey();
    e.legStartSteps = Math.max(0, +(day(todayKey()).steps || 0));
    e.next = '';
    S.partnerLegMiles = 0;
    S.invite = null;
    save(); emit();
  }

  function holdExpedition(routeId) {
    S.expedition.next = routeId;
    S.invite = null;
    save(); emit();
  }

  /* One place converts, so no two screens can disagree about what a pound is.
     Stored figures are always pounds, miles and kilocalories; units decide only
     how they are shown. */
  var PER_KG = 0.45359237, PER_KM = 1.609344, PER_KJ = 4.184;
  function weightVal(lb) { return S.units.weight === 'kg' ? lb * PER_KG : lb; }
  /* The number alone, for the places that set the unit in their own label. */
  function weightNum(lb, dp) {
    if (lb == null || lb === '') return null;
    return +weightVal(+lb).toFixed(dp == null ? 1 : dp);
  }
  /* And back again: what the person types is in their units; stored weight stays in pounds. */
  function weightToLb(v) {
    var n = +v;
    if (!isFinite(n)) return null;
    return S.units.weight === 'kg' ? +(n / PER_KG).toFixed(1) : n;
  }
  function fmtWeight(lb, dp) {
    if (lb == null || lb === '') return '\u2014';
    return weightVal(+lb).toFixed(dp == null ? 1 : dp) + ' ' + S.units.weight;
  }
  function fmtDistance(mi, dp) {
    if (mi == null) return '\u2014';
    var km = S.units.distance === 'km';
    return (km ? mi * PER_KM : mi).toFixed(dp == null ? 1 : dp) + ' ' + S.units.distance;
  }
  function energyNum(kcal) {
    if (kcal == null || kcal === '') return null;
    return Math.round(S.units.energy === 'kJ' ? (+kcal * PER_KJ) : +kcal);
  }
  function energyToKcal(value) {
    var n = +value;
    if (!isFinite(n)) return null;
    return Math.round(S.units.energy === 'kJ' ? n / PER_KJ : n);
  }
  function fmtEnergy(kcal) {
    if (kcal == null) return '\u2014';
    return energyNum(kcal).toLocaleString() + ' ' + S.units.energy;
  }
  /* Lifted weight is the same unit as bodyweight, but plates are whole numbers:
     no decimal in pounds, one in kilos. */
  function fmtLift(lb) {
    if (lb == null || lb === '') return '\u2014';
    return fmtWeight(lb, S.units.weight === 'kg' ? 1 : 0);
  }
  function liftNum(lb) { return weightNum(lb, S.units.weight === 'kg' ? 1 : 0); }
  /* Climb follows distance: feet with miles, metres with kilometres. */
  function fmtClimb(ft) {
    if (ft == null) return '\u2014';
    var m = S.units.distance === 'km';
    return Math.round(m ? ft * 0.3048 : ft).toLocaleString() + ' ' + (m ? 'm' : 'ft');
  }

  /* The owner name and avatar initials are one decision, so they are
     written together and cannot drift apart. */
  function initialsFor(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    /* Match onboarding: one-word names get two letters, while
       multi-word names use the first letter of each of the first two words. */
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
  }
  /* Names are also the file identities used by two-phone sync. Keep this
     canonicalizer in Store so backup/Settings safety checks use exactly the
     same rule as Cloud. */
  function identityKey(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function setProfileName(name) {
    var clean = (name || '').trim();
    if (!clean) return;
    var before = identityKey(S.profile.name), after = identityKey(clean);
    S.profile.name = clean;
    S.profile.initials = initialsFor(clean);
    /* A material owner rename changes the private filename this phone writes.
       Do not leave a green "last synced" stamp from the previous identity. */
    if (before && before !== after && S.connections) {
      S.connections.lastSync = '';
      S.connections.lastSyncError = '';
      S.connections.lastSyncErrorAt = '';
    }
    save(); emit();
  }
  function clearPreparedTrainingAfterPreferenceChange() {
    S.futurePlan = [];
    S.futurePlanMeta = {};
    if (!plainObject(S.weeklyGoals)) S.weeklyGoals = {};
    var nextWeek = shift(weekStart(todayKey()), 7);
    if (Object.prototype.hasOwnProperty.call(S.weeklyGoals, nextWeek)) delete S.weeklyGoals[nextWeek];
  }
  function setGoal(goal) {
    goal = String(goal || '');
    if (['lose-fat', 'build', 'hold', 'strong'].indexOf(goal) < 0 || S.goal === goal) return false;
    S.goal = goal;
    /* Goal influences the coach's split as well as target advice. A staged
       training week written for the old goal must be regenerated, while the
       current calendar week stays intact. */
    clearPreparedTrainingAfterPreferenceChange();
    save(); emit(); return true;
  }
  function setFrequency(value) {
    var n = Math.max(2, Math.min(6, Math.round(+value || DEFAULT.frequency)));
    if (S.frequency === n) return false;
    S.frequency = n;
    /* Frequency is a hard contract: four days means four lifting days. Never
       activate a staged plan generated before this setting changed. */
    clearPreparedTrainingAfterPreferenceChange();
    save(); emit(); return true;
  }
  function setPartnerName(name) {
    var clean = (name || '').trim();
    var before = identityKey(S.partner.name), after = identityKey(clean);
    /* The partner name is also the private sync-file identity. If that identity
       really changes, old partner caches must not be shown under the new name.
       Capitalization/spacing edits that resolve to the same sync key are safe. */
    if (before && before !== after) {
      S.partnerData = null; S.partnerHistory = {}; S.partnerLoggedHistory = {}; S.partnerLegMiles = 0;
      S.partnerNoteSeen = ''; S.invite = null; S.reactionsGiven = {}; S.notificationInfoSeen = [];
      if (S.connections) {
        S.connections.lastSync = ''; S.connections.lastSyncError = ''; S.connections.lastSyncErrorAt = '';
      }
    }
    S.partner.name = clean;
    S.partner.initials = initialsFor(clean);
    save(); emit();
  }


  /* A note is delivered when the GitHub PUT succeeds, regardless of whether
     that success came from the send button, an automatic retry, or reopening
     the app later. One signature is counted once. */
  function setPartnerNote(text, key) {
    var k = key || todayKey(), d = day(k);
    var next = shortText(String(text || '').trim(), 140);
    if (!next) return false;
    var now = new Date();
    var id = 'msg-' + now.getTime().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    S.sentMessages.push({
      id: id,
      date: k,
      text: next,
      createdAt: now.toISOString(),
      sentAt: '',
      displayTime: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    });
    if (S.sentMessages.length > 100) S.sentMessages = S.sentMessages.slice(-100);

    /* Keep the legacy latest-note fields for one release so a 5.2.2 partner
       can still receive the newest message while the two phones update. */
    var nextSig = k + '|' + next;
    if (d.noteSentSignature !== nextSig) d.noteSentAt = '';
    d.noteToPartner = next;
    var saved = save(); emit();
    return saved ? id : false;
  }

  function markMessagesSynced(sharedMessages) {
    if (!Array.isArray(sharedMessages) || !sharedMessages.length) return false;
    var ids = {};
    sharedMessages.forEach(function (m) { if (m && m.id) ids[m.id] = true; });
    var changed = false, newest = null;
    S.sentMessages.forEach(function (m) {
      if (!ids[m.id] || m.sentAt) return;
      m.sentAt = new Date().toISOString();
      S.notesSent = (S.notesSent || 0) + 1;
      changed = true;
      newest = m;
    });
    if (newest) {
      var d = S.days[newest.date];
      if (d && d.noteToPartner === newest.text) {
        d.noteSentSignature = newest.date + '|' + newest.text;
        d.noteSentAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    }
    return changed ? save() : true;
  }

  /* Legacy acknowledgement retained for older backups and one-version
     compatibility. New conversation delivery uses markMessagesSynced(). */
  function markCurrentNoteSynced(key, sentText) {
    var k = key || todayKey(), d = S.days[k];
    var text = sentText != null ? String(sentText).trim()
      : (d && typeof d.noteToPartner === 'string' ? d.noteToPartner.trim() : '');
    if (!d || !text) return false;
    var sig = k + '|' + text;
    if (d.noteSentSignature !== sig) {
      d.noteSentSignature = sig;
      S.notesSent = (S.notesSent || 0) + 1;
    }
    d.noteSentAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return save();
  }

  /* The coach proposes; a tap accepts. Either way the proposal is answered and
     stops asking. */
  function acceptProposal() {
    var p = S.proposal;
    if (!p || !p.targets) return;
    ['calories', 'protein', 'steps', 'weightGoal'].forEach(function (k) {
      if (p.targets[k] != null) S.targets[k] = p.targets[k];
    });
    p.answered = true;
    p.accepted = true;
    save(); emit();
  }
  function dismissProposal() {
    if (!S.proposal) return;
    S.proposal.answered = true;
    S.proposal.accepted = false;
    save(); emit();
  }

  /* The weigh-ins that exist, newest last, for the coach to read a trend from.
     Days with no entry are absent rather than carried forward. */
  function recentWeights(n) {
    var k = todayKey(), out = [];
    for (var i = (n || 14) - 1; i >= 0; i--) {
      var key = shift(k, -i), d = S.days[key];
      if (d && d.weight != null) out.push({ date: key, weight: d.weight });
    }
    return out;
  }

  function set(path, value) {
    var parts = String(path || '').split('.'), o = S;
    if (!parts.length || parts.some(function (part) { return !part || !safeKey(part); })) return false;
    /* A write into a day must not leave a half-formed day behind: anything
       reading it later expects meals and workouts to exist. */
    if (parts[0] === 'days' && parts[1]) day(parts[1]);
    for (var i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
    var saved = save(); emit();
    return saved;
  }

  function exportState() {
    var out = clone(S);
    if (out.connections) {
      delete out.connections.githubToken;
      delete out.connections.claudeKey;
    }
    return out;
  }

  function importState(incoming) {
    if (!plainObject(incoming) || !plainObject(incoming.profile) || !plainObject(incoming.days)) {
      throw new Error('That backup does not contain a valid InSync log.');
    }
    if (incoming.onboarded && !identityKey(incoming.profile.name)) {
      throw new Error('That backup is marked as set up but does not contain a valid owner name. Nothing was restored.');
    }
    var next;
    try { next = merge(clone(DEFAULT), clone(incoming)); }
    catch (e) { throw new Error('That backup could not be read safely.'); }
    if (next.connections) {
      delete next.connections.githubToken;
      delete next.connections.claudeKey;
    }
    var previous = S;
    S = next;
    /* Normalize and migrate entirely in memory first. Restore is committed to
       localStorage only once, so a failed final write cannot leave half of the
       incoming backup persisted over the previous log. */
    migrateState(true);
    if (!save()) {
      S = previous;
      throw new Error(lastSaveError || 'The restored data could not be saved.');
    }
    emit();
    return true;
  }

  /* Everything this device holds, including the photographs, which live in
     their own database and would otherwise survive a reset. */
  function wipe(cb) {
    function clearLocal() {
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(SECRET_KEY);
        PREVIOUS_KEYS.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { return cb && cb(new Error('This device would not clear the local InSync store.')); }
      SECRETS = {};
      S = clone(DEFAULT);
      loadError = ''; loadWarning = ''; corruptRaw = ''; lastSaveError = '';
      if (cb) cb(null);
    }
    if (window.Media && Media.wipe) {
      return Media.wipe(function (err) {
        if (err) return cb && cb(err);
        clearLocal();
      });
    }
    clearLocal();
  }

  // ---- subscribe ----
  var subs = [];
  function emit() { subs.forEach(function (f) { f(); }); }

  window.Store = {
    state: function () { return S; },
    day: day, dayAt: function (n) { return day(shift(todayKey(), n || 0)); },
    weekStart: weekStart, startKey: startKey, activeOn: activeOn,
    todayKey: todayKey, shift: shift, iso: iso,
    planFor: planFor, trainingStatus: trainingStatus, scoreTargets: scoreTargets, calorieRange: calorieRange, caloriesInRange: caloriesInRange,
    totals: totals, streak: streak, daysIn: daysIn, logged: logged,
    points: points, pointRows: pointRows, timeOfDay: timeOfDay, nextStep: nextStep,
    addMeal: addMeal, findMeal: findMeal, updateMeal: updateMeal, removeMeal: removeMeal, addWorkout: addWorkout, setSteps: setSteps, setMorning: setMorning,
    startSession: startSession, session: session, logSet: logSet, dropSet: dropSet,
    dailyWalk: dailyWalk, dailyWalkElapsedMs: dailyWalkElapsedMs, startDailyWalk: startDailyWalk, stopDailyWalk: stopDailyWalk,
    updateDailyWalk: updateDailyWalk, setDailyWalkManual: setDailyWalkManual, resetDailyWalk: resetDailyWalk,
    sessionWalkElapsedMs: sessionWalkElapsedMs, startSessionWalk: startSessionWalk,
    stopSessionWalk: stopSessionWalk, updateSessionWalk: updateSessionWalk, resetSessionWalk: resetSessionWalk,
    addSessionItem: addSessionItem, dropSessionItem: dropSessionItem,
    abandonSession: abandonSession, finishSession: finishSession,
    saveReflection: saveReflection, markVerseRead: markVerseRead, verse: verse, verseList: verseList, records: records,
    addPhoto: addPhoto, removePhoto: removePhoto, weightNear: weightNear, miles: miles,
    legMine: legMine, legHers: legHers,
    partnerName: partnerName, partnerInitials: partnerInitials, partnerRef: partnerRef, identityKey: identityKey,
    advanceLeg: advanceLeg, syncExpeditionProgress: syncExpeditionProgress,
    propose: propose, nudgeInvite: nudgeInvite, acceptInvite: acceptInvite,
    counterInvite: counterInvite, settleInvite: settleInvite,
    beginExpedition: beginExpedition, holdExpedition: holdExpedition,
    counterCap: COUNTER_CAP,
    set: set, save: save,
    secret: secret, setSecret: setSecret, lastSaveError: function () { return lastSaveError; },
    loadError: function () { return loadError; }, loadWarning: function () { return loadWarning; }, corruptRaw: function () { return corruptRaw; },
    exportState: exportState, importState: importState,
    fmtWeight: fmtWeight, fmtDistance: fmtDistance, fmtEnergy: fmtEnergy, energyNum: energyNum, energyToKcal: energyToKcal,
    fmtLift: fmtLift, liftNum: liftNum, fmtClimb: fmtClimb,
    weightNum: weightNum, weightToLb: weightToLb,
    recentWeights: recentWeights,
    setProfileName: setProfileName, setPartnerName: setPartnerName, setGoal: setGoal, setFrequency: setFrequency, setPartnerNote: setPartnerNote, markMessagesSynced: markMessagesSynced, markCurrentNoteSynced: markCurrentNoteSynced,
    acceptProposal: acceptProposal, dismissProposal: dismissProposal,
    wipe: wipe, KEY: KEY, SECRET_KEY: SECRET_KEY,
    on: function (f) { subs.push(f); }
  };
})();

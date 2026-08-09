/* InSync — the single source of truth.
   Rule: nothing that appears on screen is typed. Every figure, count and
   sentence containing a number is derived from this state. */
(function () {
  'use strict';

  /* Bumped whenever the shape of a clean install changes — the practice data cut
     (v6), the preselected route cut (v7), and leg miles becoming derived rather
     than counted (v8). Older keys are removed so a device used for testing
     cannot merge yesterday's rehearsal back in. */
  var KEY = 'insync.v8';
  try {
    localStorage.removeItem('insync.v5');
    localStorage.removeItem('insync.v6');
    localStorage.removeItem('insync.v7');
  } catch (e) {}

  var DEFAULT = {
    /* Empty until onboarding, on either phone. Nothing in the app may assume
       whose device this is. */
    profile: { name: '', initials: '', heightIn: 0, age: 0, startDate: '' },
    goal: 'lose-fat',
    targets: { calories: 2000, protein: 155, steps: 10000, weightGoal: 196 },
    units: { weight: 'lb', distance: 'mi', energy: 'kcal' },
    privacy: { weight: false, calories: true, workouts: true, steps: true },
    /* The eight from the handshake spec, and only those. The daily logging
       reminder is deliberately absent: it fires hardest on the worst days. */
    notifs: { invite: true, accept: true, note: true, highfive: true, challengeAccepted: true, challengeExpiring: true, leg: true, badge: false },
    days: {},
    /* No expedition is chosen on a fresh install. The two of them pick the
       first one together, so nothing here may name a route. legStart is the day
       the current leg opened — the miles walked on it are derived from it. */
    expedition: { routeId: '', legIndex: 0, legStart: '', walked: [], next: '' },
    /* Empty until pairing. Nothing may assume a name, on either phone. */
    partner: { name: '', initials: '' },
    partnerLegMiles: 0,
    invite: null,
    partnerHistory: {},
    earned: [],
    photos: [],
    notesSent: 0,
    frequency: 4,
    partnerData: null,
    coachCache: null,
    onboarded: false,
    connections: { githubToken: '', githubRepo: 'rtbobalik90/InSync', githubBranch: 'main', claudeKey: '', lastSync: '' },
    seeded: false
  };

  var S = load();

  /* Meals logged before ids existed would otherwise be unopenable. */
  (function backfillMealIds() {
    var changed = false;
    Object.keys(S.days || {}).forEach(function (k) {
      (S.days[k].meals || []).forEach(function (m, i) {
        if (!m.id) { m.id = 'm' + k.replace(/-/g, '') + i; changed = true; }
      });
    });
    if (changed) try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  })();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      return merge(clone(DEFAULT), JSON.parse(raw));
    } catch (e) { return clone(DEFAULT); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, over) {
    Object.keys(over || {}).forEach(function (k) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) merge(base[k], over[k]);
      else base[k] = over[k];
    });
    return base;
  }

  // ---- dates ----
  function iso(d) { return d.toISOString().slice(0, 10); }
  function todayKey() { return iso(new Date()); }
  function shift(key, n) {
    var d = new Date(key + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  function day(key) {
    key = key || todayKey();
    if (!S.days[key]) S.days[key] = { meals: [], workouts: [], steps: 0, weight: null, restingHr: null, sleepHr: null, reflection: '', noteToPartner: '' };
    var dd = S.days[key];
    if (!dd.meals) dd.meals = [];
    if (!dd.workouts) dd.workouts = [];
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
    return d.meals.length > 0 || d.workouts.length > 0 || d.steps > 0 || d.weight != null;
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
    var keys = Object.keys(S.days || {}).sort();
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

  function daysIn() {
    var start = new Date(startKey() + 'T12:00:00');
    return Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000) + 1);
  }

  // Weighted daily points — identical for both, which is what makes it a contest.
  var POINTS = [
    { key: 'workout', value: 3, label: 'Session done', done: function (k) { return day(k).workouts.length > 0; } },
    { key: 'protein', value: 2, label: 'Protein target', done: function (k) { return totals(k).protein >= S.targets.protein; } },
    { key: 'calories', value: 2, label: 'Calories in range', done: function (k) { var t = totals(k).kcal; return t > 0 && t <= S.targets.calories; } },
    { key: 'steps', value: 2, label: 'Step target', done: function (k) { return day(k).steps >= S.targets.steps; } },
    { key: 'weighin', value: 1, label: 'Weighed in', done: function (k) { return day(k).weight != null; } }
  ];

  function points(key) {
    key = key || todayKey();
    return POINTS.reduce(function (a, p) { return a + (p.done(key) ? p.value : 0); }, 0);
  }

  function pointRows(key) {
    key = key || todayKey();
    return POINTS.map(function (p) {
      return { key: p.key, label: p.label, value: p.value, done: p.done(key) };
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

  // The next useful thing today — biggest weighted gap still open.
  function nextStep() {
    var k = todayKey(), t = totals(k), d = day(k);
    if (t.protein < S.targets.protein) {
      var gap = S.targets.protein - t.protein;
      return {
        line: 'Protein is the gap. You are ' + gap + ' g short' + (d.meals.length ? ' with one meal left' : ' and nothing logged yet') + ' — a palm of chicken at dinner closes it.',
        action: d.meals.length ? 'Log dinner' : 'Log breakfast',
        route: 'nutrition'
      };
    }
    if (!d.workouts.length) {
      var stepsShort = d.steps < S.targets.steps;
      return {
        line: stepsShort
          ? 'The session is the bigger of two gaps. ' + (S.targets.steps - d.steps).toLocaleString() + ' steps are still open too, and a walk after covers them.'
          : 'Everything else is in. Tonight\u2019s session is the last thing between you and a clean day.',
        action: 'Start the session', route: 'train'
      };
    }
    if (d.steps < S.targets.steps) {
      return { line: (S.targets.steps - d.steps).toLocaleString() + ' steps left. A walk after dinner covers it, and the miles count toward the leg.', action: 'Log a walk', route: 'train' };
    }
    return { line: 'Nothing is outstanding. Ten of ten today.', action: 'Write the evening', route: 'reflection' };
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
    if (!f) return false;
    Object.assign(S.days[f.key].meals[f.index], patch);
    save(); emit();
    return true;
  }

  function removeMeal(id) {
    var f = findMeal(id);
    if (!f) return false;
    S.days[f.key].meals.splice(f.index, 1);
    save(); emit();
    return true;
  }


  function mealId() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addMeal(meal, key) {
    day(key).meals.push(Object.assign({ id: mealId(), at: new Date().toISOString() }, meal));
    save(); emit();
  }
  function setSteps(n, key) { day(key).steps = n; save(); emit(); }
  function setMorning(v, key) {
    var d = day(key);
    if (v.weight != null) d.weight = v.weight;
    if (v.restingHr != null) d.restingHr = v.restingHr;
    if (v.sleepHr != null) d.sleepHr = v.sleepHr;
    save(); emit();
  }
  function addWorkout(w, key) { day(key).workouts.push(w); save(); emit(); }


  /* An in-progress session. Held in the store rather than memory so locking
     the phone between sets does not lose the work. */
  function startSession(planName, items) {
    S.session = {
      date: todayKey(),
      name: planName || 'Session',
      startedAt: Date.now(),
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
    if (S.session && S.session.date !== todayKey()) { S.session = null; save(); }
    return S.session || null;
  }
  function logSet(itemIndex, set) {
    var s = S.session; if (!s || !s.items[itemIndex]) return;
    s.items[itemIndex].sets.push(set);
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
    var logged = s.items.filter(function (i) { return i.sets.length; });
    if (!logged.length) return null;

    var before = points();
    var minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
    var volume = 0, best = null;
    var exercises = logged.map(function (i) {
      var top = null;
      i.sets.forEach(function (set) {
        volume += (set.weight || 0) * (set.reps || 0);
        if (!top || set.weight > top.weight) top = set;
      });
      if (top && (!best || top.weight > best.weight)) best = { name: i.name, weight: top.weight, reps: top.reps };
      return { name: i.name, weight: top ? top.weight : 0, reps: top ? top.reps : 0, sets: i.sets.length };
    });

    addWorkout({ name: s.name, minutes: minutes, exercises: exercises });
    S.session = null;
    save(); emit();

    return {
      name: s.name, minutes: minutes, volume: Math.round(volume),
      exercises: exercises, best: best,
      pointsGained: points() - before
    };
  }

  /* The evening is saved with the time it was closed, so the screen can say so
     rather than implying it. */
  function saveReflection(text, key) {
    var d = day(key);
    d.reflection = text;
    d.reflectionAt = (text || '').trim()
      ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    save(); emit();
  }

  /* The coach chooses the day's verse against the week he has had. Where it
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
     they are the steps logged since the leg opened, converted once. Hers is the
     figure her own device derived the same way and synced across. */
  function legMine() {
    var start = S.expedition.legStart;
    if (!start) return 0;
    var total = 0;
    Object.keys(S.days).forEach(function (k) {
      if (k >= start) total += miles(S.days[k].steps);
    });
    return +total.toFixed(1);
  }
  function legHers() { return +(+(S.partnerLegMiles || 0)).toFixed(1); }

  /* Her name where one is set, and something true where none is. Both phones
     run this same code, so neither may assume whose it is. */
  function partnerName() { return S.partner.name || 'your partner'; }
  function partnerInitials() { return S.partner.initials || ''; }
  function partnerRef() { return { name: partnerName(), initials: partnerInitials() }; }

  /* Arriving. The miles spent on the finished leg do not carry over — the
     next one starts from nothing, which is what makes it a leg. */
  function advanceLeg() {
    var e = S.expedition;
    S.lastArrival = { routeId: e.routeId, legIndex: e.legIndex, at: new Date().toISOString(),
      milesMine: legMine(), milesHers: legHers() };
    e.legIndex = e.legIndex + 1;
    e.legStart = todayKey();
    S.partnerLegMiles = 0;
    save(); emit();
  }

  /* ---- the handshake ----------------------------------------------------
     An expedition needs two yeses, so a proposal is one object and whose turn
     it is lives in `from`. There is no decline: countering replaces the route
     and hands the proposal back, which costs the counterer a choice of their
     own. Two counters and the app settles it. */
  var COUNTER_CAP = 2;

  function propose(routeId, name) {
    S.invite = {
      routeId: routeId, routeName: name || routeId, from: 'me',
      at: new Date().toISOString(), date: todayKey(),
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
    save(); emit();
  }

  function acceptInvite() {
    if (!S.invite) return;
    S.invite.accepted = true;
    S.invite.decidedBy = 'me';
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
  /* And back again: what he types is in his units, what is stored is pounds. */
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
  function fmtEnergy(kcal) {
    if (kcal == null) return '\u2014';
    var kj = S.units.energy === 'kJ';
    return Math.round(kj ? kcal * PER_KJ : kcal).toLocaleString() + ' ' + S.units.energy;
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

  /* His name and the initials on the avatar are one decision, so they are
     written together and cannot drift apart. */
  function setProfileName(name) {
    var clean = (name || '').trim();
    if (!clean) return;
    S.profile.name = clean;
    S.profile.initials = clean.split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
    save(); emit();
  }

  /* The coach proposes; a tap accepts. Either way the proposal is answered and
     stops asking. */
  function acceptProposal() {
    var p = S.proposal;
    if (!p || !p.targets) return;
    Object.keys(p.targets).forEach(function (k) { S.targets[k] = p.targets[k]; });
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
    var parts = path.split('.'), o = S;
    /* A write into a day must not leave a half-formed day behind: anything
       reading it later expects meals and workouts to exist. */
    if (parts[0] === 'days' && parts[1]) day(parts[1]);
    for (var i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
    save(); emit();
  }

  // ---- seed: a realistic day, for testing and first-run demos ----
  function seed() {
    var k = todayKey();
    for (var i = 10; i >= 0; i--) {
      var key = shift(k, -i), d = day(key);
      d.meals = [
        { name: 'Eggs, oats and berries', slot: 'Breakfast', time: '06:40', kcal: 512, protein: 38, carbs: 44, fat: 14 },
        { name: 'Chicken and quinoa bowl', slot: 'Lunch', time: '12:15', kcal: 448, protein: 34, carbs: 41, fat: 16, photo: 'assets/art/meal-example.jpg' },
        { name: 'Greek yoghurt', slot: 'Snack', time: '15:30', kcal: 142, protein: 7, carbs: 19, fat: 2 }
      ];
      if (i > 0) d.meals.push({ name: 'Salmon, rice and greens', slot: 'Dinner', time: '19:20', kcal: 664, protein: 46, carbs: 58, fat: 21 });
      // Seeded meals need identity too, or they cannot be opened or edited.
      d.meals.forEach(function (m) { if (!m.id) m.id = 'm' + Math.random().toString(36).slice(2, 9); });
      d.steps = i === 0 ? 8432 : 9000 + ((i * 613) % 3200);
      d.weight = +(210.4 - (10 - i) * 0.28).toFixed(1);
      d.restingHr = 54 + (i % 4);
      d.sleepHr = +(6.8 + ((i * 7) % 13) / 10).toFixed(1);
      if (i > 0 && i % 2 === 1) d.workouts = [{ name: 'Push day', minutes: 46 }];
    }
    /* Invented like the rest of this: a proposal from her sitting unanswered,
       so the handshake can be walked end to end on one device. */
    S.invite = {
      routeId: 'milford', routeName: 'Milford Track', from: 'partner',
      at: new Date().toISOString(), date: k,
      counters: 0, accepted: false, decidedBy: '', nudgedAt: '',
      reply: 'Fewer hills. I mean it.',
      trail: [{ id: 'milford', name: 'Milford Track' }]
    };
    S.seeded = true;
    save(); emit();
  }

  function reset() { S = clone(DEFAULT); save(); emit(); }

  /* Everything this device holds, including the photographs, which live in
     their own database and would otherwise survive a reset. */
  function wipe(cb) {
    try { localStorage.removeItem(KEY); } catch (e) {}
    var done = function () { if (cb) cb(); };
    if (!window.indexedDB) return done();
    try {
      var req = indexedDB.deleteDatabase('insync-photos');
      req.onsuccess = done; req.onerror = done; req.onblocked = done;
    } catch (e2) { done(); }
  }

  // ---- subscribe ----
  var subs = [];
  function emit() { subs.forEach(function (f) { f(); }); }

  window.Store = {
    state: function () { return S; },
    day: day, dayAt: function (n) { return day(shift(todayKey(), n || 0)); },
    weekStart: weekStart,
    todayKey: todayKey, shift: shift, iso: iso,
    totals: totals, streak: streak, daysIn: daysIn, logged: logged,
    points: points, pointRows: pointRows, timeOfDay: timeOfDay, nextStep: nextStep,
    addMeal: addMeal, findMeal: findMeal, updateMeal: updateMeal, removeMeal: removeMeal, addWorkout: addWorkout, setSteps: setSteps, setMorning: setMorning,
    startSession: startSession, session: session, logSet: logSet, dropSet: dropSet,
    addSessionItem: addSessionItem, dropSessionItem: dropSessionItem,
    abandonSession: abandonSession, finishSession: finishSession,
    saveReflection: saveReflection, verse: verse, verseList: verseList, records: records,
    addPhoto: addPhoto, removePhoto: removePhoto, weightNear: weightNear, miles: miles,
    legMine: legMine, legHers: legHers,
    partnerName: partnerName, partnerInitials: partnerInitials, partnerRef: partnerRef,
    advanceLeg: advanceLeg,
    propose: propose, nudgeInvite: nudgeInvite, acceptInvite: acceptInvite,
    counterInvite: counterInvite, settleInvite: settleInvite,
    beginExpedition: beginExpedition, holdExpedition: holdExpedition,
    counterCap: COUNTER_CAP,
    set: set, seed: seed, reset: reset, save: save,
    fmtWeight: fmtWeight, fmtDistance: fmtDistance, fmtEnergy: fmtEnergy,
    fmtLift: fmtLift, liftNum: liftNum, fmtClimb: fmtClimb,
    weightNum: weightNum, weightToLb: weightToLb,
    recentWeights: recentWeights,
    setProfileName: setProfileName,
    acceptProposal: acceptProposal, dismissProposal: dismissProposal,
    wipe: wipe, KEY: KEY,
    on: function (f) { subs.push(f); }
  };
})();

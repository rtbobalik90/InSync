/* InSync — the single source of truth.
   Rule: nothing that appears on screen is typed. Every figure, count and
   sentence containing a number is derived from this state. */
(function () {
  'use strict';

  var KEY = 'insync.v5';

  var DEFAULT = {
    profile: { name: 'Robert', initials: 'RB', heightIn: 73, age: 41, startDate: '2026-07-28' },
    goal: 'lose-fat',
    targets: { calories: 2000, protein: 155, steps: 10000, weightGoal: 196 },
    units: { weight: 'lb', distance: 'mi', energy: 'kcal' },
    privacy: { weight: false, calories: true, workouts: true, steps: true },
    notifs: { invite: true, counter: true, target: true, accept: true, leg: true, note: true, badge: false, weekly: true },
    days: {},
    expedition: { routeId: 'camino', legIndex: 2, legMilesRobert: 8.4, legMilesLizzie: 6.1 },
    partner: { name: 'Lizzie', initials: 'LZ' },
    earned: [],
    frequency: 4,
    onboarded: false,
    connections: { githubToken: '', githubRepo: 'rtbobalik90/InSync', githubBranch: 'main', claudeKey: '', lastSync: '' },
    seeded: false
  };

  var S = load();

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
    if (!S.days[key]) S.days[key] = { meals: [], workouts: [], steps: 0, weight: null, restingHr: null, sleepHr: null, reflection: '' };
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

  function daysIn() {
    var start = new Date(S.profile.startDate + 'T12:00:00');
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

  function timeOfDay(now) {
    var h = (now || new Date()).getHours();
    if (h < 9) return 'dawn';
    if (h < 17) return 'day';
    if (h < 20) return 'sunset';
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
      return { line: 'Everything else is in. Tonight\u2019s session is the last thing between you and a clean day.', action: 'Start the session', route: 'train' };
    }
    if (d.steps < S.targets.steps) {
      return { line: (S.targets.steps - d.steps).toLocaleString() + ' steps left. A walk after dinner covers it, and the miles count toward the leg.', action: 'Log a walk', route: 'train' };
    }
    return { line: 'Nothing is outstanding. Ten of ten today.', action: 'Write the evening', route: 'reflection' };
  }

  // ---- mutations ----
  function addMeal(meal, key) {
    day(key).meals.push(Object.assign({ at: new Date().toISOString() }, meal));
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
  function set(path, value) {
    var parts = path.split('.'), o = S;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
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
      d.steps = i === 0 ? 8432 : 9000 + ((i * 613) % 3200);
      d.weight = +(210.4 - (10 - i) * 0.28).toFixed(1);
      d.restingHr = 54 + (i % 4);
      d.sleepHr = +(6.8 + ((i * 7) % 13) / 10).toFixed(1);
      if (i > 0 && i % 2 === 1) d.workouts = [{ name: 'Push day', minutes: 46 }];
    }
    S.seeded = true;
    save(); emit();
  }

  function reset() { S = clone(DEFAULT); save(); emit(); }

  // ---- subscribe ----
  var subs = [];
  function emit() { subs.forEach(function (f) { f(); }); }

  window.Store = {
    state: function () { return S; },
    day: day, todayKey: todayKey, shift: shift, iso: iso,
    totals: totals, streak: streak, daysIn: daysIn, logged: logged,
    points: points, pointRows: pointRows, timeOfDay: timeOfDay, nextStep: nextStep,
    addMeal: addMeal, addWorkout: addWorkout, setSteps: setSteps, setMorning: setMorning,
    set: set, seed: seed, reset: reset, save: save,
    on: function (f) { subs.push(f); }
  };
})();

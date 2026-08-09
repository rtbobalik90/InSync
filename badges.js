/* The 39 badges. Every condition is a function of real store state —
   nothing here is a flag someone remembers to set. */
(function () {
  'use strict';

  function days() { return Store.state().days; }
  function dayList() {
    var d = days();
    return Object.keys(d).sort().map(function (k) { return { key: k, d: d[k] }; });
  }
  function allWorkouts() {
    var out = [];
    dayList().forEach(function (x) { (x.d.workouts || []).forEach(function (w) { out.push(w); }); });
    return out;
  }
  function allExercises() {
    var out = [];
    allWorkouts().forEach(function (w) { (w.exercises || []).forEach(function (e) { out.push(e); }); });
    return out;
  }
  function totalMiles() {
    return dayList().reduce(function (a, x) { return a + Store.miles(x.d.steps); }, 0);
  }
  function weights() {
    return dayList().filter(function (x) { return x.d.weight; });
  }
  function reflectionCount() {
    return dayList().filter(function (x) { return (x.d.reflection || '').trim(); }).length;
  }
  function volume(w) {
    return (w.exercises || []).reduce(function (a, e) { return a + e.weight * e.reps * e.sets; }, 0);
  }
  function maxLift() {
    return allExercises().reduce(function (a, e) { return Math.max(a, e.weight || 0); }, 0);
  }
  function currentWeight() {
    var w = weights();
    return w.length ? w[w.length - 1].d.weight : null;
  }
  function metTargets(d) {
    var S = Store.state(), t = { cal: 0, pro: 0 };
    (d.meals || []).forEach(function (m) { t.cal += m.kcal; t.pro += m.protein; });
    return t.cal >= S.targets.calories * 0.9 && t.pro >= S.targets.protein && (d.steps || 0) >= S.targets.steps;
  }
  function cleanRun() {
    var list = dayList(), best = 0, run = 0;
    list.forEach(function (x) { run = metTargets(x.d) ? run + 1 : 0; if (run > best) best = run; });
    return best;
  }
  function proteinDays() {
    var target = Store.state().targets.protein;
    return dayList().filter(function (x) {
      return (x.d.meals || []).reduce(function (a, m) { return a + m.protein; }, 0) >= target;
    }).length;
  }
  function fullMealDays() {
    return dayList().filter(function (x) { return (x.d.meals || []).length >= 3; }).length;
  }
  function morningRun() {
    var list = dayList(), best = 0, run = 0;
    list.forEach(function (x) { run = x.d.weight ? run + 1 : 0; if (run > best) best = run; });
    return best;
  }
  function weeksOfWeights() {
    var w = weights();
    if (w.length < 2) return 0;
    var a = new Date(w[0].key + 'T12:00:00'), b = new Date(w[w.length - 1].key + 'T12:00:00');
    return Math.floor((b - a) / (7 * 86400000)) + 1;
  }
  /* The route's own leg count, read from the route table rather than assumed —
     and zero when no expedition has been agreed, so "route finished" cannot be
     earned by having walked nothing. */
  function routeLegs() {
    if (!Store.state().expedition.routeId) return 0;
    return (window.Screens && Screens.legCount) ? Screens.legCount() : 0;
  }
  function partnerPoints() {
    var pd = Store.state().partnerData;
    return pd && typeof pd.points === 'number' ? pd.points : null;
  }

  var CATS = [
    { key: 'streak', name: 'Streaks', blurb: 'Days logged without a gap.' },
    { key: 'first', name: 'Firsts', blurb: 'The first time you did each thing.' },
    { key: 'strength', name: 'Strength', blurb: 'Personal bests, machine by machine.' },
    { key: 'distance', name: 'Distance', blurb: 'Miles walked, legs and routes finished.' },
    { key: 'consistency', name: 'Consistency', blurb: 'Targets hit day after day.' },
    { key: 'body', name: 'Body', blurb: 'Weight and the photographs.' },
    { key: 'together', name: 'Together', blurb: 'Weeks shared, challenges settled.' },
    { key: 'faith', name: 'Faith', blurb: 'Reflections written, verses read.' }
  ];

  /* id, category, name, tier, condition, and the sentence shown once earned. */
  var LIST = [
    ['streak-three-days', 'streak', 'Three days', 'common', 'Logged three days running', function () { return Store.streak() >= 3; }],
    ['streak-two-weeks', 'streak', 'Two weeks', 'common', 'Fourteen days unbroken', function () { return Store.streak() >= 14; }],
    ['streak-forty-days', 'streak', 'Forty days', 'hard', 'Forty days unbroken', function () { return Store.streak() >= 40; }],
    ['streak-hundred-days', 'streak', 'A hundred days', 'rare', 'One hundred days unbroken', function () { return Store.streak() >= 100; }],
    ['streak-dawn-riser', 'streak', 'Dawn riser', 'hard', 'Ten mornings weighed in a row', function () { return morningRun() >= 10; }],

    ['first-first-step', 'first', 'First step', 'common', 'The first day logged', function () { return dayList().length >= 1; }],
    ['first-first-meal', 'first', 'First meal', 'common', 'The first meal logged', function () { return dayList().some(function (x) { return (x.d.meals || []).length; }); }],
    ['first-first-session', 'first', 'First session', 'common', 'The first workout saved', function () { return allWorkouts().length >= 1; }],
    ['first-first-weigh-in', 'first', 'First weigh-in', 'common', 'The first morning entry', function () { return weights().length >= 1; }],
    ['first-first-reflection', 'first', 'First reflection', 'common', 'The first evening written', function () { return reflectionCount() >= 1; }],
    ['first-first-leg', 'first', 'First leg', 'hard', 'The first expedition leg walked', function () { return Store.state().expedition.legIndex >= 1; }],

    ['strength-first-plate', 'strength', 'First plate', 'common', '135 lb on any machine', function () { return maxLift() >= 135; }],
    ['strength-two-hundred', 'strength', 'Two hundred', 'hard', '200 lb on any machine', function () { return maxLift() >= 200; }],
    ['strength-six-for-six', 'strength', 'Six for six', 'hard', 'Six machines in one session', function () { return allWorkouts().some(function (w) { return (w.exercises || []).length >= 6; }); }],
    ['strength-bodyweight', 'strength', 'Bodyweight', 'hard', 'Press your own bodyweight', function () { var c = currentWeight(); return c && maxLift() >= c; }],
    ['strength-ten-thousand', 'strength', 'Ten thousand', 'rare', '10,000 lb of volume in one session', function () { return allWorkouts().some(function (w) { return volume(w) >= 10000; }); }],
    ['strength-unbroken-block', 'strength', 'Unbroken block', 'rare', 'Thirty-two sessions logged', function () { return allWorkouts().length >= 32; }],

    ['distance-fifty-miles', 'distance', 'Fifty miles', 'common', 'Fifty miles walked', function () { return totalMiles() >= 50; }],
    ['distance-first-leg-walked', 'distance', 'First leg walked', 'common', 'Complete an expedition leg', function () { return Store.state().expedition.legIndex >= 1; }],
    ['distance-hundred-miles', 'distance', 'A hundred miles', 'hard', 'One hundred miles walked', function () { return totalMiles() >= 100; }],
    ['distance-route-finished', 'distance', 'Route finished', 'rare', 'Complete a whole expedition', function () { var n = routeLegs(); return n > 0 && Store.state().expedition.legIndex >= n; }],
    ['distance-both-of-you', 'distance', 'Both of you', 'hard', 'A leg you each walked some of', function () { return Store.legMine() > 0 && Store.legHers() > 0; }],

    ['consistency-clean-week', 'consistency', 'Clean week', 'common', 'Every target, seven days running', function () { return cleanRun() >= 7; }],
    ['consistency-protein-month', 'consistency', 'Protein month', 'hard', 'Protein hit on thirty days', function () { return proteinDays() >= 30; }],
    ['consistency-nothing-missed', 'consistency', 'Nothing missed', 'hard', 'Twenty-eight days with every meal logged', function () { return fullMealDays() >= 28; }],
    ['consistency-weekend-held', 'consistency', 'Weekend held', 'rare', 'Sixteen weekend days logged in full', function () {
      return dayList().filter(function (x) {
        var wd = new Date(x.key + 'T12:00:00').getDay();
        return (wd === 0 || wd === 6) && metTargets(x.d);
      }).length >= 16;
    }],

    ['body-first-photograph', 'body', 'First photograph', 'common', 'The first progress photo taken', function () { return (Store.state().photos || []).length >= 1; }],
    ['body-five-pounds', 'body', 'Five pounds', 'common', 'Five pounds down from the start', function () {
      var w = weights(); if (w.length < 2) return false;
      return w[0].d.weight - w[w.length - 1].d.weight >= 5;
    }],
    ['body-goal-weight', 'body', 'Goal weight', 'rare', 'Reach the target weight', function () {
      var c = currentWeight(), g = Store.state().targets.weightGoal;
      return c && g && c <= g;
    }],
    ['body-twelve-weeks', 'body', 'Twelve weeks', 'hard', 'Twelve weeks of weigh-ins', function () { return weeksOfWeights() >= 12; }],

    ['together-a-week-together', 'together', 'A week together', 'common', 'Seven days you both logged', function () { return !!Store.state().partnerData && Store.streak() >= 7; }],
    /* A route is only ever set once both of them have agreed it, so the route
       itself is the evidence — her synced file is not needed to prove it. */
    ['together-expedition-agreed', 'together', 'Expedition agreed', 'common', 'The first invitation accepted', function () { return !!Store.state().expedition.routeId; }],
    ['together-challenge-won', 'together', 'Challenge won', 'hard', 'Win a weekly challenge', function () {
      var p = partnerPoints(); return p !== null && Store.points() > p;
    }],
    ['together-ten-notes', 'together', 'Ten notes', 'common', 'Ten encouragements sent', function () { return (Store.state().notesSent || 0) >= 10; }],
    ['together-neck-and-neck', 'together', 'Neck and neck', 'rare', 'Finish a week within three points', function () {
      var p = partnerPoints(); return p !== null && Math.abs(Store.points() - p) <= 3;
    }],

    ['faith-first-verse', 'faith', 'First verse', 'common', 'Read the day\u2019s verse', function () { return dayList().length >= 1; }],
    ['faith-ten-reflections', 'faith', 'Ten reflections', 'common', 'Ten evenings written', function () { return reflectionCount() >= 10; }],
    ['faith-forty-evenings', 'faith', 'Forty evenings', 'hard', 'Forty reflections written', function () { return reflectionCount() >= 40; }],
    ['faith-sabbath-kept', 'faith', 'Sabbath kept', 'rare', 'Twelve weeks of Sundays logged', function () {
      return dayList().filter(function (x) { return new Date(x.key + 'T12:00:00').getDay() === 0; }).length >= 12;
    }]
  ];

  var TIER = { common: 'Common', hard: 'Hard', rare: 'Rare' };

  function all() {
    return LIST.map(function (b) {
      var earned = false;
      try { earned = !!b[5](); } catch (e) { earned = false; }
      return { id: b[0], cat: b[1], name: b[2], tier: b[3], tierLabel: TIER[b[3]], condition: b[4], earned: earned };
    });
  }

  function byCategory() {
    var list = all();
    return CATS.map(function (c) {
      var mine = list.filter(function (b) { return b.cat === c.key; });
      return {
        key: c.key, name: c.name, blurb: c.blurb, badges: mine,
        earned: mine.filter(function (b) { return b.earned; }).length,
        total: mine.length,
        stamp: (mine.filter(function (b) { return b.earned; })[0] || mine[0]).id
      };
    });
  }

  function totals() {
    var list = all();
    return { earned: list.filter(function (b) { return b.earned; }).length, total: list.length };
  }

  /* Newly earned since last check — drives the earning moment. */
  function fresh() {
    var known = Store.state().earned || [];
    return all().filter(function (b) { return b.earned && known.indexOf(b.id) < 0; });
  }
  function markSeen() {
    var ids = all().filter(function (b) { return b.earned; }).map(function (b) { return b.id; });
    Store.set('earned', ids);
  }

  window.Badges = {
    all: all, byCategory: byCategory, totals: totals, fresh: fresh, markSeen: markSeen,
    find: function (id) { return all().filter(function (b) { return b.id === id; })[0]; },
    art: function (id) { return UI.asset('assets/badges/' + id + '.png'); }
  };
})();

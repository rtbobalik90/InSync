/* InSync — cross-cutting intelligence that reads the existing local-first log.
   This module deliberately owns no storage engine. It derives review, coaching,
   progression, calendar, activity and sync-health facts from Store, and writes
   only through Store.set so backups/migrations keep one source of truth. */
(function () {
  'use strict';

  var REACTIONS = [
    { id: 'heart', glyph: '❤️', label: 'Love' },
    { id: 'clap', glyph: '👏', label: 'Cheer' },
    { id: 'fire', glyph: '🔥', label: 'Strong' }
  ];
  var WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function state() { return Store.state(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi, fallback) {
    n = +n; return isFinite(n) && n >= lo && n <= hi ? n : fallback;
  }
  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'me';
  }
  function validDate(k) {
    var x=String(k||''); if(!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
    var y=+x.slice(0,4),m=+x.slice(5,7),d=+x.slice(8,10),dt=new Date(0);
    dt.setHours(12,0,0,0); dt.setFullYear(y,m-1,d);
    return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
  }
  function totalsFor(key) {
    var d = state().days[key];
    return ((d && d.meals) || []).reduce(function (a, m) {
      a.kcal += +m.kcal || 0; a.protein += +m.protein || 0;
      a.carbs += +m.carbs || 0; a.fat += +m.fat || 0; return a;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function mealPrepPrefs() {
    var p = state().mealPrefs || {};
    var allowedDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var days = Array.isArray(p.cookDays) ? p.cookDays.filter(function (x, i, a) {
      return allowedDays.indexOf(x) >= 0 && a.indexOf(x) === i;
    }) : [];
    var leftovers=!!p.dinnerLeftovers;
    /* A Monday-starting planner needs one fresh dinner before any leftover can
       exist. Keep Monday as the anchor cook night instead of silently inventing
       an extra cooking night the user did not select. */
    if (leftovers && days.indexOf('Mon') < 0) days.unshift('Mon');
    return {
      lunchPrepDays: Math.max(0, Math.min(5, Math.round(clamp(p.lunchPrepDays, 0, 5, 0)))),
      dinnerLeftovers: leftovers,
      cookDays: days
    };
  }

  function exercisePrefs() {
    var raw = state().exercisePrefs || {};
    function ids(v) {
      return Array.isArray(v) ? v.filter(function (id, i, a) { return !!Exercises.get(id) && a.indexOf(id) === i; }).slice(-80) : [];
    }
    var log = Array.isArray(raw.swapLog) ? raw.swapLog.filter(function (x) { return x && typeof x === 'object'; }).slice(-80) : [];
    return { dislikedIds: ids(raw.dislikedIds), discomfortIds: ids(raw.discomfortIds), swapLog: log };
  }
  function avoidedExerciseIds() {
    var p = exercisePrefs(), seen = {};
    return p.dislikedIds.concat(p.discomfortIds).filter(function (id) { if (seen[id]) return false; seen[id] = true; return true; });
  }

  function repRange(ex) {
    var nums = String(ex && ex.reps || '').match(/\d+/g) || [];
    if (!nums.length) return null;
    var lo = +nums[0], hi = +(nums[nums.length - 1] || nums[0]);
    if (!(lo > 0) || !(hi >= lo) || /sec|failure|each/i.test(String(ex.reps || ''))) return null;
    return { min: lo, max: hi };
  }
  function recordFor(name) {
    var key = String(name || '').toLowerCase();
    return (Store.records ? Store.records() : []).filter(function (r) { return String(r.name || '').toLowerCase() === key; })[0] || null;
  }
  function progressionFor(idOrName) {
    var ex = Exercises.get(idOrName) || Exercises.byName(idOrName);
    var name = ex ? ex.name : String(idOrName || '');
    var rec = recordFor(name), range = repRange(ex);
    if (!rec || !rec.series || !rec.series.length) {
      return { kind: 'start', label: 'Start controlled', detail: range ? ('Choose a load you can own for ' + range.min + '–' + range.max + ' reps.') : 'Use a controlled first working set.', weight: null, reps: range && range.min };
    }
    var series = rec.series, last = series[series.length - 1], prev = series.length > 1 ? series[series.length - 2] : null;
    var weight = +last.weight || 0, reps = +last.reps || 0;
    if (!range || weight <= 0) {
      return { kind: 'repeat', label: 'Build the same movement', detail: 'Last time: ' + (weight ? Store.fmtLift(weight) + ' × ' : '') + reps + '. Add a clean rep or a little control before adding difficulty.', weight: weight || null, reps: reps ? reps + 1 : null };
    }
    var bothTop = !!prev && +prev.weight === weight && +prev.reps >= range.max && reps >= range.max;
    if (bothTop) {
      var step = /dumbbell/i.test(ex && ex.equipment || '') ? 5 : 5;
      return { kind: 'load', label: 'Ready to add load', detail: 'You reached the top of the rep range twice. Try ' + Store.fmtLift(weight + step) + ' for ' + range.min + ' reps.', weight: weight + step, reps: range.min };
    }
    if (reps < range.max) {
      return { kind: 'reps', label: 'Add one clean rep', detail: 'Last time: ' + Store.fmtLift(weight) + ' × ' + reps + '. Keep the load and aim for ' + Math.min(range.max, reps + 1) + '.', weight: weight, reps: Math.min(range.max, reps + 1) };
    }
    return { kind: 'hold', label: 'Own the top of the range', detail: 'Repeat ' + Store.fmtLift(weight) + ' × ' + range.max + ' once more before adding load.', weight: weight, reps: range.max };
  }

  function swapOptions(index, reason) {
    var sn = Store.session && Store.session();
    if (!sn || !sn.items || !sn.items[index]) return [];
    var current = Exercises.get(sn.items[index].id) || Exercises.byName(sn.items[index].name);
    if (!current) return [];
    var inSession = {};
    sn.items.forEach(function (i) { if (i.id) inSession[i.id] = true; });
    var avoided = {};
    avoidedExerciseIds().forEach(function (id) { avoided[id] = true; });
    var list = Exercises.all.filter(function (x) {
      return x.group === current.group && x.id !== current.id && !inSession[x.id] && !avoided[x.id];
    });
    reason = String(reason || 'occupied');
    list.sort(function (a, b) {
      var as = 0, bs = 0;
      if (reason === 'occupied') {
        as = a.equipment === current.equipment ? 1 : 0; bs = b.equipment === current.equipment ? 1 : 0;
      } else if (reason === 'discomfort') {
        as = a.equipment !== current.equipment ? 0 : 1; bs = b.equipment !== current.equipment ? 0 : 1;
      }
      if (as !== bs) return as - bs;
      return a.name.localeCompare(b.name);
    });
    return list.slice(0, 4);
  }

  function swapSessionItem(index, newId, reason) {
    var sn = Store.session && Store.session();
    if (!sn || !sn.items || !sn.items[index]) return false;
    var old = sn.items[index], replacement = Exercises.get(newId);
    if (!replacement || (old.sets || []).length) return false;
    var oldEx = Exercises.get(old.id) || Exercises.byName(old.name);
    if (!oldEx || replacement.group !== oldEx.group) return false;
    var next = clone(sn);
    next.items[index] = {
      id: replacement.id, name: replacement.name, gif: replacement.gif,
      equipment: replacement.equipment, targetSets: replacement.sets,
      targetReps: replacement.reps, warmup: replacement.group === 'Warm-up', sets: []
    };
    var prefs = exercisePrefs(), entry = {
      date: Store.todayKey(), fromId: oldEx.id, toId: replacement.id,
      reason: ['occupied','discomfort','dislike'].indexOf(reason) >= 0 ? reason : 'occupied'
    };
    prefs.swapLog.push(entry); prefs.swapLog = prefs.swapLog.slice(-80);
    if (entry.reason === 'dislike' && prefs.dislikedIds.indexOf(oldEx.id) < 0) prefs.dislikedIds.push(oldEx.id);
    if (entry.reason === 'discomfort' && prefs.discomfortIds.indexOf(oldEx.id) < 0) prefs.discomfortIds.push(oldEx.id);
    Store.set('exercisePrefs', prefs);
    Store.set('session', next);
    return true;
  }

  function weekStats(weekOf) {
    weekOf = validDate(weekOf) ? weekOf : Store.weekStart(Store.todayKey());
    var s = state(), today = Store.todayKey(), end = Store.shift(weekOf, 6);
    var last = end < today ? end : today, keys = [], logged = [], total = { kcal:0, protein:0, steps:0, workouts:0, points:0 };
    for (var i = 0; i < 7; i++) {
      var k = Store.shift(weekOf, i); if (k > last) break;
      if (!Store.activeOn(k)) continue;
      keys.push(k);
      var d = s.days[k], t = totalsFor(k);
      total.points += Store.points(k);
      if (d && Store.logged(k)) {
        logged.push(k); total.kcal += t.kcal; total.protein += t.protein;
        total.steps += +d.steps || 0; total.workouts += (d.workouts || []).length;
      }
    }
    var nutritionDays=logged.filter(function(k){var d=s.days[k];return d&&(d.meals||[]).length;});
    var stepDays=logged.filter(function(k){var d=s.days[k];return d&&(+d.steps||0)>0;});
    var nutritionTotals=nutritionDays.reduce(function(a,k){var t=totalsFor(k);a.kcal+=t.kcal;a.protein+=t.protein;return a;},{kcal:0,protein:0});
    var stepTotal=stepDays.reduce(function(a,k){return a+(+s.days[k].steps||0);},0);
    var weights = logged.map(function (k) { var d=s.days[k]; return d && d.weight != null ? {date:k,weight:+d.weight} : null; }).filter(Boolean);
    var weightChange = weights.length > 1 ? +(weights[weights.length-1].weight - weights[0].weight).toFixed(1) : null;
    var proteinMet = nutritionDays.filter(function (k) { return totalsFor(k).protein >= Store.scoreTargets(k).protein; }).length;
    var stepsMet = stepDays.filter(function (k) { var d=s.days[k]; return d && +d.steps >= Store.scoreTargets(k).steps; }).length;
    return {
      weekOf: weekOf, through: last, complete: end <= today, daysAvailable: keys.length, loggedDays: logged.length,
      nutritionDays:nutritionDays.length, stepDays:stepDays.length,
      points: total.points, workouts: total.workouts, avgCalories: nutritionDays.length ? Math.round(nutritionTotals.kcal/nutritionDays.length) : 0,
      avgProtein: nutritionDays.length ? Math.round(nutritionTotals.protein/nutritionDays.length) : 0,
      avgSteps: stepDays.length ? Math.round(stepTotal/stepDays.length) : 0,
      proteinMet: proteinMet, stepsMet: stepsMet, weightChange: weightChange,
      expeditionMiles: +(total.steps / 2000).toFixed(1), favorites: (s.mealFavorites || []).length,
      favoriteMealsAdded: (s.mealFavorites || []).filter(function (m) {
        var nk=String(m.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), d=(s.mealFavoriteAt||{})[nk];
        return d >= weekOf && d <= end;
      }).map(function(m){return m.name;}).slice(0,12),
      badgesEarned: Object.keys(s.badgeEarnedAt || {}).filter(function (id) {
        var d=s.badgeEarnedAt[id]; return d >= weekOf && d <= end;
      })
    };
  }

  function reviewWeekKey() {
    var today = Store.todayKey(), current = Store.weekStart(today), dow = new Date(today + 'T12:00:00').getDay();
    if (dow === 0 && Store.timeOfDay && ['sunset','night'].indexOf(Store.timeOfDay()) >= 0) return current;
    return Store.shift(current, -7);
  }
  function reviewReady(weekOf) {
    var stats = weekStats(weekOf), start = Store.startKey();
    if (stats.through < start || !stats.loggedDays) return false;
    var end = Store.shift(weekOf, 6), today = Store.todayKey();
    return end < today || (end === today && Store.timeOfDay && ['sunset','night'].indexOf(Store.timeOfDay()) >= 0);
  }
  function reviewFor(weekOf) {
    var all = state().weeklyReviews;
    return all && typeof all === 'object' ? all[weekOf] || null : null;
  }
  function saveReview(weekOf, review) {
    if (!validDate(weekOf) || !review || typeof review !== 'object') return false;
    var all = Object.assign({}, state().weeklyReviews || {});
    all[weekOf] = {
      weekOf: weekOf, generatedAt: new Date().toISOString(),
      summary: String(review.summary || '').slice(0, 1200),
      win: String(review.win || '').slice(0, 500),
      pattern: String(review.pattern || '').slice(0, 700),
      carry: String(review.carry || '').slice(0, 700)
    };
    var keys = Object.keys(all).sort();
    while (keys.length > 52) delete all[keys.shift()];
    return Store.set('weeklyReviews', all);
  }
  function nextWeekStatus(weekOf) {
    var next = Store.shift(weekOf, 7), s = state(), count = 0;
    Object.keys(s.mealPlan || {}).forEach(function (k) {
      var d = k.slice(0,10); if (d >= next && d <= Store.shift(next,6) && s.mealPlan[k]) count++;
    });
    var training = !!((s.planMeta && s.planMeta.weekOf === next) || (s.futurePlanMeta && s.futurePlanMeta.weekOf === next));
    return { weekOf: next, training: training, meals: count === 28, mealCount: count };
  }

  function patternInsights() {
    var s = state(), today = Store.todayKey(), keys = Object.keys(s.days || {}).filter(function (k) {
      return validDate(k) && k <= today && Store.activeOn(k) && Store.logged(k);
    }).sort().slice(-10), out = [];
    var last3 = keys.slice(-3);
    if (last3.length === 3) {
      var shortProtein = last3.filter(function (k) { return totalsFor(k).protein < Store.scoreTargets(k).protein; });
      if (shortProtein.length === 3) out.push({ id:'protein', route:'nutrition', title:'Protein is repeating', text:'You finished below your protein target on each of your last three logged days.' });
    }
    var last4 = keys.slice(-4);
    if (last4.length >= 3) {
      var missedSteps = last4.filter(function (k) { var d=s.days[k]; return (+d.steps||0) < Store.scoreTargets(k).steps; });
      if (missedSteps.length >= 3) out.push({ id:'steps', route:'train', title:'Steps are the recurring gap', text:'You missed the step target on ' + missedSteps.length + ' of your last ' + last4.length + ' logged days.' });
    }
    var currentWeek = Store.weekStart(today), scheduled = 0, completed = 0;
    for (var i=0;i<7;i++) {
      var dk=Store.shift(currentWeek,i); if (dk>today) break;
      var p=Store.planFor(dk); if (p && !/walk/i.test(p.name||'')) scheduled++;
      var dd=s.days[dk]; if (dd && (dd.workouts||[]).length) completed++;
    }
    if (scheduled >= 2 && completed >= scheduled) out.push({ id:'training', route:'train', title:'Training is holding', text:'You have completed every lifting session scheduled so far this week.' });
    else if (scheduled >= 2 && scheduled-completed >= 2) out.push({ id:'training', route:'train', title:'Training needs attention', text:(scheduled-completed) + ' scheduled lifting sessions are still unclosed this week.' });

    var weights = Store.recentWeights ? Store.recentWeights(14) : [];
    if (weights.length >= 3) {
      var delta = +(weights[weights.length-1].weight - weights[0].weight).toFixed(1);
      if (Math.abs(delta) >= 1) out.push({ id:'weight', route:'body', title:'Weight has a direction', text:'Across your recent weigh-ins the scale is ' + (delta < 0 ? 'down ' : 'up ') + Math.abs(delta).toFixed(1) + ' lb.' });
    }
    var disliked = s.mealDislikedMeals || [];
    if (disliked.length >= 3) out.push({ id:'taste', route:'planner', title:'Your food preferences are getting clearer', text:'You have marked ' + disliked.length + ' meals “not for me,” and the planner now keeps them out.' });
    return out.slice(0, 4);
  }
  function patternsText() { return patternInsights().map(function (x) { return x.title + ': ' + x.text; }).join('\n'); }

  function daySummary(key) {
    if (!validDate(key)) return null;
    var s = state(), d = s.days[key], t = totalsFor(key);
    if (!d && !Store.activeOn(key)) return { key:key, exists:false, active:false };
    d = d || {meals:[],workouts:[],steps:0,weight:null,reflection:''};
    return {
      key:key, exists:!!s.days[key], active:Store.activeOn(key), logged:!!s.days[key] && Store.logged(key),
      points:Store.activeOn(key) ? Store.points(key) : 0, totals:t,
      meals:(d.meals||[]).slice(), workouts:(d.workouts||[]).slice(), steps:+d.steps||0,
      trailMiles:Store.miles(+d.steps||0), photos:(s.photos||[]).filter(function(p){return p && p.date===key;}).slice(),
      weight:d.weight == null ? null : +d.weight, restingHr:d.restingHr == null ? null : +d.restingHr,
      sleepHr:d.sleepHr == null ? null : +d.sleepHr, reflection:String(d.reflection||''), verseRead:!!d.verseRead
    };
  }

  function validActivityId(id) {
    id=String(id||'');
    if (id==='__proto__' || id==='prototype' || id==='constructor') return false;
    var m=id.match(/^a:[a-z0-9-]{1,80}:(\d{4}-\d{2}-\d{2}):(score|protein|steps|workout:\d{1,3})$/);
    return !!(m && validDate(m[1]));
  }

  function localActivity(days) {
    var s=state(), today=Store.todayKey(), me=slug(s.profile.name), out=[], n=Math.max(1,Math.min(14,+days||7));
    for (var i=n-1;i>=0;i--) {
      var k=Store.shift(today,-i), d=s.days[k];
      if (!Store.activeOn(k)) continue;
      if (Store.points(k)===10) out.push({id:'a:'+me+':'+k+':score',date:k,type:'score',text:'Closed the day 10 of 10'});
      if (!d) continue;
      if (s.privacy.workouts) (d.workouts||[]).forEach(function (w,wi) { out.push({id:'a:'+me+':'+k+':workout:'+wi,date:k,type:'workout',text:'Completed '+String(w.name||'a training session').slice(0,80)}); });
      if (s.privacy.calories && totalsFor(k).protein >= Store.scoreTargets(k).protein && (d.meals||[]).length) out.push({id:'a:'+me+':'+k+':protein',date:k,type:'protein',text:'Reached the protein target'});
      if (s.privacy.steps && +d.steps >= Store.scoreTargets(k).steps && +d.steps>0) out.push({id:'a:'+me+':'+k+':steps',date:k,type:'steps',text:'Reached the step target'});
    }
    return out.slice(-30);
  }
  function reactionsGiven() {
    var raw=state().reactionsGiven;
    return raw && typeof raw==='object' && !Array.isArray(raw) ? raw : {};
  }
  function setReaction(eventId, reaction) {
    eventId=String(eventId||'').slice(0,180); reaction=String(reaction||'');
    if (!validActivityId(eventId) || !REACTIONS.some(function (r) { return r.id===reaction; })) return false;
    var map=Object.assign({},reactionsGiven());
    if (map[eventId]===reaction) delete map[eventId]; else map[eventId]=reaction;
    var keys=Object.keys(map); while(keys.length>240) delete map[keys.shift()];
    Store.set('reactionsGiven',map); return true;
  }

  function liftingTarget(weekOf) {
    var s=state(), plan=[];
    if(s.futurePlanMeta&&s.futurePlanMeta.weekOf===weekOf) plan=s.futurePlan||[];
    else if(s.planMeta&&s.planMeta.weekOf===weekOf) plan=s.plan||[];
    var lifts=plan.filter(function(p){return p && !/walk/i.test(p.name||'');}).length;
    if(lifts) return lifts;
    var f=Math.max(2,Math.min(6,+s.frequency||4)); return f>=4 ? f-1 : f;
  }
  function suggestedGoals(weekOf) {
    var patterns=patternInsights(), ids=patterns.map(function(x){return x.id;}), out=[], liftGoal=liftingTarget(weekOf);
    function add(id,label,target){ if(!out.some(function(x){return x.id===id;})) out.push({id:id,label:label,target:target}); }
    if(ids.indexOf('protein')>=0) add('protein-days','Reach the protein target on 5 days',5);
    if(ids.indexOf('steps')>=0) add('step-days','Reach the step target on 5 days',5);
    if(ids.indexOf('training')>=0 && patterns.filter(function(x){return x.id==='training'&&/attention/i.test(x.title);}).length) add('training-sessions','Complete every scheduled lifting session',liftGoal);
    add('training-sessions','Complete every scheduled lifting session',liftGoal);
    add('strong-days','Close 5 days at 8 of 10 or better',5);
    return out.slice(0,2);
  }
  function setNextWeekGoals(baseWeek) {
    var week=Store.shift(baseWeek,7), all=Object.assign({},state().weeklyGoals||{});
    all[week]=suggestedGoals(week); Store.set('weeklyGoals',all); return all[week];
  }
  function goalProgress(weekOf) {
    var goals=(state().weeklyGoals&&state().weeklyGoals[weekOf])||[], today=Store.todayKey(), last=Store.shift(weekOf,6);
    return goals.map(function(g){ var value=0;
      for(var i=0;i<7;i++){var k=Store.shift(weekOf,i);if(k>today||k>last)break;var d=state().days[k],t=totalsFor(k);
        if(g.id==='protein-days'&&d&&(d.meals||[]).length&&t.protein>=Store.scoreTargets(k).protein)value++;
        else if(g.id==='step-days'&&d&&+d.steps>=Store.scoreTargets(k).steps)value++;
        else if(g.id==='training-sessions'&&d)value+=(d.workouts||[]).length;
        else if(g.id==='strong-days'&&Store.activeOn(k)&&Store.logged(k)&&Store.points(k)>=8)value++;
      }
      return {id:g.id,label:g.label,target:g.target,value:Math.min(g.target,value),done:value>=g.target};
    });
  }

  function activateScheduledPlan() {
    var s=state(), meta=s.futurePlanMeta||{}, currentWeek=Store.weekStart(Store.todayKey());
    if (!(meta.weekOf && meta.weekOf <= currentWeek && Array.isArray(s.futurePlan) && s.futurePlan.length)) return false;
    var plan=s.futurePlan.slice(), nextMeta=Object.assign({},meta);
    Store.set('plan',plan); Store.set('planMeta',nextMeta); Store.set('futurePlan',[]); Store.set('futurePlanMeta',{});
    return true;
  }

  function syncHealth() {
    var s=state(), c=s.connections||{}, token=Store.secret&&Store.secret('githubToken'), now=Date.now();
    var success=Date.parse(c.lastSync||'')||0, errAt=Date.parse(c.lastSyncErrorAt||'')||0;
    var connected=!!token && !!String(c.githubRepo||'').trim();
    var currentError=!!c.lastSyncError && errAt>=success;
    var partnerUpdated=s.partnerData ? (Date.parse(s.partnerData.updated||'')||0) : 0;
    var partnerReceived=s.partnerData ? (Date.parse(s.partnerData.seenPartnerUpdated||'')||0) : 0;
    var status='Not connected', tone='muted';
    if (connected && typeof navigator !== 'undefined' && navigator.onLine===false) { status='Offline'; tone='warn'; }
    else if (connected && currentError) { status='Sync needs attention'; tone='bad'; }
    else if (connected && success) { status='Sync healthy'; tone='good'; }
    else if (connected) { status='Ready to sync'; tone='warn'; }
    return {connected:connected,status:status,tone:tone,lastSync:success,partnerUpdated:partnerUpdated,partnerReceived:partnerReceived,error:currentError?c.lastSyncError:''};
  }

  window.Insights={
    mealPrepPrefs:mealPrepPrefs, exercisePrefs:exercisePrefs, avoidedExerciseIds:avoidedExerciseIds,
    progressionFor:progressionFor, swapOptions:swapOptions, swapSessionItem:swapSessionItem,
    weekStats:weekStats, reviewWeekKey:reviewWeekKey, reviewReady:reviewReady, reviewFor:reviewFor, saveReview:saveReview, nextWeekStatus:nextWeekStatus,
    suggestedGoals:suggestedGoals, setNextWeekGoals:setNextWeekGoals, goalProgress:goalProgress,
    patternInsights:patternInsights, patternsText:patternsText, daySummary:daySummary,
    localActivity:localActivity, validActivityId:validActivityId, reactions:REACTIONS, reactionsGiven:reactionsGiven, setReaction:setReaction,
    activateScheduledPlan:activateScheduledPlan, syncHealth:syncHealth
  };
})();

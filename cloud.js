/* InSync — cloud.
   Two connections, both optional, both keyed on the device only:
   Claude for the coach's writing, GitHub for reaching the other phone. */
(function () {
  'use strict';

  var CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
  var DEFAULT_MODEL = 'claude-sonnet-5';

  function conn() { return Store.state().connections || {}; }
  function claudeKey() { return Store.secret ? Store.secret('claudeKey') : ''; }
  function githubToken() { return Store.secret ? Store.secret('githubToken') : ''; }
  function model() { return (conn().claudeModel || DEFAULT_MODEL).trim(); }
  function hasClaude() { return !!claudeKey(); }
  function hasGit() { return !!githubToken() && !!(conn().githubRepo || '').trim(); }

  function slug(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function meSlug() { return slug(Store.state().profile.name); }
  function partnerSlug() { return slug(Store.state().partner.name); }

  function fetchWithTimeout(url, opts, ms, label) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var request = Object.assign({}, opts || {});
    if (controller) request.signal = controller.signal;
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error((label || 'Request') + ' timed out. Check the connection and try again.'));
      }, ms);
    });
    return Promise.race([fetch(url, request), timeout]).then(function (value) {
      clearTimeout(timer); return value;
    }, function (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') throw new Error((label || 'Request') + ' timed out. Check the connection and try again.');
      throw err;
    });
  }

  // ---------- Claude ----------
  function claude(messages, opts, cb) {
    if (!hasClaude()) return cb(new Error('No Claude key set'));
    var chosenModel = model();
    var body = {
      model: chosenModel,
      max_tokens: (opts && opts.maxTokens) || 400,
      messages: messages
    };
    /* Sonnet 5 thinks adaptively by default, and thinking counts against
       max_tokens. InSync asks for short UI copy and compact JSON, so disabling
       thinking preserves those deliberately small output budgets. */
    if (chosenModel === 'claude-sonnet-5') body.thinking = { type: 'disabled' };
    var promptId = (opts && opts.promptId) || '';
    var system = (opts && opts.system) || '';
    if (window.InSyncIntelligence && promptId) {
      var registered = InSyncIntelligence.prompt(promptId);
      if (!registered) return cb(new Error('InSync Intelligence does not recognize prompt: ' + promptId));
      InSyncIntelligence.noteRequest(promptId);
      system = InSyncIntelligence.systemFor(promptId, system);
    }
    if (system) body.system = system;

    fetchWithTimeout(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': claudeKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    }, (opts && opts.timeoutMs) || 45000, 'Claude')
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error((j.error && j.error.message) || ('Claude ' + r.status));
          return j;
        });
      })
      .then(function (j) {
        var text = (j.content || []).filter(function (c) { return c.type === 'text'; })
          .map(function (c) { return c.text; }).join('').trim();
        /* Keep the callback backward-compatible while exposing why a structured
           reply stopped. Meal-week generation uses this to distinguish a normal
           parse miss from an output that was physically cut off at max_tokens. */
        cb(null, text, { stopReason: String(j.stop_reason || ''), usage: j.usage || {}, promptId: promptId,
          promptVersion: (window.InSyncIntelligence && promptId && InSyncIntelligence.prompt(promptId) ? InSyncIntelligence.prompt(promptId).version : ''),
          constitutionVersion: (window.InSyncIntelligence && InSyncIntelligence.constitution ? InSyncIntelligence.constitution.version : '') });
      })
      .catch(function (e) { cb(e); });
  }

  /* Whose phone this is. Every prompt is written from this, never from a name in
     the source — on either device the coach writes for that device's owner. */
  function me() { return Store.state().profile.name || 'you'; }

  var VOICE = 'You write for InSync, a fitness app used by one couple. ' +
    'The app is built around an expedition metaphor: camps, chapters, trailheads, legs of a route. ' +
    'Voice: field journal crossed with quiet scriptural reflection. Plain, matter-of-fact, warm but never chirpy. ' +
    'No emoji. No exclamation marks. No motivational-poster phrasing. No "here is why this matters". ' +
    'Never invent numbers — use only the figures given to you.';

  /* Every AI call goes through a stable prompt id. The prompt registry defines
     purpose, context allow-list, response contract, fallback and repair policy;
     the transport then applies the shared Constitution before the request. */
  function ai(promptId, messages, opts, cb) {
    var o = Object.assign({}, opts || {}, { promptId: promptId });
    return claude(messages, o, cb);
  }

  // Today's next step, written rather than templated.
  function coachLine(cb) {
    var k = Store.todayKey(), t = Store.totals(k), d = Store.day(k), s = Store.state();
    var ctx = window.InSyncIntelligence ? InSyncIntelligence.context('daily.next-step') : null;
    var td = ctx && ctx.today ? ctx.today : { journeyDay:Store.daysIn(), streak:Store.streak(), calories:t.kcal, protein:t.protein, steps:d.steps, workouts:d.workouts.length, meals:d.meals.map(function(m){return m.slot;}), weighed:d.weight!=null, weight:d.weight };
    var uc = ctx && ctx.user ? ctx.user : { goal:s.goal, targets:s.targets };
    var facts = [
      'Day ' + td.journeyDay + ' of the journey. Current streak ' + td.streak + ' days.',
      'Energy: ' + Store.fmtEnergy(td.calories) + ' of ' + Store.fmtEnergy(uc.targets.calories) + '.',
      'Protein: ' + td.protein + ' g of ' + uc.targets.protein + ' g.',
      'Steps: ' + td.steps + ' of ' + uc.targets.steps + '.',
      'Sessions logged today: ' + td.workouts + '.',
      'Meals logged today: ' + td.meals.length + (td.meals.length ? ' (' + td.meals.join(', ') + ')' : ''),
      'Weighed in today: ' + (td.weighed ? 'yes, ' + Store.fmtWeight(td.weight) : 'no') + '.',
      'Goal: ' + String(uc.goal || '').replace(/-/g, ' ') + '.',
      (ctx && ctx.recent && ctx.recent.patterns) ? 'Patterns already visible in the log:\n' + ctx.recent.patterns : ((window.Insights && Insights.patternsText && Insights.patternsText()) ? 'Patterns already visible in the log:\n' + Insights.patternsText() : '')
    ].filter(Boolean).join('\n');

    ai('daily.next-step', [{
      role: 'user',
      content: 'Here is ' + me() + '\'s day so far:\n\n' + facts +
        '\n\nWrite the single next useful thing they should do today. Two sentences at most. ' +
        'Name the gap and the concrete action that closes it. If nothing is outstanding, say so plainly. ' +
        'Return only the sentences, no preamble.'
    }], { system: VOICE, maxTokens: 200 }, function (err, text) {
      if (err) return cb(err);
      Store.set('coachCache', { date: k, line: text });
      if (window.InSyncIntelligence && ctx) InSyncIntelligence.rememberEvidence('daily-next-step', 'daily.next-step', InSyncIntelligence.evidenceFromContext(ctx, 'daily'));
      cb(null, text);
    });
  }


  /* The day's verse, chosen rather than rotated. Claude picks from the app's
     own list and never quotes scripture from memory, so nothing can be
     misquoted; what it contributes is the judgment about which one fits. */
  function chooseVerse(cb) {
    var k = Store.todayKey(), s = Store.state(), list = Store.verseList();
    var rows = [];
    for (var i = 6; i >= 0; i--) {
      var key = Store.shift(k, -i);
      var d = Store.day(key), t = Store.totals(key);
      rows.push(key + ': ' + Store.fmtEnergy(t.kcal) + ', ' + t.protein + ' g protein, ' +
        d.steps + ' steps, ' + d.workouts.length + ' session' + (d.workouts.length === 1 ? '' : 's') +
        (d.reflection ? ', wrote that evening' : ''));
    }
    var facts =
      'Day ' + Store.daysIn() + ' of the journey. Current streak ' + Store.streak() + ' days.\n' +
      'Goal: ' + s.goal.replace(/-/g, ' ') + '.\n' +
      'The last seven days:\n' + rows.join('\n');

    var menu = list.map(function (v, i) { return i + '. "' + v[0] + '" — ' + v[1]; }).join('\n');

    ai('faith.verse', [{
      role: 'user',
      content: facts + '\n\nHere are the verses available:\n' + menu +
        '\n\nChoose the one that fits the week ' + me() + ' has actually had. A hard week and a ' +
        'strong week should not get the same verse. Do not choose one that flatters them when the ' +
        'week was poor, or one that consoles them when the week was strong.\n\n' +
        'Return only JSON: {"index": <number>, "why": "<one short sentence, said to them>"}'
    }], { system: VOICE, maxTokens: 220 }, function (err, text) {
      if (err) return cb(err);
      var data, verdict = window.InSyncIntelligence ? InSyncIntelligence.validate('faith.verse', text) : null;
      if (verdict && !verdict.ok) return cb(new Error('The coach did not return a verse.'));
      if (verdict) data = verdict.value;
      else { try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]); } catch (e) { return cb(new Error('The coach did not return a verse.')); } }
      var idx = Math.round(+data.index);
      if (!(idx >= 0 && idx < list.length)) return cb(new Error('The coach chose a verse that does not exist.'));
      Store.set('verseCache', { date: k, index: idx, why: (data.why || '').trim() });
      cb(null, Store.verse());
    });
  }


  /* The coach writes the week's training itself. It picks only from the
     library, so every movement it names has a GIF, a group and a prescription;
     anything it invents is rejected rather than rendered as a broken row. */
  function writePlan(weekOrCb, cb) {
    var requestedWeek = typeof weekOrCb === 'string' ? weekOrCb : (Store.weekStart ? Store.weekStart() : Store.todayKey());
    cb = typeof weekOrCb === 'function' ? weekOrCb : cb;
    if (typeof cb !== 'function') cb = function () {};
    if (!validDateKey(requestedWeek)) requestedWeek = Store.weekStart(Store.todayKey());
    requestedWeek = Store.weekStart(requestedWeek);

    var s = Store.state(), freq = s.frequency || 4;
    var avoided = window.Insights && Insights.avoidedExerciseIds ? Insights.avoidedExerciseIds() : [];
    var availableTraining = window.Training && Training.availableExercises ? Training.availableExercises() : Exercises.all;
    var menu = availableTraining.filter(function (e) { return avoided.indexOf(e.id) < 0; }).map(function (e) {
      return e.id + ' — ' + e.name + ' (' + e.group + ', ' + e.equipment + ')';
    }).join('\n');

    // What they have actually been doing, machine by machine.
    var lifts = {}, sessions = [], k = Store.todayKey();
    for (var i = 27; i >= 0; i--) {
      var key = Store.shift(k, -i), d = Store.day(key);
      (d.workouts || []).forEach(function (w) {
        sessions.push(key + ': ' + w.name + ', ' + (w.minutes || 0) + ' min');
        (w.exercises || []).forEach(function (x) {
          var cur = lifts[x.name];
          if (!cur || x.weight > cur) lifts[x.name] = x.weight;
        });
      });
    }
    var lifted = Object.keys(lifts).map(function (n) { return n + ' at ' + Store.fmtLift(lifts[n]); });
    var progression = window.Insights && Insights.progressionFor ? Object.keys(lifts).slice(0, 12).map(function (n) {
      var pr = Insights.progressionFor(n); return n + ': ' + (pr && pr.detail || 'repeat cleanly');
    }) : [];

    var history = sessions.length
      ? 'Sessions in the last four weeks (' + sessions.length + '):\n' + sessions.slice(-14).join('\n') +
        (lifted.length ? '\n\nBest lift on each machine so far:\n' + lifted.join('\n') : '') +
        (progression.length ? '\n\nProgression guidance from the log:\n' + progression.join('\n') : '')
      : 'No session has been logged yet. This is the first plan.';

    var h = +(s.profile.heightIn || 0);
    var body = h ? Math.floor(h / 12) + ' ft ' + (h % 12) + ' in, age ' + (s.profile.age || 'not given') + ', ' + (s.profile.sex || 'sex not given') : 'not given';

    var basePrompt =
      'Write ' + me() + '\'s training week for the Monday beginning ' + requestedWeek + '.\n\n' +
      'Goal: ' + String(s.goal || '').replace(/-/g, ' ') + '\n' +
      'Gym days a week: ' + freq + '\n' +
      'Body: ' + body + '\n' +
      'Gym / equipment: ' + (window.Training ? Training.gymLabel(Training.profile().gymType) + ' — ' + Training.profile().equipment.join(', ') : 'configured equipment') + '.\n\n' +
      history + '\n\n' +
      (avoided.length ? 'Do not prescribe these movements; they were swapped out because the user disliked them or found them uncomfortable: ' + avoided.join(', ') + '.\n\n' : '') +
      'Available movements (use these ids exactly, nothing else):\n' + menu + '\n\n' +
      'Rules:\n' +
      '- Exactly ' + freq + ' LIFTING days. Use real weekday abbreviations: Mon Tue Wed Thu Fri Sat. Keep Sunday as the weekly recovery/rest day.\n' +
      '- Walking is tracked separately every day in InSync. NEVER replace a lifting day with a Walk/cardio day.\n' +
      '- 3 to 5 movements on every scheduled day. Do not repeat a movement within a day.\n' +
      '- Give every muscle group at least 48 hours before it is trained again, including the Saturday-to-Monday boundary.\n' +
      '- Name each day for what it trains: Upper, Lower, Push, Pull, Legs, Full body, Arms, Shoulders. Do not name a day Walk.\n' +
      '- Build on what they have been lifting. Do not drop a machine they are progressing on without replacing it with something that trains the same thing.\n\n' +
      'Return only JSON: {"days":[{"day":"Mon","name":"Upper","ex":["id","id","id"]}],"note":"<one sentence to them about why this week looks like this>"}';

    function saveValidated(data) {
      var plan = validatePlan(data && data.days, freq, avoided);
      if (!plan) return null;
      var meta = { writtenBy:'coach', weekOf:requestedWeek, note:String((data && data.note) || '').trim().slice(0,1000) };
      var currentWeek = Store.weekStart(Store.todayKey());
      if (requestedWeek > currentWeek) {
        Store.set('futurePlan', plan); Store.set('futurePlanMeta', meta);
      } else {
        Store.set('plan', plan); Store.set('planMeta', meta);
        if (Store.state().futurePlanMeta && Store.state().futurePlanMeta.weekOf === requestedWeek) {
          Store.set('futurePlan', []); Store.set('futurePlanMeta', {});
        }
      }
      return plan;
    }

    /* Claude occasionally returns one invented id or breaks the recovery rule.
       The old flow simply failed after the meal planner had already spent up to
       90 seconds working. Give the training contract one automatic repair pass
       before surfacing the failure. */
    function attempt(n, reason) {
      var prompt = basePrompt + (n ? '\n\nYour previous answer could not be accepted because ' + reason + '. Rewrite the complete week from scratch and obey every rule exactly.' : '');
      ai('trainer.week', [{ role:'user', content:prompt }], { system: VOICE, maxTokens: 1200, timeoutMs: 60000 }, function (err, text) {
        if (err) {
          if (n < 1) return attempt(n + 1, 'the request failed before a valid plan was returned');
          return cb(err);
        }
        var data;
        try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]); }
        catch (e) {
          if (n < 1) return attempt(n + 1, 'the response was not valid JSON');
          return cb(new Error('The coach did not return a readable training plan after two attempts.'));
        }
        var plan = saveValidated(data);
        if (!plan) {
          if (n < 1) return attempt(n + 1, 'the days, exercise ids, or 48-hour recovery spacing were invalid');
          return cb(new Error('The coach could not produce a safe ' + freq + '-day lifting plan after two attempts. Nothing from the active week was overwritten.'));
        }
        cb(null, plan);
      });
    }
    attempt(0, '');
  }

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* Nothing reaches the store until it is a real plan: real weekdays, no
     duplicate days, and every movement present in the library. */
  function validatePlan(days, freq, avoidedIds) {
    avoidedIds = Array.isArray(avoidedIds) ? avoidedIds : [];
    if (!Array.isArray(days) || days.length !== +freq) return null;
    var seen = {}, out = [];
    for (var i = 0; i < days.length; i++) {
      var d = days[i] || {};
      var day = String(d.day || '').slice(0, 3);
      day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      if (DAYS.indexOf(day) < 0 || day === 'Sun' || seen[day]) return null;
      seen[day] = true;
      var name = String(d.name || '').trim().slice(0, 20) || 'Session';
      /* Walking is a separate daily timer now. A coach plan must never spend
         one of the user's gym-frequency days on a walk-only placeholder. */
      if (/walk|cardio/i.test(name)) return null;
      var ids = (Array.isArray(d.ex) ? d.ex : []).filter(function (id, n, arr) {
        var ex = Exercises.get(id);
        return ex && avoidedIds.indexOf(id) < 0 && arr.indexOf(id) === n && (!window.Training || Training.equipmentAllows(ex));
      });
      if (ids.length < 3 || ids.length > 5) return null;
      out.push({ day: day, name: name, ex: ids });
    }
    if (out.length !== +freq) return null;

    /* Enforce the prompt's 48-hour recovery rule, including the Sunday-to-Monday
       boundary when this weekly plan repeats. Warm-up movements do not count. */
    var groupDays = {};
    function recoveryGroup(ex) {
      if (!ex || ex.group === 'Warm-up') return '';
      /* The library intentionally presents curls and extensions together as
         “Arms” in the UI, but treating biceps and triceps as one recovery
         muscle made normal Push/Pull schedules fail validation on consecutive
         days. Recovery validation needs the physiological split, not the
         navigation label. */
      if (ex.group === 'Arms') return /triceps/i.test(ex.id + ' ' + ex.name) ? 'Triceps' : 'Biceps';
      return ex.group;
    }
    out.forEach(function (d) {
      if (!d.ex) return;
      var di = DAYS.indexOf(d.day);
      var groups = {};
      d.ex.forEach(function (id) {
        var ex = Exercises.get(id), rg = recoveryGroup(ex);
        if (rg) groups[rg] = true;
      });
      Object.keys(groups).forEach(function (g) {
        if (!groupDays[g]) groupDays[g] = [];
        groupDays[g].push(di);
      });
    });
    var valid = Object.keys(groupDays).every(function (g) {
      var a = groupDays[g].slice().sort(function (x, y) { return x - y; });
      for (var j = 1; j < a.length; j++) if (a[j] - a[j - 1] < 2) return false;
      if (a.length > 1 && (7 - a[a.length - 1] + a[0]) < 2) return false;
      return true;
    });
    if (!valid) return null;

    out.sort(function (a, b) { return DAYS.indexOf(a.day) - DAYS.indexOf(b.day); });
    return Onboarding.withDetail(out);
  }

  // A written retrospective on the week.
  function weeklyNote(weekOf, cb) {
    /* Chapters are calendar weeks, not a rolling seven-day window. Keep the
       old one-argument call shape working for restored/older callers. */
    if (typeof weekOf === 'function') { cb = weekOf; weekOf = Store.weekStart(Store.todayKey()); }
    weekOf = /^\d{4}-\d{2}-\d{2}$/.test(String(weekOf || '')) ? String(weekOf) : Store.weekStart(Store.todayKey());
    var today = Store.todayKey(), end = Store.shift(weekOf, 6);
    if (end > today) end = today;
    var rows = [], span = Math.max(0, Math.round((new Date(end + 'T12:00:00') - new Date(weekOf + 'T12:00:00')) / 86400000));
    for (var i = 0; i <= span; i++) {
      var key = Store.shift(weekOf, i), t = Store.totals(key), d = Store.day(key);
      rows.push(key + ': ' + Store.fmtEnergy(t.kcal) + ', ' + t.protein + ' g protein, ' + d.steps + ' steps, ' +
        d.workouts.length + ' session' + (d.workouts.length === 1 ? '' : 's') + ', ' + Store.points(key) + '/10 points');
    }
    ai('weekly.chapter', [{
      role: 'user',
      content: me() + '\'s week beginning ' + weekOf + ':\n\n' + rows.join('\n') +
        '\n\nWrite three sentences about the week. Name one pattern worth noticing and one thing to carry into next week. ' +
        'Use only these figures. Return only the sentences.'
    }], { system: VOICE, maxTokens: 260 }, cb);
  }

  function weeklyReview(weekOf, cb) {
    if (!window.Insights || !Insights.weekStats) return cb(new Error('Weekly review is not available in this build.'));
    var st = Insights.weekStats(weekOf);
    var facts = [
      'Week beginning ' + st.weekOf + '.',
      st.loggedDays + ' logged day(s), ' + st.points + ' points, ' + st.workouts + ' training session(s).',
      st.nutritionDays ? 'Nutrition-day averages across ' + st.nutritionDays + ' day(s): ' + Store.fmtEnergy(st.avgCalories) + ', ' + st.avgProtein + ' g protein.' : '',
      st.stepDays ? 'Step average across ' + st.stepDays + ' day(s) with steps recorded: ' + st.avgSteps + '.' : '',
      st.loggedDays ? 'Protein target met on ' + st.proteinMet + ' nutrition day(s); step target met on ' + st.stepsMet + ' day(s) with steps recorded.' : '',
      'Walking distance represented by logged steps: ' + Store.fmtDistance(st.expeditionMiles) + '.',
      'Badges newly recorded that week: ' + ((st.badgesEarned || []).length) + '.',
      (st.favoriteMealsAdded && st.favoriteMealsAdded.length) ? 'Meals favorited that week: ' + st.favoriteMealsAdded.join(', ') + '.' : 'Meals favorited that week: none recorded.',
      'Cookbook favorites currently saved: ' + (st.favorites || 0) + '.',
      st.weightChange == null ? '' : 'Weight changed ' + (st.weightChange >= 0 ? '+' : '') + Store.weightNum(st.weightChange, 1) + ' ' + Store.state().units.weight + ' between the first and last weigh-in that week.'
    ].filter(Boolean).join('\n');
    ai('weekly.review', [{ role:'user', content:
      'Review ' + me() + '\'s week from these facts only:\n\n' + facts +
      '\n\nReturn ONLY JSON: {"summary":"2-3 grounded sentences","win":"one concrete win","pattern":"one pattern worth noticing","carry":"one specific focus for next week"}. ' +
      'Do not invent a number or praise something the facts do not support.'
    }], { system:VOICE, maxTokens:500 }, function(err,text){
      if(err) return cb(err); var out, verdict = window.InSyncIntelligence ? InSyncIntelligence.validate('weekly.review', text) : null;
      if (verdict && !verdict.ok) return cb(new Error('The weekly review came back incomplete. Try again.'));
      if (verdict) out = verdict.value;
      else { try { out=extractJson(text); } catch(e) { return cb(new Error('The weekly review could not be read. Try again.')); } }
      if(!out || !cleanText(out.summary,1200) || !cleanText(out.carry,700)) return cb(new Error('The weekly review came back incomplete. Try again.'));
      if (window.InSyncIntelligence) { var wctx=InSyncIntelligence.context('weekly.review'); InSyncIntelligence.rememberEvidence('weekly-review','weekly.review',InSyncIntelligence.evidenceFromContext(wctx,'weekly')); }
      cb(null,{summary:cleanText(out.summary,1200),win:cleanText(out.win,500),pattern:cleanText(out.pattern,700),carry:cleanText(out.carry,700)});
    });
  }

  // Free-text meal → structured macros.
  function parseMeal(text, cb) {
    ai('nutrition.meal-estimate', [{
      role: 'user',
      content: 'Estimate the nutrition for this meal: "' + text + '"\n\n' +
        'Respond with JSON only, no prose, in exactly this shape:\n' +
        '{"name":"short dish name","kcal":000,"protein":00,"carbs":00,"fat":00,' +
        '"items":[{"name":"ingredient","weight":"000 g","kcal":000,"protein":00,"carbs":00,"fat":00}]}'
    }], { maxTokens: 700 }, function (err, out) {
      if (err) return cb(err);
      cb(null, extractJson(out));
    });
  }

  /* A restaurant's menu, as far as the model knows it. Estimates, and the
     sheet says so — the point is a starting number you can correct. */
  function restaurantMenu(place, cb) {
    ai('nutrition.restaurant-menu', [{
      role: 'user',
      content: 'List the most commonly ordered menu items at "' + place + '".\n' +
        'Give 8 to 12 items, favouring ones a person tracking protein would order.\n' +
        'Use real menu item names. Estimate nutrition per standard serving.\n\n' +
        'Respond with JSON only, no prose, in exactly this shape:\n' +
        '{"place":"the restaurant name","items":[{"name":"menu item","kcal":000,"protein":00,"carbs":00,"fat":00}]}'
    }], { maxTokens: 900 }, function (err, out) {
      if (err) return cb(err);
      var data = extractJson(out);
      if (!data || !data.items || !data.items.length) return cb(new Error('Nothing came back for that place.'));
      cb(null, data);
    });
  }

  // Photograph → ingredients and macros.
  function parseMealPhoto(dataUrl, cb) {
    var m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(dataUrl || '');
    if (!m) return cb(new Error('Could not read that photo'));
    ai('nutrition.meal-photo', [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
        { type: 'text', text: 'Identify what is on this plate and estimate the nutrition.\n' +
          'For each ingredient give x and y as percentages of the image width and height, ' +
          'pointing at the centre of that food in the photograph. 0,0 is top left.\n\n' +
          'Respond with JSON only, no prose, in exactly this shape:\n' +
          '{"name":"short dish name","kcal":000,"protein":00,"carbs":00,"fat":00,' +
          '"items":[{"name":"ingredient","weight":"000 g","kcal":000,"protein":00,"carbs":00,"fat":00,"x":00,"y":00}]}\n' +
          'If you can only identify some of it, return what you are sure of and nothing more.' }
      ]
    }], { maxTokens: 1000 }, function (err, out) {
      if (err) return cb(err);
      cb(null, extractJson(out));
    });
  }

  // Photograph of a barcode → the digits beneath it.
  function readBarcodePhoto(dataUrl, cb) {
    var m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(dataUrl || '');
    if (!m) return cb(new Error('Could not read that photo'));
    ai('nutrition.barcode-photo', [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
        { type: 'text', text: 'Read the barcode number printed beneath the bars. ' +
          'Respond with JSON only: {"code":"digits only"}. If you cannot read it, return {"code":""}.' }
      ]
    }], { maxTokens: 120 }, function (err, out) {
      if (err) return cb(err);
      var d = extractJson(out);
      if (!d || !d.code) return cb(new Error('Could not read the number. Type it instead.'));
      cb(null, d.code.replace(/\D/g, ''));
    });
  }

  // One named dish at one named place.
  function menuItem(place, dish, cb) {
    ai('nutrition.menu-item', [{
      role: 'user',
      content: 'Estimate the nutrition for "' + dish + '" at "' + place + '".\n' +
        'Use the real menu item if you know it. One standard serving as it is normally served.\n' +
        'If several versions exist, give the most commonly ordered one.\n\n' +
        'Respond with JSON only, no prose, in exactly this shape:\n' +
        '{"place":"the restaurant name","items":[{"name":"menu item as written on the menu",' +
        '"kcal":000,"protein":00,"carbs":00,"fat":00}]}'
    }], { maxTokens: 400 }, function (err, out) {
      if (err) return cb(err);
      var data = extractJson(out);
      if (!data || !data.items || !data.items.length) return cb(new Error('Nothing came back for that dish.'));
      cb(null, data);
    });
  }

  function extractJson(text) {
    try { return JSON.parse(text); } catch (e) {}
    var a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('Could not read the reply');
    return JSON.parse(text.slice(a, b + 1));
  }

  // ---------- GitHub ----------
  var verifiedRepo = '', verifiedAt = 0;

  function pagesSourceRepo() {
    var host = (location.hostname || '').toLowerCase();
    var m = /^([^.]+)\.github\.io$/.exec(host);
    if (!m) return '';
    var owner = m[1], first = (location.pathname || '/').split('/').filter(Boolean)[0];
    return (owner + '/' + (first || owner + '.github.io')).toLowerCase();
  }

  function ensureSyncRepo(cb) {
    var c = conn(), repo = String(c.githubRepo || '').trim(), branch = String(c.githubBranch || 'main').trim() || 'main';
    var verificationKey = repo + '@' + branch;
    var headers = { 'authorization': 'Bearer ' + githubToken(), 'accept': 'application/vnd.github+json', 'x-github-api-version': '2026-03-10' };
    if (!githubToken()) return cb(new Error('No GitHub token set'));
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return cb(new Error('Use the GitHub repository format owner/repository.'));
    if (!String(Store.state().profile.name || '').trim() || !meSlug()) return cb(new Error('Set your name in Settings before syncing.'));
    if (!String(Store.state().partner.name || '').trim() || !partnerSlug()) return cb(new Error('Set your partner’s name in Settings before syncing.'));
    if (meSlug() === partnerSlug()) return cb(new Error('You and ' + Store.partnerName() + ' need different names in Settings so each phone has its own sync file.'));
    if (repo.toLowerCase() === pagesSourceRepo()) {
      return cb(new Error('For privacy, the sync repository cannot be the repository publishing this GitHub Pages app. Use a separate private repository for sync data.'));
    }
    if (verifiedRepo === verificationKey && Date.now() - verifiedAt < 10 * 60 * 1000) return cb(null, true);

    function apiJson(url, allowMissing) {
      return fetchWithTimeout(url, { headers: headers }, 15000, 'GitHub').then(function (r) {
        if (allowMissing && r.status === 404) return null;
        return r.text().then(function (text) {
          var j = {};
          if (text) {
            try { j = JSON.parse(text); } catch (e) { throw new Error('GitHub returned an unreadable response.'); }
          }
          if (!r.ok) throw new Error(j.message || ('GitHub ' + r.status));
          return j;
        });
      });
    }
    function looksLikeApp(list) {
      if (!Array.isArray(list)) return false;
      var names = list.map(function (x) { return String(x.name || '').toLowerCase(); });
      var signatures = ['index.html', 'app.js', 'sw.js', 'manifest.webmanifest'];
      return signatures.filter(function (n) { return names.indexOf(n) >= 0; }).length >= 2;
    }

    apiJson('https://api.github.com/repos/' + repo, false).then(function (j) {
      if (!j.private) throw new Error('That repository is public. InSync sync data must use a dedicated private repository.');
      return apiJson('https://api.github.com/repos/' + repo + '/contents?ref=' + encodeURIComponent(branch), true);
    }).then(function (root) {
      if (root === null) throw new Error('That branch does not exist yet. Initialize the private sync repository with a README, then use that branch here.');
      if (looksLikeApp(root)) throw new Error('That repository contains the InSync app. Use a different private repository only for sync data.');
      var hasDocs = Array.isArray(root) && root.some(function (x) { return x.type === 'dir' && String(x.name).toLowerCase() === 'docs'; });
      if (!hasDocs) return null;
      return apiJson('https://api.github.com/repos/' + repo + '/contents/docs?ref=' + encodeURIComponent(branch), true);
    }).then(function (docs) {
      if (looksLikeApp(docs)) throw new Error('That repository contains the InSync app in /docs. Use a different private repository only for sync data.');
      verifiedRepo = verificationKey; verifiedAt = Date.now();
      cb(null, true);
    }).catch(function (e) { cb(e); });
  }

  function gh(path, opts, cb) {
    var c = conn();
    if (!hasGit()) return cb(new Error('No GitHub token set'));
    var url = 'https://api.github.com/repos/' + c.githubRepo + '/contents/' + path;
    if (opts.method === 'GET') url += '?ref=' + encodeURIComponent(c.githubBranch || 'main');
    fetchWithTimeout(url, {
      method: opts.method,
      headers: {
        'authorization': 'Bearer ' + githubToken(),
        'accept': 'application/vnd.github+json',
        'x-github-api-version': '2026-03-10',
        'content-type': 'application/json'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }, 15000, 'GitHub sync')
      .then(function (r) {
        if (r.status === 404) return { __missing: true };
        return r.text().then(function (text) {
          var j = {};
          if (text) {
            try { j = JSON.parse(text); } catch (e) {
              var malformed = new Error('GitHub returned an unreadable response.');
              malformed.status = r.status; throw malformed;
            }
          }
          if (!r.ok) {
            var err = new Error(j.message || ('GitHub ' + r.status));
            err.status = r.status; throw err;
          }
          return j;
        });
      })
      .then(function (j) { cb(null, j); })
      .catch(function (e) { cb(e); });
  }

  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(str) { return decodeURIComponent(escape(atob((str || '').replace(/\n/g, '')))); }

  function cleanText(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 500); }
  function validDateKey(value) {
    var x = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
    var y = +x.slice(0, 4), m = +x.slice(5, 7), d = +x.slice(8, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var test = new Date(0);
    test.setHours(12, 0, 0, 0); test.setFullYear(y, m - 1, d);
    return test.getFullYear() === y && test.getMonth() === m - 1 && test.getDate() === d;
  }
  function boundedNumber(value, min, max, fallback) {
    var n = +value;
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  }

  function latestSharedNote() {
    var s = Store.state(), keys = Object.keys(s.days || {}).filter(validDateKey).sort().reverse();
    for (var i = 0; i < keys.length && i < 35; i++) {
      var d = s.days[keys[i]], note = d && cleanText(d.noteToPartner, 2000);
      if (note) return { date: keys[i], text: note };
    }
    return { date: '', text: '' };
  }

  /* A private repository is still external input. Only the small schema InSync
     understands is allowed into local state, so a damaged or hand-edited sync
     file cannot poison screens, scoring, or the next upload. */
  function sanitizePartnerPayload(raw) {
    if (!raw || Object.prototype.toString.call(raw) !== '[object Object]') throw new Error('The partner sync file is not a valid InSync record.');
    var expected = partnerSlug(), incomingName = cleanText(raw.name, 80);
    if (!expected || slug(incomingName) !== expected) throw new Error('The partner sync file belongs to a different profile. Check the partner name on both phones.');
    var date = cleanText(raw.date, 10);
    if (!validDateKey(date)) throw new Error('The partner sync file has an invalid date.');
    var out = {
      schema: boundedNumber(raw.schema, 1, 20, 1),
      name: incomingName,
      initials: cleanText(raw.initials, 4),
      date: date,
      startDate: validDateKey(raw.startDate) ? raw.startDate : '',
      updated: (function(){ var u=cleanText(raw.updated,80); return u && !isNaN(Date.parse(u)) ? u : ''; })(),
      points: boundedNumber(raw.points, 0, 10, 0),
      streak: Math.round(boundedNumber(raw.streak, 0, 10000, 0)),
      earned: [],
      note: cleanText(raw.note, 2000),
      noteDate: validDateKey(raw.noteDate) ? raw.noteDate : date,
      messages: [],
      activity: [],
      reactions: {},
      seenPartnerUpdated: '',
      history: { points: {}, logged: {} }
    };
    if (Array.isArray(raw.messages)) {
      raw.messages.slice(-100).forEach(function (m) {
        if (!m || Object.prototype.toString.call(m) !== '[object Object]') return;
        var mid = cleanText(m.id, 120), text = cleanText(m.text, 140);
        var md = validDateKey(m.date) ? m.date : date;
        var created = cleanText(m.createdAt, 80), sent = cleanText(m.sentAt, 80), display = cleanText(m.displayTime, 40);
        if (!mid || !text) return;
        if (created && isNaN(Date.parse(created))) created = '';
        if (sent && isNaN(Date.parse(sent))) sent = '';
        out.messages.push({ id: mid, date: md, text: text, createdAt: created, sentAt: sent, displayTime: display });
      });
    }
    if (Array.isArray(raw.activity)) {
      raw.activity.slice(-40).forEach(function (a) {
        if (!a || Object.prototype.toString.call(a) !== '[object Object]') return;
        var id=cleanText(a.id,180), ad=validDateKey(a.date)?a.date:date, type=cleanText(a.type,30), text=cleanText(a.text,140), created=cleanText(a.createdAt,80);
        if (created && isNaN(Date.parse(created))) created='';
        var activityOk = window.Insights && Insights.validActivityId ? Insights.validActivityId(id) : /^a:[a-z0-9-]{1,80}:\d{4}-\d{2}-\d{2}:(score|protein|steps|workout:\d{1,3})$/.test(id);
        if (activityOk && ['score','workout','protein','steps'].indexOf(type)>=0 && text) out.activity.push({id:id,date:ad,type:type,text:text,createdAt:created});
      });
    }
    if (raw.reactions && Object.prototype.toString.call(raw.reactions) === '[object Object]') {
      Object.keys(raw.reactions).slice(-240).forEach(function (id) {
        var r=cleanText(raw.reactions[id],20);
        var eventOk = window.Insights && Insights.validActivityId ? Insights.validActivityId(id) : /^a:[a-z0-9-]{1,80}:\d{4}-\d{2}-\d{2}:(score|protein|steps|workout:\d{1,3})$/.test(id);
        if (eventOk && ['heart','clap','fire'].indexOf(r)>=0) out.reactions[id]=r;
      });
    }
    var seen = cleanText(raw.seenPartnerUpdated,80);
    if (seen && !isNaN(Date.parse(seen))) out.seenPartnerUpdated=seen;
    if (Array.isArray(raw.earned)) {
      raw.earned.slice(0, 200).forEach(function (id) {
        if (typeof id !== 'string') return;
        id = cleanText(id, 100);
        if (id && out.earned.indexOf(id) < 0) out.earned.push(id);
      });
    }
    var hp = raw.history && raw.history.points, hl = raw.history && raw.history.logged;
    if (hp && Object.prototype.toString.call(hp) === '[object Object]') {
      Object.keys(hp).forEach(function (k) {
        if (!validDateKey(k)) return;
        var value = boundedNumber(hp[k], 0, 10, null);
        if (value != null) out.history.points[k] = value;
      });
    }
    if (hl && Object.prototype.toString.call(hl) === '[object Object]') {
      Object.keys(hl).forEach(function (k) { if (validDateKey(k)) out.history.logged[k] = !!hl[k]; });
    }
    var optional = [
      ['calories', 0, 10000], ['protein', 0, 1000], ['workouts', 0, 50],
      ['steps', 0, 200000], ['legMiles', 0, 5000]
    ];
    optional.forEach(function (spec) {
      if (raw[spec[0]] == null) return;
      var n = boundedNumber(raw[spec[0]], spec[1], spec[2], null);
      if (n != null) out[spec[0]] = n;
    });
    if (raw.weightTrend && Object.prototype.toString.call(raw.weightTrend) === '[object Object]') {
      var change = boundedNumber(raw.weightTrend.change, -200, 200, null);
      var days = boundedNumber(raw.weightTrend.days, 2, 100, null);
      if (change != null && days != null) out.weightTrend = { change: change, days: Math.round(days) };
    }
    if (raw.expedition && Object.prototype.toString.call(raw.expedition) === '[object Object]') {
      var expRoute = cleanText(raw.expedition.routeId, 100);
      var expIndex = Math.max(0, Math.round(boundedNumber(raw.expedition.legIndex, 0, 1000, 0)));
      var knownLegs = window.Screens && Screens.legCountFor ? Screens.legCountFor(expRoute) : 0;
      if (knownLegs && expIndex > knownLegs) expIndex = knownLegs;
      if (expRoute) {
        out.expedition = {
          routeId: expRoute, legIndex: expIndex,
          legStart: validDateKey(raw.expedition.legStart) ? raw.expedition.legStart : date,
          updatedAt: cleanText(raw.expedition.updatedAt, 40)
        };
        if (raw.expedition.previousLegMiles != null) {
          var prevMiles = boundedNumber(raw.expedition.previousLegMiles, 0, 5000, null);
          if (prevMiles != null) out.expedition.previousLegMiles = prevMiles;
        }
      }
    }
    if (raw.invite && Object.prototype.toString.call(raw.invite) === '[object Object]') {
      var routeId = cleanText(raw.invite.routeId, 100), routeName = cleanText(raw.invite.routeName, 120);
      if (routeId) {
        var trail = [];
        if (Array.isArray(raw.invite.trail)) {
          raw.invite.trail.slice(0, 12).forEach(function (t) {
            if (!t || Object.prototype.toString.call(t) !== '[object Object]') return;
            var id = cleanText(t.id, 100), name = cleanText(t.name, 120);
            if (id) trail.push({ id: id, name: name || id });
          });
        }
        out.invite = {
          routeId: routeId, routeName: routeName || routeId, proposedByMe: !!raw.invite.proposedByMe,
          at: cleanText(raw.invite.at, 40), updatedAt: cleanText(raw.invite.updatedAt, 40),
          rev: Math.max(0, Math.round(boundedNumber(raw.invite.rev, 0, 1000000, 0))),
          date: validDateKey(raw.invite.date) ? raw.invite.date : date,
          counters: Math.max(0, Math.min(2, Math.round(boundedNumber(raw.invite.counters, 0, 2, 0)))),
          accepted: !!raw.invite.accepted, decidedBy: cleanText(raw.invite.decidedBy, 20),
          nudgedAt: cleanText(raw.invite.nudgedAt, 40), reply: cleanText(raw.invite.reply, 500), trail: trail
        };
      }
    }
    if (raw.sharedDinnerProfile && Object.prototype.toString.call(raw.sharedDinnerProfile) === '[object Object]') {
      var sdk=boundedNumber(raw.sharedDinnerProfile.kcal,200,2000,null), sdp=boundedNumber(raw.sharedDinnerProfile.protein,10,200,null);
      if (sdk != null && sdp != null) out.sharedDinnerProfile={ name:cleanText(raw.sharedDinnerProfile.name,80)||incomingName, kcal:Math.round(sdk), protein:Math.round(sdp) };
    }
    if (raw.sharedPrayer && Object.prototype.toString.call(raw.sharedPrayer) === '[object Object]') {
      var prayerId = cleanText(raw.sharedPrayer.id, 120), prayerText = cleanText(raw.sharedPrayer.text, 700);
      if (prayerId && prayerText) {
        out.sharedPrayer = {
          id: prayerId,
          text: prayerText,
          category: ['General','Faith','Family','Relationship','Work','Health','Other'].indexOf(raw.sharedPrayer.category) >= 0 ? raw.sharedPrayer.category : 'General',
          createdAt: (function(){ var at=cleanText(raw.sharedPrayer.createdAt,80); return at && !isNaN(Date.parse(at)) ? at : ''; })()
        };
      }
    }
    out.prayerAcks = [];
    if (Array.isArray(raw.prayerAcks)) {
      raw.prayerAcks.slice(-80).forEach(function (a) {
        if (!a || Object.prototype.toString.call(a) !== '[object Object]') return;
        var aid = cleanText(a.id,120), at = cleanText(a.at,80);
        if (aid && at && !isNaN(Date.parse(at))) out.prayerAcks.push({ id:aid, at:at });
      });
    }
    return out;
  }

  // Core Together status always crosses; the sensitive health fields below obey the privacy toggles.
  function sharePayload() {
    var s = Store.state(), k = Store.todayKey(), t = Store.totals(k), d = Store.day(k), sharedNote = latestSharedNote();
    var out = {
      schema: 7,
      name: s.profile.name,
      initials: s.profile.initials,
      date: k,
      startDate: Store.startKey ? Store.startKey() : (s.profile.startDate || k),
      updated: new Date().toISOString(),
      points: Store.points(k),
      streak: Store.streak(),
      earned: (s.earned || []).slice(),
      note: sharedNote.text,
      noteDate: sharedNote.date,
      seenPartnerUpdated: s.partnerData && s.partnerData.updated ? cleanText(s.partnerData.updated,80) : '',
      activity: window.Insights && Insights.localActivity ? Insights.localActivity(7) : [],
      reactions: window.Insights && Insights.reactionsGiven ? Insights.reactionsGiven() : {},
      /* Shared Dinner is separately opt-in. Only the dinner-sized calorie/protein
         target crosses; daily totals, meal logs and exact food history remain private. */
      sharedDinnerProfile: window.Nutrition && Nutrition.sharedDinnerProfile ? Nutrition.sharedDinnerProfile() : null,
      /* Faith privacy is opt-in: only the one request deliberately selected
         for sharing crosses. The private prayer journal, answers and gratitude
         never enter this payload. */
      sharedPrayer: window.Faith && Faith.sharedPrayerPayload ? Faith.sharedPrayerPayload() : null,
      prayerAcks: window.Faith && Faith.sharedPrayerAcks ? Faith.sharedPrayerAcks() : [],
      messages: (s.sentMessages || []).slice(-50).map(function (m) {
        return {
          id: cleanText(m.id, 120), date: validDateKey(m.date) ? m.date : k,
          text: cleanText(m.text, 140), createdAt: cleanText(m.createdAt, 80),
          sentAt: cleanText(m.sentAt, 80), displayTime: cleanText(m.displayTime, 40)
        };
      }).filter(function (m) { return !!m.id && !!m.text; }),
      history: { points: {}, logged: {} },
      expedition: {
        routeId: s.expedition.routeId || '', legIndex: Math.max(0, +(s.expedition.legIndex || 0)),
        legStart: s.expedition.legStart || '',
        updatedAt: (s.lastArrival && s.lastArrival.routeId === s.expedition.routeId &&
          +s.lastArrival.legIndex === Math.max(0, +(s.expedition.legIndex || 0)) - 1 && s.lastArrival.at) || ''
      }
    };
    for (var h = 34; h >= 0; h--) {
      var hk = Store.shift(k, -h);
      if (Store.activeOn && !Store.activeOn(hk)) continue;
      out.history.points[hk] = Store.points(hk);
      out.history.logged[hk] = !!Store.logged(hk);
    }
    /* The proposal crosses over so the handshake works between two devices.
       Whose turn it is cannot travel as "me" — the reader flips it. */
    if (s.invite) {
      out.invite = {
        routeId: s.invite.routeId, routeName: s.invite.routeName,
        proposedByMe: s.invite.from === 'me',
        at: s.invite.at, updatedAt: s.invite.updatedAt || s.invite.at || '', rev: +s.invite.rev || 1, date: s.invite.date,
        counters: s.invite.counters || 0,
        accepted: !!s.invite.accepted,
        decidedBy: s.invite.decidedBy || '',
        nudgedAt: s.invite.nudgedAt || '',
        reply: s.invite.reply || '',
        trail: s.invite.trail || []
      };
    }
    if (s.privacy.calories) { out.calories = t.kcal; out.protein = t.protein; }
    if (s.privacy.workouts) out.workouts = (d.workouts || []).length;
    if (s.privacy.steps) {
      out.steps = d.steps;
      out.legMiles = Store.legMine();
      if (s.lastArrival && s.lastArrival.routeId === s.expedition.routeId &&
          s.lastArrival.legIndex === s.expedition.legIndex - 1) {
        out.expedition.previousLegMiles = Math.max(0, +(s.lastArrival.milesMine || 0));
      }
    }
    if (s.privacy.weight) {
      var w = Store.recentWeights(14);
      if (w.length > 1) {
        out.weightTrend = { change: +(w[w.length - 1].weight - w[0].weight).toFixed(1), days: w.length };
      }
    }
    // Photos and exact bodyweight never cross.
    return out;
  }

  function pushUnsafe(cb, retries) {
    retries = retries == null ? 1 : retries;
    if (!meSlug() || !partnerSlug()) return cb(new Error('Set both names in Settings before syncing.'));
    if (meSlug() === partnerSlug()) {
      return cb(new Error('You and ' + Store.partnerName() + ' have the same name set. Change one in Settings, or you would both write to the same file.'));
    }
    var path = 'sync/' + meSlug() + '.json';
    gh(path, { method: 'GET' }, function (err, existing) {
      if (err) return cb(err);
      /* Build after the GET so state changed while the request was in flight is
         included in the write instead of waiting for another sync cycle. */
      var shared = sharePayload(), payload = JSON.stringify(shared, null, 2);
      var body = {
        message: 'InSync: ' + Store.state().profile.name + ' ' + Store.todayKey(),
        content: b64encode(payload),
        branch: conn().githubBranch || 'main'
      };
      if (existing && existing.sha) body.sha = existing.sha;
      gh(path, { method: 'PUT', body: body }, function (e2) {
        if (e2 && retries > 0 && (e2.status === 409 || e2.status === 422)) return pushUnsafe(cb, retries - 1);
        if (e2) return cb(e2);
        if (shared.messages && shared.messages.length && Store.markMessagesSynced) {
          Store.markMessagesSynced(shared.messages);
        } else if (shared.note && shared.noteDate && Store.markCurrentNoteSynced) {
          Store.markCurrentNoteSynced(shared.noteDate, shared.note);
        }
        cb(null, true);
      });
    });
  }

  var pushBusy = false, pushQueued = false, pushWaiters = [];
  function push(cb) {
    pushWaiters.push(typeof cb === 'function' ? cb : function () {});
    if (pushBusy) { pushQueued = true; return; }
    pushBusy = true;

    function finish(err, value) {
      if (!err && pushQueued) {
        pushQueued = false;
        return pushUnsafe(function (e2, v2) { finish(e2, v2); }, 1);
      }
      pushBusy = false; pushQueued = false;
      var waiters = pushWaiters.splice(0);
      waiters.forEach(function (fn) { try { fn(err || null, value); } catch (e) {} });
    }

    ensureSyncRepo(function (err) {
      if (err) return finish(err);
      pushUnsafe(function (e2, value) { finish(e2, value); }, 1);
    });
  }

  var applyingRemote = false;
  function pull(cb) {
    if (!partnerSlug()) return cb(new Error('Set your partner’s name in Settings before syncing.'));
    gh('sync/' + partnerSlug() + '.json', { method: 'GET' }, function (err, j) {
      if (err) return cb(err);
      if (!j || j.__missing) return cb(null, null);
      var raw, data;
      try { raw = JSON.parse(b64decode(j.content)); data = sanitizePartnerPayload(raw); }
      catch (e) { return cb(e && e.message ? e : new Error('The partner sync file could not be read')); }
      applyingRemote = true;
      try {
        Store.set('partnerData', data);
      var localExp = Store.state().expedition || {};
      if (data.expedition && data.expedition.routeId === localExp.routeId &&
          data.expedition.legIndex > (+localExp.legIndex || 0) && Store.syncExpeditionProgress) {
        Store.syncExpeditionProgress(data.expedition);
        localExp = Store.state().expedition || {};
      }
      var sameLeg = !!data.expedition && data.expedition.routeId === localExp.routeId &&
        data.expedition.legIndex === (+localExp.legIndex || 0);
      Store.set('partnerLegMiles', sameLeg && typeof data.legMiles === 'number' ? data.legMiles : 0);
      if (data.invite) {
        var here = Store.state().invite, incoming = data.invite;
        var inRev = +incoming.rev || 0, hereRev = +(here && here.rev) || 0;
        var applyInvite = !here;
        if (!applyInvite && inRev !== hereRev) applyInvite = inRev > hereRev;
        if (!applyInvite && (incoming.at || '') > (here.at || '')) applyInvite = true;
        if (!applyInvite && (+incoming.counters || 0) > (+here.counters || 0)) applyInvite = true;
        if (!applyInvite && incoming.accepted && !here.accepted) applyInvite = true;
        if (!applyInvite && (incoming.nudgedAt || '') > (here.nudgedAt || '')) applyInvite = true;
        if (!applyInvite && (incoming.updatedAt || '') > (here.updatedAt || '')) applyInvite = true;
        if (applyInvite) {
          Store.set('invite', {
            routeId: incoming.routeId, routeName: incoming.routeName,
            from: incoming.proposedByMe ? 'partner' : 'me',
            at: incoming.at, updatedAt: incoming.updatedAt || incoming.at || '', rev: inRev || Math.max(1, (+incoming.counters || 0) + 1), date: incoming.date,
            counters: incoming.counters || 0, accepted: !!incoming.accepted,
            decidedBy: incoming.decidedBy === 'me' ? 'partner'
              : incoming.decidedBy === 'partner' ? 'me' : (incoming.decidedBy || ''),
            nudgedAt: incoming.nudgedAt || '', reply: incoming.reply || '', trail: incoming.trail || []
          });
        }
      }
      var hist = Store.state().partnerHistory || {};
      var loggedHist = Store.state().partnerLoggedHistory || {};
      if (data.history && data.history.points) {
        Object.keys(data.history.points).forEach(function (k) { hist[k] = data.history.points[k]; });
        Object.keys(data.history.logged || {}).forEach(function (k) { loggedHist[k] = !!data.history.logged[k]; });
      } else if (typeof data.points === 'number') {
        hist[data.date] = data.points; loggedHist[data.date] = true;
      }
      /* Schema 5 declares when that phone's journey actually began. Purge any
         older cached values left by 5.2.x, whose recovery-day scoring could
         manufacture points before onboarding. */
      if (data.startDate) {
        Object.keys(hist).forEach(function (k) { if (k < data.startDate) delete hist[k]; });
        Object.keys(loggedHist).forEach(function (k) { if (k < data.startDate) delete loggedHist[k]; });
      }
      var cutoff = Store.shift(Store.todayKey(), -45);
      Object.keys(hist).forEach(function (k) { if (!validDateKey(k) || k < cutoff) delete hist[k]; });
      Object.keys(loggedHist).forEach(function (k) { if (!validDateKey(k) || k < cutoff) delete loggedHist[k]; });
      Store.set('partnerHistory', hist);
      Store.set('partnerLoggedHistory', loggedHist);
      } catch (applyErr) {
        applyingRemote = false;
        return cb(applyErr && applyErr.message ? applyErr : new Error('The partner sync data could not be applied safely.'));
      }
      applyingRemote = false;
      return cb(null, data);
    });
  }

  var syncBusy = false, syncQueued = false, syncWaiters = [];
  function sync(cb) {
    syncWaiters.push(typeof cb === 'function' ? cb : function () {});
    if (syncBusy) { syncQueued = true; return; }
    syncBusy = true;

    function finishAll(err, data) {
      if (!err && syncQueued) { syncQueued = false; return runRound(); }
      syncBusy = false; syncQueued = false;
      var waiters = syncWaiters.splice(0);
      waiters.forEach(function (fn) { try { fn(err || null, data); } catch (e) {} });
    }
    function fail(err) {
      Store.set('connections.lastSyncError', err && err.message ? err.message : 'Sync failed');
      Store.set('connections.lastSyncErrorAt', new Date().toISOString());
      finishAll(err);
    }
    function runRound() {
      push(function (err) {
        if (err) return fail(err);
        pull(function (e2, data) {
          if (e2) return fail(e2);
          Store.set('connections.lastSync', new Date().toISOString());
          Store.set('connections.lastSyncError', '');
          Store.set('connections.lastSyncErrorAt', '');
          finishAll(null, data);
        });
      });
    }
    runRound();
  }

  var autoTimer = null, lastAutoAttempt = 0;
  function autoSync(force) {
    if (!hasGit() || !Store.state().partner.name) return;
    var wait = force ? 0 : Math.max(0, 60000 - (Date.now() - lastAutoAttempt));
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      lastAutoAttempt = Date.now();
      sync(function () {});
    }, wait + (force ? 0 : 2500));
  }


  // Meal ideas built around the targets and what is already eaten.
  function suggestMeals(cb) {
    var S = Store.state(), tg = S.targets;
    var known = [];
    Object.keys(S.days).forEach(function (k) {
      (S.days[k].meals || []).forEach(function (m) { if (known.indexOf(m.name) < 0) known.push(m.name); });
    });
    ai('nutrition.suggestions', [{
      role: 'user',
      content: 'Suggest 6 meals for someone targeting ' + tg.calories + ' kcal and ' + tg.protein +
        ' g of protein a day. ' +
        (known.length ? 'They already eat: ' + known.slice(0, 12).join(', ') + '. Suggest different things. ' : '') +
        'Return ONLY JSON: {"meals":[{"name":"","slot":"Breakfast","kcal":0,"protein":0,"carbs":0,"fat":0,' +
        '"servings":1,"prepMinutes":0,"recipeNote":"",' +
        '"items":[{"name":"","weight":"amount","kcal":0,"protein":0,"carbs":0,"fat":0}],"instructions":["step one"]}]}. ' +
        'Ingredients and cooking steps matter - the shopping list and recipe view are built from them.'
    }], { system: VOICE, maxTokens: 1600 }, function (err, text) {
      if (err) return cb(err);
      var out;
      try { out = extractJson(text); } catch (e) { out = null; }
      if (!out || !out.meals || !out.meals.length) {
        return cb(new Error('The coach\'s list came back incomplete. Try again.'));
      }
      cb(null, out.meals);
    });
  }

  function cleanPlannedRecipe(raw, fallbackDate, fallbackSlot) {
    if (!raw || Object.prototype.toString.call(raw) !== '[object Object]') return null;
    var slot = cleanText(raw.slot || fallbackSlot, 20);
    if (['Breakfast', 'Lunch', 'Dinner', 'Snack'].indexOf(slot) < 0) return null;
    var date = validDateKey(raw.date) ? raw.date : fallbackDate;
    if (!validDateKey(date)) return null;
    var name = cleanText(raw.name, 160);
    if (!name) return null;
    var items = [];
    if (Array.isArray(raw.items)) {
      raw.items.slice(0, 24).forEach(function (it) {
        if (!it || Object.prototype.toString.call(it) !== '[object Object]') return;
        var ingredient = cleanText(it.name, 160);
        if (!ingredient) return;
        items.push({
          name: ingredient,
          weight: cleanText(it.weight || it.amount, 100),
          kcal: 0, protein: 0, carbs: 0, fat: 0
        });
      });
    }
    var steps = Array.isArray(raw.instructions) ? raw.instructions.map(function (x) {
      return cleanText(x, 420);
    }).filter(Boolean).slice(0, 12) : [];
    return {
      date: date, slot: slot, name: name,
      kcal: Math.round(boundedNumber(raw.kcal, 0, 2500, 0)),
      protein: Math.round(boundedNumber(raw.protein, 0, 300, 0)),
      carbs: Math.round(boundedNumber(raw.carbs, 0, 500, 0)),
      fat: Math.round(boundedNumber(raw.fat, 0, 250, 0)),
      servings: Math.round(boundedNumber(raw.servings, 1, 20, 1)),
      prepMinutes: Math.round(boundedNumber(raw.prepMinutes, 0, 360, 0)),
      recipeNote: cleanText(raw.recipeNote, 500),
      cuisine: cleanText(raw.cuisine, 60),
      proteins: Array.isArray(raw.proteins) ? raw.proteins.map(function (x) { return cleanText(x, 60); }).filter(Boolean).slice(0, 8) : [],
      instructions: steps,
      items: items,
      source: cleanText(raw.source, 20) || 'coach',
      batchId: cleanText(raw.batchId, 100),
      leftoverOf: cleanText(raw.leftoverOf, 120),
      batchSource: !!raw.batchSource
    };
  }

  function normalizedMealName(name) {
    return cleanText(name, 200).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  var FAST_FOOD_TERMS = [
    'mcdonald', 'burger king', 'wendy', 'taco bell', 'chipotle mexican grill', 'chick-fil-a', 'chick fil a',
    'kfc', 'popeyes', 'subway', 'domino', 'pizza hut', 'little caesars', 'five guys',
    'culver', 'panera', 'starbucks', 'dunkin', 'arbys', 'arby', 'sonic drive', 'takeout',
    'take-out', 'drive thru', 'drive-thru', 'restaurant meal', 'fast food', 'meal delivery'
  ];
  function fastFoodLike(meal) {
    var text = [meal && meal.name || ''].concat((meal && meal.items || []).map(function (x) { return x.name || ''; })).join(' ').toLowerCase();
    return FAST_FOOD_TERMS.some(function (term) { return text.indexOf(term) >= 0; });
  }
  function preferenceTerms(text) {
    return cleanText(text, 1200).toLowerCase().split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 2; }).slice(0, 40);
  }
  function conflictsWithAvoids(meal, avoids) {
    if (!avoids.length) return '';
    function words(x) { return String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); }
    var hay = ' ' + words([meal.name || ''].concat((meal.items || []).map(function (x) { return x.name || ''; })).join(' ')) + ' ';
    for (var i = 0; i < avoids.length; i++) {
      var term=words(avoids[i]); if (term && hay.indexOf(' '+term+' ') >= 0) return avoids[i];
    }
    return '';
  }

  /* Favorites are not just a heart on a card. If the user has compatible
     favorites, bring up to two back into every generated week so the planner
     learns their real rotation instead of inventing twenty-eight new meals. */
  function reintroduceFavorites(map, favorites, prefs, disliked) {
    if (!favorites.length) return map;
    disliked = disliked || [];
    var dislikedKeys = disliked.map(normalizedMealName);
    var selectedCuisines = prefs.cuisines || [], selectedProteins = prefs.proteins || [];
    var compatible = favorites.filter(function (m) {
      if (!m || !m.name || ['Breakfast','Lunch','Dinner','Snack'].indexOf(m.slot) < 0) return false;
      if (dislikedKeys.indexOf(normalizedMealName(m.name)) >= 0) return false;
      if (selectedCuisines.length && m.cuisine && selectedCuisines.indexOf(m.cuisine) < 0) return false;
      if (selectedProteins.length && Array.isArray(m.proteins) && m.proteins.length &&
          !m.proteins.some(function (x) { return selectedProteins.indexOf(x) >= 0; })) return false;
      if (conflictsWithAvoids(m, preferenceTerms(prefs.avoid))) return false;
      if (conflictsWithAvoids(m, preferenceTerms(prefs.mustNot))) return false;
      if (!Array.isArray(m.items) || m.items.length < 2 || !Array.isArray(m.instructions) || !m.instructions.length) return false;
      return !fastFoodLike(m);
    }).slice(-2);
    var used = {};
    compatible.forEach(function (fav) {
      var candidates = Object.keys(map).filter(function (k) { return k.split('|')[1] === fav.slot && !used[k]; });
      if (!candidates.length) return;
      candidates.sort(function (a, b) { return Math.abs((map[a].kcal || 0) - (fav.kcal || 0)) - Math.abs((map[b].kcal || 0) - (fav.kcal || 0)); });
      var key = candidates[0], bits = key.split('|');
      used[key] = true;
      map[key] = Object.assign({}, fav, { date: bits[0], slot: bits[1], source: 'favorite', photoId: '' });
    });
    return map;
  }

  function applyMealPrep(map, weekOf, prefs) {
    if (!window.Insights || !Insights.mealPrepPrefs) return map;
    var prep = Insights.mealPrepPrefs(), days = [];
    for (var di = 0; di < 7; di++) days.push(Store.shift(weekOf, di));

    /* Batch lunches are one recipe cooked once, then eaten across the requested
       number of weekday lunches. The source keeps the grocery ingredients;
       repeats keep the recipe for display but are marked leftoverOf so the
       shopping list does not buy the same food four times. */
    if (prep.lunchPrepDays > 1) {
      var lunchDates = days.filter(function (d) {
        var dow = new Date(d + 'T12:00:00').getDay(); return dow >= 1 && dow <= 5;
      }).slice(0, prep.lunchPrepDays);
      if (lunchDates.length > 1) {
        var sourceKey = lunchDates[0] + '|Lunch', source = map[sourceKey];
        if (source) {
          var batchId = 'lunch-' + weekOf;
          map[sourceKey] = Object.assign({}, source, {
            servings: lunchDates.length, batchId: batchId, batchSource: true, leftoverOf: '', source: source.source || 'coach',
            recipeNote: ('Prep ' + lunchDates.length + ' servings at once. ' + (source.recipeNote || '')).trim()
          });
          lunchDates.slice(1).forEach(function (d) {
            map[d + '|Lunch'] = Object.assign({}, source, {
              date: d, slot: 'Lunch', servings: 1, batchId: batchId, batchSource: false,
              leftoverOf: sourceKey, source: 'prep', photoId: '',
              recipeNote: 'Meal-prep serving from ' + lunchDates[0] + '. Reheat or serve cold as appropriate.'
            });
          });
        }
      }
    }

    /* Dinner-leftover mode makes the selected cook nights the only nights that
       produce new dinner groceries. Non-cook nights reuse the most recent cook
       dinner and point back to it, so the shopping list counts the source once. */
    if (prep.dinnerLeftovers && prep.cookDays.length) {
      var lastSourceKey = '', uses = {};
      days.forEach(function (d) {
        var dow = WEEKDAY_NAME(new Date(d + 'T12:00:00').getDay());
        var key = d + '|Dinner';
        if (prep.cookDays.indexOf(dow) >= 0 || !lastSourceKey) {
          lastSourceKey = key; uses[key] = uses[key] || [];
          return;
        }
        var source = map[lastSourceKey];
        if (!source) return;
        uses[lastSourceKey].push(key);
        map[key] = Object.assign({}, source, {
          date: d, slot: 'Dinner', servings: 1, leftoverOf: lastSourceKey,
          batchId: 'dinner-' + lastSourceKey.slice(0,10), batchSource: false, source: 'prep', photoId: '',
          recipeNote: 'Leftover dinner from ' + lastSourceKey.slice(0,10) + '. Reheat safely and serve.'
        });
      });
      Object.keys(uses).forEach(function (sourceKey) {
        var source = map[sourceKey]; if (!source) return;
        var count = 1 + uses[sourceKey].length;
        map[sourceKey] = Object.assign({}, source, {
          servings: Math.max(+source.servings || 1, count), batchId: 'dinner-' + sourceKey.slice(0,10), batchSource: true,
          leftoverOf: '', recipeNote: ('Cook ' + count + ' servings tonight; ' + uses[sourceKey].length + ' become planned leftovers. ' + (source.recipeNote || '')).trim()
        });
      });
    }
    return map;
  }
  function WEEKDAY_NAME(i) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i] || ''; }

  /* A real planner, not six loose suggestions. The contract is deliberately
     strict: one recipe for every Breakfast/Lunch/Dinner/Snack slot across the
     seven dated days. That lets the UI, shopping list and daily log all point
     at the same objects without guessing what Claude meant. */
  function planMealsWeek(weekOf, options, cb) {
    if (typeof options === 'function') { cb = options; options = {}; }
    options = options || {};
    if (typeof cb !== 'function') cb = function () {};
    var progress = typeof options.onProgress === 'function' ? options.onProgress : function () {};
    weekOf = validDateKey(weekOf) ? weekOf : Store.weekStart(Store.todayKey());
    var S = Store.state(), tg = S.targets, dates = [], known = [];
    for (var i = 0; i < 7; i++) dates.push(Store.shift(weekOf, i));
    Object.keys(S.days || {}).sort().reverse().slice(0, 21).forEach(function (k) {
      (S.days[k].meals || []).forEach(function (m) {
        if (m && m.name && known.indexOf(m.name) < 0) known.push(m.name);
      });
    });
    var prefs = S.mealPrefs || {}, favorites = Array.isArray(S.mealFavorites) ? S.mealFavorites : [];
    var disliked = Array.isArray(S.mealDislikedMeals) ? S.mealDislikedMeals : [];
    var favNames = favorites.slice(-12).map(function (m) { return m.name; }).filter(Boolean);
    var slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'], map = {};
    var existingMap = options.existingMap && Object.prototype.toString.call(options.existingMap) === '[object Object]' ? options.existingMap : {};
    var onBatch = typeof options.onBatch === 'function' ? options.onBatch : function () {};
    var batches = [dates.slice(0, 2), dates.slice(2, 4), dates.slice(4, 6), dates.slice(6, 7)];
    var prepText = '';
    if (window.Insights && Insights.mealPrepPrefs) {
      var pp = Insights.mealPrepPrefs();
      prepText = (pp.lunchPrepDays ? 'They want ' + pp.lunchPrepDays + ' weekday lunches batch-prepped from one recipe. ' : '') +
        (pp.dinnerLeftovers ? 'Dinner leftovers are welcome. ' : '') +
        (pp.cookDays.length ? 'Preferred cooking nights: ' + pp.cookDays.join(', ') + '. ' : '');
    }
    var preferenceText =
      ((prefs.cuisines || []).length ? 'Selected cuisines for this week: ' + prefs.cuisines.join(', ') + '. Keep the week within these cuisines. ' : 'Cuisine is open; use a varied home-cooked mix. ') +
      ((prefs.proteins || []).length ? 'Selected protein choices: ' + prefs.proteins.join(', ') + '. Use these as the primary proteins for the week. ' : '') +
      (cleanText(prefs.likes, 1200) ? 'Foods/flavors they like: ' + cleanText(prefs.likes, 1200) + '. Lean toward these. ' : '') +
      (cleanText(prefs.avoid, 1200) ? 'Foods/flavors they prefer not to eat: ' + cleanText(prefs.avoid, 1200) + '. Avoid these when practical. ' : '') +
      (cleanText(prefs.mustNot, 1200) ? 'ABSOLUTE EXCLUSIONS — never include these in any ingredient, recipe, garnish, sauce, or substitute: ' + cleanText(prefs.mustNot, 1200) + '. ' : '') +
      (cleanText(prefs.pantry, 1200) ? 'Pantry staples already on hand: ' + cleanText(prefs.pantry, 1200) + '. They may be used normally; do not treat them as items that need buying. ' : '') +
      prepText +
      (disliked.length ? 'Meals they have explicitly thumbs-downed and must NOT return: ' + disliked.slice(-30).join(', ') + '. ' : '') +
      (favNames.length ? 'Favorite meals they want to see again: ' + favNames.join(', ') + '. Reuse compatible favorites naturally instead of always inventing new food. ' : '') +
      (known.length ? 'Meals they have already logged include: ' + known.slice(0, 14).join(', ') + '. You may reuse a good fit occasionally but do not repeat the same day over and over. ' : '');

    function dayName(d) {
      return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    }
    function batchLabel(batchDates) {
      if (batchDates.length === 1) return dayName(batchDates[0]);
      return dayName(batchDates[0]) + '–' + dayName(batchDates[batchDates.length - 1]);
    }
    function buildPrompt(batchDates, batchIndex, repairReason) {
      var requested = [];
      batchDates.forEach(function (d) { slots.forEach(function (slot) { requested.push(d + ' ' + slot); }); });
      return 'Build batch ' + (batchIndex + 1) + ' of ' + batches.length + ' for a complete seven-day HOME-COOKED meal-prep plan for ' + me() + '. ' +
        'Goal: ' + String(S.goal || 'lose-fat').replace(/-/g, ' ') + '. Daily target: about ' + tg.calories + ' kcal and at least ' + tg.protein + ' g protein. ' +
        'This batch must contain exactly these ' + requested.length + ' dated slots and no others: ' + requested.join('; ') + '. ' +
        'NON-NEGOTIABLE: no fast food, restaurant orders, takeout, drive-thru meals, meal-delivery dishes, or restaurant/chain brand names. Every meal must be made from grocery-store ingredients at home. ' +
        preferenceText +
        'Use practical portions and purposeful ingredient overlap so grocery shopping and batch prep are reasonable. Keep most recipes under 35 minutes and snacks genuinely snack-sized. ' +
        'Every meal must contain at least two grocery ingredients and 1 to 4 concise preparation/cooking instructions. Ingredient amount belongs in weight (examples: "6 oz", "1 cup", "2 large"). ' +
        'Nutrition values are for one planned serving. Across each full day in this batch, aim for 90-105% of the calorie target and at least the protein target. ' +
        'Return ONLY JSON in this shape: {"meals":[{"date":"YYYY-MM-DD","slot":"Breakfast","name":"","cuisine":"Mexican","proteins":["Chicken"],"kcal":0,"protein":0,"carbs":0,"fat":0,' +
        '"servings":1,"prepMinutes":0,"recipeNote":"optional prep/storage note","items":[{"name":"ingredient","weight":"amount"}],"instructions":["step one","step two"]}]}. Do not use markdown.' +
        (repairReason ? ' Your previous reply for this same batch could not be used because ' + repairReason + '. Rewrite this batch from scratch and return complete valid JSON.' : '');
    }
    function cleanBatch(out, batchDates) {
      if (!out || !Array.isArray(out.meals)) return { map: {}, missing: ['all requested slots'], reason: 'it did not contain a meals array' };
      var allowed = {}, batchMap = {};
      batchDates.forEach(function (d) { slots.forEach(function (slot) { allowed[d + '|' + slot] = true; }); });
      out.meals.forEach(function (m) {
        var cleaned = cleanPlannedRecipe(m, '', '');
        if (!cleaned) return;
        var key = cleaned.date + '|' + cleaned.slot;
        if (!allowed[key] || batchMap[key]) return;
        if (fastFoodLike(cleaned)) return;
        if (!cleaned.items || cleaned.items.length < 2 || !cleaned.instructions || !cleaned.instructions.length) return;
        if (conflictsWithAvoids(cleaned, preferenceTerms(prefs.avoid))) return;
        if (conflictsWithAvoids(cleaned, preferenceTerms(prefs.mustNot))) return;
        if (disliked.some(function (x) { return normalizedMealName(x) === normalizedMealName(cleaned.name); })) return;
        batchMap[key] = cleaned;
      });
      var missing = Object.keys(allowed).filter(function (key) { return !batchMap[key]; });
      return { map: batchMap, missing: missing, reason: missing.length ? 'it missed or rejected ' + missing.length + ' required slot' + (missing.length === 1 ? '' : 's') : '' };
    }
    function finish() {
      var missing = [];
      dates.forEach(function (d) { slots.forEach(function (slot) { if (!map[d + '|' + slot]) missing.push(d + ' ' + slot); }); });
      if (missing.length) return cb(new Error('The meal coach did not finish all 28 dated slots. Try again.'));
      map = reintroduceFavorites(map, favorites, prefs, disliked);
      map = applyMealPrep(map, weekOf, prefs);
      if (!window.Nutrition || !Nutrition.validateWeek) return cb(null, map);

      function verifyAndRepair(round) {
        var verdict = Nutrition.validateWeek(map, weekOf, tg, prefs);
        if (verdict.ok) return cb(null, map);
        if (round >= 2) {
          var first = verdict.invalid[0];
          return cb(new Error('The meal week could not be verified. ' + (first ? first.date + ': ' + first.reason : 'Daily targets are outside the allowed range.') + ' Try rebuilding the week.'));
        }
        var queue = verdict.invalid.slice();
        function repairNext() {
          if (!queue.length) return verifyAndRepair(round + 1);
          var bad = queue.shift(), requested = slots.map(function (slot) { return bad.date + ' ' + slot; });
          var prompt = 'Repair ONLY this one day of the meal plan for ' + me() + ': ' + bad.date + '. ' +
            'The current day failed deterministic verification because ' + bad.reason + '. Daily target: about ' + tg.calories + ' kcal and at least ' + tg.protein + ' g protein. ' +
            'Return exactly these four slots and no other dates: ' + requested.join('; ') + '. ' +
            'NON-NEGOTIABLE: home-cooked grocery-store food only. ' + preferenceText +
            'The four meals together MUST total 90-105% of the calorie target and at least the protein target. Every meal needs at least two ingredients and cooking/prep instructions. ' +
            'Return ONLY JSON: {"meals":[{"date":"' + bad.date + '","slot":"Breakfast","name":"","cuisine":"","proteins":[],"kcal":0,"protein":0,"carbs":0,"fat":0,"servings":1,"prepMinutes":0,"recipeNote":"","items":[{"name":"","weight":""}],"instructions":[""]}]}. No markdown.';
          ai('nutrition.week-plan', [{role:'user',content:prompt}], {system:VOICE,maxTokens:2400,timeoutMs:65000}, function(err,text,meta){
            if (err || (meta && meta.stopReason === 'max_tokens')) return repairNext();
            var out; try { out=extractJson(text); } catch(e) { return repairNext(); }
            var cleaned=cleanBatch(out,[bad.date]);
            if (cleaned.missing.length) return repairNext();
            Object.keys(cleaned.map).forEach(function(key){ map[key]=cleaned.map[key]; });
            var dayVerdict=Nutrition.validateDay(map,bad.date,tg,prefs);
            if (!dayVerdict.ok) return repairNext();
            progress({repair:true,date:bad.date,reason:bad.reason});
            repairNext();
          });
        }
        repairNext();
      }
      verifyAndRepair(0);
    }
    function runBatch(index) {
      if (index >= batches.length) return finish();
      var batchDates = batches[index], label = batchLabel(batchDates);
      /* A previous Setup attempt may have finished this entire batch before a
         later request failed. Validate those persisted rows against today's
         preferences and skip the network request only when all slots are still
         genuinely usable. */
      var existingRows = [];
      batchDates.forEach(function (d) { slots.forEach(function (slot) {
        var m = existingMap[d + '|' + slot]; if (m) existingRows.push(m);
      }); });
      var resumed = cleanBatch({ meals: existingRows }, batchDates);
      if (!resumed.missing.length) {
        Object.keys(resumed.map).forEach(function (key) { map[key] = resumed.map[key]; });
        progress({ batch: index + 1, total: batches.length, label: label, resumed: true });
        return runBatch(index + 1);
      }
      progress({ batch: index + 1, total: batches.length, label: label, resumed: false });
      function attempt(n, reason) {
        ai('nutrition.week-plan', [{ role: 'user', content: buildPrompt(batchDates, index, reason) }], { system: VOICE, maxTokens: 4200, timeoutMs: 75000 }, function (err, text, meta) {
          if (err) {
            if (n < 1) return attempt(n + 1, 'the request failed before a complete batch came back');
            return cb(new Error('The meal coach could not finish ' + label + ' after two attempts. ' + err.message));
          }
          if (meta && meta.stopReason === 'max_tokens') {
            if (n < 1) return attempt(n + 1, 'the reply was cut off before the JSON finished');
            return cb(new Error('The meal coach could not finish ' + label + ' because the reply was cut off twice. Try again.'));
          }
          var out;
          try { out = extractJson(text); }
          catch (e) {
            if (n < 1) return attempt(n + 1, 'the reply was not complete readable JSON');
            return cb(new Error('The meal coach could not finish ' + label + ' because the reply was not readable after two attempts. Try again.'));
          }
          var cleaned = cleanBatch(out, batchDates);
          if (cleaned.missing.length) {
            if (n < 1) return attempt(n + 1, cleaned.reason);
            return cb(new Error('The meal coach could not finish ' + label + ': ' + cleaned.reason + ' after two attempts. Try again.'));
          }
          Object.keys(cleaned.map).forEach(function (key) { map[key] = cleaned.map[key]; });
          try { onBatch({ batch:index + 1, total:batches.length, label:label, map:cleaned.map }); } catch (batchErr) {}
          runBatch(index + 1);
        });
      }
      attempt(0, '');
    }
    runBatch(0);
  }

  function recipeForMeal(meal, cb) {
    meal = meal || {};
    if (!cleanText(meal.name, 160)) return cb(new Error('Choose a meal first.'));
    var prefs = Store.state().mealPrefs || {};
    var prompt = 'Turn this planned meal into a practical HOME-COOKED recipe without changing its nutrition target more than necessary. ' +
      'Never turn it into fast food, restaurant takeout, a chain-brand meal, or meal delivery. Use grocery-store ingredients. ' +
      'Meal: ' + cleanText(meal.name, 160) + '. Slot: ' + cleanText(meal.slot, 20) + '. ' +
      (cleanText(prefs.avoid, 1200) ? 'Prefer not to include these foods/flavors: ' + cleanText(prefs.avoid, 1200) + '. ' : '') +
      (cleanText(prefs.mustNot, 1200) ? 'ABSOLUTE EXCLUSIONS — never include: ' + cleanText(prefs.mustNot, 1200) + '. ' : '') +
      'Target nutrition: ' + Math.round(+meal.kcal || 0) + ' kcal, ' + Math.round(+meal.protein || 0) + ' g protein, ' +
      Math.round(+meal.carbs || 0) + ' g carbs, ' + Math.round(+meal.fat || 0) + ' g fat. ' +
      'Return ONLY JSON: {"name":"","slot":"' + cleanText(meal.slot, 20) + '","cuisine":"","proteins":[],"kcal":0,"protein":0,"carbs":0,"fat":0,' +
      '"servings":1,"prepMinutes":0,"recipeNote":"","items":[{"name":"","weight":""}],"instructions":[""]}.';
    ai('nutrition.recipe', [{ role: 'user', content: prompt }], { system: VOICE, maxTokens: 1200, timeoutMs: 60000 }, function (err, text) {
      if (err) return cb(err);
      var out;
      try { out = extractJson(text); } catch (e) { return cb(new Error('The recipe could not be read. Try again.')); }
      var cleaned = cleanPlannedRecipe(out, meal.date || Store.todayKey(), meal.slot || 'Dinner');
      if (!cleaned || !cleaned.instructions.length || cleaned.items.length < 2 || fastFoodLike(cleaned) || conflictsWithAvoids(cleaned, preferenceTerms(prefs.avoid)) || conflictsWithAvoids(cleaned, preferenceTerms(prefs.mustNot))) {
        return cb(new Error('The recipe came back incomplete or outside your meal preferences. Try again.'));
      }
      cb(null, cleaned);
    });
  }


  function buildSharedDinner(date, baseMeal, cb) {
    if (typeof cb !== 'function') cb=function(){};
    if (!window.Nutrition || !Nutrition.sharedDinnerTargets) return cb(new Error('Shared Dinner is not available in this build.'));
    var targets=Nutrition.sharedDinnerTargets(), prefs=Store.state().mealPrefs||{};
    if (!targets.partner) return cb(new Error((Store.state().partner.name || 'Your partner') + ' needs to turn on Shared Dinner target sharing first.'));
    baseMeal=baseMeal||{};
    var prompt='Create ONE home-cooked dinner recipe that both people can eat, then give two personalized portions. ' +
      'Date: '+date+'. Starting dinner idea: '+cleanText(baseMeal.name,160)+'. ' +
      targets.me.name+' dinner target: about '+targets.me.kcal+' kcal and at least '+targets.me.protein+' g protein. ' +
      targets.partner.name+' dinner target: about '+targets.partner.kcal+' kcal and at least '+targets.partner.protein+' g protein. ' +
      (cleanText(prefs.mustNot,1200)?'ABSOLUTE EXCLUSIONS for this household — never include: '+cleanText(prefs.mustNot,1200)+'. ':'')+
      (cleanText(prefs.avoid,1200)?'Prefer not to use: '+cleanText(prefs.avoid,1200)+'. ':'')+
      'The base ingredients and cooking method must be shared. Portion size and simple add-ons may differ. Each portion must land within 15% of its calorie target and at least 90% of its protein target. ' +
      'Return ONLY JSON: {"name":"","cuisine":"","items":[{"name":"","weight":"household amount"}],"instructions":[""],"prepMinutes":0,"portions":{"me":{"label":"","servings":1,"kcal":0,"protein":0,"note":""},"partner":{"label":"","servings":1,"kcal":0,"protein":0,"note":""}}}. No markdown.';
    ai('nutrition.recipe',[{role:'user',content:prompt}],{system:VOICE,maxTokens:1800,timeoutMs:65000},function(err,text){
      if(err)return cb(err); var out; try{out=extractJson(text);}catch(e){return cb(new Error('The Shared Dinner recipe could not be read. Try again.'));}
      var verdict=Nutrition.validateSharedDinner(out); if(!verdict.ok)return cb(new Error(verdict.error));
      var raw=verdict.value, meal=cleanPlannedRecipe({date:date,slot:'Dinner',name:raw.name,cuisine:raw.cuisine,kcal:raw.portions.me.kcal,protein:raw.portions.me.protein,carbs:+baseMeal.carbs||0,fat:+baseMeal.fat||0,servings:1,prepMinutes:raw.prepMinutes,items:raw.items,instructions:raw.instructions,recipeNote:'Shared Dinner · one recipe, two portions'},date,'Dinner');
      if(!meal)return cb(new Error('The Shared Dinner recipe was incomplete. Try again.'));
      meal.sharedDinner={partnerName:targets.partner.name,portions:{me:raw.portions.me,partner:raw.portions.partner}};
      cb(null,meal);
    });
  }

  /* Build the reviewed week's successor as two independent, resumable pieces.
     The old button generated all 28 meals, held them only in memory, then asked
     Claude for training. If training failed, the successful meal work vanished
     and the next tap started from zero. This coordinator commits each finished
     half immediately and skips anything already ready on a retry. */
  function setupNextWeek(baseWeek, onProgress, cb) {
    if (typeof onProgress === 'function' && typeof cb !== 'function') { cb = onProgress; onProgress = null; }
    if (typeof cb !== 'function') cb = function () {};
    onProgress = typeof onProgress === 'function' ? onProgress : function () {};
    baseWeek = validDateKey(baseWeek) ? Store.weekStart(baseWeek) : (window.Insights && Insights.reviewWeekKey ? Insights.reviewWeekKey() : Store.weekStart(Store.todayKey()));
    var nextWeek = Store.shift(baseWeek, 7);

    function status() {
      return window.Insights && Insights.nextWeekStatus
        ? Insights.nextWeekStatus(baseWeek)
        : { weekOf:nextWeek, training:false, meals:false, mealCount:0 };
    }
    function fail(stage, err) {
      var st = status();
      err = err instanceof Error ? err : new Error(String(err || 'Next-week setup failed.'));
      err.stage = stage; err.nextWeekStatus = st;
      cb(err, st);
    }
    function commitMeals(map, replaceWeek) {
      var merged = Object.assign({}, Store.state().mealPlan || {}), end = Store.shift(nextWeek, 6);
      if (replaceWeek) Object.keys(merged).forEach(function (k) {
        var d = k.slice(0, 10); if (d >= nextWeek && d <= end) delete merged[k];
      });
      Object.keys(map || {}).forEach(function (k) { merged[k] = map[k]; });
      Store.set('mealPlan', merged);
      Store.set('mealPlannerWeek', nextWeek);
      if (replaceWeek) {
        /* Shopping checks describe the displayed grocery list, so a newly built
           week starts clean instead of inheriting checkmarks from another week. */
        Store.set('shopTicked', {});
      }
    }
    function existingWeekMeals() {
      var out={}, all=Store.state().mealPlan||{}, end=Store.shift(nextWeek,6);
      Object.keys(all).forEach(function(k){var d=k.slice(0,10);if(d>=nextWeek&&d<=end)out[k]=all[k];});
      return out;
    }
    function finish() {
      if (window.Insights && Insights.setNextWeekGoals) Insights.setNextWeekGoals(baseWeek);
      var st = status();
      if (!(st.meals && st.training)) return fail('verify', new Error('Next week did not finish cleanly. Tap setup again; completed pieces will be kept.'));
      onProgress('done', st);
      cb(null, st);
    }
    function training() {
      var st = status();
      if (st.training) return finish();
      onProgress('training', st);
      writePlan(nextWeek, function (err) {
        if (err) return fail('training', err);
        finish();
      });
    }
    var st = status();
    if (st.meals) return training();
    onProgress('meals', st);
    planMealsWeek(nextWeek, {
      existingMap: existingWeekMeals(),
      onProgress: function (detail) { onProgress('meals-progress', detail || {}); },
      /* Commit every fully validated batch immediately. If a later Claude call
         fails or iOS suspends the PWA, the next tap resumes from these rows
         instead of spending requests rebuilding food that was already done. */
      onBatch: function (detail) {
        if (detail && detail.map) commitMeals(detail.map, false);
        onProgress('meals-batch-ready', detail || {});
      }
    }, function (err, map) {
      if (err) return fail('meals', err);
      commitMeals(map, true);
      onProgress('meals-ready', status());
      training();
    });
  }


  /* A real question, answered against the same facts the coach already reads.
     History is passed so a follow-up ("what about tomorrow?") makes sense. */
  function ask(question, history, cb) {
    var k = Store.todayKey(), t = Store.totals(k), d = Store.day(k), s = Store.state();
    var w = Store.recentWeights(14), ctx = window.InSyncIntelligence ? InSyncIntelligence.context('coach.chat') : null;
    var td = ctx && ctx.today ? ctx.today : {journeyDay:Store.daysIn(),streak:Store.streak(),calories:t.kcal,protein:t.protein,steps:d.steps,workouts:d.workouts.length,meals:d.meals.map(function(m){return m.slot;}),weight:d.weight};
    var uc = ctx && ctx.user ? ctx.user : {goal:s.goal,targets:s.targets};
    var facts = [
      'Day ' + td.journeyDay + '. Streak ' + td.streak + ' days. Goal: ' + String(uc.goal || '').replace(/-/g, ' ') + '.',
      'Today: ' + Store.fmtEnergy(td.calories) + ' of ' + Store.fmtEnergy(uc.targets.calories) + ', ' + td.protein + '/' + uc.targets.protein + ' g protein, ' +
        td.steps + '/' + uc.targets.steps + ' steps, ' + td.workouts + ' session(s), ' + td.meals.length + ' meal(s).',
      'Weight target ' + Store.fmtWeight(uc.targets.weightGoal) + '.' + (td.weight != null ? ' Weighed ' + Store.fmtWeight(td.weight) + ' today.' : ''),
      w.length > 1 ? 'Recent weights: ' + w.map(function (x) { return Store.fmtWeight(x.weight); }).join(', ') + '.' : '',
      (ctx && ctx.recent && ctx.recent.patterns) ? 'Patterns visible across recent days:\n' + ctx.recent.patterns : ((window.Insights && Insights.patternsText && Insights.patternsText()) ? 'Patterns visible across recent days:\n' + Insights.patternsText() : '')
    ].filter(Boolean).join('\n');

    var msgs = (history || []).slice(-6).map(function (m) {
      return { role: m.role === 'coach' ? 'assistant' : 'user', content: m.text };
    });
    msgs.push({
      role: 'user',
      content: 'Facts about ' + me() + ' right now:\n\n' + facts +
        '\n\nTheir question: ' + question +
        '\n\nAnswer in two or three sentences. Use only the figures above; do not invent numbers. ' +
        'If the figures cannot answer it, say what is missing. Return only the answer.'
    });

    ai('coach.chat', msgs, { system: VOICE, maxTokens: 300 }, cb);
  }

  /* One cheap call, so a mistyped key is caught while it can still be pasted
     again — not on the first morning the coach is needed. */
  function testClaude(cb) {
    ai('connectivity.test', [{ role: 'user', content: 'Reply with the single word: ready' }], { maxTokens: 8 }, function (err) {
      cb(err || null);
    });
  }

  /* The coach proposes targets rather than setting them: it returns numbers and
     the reason, and nothing moves until the person whose phone this is taps.
     Only ever asked once a fortnight of real days exists — before that there is
     nothing to read. */
  function proposeTargets(cb) {
    var s = Store.state(), t = s.targets;
    var days = Object.keys(s.days).filter(function (k) { return Store.logged(k); }).sort();
    if (days.length < 14) return cb(new Error('The coach needs a fortnight of days first. It has ' + days.length + '.'));

    var rows = days.slice(-28).map(function (k) {
      var tt = Store.totals(k), d = s.days[k];
      return k + ': ' + Store.fmtEnergy(tt.kcal) + ', ' + tt.protein + ' g protein, ' + (d.steps || 0) + ' steps, ' +
        (d.workouts || []).length + ' session(s)' + (d.weight != null ? ', ' + Store.fmtWeight(d.weight) : '');
    }).join('\n');
    var displayWeightGoal = Store.weightNum(t.weightGoal, s.units.weight === 'kg' ? 1 : 0);
    var displayEnergyTarget = Store.energyNum(t.calories), energyUnit = s.units.energy;

    ai('coach.targets', [{
      role: 'user',
      content: me() + '\'s goal is ' + s.goal.replace(/-/g, ' ') + '. Their current targets are ' +
        displayEnergyTarget + ' ' + energyUnit + ', ' + t.protein + ' g protein, ' + t.steps + ' steps, weight goal ' + displayWeightGoal + ' ' + s.units.weight + '.\n\n' +
        'The last ' + Math.min(28, days.length) + ' logged days:\n' + rows +
        '\n\nPropose targets that fit what they actually do. Keep any target that is already right \u2014 ' +
        'changing everything is not advice. The JSON calories field must use the same energy unit shown above (' + energyUnit + '). Reply with JSON only: ' +
        '{"calories":n,"protein":n,"steps":n,"weightGoal":n,"why":"one or two sentences naming the evidence"}'
    }], { system: VOICE, maxTokens: 400 }, function (err, text) {
      if (err) return cb(err);
      var out, verdict = window.InSyncIntelligence ? InSyncIntelligence.validate('coach.targets', text) : null;
      if (verdict && !verdict.ok) return cb(new Error('The coach\'s proposal could not be read.'));
      if (verdict) out = verdict.value;
      else { try { out = JSON.parse((text || '').replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch (e) { return cb(new Error('The coach\'s proposal could not be read.')); } }
      var num = function (v, lo, hi, fallback) {
        var n = Math.round(+v);
        return (n >= lo && n <= hi) ? n : fallback;
      };
      var why = (out.why || '').trim();
      var firstSentence = why.split('. ')[0];
      if (window.InSyncIntelligence) { var pctx=InSyncIntelligence.context('coach.targets'); InSyncIntelligence.rememberEvidence('target-proposal','coach.targets',InSyncIntelligence.evidenceFromContext(pctx,'weekly')); }
      Store.set('proposal', {
        date: Store.todayKey(),
        answered: false,
        why: why,
        summary: (firstSentence ? firstSentence.replace(/\.$/, '') + '.' : 'New targets to approve'),
        targets: {
          calories: Store.energyToKcal(num(out.calories, energyUnit === 'kJ' ? 5000 : 1200, energyUnit === 'kJ' ? 19000 : 4500, displayEnergyTarget)),
          protein: num(out.protein, 80, 300, t.protein),
          steps: num(out.steps, 3000, 25000, t.steps),
          weightGoal: Store.weightToLb(num(out.weightGoal, s.units.weight === 'kg' ? 27 : 60, s.units.weight === 'kg' ? 272 : 600, displayWeightGoal))
        }
      });
      cb(null, Store.state().proposal);
    });
  }

  window.Cloud = {
    suggestMeals: suggestMeals, planMealsWeek: planMealsWeek, setupNextWeek: setupNextWeek, recipeForMeal: recipeForMeal, buildSharedDinner: buildSharedDinner,
    proposeTargets: proposeTargets, validateTrainingPlan: validatePlan,
    testClaude: testClaude,
    hasClaude: hasClaude, hasGit: hasGit,
    coachLine: coachLine, chooseVerse: chooseVerse, writePlan: writePlan, weeklyNote: weeklyNote, weeklyReview: weeklyReview, ask: ask,
    parseMeal: parseMeal, parseMealPhoto: parseMealPhoto,
    readBarcodePhoto: readBarcodePhoto,
    restaurantMenu: restaurantMenu, menuItem: menuItem,
    push: push, pull: pull, sync: sync, autoSync: autoSync, ensureSyncRepo: ensureSyncRepo,
    isApplyingRemote: function () { return applyingRemote; },
    sharePayload: sharePayload, validatePlan: validatePlan, sanitizePartnerPayload: sanitizePartnerPayload
  };
})();

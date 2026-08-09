/* InSync — cloud.
   Two connections, both optional, both keyed on the device only:
   Claude for the coach's writing, GitHub for reaching the other phone. */
(function () {
  'use strict';

  var CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
  var MODEL = 'claude-sonnet-4-5-20250929';

  function conn() { return Store.state().connections; }
  function hasClaude() { return !!(conn().claudeKey || '').trim(); }
  function hasGit() { return !!(conn().githubToken || '').trim(); }

  function slug(name) { return (name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function meSlug() { return slug(Store.state().profile.name); }
  function partnerSlug() { return slug(Store.state().partner.name); }

  // ---------- Claude ----------
  function claude(messages, opts, cb) {
    if (!hasClaude()) return cb(new Error('No Claude key set'));
    var body = {
      model: MODEL,
      max_tokens: (opts && opts.maxTokens) || 400,
      messages: messages
    };
    if (opts && opts.system) body.system = opts.system;

    fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': conn().claudeKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error((j.error && j.error.message) || ('Claude ' + r.status));
          return j;
        });
      })
      .then(function (j) {
        var text = (j.content || []).filter(function (c) { return c.type === 'text'; })
          .map(function (c) { return c.text; }).join('').trim();
        cb(null, text);
      })
      .catch(function (e) { cb(e); });
  }

  /* Whose phone this is. Every prompt is written from this, never from a name in
     the source — on her device the coach writes to her about him. */
  function me() { return Store.state().profile.name || 'you'; }

  var VOICE = 'You write for InSync, a fitness app used by one married couple. ' +
    'The app is built around an expedition metaphor: camps, chapters, trailheads, legs of a route. ' +
    'Voice: field journal crossed with quiet scriptural reflection. Plain, matter-of-fact, warm but never chirpy. ' +
    'No emoji. No exclamation marks. No motivational-poster phrasing. No "here is why this matters". ' +
    'Never invent numbers — use only the figures given to you.';

  // Today's next step, written rather than templated.
  function coachLine(cb) {
    var k = Store.todayKey(), t = Store.totals(k), d = Store.day(k), s = Store.state();
    var facts = [
      'Day ' + Store.daysIn() + ' of the journey. Current streak ' + Store.streak() + ' days.',
      'Calories: ' + t.kcal + ' of ' + s.targets.calories + '.',
      'Protein: ' + t.protein + ' g of ' + s.targets.protein + ' g.',
      'Steps: ' + d.steps + ' of ' + s.targets.steps + '.',
      'Sessions logged today: ' + d.workouts.length + '.',
      'Meals logged today: ' + d.meals.length + (d.meals.length ? ' (' + d.meals.map(function (m) { return m.slot; }).join(', ') + ')' : ''),
      'Weighed in today: ' + (d.weight != null ? 'yes, ' + d.weight + ' lb' : 'no') + '.',
      'Goal: ' + s.goal.replace(/-/g, ' ') + '.'
    ].join('\n');

    claude([{
      role: 'user',
      content: 'Here is ' + me() + '\'s day so far:\n\n' + facts +
        '\n\nWrite the single next useful thing they should do today. Two sentences at most. ' +
        'Name the gap and the concrete action that closes it. If nothing is outstanding, say so plainly. ' +
        'Return only the sentences, no preamble.'
    }], { system: VOICE, maxTokens: 200 }, function (err, text) {
      if (err) return cb(err);
      Store.set('coachCache', { date: k, line: text });
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
      rows.push(key + ': ' + t.kcal + ' kcal, ' + t.protein + ' g protein, ' +
        d.steps + ' steps, ' + d.workouts.length + ' session' + (d.workouts.length === 1 ? '' : 's') +
        (d.reflection ? ', wrote that evening' : ''));
    }
    var facts =
      'Day ' + Store.daysIn() + ' of the journey. Current streak ' + Store.streak() + ' days.\n' +
      'Goal: ' + s.goal.replace(/-/g, ' ') + '.\n' +
      'The last seven days:\n' + rows.join('\n');

    var menu = list.map(function (v, i) { return i + '. "' + v[0] + '" — ' + v[1]; }).join('\n');

    claude([{
      role: 'user',
      content: facts + '\n\nHere are the verses available:\n' + menu +
        '\n\nChoose the one that fits the week ' + me() + ' has actually had. A hard week and a ' +
        'strong week should not get the same verse. Do not choose one that flatters them when the ' +
        'week was poor, or one that consoles them when the week was strong.\n\n' +
        'Return only JSON: {"index": <number>, "why": "<one short sentence, said to them>"}'
    }], { system: VOICE, maxTokens: 220 }, function (err, text) {
      if (err) return cb(err);
      var data;
      try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]); }
      catch (e) { return cb(new Error('The coach did not return a verse.')); }
      var idx = Math.round(+data.index);
      if (!(idx >= 0 && idx < list.length)) return cb(new Error('The coach chose a verse that does not exist.'));
      Store.set('verseCache', { date: k, index: idx, why: (data.why || '').trim() });
      cb(null, Store.verse());
    });
  }


  /* The coach writes the week's training itself. It picks only from the
     library, so every movement it names has a GIF, a group and a prescription;
     anything it invents is rejected rather than rendered as a broken row. */
  function writePlan(cb) {
    var s = Store.state(), freq = s.frequency || 4;
    var menu = Exercises.all.map(function (e) {
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
    var lifted = Object.keys(lifts).map(function (n) { return n + ' at ' + lifts[n] + ' lb'; });

    var history = sessions.length
      ? 'Sessions in the last four weeks (' + sessions.length + '):\n' + sessions.slice(-14).join('\n') +
        (lifted.length ? '\n\nBest lift on each machine so far:\n' + lifted.join('\n') : '')
      : 'No session has been logged yet. This is the first plan.';

    var body = s.profile.height ? s.profile.height + ', ' + s.profile.age + ', ' + s.profile.sex : 'not given';

    claude([{
      role: 'user',
      content:
        'Write ' + me() + '\'s training week.\n\n' +
        'Goal: ' + String(s.goal || '').replace(/-/g, ' ') + '\n' +
        'Days a week: ' + freq + '\n' +
        'Body: ' + body + '\n' +
        'Gym: Planet Fitness — machines and dumbbells, no barbell, no squat rack.\n\n' +
        history + '\n\n' +
        'Available movements (use these ids exactly, nothing else):\n' + menu + '\n\n' +
        'Rules:\n' +
        '- Exactly ' + freq + ' days. Use real weekday abbreviations: Mon Tue Wed Thu Fri Sat Sun.\n' +
        '- 3 to 5 movements a lifting day. Do not repeat a movement within a day.\n' +
        '- Give every muscle group at least 48 hours before it is trained again.\n' +
        '- If they train four or more days, one of them may be a walk instead of lifting. ' +
        'A walk day has no movements and a short instruction like "Treadmill, 45 minutes, incline 5".\n' +
        '- Name each day for what it trains: Upper, Lower, Push, Pull, Legs, Full body, Walk.\n' +
        '- Build on what they have been lifting. Do not drop a machine they are progressing on ' +
        'without replacing it with something that trains the same thing.\n\n' +
        'Return only JSON: {"days":[{"day":"Mon","name":"Upper","ex":["id","id"]},' +
        '{"day":"Sun","name":"Walk","detail":"Treadmill, 45 minutes, incline 5"}],' +
        '"note":"<one sentence to them about why this week looks like this>"}'
    }], { system: VOICE, maxTokens: 900 }, function (err, text) {
      if (err) return cb(err);
      var data;
      try { data = JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]); }
      catch (e) { return cb(new Error('The coach did not return a plan.')); }
      var plan = validatePlan(data.days, freq);
      if (!plan) return cb(new Error('The coach wrote a plan that could not be read.'));
      Store.set('plan', plan);
      Store.set('planMeta', {
        writtenBy: 'coach',
        weekOf: Store.weekStart ? Store.weekStart() : Store.todayKey(),
        note: (data.note || '').trim()
      });
      cb(null, plan);
    });
  }

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* Nothing reaches the store until it is a real plan: real weekdays, no
     duplicate days, and every movement present in the library. */
  function validatePlan(days, freq) {
    if (!Array.isArray(days) || !days.length) return null;
    var seen = {}, out = [];
    for (var i = 0; i < days.length; i++) {
      var d = days[i] || {};
      var day = String(d.day || '').slice(0, 3);
      day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      if (DAYS.indexOf(day) < 0 || seen[day]) continue;
      seen[day] = true;
      var name = String(d.name || '').trim().slice(0, 20) || 'Session';
      if (/walk/i.test(name)) {
        out.push({ day: day, name: 'Walk', detail: String(d.detail || 'Treadmill, 45 minutes, incline 5').slice(0, 60) });
        continue;
      }
      var ids = (Array.isArray(d.ex) ? d.ex : []).filter(function (id, n, arr) {
        return Exercises.get(id) && arr.indexOf(id) === n;
      });
      if (ids.length < 2) continue;
      out.push({ day: day, name: name, ex: ids.slice(0, 5) });
    }
    if (out.length < Math.max(2, freq - 1)) return null;
    out.sort(function (a, b) { return DAYS.indexOf(a.day) - DAYS.indexOf(b.day); });
    return Onboarding.withDetail(out);
  }

  // A written retrospective on the week.
  function weeklyNote(cb) {
    var k = Store.todayKey(), rows = [];
    for (var i = 6; i >= 0; i--) {
      var key = Store.shift(k, -i), t = Store.totals(key), d = Store.day(key);
      rows.push(key + ': ' + t.kcal + ' kcal, ' + t.protein + ' g protein, ' + d.steps + ' steps, ' +
        d.workouts.length + ' session' + (d.workouts.length === 1 ? '' : 's') + ', ' + Store.points(key) + '/10 points');
    }
    claude([{
      role: 'user',
      content: me() + '\'s last seven days:\n\n' + rows.join('\n') +
        '\n\nWrite three sentences about the week. Name one pattern worth noticing and one thing to carry into next week. ' +
        'Use only these figures. Return only the sentences.'
    }], { system: VOICE, maxTokens: 260 }, cb);
  }

  // Free-text meal → structured macros.
  function parseMeal(text, cb) {
    claude([{
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
    claude([{
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
    claude([{
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
    claude([{
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
    claude([{
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
  function gh(path, opts, cb) {
    var c = conn();
    if (!hasGit()) return cb(new Error('No GitHub token set'));
    var url = 'https://api.github.com/repos/' + c.githubRepo + '/contents/' + path;
    if (opts.method === 'GET') url += '?ref=' + encodeURIComponent(c.githubBranch);
    fetch(url, {
      method: opts.method,
      headers: {
        'authorization': 'Bearer ' + c.githubToken.trim(),
        'accept': 'application/vnd.github+json',
        'content-type': 'application/json'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    })
      .then(function (r) {
        if (r.status === 404) return { __missing: true };
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.message || ('GitHub ' + r.status));
          return j;
        });
      })
      .then(function (j) { cb(null, j); })
      .catch(function (e) { cb(e); });
  }

  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(str) { return decodeURIComponent(escape(atob((str || '').replace(/\n/g, '')))); }

  // What crosses over — governed entirely by the privacy toggles.
  function sharePayload() {
    var s = Store.state(), k = Store.todayKey(), t = Store.totals(k), d = Store.day(k);
    var out = {
      name: s.profile.name,
      initials: s.profile.initials,
      date: k,
      updated: new Date().toISOString(),
      points: Store.points(k),
      streak: Store.streak(),
      earned: s.earned.slice(),
      legMiles: Store.legMine(),
      note: d.noteToPartner || ''
    };
    /* The proposal crosses over so the handshake works between two devices.
       Whose turn it is cannot travel as "me" — the reader flips it. */
    if (s.invite) {
      out.invite = {
        routeId: s.invite.routeId, routeName: s.invite.routeName,
        proposedByMe: s.invite.from === 'me',
        at: s.invite.at, date: s.invite.date,
        counters: s.invite.counters || 0,
        accepted: !!s.invite.accepted,
        decidedBy: s.invite.decidedBy || '',
        nudgedAt: s.invite.nudgedAt || '',
        reply: s.invite.reply || '',
        trail: s.invite.trail || []
      };
    }
    if (s.privacy.calories) { out.calories = t.kcal; out.protein = t.protein; }
    if (s.privacy.workouts) out.workouts = d.workouts.length;
    if (s.privacy.steps) out.steps = d.steps;
    if (s.privacy.weight && d.weight != null) out.weight = d.weight;
    // Photos never cross. There is no toggle for them.
    return out;
  }

  function push(cb) {
    if (meSlug() === partnerSlug()) {
      return cb(new Error('You and ' + Store.partnerName() + ' have the same name set. Change one in Settings, or you would both write to the same file.'));
    }
    var path = 'sync/' + meSlug() + '.json';
    var payload = JSON.stringify(sharePayload(), null, 2);
    gh(path, { method: 'GET' }, function (err, existing) {
      if (err) return cb(err);
      var body = {
        message: 'InSync: ' + Store.state().profile.name + ' ' + Store.todayKey(),
        content: b64encode(payload),
        branch: conn().githubBranch
      };
      if (existing && existing.sha) body.sha = existing.sha;
      gh(path, { method: 'PUT', body: body }, function (e2) {
        if (e2) return cb(e2);
        cb(null, true);
      });
    });
  }

  function pull(cb) {
    gh('sync/' + partnerSlug() + '.json', { method: 'GET' }, function (err, j) {
      if (err) return cb(err);
      if (!j || j.__missing) return cb(null, null);
      var data;
      try { data = JSON.parse(b64decode(j.content)); } catch (e) { return cb(new Error('Her file could not be read')); }
      Store.set('partnerData', data);
      /* Her miles on the current leg come from her own device, which derived them
         the same way from her own steps. */
      if (data && typeof data.legMiles === 'number') Store.set('partnerLegMiles', data.legMiles);
      /* Her proposal is only news if it is newer than the one on this device;
         otherwise a stale file would undo an answer already given. */
      if (data && data.invite) {
        var here = Store.state().invite;
        if (!here || !here.at || (data.invite.at || '') > here.at) {
          Store.set('invite', {
            routeId: data.invite.routeId, routeName: data.invite.routeName,
            from: data.invite.proposedByMe ? 'partner' : 'me',
            at: data.invite.at, date: data.invite.date,
            counters: data.invite.counters || 0,
            accepted: !!data.invite.accepted,
            decidedBy: data.invite.decidedBy === 'me' ? 'partner'
              : data.invite.decidedBy === 'partner' ? 'me' : (data.invite.decidedBy || ''),
            nudgedAt: data.invite.nudgedAt || '',
            reply: data.invite.reply || '',
            trail: data.invite.trail || []
          });
        }
      }
      /* Her file is a snapshot, not a log. Keep each day's points as it
         arrives so the week can be drawn from something real. */
      if (data && data.date && typeof data.points === 'number') {
        var hist = Store.state().partnerHistory || {};
        hist[data.date] = data.points;
        var cutoff = Store.shift(Store.todayKey(), -30);
        Object.keys(hist).forEach(function (k) { if (k < cutoff) delete hist[k]; });
        Store.set('partnerHistory', hist);
      }
      return cb(null, data);
    });
  }

  function sync(cb) {
    push(function (err) {
      if (err) return cb(err);
      pull(function (e2, data) {
        if (e2) return cb(e2);
        Store.set('connections.lastSync', new Date().toISOString());
        cb(null, data);
      });
    });
  }


  // Meal ideas built around the targets and what is already eaten.
  function suggestMeals(cb) {
    var S = Store.state(), tg = S.targets;
    var known = [];
    Object.keys(S.days).forEach(function (k) {
      (S.days[k].meals || []).forEach(function (m) { if (known.indexOf(m.name) < 0) known.push(m.name); });
    });
    claude([{
      role: 'user',
      content: 'Suggest 6 meals for someone targeting ' + tg.calories + ' kcal and ' + tg.protein +
        ' g of protein a day. ' +
        (known.length ? 'They already eat: ' + known.slice(0, 12).join(', ') + '. Suggest different things. ' : '') +
        'Return ONLY JSON: {"meals":[{"name":"","slot":"Breakfast","kcal":0,"protein":0,"carbs":0,"fat":0,' +
        '"items":[{"name":"","weight":"","kcal":0,"protein":0,"carbs":0,"fat":0}]}]}. ' +
        'Ingredients matter - the shopping list is built from them.'
    }], { max_tokens: 1600 }, function (err, text) {
      if (err) return cb(err);
      var out;
      try { out = extractJson(text); } catch (e) { return cb(new Error('The coach replied with something unreadable. Try again.')); }
      if (!out || !out.meals) return cb(new Error('The coach replied with something unreadable. Try again.'));
      cb(null, out.meals);
    });
  }


  /* A real question, answered against the same facts the coach already reads.
     History is passed so a follow-up ("what about tomorrow?") makes sense. */
  function ask(question, history, cb) {
    var k = Store.todayKey(), t = Store.totals(k), d = Store.day(k), s = Store.state();
    var w = Store.recentWeights(14);
    var facts = [
      'Day ' + Store.daysIn() + '. Streak ' + Store.streak() + ' days. Goal: ' + s.goal.replace(/-/g, ' ') + '.',
      'Today: ' + t.kcal + '/' + s.targets.calories + ' kcal, ' + t.protein + '/' + s.targets.protein + ' g protein, ' +
        d.steps + '/' + s.targets.steps + ' steps, ' + d.workouts.length + ' session(s), ' + d.meals.length + ' meal(s).',
      'Weight target ' + s.targets.weightGoal + ' lb.' + (d.weight != null ? ' Weighed ' + d.weight + ' lb today.' : ''),
      w.length > 1 ? 'Recent weights: ' + w.map(function (x) { return x.weight; }).join(', ') + '.' : ''
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

    claude(msgs, { system: VOICE, maxTokens: 300 }, cb);
  }

  /* One cheap call, so a mistyped key is caught while it can still be pasted
     again — not on the first morning the coach is needed. */
  function testClaude(cb) {
    claude([{ role: 'user', content: 'Reply with the single word: ready' }], { maxTokens: 8 }, function (err) {
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
      return k + ': ' + tt.kcal + ' kcal, ' + tt.protein + ' g protein, ' + (d.steps || 0) + ' steps, ' +
        (d.workouts || []).length + ' session(s)' + (d.weight != null ? ', ' + d.weight + ' lb' : '');
    }).join('\n');

    claude([{
      role: 'user',
      content: me() + '\'s goal is ' + s.goal.replace(/-/g, ' ') + '. Their current targets are ' +
        t.calories + ' kcal, ' + t.protein + ' g protein, ' + t.steps + ' steps, weight goal ' + t.weightGoal + ' lb.\n\n' +
        'The last ' + Math.min(28, days.length) + ' logged days:\n' + rows +
        '\n\nPropose targets that fit what they actually do. Keep any target that is already right \u2014 ' +
        'changing everything is not advice. Reply with JSON only: ' +
        '{"calories":n,"protein":n,"steps":n,"weightGoal":n,"why":"one or two sentences naming the evidence"}'
    }], { system: VOICE, maxTokens: 400 }, function (err, text) {
      if (err) return cb(err);
      var out;
      try { out = JSON.parse((text || '').replace(/^[^{]*/, '').replace(/[^}]*$/, '')); }
      catch (e) { return cb(new Error('The coach\'s proposal could not be read.')); }
      var num = function (v, lo, hi, fallback) {
        var n = Math.round(+v);
        return (n >= lo && n <= hi) ? n : fallback;
      };
      var why = (out.why || '').trim();
      var firstSentence = why.split('. ')[0];
      Store.set('proposal', {
        date: Store.todayKey(),
        answered: false,
        why: why,
        summary: (firstSentence ? firstSentence.replace(/\.$/, '') + '.' : 'New targets to approve'),
        targets: {
          calories: num(out.calories, 1200, 4500, t.calories),
          protein: num(out.protein, 80, 300, t.protein),
          steps: num(out.steps, 3000, 25000, t.steps),
          weightGoal: num(out.weightGoal, 120, 400, t.weightGoal)
        }
      });
      cb(null, Store.state().proposal);
    });
  }

  window.Cloud = {
    suggestMeals: suggestMeals,
    proposeTargets: proposeTargets,
    testClaude: testClaude,
    hasClaude: hasClaude, hasGit: hasGit,
    coachLine: coachLine, chooseVerse: chooseVerse, writePlan: writePlan, weeklyNote: weeklyNote, ask: ask,
    parseMeal: parseMeal, parseMealPhoto: parseMealPhoto,
    readBarcodePhoto: readBarcodePhoto,
    restaurantMenu: restaurantMenu, menuItem: menuItem,
    push: push, pull: pull, sync: sync,
    sharePayload: sharePayload
  };
})();

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
    if (opts && opts.system) body.system = opts.system;

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
        cb(null, text);
      })
      .catch(function (e) { cb(e); });
  }

  /* Whose phone this is. Every prompt is written from this, never from a name in
     the source — on her device the coach writes to her about him. */
  function me() { return Store.state().profile.name || 'you'; }

  var VOICE = 'You write for InSync, a fitness app used by one couple. ' +
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

    var h = +(s.profile.heightIn || 0);
    var body = h ? Math.floor(h / 12) + ' ft ' + (h % 12) + ' in, age ' + (s.profile.age || 'not given') + ', ' + (s.profile.sex || 'sex not given') : 'not given';

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
        '- Exactly ' + freq + ' days. Use real weekday abbreviations: Mon Tue Wed Thu Fri Sat. Keep Sunday as the weekly recovery/rest day.\n' +
        '- 3 to 5 movements a lifting day. Do not repeat a movement within a day.\n' +
        '- Give every muscle group at least 48 hours before it is trained again.\n' +
        '- If they train four or more days, one of them may be a walk instead of lifting. ' +
        'A walk day has no movements and a short instruction like "Treadmill, 45 minutes, incline 5".\n' +
        '- Name each day for what it trains: Upper, Lower, Push, Pull, Legs, Full body, Walk.\n' +
        '- Build on what they have been lifting. Do not drop a machine they are progressing on ' +
        'without replacing it with something that trains the same thing.\n\n' +
        'Return only JSON: {"days":[{"day":"Mon","name":"Upper","ex":["id","id"]},' +
        '{"day":"Sat","name":"Walk","detail":"Treadmill, 45 minutes, incline 5"}],' +
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
    if (!Array.isArray(days) || days.length !== +freq) return null;
    var seen = {}, out = [];
    for (var i = 0; i < days.length; i++) {
      var d = days[i] || {};
      var day = String(d.day || '').slice(0, 3);
      day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      if (DAYS.indexOf(day) < 0 || day === 'Sun' || seen[day]) return null;
      seen[day] = true;
      var name = String(d.name || '').trim().slice(0, 20) || 'Session';
      if (/walk/i.test(name)) {
        out.push({ day: day, name: 'Walk', detail: String(d.detail || 'Treadmill, 45 minutes, incline 5').slice(0, 60) });
        continue;
      }
      var ids = (Array.isArray(d.ex) ? d.ex : []).filter(function (id, n, arr) {
        return Exercises.get(id) && arr.indexOf(id) === n;
      });
      if (ids.length < 3 || ids.length > 5) return null;
      out.push({ day: day, name: name, ex: ids });
    }
    if (out.length !== +freq) return null;
    if (out.filter(function (d) { return d.name === 'Walk'; }).length > 1) return null;

    /* Enforce the prompt's 48-hour recovery rule, including the Sunday-to-Monday
       boundary when this weekly plan repeats. Warm-up movements do not count. */
    var groupDays = {};
    out.forEach(function (d) {
      if (!d.ex) return;
      var di = DAYS.indexOf(d.day);
      var groups = {};
      d.ex.forEach(function (id) {
        var ex = Exercises.get(id);
        if (ex && ex.group !== 'Warm-up') groups[ex.group] = true;
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
      updated: cleanText(raw.updated, 40),
      points: boundedNumber(raw.points, 0, 10, 0),
      streak: Math.round(boundedNumber(raw.streak, 0, 10000, 0)),
      earned: [],
      note: cleanText(raw.note, 2000),
      noteDate: validDateKey(raw.noteDate) ? raw.noteDate : date,
      messages: [],
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
    return out;
  }

  // Core Together status always crosses; the sensitive health fields below obey the privacy toggles.
  function sharePayload() {
    var s = Store.state(), k = Store.todayKey(), t = Store.totals(k), d = Store.day(k), sharedNote = latestSharedNote();
    var out = {
      schema: 5,
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
    claude([{
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
      instructions: steps,
      items: items,
      source: 'coach'
    };
  }

  /* A real planner, not six loose suggestions. The contract is deliberately
     strict: one recipe for every Breakfast/Lunch/Dinner/Snack slot across the
     seven dated days. That lets the UI, shopping list and daily log all point
     at the same objects without guessing what Claude meant. */
  function planMealsWeek(weekOf, cb) {
    weekOf = validDateKey(weekOf) ? weekOf : Store.weekStart(Store.todayKey());
    var S = Store.state(), tg = S.targets, dates = [], known = [];
    for (var i = 0; i < 7; i++) dates.push(Store.shift(weekOf, i));
    Object.keys(S.days || {}).sort().reverse().slice(0, 21).forEach(function (k) {
      (S.days[k].meals || []).forEach(function (m) {
        if (m && m.name && known.indexOf(m.name) < 0) known.push(m.name);
      });
    });
    var dayList = dates.map(function (d) {
      return d + ' (' + new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) + ')';
    }).join(', ');
    var prompt =
      'Build a complete seven-day meal plan for ' + me() + '. Goal: ' + S.goal.replace(/-/g, ' ') + '. ' +
      'Daily target: about ' + tg.calories + ' kcal and at least ' + tg.protein + ' g protein. ' +
      'The seven dates are: ' + dayList + '. ' +
      (known.length ? 'Meals they have already logged include: ' + known.slice(0, 14).join(', ') + '. You may reuse a good fit occasionally but do not repeat the same day over and over. ' : '') +
      'Use ordinary grocery-store foods, practical portions, and purposeful ingredient overlap so the shopping list is reasonable. ' +
      'Keep most recipes under 35 minutes and make snacks genuinely snack-sized. Do not assume allergies or dietary restrictions that were not provided. ' +
      'Return EXACTLY 28 meals: Breakfast, Lunch, Dinner and Snack for each of the seven dates. ' +
      'Each meal needs enough information to cook it. Ingredient amount belongs in weight (examples: "6 oz", "1 cup", "2 large"). ' +
      'Nutrition values are for one planned serving. Across each full day, aim for 90-105% of the calorie target and at least the protein target. ' +
      'Return ONLY JSON in this shape: ' +
      '{"meals":[{"date":"YYYY-MM-DD","slot":"Breakfast","name":"","kcal":0,"protein":0,"carbs":0,"fat":0,' +
      '"servings":1,"prepMinutes":0,"recipeNote":"optional prep/storage note",' +
      '"items":[{"name":"ingredient","weight":"amount"}],"instructions":["step one","step two"]}]}. ' +
      'Do not use markdown.';

    claude([{ role: 'user', content: prompt }], { system: VOICE, maxTokens: 7600, timeoutMs: 90000 }, function (err, text) {
      if (err) return cb(err);
      var out;
      try { out = extractJson(text); } catch (e) { return cb(new Error('The coach\'s weekly plan could not be read. Try again.')); }
      if (!out || !Array.isArray(out.meals)) return cb(new Error('The coach returned no weekly meals. Try again.'));
      var map = {}, slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
      out.meals.forEach(function (m) {
        var cleaned = cleanPlannedRecipe(m, '', '');
        if (!cleaned || dates.indexOf(cleaned.date) < 0) return;
        var key = cleaned.date + '|' + cleaned.slot;
        if (!map[key]) map[key] = cleaned;
      });
      var missing = [];
      dates.forEach(function (d) {
        slots.forEach(function (sl) { if (!map[d + '|' + sl]) missing.push(d + ' ' + sl); });
      });
      if (missing.length) {
        return cb(new Error('The coach missed ' + missing.length + ' meal slot' + (missing.length === 1 ? '' : 's') + '. Nothing was replaced; try the week again.'));
      }
      cb(null, map);
    });
  }

  function recipeForMeal(meal, cb) {
    meal = meal || {};
    if (!cleanText(meal.name, 160)) return cb(new Error('Choose a meal first.'));
    var prompt = 'Turn this planned meal into a practical recipe without changing its nutrition target more than necessary. ' +
      'Meal: ' + cleanText(meal.name, 160) + '. Slot: ' + cleanText(meal.slot, 20) + '. ' +
      'Target nutrition: ' + Math.round(+meal.kcal || 0) + ' kcal, ' + Math.round(+meal.protein || 0) + ' g protein, ' +
      Math.round(+meal.carbs || 0) + ' g carbs, ' + Math.round(+meal.fat || 0) + ' g fat. ' +
      'Return ONLY JSON: {"name":"","slot":"' + cleanText(meal.slot, 20) + '","kcal":0,"protein":0,"carbs":0,"fat":0,' +
      '"servings":1,"prepMinutes":0,"recipeNote":"","items":[{"name":"","weight":""}],"instructions":[""]}.';
    claude([{ role: 'user', content: prompt }], { system: VOICE, maxTokens: 1200, timeoutMs: 60000 }, function (err, text) {
      if (err) return cb(err);
      var out;
      try { out = extractJson(text); } catch (e) { return cb(new Error('The recipe could not be read. Try again.')); }
      var cleaned = cleanPlannedRecipe(out, meal.date || Store.todayKey(), meal.slot || 'Dinner');
      if (!cleaned || !cleaned.instructions.length || !cleaned.items.length) return cb(new Error('The recipe came back incomplete. Try again.'));
      cb(null, cleaned);
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
    suggestMeals: suggestMeals, planMealsWeek: planMealsWeek, recipeForMeal: recipeForMeal,
    proposeTargets: proposeTargets,
    testClaude: testClaude,
    hasClaude: hasClaude, hasGit: hasGit,
    coachLine: coachLine, chooseVerse: chooseVerse, writePlan: writePlan, weeklyNote: weeklyNote, ask: ask,
    parseMeal: parseMeal, parseMealPhoto: parseMealPhoto,
    readBarcodePhoto: readBarcodePhoto,
    restaurantMenu: restaurantMenu, menuItem: menuItem,
    push: push, pull: pull, sync: sync, autoSync: autoSync, ensureSyncRepo: ensureSyncRepo,
    isApplyingRemote: function () { return applyingRemote; },
    sharePayload: sharePayload, validatePlan: validatePlan, sanitizePartnerPayload: sanitizePartnerPayload
  };
})();

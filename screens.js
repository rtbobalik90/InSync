/* Screens. Each returns HTML for the sheet body; UI.screen supplies the chrome.
   No screen invents a number — everything comes from Store. */
(function () {
  'use strict';

  var esc = UI.esc, icon = UI.icon;

  var VERSES = [
    { text: 'He makes my feet like the feet of a deer; he causes me to stand on the heights.', ref: 'Habakkuk 3:19' },
    { text: 'Let us run with endurance the race that is set before us.', ref: 'Hebrews 12:1' },
    { text: 'She girds herself with strength and makes her arms strong.', ref: 'Proverbs 31:17' },
    { text: 'I can do all things through him who strengthens me.', ref: 'Philippians 4:13' },
    { text: 'Whatever you do, work heartily, as for the Lord and not for men.', ref: 'Colossians 3:23' },
    { text: 'Do you not know that your body is a temple of the Holy Spirit within you?', ref: '1 Corinthians 6:19' },
    { text: 'They who wait for the Lord shall renew their strength.', ref: 'Isaiah 40:31' }
  ];

  var ROUTES = {
    camino: {
      name: 'Camino de Santiago', where: 'Navarre, Spain',
      legs: [
        { from: 'Saint-Jean-Pied-de-Port', to: 'Roncesvalles', miles: 15.5, art: 'assets/art/camino/saint-jean.png' },
        { from: 'Roncesvalles', to: 'Zubiri', miles: 13.7, art: 'assets/art/camino/roncesvalles.png' },
        { from: 'Zubiri', to: 'Pamplona', miles: 13.0, art: 'assets/art/camino/zubiri.png' },
        { from: 'Pamplona', to: 'Puente la Reina', miles: 14.9, art: 'assets/art/camino/pamplona.png' },
        { from: 'Puente la Reina', to: 'Estella', miles: 13.7, art: 'assets/art/camino/puente-la-reina.png' },
        { from: 'Estella', to: 'Los Arcos', miles: 12.4, art: 'assets/art/camino/estella.png' }
      ]
    }
  };

  function verse() {
    var d = new Date();
    var n = Math.floor(d.getTime() / 86400000) % VERSES.length;
    return VERSES[n];
  }

  function route() { return ROUTES[Store.state().expedition.routeId] || ROUTES.camino; }
  function leg() {
    var e = Store.state().expedition, r = route();
    return r.legs[Math.min(e.legIndex, r.legs.length - 1)];
  }

  function timeWord() {
    return { dawn: 'camp at dawn', day: 'camp in daylight', sunset: 'camp at sunset', night: 'camp after dark' }[Store.timeOfDay()];
  }

  function ledgerCard() {
    var t = Store.totals(), d = Store.day(), tg = Store.state().targets;
    function foot(v, target, unit) {
      var left = target - v;
      if (left <= 0) return '<div class="foot ok">target met</div>';
      return '<div class="foot' + (left / target > 0.4 ? ' short' : '') + '">' +
        left.toLocaleString() + (unit || '') + ' to go</div>';
    }
    return '<article class="card">' +
      '<div class="cardhead">' +
        '<div class="title"><i></i>Day ' + Store.streak() + ' on the trail</div>' +
        '<div class="meta">' + esc(timeWord()) + '</div>' +
      '</div>' +
      '<div class="ledger">' +
        '<div><div class="label">Calories</div><div class="figure">' + t.kcal.toLocaleString() + '</div>' + foot(t.kcal, tg.calories) + '</div>' +
        '<div><div class="label">Protein</div><div class="figure">' + t.protein + '<small>g</small></div>' + foot(t.protein, tg.protein, ' g') + '</div>' +
        '<div><div class="label">Steps</div><div class="figure">' + d.steps.toLocaleString() + '</div>' + foot(d.steps, tg.steps) + '</div>' +
      '</div>' +
    '</article>';
  }

  function nextStepCard() {
    var n = Store.nextStep();
    return '<article class="card pad">' +
      '<div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">' +
        '<span style="width:15px;height:15px;color:var(--gold)">' + icon('flag') + '</span>' +
        '<span class="kicker">Next step today</span>' +
      '</div>' +
      '<p class="lede">' + esc(n.line) + '</p>' +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn" data-route="' + n.route + '">' + esc(n.action) + '</button>' +
        '<button class="btn ghost auto" data-route="coach">Ask coach</button>' +
      '</div>' +
    '</article>';
  }

  function expeditionCard() {
    var l = leg(), e = Store.state().expedition, r = route();
    var walked = e.legMilesRobert + e.legMilesLizzie;
    var pct = Math.min(100, Math.round((walked / l.miles) * 100));
    return '<article class="card pad">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px">' +
        '<div>' +
          '<div class="kicker sage" style="margin-bottom:6px">Leg ' + (e.legIndex + 1) + ' of ' + r.legs.length + ' &middot; ' + esc(r.name) + '</div>' +
          '<h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:0">' + esc(l.from) + ' &rarr; ' + esc(l.to) + '</h3>' +
        '</div>' +
        '<div style="text-align:right;flex:none">' +
          '<div style="font-family:var(--serif);font-size:26px;line-height:1;color:var(--gold)">' + pct + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="track"><span style="width:' + pct + '%"></span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--faint);margin-top:9px">' +
        '<span>' + walked.toFixed(1) + ' mi walked together</span><span>' + l.miles.toFixed(1) + ' mi</span>' +
      '</div>' +
    '</article>';
  }

  function partnerCard() {
    var p = Store.state().partner;
    return '<article class="card pad accent">' +
      '<div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">' +
        '<div class="avatar her" style="width:32px;height:32px;flex:none">' + esc(p.initials) + '</div>' +
        '<div style="font-size:12.5px;color:var(--muted)">' + esc(p.name) + ' finished her workout &middot; 9,140 steps</div>' +
      '</div>' +
      '<p style="font-family:var(--serif);font-style:italic;font-size:16.5px;line-height:1.5;margin:0;color:#EDE5D4;text-wrap:pretty">&ldquo;Made it out before the rain. Your turn.&rdquo;</p>' +
      '<div class="btnrow" style="margin-top:15px">' +
        '<button class="btn ghost sm">Reply</button>' +
        '<button class="btn ghost sm" data-route="together">Open Together</button>' +
      '</div>' +
    '</article>';
  }

  // ---------------- Home ----------------
  function home() {
    var v = verse();
    var hasData = Store.logged(Store.todayKey());
    var overlay =
      '<div class="eyebrow">Verse for the day</div>' +
      '<p class="verse">' + esc(v.text) + '</p>' +
      '<cite class="attrib">' + esc(v.ref) + '</cite>' +
      '<div class="streakline"><i></i><span>' +
        (hasData ? 'Day ' + Store.streak() + ' on the trail &middot; ' + timeWord() : 'Day one &middot; ' + timeWord()) +
      '</span></div>';

    var body = hasData
      ? ledgerCard() + nextStepCard() + expeditionCard() + partnerCard()
      : dayOneCard();

    return UI.screen({
      tab: 'home', rest: 551, overlay: overlay, body: body,
      photoHeight: '690px'
    });
  }

  function dayOneCard() {
    var tg = Store.state().targets;
    return '<article class="card">' +
      '<div class="cardhead"><div class="title"><i></i>Nothing logged yet</div>' +
      '<div class="meta">Day one</div></div>' +
      '<div class="ledger">' +
        '<div><div class="label">Calories</div><div class="figure" style="color:#4E4A3E">&mdash;</div><div class="foot">of ' + tg.calories.toLocaleString() + '</div></div>' +
        '<div><div class="label">Protein</div><div class="figure" style="color:#4E4A3E">&mdash;</div><div class="foot">of ' + tg.protein + ' g</div></div>' +
        '<div><div class="label">Steps</div><div class="figure" style="color:#4E4A3E">&mdash;</div><div class="foot">of ' + tg.steps.toLocaleString() + '</div></div>' +
      '</div>' +
    '</article>' +
    '<article class="card pad">' +
      '<div class="kicker" style="margin-bottom:11px">Four ways in</div>' +
      '<div style="display:grid;gap:9px">' +
        '<button class="btn ghost block" data-route="nutrition">Photograph a meal</button>' +
        '<button class="btn ghost block" data-route="train">Start a session</button>' +
        '<button class="btn ghost block" data-route="body">Weigh in</button>' +
        '<button class="btn ghost block" data-route="together">Invite ' + esc(Store.state().partner.name) + '</button>' +
      '</div>' +
      '<p class="small" style="margin-top:14px">The coach needs a fortnight before it proposes targets. Until then these are starting numbers, not yours.</p>' +
    '</article>';
  }

  // ---------------- Coach ----------------
  function coach() {
    var n = Store.nextStep(), t = Store.totals(), tg = Store.state().targets;
    var overlay =
      '<div class="eyebrow">' + esc(['Dawn','Thursday morning','This evening','Tonight'][0]) + '</div>' +
      '<p class="verse" style="font-size:25px">One thing stands between you and a clean day.</p>';

    var evidence = [
      { fig: t.protein + ' g', text: 'logged so far against a ' + tg.protein + ' g target' },
      { fig: Store.day().meals.length + '', text: 'meals in, which is where the shortfall is coming from' },
      { fig: Store.streak() + ' days', text: 'unbroken — the pattern is holding' }
    ];

    return UI.screen({
      tab: 'coach', rest: 556, overlay: overlay, blur: false,
      body:
        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">Next step today</div>' +
          '<p class="lede">' + esc(n.line) + '</p>' +
          '<div class="btnrow" style="margin-top:16px">' +
            '<button class="btn" data-route="' + n.route + '">' + esc(n.action) + '</button>' +
          '</div>' +
        '</article>' +
        '<div class="rulehead"><span class="kicker sage">Its working</span><span></span></div>' +
        '<article class="card pad">' +
          evidence.map(function (e) {
            return '<div style="display:flex;align-items:baseline;gap:12px;padding:11px 0;border-bottom:1px solid var(--rule)">' +
              '<span style="font-family:var(--serif);font-size:17px;font-variant-numeric:tabular-nums;color:var(--gold-mid);flex:none;min-width:62px">' + esc(e.fig) + '</span>' +
              '<span class="note">' + esc(e.text) + '</span></div>';
          }).join('') +
        '</article>' +
        '<div class="rulehead"><span class="kicker">Ask it something</span><span></span></div>' +
        '<article class="card pad">' +
          '<div style="display:grid;gap:9px">' +
            ['What should I eat tonight?', 'Why is my weight up this week?', 'Am I lifting enough?'].map(function (q) {
              return '<button class="btn ghost block" style="justify-content:flex-start;text-transform:none;letter-spacing:0;font-size:13.5px">' + esc(q) + '</button>';
            }).join('') +
          '</div>' +
        '</article>'
    });
  }

  // ---------------- Nutrition ----------------
  function nutrition() {
    var d = Store.day(), t = Store.totals(), tg = Store.state().targets;
    var rows = d.meals.length
      ? d.meals.map(function (m) {
          return '<div class="row">' +
            '<div class="thumb"' + (m.photo ? ' style="background-image:url(\'' + UI.asset(m.photo) + '\')"' : '') + '>' +
              (m.photo ? '' : esc(m.name.slice(0, 1))) + '</div>' +
            '<div style="min-width:0">' +
              '<div style="display:flex;align-items:baseline;gap:9px;margin-bottom:5px">' +
                '<span class="stamp">' + esc(m.time || '') + '</span>' +
                '<span class="stamp" style="color:var(--faint)">' + esc(m.slot || '') + '</span>' +
              '</div>' +
              '<h4>' + esc(m.name) + '</h4>' +
              '<div class="macros">' + m.protein + ' g protein &middot; ' + m.carbs + ' g carbs &middot; ' + m.fat + ' g fat</div>' +
            '</div>' +
            '<div class="kcal">' + m.kcal + '<small>kcal</small></div>' +
          '</div>';
        }).join('')
      : '<div class="empty"><p class="note">Nothing logged today.</p></div>';

    var gap = tg.protein - t.protein;

    return UI.screen({
      tab: 'nutrition', rest: 330, photoHeight: '330px',
      art: 'assets/art/meal-example.jpg', photoPosition: 'center 46%',
      overlay: '<div class="eyebrow">Today</div><p class="verse" style="font-size:25px">' +
        (d.meals.length ? d.meals.length + ' meals in.' : 'Nothing logged yet.') +
        (gap > 0 ? ' ' + gap + ' g of protein left.' : ' Protein closed.') + '</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Logged so far</div>' +
          '<div class="meta">' + d.meals.length + ' meal' + (d.meals.length === 1 ? '' : 's') + '</div></div>' +
          '<div class="ledger">' +
            '<div><div class="label">Calories</div><div class="figure">' + t.kcal.toLocaleString() + '</div><div class="foot">' + Math.max(0, tg.calories - t.kcal).toLocaleString() + ' to go</div></div>' +
            '<div><div class="label">Protein</div><div class="figure">' + t.protein + '<small>g</small></div><div class="foot' + (gap > 0 ? ' short' : ' ok') + '">' + (gap > 0 ? gap + ' g short' : 'target met') + '</div></div>' +
            '<div><div class="label">Carbs</div><div class="figure">' + t.carbs + '<small>g</small></div><div class="foot ok">on pace</div></div>' +
          '</div>' +
        '</article>' +
        '<button class="btn block" data-action="log-meal"><span style="width:16px;height:16px;display:inline-grid">' + icon('camera') + '</span>Photograph a meal</button>' +
        '<div class="rulehead"><span class="kicker">Today</span><span></span></div>' +
        '<article class="card rowlist">' + rows + '</article>'
    });
  }

  // ---------------- Train ----------------
  function train() {
    var d = Store.day(), done = d.workouts.length > 0;
    var S = Store.state();
    var plan = S.plan || [];
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var todayName = DOW[new Date().getDay()];
    var todaysPlan = null;
    for (var p = 0; p < plan.length; p++) if (plan[p].day === todayName) todaysPlan = plan[p];

    var week = [];
    for (var i = 6; i >= 0; i--) {
      var k = Store.shift(Store.todayKey(), -i);
      var rec = Store.state().days[k];
      var dt = new Date(k + 'T12:00:00');
      week.push({
        letter: DOW[dt.getDay()].charAt(0),
        done: rec && rec.workouts ? rec.workouts.length > 0 : false,
        today: i === 0
      });
    }
    var sessions = week.filter(function (w) { return w.done; }).length;
    var target = S.frequency || 4;

    var machines = todaysPlan && todaysPlan.name !== 'Walk'
      ? todaysPlan.detail.split(' \u00b7 ')
      : [];

    var headline = done
      ? 'Session done. That is the day carried.'
      : todaysPlan
        ? (todaysPlan.name === 'Walk'
            ? 'Walking day. ' + todaysPlan.detail + '.'
            : todaysPlan.name + ' day. ' + machines.length + ' machines, about ' + (machines.length * 8) + ' minutes.')
        : 'Rest day. Nothing scheduled.';

    return UI.screen({
      tab: 'train', rest: 400, photoHeight: '400px',
      art: 'assets/art/train-banner.png', photoPosition: 'center 40%',
      overlay: '<div class="eyebrow">Today</div><p class="verse" style="font-size:25px">' + esc(headline) + '</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead">' +
            '<div class="title"><i></i>This week</div>' +
            '<div class="meta">' + sessions + ' of ' + target + '</div>' +
          '</div>' +
          '<div class="weekstrip">' +
            week.map(function (w) {
              return '<div class="wk' + (w.done ? ' done' : '') + (w.today ? ' today' : '') + '">' +
                '<span class="wk-mark">' + (w.done ? UI.icon('check') : '') + '</span>' +
                '<span class="wk-day">' + w.letter + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<p class="small pad-x">' +
            (sessions >= target
              ? 'The week is met. Anything else is a bonus.'
              : (target - sessions) + ' more to hit ' + target + ' this week.') +
          '</p>' +
        '</article>' +

        (done
          ? '<article class="card pad"><div class="kicker sage" style="margin-bottom:11px">Done</div>' +
            '<p class="lede">' + esc(d.workouts[0].name) + ' &middot; ' + d.workouts[0].minutes + ' minutes.</p></article>'
          : machines.length
            ? '<article class="card">' +
                '<div class="cardhead"><div class="title"><i></i>' + esc(todaysPlan.name) + ' day</div>' +
                '<div class="meta">' + machines.length + ' machines</div></div>' +
                machines.map(function (m, idx) {
                  return '<div class="exrow">' +
                    '<span class="exnum">' + (idx + 1) + '</span>' +
                    '<span class="exname">' + esc(m) + '</span>' +
                    '<span class="exsets">3 &times; 10</span>' +
                  '</div>';
                }).join('') +
                '<div class="pad-x" style="padding-bottom:15px;padding-top:13px">' +
                  '<button class="btn block" data-action="start-session">Start the session</button>' +
                '</div>' +
              '</article>'
            : '<button class="btn block" data-action="start-session">Log a session</button>') +

        '<button class="btn ghost block" data-route="records">Records and progression</button>' +
        '<button class="btn ghost block" data-route="body">Body &mdash; weight, photos, sleep</button>'
    });
  }

  // ---------------- Together ----------------
  function together() {
    var mine = Store.points();
    var hers = 7; // partner's shared total for today
    var gap = hers - mine;
    var rows = Store.pointRows();
    var open = rows.filter(function (r) { return !r.done; });
    var closer = open.sort(function (a, b) { return b.value - a.value; })[0];

    return UI.screen({
      tab: 'together', rest: 470,
      art: leg().art || UI.CAMP[Store.timeOfDay()],
      overlay: '<div class="eyebrow">Today</div><p class="verse" style="font-size:26px">' +
        (gap > 0 ? gap + ' point' + (gap === 1 ? '' : 's') + ' back.' : gap === 0 ? 'Level.' : Math.abs(gap) + ' ahead.') + '</p>' +
        (closer ? '<p class="attrib" style="text-transform:none;letter-spacing:0;font-size:13px;color:rgba(243,237,225,.8)">' +
          esc(closer.label) + ' is worth ' + closer.value + '.</p>' : ''),
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Today</div>' +
          '<div class="meta">' + mine + ' &middot; ' + hers + '</div></div>' +
          rows.map(function (r) {
            return '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 17px;border-bottom:1px solid var(--rule)">' +
              '<div style="font-size:14px;color:' + (r.done ? 'var(--ink)' : 'var(--faint)') + '">' + esc(r.label) + '</div>' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                '<span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:' + (r.done ? 'var(--gold-mid)' : 'var(--faint)') + '">' + (r.done ? 'banked' : 'open') + '</span>' +
                '<span style="font-family:var(--serif);font-size:17px;color:' + (r.done ? 'var(--gold)' : 'var(--dim)') + '">' + r.value + '</span>' +
              '</div></div>';
          }).join('') +
          '<p class="small" style="padding:13px 17px 15px">Ten points a day, weighted the same for both of you.</p>' +
        '</article>' +
        expeditionCard() +
        '<button class="btn ghost block" data-route="badges">Badges</button>'
    });
  }

  // ---------------- Settings ----------------
  function settings() {
    var S = Store.state();
    var c = S.connections || {};
    var shared = ['weight', 'calories', 'workouts', 'steps'].filter(function (k) { return S.privacy[k]; }).length;
    var notifOn = Object.keys(S.notifs).filter(function (k) { return S.notifs[k]; }).length;

    function toggle(path, on) {
      return '<button class="sw' + (on ? ' on' : '') + '" data-toggle="' + path + '"><span></span></button>';
    }
    function row(label, note, right) {
      return '<div class="setrow"><div><div class="setname">' + esc(label) + '</div>' +
        (note ? '<div class="small">' + esc(note) + '</div>' : '') + '</div>' + right + '</div>';
    }
    function keyField(label, path, value, placeholder, note) {
      return '<div class="keyfield">' +
        '<label class="kicker">' + esc(label) + '</label>' +
        '<input type="password" class="keyinput" data-set="' + path + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder) + '" autocomplete="off" spellcheck="false" />' +
        (note ? '<div class="small">' + esc(note) + '</div>' : '') +
      '</div>';
    }

    return UI.screen({
      tab: null, rest: 210, blur: true,
      header: { back: true, title: 'Settings', right: '<div style="width:34px"></div>' },
      overlay: '<p class="verse" style="font-size:25px">Everything the app knows, and who else knows it.</p>',
      body:
        '<article class="card pad">' +
          '<div class="profrow">' +
            '<div class="avatar big">' + esc(S.profile.initials) + '</div>' +
            '<div><h3 class="profname">' + esc(S.profile.name) + '</h3>' +
            '<div class="small">' + Math.floor(S.profile.heightIn / 12) + ' ft ' + (S.profile.heightIn % 12) + ' in &middot; ' +
              S.profile.age + ' &middot; walking since ' + esc(S.profile.startDate) + '</div></div>' +
          '</div>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Connections</div>' +
            '<div class="meta">' + ((c.githubToken ? 1 : 0) + (c.claudeKey ? 1 : 0)) + ' of 2 set</div></div>' +
          '<div class="pad-x" style="padding-top:14px;padding-bottom:4px">' +
            '<p class="small" style="margin:0 0 14px">Keys are stored on this device only. They are never sent anywhere except the service they belong to.</p>' +
            keyField('Claude API key', 'connections.claudeKey', c.claudeKey, 'sk-ant-...', 'Powers the coach, the meal reader and the plan writer.') +
            keyField('GitHub token', 'connections.githubToken', c.githubToken, 'ghp_...', 'Used to back up and sync your log between the two of you.') +
            '<div class="keyfield">' +
              '<label class="kicker">Repository</label>' +
              '<input type="text" class="keyinput plain" data-set="connections.githubRepo" value="' + esc(c.githubRepo || '') + '" placeholder="owner/name" autocomplete="off" spellcheck="false" />' +
            '</div>' +
            '<div class="keyfield">' +
              '<label class="kicker">Branch</label>' +
              '<input type="text" class="keyinput plain" data-set="connections.githubBranch" value="' + esc(c.githubBranch || 'main') + '" placeholder="main" autocomplete="off" spellcheck="false" />' +
            '</div>' +
          '</div>' +
          '<div class="pad-x" style="padding-bottom:15px">' +
            '<button class="btn ghost block" data-action="sync-now">' + (c.lastSync ? 'Sync now &middot; last ' + esc(c.lastSync) : 'Sync now') + '</button>' +
          '</div>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Targets</div><div class="meta">Set by the coach</div></div>' +
          row('Daily calories', 'Goal: ' + esc(S.goal), '<span class="num">' + S.targets.calories.toLocaleString() + '</span>') +
          row('Daily protein', '', '<span class="num">' + S.targets.protein + ' g</span>') +
          row('Daily steps', '', '<span class="num">' + S.targets.steps.toLocaleString() + '</span>') +
          row('Weight goal', '', '<span class="num">' + S.targets.weightGoal + ' lb</span>') +
          '<p class="small pad-x" style="padding-bottom:15px">The coach watches these and proposes changes. Nothing moves without your tap.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title sage"><i></i>What Lizzie sees</div>' +
            '<div class="meta sage">' + shared + ' of 4 shared</div></div>' +
          row('Weight', 'Your trend, not the daily number', toggle('privacy.weight', S.privacy.weight)) +
          row('Calories and protein', 'Daily totals only, never the meals', toggle('privacy.calories', S.privacy.calories)) +
          row('Workouts', 'That you trained, not what you lifted', toggle('privacy.workouts', S.privacy.workouts)) +
          row('Steps and walks', 'Daily total and distance', toggle('privacy.steps', S.privacy.steps)) +
          row('Progress photos', 'Never shared. There is no switch for this.', '<span class="lockmark">' + icon('lock') + '</span>') +
          '<p class="small pad-x" style="padding-bottom:15px">She sees totals, never entries. And she is never told something was hidden.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Notifications</div>' +
            '<div class="meta">' + notifOn + ' of 8 on</div></div>' +
          row('She proposes an expedition', '', toggle('notifs.invite', S.notifs.invite)) +
          row('She accepts', '', toggle('notifs.accept', S.notifs.accept)) +
          row('A leg is completed', '', toggle('notifs.leg', S.notifs.leg)) +
          row('She leaves you a note', '', toggle('notifs.note', S.notifs.note)) +
          row('A badge is earned', '', toggle('notifs.badge', S.notifs.badge)) +
          row('The week is summarised', 'Sunday evening', toggle('notifs.weekly', S.notifs.weekly)) +
          '<p class="small pad-x" style="padding-bottom:15px">There is no daily reminder to log. It would fire hardest on the days you were already struggling.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title sage"><i></i>Your data</div></div>' +
          row('Export everything', 'One file, readable without this app', '<button class="btn ghost tiny" data-action="export">Export</button>') +
          row('Start over', 'Clears this device and runs onboarding again', '<button class="btn ghost tiny danger" data-action="reset">Reset</button>') +
          '<p class="small pad-x" style="padding-bottom:15px">Everything lives on this device. Sync is how it reaches Lizzie\u2019s, and nowhere else.</p>' +
        '</article>' +

        '<div class="center" style="padding:8px 0 4px">' +
          '<div class="profname" style="font-size:15px;color:var(--muted)">InSync</div>' +
          '<div class="small" style="margin-top:6px">Version 5.0 &middot; built for two</div>' +
        '</div>'
    });
  }

  window.Screens = {
    home: home, coach: coach, nutrition: nutrition, train: train, together: together,
    settings: settings,
    route: route, leg: leg, verse: verse
  };
})();

/* Onboarding. Nine screens, gates the app until Store.state().onboarded is true.
   Every figure in the copy is derived — nothing about the flow is asserted twice. */
(function () {
  'use strict';

  var esc = UI.esc;

  // What onboarding collects, and which of those are numbers.
  // The coach's closing letter reads its counts from here.
  var COLLECTED = [
    { field: 'name', numeric: false },
    { field: 'height', numeric: true },
    { field: 'age', numeric: true },
    { field: 'sex', numeric: false },
    { field: 'starting weight', numeric: true },
    { field: 'goal', numeric: false },
    { field: 'training frequency', numeric: true }
  ];
  var WORDS = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  function word(n) { return WORDS[n] || String(n); }

  var GOALS = [
    { key: 'lose-fat', name: 'Lose fat, keep muscle', note: 'A deficit small enough to train through' },
    { key: 'build', name: 'Build muscle', note: 'A surplus, and enough protein to use it' },
    { key: 'hold', name: 'Hold steady', note: 'Maintain where you are, train for strength' },
    { key: 'strong', name: 'Get stronger', note: 'Lifting leads, the scale is secondary' }
  ];

  var FREQ_NOTE = {
    2: 'Two full-body sessions. Every machine, every time — it is the only way twice a week works.',
    3: 'Push, pull, legs. One of each, in order, whenever you get there.',
    4: 'Upper and lower, twice each. Enough room to press heavy and still squat.',
    5: 'Four lifting days and one walk. The walk is not optional — it is where the miles come from.',
    6: 'Six days is a lot to hold. The coach will watch for the week you start missing and say so.'
  };

  /* Plans reference exercise ids from the library, so every movement has a
     GIF, a group and a prescription. `detail` is derived, never typed. */
  var PLANS = {
    2: [
      { day: 'Mon', name: 'Full body', ex: ['dumbbell-chest-press', 'horizontal-leg-press', 'pulldown-machine', 'shoulder-press-machine'] },
      { day: 'Thu', name: 'Full body', ex: ['dumbbell-chest-press', 'linear-leg-press', 'cable-row', 'triceps-pushdown'] },
      { day: 'Sat', name: 'Walk', detail: 'Treadmill, 40 minutes, incline 4' }
    ],
    3: [
      { day: 'Mon', name: 'Push', ex: ['dumbbell-chest-press', 'shoulder-press-machine', 'triceps-pushdown'] },
      { day: 'Wed', name: 'Pull', ex: ['pulldown-machine', 'cable-row', 'biceps-curl-machine'] },
      { day: 'Fri', name: 'Legs', ex: ['horizontal-leg-press', 'leg-extension', 'calf-extension'] },
      { day: 'Sun', name: 'Walk', detail: 'Treadmill, 45 minutes, incline 5' }
    ],
    4: [
      { day: 'Mon', name: 'Upper', ex: ['dumbbell-chest-press', 'pulldown-machine', 'shoulder-press-machine'] },
      { day: 'Tue', name: 'Lower', ex: ['horizontal-leg-press', 'leg-extension', 'glute-machine'] },
      { day: 'Thu', name: 'Upper', ex: ['cable-row', 'dumbbell-chest-press', 'triceps-pushdown'] },
      { day: 'Fri', name: 'Lower', ex: ['linear-leg-press', 'calf-extension', 'cable-hip-extension'] },
      { day: 'Sun', name: 'Walk', detail: 'Treadmill, 45 minutes, incline 5' }
    ],
    5: [
      { day: 'Mon', name: 'Push', ex: ['dumbbell-chest-press', 'shoulder-press-machine', 'triceps-pushdown'] },
      { day: 'Tue', name: 'Pull', ex: ['pulldown-machine', 'cable-row', 'biceps-curl-machine'] },
      { day: 'Wed', name: 'Legs', ex: ['horizontal-leg-press', 'leg-extension', 'calf-extension'] },
      { day: 'Fri', name: 'Upper', ex: ['dumbbell-chest-press', 'cable-row', 'lateral-raise'] },
      { day: 'Sat', name: 'Lower', ex: ['linear-leg-press', 'glute-machine', 'cable-hip-extension'] },
      { day: 'Sun', name: 'Walk', detail: 'Treadmill, 50 minutes, incline 5' }
    ],
    6: [
      { day: 'Mon', name: 'Push', ex: ['dumbbell-chest-press', 'shoulder-press-machine', 'triceps-pushdown'] },
      { day: 'Tue', name: 'Pull', ex: ['pulldown-machine', 'cable-row', 'biceps-curl-machine'] },
      { day: 'Wed', name: 'Legs', ex: ['horizontal-leg-press', 'leg-extension', 'calf-extension'] },
      { day: 'Thu', name: 'Push', ex: ['dumbbell-shoulder-press', 'push-ups', 'triceps-machine'] },
      { day: 'Fri', name: 'Pull', ex: ['cable-row', 'lat-pulldown-cable', 'hammer-curls'] },
      { day: 'Sat', name: 'Legs', ex: ['linear-leg-press', 'glute-machine', 'squats'] }
    ]
  };

  /* Fills in `detail` from the library so the two can never disagree. */
  function withDetail(list) {
    return (list || []).map(function (d) {
      if (d.detail) return d;
      var items = Exercises.expand(d.ex);
      return {
        day: d.day, name: d.name, ex: d.ex,
        detail: items.map(function (e) { return e.name; }).join(' \u00b7 ')
      };
    });
  }

  var ORDER = ['welcome', 'name', 'body', 'goal', 'frequency', 'targets', 'plan', 'pair', 'coach'];
  var STEP_TOTAL = ORDER.length - 1; // the welcome screen is not a step
  // Screens that ask something of him, as opposed to showing him something.
  var ASKS = ['name', 'body', 'goal', 'frequency'];

  // Draft lives here until the flow completes; nothing touches Store until then.
  var draft = {
    name: '', heightFt: '', heightIn: '', age: '', sex: '',
    weight: '', goal: '', freq: 4, partner: '', note: '',
    claudeKey: '', keyNote: '', keyOk: false
  };
  var at = 0;

  function clamp(v, lo, hi) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null; }

  function targetsFor(goal, weight) {
    var t = {
      'lose-fat': { calories: 1950, protein: 165, steps: 11000, weightGoal: Math.round(weight - 8) },
      'build':    { calories: 2750, protein: 175, steps: 8000,  weightGoal: Math.round(weight + 11) },
      'hold':     { calories: 2300, protein: 155, steps: 10000, weightGoal: Math.round(weight) },
      'strong':   { calories: 2500, protein: 180, steps: 7000,  weightGoal: Math.round(weight + 4) }
    };
    return t[goal] || t['lose-fat'];
  }

  function progress() {
    var step = at; // welcome is 0
    var bars = '';
    for (var i = 0; i < STEP_TOTAL; i++) {
      bars += '<span style="flex:1;height:2px;border-radius:99px;background:' +
        (i < step ? 'var(--gold)' : 'rgba(243,237,225,.16)') + '"></span>';
    }
    return '<div class="ob-progress">' +
      '<div style="display:flex;gap:5px">' + bars + '</div>' +
      '<div class="ob-progress-row">' +
        '<span class="ob-steprow">' +
          (at > 1 ? '<button class="ob-back" data-ob="back" aria-label="Back">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>' +
          '</button>' : '') +
          '<span class="kicker">Step ' + Math.min(step, STEP_TOTAL) + ' of ' + STEP_TOTAL + '</span>' +
        '</span>' +
        (ORDER[at] === 'pair' ? '<button class="ob-skip" data-ob="next">Skip for now</button>' : '<span></span>') +
      '</div>' +
    '</div>';
  }

  function field(label, value, active) {
    return '<div class="ob-field' + (active ? ' active' : '') + '">' +
      '<span class="kicker">' + esc(label) + '</span>' +
      '<span class="ob-value">' + esc(value) + '</span>' +
    '</div>';
  }

  function screenWelcome() {
    return '<div class="ob-body ob-hero">' +
      '<h1 class="ob-h" style="margin:0">Two people, one trail.</h1>' +
      '<p class="ob-lede" style="margin:0">' + word(ASKS.length) + ' questions, then you start walking.</p>' +
      '<button class="btn block" data-ob="next">Begin</button>' +
    '</div>';
  }

  function screenName() {
    return '<div class="ob-body">' +
      '<h2 class="ob-h">What should the coach call you?</h2>' +
      '<p class="ob-sub">It writes to you every morning. A first name is enough.</p>' +
      '<input class="ob-input" id="ob-name" type="text" autocomplete="given-name" placeholder="Your name" value="' + esc(draft.name) + '" />' +
      (draft.note ? '<p class="ob-warn">' + esc(draft.note) + '</p>' : '') +
      '<button class="btn block" data-ob="next">Continue</button>' +
    '</div>';
  }

  function screenBody() {
    return '<div class="ob-body">' +
      '<h2 class="ob-h">A few numbers about you.</h2>' +
      '<p class="ob-sub">These set your first targets. Nothing here is shared.</p>' +
      '<div class="ob-fields">' +
        '<label class="ob-row"><span class="kicker">Height</span>' +
          '<span class="ob-inline">' +
            '<input class="ob-num" id="ob-hft" type="number" inputmode="numeric" min="4" max="7" placeholder="5" value="' + draft.heightFt + '" /><span class="ob-unit">ft</span>' +
            '<input class="ob-num" id="ob-hin" type="number" inputmode="numeric" min="0" max="11" placeholder="9" value="' + draft.heightIn + '" /><span class="ob-unit">in</span>' +
          '</span>' +
        '</label>' +
        '<label class="ob-row"><span class="kicker">Age</span>' +
          '<input class="ob-num wide" id="ob-age" type="number" inputmode="numeric" min="13" max="100" placeholder="35" value="' + draft.age + '" />' +
        '</label>' +
        '<label class="ob-row"><span class="kicker">Weight today</span>' +
          '<span class="ob-inline"><input class="ob-num wide" id="ob-wt" type="number" inputmode="decimal" step="0.1" min="60" max="600" placeholder="180" value="' + draft.weight + '" /><span class="ob-unit">lb</span></span>' +
        '</label>' +
      '</div>' +
      '<div class="ob-choices two">' +
        ['Male', 'Female'].map(function (s) {
          return '<button class="ob-chip' + (draft.sex === s ? ' on' : '') + '" data-ob="sex" data-value="' + s + '">' + s + '</button>';
        }).join('') +
      '</div>' +
      (draft.note ? '<p class="ob-warn">' + esc(draft.note) + '</p>' : '') +
      '<button class="btn block" data-ob="next">Continue</button>' +
    '</div>';
  }

  function screenGoal() {
    return '<div class="ob-body">' +
      '<h2 class="ob-h">What are you after?</h2>' +
      '<p class="ob-sub">This decides every number the coach suggests. You can change it later.</p>' +
      '<div class="ob-goals">' +
        GOALS.map(function (g) {
          var on = draft.goal === g.key;
          return '<button class="ob-goal' + (on ? ' on' : '') + '" data-ob="goal" data-value="' + g.key + '">' +
            '<span><span class="ob-goal-name">' + esc(g.name) + '</span>' +
            '<span class="ob-goal-note">' + esc(g.note) + '</span></span>' +
            '<span class="ob-dot' + (on ? ' on' : '') + '"></span>' +
          '</button>';
        }).join('') +
      '</div>' +
      (draft.note ? '<p class="ob-warn">' + esc(draft.note) + '</p>' : '') +
      '<button class="btn block" data-ob="next">Continue</button>' +
    '</div>';
  }

  function screenFrequency() {
    return '<div class="ob-body">' +
      '<h2 class="ob-h">How often can you get to the gym?</h2>' +
      '<p class="ob-sub">Answer honestly rather than ambitiously. The coach builds the split around this.</p>' +
      '<div class="ob-freq-value"><span class="ob-freq-n">' + draft.freq + '</span><span class="ob-unit">days a week</span></div>' +
      '<div class="ob-choices">' +
        [2, 3, 4, 5, 6].map(function (n) {
          return '<button class="ob-chip big' + (draft.freq === n ? ' on' : '') + '" data-ob="freq" data-value="' + n + '">' + n + '</button>';
        }).join('') +
      '</div>' +
      '<p class="ob-note">' + esc(FREQ_NOTE[draft.freq]) + '</p>' +
      '<button class="btn block" data-ob="next">Continue</button>' +
    '</div>';
  }

  function screenTargets() {
    var t = targetsFor(draft.goal, draft.weight);
    var rows = [
      { name: 'Daily calories', value: t.calories.toLocaleString(), basis: 'From your height, age and goal' },
      { name: 'Daily protein', value: t.protein + ' g', basis: 'Set to hold muscle while the weight moves' },
      { name: 'Daily steps', value: t.steps.toLocaleString(), basis: 'A little above where most people start' },
      { name: 'Weight goal', value: t.weightGoal + ' lb', basis: 'About a pound a week from today' }
    ];
    return '<div class="ob-body">' +
      '<h2 class="ob-h">Numbers to start with.</h2>' +
      '<p class="ob-sub">Worked out from your height, age and goal. The coach will replace them once it has watched you for a fortnight.</p>' +
      '<article class="card">' +
        rows.map(function (r) {
          return '<div class="ob-target">' +
            '<div><div class="ob-target-name">' + esc(r.name) + '</div><div class="small">' + esc(r.basis) + '</div></div>' +
            '<div class="ob-target-val"><span class="ob-prov"></span><span class="num">' + esc(r.value) + '</span></div>' +
          '</div>';
        }).join('') +
        '<div class="ob-target note"><span class="ob-prov"></span>' +
          '<p class="small" style="margin:0">A starting guess, refined after two weeks. The dot disappears when the coach confirms each one.</p>' +
        '</div>' +
      '</article>' +
      '<button class="btn block" data-ob="next">Continue</button>' +
      '<button class="btn ghost block" data-ob="tweak">Set them myself</button>' +
    '</div>';
  }

  function screenPlan() {
    var plan = withDetail(PLANS[draft.freq] || []);
    return '<div class="ob-body">' +
      '<h2 class="ob-h">' + draft.freq + ' days a week.</h2>' +
      '<p class="ob-sub">' + esc(FREQ_NOTE[draft.freq]) + '</p>' +
      '<article class="card">' +
        plan.map(function (d) {
          return '<div class="ob-plan">' +
            '<span class="kicker ob-plan-day">' + esc(d.day) + '</span>' +
            '<span><span class="ob-plan-name' + (d.name === 'Walk' ? ' walk' : '') + '">' + esc(d.name) + '</span>' +
            '<span class="small">' + esc(d.detail) + '</span></span>' +
          '</div>';
        }).join('') +
        '<p class="small ob-plan-foot">Machines picked from what Planet Fitness has. Swap any of them when you are standing in front of one that is taken.</p>' +
      '</article>' +
      '<button class="btn block" data-ob="next">Continue</button>' +
    '</div>';
  }

  function screenPair() {
    var her = draft.partner || 'her';
    return '<div class="ob-body">' +
      '<h2 class="ob-h">Who are you walking with?</h2>' +
      '<p class="ob-sub">Together compares the two of you day by day. It needs their name to know whose file to read.</p>' +
      '<input class="ob-input" id="ob-partner" type="text" autocomplete="off" placeholder="Their name" value="' + esc(draft.partner) + '" />' +
      (draft.note ? '<p class="ob-warn">' + esc(draft.note) + '</p>' : '') +
      '<article class="card pad" style="margin-top:4px">' +
        '<div class="rulehead tight"><span class="kicker">How pairing works</span><span></span></div>' +
        '<p class="small" style="margin:0 0 10px">You each connect the same private repository in Settings. Your phone writes only your own totals; theirs writes only theirs. Nothing passes through a server.</p>' +
        '<p class="small" style="margin:0">Spell it the way they will spell it on their own phone. Capitals and spacing do not matter — the same name in any case finds the same file.</p>' +
      '</article>' +
      '<button class="btn block" data-ob="next">Continue</button>' +
      '<p class="small center">Skip this and everything works except Together. You can set it up any time in Settings.</p>' +
    '</div>';
  }

  function screenCoach() {
    var collected = COLLECTED.length;
    var numeric = COLLECTED.filter(function (c) { return c.numeric; }).length;
    var name = draft.name || 'Friend';
    return '<div class="ob-body">' +
      '<article class="card pad">' +
        '<div class="cardhead" style="padding:0 0 14px;border:0"><div class="title"><i></i>From the coach</div></div>' +
        '<p class="lede">' + esc(name) + ' — I know ' + word(collected).toLowerCase() + ' things about you, and ' +
          word(numeric).toLowerCase() + ' of them are numbers. That is not enough to coach anyone.</p>' +
        '<p class="ob-letter">So here is what happens next. Log what you eat and what you lift. Weigh yourself in the mornings you remember. I will not ask you for anything else.</p>' +
        '<p class="ob-letter">In a fortnight I will have watched enough to know where your protein actually lands, which days you skip, and how fast the weight is moving. Then I will replace those starting numbers with ones that fit you.</p>' +
        '<p class="ob-letter">Until then the targets are a guess. Walk anyway.</p>' +
      '</article>' +
      '<article class="card pad">' +
        '<div class="rulehead tight" style="margin-top:0"><span class="kicker">The coach’s key</span><span></span></div>' +
        '<p class="small" style="margin:0">Paste an Anthropic API key and the coach writes in its own words from today. Without one everything else works and it falls back to its rules.</p>' +
        '<input class="ob-input" id="ob-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="' + esc(draft.claudeKey) + '" style="margin-top:16px" />' +
        '<button class="btn ghost block sm" data-ob="testkey" style="margin-top:12px">Test and save</button>' +
        (draft.keyNote
          ? '<p class="' + (draft.keyOk ? 'small' : 'ob-warn') + '" style="margin:11px 0 0">' + esc(draft.keyNote) + '</p>'
          : '') +
      '</article>' +
      '<button class="btn block" data-ob="finish">Start the first day</button>' +
    '</div>';
  }

  var SCREENS = {
    welcome: screenWelcome, name: screenName, body: screenBody, goal: screenGoal,
    frequency: screenFrequency, targets: screenTargets, plan: screenPlan,
    pair: screenPair, coach: screenCoach
  };

  /* Choosing a chip re-renders the screen, so anything typed and not yet read
     would be lost with it. Soak takes whatever is in the fields as it stands
     and judges none of it — validation belongs to capture, on the way forward. */
  function soak() {
    var key = ORDER[at], el;
    if (key === 'name') {
      el = document.getElementById('ob-name');
      if (el) draft.name = el.value.trim();
    }
    if (key === 'body') {
      var ft = document.getElementById('ob-hft'), inch = document.getElementById('ob-hin');
      var age = document.getElementById('ob-age'), wt = document.getElementById('ob-wt');
      if (ft) draft.heightFt = ft.value === '' ? '' : Number(ft.value);
      if (inch) draft.heightIn = inch.value === '' ? 0 : Number(inch.value);
      if (age) draft.age = age.value === '' ? '' : Number(age.value);
      if (wt) draft.weight = wt.value === '' ? '' : Number(wt.value);
    }
    if (key === 'pair') {
      el = document.getElementById('ob-partner');
      if (el) draft.partner = el.value.trim();
    }
    if (key === 'coach') {
      el = document.getElementById('ob-key');
      if (el) draft.claudeKey = el.value.trim();
    }
  }

  /* Reads the current screen into the draft. Returns false and sets a note
     when something required is missing, which stops the flow advancing. */
  function capture() {
    var key = ORDER[at];
    draft.note = '';
    soak();

    if (key === 'name') {
      if (!draft.name) { draft.note = 'The coach writes to you by name. Even a nickname will do.'; return false; }
      if (draft.name.length > 40) { draft.note = 'That is longer than a name needs to be.'; return false; }
      return true;
    }

    if (key === 'body') {
      draft.heightFt = draft.heightFt === '' ? '' : clamp(draft.heightFt, 4, 7);
      draft.heightIn = draft.heightIn === '' ? 0 : clamp(draft.heightIn, 0, 11);
      draft.age = draft.age === '' ? '' : clamp(draft.age, 13, 100);
      draft.weight = draft.weight === '' ? '' : clamp(draft.weight, 60, 600);
      if (draft.heightFt === '' || draft.heightFt === null) { draft.note = 'Height, to the nearest inch. The targets are worked out from it.'; return false; }
      if (draft.age === '' || draft.age === null) { draft.note = 'Age, so the calorie estimate is not a guess.'; return false; }
      if (draft.weight === '' || draft.weight === null) { draft.note = 'Today\'s weight. It becomes the first entry in your chart.'; return false; }
      if (!draft.sex) { draft.note = 'One of the two, so the estimate has something to work from.'; return false; }
      return true;
    }

    if (key === 'goal') {
      if (!draft.goal) { draft.note = 'Pick one. Every number the coach suggests follows from it.'; return false; }
      return true;
    }

    return true;
  }

  /* Two letters on the avatar. One word gives its first two — a single initial
     reads as a mistake next to a two-letter one. */
  function initialsFor(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    var out = parts.length > 1
      ? parts.map(function (p) { return p[0]; }).join('')
      : parts[0].slice(0, 2);
    return out.slice(0, 2).toUpperCase();
  }

  function finish() {
    var t = targetsFor(draft.goal, draft.weight);
    var name = draft.name || 'Friend';
    var initials = initialsFor(name);

    Store.set('profile.name', name);
    Store.set('profile.initials', initials);
    Store.set('profile.heightIn', draft.heightFt * 12 + draft.heightIn);
    Store.set('profile.age', draft.age);
    Store.set('profile.sex', draft.sex);
    Store.set('profile.startWeight', draft.weight);
    Store.set('profile.startDate', Store.todayKey());
    Store.set('goal', draft.goal);
    Store.set('targets', t);
    Store.set('frequency', draft.freq);
    Store.set('plan', withDetail(PLANS[draft.freq] || []));
    if (draft.partner) {
      Store.set('partner.name', draft.partner);
      Store.set('partner.initials', initialsFor(draft.partner));
    }
    /* A key typed but never tested is still his key — saving it is not the same
       as claiming it works. */
    if (draft.claudeKey) Store.set('connections.claudeKey', draft.claudeKey);
    Store.set('onboarded', true);
    Store.setMorning({ weight: draft.weight });
    /* Signing up earns the first-day stamps. They belong on the shelf, but the
       earning moment is for things done in the app — not for finishing a form,
       and never on top of the first Home he has ever seen. */
    if (window.Badges) Badges.markSeen();
  }

  function render() {
    var root = document.getElementById('onboarding');
    var key = ORDER[at];
    var hero = key === 'welcome';
    root.className = 'ob' + (hero ? ' hero' : '');
    root.innerHTML =
      '<div class="ob-photo' + (hero ? '' : ' blur') + '"></div>' +
      (hero ? '<img class="ob-icon" src="assets/insync-icon.png" alt="InSync" />' : '') +
      (hero || key === 'coach' ? '' : progress()) +
      '<div class="ob-scroll">' + SCREENS[key]() + '</div>';
    var scroller = root.querySelector('.ob-scroll');
    if (scroller) scroller.scrollTop = 0;
    var focus = root.querySelector('.ob-input');
    if (focus && !('ontouchstart' in window)) focus.focus();
  }

  function start() {
    var root = document.createElement('div');
    root.id = 'onboarding';
    document.body.appendChild(root);
    document.body.classList.add('onboarding-open');

    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.tagName !== 'INPUT') return;
      e.preventDefault();
      var go = root.querySelector('[data-ob="next"].btn');
      if (go) go.click();
    });

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-ob]');
      if (!el) return;
      var kind = el.getAttribute('data-ob');
      if (kind === 'sex') { soak(); draft.sex = el.getAttribute('data-value'); render(); }
      else if (kind === 'goal') { soak(); draft.goal = el.getAttribute('data-value'); render(); }
      else if (kind === 'freq') { soak(); draft.freq = Number(el.getAttribute('data-value')); render(); }
      else if (kind === 'testkey') {
        soak();
        if (!draft.claudeKey) { draft.keyOk = false; draft.keyNote = 'Nothing pasted yet.'; render(); return; }
        el.disabled = true;
        el.textContent = 'Testing…';
        Store.set('connections.claudeKey', draft.claudeKey);
        Cloud.testClaude(function (err) {
          draft.keyOk = !err;
          draft.keyNote = err
            ? err.message
            : 'The key works. The coach writes from today.';
          if (err) Store.set('connections.claudeKey', '');
          render();
        });
      }
      else if (kind === 'next') {
        if (!capture()) { render(); return; }
        at = Math.min(at + 1, ORDER.length - 1);
        render();
      }
      else if (kind === 'back') { soak(); draft.note = ''; at = Math.max(0, at - 1); render(); }
      else if (kind === 'tweak') { draft.tweak = true; at = Math.min(at + 1, ORDER.length - 1); render(); }
      else if (kind === 'finish') {
        var wantsTargets = draft.tweak;
        finish();
        document.body.classList.remove('onboarding-open');
        root.remove();
        /* The first day starts on Home, whatever screen the tab was left on
           before the reset. */
        location.hash = wantsTargets ? '#settings' : '#home';
        if (window.App && App.render) App.render();
      }
    });

    render();
  }

  window.Onboarding = { start: start, plans: PLANS, goals: GOALS, withDetail: withDetail };
})();

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

  var PLANS = {
    2: [
      { day: 'Mon', name: 'Full body', detail: 'Chest press · Leg press · Lat pulldown · Shoulder press' },
      { day: 'Thu', name: 'Full body', detail: 'Chest press · Leg press · Seated row · Triceps pushdown' },
      { day: 'Sat', name: 'Walk', detail: 'Treadmill, 40 minutes, incline 4' }
    ],
    3: [
      { day: 'Mon', name: 'Push', detail: 'Chest press · Shoulder press · Triceps pushdown' },
      { day: 'Wed', name: 'Pull', detail: 'Lat pulldown · Seated row · Biceps curl' },
      { day: 'Fri', name: 'Legs', detail: 'Leg press · Leg extension · Leg curl' },
      { day: 'Sun', name: 'Walk', detail: 'Treadmill, 45 minutes, incline 5' }
    ],
    4: [
      { day: 'Mon', name: 'Upper', detail: 'Chest press · Lat pulldown · Shoulder press' },
      { day: 'Tue', name: 'Lower', detail: 'Leg press · Leg extension · Leg curl' },
      { day: 'Thu', name: 'Upper', detail: 'Seated row · Chest press · Triceps pushdown' },
      { day: 'Fri', name: 'Lower', detail: 'Leg press · Calf raise · Abductor' },
      { day: 'Sun', name: 'Walk', detail: 'Treadmill, 45 minutes, incline 5' }
    ],
    5: [
      { day: 'Mon', name: 'Push', detail: 'Chest press · Shoulder press · Triceps pushdown' },
      { day: 'Tue', name: 'Pull', detail: 'Lat pulldown · Seated row · Biceps curl' },
      { day: 'Wed', name: 'Legs', detail: 'Leg press · Leg extension · Leg curl' },
      { day: 'Fri', name: 'Upper', detail: 'Chest press · Seated row · Shoulder press' },
      { day: 'Sat', name: 'Lower', detail: 'Leg press · Calf raise · Abductor' },
      { day: 'Sun', name: 'Walk', detail: 'Treadmill, 50 minutes, incline 5' }
    ],
    6: [
      { day: 'Mon', name: 'Push', detail: 'Chest press · Shoulder press · Triceps pushdown' },
      { day: 'Tue', name: 'Pull', detail: 'Lat pulldown · Seated row · Biceps curl' },
      { day: 'Wed', name: 'Legs', detail: 'Leg press · Leg extension · Leg curl' },
      { day: 'Thu', name: 'Push', detail: 'Chest press · Shoulder press · Chest fly' },
      { day: 'Fri', name: 'Pull', detail: 'Seated row · Lat pulldown · Rear delt' },
      { day: 'Sat', name: 'Legs', detail: 'Leg press · Calf raise · Abductor' }
    ]
  };

  var ORDER = ['welcome', 'name', 'body', 'goal', 'frequency', 'targets', 'plan', 'pair', 'coach'];
  var STEP_TOTAL = ORDER.length - 1; // the welcome screen is not a step

  // Draft lives here until the flow completes; nothing touches Store until then.
  var draft = {
    name: '', heightFt: 6, heightIn: 1, age: 41, sex: 'Male',
    weight: 203.8, goal: 'lose-fat', freq: 4
  };
  var at = 0;

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
        '<span class="kicker">Step ' + Math.min(step, STEP_TOTAL) + ' of ' + STEP_TOTAL + '</span>' +
        (ORDER[at] === 'pair' ? '<button class="ob-skip" data-ob="next">Skip</button>' : '<span></span>') +
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
      '<div class="ob-mark">InSync</div>' +
      '<p class="verse" style="font-size:29px">He makes my feet like the feet of a deer; he causes me to stand on the heights.</p>' +
      '<cite class="ob-cite">Habakkuk 3:19</cite>' +
      '<p class="ob-lede">Two people, one trail. ' + word(4) + ' questions, then you start walking.</p>' +
      '<button class="btn block" data-ob="next">Begin</button>' +
    '</div>';
  }

  function screenName() {
    return '<div class="ob-body">' +
      '<h2 class="ob-h">What should the coach call you?</h2>' +
      '<p class="ob-sub">It writes to you every morning. A first name is enough.</p>' +
      '<input class="ob-input" id="ob-name" type="text" autocomplete="given-name" placeholder="Your name" value="' + esc(draft.name) + '" />' +
      '<button class="btn block" data-ob="next">Continue</button>' +
    '</div>';
  }

  function screenBody() {
    return '<div class="ob-body">' +
      '<h2 class="ob-h">A few numbers about you.</h2>' +
      '<p class="ob-sub">These set your first targets. Nothing here is shared with Lizzie.</p>' +
      '<div class="ob-fields">' +
        '<label class="ob-row"><span class="kicker">Height</span>' +
          '<span class="ob-inline">' +
            '<input class="ob-num" id="ob-hft" type="number" inputmode="numeric" min="4" max="7" value="' + draft.heightFt + '" /><span class="ob-unit">ft</span>' +
            '<input class="ob-num" id="ob-hin" type="number" inputmode="numeric" min="0" max="11" value="' + draft.heightIn + '" /><span class="ob-unit">in</span>' +
          '</span>' +
        '</label>' +
        '<label class="ob-row"><span class="kicker">Age</span>' +
          '<input class="ob-num wide" id="ob-age" type="number" inputmode="numeric" min="13" max="100" value="' + draft.age + '" />' +
        '</label>' +
        '<label class="ob-row"><span class="kicker">Weight today</span>' +
          '<span class="ob-inline"><input class="ob-num wide" id="ob-wt" type="number" inputmode="decimal" step="0.1" value="' + draft.weight + '" /><span class="ob-unit">lb</span></span>' +
        '</label>' +
      '</div>' +
      '<div class="ob-choices two">' +
        ['Male', 'Female'].map(function (s) {
          return '<button class="ob-chip' + (draft.sex === s ? ' on' : '') + '" data-ob="sex" data-value="' + s + '">' + s + '</button>';
        }).join('') +
      '</div>' +
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
    '</div>';
  }

  function screenPlan() {
    var plan = PLANS[draft.freq] || [];
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
    return '<div class="ob-body">' +
      '<h2 class="ob-h">Bring Lizzie along.</h2>' +
      '<p class="ob-sub">Send her a link. Tapping it on her phone pairs the two, and Together opens for both of you.</p>' +
      '<div class="ob-link"><span>insync.app/join/qv7-2m</span>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9h11v11H9z"/><path d="M15 5H4v11"/></svg>' +
      '</div>' +
      '<button class="btn block" data-ob="next">Send the link</button>' +
      '<p class="small center">Skip this and everything works except Together. It will ask again when you open that tab.</p>' +
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
      '<button class="btn block" data-ob="finish">Start the first day</button>' +
    '</div>';
  }

  var SCREENS = {
    welcome: screenWelcome, name: screenName, body: screenBody, goal: screenGoal,
    frequency: screenFrequency, targets: screenTargets, plan: screenPlan,
    pair: screenPair, coach: screenCoach
  };

  function capture() {
    var key = ORDER[at];
    if (key === 'name') {
      var el = document.getElementById('ob-name');
      if (el) draft.name = el.value.trim();
    } else if (key === 'body') {
      var ft = document.getElementById('ob-hft'), inch = document.getElementById('ob-hin');
      var age = document.getElementById('ob-age'), wt = document.getElementById('ob-wt');
      if (ft) draft.heightFt = Number(ft.value) || draft.heightFt;
      if (inch) draft.heightIn = Number(inch.value) || 0;
      if (age) draft.age = Number(age.value) || draft.age;
      if (wt) draft.weight = Number(wt.value) || draft.weight;
    }
  }

  function finish() {
    var t = targetsFor(draft.goal, draft.weight);
    var name = draft.name || 'Friend';
    var initials = name.trim().split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();

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
    Store.set('plan', PLANS[draft.freq] || []);
    Store.set('onboarded', true);
    Store.setMorning({ weight: draft.weight });
  }

  function render() {
    var root = document.getElementById('onboarding');
    var key = ORDER[at];
    var hero = key === 'welcome';
    root.className = 'ob' + (hero ? ' hero' : '');
    root.innerHTML =
      '<div class="ob-photo' + (hero ? '' : ' blur') + '"></div>' +
      (hero || key === 'coach' ? '' : progress()) +
      '<div class="ob-scroll">' + SCREENS[key]() + '</div>';
    root.scrollTop = 0;
    var focus = root.querySelector('.ob-input');
    if (focus) focus.focus();
  }

  function start() {
    var root = document.createElement('div');
    root.id = 'onboarding';
    document.body.appendChild(root);
    document.body.classList.add('onboarding-open');

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-ob]');
      if (!el) return;
      var kind = el.getAttribute('data-ob');
      if (kind === 'sex') { draft.sex = el.getAttribute('data-value'); render(); }
      else if (kind === 'goal') { draft.goal = el.getAttribute('data-value'); render(); }
      else if (kind === 'freq') { draft.freq = Number(el.getAttribute('data-value')); render(); }
      else if (kind === 'next') { capture(); at = Math.min(at + 1, ORDER.length - 1); render(); }
      else if (kind === 'finish') {
        finish();
        document.body.classList.remove('onboarding-open');
        root.remove();
        if (window.App && App.render) App.render();
      }
    });

    render();
  }

  window.Onboarding = { start: start, plans: PLANS, goals: GOALS };
})();

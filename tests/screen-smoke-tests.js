'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

class LocalStorageMock {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const context = {
  console,
  localStorage: new LocalStorageMock(),
  location: {
    hash: '#home',
    hostname: 'example.test',
    pathname: '/',
    protocol: 'https:'
  },
  navigator: {},
  window: null,
  CustomEvent: function CustomEvent() {},
  Date,
  Math,
  JSON,
  String,
  Number,
  Object,
  Array,
  RegExp,
  Intl,
  parseFloat,
  parseInt,
  isFinite,
  isNaN,
  setTimeout,
  clearTimeout,
  fetch: () => Promise.reject(new Error('offline')),
  btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
  atob: (value) => Buffer.from(value, 'base64').toString('binary')
};

context.window = context;
context.window.dispatchEvent = () => {};
vm.createContext(context);

[
  'domains.js',
  'contracts.js',
  'journeys.js',
  'theme.js',
  'rewards.js',
  'camp.js',
  'store.js',
  'ui.js',
  'exercises.js',
  'insights.js',
  'onboarding.js',
  'cloud.js',
  'foods.js',
  'badges.js',
  'screens.js'
].forEach((file) => {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
});

const Store = context.Store;
Store.set('onboarded', true);
Store.setProfileName('Robert');
Store.setPartnerName('Partner');

let passed = 0;
let failed = 0;

function check(screenName, hash, allowEmpty = false) {
  context.location.hash = `#${hash}`;
  try {
    const output = context.Screens[screenName]();
    if (typeof output !== 'string' || (!allowEmpty && output.length < 20)) {
      throw new Error(`unexpected output length ${output && output.length}`);
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${screenName} #${hash}`);
    console.error(error.stack || error.message || error);
  }
}

Object.entries({
  home: 'home',
  journey: 'journey',
  coach: 'coach',
  nutrition: 'nutrition',
  train: 'train',
  together: 'together',
  settings: 'settings',
  body: 'body',
  photos: 'photos',
  capture: 'capture',
  record: 'record/unknown',
  workouts: 'workouts',
  cardio: 'cardio',
  records: 'records',
  badges: 'badges',
  reflection: 'reflection',
  trends: 'trends',
  planner: 'planner',
  plannedMeal: 'planned-meal/2099-01-01/Breakfast',
  cookbook: 'cookbook',
  history: 'history',
  calendar: 'calendar',
  dayHistory: `day-history/${Store.todayKey()}`,
  weeklyReview: 'weekly-review',
  exercises: 'exercises',
  exercise: 'exercise/dumbbell-chest-press',
  trainDay: 'trainday',
  notifications: 'notifications',
  meal: 'meal/unknown',
  handshake: 'handshake'
}).forEach(([screenName, hash]) => check(screenName, hash, screenName === 'meal'));

// A walk day counts toward the weekly training frequency through its real
// step requirement; it does not need a fake workout record.
const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(Store.todayKey()+'T12:00:00').getDay()];
Store.set('plan',[{day:dow,name:'Walk',detail:'Treadmill, 45 minutes'}]);Store.set('planMeta',{writtenBy:'coach',weekOf:Store.weekStart(Store.todayKey()),note:''});Store.setSteps(Store.state().targets.steps);
context.location.hash='#train';const walkHtml=context.Screens.train();
if (!walkHtml.includes('1 of 4')) { failed += 1; console.error('FAIL completed walk day is not counted toward the weekly training frequency'); } else passed += 1;
Store.set('plan',[]);Store.set('planMeta',{});Store.setSteps(0);

// The day-level walk remains available even when today is a recovery day, but only after opening the day.
context.location.hash='#trainday/'+Store.todayKey(); const recoveryWalkHtml=context.Screens.trainDay();
if (!recoveryWalkHtml.includes('Walk timer') || !recoveryWalkHtml.includes('data-action="walk-start"')) {
  failed += 1; console.error('FAIL recovery day detail does not expose the live walk timer');
} else passed += 1;

// Past training days are editable history, not live timers; future days are inert.
const pastWalkKey=Store.shift(Store.todayKey(),-1); context.location.hash='#trainday/'+pastWalkKey; const pastWalkHtml=context.Screens.trainDay();
if (!pastWalkHtml.includes('Past days cannot run a live timer') || !pastWalkHtml.includes('data-action="walk-manual-save"') || pastWalkHtml.includes('data-action="walk-start"')) {
  failed += 1; console.error('FAIL past training day does not use manual walk correction safely');
} else passed += 1;
const futureWalkKey=Store.shift(Store.todayKey(),1); context.location.hash='#trainday/'+futureWalkKey; const futureWalkHtml=context.Screens.trainDay();
if (!futureWalkHtml.includes('UPCOMING') || futureWalkHtml.includes('data-action="walk-start"')) {
  failed += 1; console.error('FAIL future training day exposes a live walk timer');
} else passed += 1;

// The training strip is locked to the current Monday–Sunday calendar week.
context.location.hash='#train';
const calendarWeekHtml=context.Screens.train();
const trainWeekStart=Store.weekStart(Store.todayKey()), trainWeekEnd=Store.shift(trainWeekStart,6);
if (!calendarWeekHtml.includes('data-route="trainday/'+trainWeekStart+'"') || !calendarWeekHtml.includes('data-route="trainday/'+trainWeekEnd+'"')) {
  failed += 1; console.error('FAIL training strip does not render the real Monday–Sunday calendar week');
} else passed += 1;

// Real lift history is surfaced inside the selected training day as a next-session progression cue.
const priorA=Store.shift(Store.todayKey(),-14), priorB=Store.shift(Store.todayKey(),-7);
Store.day(priorA).workouts=[{name:'Chest',minutes:30,exercises:[{name:'Dumbbell chest press',weight:50,reps:10,sets:3}]}];
Store.day(priorB).workouts=[{name:'Chest',minutes:30,exercises:[{name:'Dumbbell chest press',weight:50,reps:10,sets:3}]}];
Store.save();
Store.set('plan',[{day:dow,name:'Chest',detail:'',ex:['dumbbell-chest-press']}]);
Store.set('planMeta',{writtenBy:'coach',weekOf:Store.weekStart(Store.todayKey()),note:''});
context.location.hash='#trainday/'+Store.todayKey();
const progressionHtml=context.Screens.trainDay();
if (!progressionHtml.includes('Next: Ready to add load')) { failed += 1; console.error('FAIL selected training day does not show the derived next-session progression cue'); } else passed += 1;
Store.set('plan',[]);Store.set('planMeta',{});

const plannedDate = Store.todayKey();
const plannedKey = `${plannedDate}|Dinner`;
Store.set('mealPlan', {
  [plannedKey]: {
    date: plannedDate, slot: 'Dinner', name: 'Chicken rice bowl', kcal: 620, protein: 48, carbs: 70, fat: 16,
    servings: 1, prepMinutes: 25,
    items: [{ name: 'Chicken breast', weight: '6 oz' }, { name: 'Rice', weight: '1 cup' }],
    instructions: ['Cook the rice.', 'Cook the chicken.', 'Assemble the bowl.'], source: 'coach'
  }
});
check('plannedMeal', `planned-meal/${plannedDate}/Dinner`);

context.location.hash = '#nutrition';
const nutritionHtml = context.Screens.nutrition();
const nutritionSlots = ['Breakfast','Lunch','Dinner','Snack'];
if (!nutritionSlots.every(slot => nutritionHtml.includes(`data-slot="${slot}"`))) {
  failed += 1; console.error('FAIL nutrition does not expose all four explicit daily meal slots');
} else passed += 1;
context.location.hash = '#planner';
const plannerHtml = context.Screens.planner();
const slotCount = (plannerHtml.match(/class="planslot/g) || []).length;
if (slotCount !== 28 || !/Snack/.test(plannerHtml)) {
  failed += 1; console.error(`FAIL planner expected 28 daily slots, got ${slotCount}`);
} else passed += 1;

const workout = context.Exercises.expand([
  'dumbbell-chest-press',
  'pulldown-machine',
  'shoulder-press-machine'
]);
Store.startSession('Upper', workout);
check('session', 'session');
context.location.hash='#session';
const walkReadyHtml=context.Screens.session();
if (!walkReadyHtml.includes('Workout walk') || !walkReadyHtml.includes('data-action="walk-start"') || walkReadyHtml.indexOf('Workout walk') > walkReadyHtml.indexOf('Dumbbell chest press')) {
  failed += 1; console.error('FAIL workout walk is not rendered above the lifting movements');
} else passed += 1;
Store.startSessionWalk();
context.location.hash='#session';
const walkLiveHtml=context.Screens.session();
if (!walkLiveHtml.includes('data-action="walk-stop"') || !walkLiveHtml.includes('walk-state live')) {
  failed += 1; console.error('FAIL live workout walk does not render its stop state');
} else passed += 1;
Store.session().walk.startedAt=Date.now()-61000;Store.save();Store.stopSessionWalk();
context.location.hash='#session';
const walkStoppedHtml=context.Screens.session();
if (!walkStoppedHtml.includes('data-walk-pace') || !walkStoppedHtml.includes('data-walk-elevation')) {
  failed += 1; console.error('FAIL stopped workout walk does not render pace/elevation fields');
} else passed += 1;
check('swapExercise', 'swap-exercise/0');
check('swapExercise', 'swap-exercise/0/occupied');
Store.logSet(0, { weight: 50, reps: 10 });
const completed = Store.finishSession();
Store.set('lastFinish', completed);
check('sessionDone', 'session-done');
check('record', `record/${encodeURIComponent('Dumbbell chest press')}`);
check('trainDay', `trainday/${Store.todayKey()}`);

Store.beginExpedition('milford');
Store.setSteps(12000);
Store.set('partnerLegMiles', 1);
if (!Store.advanceLeg()) throw new Error('arrival fixture did not satisfy the real expedition unlock rules');
check('arrival', 'arrival');
Store.set('expedition.legIndex', context.Screens.legCount());
context.location.hash = '#together';
const completedTogether = context.Screens.together();
if (!/Route complete/.test(completedTogether) || /data-action="advance-leg"/.test(completedTogether)) {
  failed += 1; console.error('FAIL together route-complete state can advance the final leg twice');
} else passed += 1;
check('trends', 'trends');

// Render the everyday surfaces again after a deliberately malformed-but-parseable
// restore. Import normalization is only useful if the UI can safely consume the
// resulting state without relying on hidden happy-path assumptions.
Store.importState({
  profile: { name: 'Recovered', initials: 'R', startDate: Store.todayKey() },
  partner: { name: 'Partner', initials: 'P' },
  onboarded: true,
  days: { [Store.todayKey()]: { meals: 'bad', workouts: {}, steps: -50, reflection: 7 } },
  mealIdeas: [{ name: null, kcal: -1, items: [{ name: null }] }, false],
  mealPlan: { 'Mon-Breakfast': { name: 'Safe', kcal: -1 }, nonsense: { name: 'Bad' } },
  shopTicked: { safe: true, bad: false },
  planMeta: { writtenBy: 99, weekOf: 'bad', note: {} },
  proposal: { targets: { calories: -1, protein: 'bad', steps: 999999999 }, answered: 'yes' },
  partnerData: { name: 'Partner', date: Store.todayKey(), points: 99, weightTrend: { change: 'bad', days: 1 } },
  invite: { routeId: 'milford', trail: 'bad', counters: 999 },
  coachCache: { date: 'bad', line: {} }, coachChat: { date: Store.todayKey(), messages: { bad: true } },
  lastFinish: { name: {}, minutes: -1, exercises: { bad: true }, best: 'bad' },
  lastArrival: { routeId: '', legIndex: 999999, milesMine: -2 },
  badgeEarnedAt: { '__proto__': '2026-08-09', fake: '2026-02-31' },
  mealFavoriteAt: { '__proto__': '2026-08-09', stale: 'bad' },
  exercisePrefs: { dislikedIds: 'bad', discomfortIds: [null, 'not-an-exercise'], swapLog: [{date:'bad',fromId:{},toId:[],reason:'bad'}] },
  weeklyReviews: { bad: {summary:{}}, '2026-08-03': 'bad' },
  weeklyGoals: { bad: [{id:'x'}], '2026-08-03': 'bad' },
  reactionsGiven: { '__proto__':'heart', nonsense:'explode' },
  futurePlan: [{day:'Noday',name:{},ex:'bad'}], futurePlanMeta:{weekOf:'not-a-date'},
  connections: { githubBranch: '' }
});

Object.entries({
  home: 'home', coach: 'coach', nutrition: 'nutrition', train: 'train', together: 'together',
  settings: 'settings', body: 'body', photos: 'photos', records: 'records', badges: 'badges',
  reflection: 'reflection', trends: 'trends', planner: 'planner', cookbook: 'cookbook',
  history: 'history', calendar: 'calendar', dayHistory: `day-history/${Store.todayKey()}`, weeklyReview: 'weekly-review', exercises: 'exercises', notifications: 'notifications', handshake: 'handshake'
}).forEach(([screenName, hash]) => check(screenName, hash));

console.log(`${passed} screen smoke checks passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

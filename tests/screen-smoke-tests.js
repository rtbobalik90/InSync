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
  'store.js',
  'ui.js',
  'exercises.js',
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
  exercises: 'exercises',
  exercise: 'exercise/dumbbell-chest-press',
  trainDay: 'trainday',
  notifications: 'notifications',
  meal: 'meal/unknown',
  handshake: 'handshake'
}).forEach(([screenName, hash]) => check(screenName, hash, screenName === 'meal'));

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
  connections: { githubBranch: '' }
});

Object.entries({
  home: 'home', coach: 'coach', nutrition: 'nutrition', train: 'train', together: 'together',
  settings: 'settings', body: 'body', photos: 'photos', records: 'records', badges: 'badges',
  reflection: 'reflection', trends: 'trends', planner: 'planner', cookbook: 'cookbook',
  history: 'history', exercises: 'exercises', notifications: 'notifications', handshake: 'handshake'
}).forEach(([screenName, hash]) => check(screenName, hash));

console.log(`${passed} screen smoke checks passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

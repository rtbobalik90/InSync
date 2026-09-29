'use strict';
process.env.TZ = 'America/Chicago';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;

function ok(value, message) {
  if (value) { passed++; console.log('PASS:', message); }
  else { failed++; console.error('FAIL:', message); }
}
function eq(actual, expected, message) {
  ok(actual === expected, `${message} (got ${JSON.stringify(actual)})`);
}

class LS {
  constructor(seed) { this.m = new Map(Object.entries(seed || {})); }
  getItem(key) { return this.m.has(key) ? this.m.get(key) : null; }
  setItem(key, value) { this.m.set(key, String(value)); }
  removeItem(key) { this.m.delete(key); }
}

function harness() {
  const inputs = {};
  let root = null;
  let appended = 0;
  const bodyClasses = new Set();
  const document = {
    body: {
      appendChild(el) { root = el; appended++; },
      classList: {
        add(value) { bodyClasses.add(value); },
        remove(value) { bodyClasses.delete(value); }
      }
    },
    createElement() {
      const listeners = {};
      return {
        id: '', className: '', innerHTML: '', removed: false,
        addEventListener(type, fn) { listeners[type] = fn; },
        querySelector(selector) {
          if (selector === '.ob-scroll') return { scrollTop: 0 };
          return null;
        },
        remove() { this.removed = true; },
        emit(kind, value) {
          const control = { getAttribute(name) { return name === 'data-ob' ? kind : value; } };
          listeners.click({ target: { closest() { return control; } } });
        }
      };
    },
    getElementById(id) {
      if (id === 'onboarding') return root;
      return inputs[id] || null;
    }
  };
  const ctx = {
    console, document, localStorage: new LS(), Date, Math, JSON, String, Number, Object, Array, RegExp, Intl,
    parseInt, parseFloat, isFinite, isNaN, setTimeout, clearTimeout,
    location: { hostname: 'example.test', pathname: '/insync/', hash: '#home', protocol: 'https:' },
    navigator: { onLine: true }, UI: { esc: value => String(value == null ? '' : value) },
    CustomEvent: function () {}, btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'), window: null
  };
  ctx.window = ctx;
  ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  ['store.js', 'exercises.js', 'training.js', 'onboarding.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  });
  return {
    ctx, inputs,
    root: () => root,
    appended: () => appended,
    setInput(id, value) { inputs[id] = { value: String(value) }; }
  };
}

// Pure plan construction covers all four onboarding choices without mutating Store.
{
  const h = harness();
  const O = h.ctx.Onboarding, T = h.ctx.Training, X = h.ctx.Exercises;
  const profiles = [
    ['planet-fitness', []], ['home', []], ['full-gym', []], ['custom', ['Bodyweight', 'Cable']]
  ];
  eq(O.gymChoices.map(choice => choice.key).join(','), 'planet-fitness,home,full-gym,custom', 'all four explicit gym choices are available in the required order');
  eq(O.equipment.join(','), 'Bodyweight,Dumbbell,Machine,Cable,Smith,Barbell', 'custom setup uses the canonical Training equipment vocabulary');
  profiles.forEach(([type, equipment]) => {
    const profile = O.trainingProfileFor(type, equipment);
    const plan = O.planFor(4, type, equipment);
    ok(plan.length === 4 && plan.every(day => Array.isArray(day.ex)), `${type} produces a four-day preview`);
    ok(plan.flatMap(day => day.ex).every(id => T.equipmentAllows(X.get(id), profile)), `${type} preview contains only allowed equipment`);
  });
}

// Exercise the real event flow: explicit selection, validation, back/forward draft, and finish.
{
  const h = harness(), O = h.ctx.Onboarding, S = h.ctx.Store;
  O.start();
  const root = h.root();
  root.emit('next');
  h.setInput('ob-name', 'Robert'); root.emit('next');
  h.setInput('ob-hft', 5); h.setInput('ob-hin', 9); h.setInput('ob-age', 36); h.setInput('ob-wt', 186);
  root.emit('sex', 'Male'); root.emit('next');
  root.emit('goal', 'lose-fat'); root.emit('next');
  root.emit('freq', '3'); root.emit('next');
  ok(root.innerHTML.includes('Where will you train?') && !root.innerHTML.includes('ob-goal on'), 'equipment step appears after frequency with no silent default');
  root.emit('gym', 'custom');
  root.emit('next');
  ok(root.innerHTML.includes('Choose at least one equipment category') && root.innerHTML.includes('Where will you train?'), 'Custom cannot continue without an equipment category');
  root.emit('equipment', 'Cable');
  root.emit('next');
  ok(root.innerHTML.includes('Numbers to start with.'), 'valid custom equipment advances to targets');
  root.emit('back');
  ok(root.innerHTML.includes('data-value="custom"') && root.innerHTML.includes('data-value="Cable"') && root.innerHTML.includes('ob-chip on'), 'equipment choice survives backward navigation');
  root.emit('back'); root.emit('back'); root.emit('back');
  ok(root.innerHTML.includes('value="5"') && root.innerHTML.includes('value="9"') && root.innerHTML.includes('value="186"'), 'typed body data survives backward navigation');
  root.emit('next'); root.emit('next'); root.emit('next'); root.emit('next'); root.emit('next');
  ok(root.innerHTML.includes('Built for Custom') && !root.innerHTML.includes('Planet Fitness has'), 'first plan preview describes the selected setup');
  const expectedPlan = JSON.stringify(O.planFor(3, 'custom', ['Cable']));
  root.emit('next');
  h.setInput('ob-partner', 'Lizzie'); root.emit('next');
  ok(root.innerHTML.includes('propose targets that fit you better') && root.innerHTML.includes('You decide whether anything changes'), 'closing Coach letter promises a proposal and user decision');
  root.emit('finish');
  eq(S.state().trainingProfile.gymType, 'custom', 'completed onboarding saves the selected gym type');
  eq(JSON.stringify(S.state().trainingProfile.customEquipment), JSON.stringify(['Cable']), 'completed onboarding saves the selected custom equipment');
  eq(JSON.stringify(S.state().plan), expectedPlan, 'saved training plan exactly matches the selected-profile preview');
  ok(S.state().onboarded && root.removed, 'completed onboarding closes normally');
}

// Direct or stale calls cannot reopen onboarding or touch established users.
{
  const h = harness(), S = h.ctx.Store;
  S.setProfileName('Lizzie'); S.set('onboarded', true); S.set('plan', [{ day: 'Mon', name: 'Existing', ex: ['squats'], detail: 'Squats' }]);
  S.set('trainingProfile.gymType', 'home');
  const before = JSON.stringify(S.state());
  h.ctx.Onboarding.start();
  eq(h.appended(), 0, 'an onboarded user is not put back into onboarding');
  eq(JSON.stringify(S.state()), before, 'an established profile and active plan remain unchanged');
}

// Wording contract: elapsed time enables review, never an automatic target rewrite.
{
  const source = fs.readFileSync(path.join(ROOT, 'onboarding.js'), 'utf8');
  ok(source.includes('After at least two weeks of useful logs') && source.includes('Nothing changes without your approval'), 'targets explanation states the evidence and approval contract');
  ok(!source.includes('Then I will replace those starting numbers') && !source.includes('coach will replace them'), 'onboarding contains no automatic target-replacement promise');
}

console.log(`\nOnboarding equipment and Coach checks: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);

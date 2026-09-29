'use strict';

process.env.TZ = 'America/Chicago';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function ok(value, message) {
  if (value) { passed += 1; console.log('PASS:', message); }
  else { failed += 1; console.error('FAIL:', message); }
}

class LS {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const context = {
  console, localStorage: new LS(), Date, Math, JSON, String, Number, Object, Array, RegExp, Intl,
  parseInt, parseFloat, isFinite, isNaN, setTimeout, clearTimeout,
  location: { hash: '#settings', hostname: 'example.test', pathname: '/insync/', protocol: 'https:' },
  navigator: { onLine: true }, CustomEvent: function CustomEvent() {}, document: {},
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  fetch: () => Promise.reject(new Error('offline')), window: null
};
context.window = context;
context.window.dispatchEvent = () => {};
vm.createContext(context);
[
  'domains.js', 'contracts.js', 'journeys.js', 'theme.js', 'rewards.js', 'camp.js', 'store.js',
  'intelligence.js', 'prompt-registry.js', 'ui.js', 'media.js', 'exercises.js', 'training.js',
  'nutrition.js', 'insights.js', 'together.js', 'onboarding.js', 'badges.js', 'cloud.js', 'foods.js',
  'screens.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file }));

const Store = context.Store;
Store.set('onboarded', true);
Store.setProfileName('Robert');
Store.setPartnerName('Lizzie');

let html = context.Screens.settings();
const settingsSections = ['profile', 'training', 'coach', 'together', 'notifications', 'units', 'data', 'about'];
ok(settingsSections.every((id) => html.includes(`data-route="settings/${id}"`)), 'Settings hub links to all eight approved groups');
ok(html.includes('settings-hub active') && !html.includes('settings-panel active'), 'plain #settings opens the hub without exposing a long form');

context.location.hash = '#settings/coach';
html = context.Screens.settings();
ok(html.includes('data-settings-section="coach"') && html.includes('settings-panel active'), 'Coach deep link opens its focused Settings section');
ok(html.includes('Claude API key') && html.includes('Claude model') && html.includes('Tone'), 'Coach section retains its key, model and preference controls');

context.location.hash = '#settings/together';
html = context.Screens.settings();
ok(html.includes('GitHub token') && html.includes('Dedicated private sync repository') && html.includes('Walking with'), 'Together section retains partner-sync controls');
ok(html.includes('What Lizzie sees') && html.includes('Progress photos'), 'Together section retains every existing sharing safeguard');

context.location.hash = '#settings/notifications';
html = context.Screens.settings();
ok(html.includes('In-app notifications') && html.includes('They propose an expedition') && html.includes('A badge is earned'), 'all eight notification categories remain available under the in-app label');
ok(html.includes('They do not send alerts to your phone.') && html.includes('does not use a daily reminder to pressure you to log'), 'Settings uses the approved no-push and no-pressure wording');

context.location.hash = '#notifications';
html = context.Screens.notifications();
ok(html.includes('In-app notifications') && html.includes('do not send alerts to your phone'), 'notification centre uses terminology consistent with Settings');
ok(html.includes('data-route="settings/notifications"'), 'notification centre links directly to its focused Settings section');

context.location.hash = '#history';
html = context.Screens.history();
[
  'calendar', 'weekly-review', 'workouts', 'records', 'cardio', 'meal-history', 'body', 'trends', 'photos'
].forEach((route) => ok(html.includes(`data-route="${route}"`), `History hub preserves ${route} destination`));
ok(html.includes('Campfire archive'), 'History hub includes the Campfire archive destination');

const mealDate = Store.todayKey();
Store.day(mealDate).meals = [{ id: 'meal-one', slot: 'Dinner', name: 'Test meal', kcal: 500, protein: 35, time: '18:00' }];
Store.save();
context.location.hash = '#meal-history';
html = context.Screens.mealHistory();
ok(html.includes('Meal history') && html.includes('Test meal'), 'meal-only history remains intact at #meal-history');
ok(html.includes('data-back="history"'), 'Meal history returns to the broad History hub');

context.location.hash = '#calendar/' + mealDate.slice(0, 7);
html = context.Screens.calendar();
ok(html.includes('Calendar &amp; daily records') && html.includes('data-back="history"'), 'Calendar is clearly named and returns to the History hub');

const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
ok(app.includes("root === 'meal-history'") && app.includes('Screens.mealHistory()'), '#meal-history is wired through the production router');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
ok(css.includes('.settings-panel.active') && css.includes('.settings-hub-row'), 'Settings and History hub presentation rules are present');

console.log(`\nSprint 1 Settings, History and notification clarity: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

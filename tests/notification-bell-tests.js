
'use strict';

process.env.TZ = 'America/Chicago';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function ok(cond, msg) { if (!cond) { failed++; console.error('FAIL:', msg); } else { passed++; console.log('PASS:', msg); } }

class LS {
  constructor(){ this.m=new Map(); }
  getItem(k){ return this.m.has(k)?this.m.get(k):null; }
  setItem(k,v){ this.m.set(k,String(v)); }
  removeItem(k){ this.m.delete(k); }
}
const ctx={
  console, localStorage:new LS(), Date, Math, JSON, String, Number, Object, Array, RegExp, Intl,
  parseInt, parseFloat, isFinite, isNaN, setTimeout, clearTimeout,
  location:{hash:'#home',hostname:'example.test',pathname:'/',protocol:'https:'}, navigator:{},
  CustomEvent:function(){}, fetch:()=>Promise.reject(new Error('offline')),
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary')
};
ctx.window=ctx; ctx.window.dispatchEvent=()=>{}; vm.createContext(ctx);
['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','ui.js','exercises.js','insights.js','onboarding.js','cloud.js','foods.js','badges.js','screens.js'].forEach(file=>{
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
});
const S=ctx.Store; S.set('onboarded',true); S.setProfileName('Robert'); S.setPartnerName('Lizzie');

// Use a real state-backed informational event rather than the live weekday so
// this suite remains deterministic on every calendar date.
S.set('partnerData',{name:'Lizzie',initials:'L',date:S.todayKey(),points:0,steps:0,workouts:0});
let status=ctx.Screens.notificationStatus();
ok(status.info >= 1 && status.action === 0, 'fresh informational activity is unread without pretending it needs action');
let h=ctx.UI.header({});
ok(h.includes('notifbell has-info') && h.includes('notifdot') && !h.includes('notifcount'), 'informational activity turns the bell gold with a dot, not a numbered action badge');

ctx.Screens.markInformationalRead();
status=ctx.Screens.notificationStatus();
ok(status.info === 0 && status.action === 0, 'opening the notification centre can acknowledge informational activity');
h=ctx.UI.header({});
ok(!h.includes('has-info') && !h.includes('has-action') && !h.includes('notifdot') && !h.includes('notifcount'), 'acknowledged informational activity returns the bell to neutral');

S.set('proposal',{date:S.todayKey(),summary:'Targets need approval',why:'Test',targets:{calories:2100,protein:160,steps:10000,weightGoal:180},answered:false,accepted:false});
status=ctx.Screens.notificationStatus();
ok(status.action === 1, 'an unresolved coach proposal is counted as an action');
h=ctx.UI.header({});
ok(h.includes('notifbell has-action') && h.includes('notifcount') && h.includes('>1</span>'), 'an unresolved action turns the bell gold and shows a numbered badge');

ctx.Screens.markInformationalRead();
status=ctx.Screens.notificationStatus();
ok(status.action === 1, 'opening Notifications does not clear an unresolved action');
S.set('proposal.answered',true);
status=ctx.Screens.notificationStatus();
ok(status.action === 0, 'the action badge clears only after the underlying proposal is resolved');

const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
ok(app.includes("route === 'notifications'") && app.includes('Screens.markInformationalRead'), 'routing into Notifications explicitly acknowledges informational items');
const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
ok(css.includes('.notifbell.has-info') && css.includes('.notifbell.has-action') && css.includes('.notifcount'), 'production CSS contains distinct information and action bell states');

console.log(`\
${passed} notification-bell checks passed, ${failed} failed`);
if (failed) process.exit(1);

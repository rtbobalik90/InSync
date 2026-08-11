'use strict';

process.env.TZ = 'America/Chicago';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const childProcess = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;

function ok(cond, msg) {
  if (!cond) { failed++; console.error('FAIL:', msg); }
  else { passed++; console.log('PASS:', msg); }
}
function eq(actual, expected, msg) { ok(actual === expected, msg + ` (got ${JSON.stringify(actual)})`); }

class LS {
  constructor(seed) { this.m = new Map(Object.entries(seed || {})); this.fail = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k,v) { if (this.fail) throw new Error('quota exceeded'); this.m.set(k,String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

function context(seed) {
  const ls = new LS(seed);
  const ctx = {
    console, localStorage: ls,
    Date, Math, JSON, String, Number, Object, Array, RegExp, Intl,
    parseInt, parseFloat, isFinite, isNaN,
    setTimeout, clearTimeout,
    location: { hostname: 'example.test', pathname: '/insync/', hash: '', protocol: 'https:' },
    navigator: {},
    UI: { esc: s => String(s == null ? '' : s), asset: s => s },
    CustomEvent: function(type, init) { this.type = type; this.detail = init && init.detail; },
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    fetch: () => Promise.reject(new Error('network disabled in unit tests')),
  };
  ctx.window = ctx;
  ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  return { ctx, ls };
}
function run(ctx, file) { vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'), ctx, {filename:file}); }
function base(seed) {
  const o=context(seed); run(o.ctx,'store.js'); return o;
}
function withCloud() {
  const o=base(); run(o.ctx,'exercises.js'); run(o.ctx,'onboarding.js'); run(o.ctx,'cloud.js'); return o;
}
function withBadges() {
  const o=withCloud(); o.ctx.Screens = { legCount: () => 0 }; run(o.ctx,'badges.js'); return o;
}

// 1. Local date: this exact Central-time evening was the original rollover failure.
{
  const {ctx}=base();
  const d = new Date(2026,7,9,20,0,0);
  eq(d.toISOString().slice(0,10), '2026-08-10', 'test date crosses UTC midnight');
  eq(ctx.Store.iso(d), '2026-08-09', 'Store keeps the phone-local calendar date');
}

// 1b. A brand-new install cannot earn points before its journey began.
{
  const {ctx}=base(); const S=ctx.Store, today=S.todayKey();
  S.set('profile.startDate',today);
  S.set('plan',[]); // recovery would normally be worth three points
  eq(S.points(S.shift(today,-1)),0,'a pre-start recovery day earns no phantom points');
  eq(S.points(today),3,'today can still earn the scheduled recovery-day points');
  ok(!S.activeOn(S.shift(today,-1)) && S.activeOn(today),'journey activity boundary is explicit');
}

// 2. Migration keeps the old log, moves secrets, and removes the old key only after persistence.
{
  const old = { profile:{name:'Robert',initials:'RB'}, connections:{githubToken:'gh-secret',claudeKey:'sk-secret'}, days:{'2026-08-01':{meals:[],workouts:[],steps:1234,weight:null,reflection:''}} };
  const {ctx,ls}=base({'insync.v8':JSON.stringify(old)});
  eq(ctx.Store.state().profile.name, 'Robert', 'v8 profile migrated');
  eq(ctx.Store.secret('githubToken'), 'gh-secret', 'GitHub secret migrated to secret store');
  eq(ctx.Store.secret('claudeKey'), 'sk-secret', 'Claude secret migrated to secret store');
  ok(!ls.getItem('insync.v8'), 'old state key removed after successful v10 write');
  ok(!!ls.getItem('insync.v10'), 'v10 state persisted');
  ok(!JSON.stringify(JSON.parse(ls.getItem('insync.v10'))).includes('gh-secret'), 'plaintext GitHub token absent from v10 state');
}

// 2a2. Calendar-shaped but impossible local dates are rejected during normalization.
{
  const bad={profile:{name:'Date Test',startDate:'2026-02-31'},days:{'2026-02-31':{meals:[],workouts:[],steps:10}}};
  const {ctx}=base({'insync.v10':JSON.stringify(bad)});
  eq(ctx.Store.state().profile.startDate,'','impossible profile start date is cleared');
  ok(!ctx.Store.state().days['2026-02-31'],'impossible day key is removed instead of entering history');
}

// 2b. Imported state cannot poison object prototypes, and reset removes stale prior-version keys.
{
  const {ctx,ls}=base(); const S=ctx.Store;
  const hostile=JSON.parse('{"profile":{"name":"Safe"},"days":{},"__proto__":{"polluted":"yes"}}');
  S.importState(hostile);
  eq(vm.runInContext('({}).polluted',ctx),undefined,'backup import blocks prototype-pollution keys');
  eq(S.set('__proto__.polluted','yes'),false,'generic state setter rejects unsafe object paths');
  ls.setItem('insync.v7','stale');
  let wipeErr='not-called';
  S.wipe(err=>{ wipeErr=err || null; });
  eq(wipeErr,null,'reset completes when no photo database is present');
  ok(!ls.getItem('insync.v10') && !ls.getItem('insync.v7') && !ls.getItem('insync.secrets.v1'),'reset removes current, secret, and stale prior-version stores');
}

// 2c. Corrupted local state is never mistaken for a fresh install or overwritten silently.
{
  const badCurrent='{not valid json';
  const older={profile:{name:'Recovered',initials:'R'},days:{},onboarded:true};
  const recovered=base({'insync.v10':badCurrent,'insync.v9':JSON.stringify(older)});
  eq(recovered.ctx.Store.state().profile.name,'Recovered','damaged current state falls back to a readable prior-version copy');
  ok(/recovered/i.test(recovered.ctx.Store.loadWarning()),'recovery from an older local copy is surfaced to the app');
  ok(!recovered.ctx.Store.loadError(),'successful fallback does not leave the store read-only');
  ok(!!recovered.ls.getItem('insync.v10'),'recovered prior-version state replaces the damaged current copy only after a valid migration');

  const blocked=base({'insync.v10':badCurrent});
  ok(/cannot read safely/i.test(blocked.ctx.Store.loadError()),'unreadable-only local state raises a blocking load error');
  eq(blocked.ctx.Store.corruptRaw(),badCurrent,'damaged local bytes remain available for recovery download');
  eq(blocked.ctx.Store.set('goal','hold'),false,'blocking load error refuses writes that could overwrite damaged local data');
  eq(blocked.ls.getItem('insync.v10'),badCurrent,'blocking recovery mode leaves the damaged local copy untouched');
}

// 3. A storage failure is surfaced rather than swallowed.
{
  const {ctx,ls}=base();
  ls.fail=true;
  ctx.Store.set('goal','hold');
  ok(/could not save/i.test(ctx.Store.lastSaveError()), 'save failure records a visible error condition');
}

// 3b. Restore migration is one localStorage commit, so a failed import cannot replace the prior persisted log.
{
  const {ctx,ls}=base(); const S=ctx.Store;
  S.setProfileName('Before restore');
  const before=ls.getItem('insync.v10');
  ls.fail=true;
  let threw=false;
  try { S.importState({profile:{name:'Incoming'},days:{'2026-08-01':{steps:1000,meals:[],workouts:[]}},onboarded:true}); }
  catch(e) { threw=true; }
  ok(threw,'failed restore reports the storage failure');
  eq(ls.getItem('insync.v10'),before,'failed restore leaves the previous persisted log byte-for-byte intact');
  eq(S.state().profile.name,'Before restore','failed restore rolls in-memory state back to the previous log');
}

// 4. Scoring: recovery days can reach 10/10 and one calorie cannot earn calorie points.
{
  const {ctx}=base(); const S=ctx.Store;
  S.set('targets',{calories:2000,protein:150,steps:10000,weightGoal:180});
  S.set('plan',[]);
  const k='2026-08-09', d=S.day(k);
  d.meals=[{kcal:1900,protein:160,carbs:0,fat:0}]; d.steps=10000; d.weight=180; S.save();
  eq(S.points(k),10,'planned recovery day can earn a full 10/10');
  d.meals=[{kcal:1,protein:160,carbs:0,fat:0}]; S.save();
  eq(S.points(k),8,'one calorie does not earn the calorie-range points');
  ok(!S.pointRows(k).find(x=>x.key==='calories').done,'calorie row correctly remains incomplete below range');
}

// 5. nextStep cannot say 10/10 when the weigh-in point is missing.
{
  const {ctx}=base(); const S=ctx.Store, k=S.todayKey();
  S.set('targets',{calories:2000,protein:150,steps:10000,weightGoal:180}); S.set('plan',[]);
  const d=S.day(k); d.meals=[{kcal:1900,protein:160}]; d.steps=10000; d.weight=null; S.save();
  eq(S.points(k),9,'test day is exactly 9/10');
  ok(/weigh-in/i.test(S.nextStep().line),'next step names the missing weigh-in instead of claiming 10/10');
}

// 6. Expedition starts from the current step baseline and cannot double-count same-day steps.
{
  const {ctx}=base(); const S=ctx.Store, k=S.todayKey();
  S.setSteps(8000,k); S.beginExpedition('milford');
  eq(S.legMine(),0,'steps taken before a leg opens do not count on that leg');
  S.setSteps(12000,k); ok(S.legMine()>0,'new steps after the leg opens count');
  S.advanceLeg(); eq(S.legMine(),0,'advancing a leg resets at the current same-day step baseline');
}

// 7. Export is secret-safe.
{
  const {ctx}=base(); const S=ctx.Store;
  S.setSecret('githubToken','gh-very-secret'); S.setSecret('claudeKey','sk-very-secret');
  const out=JSON.stringify(S.exportState());
  ok(!out.includes('gh-very-secret') && !out.includes('sk-very-secret'),'state export excludes connection secrets');
  S.state().session={date:S.todayKey(),name:'Backup session',startedAt:Date.now(),items:[]}; S.save();
  eq(S.exportState().session.name,'Backup session','state export includes an in-progress session so the backup is complete');
}

// 8. Nutrition onboarding really uses body data and frequency.
{
  const {ctx}=withCloud(); const O=ctx.Onboarding;
  const a=O.targetsFor('lose-fat',180,64,25,'female',2);
  const b=O.targetsFor('lose-fat',180,74,45,'male',6);
  ok(a.calories !== b.calories,'calorie estimate changes with height/age/sex/frequency inputs');
  for (let n=2;n<=6;n++) {
    eq(O.plans[n].length,n,`starter plan has exactly ${n} scheduled days`);
    ok(!O.plans[n].some(x=>x.day==='Sun'),`starter ${n}-day plan keeps Sunday for recovery`);
  }
}

// 9. AI plan validation enforces exact frequency, real recovery spacing, and Sunday recovery.
{
  const {ctx}=withCloud(); const C=ctx.Cloud;
  eq(ctx.Exercises.byName('Dumbbell chest press').id,'dumbbell-chest-press','exercise records can resolve a library entry by display name');
  const valid=[
    {day:'Mon',name:'Upper',ex:['dumbbell-chest-press','pulldown-machine','shoulder-press-machine']},
    {day:'Tue',name:'Lower',ex:['horizontal-leg-press','plank','leg-extension']},
    {day:'Thu',name:'Upper',ex:['push-ups','cable-row','lateral-raise']},
    {day:'Fri',name:'Lower',ex:['linear-leg-press','elbow-to-knee','calf-extension']}
  ];
  ok(!!C.validatePlan(valid,4),'valid four-day plan is accepted');
  eq(C.validatePlan(valid.slice(0,3),4),null,'three days cannot pass as a four-day plan');
  const sun=valid.map(x=>Object.assign({},x)); sun[3].day='Sun';
  eq(C.validatePlan(sun,4),null,'Sunday training is rejected to preserve weekly recovery');
  const adjacent=valid.map(x=>({day:x.day,name:x.name,ex:(x.ex||[]).slice()}));
  adjacent[1]={day:'Tue',name:'Upper',ex:['push-ups','cable-row','lateral-raise']};
  eq(C.validatePlan(adjacent,4),null,'same muscle groups on adjacent days fail the 48-hour rule');
}


// 7c. Store mutation boundaries reject impossible negative values even when UI validation is bypassed.
{
  const {ctx}=base(); const S=ctx.Store, k=S.todayKey();
  S.setSteps(-100,k); eq(S.day(k).steps,0,'Store clamps negative steps at the persistence boundary');
  S.addMeal({name:'Bad',slot:'Snack',kcal:-500,protein:-20,carbs:-1,fat:-2},k);
  eq(S.totals(k).kcal,0,'Store cannot persist negative meal calories');
  eq(S.totals(k).protein,0,'Store cannot persist negative meal protein');
  S.setMorning({weight:-180,restingHr:999,sleepHr:99},k);
  eq(S.day(k).weight,null,'Store discards impossible weight supplied outside the logging form');
  S.addWorkout({name:'Bad',minutes:-30,exercises:[{name:'Lift',weight:-100,reps:-5,sets:-3}]},k);
  eq(S.day(k).workouts[0].minutes,0,'Store clamps negative workout duration');
  eq(S.day(k).workouts[0].exercises[0].weight,0,'Store clamps negative lift weight');
}

// 7d. Backup photograph restore accepts raster data URLs and rejects executable/oversized shapes before IndexedDB.
{
  const o=base(); o.ctx.document={}; run(o.ctx,'media.js');
  const M=o.ctx.Media;
  const jpg='data:image/jpeg;base64,' + Buffer.from('fake-raster-bytes').toString('base64');
  ok(M.validPhotoData(jpg),'backup photo validator accepts supported raster data URLs');
  ok(!M.validPhotoData('data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PjwvU2NyaXB0Pjwvc3ZnPg=='),'backup photo validator rejects SVG/script-capable image data');
  ok(!M.validatePhotoMap({photo1:jpg}),'valid photo map passes preflight validation');
  ok(!!M.validatePhotoMap({photo1:'not-an-image'}),'invalid photo map is rejected before the photo database is cleared');
}

// 10. Sync payload privacy and rolling history.
{
  const {ctx}=withCloud(); const S=ctx.Store, C=ctx.Cloud, k=S.todayKey();
  S.set('profile.name','Robert'); S.set('profile.initials','RB'); S.set('partner.name','Lizzie');
  S.setSteps(10000,k); S.setMorning({weight:180},S.shift(k,-7)); S.setMorning({weight:178},k);
  S.set('privacy.steps',false); S.set('privacy.weight',false);
  let p=C.sharePayload();
  ok(!('steps' in p) && !('legMiles' in p),'turning Steps sharing off removes both steps and expedition miles');
  ok(!('weight' in p) && !('weightTrend' in p),'turning Weight sharing off removes weight information');
  eq(Object.keys(p.history.points).length,8,'sync carries only the active journey history, not invented pre-start days');
  ok(!Object.prototype.hasOwnProperty.call(p.history.points,S.shift(S.startKey(),-1)),'sync omits points from before the journey began');
  S.set('privacy.weight',true); p=C.sharePayload();
  ok(!('weight' in p) && !!p.weightTrend,'weight sharing sends only a trend, never exact bodyweight');
}

// 10b. Handshake mutations carry a revision so acceptance/nudges can cross even when the proposal timestamp is unchanged.
{
  const {ctx}=withCloud(); const S=ctx.Store, C=ctx.Cloud;
  S.setProfileName('Robert'); S.setPartnerName('Lizzie');
  S.propose('milford','Milford Track');
  const at=S.state().invite.at, rev=S.state().invite.rev;
  S.nudgeInvite();
  ok(S.state().invite.rev>rev && S.state().invite.at===at,'nudging advances the invite revision without pretending it is a new proposal');
  const nudgeRev=S.state().invite.rev;
  S.acceptInvite();
  ok(S.state().invite.rev>nudgeRev && S.state().invite.accepted,'accepting advances the invite revision');
  const payload=C.sharePayload();
  eq(payload.invite.rev,S.state().invite.rev,'sync payload carries the current invite revision');
  ok(!!payload.invite.updatedAt,'sync payload carries an invite mutation timestamp');
  const cloudText=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
  ok(cloudText.includes('inRev !== hereRev') && cloudText.includes('incoming.accepted && !here.accepted'),'pull reconciliation uses revision and accepted-state fallbacks');
}

// 11. Badges use actual evidence and completed history.
{
  const {ctx}=withBadges(); const S=ctx.Store, B=ctx.Badges;
  S.markVerseRead(S.todayKey());
  ok(B.find('faith-first-verse').earned,'First verse requires a recorded verse read');
  S.set('notesSent',10); ok(B.find('together-ten-notes').earned,'Ten synced encouragements unlock Ten notes');

  const ws=S.shift(S.weekStart(),-7), ph={}, pl={};
  S.set('targets',{calories:2000,protein:150,steps:10000,weightGoal:180}); S.set('plan',[]);
  for(let i=0;i<7;i++) {
    const key=S.shift(ws,i), d=S.day(key); d.meals=[{kcal:1900,protein:160}]; d.steps=10000; d.weight=180; S.save();
    ph[key]= i===0 ? 7 : 10; pl[key]=true;
  }
  S.set('partnerHistory',ph); S.set('partnerLoggedHistory',pl);
  ok(B.find('together-challenge-won').earned,'weekly challenge win uses the completed previous week');
  ok(B.find('together-neck-and-neck').earned,'neck-and-neck uses completed weekly totals within three points');
  ok(B.find('together-a-week-together').earned,'week together requires seven days both devices report as logged');

  let sun=S.todayKey(); while(new Date(sun+'T12:00:00').getDay()!==0) sun=S.shift(sun,-1);
  for(let i=0;i<12;i++) S.saveReflection('Rested and reflected',S.shift(sun,-7*i));
  ok(B.find('faith-sabbath-kept').earned,'Sabbath badge requires twelve consecutive logged Sundays with no workout');

  S.set('earned',['distance-route-finished']);
  ok(B.find('distance-route-finished').earned,'once-earned milestone badges remain earned after state moves on');
}


// 11b. Calendar-streak badges cannot bridge missing days, and first-step needs a real log.
{
  const {ctx}=withBadges(); const S=ctx.Store, B=ctx.Badges, today=S.todayKey();
  S.markVerseRead(today);
  ok(!B.find('first-first-step').earned,'opening the verse/Home alone does not earn First step');
  S.set('targets',{calories:2000,protein:150,steps:10000,weightGoal:180}); S.set('plan',[]);
  for(let i=0;i<7;i++) {
    const key=S.shift(today,-i*2), d=S.day(key);
    d.meals=[{kcal:1900,protein:160}]; d.steps=10000; d.weight=180; S.save();
  }
  ok(!B.find('consistency-clean-week').earned,'Clean week does not bridge missing calendar days');
  ok(!B.find('streak-dawn-riser').earned,'Dawn riser does not bridge skipped mornings');

  const sparse=withBadges(), SS=sparse.ctx.Store, BB=sparse.ctx.Badges, t=SS.todayKey();
  SS.setMorning({weight:190},SS.shift(t,-77)); SS.setMorning({weight:185},t);
  ok(!BB.find('body-twelve-weeks').earned,'two weigh-ins far apart do not count as twelve weeks of weigh-ins');
  for(let i=0;i<12;i++) SS.setMorning({weight:190-i*0.2},SS.shift(t,-7*i));
  ok(BB.find('body-twelve-weeks').earned,'Twelve weeks requires weigh-ins in twelve distinct calendar weeks');
}

// 4b. Historical scoring is immutable after the day is logged.
{
  const {ctx}=base(); const S=ctx.Store, k='2026-08-08'; // Saturday
  S.set('targets',{calories:2000,protein:150,steps:10000,weightGoal:180});
  S.set('plan',[{day:'Sat',name:'Upper',ex:['push-ups']}]);
  S.addMeal({name:'Day',slot:'Dinner',kcal:1900,protein:160,carbs:0,fat:0},k);
  S.setSteps(10000,k); S.setMorning({weight:180},k); S.addWorkout({name:'Upper',minutes:30,exercises:[]},k);
  eq(S.points(k),10,'logged day reaches 10/10 under the targets and plan active that day');
  eq(S.scoreTargets(k).calories,2000,'logged day stores its calorie target snapshot');
  S.set('targets',{calories:3000,protein:220,steps:18000,weightGoal:170});
  S.set('plan',[]);
  eq(S.points(k),10,'later target and plan changes cannot rewrite an old 10/10 day');
  eq(S.scoreTargets(k).calories,2000,'historical target snapshot remains unchanged after new targets');
}

// 4c. v9 migration freezes existing logged days into v10 scoring snapshots.
{
  const old={
    profile:{name:'Robert',initials:'RB',startDate:'2026-08-01'},
    targets:{calories:2100,protein:160,steps:11000,weightGoal:180},
    plan:[{day:'Sat',name:'Upper',ex:['push-ups']}],
    days:{'2026-08-08':{meals:[{name:'Meal',slot:'Dinner',kcal:2000,protein:170}],workouts:[{name:'Upper',minutes:30,exercises:[]}],steps:11000,weight:180,reflection:''}}
  };
  const {ctx,ls}=base({'insync.v9':JSON.stringify(old)}); const S=ctx.Store;
  ok(!!S.day('2026-08-08').scoreBasis,'v9 logged day receives a score basis during v10 migration');
  eq(S.day('2026-08-08').scoreBasis.targets.calories,2100,'migration snapshots the target that existed at upgrade time');
  ok(!ls.getItem('insync.v9') && !!ls.getItem('insync.v10'),'v9 state migrates atomically to the v10 key');
}

// 5b. A workout that crosses midnight is credited to the day it began.
{
  const {ctx}=base(); const S=ctx.Store, today=S.todayKey(), yesterday=S.shift(today,-1);
  S.state().session={
    date:yesterday,name:'Late session',startedAt:Date.now()-20*60000,
    scoreBasis:{version:1,targets:{calories:2000,protein:150,steps:10000},trainingKind:'session',planName:'Late session'},
    items:[{id:'push-ups',name:'Push-ups',sets:[{weight:0,reps:12}]}]
  };
  S.save();
  const result=S.finishSession();
  ok(!!result,'cross-midnight session can finish normally');
  eq(S.day(yesterday).workouts.length,1,'finished session is written to its start date');
  eq(S.day(today).workouts.length,0,'finishing after midnight does not create a workout on the new day');
}

// 7b. Malformed backups are normalized before any screen or score reads them.
{
  const {ctx}=base(); const S=ctx.Store;
  const malformed={
    profile:{name:'Robert'}, targets:[], units:{weight:'stones'}, plan:'bad',
    days:{'2026-08-01':{meals:{bad:true},workouts:'bad',steps:-900,weight:-20,restingHr:999,sleepHr:99,reflection:7}},
    partnerHistory:{'bad-date':99,'2026-08-01':50}, partnerLoggedHistory:[],
    mealIdeas:[null,{name:7,kcal:-1,protein:'bad',items:[{name:null,kcal:-10}]}],
    mealPlan:{'Mon-Breakfast':{name:'Oats',kcal:-50,items:'bad'},'Not-A-Slot':{name:'Bad'}},
    shopTicked:{oats:true,bad:false}, planMeta:{writtenBy:'anything',weekOf:'bad',note:7},
    proposal:{date:'bad',answered:'yes',targets:{calories:-5,protein:'bad',steps:9999999,weightGoal:-2,evil:999}},
    invite:{routeId:'milford',trail:'bad',counters:99}, session:{date:'nope',items:'bad'}
  };
  S.importState(malformed);
  eq(S.state().units.weight,'lb','invalid unit in backup falls back safely');
  eq(S.day('2026-08-01').steps,0,'negative imported steps are removed');
  eq(S.day('2026-08-01').meals.length,0,'malformed imported meal collection becomes an empty array');
  eq(S.day('2026-08-01').weight,null,'impossible imported bodyweight is discarded');
  ok(Array.isArray(S.state().mealIdeas) && S.state().mealIdeas.length===1,'malformed meal ideas are reduced to safe meal objects');
  eq(S.state().mealIdeas[0].kcal,0,'negative nutrition in imported meal ideas is clamped');
  const migratedPlanKey=S.weekStart(S.todayKey())+'|Breakfast';
  ok(!!S.state().mealPlan[migratedPlanKey] && !S.state().mealPlan['Not-A-Slot'],'legacy planner slots migrate into the dated week and invalid slots are removed');
  eq(S.state().mealPlan[migratedPlanKey].kcal,0,'planned meal nutrition is normalized before planner math');
  eq(Object.keys(S.state().shopTicked).join(','),'oats','shopping state keeps only active bounded entries');
  eq(S.state().planMeta.writtenBy,'','invalid planner metadata cannot masquerade as a coach-written plan');
  eq(S.state().proposal.targets.calories,S.state().targets.calories,'invalid proposed target falls back to the current safe target');
  ok(!('evil' in S.state().proposal.targets),'proposal target keys are whitelisted before acceptance');
  ok(!S.state().session,'malformed in-progress session is discarded safely');
  ok(Array.isArray(S.state().invite.trail),'malformed invite trail is normalized to an array');
  eq(S.state().invite.counters,2,'invite counter is bounded to the handshake cap');
  eq(Object.keys(S.state().partnerHistory).length,0,'invalid partner history points are discarded');
  eq(S.totals('2026-08-01').kcal,0,'totals remain callable after malformed import');
}

// 7c. New activity/reaction state remains semantically bounded after a backup restore.
{
  const {ctx}=base(); const S=ctx.Store, k=S.todayKey();
  const validId='a:lizzie:'+k+':protein';
  S.importState({
    profile:{name:'Robert',startDate:k}, partner:{name:'Lizzie'}, days:{}, onboarded:true,
    partnerData:{
      name:'Lizzie',date:k,updated:'not-a-time',seenPartnerUpdated:'also-bad',
      activity:[
        {id:validId,date:k,type:'protein',text:'Protein target',createdAt:new Date().toISOString()},
        {id:'nonsense',date:k,type:'protein',text:'Bad id'},
        {id:'a:lizzie:2026-02-31:steps',date:k,type:'steps',text:'Impossible date'},
        {id:'a:lizzie:'+k+':score',date:k,type:'evil',text:'Bad type'}
      ],
      reactions:{[validId]:'heart',nonsense:'fire'}
    },
    reactionsGiven:{[validId]:'clap',nonsense:'fire'}
  });
  eq(S.state().partnerData.updated,'','invalid partner update timestamp is discarded during backup normalization');
  eq(S.state().partnerData.seenPartnerUpdated,'','invalid sync acknowledgement timestamp is discarded during backup normalization');
  eq(S.state().partnerData.activity.length,1,'backup normalization keeps only valid bounded partner activity events');
  eq(S.state().partnerData.activity[0].id,validId,'valid partner activity survives backup normalization');
  eq(Object.keys(S.state().partnerData.reactions).join(','),validId,'backup normalization removes reactions for invalid activity ids');
  eq(Object.keys(S.state().reactionsGiven).join(','),validId,'local reaction memory also requires a valid activity id');
}

// 10c. Partner payload input is bounded and must belong to the configured partner.
{
  const {ctx}=withCloud(); const S=ctx.Store, C=ctx.Cloud, k=S.todayKey();
  S.setProfileName('Robert'); S.setPartnerName('Lizzie');
  const clean=C.sanitizePartnerPayload({name:'Lizzie',initials:'L',date:k,points:9,streak:4,note:'hi',history:{points:{[k]:9},logged:{[k]:true}},steps:12345});
  eq(clean.points,9,'valid partner points survive sync-file sanitation');
  eq(clean.steps,12345,'valid shared step count survives sanitation');
  let wrong=false; try { C.sanitizePartnerPayload({name:'Someone Else',date:k,points:5}); } catch(e) { wrong=/different profile/i.test(e.message); }
  ok(wrong,'sync file for a different profile is rejected instead of entering local state');
  let impossible=false; try { C.sanitizePartnerPayload({name:'Lizzie',date:'2026-02-31'}); } catch(e) { impossible=true; }
  ok(impossible,'calendar-shaped but impossible partner dates are rejected');
  const hostile=C.sanitizePartnerPayload({name:'Lizzie',date:k,points:999,steps:-5,earned:['a',{},'a'],history:{points:{bad:8,[k]:999},logged:{[k]:'yes'}}});
  eq(hostile.points,0,'out-of-range partner points cannot poison Together scoring');
  ok(!('steps' in hostile),'negative partner steps are removed');
  eq(hostile.earned.length,1,'partner badge list is reduced to unique string ids');
  eq(Object.keys(hostile.history.points).length,0,'invalid history keys and out-of-range scores are discarded');
}

// 10d. The latest note remains in the sync payload across midnight until a newer note replaces it.
{
  const {ctx}=withCloud(); const S=ctx.Store, C=ctx.Cloud, today=S.todayKey(), yesterday=S.shift(today,-1);
  S.setProfileName('Robert'); S.setPartnerName('Lizzie');
  S.day(yesterday).noteToPartner='Late note'; S.save();
  let p=C.sharePayload();
  eq(p.note,'Late note','yesterday note is still represented after the calendar rolls over');
  eq(p.noteDate,yesterday,'shared note carries the date it was written, not the sync date');
  S.markCurrentNoteSynced(yesterday,'Late note'); S.markCurrentNoteSynced(yesterday,'Late note');
  eq(S.state().notesSent,1,'successful retry counts a note exactly once');
  S.day(today).noteToPartner='New note'; S.save(); p=C.sharePayload();
  eq(p.note,'New note','a newer note replaces the older persistent note in sync');
  eq(p.noteDate,today,'new note carries its own date');
}

// 10d1. Together messages are a rolling authored history, not a sticky latest-note field.
{
  const {ctx}=withCloud(); const S=ctx.Store, C=ctx.Cloud, k=S.todayKey();
  S.setProfileName('Robert'); S.setPartnerName('Lizzie');
  const id1=S.setPartnerNote('First message');
  const id2=S.setPartnerNote('Second message');
  ok(!!id1 && !!id2 && id1!==id2,'each sent message receives a stable unique id');
  eq(S.state().sentMessages.length,2,'multiple outgoing messages remain in local conversation history');
  let p=C.sharePayload();
  eq(p.messages.length,2,'sync payload carries rolling message history instead of only the latest note');
  eq(p.messages[1].text,'Second message','newest message is represented in sync history');
  S.markMessagesSynced(p.messages);
  ok(S.state().sentMessages.every(m=>!!m.sentAt),'successful GitHub write acknowledges every included pending message');
  eq(S.state().notesSent,2,'message badge counter increments once per newly delivered message');
  S.markMessagesSynced(p.messages);
  eq(S.state().notesSent,2,'retrying the same message payload cannot double-count delivery');

  const incoming=C.sanitizePartnerPayload({
    schema:4,name:'Lizzie',initials:'L',date:k,points:0,streak:0,earned:[],
    messages:[{id:'her-1',date:k,text:'Reply back',createdAt:new Date().toISOString(),sentAt:new Date().toISOString()}],
    history:{points:{},logged:{}}
  });
  eq(incoming.messages.length,1,'partner message history survives sync-file sanitation');
  eq(incoming.messages[0].text,'Reply back','sanitized partner reply keeps its text');
}

// 10d2. Expedition sync carries route/leg identity even when health mileage is private.
{
  const {ctx}=withCloud(); const S=ctx.Store, C=ctx.Cloud, k=S.todayKey();
  S.setProfileName('Robert'); S.setPartnerName('Lizzie');
  S.state().expedition={routeId:'camino',legIndex:2,legStart:k,legStartSteps:0};
  S.state().lastArrival={routeId:'camino',legIndex:1,at:new Date().toISOString(),milesMine:3.2,milesHers:2.8};
  S.state().privacy.steps=false; S.day(k).steps=4000; S.save();
  let p=C.sharePayload();
  eq(p.schema,7,'partner payload uses current sync schema 7');
  eq(p.expedition.routeId,'camino','expedition route identity is core Together state even with Steps private');
  eq(p.expedition.legIndex,2,'expedition leg identity is core Together state even with Steps private');
  ok(!('legMiles' in p) && !('previousLegMiles' in p.expedition),'Steps privacy removes current and previous-leg mileage');
  S.state().privacy.steps=true; S.save(); p=C.sharePayload();
  ok('legMiles' in p && p.expedition.previousLegMiles===3.2,'Steps sharing adds only the mileage needed for the matching expedition leg');
}

// 10d3. The Store itself refuses to advance a route that is already complete.
{
  const {ctx}=base(); const S=ctx.Store;
  ctx.Screens={legCount:()=>1};
  S.state().expedition={routeId:'camino',legIndex:1,legStart:S.todayKey(),legStartSteps:0};
  eq(S.advanceLeg(),false,'completed route cannot advance again through the Store boundary');
  eq(S.state().expedition.legIndex,1,'blocked duplicate arrival leaves the completed leg index unchanged');
}

// 10d4. Arrival requirements are enforced at the state boundary, not only by a hidden button.
{
  const {ctx}=base(); const S=ctx.Store, k=S.todayKey();
  S.state().expedition={routeId:'camino',legIndex:0,legStart:k,legStartSteps:0};
  ctx.Screens={legCount:()=>2,leg:()=>({miles:10})};
  S.day(k).steps=18000; S.state().partnerLegMiles=0.5; S.save();
  eq(S.advanceLeg(),false,'Store refuses arrival when both-walker contribution is not met');
  eq(S.state().expedition.legIndex,0,'failed arrival requirement cannot mutate expedition progress');
  S.state().partnerLegMiles=2; S.save();
  eq(S.advanceLeg(),true,'Store accepts arrival once distance and both-walker conditions are satisfied');
  eq(S.state().expedition.legIndex,1,'valid arrival advances exactly one leg');
}

// 10e. Editing an already-sent note makes the new text visibly unsent until the next confirmed push.
{
  const {ctx}=base(); const S=ctx.Store, k=S.todayKey();
  S.setPartnerNote('First');
  S.markCurrentNoteSynced(k,'First');
  ok(!!S.day(k).noteSentAt,'confirmed note carries a sent timestamp');
  S.setPartnerNote('Changed while offline');
  eq(S.day(k).noteSentAt,'','editing a sent note clears its old delivery timestamp');
  eq(S.day(k).noteToPartner,'Changed while offline','edited note remains saved locally while awaiting sync');
  S.markCurrentNoteSynced(k,'Changed while offline');
  eq(S.state().notesSent,2,'a genuinely new same-day note counts as a second successful send');
  const sentAt=S.day(k).noteSentAt; S.setPartnerNote('Changed while offline');
  eq(S.day(k).noteSentAt,sentAt,'re-saving identical already-sent text does not make it look unsent');
}

// 10f. Calendar-day counter is independent of clock time and daylight-saving hours.
{
  const {ctx}=base(); const S=ctx.Store;
  S.set('profile.startDate',S.shift(S.todayKey(),-10));
  eq(S.daysIn(),11,'journey day count is based on calendar dates rather than elapsed 24-hour blocks');
}

// 12. Static regression checks around photos, backups, navigation, cache and assets.
{
  const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  const log=fs.readFileSync(path.join(ROOT,'log.js'),'utf8');
  const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
  ok(app.includes('Media.all(function (err, media)') && app.includes("action === 'import'"),'backup and restore handlers are both wired');
  ok(app.includes("data-secret") && app.includes('Store.setSecret'),'secret fields write to separate secret storage');
  ok(app.includes("var backTo = el.getAttribute('data-back')") && ui.includes('data-back=\"'),'Back buttons honor explicit destination routes');
  ok(!app.includes("{ photo: e2 ? dataUrl : small }") && log.includes('mealData.photoId'),'meal photos are persisted by IndexedDB id, not embedded in localStorage');

  const exCtx=context(); exCtx.ctx.window=exCtx.ctx; run(exCtx.ctx,'exercises.js');
  exCtx.ctx.Exercises.all.forEach(e=>ok(fs.existsSync(path.join(ROOT,e.gif)),`exercise media exists: ${e.id}`));
  const badgeDir=path.join(ROOT,'assets/badges');
  const badgeText=fs.readFileSync(path.join(ROOT,'badges.js'),'utf8');
  const ids=[...badgeText.matchAll(/\['([^']+)',\s*'(?:streak|first|strength|distance|consistency|body|together|faith)'/g)].map(m=>m[1]);
  ids.forEach(id=>ok(fs.existsSync(path.join(badgeDir,id+'.png')),`badge art exists: ${id}`));

  const sourceFiles=fs.readdirSync(ROOT).filter(f=>/\.(js|css|html|md|webmanifest)$/.test(f) && !f.includes('.orig'));
  const literal=new Set();
  for(const f of sourceFiles) {
    const txt=fs.readFileSync(path.join(ROOT,f),'utf8');
    for(const m of txt.matchAll(/assets\/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|gif|webp)/gi)) literal.add(m[0]);
  }
  for(const ref of literal) ok(fs.existsSync(path.join(ROOT,ref)),`literal asset exists: ${ref}`);

  function dirBytes(dir) {
    return fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?dirBytes(path.join(dir,e.name)):fs.statSync(path.join(dir,e.name)).size),0);
  }
  const assetBytes=dirBytes(path.join(ROOT,'assets'));
  ok(assetBytes < 35*1024*1024,`optimized asset bundle is under 35 MiB (${(assetBytes/1048576).toFixed(1)} MiB)`);

  function walk(dir) {
    return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  }
  function validImageHeader(file) {
    const b=fs.readFileSync(file);
    if (b.length < 16) return false;
    const ext=path.extname(file).toLowerCase();
    if (ext==='.png') return b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    if (ext==='.webp') return b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP';
    return true;
  }
  const images=walk(path.join(ROOT,'assets')).filter(f=>/\.(png|webp|jpg|jpeg|gif)$/i.test(f));
  images.forEach(f=>ok(validImageHeader(f),`image has a valid non-empty header: ${path.relative(ROOT,f)}`));
  const qctx = context(); run(qctx.ctx,'exercises.js');
  qctx.ctx.Exercises.all.forEach(e=>{
    const b=fs.readFileSync(path.join(ROOT,e.gif));
    ok(b.includes(Buffer.from('ANIM')) || b.includes(Buffer.from('ANMF')),`exercise media is animated WebP: ${e.id}`);
  });
  const h=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
  ok(h('assets/art/coach-desk.webp')!==h('assets/art/dispatch-day.webp'),'coach and dispatch artwork are not accidental duplicate files');
  ok(fs.statSync(path.join(ROOT,'assets/art/train-banner.webp')).size>1000,'training banner is a real image, not an empty placeholder');
  var routeSource=fs.readFileSync(path.join(ROOT,'journeys.js'),'utf8');
  ['inca-trail-banner.webp','inca-trail-leg-1.webp','inca-trail-leg-2.webp','inca-trail-leg-3.webp','inca-trail-leg-4.webp'].forEach(function (name) {
    ok(fs.statSync(path.join(ROOT,'assets/art/inca',name)).size>1000,`Inca Trail art is present and non-empty: ${name}`);
  });
  ok(routeSource.includes("banner: 'assets/art/inca/inca-trail-banner.webp'") &&
    [1,2,3,4].every(function (n) { return routeSource.includes("art: 'assets/art/inca/inca-trail-leg-" + n + ".webp'"); }),
    'Inca Trail banner and all four legs are wired to the production WebP assets');

  const cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
  ok(cloud.includes("DEFAULT_MODEL = 'claude-sonnet-5'") && cloud.includes("thinking = { type: 'disabled' }"),'Claude requests use the current Sonnet default with compact-response thinking disabled');
  ok(cloud.includes("'x-github-api-version': '2026-03-10'"),'GitHub requests pin the current API version used by this release');
  ok(cloud.includes('pushBusy') && cloud.includes('pushQueued') && cloud.includes('syncBusy'),'GitHub writes and full syncs are explicitly serialized');
  ok(app.includes('showLoadRecovery') && app.includes('save-damaged-data'),'startup has a blocking recovery path for unreadable local state');
  ok(app.includes('function restoreSheetScroll(key, top)') && app.includes('lastRenderedKey === key') && app.includes('if (keepScroll) restoreSheetScroll(key, keepScroll)'),
    'same-route state refreshes preserve the current sheet scroll position');
  ok(app.includes('renderQueued = true') && app.includes('setTimeout(function () {') && app.includes('Store emits synchronously'),
    'Store-driven renders are queued/coalesced instead of replacing the DOM inside the active click handler');
  ok(app.includes('e.preventDefault();'),'delegated app controls defensively suppress browser-native navigation/submission defaults');
  ok(app.includes("input.value = ''"),'sending a Together message clears the composer instead of leaving sent text editable');
  ok(app.includes('setInterval(function ()') && app.includes('60000') && app.includes('Cloud.pull(function () {})'),'visible app performs periodic read-only sync polling without requiring Settings');
  ok(cloud.includes('applyingRemote') && app.includes('Cloud.isApplyingRemote'),'remote pull writes do not trigger a push-back sync/commit loop');
  const screensText=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
  ok(screensText.includes('chat-thread') && screensText.includes('AUTO SYNC'),'Together renders a rolling conversation thread with explicit automatic-sync status');
  const htmlSources=[app,fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),fs.readFileSync(path.join(ROOT,'log.js'),'utf8'),fs.readFileSync(path.join(ROOT,'onboarding.js'),'utf8'),fs.readFileSync(path.join(ROOT,'ui.js'),'utf8')].join('\n');
  ok(!/href\s*=\s*["']#/i.test(htmlSources),'production controls contain no hash anchors that can jump the browser to the top');
  ok(!/<form\b/i.test(htmlSources),'production screens contain no implicit form submission path that can jump/reload the page');
  ok(log.includes("var lastPaintKind = ''") && log.includes("var bodyTop = oldBody ? oldBody.scrollTop : 0") && log.includes("if (!sameKind && first"),
    'logging-sheet repaints preserve modal scroll and do not refocus the first field on same-kind updates');
  const onboarding=fs.readFileSync(path.join(ROOT,'onboarding.js'),'utf8');
  ok(onboarding.includes("var lastRenderedStep = ''") && onboarding.includes('lastRenderedStep === key') && onboarding.includes('scroller.scrollTop = keepScroll || 0'),
    'same-step onboarding validation/selection repaints preserve their scroll position');

  const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
  ok(css.includes('@media (display-mode: standalone)') && css.includes('height: 100lvh'),'standalone PWA uses the full large viewport instead of the shorter dynamic viewport');
  ok(app.includes('navigator.standalone') && app.includes("classList.add('insync-standalone')"),'iOS standalone detection backs up the display-mode media query');
  ok(app.includes('window.visualViewport') && app.includes("addEventListener('resize', measureRest"),'sheet rest position is remeasured when the iOS viewport changes');
  ok(app.includes('function applyUpdateWhenSafe()') && app.includes("document.querySelector('.modal-card')") && app.includes('Store.session && Store.session()') && app.includes("['home','settings'].indexOf(root)<0"),
    'service-worker activation waits for a safe Home/Settings moment instead of reloading an active form or workout');

  const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
  ok(sw.includes("CACHE = 'insync-v10-25'") && sw.includes('e.waitUntil(fresh'),'service worker uses the refreshed v10 cache and stale-while-revalidate artwork');
  ok(sw.includes('return c.addAll(SHELL)'),'service-worker shell install fails safely instead of swallowing missing core files');

  const prodJs=fs.readdirSync(ROOT).filter(f=>f.endsWith('.js'));
  prodJs.forEach(f=>{
    const r=childProcess.spawnSync(process.execPath,['--check',path.join(ROOT,f)],{encoding:'utf8'});
    ok(r.status===0,`JavaScript syntax is valid: ${f}`);
  });
  const joined=prodJs.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
  ok(!/\bdebugger;|console\.(?:log|debug|trace)\s*\(|\bTODO\b|\bFIXME\b/.test(joined),'production JavaScript contains no debugger/log/TODO leftovers');
  ok(!joined.includes("action === 'seed'") && !joined.includes('Store.seed('),'production build contains no destructive demo-data action');

  const controlSources=[screensText,log,onboarding,fs.readFileSync(path.join(ROOT,'ui.js'),'utf8'),app].join('\n');
  const literalActions=[...new Set(Array.from(controlSources.matchAll(/data-action=[\"']([a-zA-Z0-9_-]+)[\"']/g),m=>m[1]))];
  const handledActions=new Set(Array.from(app.matchAll(/action\s*===\s*[\"']([a-zA-Z0-9_-]+)[\"']/g),m=>m[1]));
  ok(literalActions.every(a=>handledActions.has(a)),'every literal production data-action is wired to a delegated handler');
  ok(handledActions.has('allow-meal-again') && handledActions.has('allow-exercise-again'),'learned meal and movement dislikes can be explicitly allowed again');

  const literalRoutes=[...new Set(Array.from(controlSources.matchAll(/data-route=[\"']([a-zA-Z0-9_-]+)/g),m=>m[1]))];
  const tabMatch=app.match(/var TABS = \[([^\]]+)\]/), tabs=tabMatch ? Array.from(tabMatch[1].matchAll(/[\"']([a-zA-Z0-9_-]+)[\"']/g),m=>m[1]) : [];
  const routed=new Set(tabs.concat(Array.from(app.matchAll(/root\s*===\s*[\"']([a-zA-Z0-9_-]+)[\"']/g),m=>m[1])));
  ok(literalRoutes.every(r=>routed.has(r)),'every literal production data-route resolves to a rendered screen');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

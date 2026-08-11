'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(x,m){if(x){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'',protocol:'https:'},navigator:{},CustomEvent:function(){},UI:{esc:s=>String(s==null?'':s),asset:s=>s},window:null,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
function run(f){vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f})}
run('store.js'); run('nutrition.js'); run('exercises.js'); run('onboarding.js'); run('cloud.js');
const S=ctx.Store,N=ctx.Nutrition,C=ctx.Cloud; S.setProfileName('Robert'); S.setPartnerName('Lizzie'); S.setSecret('claudeKey','test-key');

const today=S.todayKey();
function meal(slot,k,p,name='Chicken bowl'){return {date:today,slot,name,kcal:k,protein:p,carbs:40,fat:15,items:[{name:'Chicken breast',weight:'6 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook.','Serve.']}}
let map={}; map[today+'|Breakfast']=meal('Breakfast',500,40);map[today+'|Lunch']=meal('Lunch',500,40);map[today+'|Dinner']=meal('Dinner',650,55);map[today+'|Snack']=meal('Snack',350,20);
let v=N.validateDay(map,today,{calories:2000,protein:155},{});
ok(v.ok,'deterministic day validator accepts four-slot day inside calorie range and protein target');
eq(v.totals.kcal,2000,'validator sums daily calories');eq(v.totals.protein,155,'validator sums daily protein');
let low=Object.assign({},map);low[today+'|Snack']=meal('Snack',100,5);v=N.validateDay(low,today,{calories:2000,protein:155},{});ok(!v.ok&&/calories/.test(v.reason)&&/protein/.test(v.reason),'validator rejects a mathematically underfed day');
let high=Object.assign({},map);high[today+'|Snack']=meal('Snack',600,20);v=N.validateDay(high,today,{calories:2000,protein:155},{});ok(!v.ok&&/above/.test(v.reason),'validator rejects a day above 105% calorie ceiling');
let missing=Object.assign({},map);delete missing[today+'|Snack'];v=N.validateDay(missing,today,{calories:2000,protein:155},{});ok(!v.ok&&v.missing[0]==='Snack','validator requires all four meal slots');
let forbidden=Object.assign({},map);forbidden[today+'|Dinner']=Object.assign({},meal('Dinner',650,55),{items:[{name:'Peanut sauce',weight:'2 tbsp'},{name:'Chicken',weight:'6 oz'}]});
v=N.validateDay(forbidden,today,{calories:2000,protein:155},{mustNot:'peanut'});ok(!v.ok&&/absolute exclusion/i.test(v.reason),'must-never-include field is a hard deterministic validator');

ok(N.isPantryItem('Extra virgin olive oil',{pantry:'olive oil, salt, pepper'}),'pantry matcher recognizes an on-hand staple');
ok(!N.isPantryItem('Chicken breast',{pantry:'olive oil, salt, pepper'}),'pantry matcher does not hide real grocery items');

const week=S.weekStart(today), prepMap={};
for(let i=0;i<7;i++){const d=S.shift(week,i);prepMap[d+'|Dinner']={name:'Dinner '+i,slot:'Dinner',prepMinutes:25,servings:1,items:[]};}
prepMap[week+'|Lunch']={name:'Batch lunch',slot:'Lunch',prepMinutes:40,servings:4,batchSource:true,items:[]};
const timeline=N.prepTimeline(prepMap,week);ok(timeline.length>=1,'meal-prep timeline turns planned cooking into dated tasks');ok(timeline[0].tasks.some(t=>t.name==='Batch lunch'),'prep timeline includes batch-prep source meal');

S.set('mealPrefs',Object.assign({},S.state().mealPrefs,{sharedDinnerShare:true}));
let payload=C.sharePayload();ok(payload.sharedDinnerProfile&&payload.sharedDinnerProfile.kcal>0&&payload.sharedDinnerProfile.protein>0,'Shared Dinner target crosses only when explicitly opted in');
S.set('mealPrefs',Object.assign({},S.state().mealPrefs,{sharedDinnerShare:false}));payload=C.sharePayload();eq(payload.sharedDinnerProfile,null,'Shared Dinner target stays private by default');
S.set('mealPrefs',Object.assign({},S.state().mealPrefs,{sharedDinnerShare:true}));
let incoming=C.sanitizePartnerPayload({schema:7,name:'Lizzie',initials:'L',date:today,updated:new Date().toISOString(),points:0,streak:0,sharedDinnerProfile:{name:'Lizzie',kcal:540,protein:42},history:{points:{},logged:{}}});
eq(incoming.sharedDinnerProfile.kcal,540,'partner sanitizer accepts bounded opt-in dinner calorie target');eq(incoming.sharedDinnerProfile.protein,42,'partner sanitizer accepts bounded opt-in dinner protein target');
S.set('partnerData',incoming);
let targets=N.sharedDinnerTargets();ok(targets.partner&&targets.partner.name==='Lizzie','local Shared Dinner planner can use partner opt-in target without seeing meal history');
let sd={name:'Chicken burrito bowls',items:[{name:'Chicken',weight:'12 oz'},{name:'Rice',weight:'2 cups'}],instructions:['Cook.'],portions:{me:{kcal:620,protein:52,servings:1,note:'larger rice portion'},partner:{kcal:540,protein:45,servings:.85,note:'smaller rice portion'}}};
ok(N.validateSharedDinner(sd).ok,'Shared Dinner validator accepts one recipe with two target-fitting portions');
sd.portions.partner.protein=10;ok(!N.validateSharedDinner(sd).ok,'Shared Dinner validator rejects a partner portion that misses protein');

// Cloud Shared Dinner generator must persist the user's portion as the loggable meal while keeping both portions attached.
const sharedDinnerFetch=(url,opts)=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({name:'Shared chicken bowls',cuisine:'Mexican',items:[{name:'Chicken',weight:'12 oz'},{name:'Rice',weight:'2 cups'}],instructions:['Cook chicken.','Build bowls.'],prepMinutes:25,portions:{me:{label:'Robert',servings:1.1,kcal:620,protein:52,note:'larger rice portion'},partner:{label:'Lizzie',servings:.9,kcal:540,protein:45,note:'smaller rice portion'}}})}]})});
function buildShared(){return new Promise(resolve=>C.buildSharedDinner(today,{name:'Chicken bowl',carbs:50,fat:15},(err,m)=>resolve({err,m})))}

// Full-week generator: one deliberately bad day must be repaired without rebuilding good days.
function weekPayload(badDate, repair){const meals=[],slots=['Breakfast','Lunch','Dinner','Snack'];for(let i=0;i<7;i++){const d=S.shift(week,i);for(const slot of slots){let kcal=slot==='Snack'?350:550,protein=slot==='Snack'?20:45;if(d===badDate&&!repair){kcal=slot==='Snack'?100:400;protein=slot==='Snack'?5:25}meals.push({date:d,slot,name:`${slot} ${i+1}`,kcal,protein,carbs:45,fat:15,servings:1,prepMinutes:20,items:[{name:'Chicken',weight:'6 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook.','Serve.']});}}return {meals};}
const badDate=S.shift(week,2);let calls=0,repairCalls=0;
const weekFetch=(url,opts)=>{calls++;const body=JSON.parse(opts.body),prompt=body.messages[0].content||'',repair=/Repair ONLY this one day/.test(prompt);if(repair)repairCalls++;const full=weekPayload(badDate,repair),chosen=full.meals.filter(m=>prompt.includes(`${m.date} ${m.slot}`));return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({meals:chosen})}]})});};
function plan(){return new Promise(resolve=>C.planMealsWeek(week,(err,m)=>resolve({err,m})))}
(async()=>{
 ctx.fetch=sharedDinnerFetch; const built=await buildShared(); if (built.err) console.error('Shared Dinner build error:', built.err.message || built.err);
 ok(!built.err&&built.m&&built.m.sharedDinner,'Cloud builds a complete Shared Dinner object');
 if (built.m && built.m.sharedDinner) {
   eq(Math.round(built.m.kcal),620,'Shared Dinner stores this phone owner portion as the loggable meal calories');
   eq(Math.round(built.m.sharedDinner.portions.partner.kcal),540,'Shared Dinner keeps the partner portion attached to the shared recipe');
 } else { ok(false,'Shared Dinner stores this phone owner portion as the loggable meal calories'); ok(false,'Shared Dinner keeps the partner portion attached to the shared recipe'); }
 ctx.fetch=weekFetch; const r=await plan();ok(!r.err,'weekly planner repairs a failing day and returns a verified week');ok(repairCalls>=1,'planner makes a targeted day-repair request instead of rebuilding the whole week');
 const verified=N.validateWeek(r.m,week,S.state().targets,S.state().mealPrefs);ok(verified.ok,'returned generated week passes deterministic seven-day verification');
 const cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8'),screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),log=fs.readFileSync(path.join(ROOT,'log.js'),'utf8'),index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
 ok(index.includes('<script src="nutrition.js"></script>')&&sw.includes("'nutrition.js'")&&sw.includes("insync-v10-33"),'Nutrition 2.0 engine is in production and offline shell');
 ok(screens.includes('Must never include')&&screens.includes('Pantry staples already on hand'),'planner exposes separate hard exclusions and pantry staples');
 ok(screens.includes('Plan verification')&&screens.includes('Prep timeline'),'planner exposes verified status and a cooking timeline');
 ok(screens.includes('Shared Dinner')&&app.includes("action === 'build-shared-dinner'")&&cloud.includes('function buildSharedDinner'),'Shared Dinner is wired from recipe UI through AI and deterministic validation');
 ok(log.includes('Fit it into today')&&log.includes("source: open.kind === 'restaurant'"),'Eating Out mode is target-aware and logged as a distinct source');
 ok(app.includes("version:'6.0.0-p6.0'")&&screens.includes('Version 6.0.0-p6.0'),'runtime and Settings identify Phase 5');
 console.log(`\n${passed} Nutrition 2.0 checks passed, ${failed} failed`);if(failed)process.exitCode=1;
})();

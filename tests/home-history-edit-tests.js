'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(x,m){if(x){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const log=fs.readFileSync(path.join(ROOT,'log.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const storeSrc=fs.readFileSync(path.join(ROOT,'store.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');

ok(screens.includes('function homeRhythmCard()')&&screens.includes('Morning check-in')&&screens.includes('Nightly review'),'Home has time-aware morning and nightly priority experiences');
ok(/homeRhythmCard\(\)[\s\S]*?data-rest-anchor/.test(screens)||screens.includes('data-rest-anchor'),'Home priority card is the pre-scroll rest anchor');
ok(screens.includes('data-action="log-morning"')&&screens.includes('data-route="reflection"'),'Home check-in cards open the existing morning and nightly flows');
ok(screens.includes('Edit this day')&&screens.includes('Forgot something?'),'Day history exposes a correction surface instead of being read-only');
['log-steps','log-morning','log-meal','start-session'].forEach(action=>ok(screens.includes(`data-action="${action}" data-date="`),`Day history wires ${action} to the selected date`));
ok(screens.includes('data-route="reflection/\'+esc(key)+\'"')||screens.includes("data-route=\"reflection/'+esc(key)+'\""),'Day history can reopen the selected night for editing');
ok(log.includes('open = { kind: kind, date: key, draft: draftFor(kind, key) }'),'Logging modal retains the date being corrected');
ok(log.includes('Store.setSteps(Math.round(nonneg(d.steps)), open.date)'),'Step corrections write to the selected historical date');
ok(log.includes('}, open.date);')&&log.includes('Store.addMeal(mealData, open.date)'),'Meals, workouts and morning corrections preserve the selected date');
ok(app.includes("var editDate = el.getAttribute('data-date') || ''"),'App forwards the selected day into logging actions');
ok(app.includes("Store.saveReflection(ta.value, el.getAttribute('data-date') || Store.todayKey())"),'Nightly review save respects a historical date');
ok(sw.includes("insync-v10-33")&&app.includes("6.0.0-p6.0")&&screens.includes('Version 6.0.0-p6.0'),'P5.2 runtime and cache are bumped for installed phones');

const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'',protocol:'https:'},navigator:{},CustomEvent:function(){},window:null};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(storeSrc,ctx,{filename:'store.js'});
const S=ctx.Store, past=S.shift(S.todayKey(),-1);
S.set('profile.startDate',past);
S.setSteps(12345,past); eq(S.day(past).steps,12345,'Historical steps can be added after the day has passed');
S.setMorning({weight:180,restingHr:62,sleepHr:7.5},past); eq(S.day(past).restingHr,62,'Historical morning data can be added');
S.setMorning({weight:null,restingHr:null,sleepHr:null},past); ok(S.day(past).weight===null&&S.day(past).restingHr===null&&S.day(past).sleepHr===null,'Existing morning values can be cleared while editing');
S.addMeal({name:'Forgotten dinner',slot:'Dinner',kcal:600,protein:40},past); eq(S.day(past).meals.length,1,'A missed meal can be added to a prior day');
S.addWorkout({name:'Forgotten session',minutes:30,exercises:[]},past); eq(S.day(past).workouts.length,1,'A missed workout can be added to a prior day');
S.saveReflection('Edited later.',past); eq(S.day(past).reflection,'Edited later.','A prior nightly review can be added or edited');

console.log(`\n${passed} Home/history correction checks passed, ${failed} failed`);
if(failed)process.exitCode=1;

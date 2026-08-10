'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(seed){const ls=new LS(seed),ctx={console,localStorage:ls,Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,CustomEvent:function(){},window:null};ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,'store.js'),'utf8'),ctx,{filename:'store.js'});return{ctx,ls}}

// A walk belongs to today even when there is no lifting session.
{
 const {ctx}=make(); const S=ctx.Store,today=S.todayKey();
 ok(S.startDailyWalk(today),'daily walk can start without a workout session');
 ok(S.state().days[today].walk.startedAt>0,'daily walk start timestamp is persisted on the day');
 S.state().days[today].walk.startedAt=Date.now()-65000; S.save();
 ok(S.dailyWalkElapsedMs(today)>=64000,'daily elapsed time derives from persisted wall-clock start time');
 ok(S.stopDailyWalk(today),'daily walk stops explicitly');
 ok(!S.dailyWalk(today).startedAt,'stopping clears only the live timestamp');
 ok(S.dailyWalkElapsedMs(today)>=64000,'stopping preserves accumulated duration');
 S.updateDailyWalk({pace:'16:10 /mi',elevation:'5% incline'},today);
 eq(S.dailyWalk(today).pace,'16:10 /mi','pace/speed is saved on the day');
 eq(S.dailyWalk(today).elevation,'5% incline','elevation/incline is saved on the day');
 ok(S.logged(today),'a timed walk counts as real day activity');
}

// Lock/reload safety: the day-level clock survives a full app reload.
{
 const first=make(),S=first.ctx.Store,today=S.todayKey();
 S.startDailyWalk(today); S.state().days[today].walk.startedAt=Date.now()-125000; S.save();
 const seed={}; first.ls.m.forEach((v,k)=>seed[k]=v);
 const second=make(seed),S2=second.ctx.Store;
 ok(S2.dailyWalk(today).startedAt>0,'running daily walk survives reload');
 ok(S2.dailyWalkElapsedMs(today)>=124000,'reloaded daily walk resumes from the original timestamp');
 S2.stopDailyWalk(today);
}

// Finishing the weights no longer owns or stops the daily walk.
{
 const {ctx}=make(); const S=ctx.Store,today=S.todayKey();
 S.startDailyWalk(today); S.state().days[today].walk.startedAt=Date.now()-90000; S.save();
 S.startSession('Upper',[{id:'press',name:'Press',sets:1,reps:'8',group:'Chest'}]);
 S.logSet(0,{weight:50,reps:8});
 const result=S.finishSession();
 ok(!!result,'lifting session can finish while the daily walk continues');
 ok(S.dailyWalk(today).startedAt>0,'finishing lifting does not silently stop the walk clock');
 ok(result.walk && result.walk.seconds>=89,'session summary snapshots the walk elapsed so far');
 S.stopDailyWalk(today); S.updateDailyWalk({pace:'3.6 mph',elevation:'8% incline'},today);
 eq(S.dailyWalk(today).pace,'3.6 mph','walk details can be completed after the lifting session ends');
}

// Past days support manual corrections but never a live historical timer.
{
 const {ctx}=make(); const S=ctx.Store,past=S.shift(S.todayKey(),-2);
 ok(S.setDailyWalkManual(past,42.5,'15:30 /mi','350 ft'),'past walk can be manually entered');
 ok(Math.abs(S.dailyWalkElapsedMs(past)-2550000)<5,'manual duration is stored in milliseconds');
 eq(S.dailyWalk(past).pace,'15:30 /mi','manual past pace is retained');
 ok(!S.startDailyWalk(past),'past date cannot start a live timer');
}

// Old workout-owned walks migrate to the calendar day automatically.
{
 const old='2026-08-01';
 const raw={profile:{name:'R',initials:'R',startDate:old},days:{[old]:{meals:[],steps:0,weight:null,restingHr:null,sleepHr:null,reflection:'',noteToPartner:'',workouts:[{name:'Upper',minutes:40,exercises:[],walk:{seconds:1800,pace:'3.2 mph',elevation:'4%'}}]}}};
 const {ctx}=make({'insync.v10':JSON.stringify(raw)}); const S=ctx.Store;
 eq(Math.round(S.dailyWalkElapsedMs(old)/1000),1800,'legacy completed workout walk migrates into the day-level walk');
 eq(S.dailyWalk(old).pace,'3.2 mph','legacy pace survives migration');
}

// An in-flight 5.5.2 session walk migrates without losing the live timestamp.
{
 const today=new Date(); const key=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
 const started=Date.now()-70000;
 const raw={profile:{name:'R',initials:'R',startDate:key},days:{[key]:{meals:[],steps:0,weight:null,reflection:'',workouts:[]}},session:{date:key,name:'Upper',startedAt:Date.now()-120000,walk:{startedAt:started,elapsedMs:0,pace:'',elevation:''},items:[]}};
 const {ctx}=make({'insync.v10':JSON.stringify(raw)}); const S=ctx.Store;
 ok(S.dailyWalk(key).startedAt>0,'legacy active session walk becomes a live day walk');
 ok(S.dailyWalkElapsedMs(key)>=69000,'legacy live elapsed time continues after migration');
}

// Malformed imported daily-walk data is bounded at the Store boundary.
{
 const {ctx}=make(); const S=ctx.Store,key=S.todayKey();
 const incoming=S.exportState();
 incoming.days[key]={meals:[],steps:0,weight:null,restingHr:null,sleepHr:null,reflection:'',noteToPartner:'',workouts:[],walk:{startedAt:-5,elapsedMs:999999999,pace:{bad:true},elevation:'x'.repeat(500)}};
 S.importState(incoming); const w=S.dailyWalk(key);
 eq(w.startedAt,0,'negative imported walk timestamp is rejected');
 eq(w.elapsedMs,0,'impossible imported daily-walk duration is rejected');
 eq(w.pace,'','non-string pace is rejected');
 ok(w.elevation.length<=80,'elevation is length bounded');
}

// Reset is deliberate and complete.
{
 const {ctx}=make(); const S=ctx.Store,today=S.todayKey();
 S.setDailyWalkManual(today,30,'3 mph','2%');
 ok(S.resetDailyWalk(today),'daily walk can be reset deliberately');
 eq(S.dailyWalkElapsedMs(today),0,'reset clears duration');
 eq(S.dailyWalk(today).pace,'','reset clears pace');
 eq(S.dailyWalk(today).elevation,'','reset clears elevation');
}

// Presentation/action wiring is part of the release contract.
{
 const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
 const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
 ok(screens.includes('dailyWalkCard(Store.todayKey(), false)'),'main Training screen always renders today’s walk card');
 ok(screens.includes("var body = dailyWalkCard(key, false)"),'training-day detail renders walk on lift, walk, rest and completed days');
 ok(screens.includes('Past days cannot run a live timer'),'historical day UI explains manual correction instead of offering a live timer');
 ok(screens.includes('This is available every day — lift, walk or recovery'),'walk card explicitly covers recovery days');
 for(const action of ['walk-start','walk-stop','walk-save','walk-manual-save','walk-reset']) ok(app.includes(`action === '${action}'`),`${action} has an app handler`);
 ok(app.includes('Store.dailyWalkElapsedMs')&&app.includes('setInterval(tick, 1000)'),'live day clock updates once per second without Store rerenders');
 ok(css.includes('.walk-clock')&&css.includes('.walk-state.live'),'walk timer retains dedicated InSync styling');
}

console.log(`\nDaily workout/recovery walk tests: ${passed} passed, ${failed} failed.`);
if(failed) process.exit(1);

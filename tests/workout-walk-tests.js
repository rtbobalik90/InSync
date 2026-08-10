'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(seed){const ls=new LS(seed),ctx={console,localStorage:ls,Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,CustomEvent:function(){},window:null};ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,'store.js'),'utf8'),ctx,{filename:'store.js'});return{ctx,ls}}

// A new workout owns a walk clock from the beginning.
{
 const {ctx}=make(); const S=ctx.Store;
 S.startSession('Upper',[{id:'press',name:'Press',sets:3,reps:'8-10',group:'Chest'}]);
 ok(!!S.session().walk,'new sessions initialize a workout-walk record');
 eq(S.sessionWalkElapsedMs(),0,'new workout walk starts at zero');
 ok(S.startSessionWalk(),'walk timer starts');
 ok(S.session().walk.startedAt>0,'running walk persists its start timestamp');
 S.session().walk.startedAt=Date.now()-65000; S.save();
 ok(S.sessionWalkElapsedMs()>=64000,'elapsed walk time is derived from saved start time rather than a screen interval');
 ok(S.stopSessionWalk(),'walk timer stops explicitly');
 ok(!S.session().walk.startedAt,'stopped walk clears the live timestamp');
 ok(S.session().walk.elapsedMs>=64000,'stopped walk keeps the accumulated duration');
 S.updateSessionWalk({pace:'16:10 /mi',elevation:'5% incline'});
 eq(S.session().walk.pace,'16:10 /mi','pace/speed is saved on the active workout');
 eq(S.session().walk.elevation,'5% incline','elevation/incline is saved on the active workout');
}

// Lock/reload safety: a running walk reloads from localStorage and keeps counting.
{
 const first=make(),S=first.ctx.Store;
 S.startSession('Lower',[{id:'leg',name:'Leg press',sets:3,reps:'10',group:'Legs'}]);
 S.startSessionWalk();
 S.session().walk.startedAt=Date.now()-125000; S.save();
 const seed={}; first.ls.m.forEach((v,k)=>seed[k]=v);
 const second=make(seed),S2=second.ctx.Store;
 ok(!!S2.session().walk.startedAt,'running walk survives a full app reload');
 ok(S2.sessionWalkElapsedMs()>=124000,'reloaded walk resumes from the original saved start time');
 S2.stopSessionWalk();
}

// Finishing never silently stops a live walk; once explicitly stopped it is archived with the workout.
{
 const {ctx}=make(); const S=ctx.Store, today=S.todayKey();
 S.startSession('Upper',[{id:'press',name:'Press',sets:1,reps:'8',group:'Chest'}]);
 S.logSet(0,{weight:50,reps:8});
 S.startSessionWalk();
 S.session().walk.startedAt=Date.now()-90000; S.save();
 eq(S.finishSession(),null,'a running walk blocks session finish instead of being silently stopped');
 S.stopSessionWalk();
 S.updateSessionWalk({pace:'3.6 mph',elevation:'8% incline'});
 const result=S.finishSession();
 ok(!!result,'session finishes after the user stops the walk');
 ok(result.walk && result.walk.seconds>=89,'finish summary includes the measured walk duration');
 eq(result.walk.pace,'3.6 mph','finish summary keeps pace/speed');
 eq(result.walk.elevation,'8% incline','finish summary keeps elevation/incline');
 const saved=S.state().days[today].workouts.slice(-1)[0];
 ok(saved.walk && saved.walk.seconds>=89,'historical workout stores the walk');
 eq(saved.walk.pace,'3.6 mph','historical workout keeps walk details');
}

// Reset is intentional and complete.
{
 const {ctx}=make(); const S=ctx.Store;
 S.startSession('Upper',[{id:'press',name:'Press',sets:1,reps:'8',group:'Chest'}]);
 S.startSessionWalk(); S.session().walk.startedAt=Date.now()-30000; S.save(); S.stopSessionWalk();
 S.updateSessionWalk({pace:'test pace',elevation:'test elevation'}); S.resetSessionWalk();
 eq(S.sessionWalkElapsedMs(),0,'reset clears walk duration');
 eq(S.session().walk.pace,'','reset clears pace');
 eq(S.session().walk.elevation,'','reset clears elevation');
}

// Imported/malformed walk metadata is bounded and cannot inject objects into string fields.
{
 const {ctx}=make(); const S=ctx.Store, key=S.todayKey();
 const incoming=S.exportState();
 incoming.days[key]={meals:[],steps:0,weight:null,restingHr:null,sleepHr:null,reflection:'',noteToPartner:'',workouts:[{name:'Upper',minutes:60,exercises:[],walk:{seconds:9999999,pace:{bad:true},elevation:'x'.repeat(500)}}]};
 S.importState(incoming);
 const w=S.state().days[key].workouts[0].walk;
 eq(w.seconds,0,'impossible imported walk duration is rejected');
 eq(w.pace,'','non-string pace metadata is rejected');
 ok(w.elevation.length<=80,'elevation metadata is length bounded');
}

// Presentation/action wiring is part of the release contract.
{
 const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
 const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
 ok(screens.includes('Workout walk')&&screens.includes('data-walk-clock'),'active session renders the walk block above exercises');
 ok(screens.includes('Pace / speed')&&screens.includes('Elevation / incline'),'stopped walk exposes pace and elevation fields');
 for(const action of ['walk-start','walk-stop','walk-save','walk-reset']) ok(app.includes(`action === '${action}'`),`${action} has an app handler`);
 ok(app.includes('bindSessionWalkClock()')&&app.includes('setInterval(tick, 1000)'),'running clock updates once per second without Store rerenders');
 ok(app.includes('finishPace')&&app.includes('finishElevation'),'finishing a stopped session commits typed walk details even without a separate save tap');
 ok(css.includes('.walk-clock')&&css.includes('.walk-state.live'),'walk timer has dedicated InSync styling');
}

console.log(`\nWorkout walk tests: ${passed} passed, ${failed} failed.`);
if(failed) process.exit(1);

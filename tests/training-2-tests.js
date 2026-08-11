'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(seed){
 const ctx={console,localStorage:new LS(seed),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,CustomEvent:function(){},window:null,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#train',protocol:'https:'},navigator:{onLine:true},UI:{esc:s=>String(s==null?'':s),asset:s=>s},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
 ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
 for(const f of ['store.js','exercises.js','training.js','insights.js','onboarding.js','badges.js','cloud.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
 return ctx;
}

// Production wiring and the expanded media library.
{
 const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
 ok(index.includes('<script src="training.js"></script>'),'Training 2.0 engine loads in production');
 ok(sw.includes("'training.js'")&&sw.includes("CACHE = 'insync-v10-31'"),'Training engine is available offline under the Phase 4 cache');
 const ids=['chest-fly-machine','face-pull','cable-lateral-raise','reverse-fly-machine','seated-leg-curl','hip-abduction-machine','hip-adduction-machine','dumbbell-rdl','step-ups','split-squat','dead-bug','pallof-press'];
 ids.forEach(id=>{
   const p=path.join(ROOT,'assets','exercises',id+'.webp');
   ok(fs.existsSync(p)&&fs.statSync(p).size>200,`new exercise has real media: ${id}`);
   const buf=fs.readFileSync(p); ok(buf.includes(Buffer.from('ANIM'))||buf.includes(Buffer.from('ANMF')),`new exercise media is animated WebP: ${id}`);
 });
}

// Gym/equipment profiles constrain the real exercise library.
{
 const c=make(),S=c.Store,T=c.Training;
 eq(T.gymLabel(T.profile().gymType),'Planet Fitness','default gym profile remains Planet Fitness');
 ok(T.profile().equipment.includes('Smith')&&!T.profile().equipment.includes('Barbell'),'Planet Fitness profile supports Smith but not a free barbell');
 S.set('trainingProfile.gymType','home');
 ok(T.equipmentAllows(c.Exercises.get('dumbbell-rdl')),'Home profile allows dumbbell movements');
 ok(!T.equipmentAllows(c.Exercises.get('horizontal-leg-press')),'Home profile blocks machine-only movements');
 S.set('trainingProfile.gymType','custom'); S.set('trainingProfile.customEquipment',['Cable']);
 ok(T.equipmentAllows(c.Exercises.get('face-pull'))&&!T.equipmentAllows(c.Exercises.get('dumbbell-rdl')),'Custom profile obeys selected equipment');
 S.set('trainingProfile.customEquipment',[]);
 ok(T.profile().equipment.includes('Bodyweight'),'empty custom profile retains a safe bodyweight baseline');
}

// Readiness is a tiny deterministic input, never a diagnosis or silent plan rewrite.
{
 const c=make(),S=c.Store,T=c.Training,k=S.todayKey();
 ok(S.setReadiness({energy:'low',soreness:'a-lot',pain:false,note:'Long day'},k),'readiness can be saved');
 eq(T.readiness(k).energy,'low','readiness energy persists');
 eq(T.readinessRecommendation(k).mode,'lighter','low energy plus high soreness proposes lighter volume');
 S.setReadiness({pain:true},k);
 eq(T.readinessRecommendation(k).kind,'caution','pain flag suppresses progression rather than diagnosing it');
 ok(/will not diagnose/i.test(T.readinessRecommendation(k).detail),'pain guidance explicitly stays non-medical');
}

// Lighter mode reduces volume and rest/effort data survives the session boundary.
{
 const c=make(),S=c.Store,T=c.Training;
 S.setReadiness({energy:'normal',soreness:'some',pain:false});
 const ex=c.Exercises.get('dumbbell-chest-press');
 S.startSession('Upper',[ex],{mode:'lighter'});
 eq(S.session().mode,'lighter','lighter session mode is explicit');
 eq(S.session().items[0].targetSets,Math.max(1,ex.sets-1),'lighter mode removes one working set rather than changing the exercise');
 ok(S.startRestTimer(120),'rest timer starts');
 ok(S.restRemainingMs()>118000,'rest timer persists an absolute end time');
 S.addRestTime(30); ok(S.restRemainingMs()>148000,'rest timer can add time');
 S.clearRestTimer(); eq(S.restRemainingMs(),0,'rest timer can be skipped');
 S.logSet(0,{weight:50,reps:10,effort:'right',rir:2});
 const done=S.finishSession(); ok(!!done,'session with effort data finishes normally');
 const w=S.state().days[S.todayKey()].workouts.slice(-1)[0],set=w.exercises[0].workingSets[0];
 eq(set.effort,'right','subjective effort persists into workout history');
 eq(set.rir,2,'RIR persists into workout history');
}

// Progression is code-derived, evidence-backed, and readiness-aware.
{
 const c=make(),S=c.Store,T=c.Training,id='dumbbell-chest-press',today=S.todayKey();
 S.setReadiness({energy:'normal',soreness:'none',pain:false},today);
 for(const offset of [-5,-2]) S.addWorkout({name:'Upper',minutes:35,exercises:[{id,name:'Dumbbell chest press',weight:50,reps:10,sets:3,workingSets:[{weight:50,reps:10,effort:'right',rir:2},{weight:50,reps:10,effort:'right',rir:2}]}]},S.shift(today,offset));
 let p=T.progressionFor(id); eq(p.kind,'load','two comfortable top-range sessions deterministically progress load'); eq(p.weight,55,'dumbbell progression uses conservative 5 lb increment');
 ok(p.evidence.some(x=>/Top of rep range twice/.test(x)),'progression includes a human-readable evidence trail');
 S.setReadiness({energy:'low',soreness:'some',pain:false},today); p=T.progressionFor(id); eq(p.kind,'hold','low readiness prevents a forced load increase');
}

// A hard top-range finish is held, not blindly progressed.
{
 const c=make(),S=c.Store,T=c.Training,id='dumbbell-chest-press',today=S.todayKey();
 S.setReadiness({energy:'normal',soreness:'none',pain:false},today);
 S.addWorkout({name:'Upper',minutes:30,exercises:[{id,name:'Dumbbell chest press',weight:50,reps:10,sets:2,workingSets:[{weight:50,reps:10,effort:'hard',rir:0}]}]},S.shift(today,-1));
 const p=T.progressionFor(id); eq(p.kind,'hold','hard / zero-RIR top set is repeated before load increases');
 ok(p.evidence.some(x=>/hard \/ 0-RIR/.test(x)),'hard-set hold explains the evidence');
}

// Deload is a proposal based on actual load/readiness and never silently activates.
{
 const c=make(),S=c.Store,T=c.Training,today=S.todayKey();
 for(let i=1;i<=5;i++){
   const k=S.shift(today,-i); S.setReadiness({energy:i<=3?'low':'normal',soreness:i<=3?'a-lot':'some',pain:false},k);
   S.addWorkout({name:'Session',minutes:40,exercises:[{id:'dumbbell-chest-press',name:'Dumbbell chest press',weight:50,reps:10,sets:2,workingSets:[{weight:50,reps:10,effort:'hard',rir:0},{weight:50,reps:9,effort:'hard',rir:0}]}]},k);
 }
 const d=T.deloadStatus(); ok(d.suggested,'repeated hard work/readiness strain can propose a deload');
 ok(/never apply it without your approval/i.test(d.detail),'deload proposal explicitly requires user approval');
 ok(!T.isDeloadWeek(today),'proposal alone does not activate a deload week');
 S.set('trainingProfile.deloadWeekOf',S.weekStart(today)); ok(T.isDeloadWeek(today),'approved deload week is an explicit persisted state');
}

// Structured walking uses one best distance source and prevents treadmill + steps double counting.
{
 const c=make(),S=c.Store,T=c.Training,today=S.todayKey();
 S.setSteps(10000,today); // 5.0 mi
 S.setDailyWalkManual(today,60,'','',{speedMph:4,inclinePct:5,distanceMiles:4,elevationFt:500});
 eq(T.walkDistanceMiles(today),4,'structured manual treadmill distance is retained');
 eq(T.movementMiles(today),5,'movement distance uses the stronger source rather than adding steps and treadmill miles');
 S.beginExpedition('inca-trail');
 // Beginning the leg snapshots today; move to the next day for a clean contribution test.
 const next=S.shift(today,1); // cannot add future walk through public API, use a prior date by shifting leg start instead.
 S.set('expedition.legStart',S.shift(today,-1)); S.set('expedition.legStartSteps',0); S.set('expedition.legStartWalkMiles',0);
 eq(S.legMine(),5,'expedition miles do not double count one walk recorded by both steps and structured distance');
}

// Cloud planner is equipment-aware and the UI exposes the full Phase 4 loop.
{
 const c=make(),S=c.Store,C=c.Cloud;
 S.set('trainingProfile.gymType','home');
 const bad=[{day:'Mon',name:'Upper',ex:['horizontal-leg-press','leg-extension','seated-leg-curl']},{day:'Tue',name:'Upper',ex:['dumbbell-chest-press','dumbbell-shoulder-press','lateral-raise']}];
 eq(C.validatePlan(bad,2,[]),null,'plan validator rejects movements unavailable at the configured gym');
 const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
 ok(screens.includes('Readiness')&&screens.includes('10 seconds')&&app.includes("action === 'set-readiness'"),'Train exposes and wires the readiness check');
 ok(screens.includes('data-rest-clock')&&app.includes("action === 'rest-add'")&&app.includes("action === 'rest-skip'"),'live rest timer has add/skip controls');
 ok(screens.includes('Why this?')&&screens.includes('progression-box'),'progression recommendation exposes its evidence');
 ok(screens.includes('Training setup')&&screens.includes('Planet Fitness')&&screens.includes("['planet-fitness','Planet Fitness']")&&screens.includes("['custom','Custom']"),'Settings exposes per-person gym/equipment setup');
 ok(cloud.includes('Training.availableExercises')&&cloud.includes('Training.equipmentAllows'),'Claude planning is constrained by the deterministic equipment engine');
 ok(cloud.includes('Training.gymLabel')&&!cloud.includes("Gym: Planet Fitness"),'training prompt describes the configured gym instead of hardcoding one location');
 ok(app.includes("version:'6.0.0-p5.7.2'")&&screens.includes('Version 6.0.0-p5.7.2'),'runtime and Settings identify Phase 4');
}

console.log(`\nTraining 2.0 checks: ${passed} passed, ${failed} failed.`); if(failed) process.exit(1);

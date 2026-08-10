'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},UI:{esc:s=>String(s==null?'':s),asset:s=>s,icon:()=>''},window:null,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
for(const f of ['store.js','exercises.js','insights.js','onboarding.js','badges.js','cloud.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const S=ctx.Store,I=ctx.Insights,C=ctx.Cloud;
S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('profile.startDate',S.shift(S.todayKey(),-21));S.set('onboarded',true);S.setSecret('claudeKey','test');S.set('frequency',5);
const week=S.weekStart(S.todayKey()),nextWeek=S.shift(week,7);
const valid5={days:[
 {day:'Mon',name:'Push',ex:['dumbbell-chest-press','shoulder-press-machine','triceps-pushdown']},
 {day:'Tue',name:'Pull',ex:['pulldown-machine','cable-row','biceps-curl-machine']},
 {day:'Wed',name:'Legs',ex:['horizontal-leg-press','leg-extension','calf-extension']},
 {day:'Fri',name:'Upper',ex:['push-ups','cable-row','lateral-raise']},
 {day:'Sat',name:'Lower',ex:['linear-leg-press','calf-extension','cable-hip-extension']}
],note:'Five real lifting days; the daily walk stays separate.'};
const invalidWalk={days:[
 {day:'Mon',name:'Push',ex:['dumbbell-chest-press','shoulder-press-machine','triceps-pushdown']},
 {day:'Tue',name:'Pull',ex:['pulldown-machine','cable-row','biceps-curl-machine']},
 {day:'Wed',name:'Legs',ex:['horizontal-leg-press','leg-extension','calf-extension']},
 {day:'Fri',name:'Upper',ex:['push-ups','cable-row','lateral-raise']},
 {day:'Sat',name:'Walk',detail:'Treadmill'}
]};
function mealPayload(w){const slots=['Breakfast','Lunch','Dinner','Snack'],meals=[];for(let i=0;i<7;i++)for(const slot of slots)meals.push({date:S.shift(w,i),slot,name:`${slot} ${i}`,cuisine:'American',proteins:['Chicken'],kcal:slot==='Snack'?200:600,protein:slot==='Snack'?20:45,carbs:50,fat:15,servings:1,prepMinutes:20,items:[{name:'Chicken breast',weight:'6 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook ingredients.','Serve.']});return{meals}}
function response(obj){return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({content:[{type:'text',text:JSON.stringify(obj)}]})});}
(async()=>{
 eq(C.validatePlan(invalidWalk.days,5,[]),null,'a walk-only day can no longer consume one of the selected gym days');
 ok(!!C.validatePlan(valid5.days,5,[]),'five-day lifting split is accepted when recovery spacing is valid');
 S.set('futurePlan',[]);S.set('futurePlanMeta',{});
 let calls=0;
 ctx.fetch=()=>{calls++;return response(calls===1?invalidWalk:valid5)};
 let retry=await new Promise(r=>C.writePlan(nextWeek,(err,v)=>r({err,v})));
 ok(!retry.err,'training writer repairs one invalid Claude plan automatically');
 eq(calls,2,'invalid training output receives exactly one automatic repair attempt');
 eq(S.state().futurePlan.length,5,'repaired future plan keeps all five lifting days');
 ok(S.state().futurePlan.every(x=>!/walk|cardio/i.test(x.name||'')),'staged training contains no walk placeholder');
 eq(S.planFor(nextWeek).name,'Push','future-date plan lookup resolves the staged plan before Monday promotion');

 // Reset staged pieces to exercise the resumable combined setup path.
 S.set('futurePlan',[]);S.set('futurePlanMeta',{});S.set('mealPlan',{});S.set('weeklyGoals',{});
 let mealCalls=0,trainCalls=0;
 ctx.fetch=(url,opts)=>{
   const body=JSON.parse(opts.body||'{}');
   const prompt=((body.messages||[])[0]||{}).content||'';
   if(prompt.includes('for a complete seven-day HOME-COOKED meal-prep plan')){mealCalls++;const full=mealPayload(nextWeek);return response({meals:full.meals.filter(m=>prompt.includes(`${m.date} ${m.slot}`))});}
   if(prompt.includes("training week for the Monday")){trainCalls++;return response(invalidWalk);}
   return response({});
 };
 const failedSetup=await new Promise(r=>C.setupNextWeek(week,()=>{},(err,st)=>r({err,st})));
 ok(!!failedSetup.err&&failedSetup.err.stage==='training','combined setup reports training as the failed half');
 eq(failedSetup.st.mealCount,28,'successful meal half is committed even when training fails afterward');
 eq(mealCalls,4,'meal week is generated in four bounded batches on the failed setup');
 eq(trainCalls,2,'failed training half uses its one built-in repair attempt');

 // Retry: the 28 saved meals must be reused rather than regenerated.
 ctx.fetch=(url,opts)=>{
   const body=JSON.parse(opts.body||'{}');
   const prompt=((body.messages||[])[0]||{}).content||'';
   if(prompt.includes('for a complete seven-day HOME-COOKED meal-prep plan')){mealCalls++;const full=mealPayload(nextWeek);return response({meals:full.meals.filter(m=>prompt.includes(`${m.date} ${m.slot}`))});}
   if(prompt.includes('training week for the Monday')){trainCalls++;return response(valid5);}
   return response({});
 };
 const fixed=await new Promise(r=>C.setupNextWeek(week,()=>{},(err,st)=>r({err,st})));
 ok(!fixed.err&&fixed.st.meals&&fixed.st.training,'retry completes only the missing half and leaves next week fully ready');
 eq(mealCalls,4,'retry does not regenerate the already-saved 28 meals');
 eq(trainCalls,3,'retry makes one additional training request and succeeds');
 eq(I.goalProgress(nextWeek).length,2,'successful next-week setup creates the two measurable weekly goals');
 const trainingGoal=I.suggestedGoals(nextWeek).find(g=>g.id==='training-sessions');
 eq(trainingGoal&&trainingGoal.target,5,'weekly training goal matches five gym days now that walking is separate');

 const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8'),onboarding=fs.readFileSync(path.join(ROOT,'onboarding.js'),'utf8');
 ok(app.includes('Cloud.setupNextWeek(baseWeek')&&app.includes('retry only what is missing'),'button uses resumable next-week coordinator with partial-failure guidance');
 ok(screens.includes("dailyWalkCard(Store.todayKey(), 'train')")&&screens.includes('data-rest-anchor'),'Train landing intentionally fits the compact daily walk and This week card in the opening view');
 ok(screens.includes('futureTrainingCard()')&&screens.includes('Your walk stays available every day and does not replace a gym session'),'Train exposes a visible staged next-week training preview');
 ok(screens.includes('scrim:')&&ui.includes('opts.scrim || SCRIM'),'Train can lower its gradient without changing every other screen');
 ok(onboarding.includes('walking is tracked separately every day')||onboarding.includes('Walking is tracked separately every day'),'onboarding no longer teaches that a walk replaces a gym day');

 // Readiness must be based on complete content, not a stale metadata stamp.
 S.set('futurePlan',[]);S.set('futurePlanMeta',{writtenBy:'coach',weekOf:nextWeek,note:'stale'});
 let staleStatus=I.nextWeekStatus(week);
 ok(!staleStatus.training,'stale future-plan metadata cannot masquerade as a ready training week');
 let junkMeals={};for(let z=0;z<28;z++)junkMeals[nextWeek+'|Junk'+z]={date:nextWeek,slot:'Snack',name:'Junk'};
 S.set('mealPlan',junkMeals);staleStatus=I.nextWeekStatus(week);
 ok(!staleStatus.meals&&staleStatus.mealCount===0,'28 arbitrary meal rows cannot masquerade as the required 28 dated slots');
 console.log(`\n${passed} next-week/train checks passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

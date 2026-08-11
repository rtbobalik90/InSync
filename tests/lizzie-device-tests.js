'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),window:null};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
for(const f of ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','ui.js','exercises.js','insights.js','onboarding.js','badges.js','cloud.js','foods.js','screens.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const S=ctx.Store,I=ctx.Insights,O=ctx.Onboarding,C=ctx.Cloud,Sc=ctx.Screens;
S.setProfileName('Lizzie'); S.setPartnerName('Robert'); S.set('profile.sex','Female'); S.set('profile.age',34); S.set('profile.heightIn',65);
S.set('profile.startDate',S.shift(S.todayKey(),-30)); S.set('goal','lose-fat'); S.set('frequency',4); S.set('onboarded',true); S.setSecret('claudeKey','test-key');
S.set('targets',O.targetsFor('lose-fat',165,65,34,'Female',4));
S.set('mealPrefs',{cuisines:['Mexican','Italian'],proteins:['Chicken','Turkey'],likes:'rice bowls, pasta, mild spice',avoid:'mushrooms, olives',lunchPrepDays:4,dinnerLeftovers:true,cookDays:['Sun','Tue','Thu']});

const week=S.weekStart(S.todayKey()), next=S.shift(week,7);
const valid4={days:[
 {day:'Mon',name:'Push',ex:['dumbbell-chest-press','shoulder-press-machine','triceps-pushdown']},
 {day:'Tue',name:'Legs',ex:['horizontal-leg-press','leg-extension','calf-extension']},
 {day:'Thu',name:'Pull',ex:['pulldown-machine','cable-row','biceps-curl-machine']},
 {day:'Fri',name:'Lower',ex:['linear-leg-press','calf-extension','cable-hip-extension']}
],note:'Four lifting days with the daily walk tracked separately.'};
function requestedMeals(prompt){
 const pairs=[...prompt.matchAll(/(\d{4}-\d{2}-\d{2}) (Breakfast|Lunch|Dinner|Snack)/g)];
 const seen=new Set(); return pairs.filter(m=>{const k=m[1]+'|'+m[2];if(seen.has(k))return false;seen.add(k);return true}).map((m,i)=>({
  date:m[1],slot:m[2],name:`Lizzie ${m[2]} ${m[1]}`,cuisine:i%2?'Italian':'Mexican',proteins:['Chicken'],
  kcal:m[2]==='Snack'?180:520,protein:m[2]==='Snack'?18:38,carbs:48,fat:14,servings:1,prepMinutes:22,
  items:[{name:'Chicken breast',weight:'5 oz'},{name:'Rice',weight:'1 cup'},{name:'Vegetables',weight:'1 cup'}],
  instructions:['Cook the protein and vegetables.','Portion with the starch and serve.']
 }));
}
function response(text,stop='end_turn'){return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:stop,content:[{type:'text',text}]})});}
let mealRequests=0, trainingRequests=0, firstBatchAttempts=0, prompts=[];
ctx.fetch=(url,opts)=>{
 const body=JSON.parse(opts.body||'{}'), prompt=((body.messages||[])[0]||{}).content||''; prompts.push(prompt);
 if(prompt.includes('for a complete seven-day HOME-COOKED meal-prep plan')){
   mealRequests++;
   if(prompt.includes('batch 1 of 4')){
     firstBatchAttempts++;
     if(firstBatchAttempts===1) return response('{"meals":[{"date":"'+next+'"','max_tokens');
   }
   return response(JSON.stringify({meals:requestedMeals(prompt)}));
 }
 if(prompt.includes('training week for the Monday')){trainingRequests++;return response(JSON.stringify(valid4));}
 return response('{}');
};

(async()=>{
 const femaleTargets=O.targetsFor('lose-fat',165,65,34,'Female',4);
 ok(Number.isFinite(femaleTargets.calories)&&femaleTargets.calories>0,'Lizzie female onboarding targets calculate to a finite calorie target');
 ok(Number.isFinite(femaleTargets.protein)&&femaleTargets.protein>0,'Lizzie female onboarding targets calculate to a finite protein target');
 eq(S.state().profile.name,'Lizzie','the device identity is Lizzie');
 eq(S.partnerName(),'Robert','the partner identity remains Robert');

 const stages=[];
 const setup=await new Promise(r=>C.setupNextWeek(week,(stage,detail)=>stages.push({stage,detail}), (err,st)=>r({err,st})));
 ok(!setup.err,'Lizzie next-week setup survives a truncated first meal reply and completes');
 eq(firstBatchAttempts,2,'the truncated first meal batch is automatically retried once');
 eq(mealRequests,5,'four bounded meal batches plus one repair request complete Lizzie meal week');
 eq(trainingRequests,1,'training is requested once after meals finish');
 eq(I.nextWeekStatus(week).mealCount,28,'Lizzie has all 28 next-week meal slots after setup');
 ok(I.nextWeekStatus(week).meals,'Lizzie meal week is semantically ready');
 ok(I.nextWeekStatus(week).training,'Lizzie training week is semantically ready');
 eq(S.state().futurePlan.length,4,'Lizzie receives exactly her four selected lifting days');
 ok(stages.some(x=>x.stage==='meals-progress'&&x.detail&&x.detail.batch===4),'setup exposes progress through all four meal batches');
 ok(prompts.filter(p=>p.includes('meal-prep plan')).every(p=>p.includes('for Lizzie')),'every meal-planning prompt is written for Lizzie');
 ok(prompts.filter(p=>p.includes('training week')).every(p=>p.includes("Write Lizzie's training week")),'the training prompt is written for Lizzie');
 ok(!prompts.filter(p=>p.includes('meal-prep plan')||p.includes('training week')).some(p=>/Write Robert's|plan for Robert/.test(p)),'Robert is never accidentally treated as the owner of Lizzie device planning');

 const payload=C.sharePayload();
 eq(payload.name,'Lizzie','Lizzie sync payload identifies Lizzie as the sender');
 ok(!Object.prototype.hasOwnProperty.call(payload,'mealPrefs'),'Lizzie private meal preferences do not leak into partner sync');
 ok(!Object.prototype.hasOwnProperty.call(payload,'mealPlan'),'Lizzie full meal plan does not leak into partner sync');

 const routes=[
  ['home','home'],['coach','coach'],['nutrition','nutrition'],['train','train'],['together','together'],['settings','settings'],
  ['body','body'],['photos','photos'],['capture','capture'],['record','record/unknown'],['workouts','workouts'],['cardio','cardio'],
  ['records','records'],['badges','badges'],['reflection','reflection'],['trends','trends'],['planner','planner'],
  ['plannedMeal','planned-meal/2099-01-01/Breakfast'],['cookbook','cookbook'],['history','history'],['calendar','calendar'],
  ['dayHistory','day-history/'+S.todayKey()],['weeklyReview','weekly-review'],['exercises','exercises'],
  ['exercise','exercise/dumbbell-chest-press'],['trainDay','trainday/'+S.todayKey()],['notifications','notifications'],['meal','meal/unknown'],['handshake','handshake']
 ];
 routes.forEach(([fn,hash])=>{ctx.location.hash='#'+hash;try{const html=Sc[fn]();ok(typeof html==='string'&&(fn==='meal'||html.length>20),`Lizzie ${fn} screen renders from her state`)}catch(e){console.error(e.stack||e);ok(false,`Lizzie ${fn} screen renders from her state`)}});

 // Train stays a weekly overview; day-specific walk/readiness live inside the selected day.
 S.startDailyWalk(S.todayKey()); S.stopDailyWalk(S.todayKey());
 ctx.location.hash='#train'; const train=Sc.train();
 ctx.location.hash='#trainday/'+S.todayKey(); const trainDay=Sc.trainDay();
 ok(train.includes('This week')&&!train.includes('Walk timer')&&train.includes('aria-label="Next training week"')&&trainDay.includes('Walk timer'),'Lizzie Train keeps the overview clean while the selected day owns walk/readiness');

 const prod=['app.js','cloud.js','screens.js','store.js','insights.js','onboarding.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
 ok(!/\bRobert\b/.test(prod),'production app logic contains no hard-coded Robert identity');
 console.log(`\n${passed} Lizzie-device checks passed, ${failed} failed`); if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

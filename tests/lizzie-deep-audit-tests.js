'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
function near(a,b,t,m){ok(Math.abs(a-b)<=t,`${m} (got ${a}, expected ${b}±${t})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function makeCtx(seed={}){
 const ctx={console,localStorage:new LS(seed),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),window:null};
 ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);return ctx;
}
function run(ctx,f){vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f})}
function load(ctx,files=['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','ui.js','exercises.js','insights.js','onboarding.js','badges.js','cloud.js','foods.js','screens.js']){files.forEach(f=>run(ctx,f));return ctx}
function localToday(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function validPlan4(){return [
 {day:'Mon',name:'Push',ex:['dumbbell-chest-press','shoulder-press-machine','triceps-pushdown']},
 {day:'Tue',name:'Legs',ex:['horizontal-leg-press','leg-extension','calf-extension']},
 {day:'Thu',name:'Pull',ex:['pulldown-machine','cable-row','biceps-curl-machine']},
 {day:'Fri',name:'Lower',ex:['linear-leg-press','calf-extension','cable-hip-extension']}
]}
function fullMealMap(S,week){const out={};for(let i=0;i<7;i++){const date=S.shift(week,i);for(const slot of ['Breakfast','Lunch','Dinner','Snack'])out[date+'|'+slot]={date,slot,name:`${slot} ${date}`,kcal:slot==='Snack'?180:520,protein:slot==='Snack'?18:38,carbs:45,fat:14,items:[{name:'Chicken',weight:'5 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook ingredients.','Serve.'],source:'coach'};}return out}
function mealsForPrompt(prompt){const pairs=[...prompt.matchAll(/(\d{4}-\d{2}-\d{2}) (Breakfast|Lunch|Dinner|Snack)/g)],seen=new Set();return pairs.filter(m=>{const k=m[1]+'|'+m[2];if(seen.has(k))return false;seen.add(k);return true}).map(m=>({date:m[1],slot:m[2],name:`${m[2]} ${m[1]}`,cuisine:'American',proteins:['Chicken'],kcal:m[2]==='Snack'?180:520,protein:m[2]==='Snack'?18:38,carbs:45,fat:14,servings:1,prepMinutes:20,items:[{name:'Chicken',weight:'5 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook ingredients.','Serve.']}))}
function response(text,stop='end_turn'){return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:stop,content:[{type:'text',text}]})})}

(async()=>{
 // 1. Reload/migration is genuinely neutral to Lizzie's valid choices.
 const today=localToday();
 const seedState={profile:{name:'Lizzie',initials:'LI',sex:'Female',age:34,heightIn:65,startDate:today,startWeight:118},goal:'strong',days:{},onboarded:true,
  coachPending:true,verseCache:{date:today,index:2,why:'Endurance fits the week.'},
  chapters:[{from:today,to:today,text:'A valid chapter.'},{from:'bogus',to:today,text:'bad'},{text:'missing dates'}]};
 let ctx=makeCtx({'insync.v10':JSON.stringify(seedState)});run(ctx,'store.js');let S=ctx.Store;
 eq(S.state().goal,'strong','Get stronger survives a real app reload instead of silently becoming lose-fat');
 eq(S.state().coachPending,false,'an in-flight Coach spinner is cleared on reload because the network request cannot resume');
 ok(S.verse().chosen && S.verse().why==='Endurance fits the week.','the Claude-chosen daily verse survives reload with its rationale');
 eq(S.state().chapters.length,1,'malformed chapter history is removed without breaking Coach');
 eq(S.state().profile.startWeight,118,'starting weight remains a bounded part of the profile state');

 // 2. Identity/initials are symmetric for one-word names and partner changes cannot leak old partner data.
 S.setProfileName('Lizzie');S.setPartnerName('Robert');
 eq(S.state().profile.initials,'LI','single-word owner name keeps two-letter initials after Settings edit');
 eq(S.state().partner.initials,'RO','single-word partner name keeps two-letter initials after Settings edit');
 S.set('partnerData',{name:'Robert',date:today,points:7});S.set('partnerHistory',{[today]:7});S.set('partnerLoggedHistory',{[today]:true});S.set('partnerLegMiles',4.2);
 S.set('invite',{routeId:'inca',routeName:'Inca',from:'partner',date:today,rev:1});S.set('reactionsGiven',{['a:robert:'+today+':score']:'heart'});S.set('partnerNoteSeen','old-note');
 S.setPartnerName('ROBERT');
 ok(!!S.state().partnerData && S.state().partnerHistory[today]===7,'capitalization-only partner edit keeps the same partner cache');
 S.setPartnerName('Mark');
 eq(S.state().partnerData,null,'changing partner identity clears cached data from the previous partner');
 eq(Object.keys(S.state().partnerHistory).length,0,'changing partner identity clears old partner score history');
 eq(S.state().partnerLegMiles,0,'changing partner identity clears old partner expedition miles');
 eq(S.state().invite,null,'changing partner identity clears a handshake belonging to the old partner');
 eq(Object.keys(S.state().reactionsGiven).length,0,'changing partner identity clears reactions tied to old partner activity ids');
 eq(S.identityKey(' Lizzie Smith '),'lizzie-smith','Store exposes the same normalized owner identity used by private sync filenames');
 S.set('connections.lastSync','2026-08-09T12:00:00.000Z');S.setProfileName('LIZZIE');
 ok(!!S.state().connections.lastSync,'case-only owner name edit keeps the valid sync-health timestamp');
 S.setProfileName('Elizabeth');
 eq(S.state().connections.lastSync,'','material owner rename clears the stale sync-health success stamp');

 // 3. kg is a display/input preference; the stored canonical pounds remain correct.
 S.set('units.weight','kg');
 near(S.weightNum(165,1),74.8,0.1,'165 stored pounds displays as about 74.8 kg');
 near(S.weightToLb(74.8),164.9,0.2,'74.8 kg typed by the user converts back to canonical pounds');
 eq(S.fmtLift(100),'45.4 kg','lift history follows the selected kg unit');
 S.set('units.energy','kJ');
 eq(S.energyNum(2000),8368,'2000 stored kcal displays as 8368 kJ');
 eq(S.energyToKcal(8368),2000,'8368 kJ typed by the user converts back to 2000 canonical kcal');
 eq(S.fmtEnergy(500),'2,092 kJ','energy formatter follows the selected kJ unit');

 // 4. Prepared-week readiness rejects corrupt/invented content instead of skipping generation.
 ctx=load(makeCtx());S=ctx.Store;const I=ctx.Insights,C=ctx.Cloud;
 S.setProfileName('Lizzie');S.setPartnerName('Robert');S.set('profile.startDate',S.shift(S.todayKey(),-20));S.set('onboarded',true);S.set('frequency',4);
 const base=S.weekStart(S.todayKey()),next=S.shift(base,7);
 let placeholder={};for(let i=0;i<7;i++){let d=S.shift(next,i);for(const slot of ['Breakfast','Lunch','Dinner','Snack'])placeholder[d+'|'+slot]={date:d,slot,name:'Placeholder',kcal:500,protein:30,carbs:40,fat:10};}
 S.set('mealPlan',placeholder);eq(I.nextWeekStatus(base).mealCount,0,'28 meal shells without ingredients/method do not masquerade as a finished meal week');
 S.set('mealPlan',fullMealMap(S,next));ok(I.nextWeekStatus(base).meals,'28 complete dated recipes do count as a prepared meal week');
 const badPlan=validPlan4();badPlan[0]={day:'Mon',name:'Push',ex:['invented-machine','shoulder-press-machine','triceps-pushdown']};
 S.set('futurePlan',badPlan);S.set('futurePlanMeta',{writtenBy:'coach',weekOf:next});ok(!I.nextWeekStatus(base).training,'invented exercise ids cannot make staged training look ready');
 S.set('futurePlan',validPlan4());S.set('exercisePrefs',{dislikedIds:['dumbbell-chest-press'],discomfortIds:[],swapLog:[]});ok(!I.nextWeekStatus(base).training,'a staged plan is no longer ready after the user marks one of its movements as disliked');
 S.set('exercisePrefs',{dislikedIds:[],discomfortIds:[],swapLog:[]});ok(I.nextWeekStatus(base).training,'a valid four-day staged lifting plan is ready');

 // 5. A stale staged week is never promoted after the phone has been closed too long.
 const staleWeek=S.shift(base,-7);S.set('futurePlan',validPlan4());S.set('futurePlanMeta',{writtenBy:'coach',weekOf:staleWeek});
 ok(!I.activateScheduledPlan(),'an expired staged plan is not promoted as the current training week');
 eq(S.state().futurePlan.length,0,'expired staged plan is discarded instead of lingering');
 S.set('futurePlan',validPlan4());S.set('futurePlanMeta',{writtenBy:'coach',weekOf:base});
 ok(I.activateScheduledPlan(),'a valid staged plan promotes when its exact Monday arrives');eq(S.state().plan.length,4,'promoted current plan retains all lifting days');

 // 6. Setup persists completed meal batches and resumes only the unfinished work.
 S.set('futurePlan',[]);S.set('futurePlanMeta',{});S.set('mealPlan',{});S.setSecret('claudeKey','test-key');S.set('frequency',4);
 let phase=1,mealCalls1=0,mealCalls2=0,trainCalls=0,batch3Failures=0;
 ctx.fetch=(url,opts)=>{const body=JSON.parse(opts.body||'{}'),prompt=((body.messages||[])[0]||{}).content||'';
  if(prompt.includes('HOME-COOKED meal-prep plan')){
    if(phase===1)mealCalls1++;else mealCalls2++;
    if(phase===1 && prompt.includes('batch 3 of 4')){batch3Failures++;return response('{not-json');}
    return response(JSON.stringify({meals:mealsForPrompt(prompt)}));
  }
  if(prompt.includes('training week for the Monday')){trainCalls++;return response(JSON.stringify({days:validPlan4(),note:'Four lifting days.'}));}
  return response('{}');
 };
 let first=await new Promise(r=>C.setupNextWeek(base,()=>{},(err,st)=>r({err,st})));
 ok(!!first.err,'a twice-broken third meal batch surfaces a failure rather than saving a fake complete week');
 eq(batch3Failures,2,'the failed meal batch receives exactly one automatic repair attempt');
 eq(I.nextWeekStatus(base).mealCount,16,'the first two validated meal batches remain persisted after the later batch fails');
 eq(trainCalls,0,'training is not generated until the meal week is actually complete');
 phase=2;
 let second=await new Promise(r=>C.setupNextWeek(base,()=>{},(err,st)=>r({err,st})));
 ok(!second.err,'retry completes the previously partial Lizzie week');
 eq(mealCalls2,2,'retry skips finished Monday-through-Thursday batches and requests only the two missing meal batches');
 eq(trainCalls,1,'training is generated once after resumed meals finish');
 eq(I.nextWeekStatus(base).mealCount,28,'resumed setup finishes all 28 meal slots');ok(I.nextWeekStatus(base).training,'resumed setup finishes the lifting plan too');

 // 7. Target proposals support smaller adult goals and speak the user's chosen unit.
 ctx=load(makeCtx());S=ctx.Store;const C2=ctx.Cloud;
 S.setProfileName('Lizzie');S.setPartnerName('Robert');S.set('profile.startDate',S.shift(S.todayKey(),-20));S.set('onboarded',true);S.setSecret('claudeKey','key');
 for(let i=0;i<14;i++){const d=S.day(S.shift(S.todayKey(),-i));d.meals=[{name:'Day',slot:'Dinner',kcal:1700,protein:120,carbs:100,fat:50}];d.steps=9000;d.weight=118;S.save();}
 ctx.fetch=(u,o)=>response(JSON.stringify({calories:1700,protein:120,steps:9000,weightGoal:110,why:'The recent trend supports this target.'}));
 let prop=await new Promise(r=>C2.proposeTargets((err,p)=>r({err,p})));
 ok(!prop.err,'a coach target proposal can return a weight goal below the old 120-lb floor');near(S.state().proposal.targets.weightGoal,110,0.1,'110 lb proposal is stored without silently falling back');
 S.set('units.weight','kg');let kgPrompt='';
 ctx.fetch=(u,o)=>{kgPrompt=JSON.parse(o.body).messages[0].content;return response(JSON.stringify({calories:1700,protein:120,steps:9000,weightGoal:50,why:'The recent trend supports a 50 kg target.'}))};
 prop=await new Promise(r=>C2.proposeTargets((err,p)=>r({err,p})));
 ok(!prop.err && /kg/.test(kgPrompt),'kg user sends weight evidence and target units to the coach in kg');near(S.state().proposal.targets.weightGoal,110.2,0.3,'50 kg coach proposal converts back to canonical pounds before storage');
 S.set('units.energy','kJ');let energyPrompt='';
 ctx.fetch=(u,o)=>{energyPrompt=JSON.parse(o.body).messages[0].content;return response(JSON.stringify({calories:7100,protein:120,steps:9000,weightGoal:50,why:'The recent trend supports these targets.'}))};
 prop=await new Promise(r=>C2.proposeTargets((err,p)=>r({err,p})));
 ok(!prop.err && /7100|kJ/.test(energyPrompt)&&energyPrompt.includes('kJ'),'kJ user sends target evidence to the coach in the selected energy unit');
 near(S.state().proposal.targets.calories,1697,2,'coach energy proposal returned in kJ converts back to canonical kcal before storage');

 // 7b. Every supported female goal and training frequency remains internally valid.
 ['lose-fat','build','hold','strong'].forEach(function(goal){
   var t=ctx.Onboarding.targetsFor(goal,118,65,34,'Female',4);
   ok(Number.isFinite(t.calories)&&t.calories>=1400&&Number.isFinite(t.protein)&&t.protein>0&&Number.isFinite(t.weightGoal), 'female '+goal+' onboarding targets remain finite and bounded');
 });
 [2,3,4,5,6].forEach(function(freq){
   S.set('frequency',freq);
   var plan=ctx.Onboarding.withDetail(ctx.Onboarding.plans[freq]);
   ok(!C2.validateTrainingPlan(plan), freq+'-day built-in training plan satisfies the same validator used for Lizzie future weeks');
 });
 var currentPlan=ctx.Onboarding.withDetail(ctx.Onboarding.plans[4]), prefNext=S.shift(S.weekStart(S.todayKey()),7);
 S.set('plan',currentPlan);S.set('futurePlan',ctx.Onboarding.withDetail(ctx.Onboarding.plans[4]));S.set('futurePlanMeta',{weekOf:prefNext,writtenBy:'coach'});S.set('weeklyGoals',{[prefNext]:[{id:'training-sessions',label:'Old target',target:4}]});
 ok(S.setFrequency(5),'Settings can change Lizzie gym frequency after onboarding');
 eq(S.state().frequency,5,'new gym frequency is persisted');eq(S.state().plan.length,4,'changing gym frequency does not rewrite the current week');eq(S.state().futurePlan.length,0,'changing gym frequency invalidates the staged week written for the old frequency');ok(!S.state().weeklyGoals[prefNext],'changing gym frequency clears the stale future weekly goal count');
 S.set('futurePlan',ctx.Onboarding.withDetail(ctx.Onboarding.plans[5]));S.set('futurePlanMeta',{weekOf:prefNext,writtenBy:'coach'});ok(S.setGoal('strong'),'Settings can change Lizzie primary goal after onboarding');eq(S.state().goal,'strong','new primary goal is persisted');eq(S.state().futurePlan.length,0,'changing primary goal invalidates staged training written for the previous goal');

 // 8. Static production paths for legacy logging and Settings are unit-safe too.
 const log=fs.readFileSync(path.join(ROOT,'log.js'),'utf8'),screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
 ok(log.includes("Store.weightToLb(nonneg(e.weight))")&&log.includes("Store.weightToLb(num(d.weight))"),'manual workout and morning sheets convert typed kg back to canonical pounds');
 ok(log.includes("Store.liftNum(last.weight)")&&log.includes("Store.fmtWeight(lastW)"),'legacy sheets display prior lift/body weight in the selected unit');
 ok(screens.includes("Store.fmtLift(st.weight)")&&screens.includes("Store.weightNum(prop.targets.weightGoal"),'active-session set rows and Coach proposal weight use selected units');
 ok(app.includes("!Store.verse().chosen"),'an invalid cached verse index triggers a fresh choice instead of suppressing the daily chooser');
 ok(app.includes("Store.energyToKcal(n)")&&log.includes("data-energy=\"1\"")&&screens.includes("Store.energyNum(S.targets.calories)"),'Settings, meal editing and legacy logging convert kJ inputs back to canonical kcal');
 ok(app.includes('This backup belongs to ')&&app.includes('will not restore another person')&&app.includes('Store.identityKey'), 'an active Lizzie phone refuses a different owner backup before its local connection keys can be reused under the wrong identity');
 ok(app.includes('Changing your name changes the private sync identity this phone writes'), 'Settings warns before a connected owner rename changes the phone sync filename');
 ok(screens.includes("preferenceRow('Primary goal'")&&screens.includes("preferenceRow('Gym days'")&&app.includes("action === 'set-goal'")&&app.includes("action === 'set-frequency'"),'the Settings UI exposes the goal/frequency changes onboarding promises are available later');
 var invalidOwnerRejected=false;try{S.importState({profile:{name:''},days:{},onboarded:true});}catch(e){invalidOwnerRejected=/owner name/i.test(e.message);}
 ok(invalidOwnerRejected,'a malformed onboarded backup without an owner identity is rejected transactionally');

 // 9. Malformed user-only state no longer crashes the second-user Coach screen.
 ctx=load(makeCtx({'insync.v10':JSON.stringify({profile:{name:'Lizzie',initials:'LI',startDate:today},partner:{name:'Robert',initials:'RO'},days:{},onboarded:true,chapters:{bad:true},coachPending:true})}));
 try{ctx.location.hash='#coach';const html=ctx.Screens.coach();ok(typeof html==='string'&&html.length>100,'Coach renders after malformed local chapter/pending state is normalized')}catch(e){console.error(e.stack||e);ok(false,'Coach renders after malformed local chapter/pending state is normalized')}

 // 10. Calendar-week chapters and metric distance stay correct on the second user's phone.
 const oldChapterState={profile:{name:'Lizzie',initials:'LI',sex:'Female',startDate:'2026-07-01'},partner:{name:'Robert',initials:'RO'},days:{},onboarded:true,
  chapters:[
   {from:'2026-07-29',to:'2026-08-04',text:'Older rolling chapter.'},
   {from:'2026-07-31',to:'2026-08-06',text:'Newest chapter for that week.'}
  ]};
 ctx=load(makeCtx({'insync.v10':JSON.stringify(oldChapterState)}));S=ctx.Store;
 eq(S.state().chapters.length,1,'old rolling chapter records collapse to one canonical calendar-week chapter');
 eq(S.state().chapters[0].from,'2026-08-03','migrated chapter begins on the Monday containing its end date');
 eq(S.state().chapters[0].text,'Newest chapter for that week.','if an old build wrote twice in one week, the newest chapter survives migration');
 eq(S.state().profile.sex,'Female','valid female profile value survives normalization');
 const badSex=makeCtx({'insync.v10':JSON.stringify({profile:{name:'Lizzie',sex:'not-a-valid-option',startDate:today},days:{},onboarded:true})});run(badSex,'store.js');
 eq(badSex.Store.state().profile.sex,'','malformed restored sex value is cleared instead of being fed to target/Coach logic');

 ctx=load(makeCtx());S=ctx.Store;
 S.setProfileName('Lizzie');S.setPartnerName('Robert');S.set('profile.startDate',S.shift(S.todayKey(),-70));S.set('onboarded',true);S.set('units.distance','km');
 for(let i=0;i<56;i++){S.setSteps(7000+i*20,S.shift(S.todayKey(),-i));}
 ctx.location.hash='#cardio';const cardioHtml=ctx.Screens.cardio();
 ok(/\bkm\b/.test(cardioHtml)&&!/\bmiles\b/i.test(cardioHtml),'Walking trends render in kilometres without leftover mile labels when Lizzie selects km');
 const currentWeek=S.weekStart(S.todayKey());for(let i=0;i<7;i++){const k=S.shift(currentWeek,i);if(k>S.todayKey())break;S.setSteps(8500,k);}
 ctx.location.hash='#weekly-review';const reviewHtml=ctx.Screens.weeklyReview();
 ok(reviewHtml.includes('>Distance</div>')&&/\bkm\b/.test(reviewHtml),'weekly review labels and formats expedition movement as distance in the selected unit');
 S.set('expedition',{routeId:'camino',legIndex:1,legStart:S.todayKey(),legStartSteps:0,walked:[],next:''});
 S.set('lastArrival',{routeId:'camino',legIndex:0,milesMine:8,milesHers:7.5,at:new Date().toISOString()});
 ctx.location.hash='#arrival';const arrivalHtml=ctx.Screens.arrival();
 ok(arrivalHtml.includes('22.0 km')&&arrivalHtml.includes('396 m of climbing'),'arrival next-leg card converts both route distance and climb for a km user');
 S.set('units.energy','kJ');S.addMeal({name:'Energy test',slot:'Lunch',kcal:500,protein:30,carbs:40,fat:10});
 ctx.location.hash='#nutrition';const nutritionHtml=ctx.Screens.nutrition();
 ok(nutritionHtml.includes('kJ')&&!nutritionHtml.includes('<small>kcal</small>'),'Nutrition renders stored calories in kJ when Lizzie selects kJ');
 ctx.location.hash='#settings';const settingsHtml=ctx.Screens.settings();
 ok(settingsHtml.includes('Daily energy')&&settingsHtml.includes('data-unit=\"energy\"')&&settingsHtml.includes('kJ'),'Settings exposes the energy target in the selected kJ unit and marks it for safe conversion on edit');
 S.set('units.weight','kg');
 var metricRoutes=[['home','home'],['coach','coach'],['nutrition','nutrition'],['train','train'],['together','together'],['settings','settings'],['body','body'],['workouts','workouts'],['cardio','cardio'],['records','records'],['badges','badges'],['reflection','reflection'],['trends','trends'],['planner','planner'],['cookbook','cookbook'],['history','history'],['calendar','calendar'],['dayHistory','day-history/'+S.todayKey()],['weeklyReview','weekly-review'],['exercises','exercises'],['exercise','exercise/dumbbell-chest-press'],['trainDay','trainday/'+S.todayKey()],['notifications','notifications'],['handshake','handshake']];
 var metricFailures=[];metricRoutes.forEach(function(r){ctx.location.hash='#'+r[1];try{var out=ctx.Screens[r[0]]();if(typeof out!=='string'||out.length<20)metricFailures.push(r[0]+':short');}catch(e){metricFailures.push(r[0]+':'+e.message);}});
 eq(metricFailures.length,0,'all major Lizzie screens render together under kg + km + kJ preferences');

 S.setSecret('claudeKey','key');let chapterPrompt='';ctx.fetch=(u,o)=>{chapterPrompt=JSON.parse(o.body).messages[0].content;return response('A grounded week. Keep showing up. Carry the pattern forward.')};
 const chapterWeek=S.weekStart(S.todayKey());await new Promise(r=>ctx.Cloud.weeklyNote(chapterWeek,()=>r()));
 ok(chapterPrompt.includes('week beginning '+chapterWeek),'weekly chapter prompt is anchored to the true Monday week boundary');
 ok(!chapterPrompt.includes(S.shift(chapterWeek,-1)+':'),'weekly chapter prompt does not pull the prior Sunday into the current chapter');

 // 11. No owner name is baked into production logic.
 const prod=['app.js','cloud.js','screens.js','store.js','insights.js','onboarding.js','log.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
 ok(!/\bRobert\b|\bLizzie\b/.test(prod),'production logic remains owner-neutral; test names never leak into the shipped app');

 console.log(`\n${passed} Lizzie deep-audit checks passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

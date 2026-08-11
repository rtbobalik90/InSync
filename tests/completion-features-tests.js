'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},UI:{esc:s=>String(s==null?'':s),asset:s=>s},window:null,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
for(const f of ['store.js','exercises.js','insights.js','onboarding.js','badges.js','cloud.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const S=ctx.Store,I=ctx.Insights,C=ctx.Cloud,B=ctx.Badges; S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('profile.startDate',S.shift(S.todayKey(),-21));S.set('onboarded',true);S.setSecret('claudeKey','test');
function payload(week){const slots=['Breakfast','Lunch','Dinner','Snack'],meals=[];for(let i=0;i<7;i++)for(const slot of slots)meals.push({date:S.shift(week,i),slot,name:`${slot} ${i}`,cuisine:'American',proteins:['Chicken'],kcal:slot==='Snack'?200:600,protein:slot==='Snack'?20:45,carbs:50,fat:15,servings:1,prepMinutes:20,items:[{name:'Chicken breast',weight:'6 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook ingredients.','Serve.']});return{meals}}
function setAI(obj){ctx.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({content:[{type:'text',text:JSON.stringify(obj)}]})});}
function plan(w){return new Promise(r=>C.planMealsWeek(w,(err,map)=>r({err,map})))}
(async()=>{
 const week=S.weekStart(S.todayKey());
 S.set('mealPrefs',{cuisines:[],proteins:[],likes:'',avoid:'',lunchPrepDays:3,dinnerLeftovers:true,cookDays:['Mon','Wed','Fri']});
 setAI(payload(week));let res=await plan(week);ok(!res.err,'meal-prep week generates successfully');
 const monLunch=res.map[`${week}|Lunch`],tue=S.shift(week,1),wed=S.shift(week,2);
 eq(monLunch.servings,3,'batch lunch source is sized for the requested prep days');
 eq(res.map[`${tue}|Lunch`].leftoverOf,`${week}|Lunch`,'later batch lunch points back to the one cooked source');
 ok(!!monLunch.batchSource,'batch lunch source is marked as the grocery-bearing source');
 eq(res.map[`${tue}|Dinner`].leftoverOf,`${week}|Dinner`,'non-cook dinner becomes a planned leftover');
 ok(!!res.map[`${wed}|Dinner`].batchSource,'selected cooking night stays a fresh dinner source');

 S.set('mealPrefs',{cuisines:[],proteins:[],likes:'',avoid:'',lunchPrepDays:0,dinnerLeftovers:true,cookDays:['Tue','Thu']});
 ok(I.mealPrepPrefs().cookDays.includes('Mon'),'leftover mode always anchors Monday as a real cook night');

 // Progression: two top-range performances at the same load should advance load.
 const ex=ctx.Exercises.get('dumbbell-chest-press');
 S.addWorkout({name:'Upper',minutes:30,exercises:[{id:ex.id,name:ex.name,weight:50,reps:12,sets:3}]},S.shift(S.todayKey(),-4));
 S.addWorkout({name:'Upper',minutes:31,exercises:[{id:ex.id,name:ex.name,weight:50,reps:12,sets:3}]},S.shift(S.todayKey(),-2));
 let pr=I.progressionFor(ex.id);eq(pr.kind,'load','two top-range sessions produce a load progression');eq(pr.weight,55,'load progression advances by a conservative 5 lb');

 // Swap remembers dislikes/discomfort but not an occupied machine.
 const items=ctx.Exercises.expand(['dumbbell-chest-press','pulldown-machine']);S.startSession('Upper',items);
 let opts=I.swapOptions(0,'dislike');ok(opts.length>0,'active movement gets same-group swap choices');
 const original=S.session().items[0].id;ok(I.swapSessionItem(0,opts[0].id,'dislike'),'swap replaces the active movement');
 ok(I.avoidedExerciseIds().includes(original),'disliked movement enters future-plan exclusion memory');
 const invalidPlan=[{day:'Mon',name:'Upper',ex:[original]},{day:'Tue',name:'Walk',detail:'walk'},{day:'Thu',name:'Lower',ex:['horizontal-leg-press']},{day:'Sat',name:'Walk',detail:'walk'}];
 eq(C.validatePlan(invalidPlan,4,[original]),null,'plan validator rejects a remembered avoided movement');S.abandonSession();

 // Day/calendar derivation includes the complete record without inventing it.
 const today=S.todayKey();S.addMeal({name:'Eggs',slot:'Breakfast',kcal:300,protein:30,carbs:5,fat:18},today);S.setSteps(10500,today);S.setMorning({weight:190,sleepHr:7.5,restingHr:60},today);S.saveReflection('A grounded day.',today);
 S.addPhoto('progress-photo-test',today);
 const day=I.daySummary(today);eq(day.meals.length,1,'day history includes meals');eq(day.steps,10500,'day history includes steps');eq(day.weight,190,'day history includes body metrics');eq(day.reflection,'A grounded day.','day history includes reflection');eq(day.photos.length,1,'day history includes progress-photo metadata');ok(day.trailMiles>0,'day history derives trail distance from that day’s actual steps');

 // Badge history is forward-only and gives the weekly review real earning evidence.
 S.set('earned',[]);S.set('badgeEarnedAt',{});
 ok(B.fresh().some(x=>x.id==='first-first-meal'),'a real first meal appears as a fresh badge');B.markSeen();
 eq(S.state().badgeEarnedAt['first-first-meal'],today,'newly acknowledged badge receives the real earning-day timestamp');
 let currentStats=I.weekStats(S.weekStart(today));ok(currentStats.badgesEarned.includes('first-first-meal'),'weekly review can name badges actually earned in its date range');

 // Favorites carry a real added date so a review never calls an old favorite new.
 const fav={name:'Chicken rice bowl',slot:'Dinner',kcal:600,protein:45,carbs:60,fat:15,servings:1,prepMinutes:20,items:[{name:'Chicken',weight:'6 oz'}],instructions:['Cook.']};
 S.set('mealFavorites',[fav]);S.set('mealFavoriteAt',{'chicken rice bowl':today});
 currentStats=I.weekStats(S.weekStart(today));ok(currentStats.favoriteMealsAdded.includes('Chicken rice bowl'),'weekly review identifies a favorite added in the reviewed week');

 // Pattern awareness is evidence-based.
 for(let n=1;n<=3;n++){const k=S.shift(today,-n);S.addMeal({name:'Light meal',slot:'Dinner',kcal:600,protein:20},k);S.setSteps(3000,k)}
 const patterns=I.patternInsights();ok(patterns.some(x=>x.id==='protein'),'coach detects a repeated three-day protein miss');ok(patterns.some(x=>x.id==='steps'),'coach detects a repeated step-gap pattern');

 S.set('mealDislikedMeals',['A','B','C']);
 ok(!I.suggestedGoals(S.shift(S.weekStart(today),7)).some(g=>g.id==='planned-meals'),'weekly goals never use an unverifiable proxy for meal-plan compliance');

 // Weekly review persists and next-week readiness is derived from actual plans.
 const reviewWeek=S.shift(S.weekStart(today),-7);let st=I.weekStats(reviewWeek);ok(typeof st.points==='number'&&typeof st.avgProtein==='number','weekly review stats are derived from the log');
 ok(I.saveReview(reviewWeek,{summary:'A factual week.','win':'You trained.','pattern':'Protein varied.','carry':'Plan lunch.'}),'weekly review saves through the main Store');
 eq(I.reviewFor(reviewWeek).carry,'Plan lunch.','saved weekly review is recoverable');
 const goals=I.setNextWeekGoals(reviewWeek);eq(goals.length,2,'next-week setup creates exactly two personal goals');ok(I.goalProgress(S.shift(reviewWeek,7)).length===2,'personal goals remain measurable after setup');
 setAI({summary:'Grounded summary.','win':'Training consistency.','pattern':'Protein was uneven.','carry':'Prep lunch protein.'});
 const written=await new Promise(r=>C.weeklyReview(reviewWeek,(err,v)=>r({err,v})));ok(!written.err&&written.v.carry==='Prep lunch protein.','Claude weekly-review contract accepts complete grounded JSON');

 // A Sunday-night/early setup must stage a future training plan instead of overwriting the active week.
 S.set('frequency',4);
 const nextWeek=S.shift(S.weekStart(today),7);
 const validTraining={days:[
   {day:'Mon',name:'Upper',ex:['push-ups','cable-row','lateral-raise']},
   {day:'Tue',name:'Lower',ex:['horizontal-leg-press','leg-extension','calf-extension']},
   {day:'Thu',name:'Upper',ex:['push-ups','pulldown-machine','shoulder-press-machine']},
   {day:'Fri',name:'Lower',ex:['linear-leg-press','glute-machine','cable-hip-extension']}],note:'Progress the week.'};
 setAI(validTraining);
 const staged=await new Promise(r=>C.writePlan(nextWeek,(err,v)=>r({err,v})));ok(!staged.err,'future training week is accepted');eq(S.state().futurePlanMeta.weekOf,nextWeek,'future training plan is staged under its own week');ok(S.state().futurePlan.length===4,'staged future plan keeps all scheduled days');

 // Promotion is unit-testable and only occurs once the staged week is current.
 const stagedCopy=S.state().futurePlan.slice();S.set('futurePlanMeta',Object.assign({},S.state().futurePlanMeta,{weekOf:S.weekStart(today)}));
 ok(I.activateScheduledPlan(),'a staged plan promotes when its Monday/current week arrives');
 eq(S.state().plan.length,stagedCopy.length,'promotion installs every staged training day');
 eq(S.state().futurePlan.length,0,'promotion clears the staged copy so it cannot activate twice');

 // Reactions are toggleable and travel as a small sync map.
 ok(!I.setReaction('__proto__','heart'),'reaction storage rejects unsafe/non-activity ids');
 const partnerEvent='a:lizzie:'+today+':protein';ok(I.setReaction(partnerEvent,'heart'),'partner activity can be reacted to');eq(I.reactionsGiven()[partnerEvent],'heart','reaction is stored locally for sync');ok(I.setReaction(partnerEvent,'heart'),'tapping the same reaction toggles it off');ok(!I.reactionsGiven()[partnerEvent],'reaction can be removed');I.setReaction(partnerEvent,'fire');
 const share=C.sharePayload();eq(share.schema,8,'completion features use current sync schema 8');eq(share.reactions[partnerEvent],'fire','reaction is included in shared payload');ok(Array.isArray(share.activity),'shared payload carries a bounded activity feed');

 // Sync health has explicit healthy/error/ack facts rather than a vague string.
 S.setSecret('githubToken','token');S.set('connections.githubRepo','rtbobalik90/insync-sync');S.set('connections.lastSync',new Date().toISOString());
 S.set('partnerData',{name:'Lizzie',date:today,updated:new Date().toISOString(),seenPartnerUpdated:new Date().toISOString(),points:4,streak:1,earned:[],messages:[]});
 let health=I.syncHealth();eq(health.status,'Sync healthy','sync health reports healthy after a successful exchange');ok(health.partnerUpdated>0&&health.partnerReceived>0,'sync health tracks partner update and acknowledgement timestamps');

 // Structural wiring assertions for all seven completion features.
 const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
 ok(screens.includes('Batch-prep lunches')&&screens.includes('Dinner leftovers'),'planner exposes batch-prep and leftovers controls');
 ok(screens.includes('Not-for-me memory')&&app.includes("action === 'allow-meal-again'"),'thumbs-down meal memory can be reviewed and reversed');
 ok(screens.includes('Swap exercise')&&app.includes("action === 'swap-exercise'"),'training exposes and wires exercise substitution');
 ok(screens.includes('Movement memory')&&app.includes("action === 'allow-exercise-again'"),'remembered movement exclusions can be explicitly allowed again');
 ok(screens.includes('Weekly Campfire ready')&&app.includes("action === 'setup-next-week'"),'weekly review and next-week setup are wired');
 ok(screens.includes('History &amp; calendar')&&screens.includes('function dayHistory')&&screens.includes('Progress photos')&&screens.includes('Trail distance'),'complete calendar/day history includes photos and trail distance');
 ok(screens.includes('Coach noticed')&&cloud.includes('Insights.patternsText'),'pattern-aware coaching is both proactive and supplied to Claude');
 ok(screens.includes('Sync healthy')||screens.includes('syncHealthPanel'),'Settings exposes a real sync-health panel');
 ok(screens.includes('reactionbar')&&app.includes("action === 'react'"),'Together reactions are rendered and synchronized');

 console.log(`\n${passed} completion-feature checks passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

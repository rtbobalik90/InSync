'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
let passed=0, failed=0;
function ok(x,msg){ if(x){passed++; console.log('PASS:',msg);} else {failed++; console.error('FAIL:',msg);} }
function eq(a,b,msg){ ok(a===b,`${msg} (got ${JSON.stringify(a)})`); }
class LS{constructor(){this.m=new Map()} getItem(k){return this.m.has(k)?this.m.get(k):null} setItem(k,v){this.m.set(k,String(v))} removeItem(k){this.m.delete(k)}}
const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'',protocol:'https:'},navigator:{},CustomEvent:function(){},UI:{esc:s=>String(s==null?'':s),asset:s=>s},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),window:null};
ctx.window=ctx; ctx.window.dispatchEvent=()=>{}; vm.createContext(ctx);
for(const f of ['store.js','exercises.js','onboarding.js','cloud.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const S=ctx.Store,C=ctx.Cloud; S.setProfileName('Robert'); S.setPartnerName('Lizzie'); S.setSecret('claudeKey','test-key');

function weekPayload(week, count=28){
  const slots=['Breakfast','Lunch','Dinner','Snack'], meals=[];
  for(let i=0;i<7;i++) for(const slot of slots){
    if(meals.length>=count) break;
    meals.push({date:S.shift(week,i),slot,name:`${slot} ${i+1}`,kcal:slot==='Snack'?220:620,protein:slot==='Snack'?20:45,carbs:55,fat:18,
      servings:1,prepMinutes:20,recipeNote:'Prep ahead if useful',items:[{name:'Chicken breast',weight:'6 oz'},{name:'Rice',weight:'1 cup'}],
      instructions:['Measure the ingredients.','Cook until done.','Serve.']});
  }
  return {meals};
}
function setClaudeResponse(obj){
  ctx.fetch=(url,opts)=>{
    const body=JSON.parse((opts&&opts.body)||'{}'), prompt=((body.messages||[])[0]||{}).content||'';
    const payload=obj&&Array.isArray(obj.meals)?{meals:obj.meals.filter(m=>prompt.includes(`${m.date} ${m.slot}`))}:obj;
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(payload)}]})});
  };
}
function plan(week){return new Promise(resolve=>C.planMealsWeek(week,(err,map)=>resolve({err,map})));}

(async()=>{
  const week=S.weekStart(S.todayKey());
  setClaudeResponse(weekPayload(week));
  let result=await plan(week);
  ok(!result.err,'complete 28-slot Claude week is accepted');
  eq(Object.keys(result.map||{}).length,28,'weekly planner returns exactly 28 dated meal slots');
  ok(!!result.map[`${week}|Breakfast`] && !!result.map[`${week}|Snack`],'weekly planner includes breakfast and snack on the first day');
  const dinner=result.map[`${week}|Dinner`];
  eq(dinner.instructions.length,3,'generated planned meal keeps cooking steps');
  eq(dinner.items[0].weight,'6 oz','generated planned meal keeps ingredient amounts for shopping');
  eq(dinner.source,'coach','generated planned meal is marked as coach-created');

  setClaudeResponse(weekPayload(week,27));
  result=await plan(week);
  ok(!!result.err && /could not finish|missed or rejected/i.test(result.err.message),'an incomplete 27-slot week is rejected after its bounded repair attempt');

  // The generator is home-cooked only: a restaurant/fast-food chain in any slot
  // causes the whole atomic rebuild to be rejected instead of sneaking through.
  const fast=weekPayload(week); fast.meals[0].name='McDonald\'s Egg McMuffin';
  setClaudeResponse(fast); result=await plan(week);
  ok(!!result.err && /missed or rejected/i.test(result.err.message),'fast-food or chain-brand meals are rejected from generated weeks');

  // A home-cooked chipotle-pepper recipe is legitimate food and must not be
  // confused with the similarly named restaurant chain.
  const pepper=weekPayload(week); pepper.meals[0].name='Home-cooked chipotle egg bowl';
  pepper.meals[0].items=[{name:'Eggs',weight:'2 large'},{name:'Chipotle pepper',weight:'1 tsp'}];
  setClaudeResponse(pepper); result=await plan(week);
  ok(!result.err,'home-cooked chipotle-pepper food is not falsely blocked as fast food');

  // User taste preferences must actually reach the prompt and become a hard
  // filter, not just decorate the planner screen.
  S.set('mealPrefs',{cuisines:['Mexican','Indian'],proteins:['Chicken','Beef'],likes:'spicy, rice bowls',avoid:'mushrooms, olives'});
  let promptBodies=[];
  ctx.fetch=(url,opts)=>{
    const prompt=JSON.parse(opts.body).messages[0].content; promptBodies.push(prompt);
    const full=weekPayload(week), payload={meals:full.meals.filter(m=>prompt.includes(`${m.date} ${m.slot}`))};
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(payload)}]})});
  };
  result=await plan(week);
  ok(!result.err,'preference-aware week still generates successfully');
  const promptBody=promptBodies.join('\n');
  ok(promptBody.includes('Selected cuisines for this week: Mexican, Indian') && promptBody.includes('Selected protein choices: Chicken, Beef'),'cuisine and protein choices are sent to the meal coach');
  ok(promptBody.includes('Foods/flavors they like: spicy, rice bowls') && promptBody.includes('Foods/flavors they do NOT like or want: mushrooms, olives'),'like and avoid keywords are sent to the meal coach');

  // A forbidden ingredient is rejected even if Claude ignored the written preference.
  const avoidPayload=weekPayload(week); avoidPayload.meals[3].items.push({name:'Mushrooms',weight:'1 cup'});
  setClaudeResponse(avoidPayload); result=await plan(week);
  ok(!!result.err && /missed or rejected/i.test(result.err.message),'avoid keywords are enforced against returned ingredients');

  // Favorites are not passive metadata: a compatible favorite is inserted back
  // into a generated week, with its old finished-photo reference cleared.
  S.set('mealPrefs',{cuisines:[],proteins:[],likes:'',avoid:''});
  S.set('mealFavorites',[{name:'Robert Favorite Chicken Bowl',slot:'Dinner',kcal:610,protein:52,carbs:58,fat:16,servings:1,prepMinutes:25,cuisine:'Mexican',proteins:['Chicken'],photoId:'old-finished-photo',items:[{name:'Chicken breast',weight:'6 oz'},{name:'Rice',weight:'1 cup'}],instructions:['Cook chicken.','Build bowl.'],source:'favorite'}]);
  setClaudeResponse(weekPayload(week)); result=await plan(week);
  ok(!result.err,'week with a saved favorite generates successfully');
  const favoriteReturn=Object.values(result.map).find(m=>m.name==='Robert Favorite Chicken Bowl');
  ok(!!favoriteReturn,'a compatible favorite deliberately reappears in the generated week');
  eq(favoriteReturn && favoriteReturn.photoId,'','a repeated favorite starts as a new occurrence without reusing the old finished photo');

  S.set('mealPrefs',{cuisines:[],proteins:[],likes:'',avoid:'mushrooms'});
  S.set('mealFavorites',[{name:'Old mushroom favorite',slot:'Dinner',kcal:610,protein:40,carbs:58,fat:16,servings:1,prepMinutes:25,cuisine:'American',proteins:['Chicken'],items:[{name:'Chicken breast',weight:'6 oz'},{name:'Mushrooms',weight:'1 cup'}],instructions:['Cook.'],source:'favorite'}]);
  setClaudeResponse(weekPayload(week)); result=await plan(week);
  ok(!Object.values(result.map||{}).some(m=>m.name==='Old mushroom favorite'),'a newly avoided ingredient blocks an older favorite from being reintroduced');

  S.set('mealPrefs',{cuisines:[],proteins:[],likes:'',avoid:''});
  S.set('mealDislikedMeals',['Breakfast 1']);
  setClaudeResponse(weekPayload(week)); result=await plan(week);
  ok(!!result.err && /missed or rejected/i.test(result.err.message),'thumbs-downed meal names cannot return in a generated week');
  S.set('mealDislikedMeals',[]); S.set('mealFavorites',[]);

  const storeText=fs.readFileSync(path.join(ROOT,'store.js'),'utf8');
  const screenText=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
  const appText=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  ok(storeText.includes('(Breakfast|Lunch|Dinner|Snack)'), 'planner persistence accepts all four meal slots');
  ok(screenText.includes("var PLAN_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']"),'planner UI permanently defines all four daily slots');
  ok(screenText.includes('planned-meal/') && screenText.includes('Ingredients') && screenText.includes('Make it'),'planned meals open into recipe detail with ingredients and method');
  ok(screenText.includes('Plan preferences') && screenText.includes('Home-cooked only') && screenText.includes('PLAN_CUISINES') && screenText.includes('PLAN_PROTEINS'),'planner exposes home-cooked cuisine, protein and taste controls before generation');
  ok(screenText.includes('add-planned-photo') && screenText.includes('favorite-planned-meal') && screenText.includes('dislike-planned-meal'),'recipe detail exposes finished photo, favorite and thumbs-down controls');
  ok(appText.includes("action === 'build-meal-week'") && appText.includes("action === 'log-planned-meal'"),'weekly generation and planned-meal logging actions are wired');
  ok(appText.includes("action === 'meal-pref-chip'") && appText.includes("action === 'add-planned-photo'"),'meal preference and finished-photo actions are wired');

  console.log(`\n${passed} meal-planner checks passed, ${failed} failed`);
  if(failed) process.exitCode=1;
})();

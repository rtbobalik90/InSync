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
  ctx.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({content:[{type:'text',text:JSON.stringify(obj)}]})});
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
  ok(!!result.err && /missed 1 meal slot/i.test(result.err.message),'an incomplete 27-slot week is rejected atomically');

  const storeText=fs.readFileSync(path.join(ROOT,'store.js'),'utf8');
  const screenText=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
  const appText=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  ok(storeText.includes('(Breakfast|Lunch|Dinner|Snack)'), 'planner persistence accepts all four meal slots');
  ok(screenText.includes("var PLAN_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']"),'planner UI permanently defines all four daily slots');
  ok(screenText.includes('planned-meal/') && screenText.includes('Ingredients') && screenText.includes('Make it'),'planned meals open into recipe detail with ingredients and method');
  ok(appText.includes("action === 'build-meal-week'") && appText.includes("action === 'log-planned-meal'"),'weekly generation and planned-meal logging actions are wired');

  console.log(`\n${passed} meal-planner checks passed, ${failed} failed`);
  if(failed) process.exitCode=1;
})();

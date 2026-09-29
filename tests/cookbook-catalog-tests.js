'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
const ctx={console,window:null,Number,Math,Object,Array,String,Set,Date};ctx.window=ctx;
ctx.Store={shift:(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}};
vm.createContext(ctx);
for(const f of ['cookbook-data.js','meal-scaling.js','cookbook.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const C=ctx.Cookbook,all=C.all();
eq(all.length,1440,'catalog contains 1,440 bundled recipes');
for(const cuisine of C.cuisines()){
  const set=all.filter(r=>r.cuisine===cuisine);eq(set.length,120,`${cuisine} contains 120 recipes`);
  for(const slot of ['Breakfast','Lunch','Dinner','Snack'])eq(set.filter(r=>r.mealSlots.includes(slot)).length,30,`${cuisine} has 30 ${slot.toLowerCase()} recipes`);
}
const audit=C.audit();ok(audit.ok,'every catalog record passes the canonical schema');
const sample=all[0],one=C.scaled(sample,1,'weight'),four=C.scaled(sample,4,'weight');
ok(one.ingredients.every(x=>/g|mL|piece/.test(x.display)),'weight mode renders canonical metric quantities');
eq(Math.round(four.ingredients[0].grams),Math.round(one.ingredients[0].grams*4),'four eaters multiply canonical ingredient mass by four');
const standard=C.scaled(sample,3,'standard');ok(standard.ingredients.every(x=>x.display),'standard mode renders a kitchen measure for every ingredient');
const portionMeal={recipeId:sample.id,dinerCount:2,portionScale:1,portionMultiplier:1,kcal:sample.nutrition.kcal,protein:sample.nutrition.protein,carbs:sample.nutrition.carbs,fat:sample.nutrition.fat};
const largeMeal=C.resizeMeal(portionMeal,1.25);
eq(largeMeal.kcal,Math.round(sample.nutrition.kcal*1.25*10)/10,'large portion scales per-person nutrition independently');
eq(Math.round(C.planIngredients(largeMeal,'weight')[0].grams),Math.round(sample.ingredients[0].grams*2*1.25),'ingredients combine diner count and per-person portion size');
const mealA={recipeId:sample.id,dinerCount:2,portionScale:1,servings:1},mealB={recipeId:sample.id,dinerCount:3,portionScale:1,servings:1};
const groceries=C.shoppingList([mealA,mealB],{},'weight');
eq(Math.round(groceries.find(x=>x.name===sample.ingredients[0].name).amounts[0].replace(/[^0-9.]/g,'')),Math.round(sample.ingredients[0].grams*5),'shopping list consolidates canonical quantities across separate household meals');
const pantryGroceries=C.shoppingList([mealA],{pantryInventory:[{id:sample.ingredients[0].id,grams:sample.ingredients[0].grams}]},'weight');
eq(Math.round(pantryGroceries.find(x=>x.name===sample.ingredients[0].name).amounts[0].replace(/[^0-9.]/g,'')),Math.round(sample.ingredients[0].grams),'shopping list delegates measured pantry deduction to the canonical scaling engine');
const twentyPlan=ctx.MealScaling.scaleRecipe(sample,{peopleEating:20,portion:'standard',mode:'weight'}).plan;
ok(twentyPlan.exceedsRecipeBatchMaximum&&twentyPlan.batchesRequired===2,'twenty-person meal remains supported with a two-batch safety instruction');
const week=C.buildWeek('2026-09-07',{calories:2000,protein:150},{cuisines:['Mexican']},{disliked:[]});
eq(Object.keys(week).length,28,'offline builder returns all 28 dated meal slots');
ok(Object.values(week).every(m=>m.source==='catalog'&&m.recipeId&&m.dinerCount===1),'offline week stores stable recipe ids and household counts');
for(let d=0;d<7;d++){
  const date=ctx.Store.shift('2026-09-07',d),meals=Object.values(week).filter(m=>m.date===date);
  const kcal=meals.reduce((a,m)=>a+m.kcal,0),protein=meals.reduce((a,m)=>a+m.protein,0);
  ok(kcal>=1800&&kcal<=2100,`${date} remains inside the 90–105% calorie contract`);
  ok(protein>=150,`${date} reaches the selected protein target`);
}
const allergyWeek=C.buildWeek('2026-09-07',{calories:2000,protein:140},{diets:['Dairy-free'],allergens:['Milk','Peanut'],cuisines:[],proteins:[]},{disliked:[]});
ok(Object.values(allergyWeek).every(m=>{const r=C.find(m.recipeId);return r&&r.dietary.dairyFree&&!r.allergens.some(a=>['milk','peanut'].includes(a));}),'universal dietary and allergen filters are enforced before planning');
console.log(`\n${passed} cookbook checks passed, ${failed} failed`);if(failed)process.exitCode=1;

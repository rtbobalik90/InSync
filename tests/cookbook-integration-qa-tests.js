'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(value,message){if(value){passed++;console.log('PASS:',message)}else{failed++;console.error('FAIL:',message)}}
function eq(actual,expected,message){ok(actual===expected,`${message} (got ${JSON.stringify(actual)})`)}
function close(actual,expected,message,tolerance=0.001){ok(Math.abs(actual-expected)<=tolerance,`${message} (got ${actual}, expected ${expected})`)}
const ctx={console,window:null,globalThis:null,Number,Math,Object,Array,String,Set,Date};ctx.window=ctx;ctx.globalThis=ctx;
ctx.Store={shift:(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}};
vm.createContext(ctx);
for(const file of ['contracts.js','cookbook-schema.js','cookbook-data.js','meal-scaling.js','cookbook-release.js','cookbook.js']){
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
}
const Contract=ctx.InSyncContracts.cookbook,Schema=ctx.InSyncCookbookSchema,Scaling=ctx.MealScaling,Release=ctx.CookbookRelease,Cookbook=ctx.Cookbook;
const all=Cookbook.all(),sample=all[0];

const expectedStatuses='draft-calculated|culinary-reviewed|nutrition-reviewed|production-approved';
eq(Contract.recipeStatuses.join('|'),expectedStatuses,'shared contract uses the canonical release pipeline');
eq(Schema.statuses.join('|'),expectedStatuses,'schema uses the shared release pipeline');
eq(Release.statuses.join('|'),expectedStatuses,'release gate uses the shared release pipeline');

eq(all.length,1440,'runtime cookbook exposes the complete 1,440-record catalog');
ok(Schema.validateCatalog(all,{profile:'foundation'}).ok,'all bundled records pass the foundation schema');
eq(Release.audit(all).publishable,0,'no formula-generated draft is publishable');

const one=Scaling.scaleRecipe(sample,{peopleEating:1,portion:'standard',mode:'weight'});
const twenty=Scaling.scaleRecipe(sample,{peopleEating:20,portion:'standard',mode:'weight'});
close(twenty.ingredients[0].exact.grams,one.ingredients[0].exact.grams*20,'twenty-person ingredient scaling is linear');
eq(twenty.nutrition.perPersonEating.kcal,one.nutrition.perPersonEating.kcal,'household count never changes personal nutrition');
ok(twenty.plan.exceedsRecipeBatchMaximum&&twenty.plan.batchesRequired===2,'twenty eaters trigger two batches for a twelve-serving recipe');

const planned={recipeId:sample.id,dinerCount:4,portionScale:1.25,portionMultiplier:1.25,servings:1};
const bridged=Cookbook.planIngredients(planned,'weight');
const direct=Scaling.scaleRecipe(sample,{peopleEating:4,portion:1.25*1.25,mode:'weight'});
close(bridged[0].grams,direct.ingredients[0].exact.grams,'Cookbook bridge delegates diner and portion scaling to MealScaling');
const standard=Cookbook.planIngredients(planned,'standard');
close(standard[0].grams,bridged[0].grams,'measurement toggle preserves canonical mass');
ok(standard[0].display!==bridged[0].display,'measurement toggle changes only presentation');

const personalMeal={recipeId:sample.id,portionScale:1,portionMultiplier:1,dinerCount:1,kcal:sample.nutrition.kcal,protein:sample.nutrition.protein,carbs:sample.nutrition.carbs,fat:sample.nutrition.fat};
const resized=Cookbook.resizeMeal(personalMeal,1.25);
close(resized.kcal,sample.nutrition.kcal*1.25,'portion control changes personal nutrition once',0.11);
const resizedMany=Object.assign({},resized,{dinerCount:20});
eq(resizedMany.kcal,resized.kcal,'changing diner count leaves personal meal nutrition unchanged');

const source={recipeId:sample.id,dinerCount:2,portionScale:1,servings:3,batchSource:true,leftoverOf:''};
const leftover={recipeId:sample.id,dinerCount:2,portionScale:1,servings:1,batchSource:false,leftoverOf:'2026-09-07|Lunch'};
const groceries=Scaling.aggregateGroceries([source,leftover],{recipes:all,mode:'weight'});
close(groceries.find(row=>row.id===sample.ingredients[0].id).grams,sample.ingredients[0].grams*6,'batch source is purchased once and linked leftover is skipped');

const fakeRecipe=JSON.parse(JSON.stringify(sample));
fakeRecipe.id='rcp-qa-pantry-boundary';
fakeRecipe.ingredients=[{id:'graham-crackers',name:'Graham crackers',grams:100,standard:{amount:1,unit:'cup'},section:'Main',allergens:['wheat']}];
const pantryBoundary=Scaling.aggregateGroceries([{recipe:fakeRecipe,dinerCount:1}],{mode:'weight',pantry:'ham'});
ok(!pantryBoundary[0].fullyStocked,'pantry matching does not hide an unrelated substring');

const massRecipe=JSON.parse(JSON.stringify(fakeRecipe));
massRecipe.id='rcp-qa-conflict-mass';massRecipe.ingredients=[{id:'shared-item',name:'Shared item',grams:100,standard:{amount:1,unit:'cup'},section:'Main',allergens:[]}];
const volumeRecipe=JSON.parse(JSON.stringify(fakeRecipe));
volumeRecipe.id='rcp-qa-conflict-volume';volumeRecipe.ingredients=[{id:'shared-item',name:'Shared item',milliliters:120,standard:{amount:0.5,unit:'cup'},section:'Main',allergens:[]}];
const conflicts=Scaling.aggregateGroceries([{recipe:massRecipe,dinerCount:1},{recipe:volumeRecipe,dinerCount:1}],{mode:'weight'}).filter(row=>row.id==='shared-item');
eq(conflicts.length,2,'incompatible quantities sharing an ID remain separate grocery rows');
ok(conflicts.every(row=>row.measurementConflict),'every incompatible grocery row is explicitly flagged');
close(conflicts.reduce((sum,row)=>sum+row.grams,0),100,'mass is not lost during an ID conflict');
close(conflicts.reduce((sum,row)=>sum+row.milliliters,0),120,'volume is not lost during an ID conflict');

const appText=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const screenText=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const indexText=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const swText=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(appText.includes('kcal: pm.kcal')&&appText.includes('recipeId: pm.recipeId'),'planned meal logging preserves personal nutrition and recipe identity');
ok(screenText.includes('exceedsRecipeBatchMaximum')&&screenText.includes('batchesRequired'),'planned-meal UI surfaces safe multi-batch guidance');
ok(indexText.includes('meal-scaling.js')&&indexText.includes('cookbook-release.js'),'browser shell loads scaling and release modules');
ok(swText.includes("'meal-scaling.js'")&&swText.includes("'cookbook-release.js'"),'offline shell caches scaling and release modules');

if(fs.existsSync(path.join(ROOT,'pilot-recipes.js'))){
  vm.runInContext(fs.readFileSync(path.join(ROOT,'pilot-recipes.js'),'utf8'),ctx,{filename:'pilot-recipes.js'});
  const pilot=ctx.INSYNC_PILOT_RECIPES||[];
  eq(pilot.length,48,'review pilot contains exactly 48 recipes');
  ok(Schema.validateCatalog(pilot,{profile:'foundation'}).ok,'all pilot records pass the canonical foundation schema');
  ok(pilot.every(recipe=>recipe.provenance.status==='draft-calculated'&&recipe.review&&recipe.review.production==='blocked'),'pilot records remain explicitly blocked from production');
  for(const cuisine of ['American','Indian','Japanese','Mediterranean']){
    const set=pilot.filter(recipe=>recipe.cuisine===cuisine);
    eq(set.length,12,`${cuisine} pilot contains 12 recipes`);
    for(const slot of ['Breakfast','Lunch','Dinner','Snack'])eq(set.filter(recipe=>recipe.mealSlots.includes(slot)).length,3,`${cuisine} pilot contains 3 ${slot.toLowerCase()} recipes`);
  }
}

console.log(`\n${passed} integration QA checks passed, ${failed} failed`);
if(failed)process.exitCode=1;

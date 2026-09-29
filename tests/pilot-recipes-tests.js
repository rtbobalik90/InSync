'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
const ctx={console,window:null,Number,Math,Object,Array,String,Set,Date};ctx.window=ctx;
vm.createContext(ctx);
for(const f of ['contracts.js','cookbook-schema.js','pilot-recipes.js','cookbook.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const recipes=ctx.INSYNC_PILOT_RECIPES,meta=ctx.INSYNC_PILOT_META,C=ctx.Cookbook;
eq(recipes.length,48,'pilot contains exactly 48 recipes');
eq(meta.productionApproved,false,'pilot explicitly blocks production approval');
eq(meta.status,'review-only','pilot collection is clearly review-only');
eq(C.pilot().length,48,'Cookbook exposes the separate pilot review collection');
eq(C.all().length,0,'pilot collection does not alter the primary foundation catalog');
eq(C.find(recipes[0].id).id,recipes[0].id,'Cookbook.find resolves a pilot recipe ID');
const americanBreakfast=recipes.find(r=>r.cuisine==='American'&&r.mealSlots.includes('Breakfast'));
ok(C.eligible(americanBreakfast,'Breakfast',{cuisines:['American'],proteins:[],diets:[],allergens:[]},[]),'pilot filtering keeps a matching cuisine and meal slot');
ok(!C.eligible(americanBreakfast,'Dinner',{cuisines:['American'],proteins:[],diets:[],allergens:[]},[]),'pilot filtering rejects the wrong meal slot');
ok(!C.eligible(americanBreakfast,'Breakfast',{cuisines:['Indian'],proteins:[],diets:[],allergens:[]},[]),'pilot filtering rejects a non-selected cuisine');
const eggPilot=recipes.find(r=>(r.proteins||[]).some(p=>/egg/i.test(p)));
ok(!eggPilot||C.eligible(eggPilot,eggPilot.mealSlots[0],{cuisines:[],proteins:['Eggs'],diets:[],allergens:[]},[]),'pilot protein filtering handles the Eggs preference');
const allergenPilot=recipes.find(r=>(r.allergens||[]).length);
ok(!allergenPilot||!C.eligible(allergenPilot,allergenPilot.mealSlots[0],{cuisines:[],proteins:[],diets:[],allergens:[allergenPilot.allergens[0]]},[]),'pilot allergen filtering blocks a declared allergen');
const foundationAudit=ctx.InSyncCookbookSchema.validateCatalog(recipes,{profile:'foundation'});
ok(foundationAudit.ok,`all pilot records pass the canonical foundation schema: ${JSON.stringify(foundationAudit.errors.slice(0,3))}`);
const ids=new Set(recipes.map(r=>r.id));eq(ids.size,48,'all recipe IDs are unique');
for(const cuisine of ['American','Indian','Japanese','Mediterranean']){
  const set=recipes.filter(r=>r.cuisine===cuisine);eq(set.length,12,`${cuisine} contains 12 pilot recipes`);
  for(const slot of ['Breakfast','Lunch','Dinner','Snack'])eq(set.filter(r=>r.mealSlots.includes(slot)).length,3,`${cuisine} contains 3 ${slot.toLowerCase()} recipes`);
}
for(const recipe of recipes){
  const result=C.validate(recipe);ok(result.ok,`${recipe.id} passes cookbook base schema: ${result.errors.join(', ')}`);
  ok(recipe.ingredients.length>=5,`${recipe.id} has at least five structured ingredients`);
  ok(recipe.ingredients.every(i=>i.grams>0&&i.standard.amount>0&&i.standard.unit&&i.sourceRef&&i.preparationState),`${recipe.id} has dual measures and canonical ingredient metadata`);
  ok(recipe.nutritionBasis.includes('per adult serving'),`${recipe.id} labels nutrition on a per-serving basis`);
  ok(recipe.instructions.length>=3,`${recipe.id} has an actionable method`);
  ok(recipe.servingSize&&recipe.scaling&&recipe.scaling.maximumServings===20,`${recipe.id} has serving and scaling metadata`);
  ok(recipe.dietary&&Array.isArray(recipe.allergens)&&recipe.allergenCrossContact,`${recipe.id} has dietary and allergen data`);
  ok(recipe.mealPrep&&recipe.mealPrep.storageContainer&&recipe.mealPrep.reheat,`${recipe.id} has storage and reheating guidance`);
  ok(Array.isArray(recipe.substitutions)&&recipe.substitutions.length>=2,`${recipe.id} has substitutions`);
  ok(recipe.provenance.status==='draft-calculated'&&recipe.provenance.reviewHistory.length===0&&recipe.review.production==='blocked',`${recipe.id} remains canonically draft and unapproved`);
  ok(!ctx.InSyncCookbookSchema.readiness(recipe).productionApproved,`${recipe.id} cannot be represented as production approved`);
  ok(recipe.review.schema==='automated-pass'&&['pending'].includes(recipe.review.culinary)&&recipe.review.nutrition==='pending',`${recipe.id} distinguishes schema QA from professional review`);
}
const original=ctx.INSYNC_RECIPES;ctx.INSYNC_RECIPES=recipes;
const sample=recipes[0],one=C.scaled(sample,1,'weight'),five=C.scaled(sample,5,'standard');
ok(one.ingredients.every(i=>i.display&&/g|mL|piece/.test(i.display)),'pilot renders weighted measurements');
ok(five.ingredients.every(i=>i.display&&i.standardAmount>0),'pilot renders scaled standard measurements');
eq(Math.round(five.ingredients[0].grams),Math.round(sample.ingredients[0].grams*2.5),'five eaters scale from the two-serving base yield');
ctx.INSYNC_RECIPES=original;
const screenText=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const logText=fs.readFileSync(path.join(ROOT,'log.js'),'utf8');
ok(screenText.includes('Pilot review recipes')&&screenText.includes('Draft review content only'),'cookbook UI exposes a clearly labeled pilot review section');
ok(screenText.includes('Cookbook.eligible(r, pendingSlot')&&screenText.includes('pilotVisible'),'pilot UI applies the pending slot and current plan preferences');
ok(screenText.includes("pilotVisible.map(function(m){return card(m,{badge:'Draft review'})")&&logText.includes('function assignPlanned(raw)'),'pilot cards use the existing single-meal selection flow');
ok(screenText.includes('never used by automatic weekly generation')&&fs.readFileSync(path.join(ROOT,'cookbook.js'),'utf8').includes('var candidates=recipeList().filter'),'pilot copy and generator implementation keep automatic weeks on the foundation catalog');
console.log(`\n${passed} pilot checks passed, ${failed} failed`);if(failed)process.exitCode=1;

'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const sourceMap=JSON.parse(fs.readFileSync(path.join(ROOT,'fdc-source-map.json'),'utf8'));
let passed=0,failed=0;

function ok(value,message){
  if(value){passed++;console.log('PASS:',message);}
  else{failed++;console.error('FAIL:',message);}
}
function eq(actual,expected,message){ok(actual===expected,`${message} (got ${JSON.stringify(actual)})`);}
function load(file,globalName){
  const context={window:null,console,Number,Math,Object,Array,String,Set,Date};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
  return context[globalName];
}
function sourceIsPlaceholder(ref){
  return !ref || /(?:category|specific-id-pending|pending|placeholder|unresolved)/i.test(ref);
}

const catalog=load('cookbook-data.js','INSYNC_RECIPES');
const pilot=load('pilot-recipes.js','INSYNC_PILOT_RECIPES');
const allRecipes=catalog.concat(pilot);
const ids=new Set(allRecipes.flatMap(recipe=>recipe.ingredients.map(ingredient=>ingredient.id)));
const mappingIds=Object.keys(sourceMap.ingredients);
function declaredFoodIds(file,endMarker){
  const text=fs.readFileSync(path.join(ROOT,file),'utf8');
  const start=text.indexOf('var FOOD');
  const end=text.indexOf(endMarker,start);
  return [...text.slice(start,end).matchAll(/^\s{4}([A-Za-z][A-Za-z0-9]*):/gm)].map(match=>match[1]);
}
const canonicalIds=new Set(declaredFoodIds('cookbook-data.js','var CUISINES').concat(declaredFoodIds('pilot-recipes.js','function round')));

eq(catalog.length,1440,'source audit scans all generated catalog recipes');
eq(pilot.length,48,'source audit scans all pilot recipes');
eq(ids.size,73,'source audit inventories every canonical ingredient key');
eq(canonicalIds.size,77,'source audit inventories all declared FOOD keys, including dormant keys');
eq(mappingIds.length,77,'mapping proposal has one decision for every declared FOOD key');
ok([...ids].every(id=>sourceMap.ingredients[id]),'no recipe ingredient is absent from the mapping proposal');
ok([...canonicalIds].every(id=>sourceMap.ingredients[id]),'no declared FOOD key is absent from the mapping proposal');
ok(mappingIds.every(id=>canonicalIds.has(id)),'mapping proposal contains no unknown ingredient keys');

const statusCounts=mappingIds.reduce((counts,id)=>{
  const status=sourceMap.ingredients[id].status;
  counts[status]=(counts[status]||0)+1;
  return counts;
},{});
eq(statusCounts.mapped,57,'57 ingredient keys have direct preparation-specific mapping proposals');
eq(statusCounts.blocked,13,'13 ingredient keys are honestly blocked instead of force-mapped');
eq(statusCounts['state-split-required'],7,'7 shared keys require raw/cooked state splits');

for(const id of mappingIds){
  const decision=sourceMap.ingredients[id];
  ok(['mapped','blocked','state-split-required'].includes(decision.status),`${id} uses an allowed audit status`);
  if(decision.status==='mapped'){
    ok(decision.mappings.length>0&&decision.mappings.every(item=>Number.isInteger(item.fdcId)&&item.fdcId>0&&item.description&&item.state),`${id} has a concrete FDC record and preparation state`);
  }else{
    ok(typeof decision.blocker==='string'&&decision.blocker.length>20,`${id} documents why production sourcing remains blocked`);
  }
}

const catalogPlaceholders=catalog.filter(recipe=>recipe.ingredients.some(ingredient=>sourceIsPlaceholder(ingredient.sourceRef)));
const pilotPlaceholders=pilot.filter(recipe=>recipe.ingredients.some(ingredient=>sourceIsPlaceholder(ingredient.sourceRef)));
eq(catalogPlaceholders.length,1440,'placeholder detector catches every generated recipe category reference');
eq(pilotPlaceholders.length,48,'placeholder detector catches every pilot pending-ID reference');

const stateSplitIds=new Set(mappingIds.filter(id=>sourceMap.ingredients[id].status==='state-split-required'));
const recipesWithStateSplit=allRecipes.filter(recipe=>recipe.ingredients.some(ingredient=>stateSplitIds.has(ingredient.id)));
ok(recipesWithStateSplit.length>0,'preparation-state detector finds recipes that need split mappings');
for(const required of ['broccoli','chicken','oats','potato','salmon','sweetPotato','turkey']){
  ok(stateSplitIds.has(required),`preparation-state mismatch is recorded for ${required}`);
}

const chickenStates=new Set(pilot.flatMap(recipe=>recipe.ingredients).filter(ingredient=>ingredient.id==='chicken').map(ingredient=>ingredient.preparationState));
ok(chickenStates.has('raw')&&chickenStates.has('cooked and shredded'),'test fixture proves chicken is used in incompatible raw and cooked states');
const salmonStates=new Set(pilot.flatMap(recipe=>recipe.ingredients).filter(ingredient=>ingredient.id==='salmon').map(ingredient=>ingredient.preparationState));
ok([...salmonStates].some(state=>/^raw/.test(state))&&salmonStates.has('fully cooked and flaked'),'test fixture proves salmon is used in incompatible raw and cooked states');

const directlyMappedRecipes=allRecipes.filter(recipe=>recipe.ingredients.every(ingredient=>sourceMap.ingredients[ingredient.id].status==='mapped'));
eq(directlyMappedRecipes.length,36,'only 36 of 1,488 recipes avoid blocked and state-split ingredient keys');
eq(allRecipes.filter(recipe=>recipe.ingredients.every(ingredient=>!sourceIsPlaceholder(ingredient.sourceRef))).length,0,'no current recipe has release-ready specific source references');

console.log(`\n${passed} FDC source-audit checks passed, ${failed} failed`);
if(failed)process.exitCode=1;

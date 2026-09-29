'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(value,message){if(value){passed++;console.log('PASS:',message)}else{failed++;console.error('FAIL:',message)}}
function eq(actual,expected,message){ok(actual===expected,`${message} (got ${JSON.stringify(actual)})`)}

const context={console,window:null,Number,Math,Object,Array,String,Set,Date};context.window=context;
vm.createContext(context);
for(const file of ['cookbook-data.js','pilot-recipes.js','cookbook-release.js','nutrient-display.js','cookbook.js']){
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
}
const Display=context.NutrientDisplay,Cookbook=context.Cookbook;
const all=Cookbook.all(),pilot=Cookbook.pilot(),sample=all[0];

eq(all.length,1440,'all cookbook recipes remain loaded for offline use');
eq(pilot.length,48,'pilot collection remains separate from the full cookbook');
ok(!all.some(recipe=>/^rcp-pilot-/.test(recipe.id)),'pilot recipes are not mixed into the production catalog');

const current=Display.summarize(sample);
eq(current.label,'Draft nutrition estimate','draft recipe has an honest nutrition label');
ok(current.estimated&&!current.approved,'draft nutrition cannot appear approved');
eq(current.unresolvedCount,sample.ingredients.length,'generic category references are exposed as unresolved mappings');
eq(current.sourceCount,0,'generic category references are not counted as specific source IDs');
eq(current.calculationDateLabel,'Calculation date not recorded','missing calculation date is explicit');
ok(/not professional nutrition/.test(current.disclaimer),'draft disclaimer does not imply professional review');

const mapped=JSON.parse(JSON.stringify(sample));
mapped.ingredients.forEach((ingredient,index)=>ingredient.sourceRef='USDA-FDC-'+(170000+index));
mapped.nutritionProvenance={
  calculatedAt:'2026-09-06T12:00:00Z',
  calculationMethod:'Ingredient mass rollup',
  estimated:false,
  sourceRecords:mapped.ingredients.map(ingredient=>({sourceId:ingredient.sourceRef})),
  unresolvedMappings:[]
};
const mappedSummary=Display.summarize(mapped);
eq(mappedSummary.unresolvedCount,0,'specific ingredient mappings clear unresolved status');
eq(mappedSummary.sourceCount,mapped.ingredients.length,'specific source IDs are counted once');
ok(/Sep/.test(mappedSummary.calculationDateLabel)&&/2026/.test(mappedSummary.calculationDateLabel),'calculation date is readable');
eq(mappedSummary.calculationMethod,'Ingredient mass rollup','calculation method is preserved');
ok(mappedSummary.estimated,'unapproved recipe remains estimated even when metadata claims otherwise');

const audit=Display.catalogSummary(all);
eq(audit.count,1440,'nutrient display audit covers the whole cookbook');
eq(audit.approved,0,'nutrient display never elevates current drafts to approved');
eq(audit.estimated,1440,'all current records are visibly estimates');
eq(audit.unresolved,1440,'all current generic mappings are reported');

const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(screens.includes('Nutrition provenance')&&screens.includes('calculationDateLabel'),'recipe detail exposes nutrient provenance and calculation date');
ok(screens.includes('source mapping')&&screens.includes('unresolvedMappings'),'cookbook screens expose source mapping gaps');
ok(index.includes('<script src="nutrient-display.js"></script>'),'browser shell loads nutrient presentation');
ok(sw.includes("'nutrient-display.js'"),'offline shell caches nutrient presentation');

console.log(`\n${passed} nutrient display checks passed, ${failed} failed`);
if(failed)process.exitCode=1;

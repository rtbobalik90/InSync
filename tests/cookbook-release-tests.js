'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(value,message){if(value){passed++;console.log('PASS:',message)}else{failed++;console.error('FAIL:',message)}}
function eq(actual,expected,message){ok(actual===expected,`${message} (got ${JSON.stringify(actual)})`)}
function throws(fn,pattern,message){try{fn();ok(false,message)}catch(error){ok(pattern.test(error.message),message)}}

const context={console,window:null,Number,Math,Object,Array,String,Set,Date};context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT,'cookbook-data.js'),'utf8'),context,{filename:'cookbook-data.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'cookbook-release.js'),'utf8'),context,{filename:'cookbook-release.js'});
const Gate=context.CookbookRelease;
const draft=JSON.parse(JSON.stringify(context.INSYNC_RECIPES[0]));

eq(Gate.statuses.join('|'),'draft-calculated|culinary-reviewed|nutrition-reviewed|production-approved','release statuses have one enforced order');
const draftResult=Gate.validate(draft);
ok(draftResult.ok,'current draft passes safety completeness validation');
ok(!draftResult.publishable,'structurally valid draft remains blocked from publication');
eq(Gate.presentation(draft).label,'Draft review content','draft presentation cannot imply approval');
throws(()=>Gate.assertPublishable(draft),/not_production_approved/,'publish assertion blocks draft content');
ok(/estimates/.test(Gate.presentation(draft).disclaimer)&&/not medical advice/.test(Gate.presentation(draft).disclaimer),'nutrition presentation retains estimate and medical disclaimer');
ok(/^https:\/\//.test(Gate.sources.foodDataCentralApi)&&/^https:\/\//.test(Gate.sources.fdaFoodAllergies),'authoritative nutrition and allergen source URLs are exposed');

const missingNutrition=JSON.parse(JSON.stringify(draft));delete missingNutrition.nutrition.fiber;
ok(Gate.validate(missingNutrition).errors.some(x=>x.code==='NUTRIENT_INVALID'&&x.path==='nutrition.fiber'),'missing nutrient is rejected');
const missingBasis=JSON.parse(JSON.stringify(draft));delete missingBasis.nutritionBasis;
ok(Gate.validate(missingBasis).errors.some(x=>x.code==='NUTRITION_BASIS_MISSING'),'missing nutrition basis is rejected');

const hiddenMilk=JSON.parse(JSON.stringify(draft));hiddenMilk.ingredients[0].allergens=['milk'];hiddenMilk.allergens=[];
ok(Gate.validate(hiddenMilk).errors.some(x=>x.code==='ALLERGEN_UNDECLARED'),'ingredient allergen must be declared at recipe level');
const absentDeclaration=JSON.parse(JSON.stringify(draft));delete absentDeclaration.allergens;
ok(Gate.validate(absentDeclaration).errors.some(x=>x.code==='ALLERGEN_DECLARATION_MISSING'),'contains-allergens declaration must be explicit even when empty');
const unsupportedMilk=JSON.parse(JSON.stringify(draft));unsupportedMilk.allergens=['milk'];
ok(Gate.validate(unsupportedMilk).errors.some(x=>x.code==='ALLERGEN_UNSUPPORTED'),'unsupported recipe-level allergen is rejected');
const advisoryConflict=JSON.parse(JSON.stringify(draft));advisoryConflict.mayContainAllergens=[draft.allergens[0]];
ok(Gate.validate(advisoryConflict).errors.some(x=>x.code==='ADVISORY_CONTAINS_CONFLICT'),'contains and voluntary may-contain declarations remain distinct');

const falseGlutenFree=JSON.parse(JSON.stringify(draft));falseGlutenFree.ingredients[0].allergens=['wheat'];falseGlutenFree.allergens=['wheat'];falseGlutenFree.dietary.glutenFree=true;
ok(Gate.validate(falseGlutenFree).errors.some(x=>x.code==='GLUTEN_FREE_CONFLICT'),'gluten-free claim cannot coexist with wheat');
const falseVegan=JSON.parse(JSON.stringify(draft));falseVegan.dietary.vegan=true;falseVegan.dietary.vegetarian=true;falseVegan.dietary.dairyFree=true;
ok(Gate.validate(falseVegan).errors.some(x=>x.code==='VEGAN_INGREDIENT_CONFLICT'),'vegan claim is checked against ingredients');

const missingSource=JSON.parse(JSON.stringify(draft));delete missingSource.ingredients[0].sourceRef;
ok(Gate.validate(missingSource).errors.some(x=>x.code==='INGREDIENT_SOURCE_MISSING'),'ingredient nutrition provenance is mandatory');
ok(draftResult.warnings.some(x=>x.code==='INGREDIENT_SOURCE_GENERIC'),'generic category references are flagged for replacement');

const reviewedDraft=JSON.parse(JSON.stringify(draft));
reviewedDraft.provenance.source='Internal recipe record RCP-0001 with calculation sheet NUT-0001';
reviewedDraft.ingredients.forEach((ingredient,index)=>ingredient.sourceRef='USDA-FDC-'+(100000+index));
const culinary=Gate.advance(reviewedDraft,'culinary-reviewed',{reviewerId:'chef-01',role:'culinary',reviewedAt:'2026-09-06T10:00:00Z',notes:'Yield, method, temperature, and cuisine fit verified.'});
eq(culinary.provenance.status,'culinary-reviewed','culinary reviewer advances the first gate');
const authoredDraft=JSON.parse(JSON.stringify(reviewedDraft));authoredDraft.provenance.authorId='chef-01';
throws(()=>Gate.advance(authoredDraft,'culinary-reviewed',{reviewerId:'chef-01',role:'culinary',reviewedAt:'2026-09-06T10:00:00Z',notes:'Self review.'}),/author cannot approve/,'recipe author cannot approve their own work');
throws(()=>Gate.advance(culinary,'production-approved',{reviewerId:'release-01',role:'release',reviewedAt:'2026-09-06T11:00:00Z',notes:'Release check.'}),/release pipeline/,'review stages cannot be skipped');
throws(()=>Gate.advance(culinary,'nutrition-reviewed',{reviewerId:'chef-01',role:'nutrition',reviewedAt:'2026-09-06T11:00:00Z',notes:'Nutrition check.'}),/cannot approve more than one gate/,'same reviewer cannot approve culinary and nutrition gates');
throws(()=>Gate.advance(culinary,'nutrition-reviewed',{reviewerId:'dietitian-01',role:'culinary',reviewedAt:'2026-09-06T11:00:00Z',notes:'Nutrition check.'}),/role must be nutrition/,'reviewer role must match the gate');
const nutrition=Gate.advance(culinary,'nutrition-reviewed',{reviewerId:'dietitian-01',role:'nutrition',reviewedAt:'2026-09-06T11:00:00Z',notes:'Nutrients and source mappings reconciled.'});
const approved=Gate.advance(nutrition,'production-approved',{reviewerId:'release-01',role:'release',reviewedAt:'2026-09-06T12:00:00Z',notes:'Independent release evidence confirmed.'});
ok(Gate.validate(approved).publishable,'recipe becomes publishable after all independent gates pass');
eq(Gate.presentation(approved).label,'Production approved','only a fully gated record receives the approved label');
ok(Gate.assertPublishable(approved),'approved recipe passes the release assertion');

const forged=JSON.parse(JSON.stringify(approved));forged.provenance.reviewHistory[2].reviewerId='chef-01';
ok(Gate.validate(forged).errors.some(x=>x.code==='SELF_APPROVAL_FORBIDDEN'),'forged self-approval is detected during validation');
const reordered=JSON.parse(JSON.stringify(approved));reordered.provenance.reviewHistory.reverse();
ok(Gate.validate(reordered).errors.some(x=>x.code==='REVIEW_SEQUENCE_INVALID'),'reordered release evidence is detected during validation');
const genericApproved=JSON.parse(JSON.stringify(approved));genericApproved.ingredients[0].sourceRef='USDA-FDC-category-egg';
ok(Gate.validate(genericApproved).errors.some(x=>x.code==='INGREDIENT_SOURCE_NOT_RELEASE_READY'),'generic nutrition source cannot pass production approval');

const schemaContext={console,window:null,Number,Math,Object,Array,String,Set,Date};schemaContext.window=schemaContext;
vm.createContext(schemaContext);
for(const file of ['contracts.js','cookbook-schema.js','cookbook-release.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),schemaContext,{filename:file});
ok(schemaContext.CookbookRelease.schemaProfile==='production','release gate declares compatibility with the strict RecipeSchema profile');
ok(schemaContext.CookbookRelease.validate(approved).errors.some(x=>/^SCHEMA_/.test(x.code)),'loaded RecipeSchema blockers are enforced by final release validation');

const catalogAudit=Gate.audit(context.INSYNC_RECIPES);
eq(catalogAudit.count,1440,'release audit covers the complete catalog');
eq(catalogAudit.publishable,0,'no calculated draft is misrepresented as production approved');
eq(catalogAudit.blocked,1440,'all current drafts remain behind the release gate');

console.log(`\n${passed} cookbook release checks passed, ${failed} failed`);
if(failed)process.exitCode=1;

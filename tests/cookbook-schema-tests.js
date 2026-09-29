'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function ok(value, message) { if (value) { passed++; console.log('PASS:', message); } else { failed++; console.error('FAIL:', message); } }
function eq(actual, expected, message) { ok(actual === expected, `${message} (got ${JSON.stringify(actual)})`); }
function hasCode(result, code) { return result.errors.some(error => error.code === code); }

const ctx = { console, window: null, Number, Math, Object, Array, String, Date };
ctx.window = ctx;
vm.createContext(ctx);
for (const file of ['contracts.js', 'cookbook-schema.js', 'cookbook-data.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

const S = ctx.InSyncCookbookSchema;
ok(!!S && S.version === 1, 'Recipe Schema v1 is available as a browser-compatible global');
eq(ctx.InSyncContracts.cookbook.dinerCount.maximum, 20, 'shared contract preserves the universal 1 to 20 diner range');
eq(S.measurementModes.join(','), 'standard,weight', 'schema defines household and weighted display modes');

const foundationAudit = S.validateCatalog(ctx.INSYNC_RECIPES, { profile: 'foundation' });
ok(foundationAudit.ok, 'all 1,440 current records pass the foundation profile');
eq(foundationAudit.count, 1440, 'foundation validation audits the complete bundled catalog');

const productionAudit = S.validateCatalog(ctx.INSYNC_RECIPES, { profile: 'production' });
ok(!productionAudit.ok, 'draft calculated records do not pass the production profile');
ok(productionAudit.errors.some(error => error.code === 'non_specific_nutrition_source'), 'category-level nutrition references are blocked from production');
ok(productionAudit.errors.some(error => error.code === 'missing_preparation_state'), 'missing ingredient preparation states are blocked from production');

const approved = {
  id: 'rcp-pilot-roasted-chicken-bowl', version: 1,
  name: 'Pilot Roasted Chicken Bowl', summary: 'A fully reviewed pilot fixture.',
  cuisine: 'American', region: 'Universal home-kitchen adaptation', mealSlots: ['Lunch'], course: 'Lunch',
  proteins: ['Chicken'], baseServings: 2, yieldLabel: '2 adult servings',
  nutrition: { kcal: 510, protein: 44, carbs: 48, fat: 15, fiber: 7, sugar: 6, saturatedFat: 3, sodium: 540 },
  nutritionBasis: 'per adult serving',
  ingredients: [
    { id: 'chicken-breast-cooked', name: 'Cooked chicken breast', grams: 260, preparationState: 'cooked', standard: { amount: 9.2, unit: 'ounce' }, section: 'Main', optional: false, allergens: [], sourceRef: 'USDA-FDC-171077' },
    { id: 'brown-rice-cooked', name: 'Cooked brown rice', grams: 290, preparationState: 'cooked', standard: { amount: 1.5, unit: 'cup' }, section: 'Main', optional: false, allergens: [], sourceRef: 'USDA-FDC-169756' }
  ],
  instructions: ['Measure all ingredients.', 'Warm the rice and chicken safely, divide evenly, and serve.'],
  time: { prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 }, difficulty: 'Easy', equipment: ['knife', 'cutting board', 'skillet'],
  dietary: { vegetarian: false, vegan: false, glutenFree: true, dairyFree: true }, allergens: [], tags: ['lunch', 'high-protein'],
  flavor: ['savory'], texture: ['hearty'],
  mealPrep: { suitable: true, refrigeratorDays: 3, freezerDays: 30, leftoverQuality: 'good', batchMaxServings: 12 },
  storage: { refrigeratorDays: 3, freezerDays: 30, reheating: 'Reheat to 165 F before serving.' },
  cost: { tier: 'moderate', currencyBasis: 'regional estimate at time of shopping', estimated: true },
  scaling: { minimumServings: 1, maximumServings: 12, method: 'linear', seasoningNote: 'Adjust to taste.' },
  substitutions: [], image: { asset: '', status: 'needed', alt: 'Roasted chicken and brown rice in a bowl' },
  provenance: {
    status: 'production-approved', source: 'InSync pilot recipe with specific food-composition records', authorId: 'author-01',
    reviewHistory: [
      { status: 'culinary-reviewed', reviewerId: 'chef-01', role: 'culinary', reviewedAt: '2026-09-06T10:00:00Z', notes: 'Yield, method, timing, and cuisine fit verified.' },
      { status: 'nutrition-reviewed', reviewerId: 'dietitian-01', role: 'nutrition', reviewedAt: '2026-09-06T11:00:00Z', notes: 'Nutrients and source records reconciled.' },
      { status: 'production-approved', reviewerId: 'release-01', role: 'release', reviewedAt: '2026-09-06T12:00:00Z', notes: 'Independent release evidence confirmed.' }
    ]
  }
};

const approvedResult = S.validateRecipe(approved, { profile: 'production' });
ok(approvedResult.ok, 'a complete independently reviewed recipe passes production validation');
const nullNutrient = JSON.parse(JSON.stringify(approved));
nullNutrient.nutrition.sugar = null;
ok(hasCode(S.validateRecipe(nullNutrient, { profile: 'production' }), 'invalid_nutrient'), 'null cannot be coerced into a valid zero nutrient value');
ok(S.readiness(approved).productionApproved, 'readiness marks only a valid recipe as production approved');
eq(S.canonicalQuantity(approved.ingredients[0]).unit, 'g', 'canonical quantity resolves mass independently of household display');

const ambiguous = JSON.parse(JSON.stringify(approved));
ambiguous.ingredients[0].milliliters = 250;
ok(hasCode(S.validateRecipe(ambiguous, { profile: 'production' }), 'ambiguous_canonical_quantity'), 'production blocks ingredient lines with multiple canonical quantity kinds');

const allergenMismatch = JSON.parse(JSON.stringify(approved));
allergenMismatch.ingredients[0].allergens = ['milk'];
ok(hasCode(S.validateRecipe(allergenMismatch, { profile: 'production' }), 'missing_ingredient_allergen'), 'recipe-level allergens must include ingredient-level allergens');

const falseApproval = JSON.parse(JSON.stringify(approved));
falseApproval.provenance.reviewHistory.splice(1, 1);
const falseApprovalResult = S.validateRecipe(falseApproval, { profile: 'production' });
ok(hasCode(falseApprovalResult, 'missing_review') && !S.readiness(falseApproval).productionApproved, 'a production-approved label cannot bypass a missing review gate');

const selfApproval = JSON.parse(JSON.stringify(approved));
selfApproval.provenance.reviewHistory[1].reviewerId = 'chef-01';
ok(hasCode(S.validateRecipe(selfApproval, { profile: 'production' }), 'self_approval_forbidden'), 'one reviewer cannot approve multiple release gates');

const authorApproval = JSON.parse(JSON.stringify(approved));
authorApproval.provenance.reviewHistory[0].reviewerId = 'author-01';
ok(hasCode(S.validateRecipe(authorApproval, { profile: 'production' }), 'author_self_approval_forbidden'), 'a recorded recipe author cannot approve their own work');

const reorderedApproval = JSON.parse(JSON.stringify(approved));
reorderedApproval.provenance.reviewHistory.reverse();
ok(hasCode(S.validateRecipe(reorderedApproval, { profile: 'production' }), 'invalid_review_order'), 'review history must preserve the canonical gate order');

const duplicateAudit = S.validateCatalog([approved, approved], { profile: 'production' });
ok(hasCode(duplicateAudit, 'duplicate_recipe_id'), 'catalog validation rejects duplicate stable recipe IDs');

console.log(`\n${passed} cookbook schema checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

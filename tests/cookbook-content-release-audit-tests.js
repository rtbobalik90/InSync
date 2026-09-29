'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const context = { console, window: null, Number, Math, Object, Array, String, Set, Date };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'cookbook-data.js'), 'utf8'), context, {
  filename: 'cookbook-data.js'
});

const recipes = JSON.parse(JSON.stringify(context.INSYNC_RECIPES));
let passed = 0;
let failed = 0;

function ok(value, message) {
  if (value) {
    passed += 1;
    console.log('PASS:', message);
  } else {
    failed += 1;
    console.error('FAIL:', message);
  }
}

function eq(actual, expected, message) {
  ok(actual === expected, `${message} (got ${JSON.stringify(actual)})`);
}

function groupBy(items, keyFn) {
  const groups = new Map();
  items.forEach(item => {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return groups;
}

function duplicateSummary(groups) {
  const duplicated = [...groups.values()].filter(group => group.length > 1);
  return {
    unique: groups.size,
    duplicateGroups: duplicated.length,
    recordsInDuplicateGroups: duplicated.reduce((sum, group) => sum + group.length, 0),
    largestGroup: duplicated.reduce((largest, group) => Math.max(largest, group.length), 0)
  };
}

function ingredientFingerprint(recipe) {
  return recipe.ingredients
    .map(item => `${item.id}:${item.grams}:${item.optional ? 1 : 0}`)
    .sort()
    .join('|');
}

function instructionFingerprint(recipe) {
  return recipe.instructions.map(step => step.trim().toLowerCase()).join('|');
}

function structureFingerprint(recipe) {
  return [
    recipe.mealSlots.join(','),
    recipe.ingredients.length,
    recipe.instructions.length,
    recipe.time.prepMinutes,
    recipe.time.cookMinutes,
    recipe.time.totalMinutes,
    recipe.difficulty,
    recipe.mealPrep.refrigeratorDays,
    recipe.mealPrep.freezerDays
  ].join('|');
}

const nameGroups = groupBy(recipes, recipe => recipe.name.trim().toLowerCase());
const ingredientGroups = groupBy(recipes, ingredientFingerprint);
const instructionGroups = groupBy(recipes, instructionFingerprint);
const structureGroups = groupBy(recipes, structureFingerprint);

const crossCuisineGroups = [...ingredientGroups.values()].filter(group => {
  return new Set(group.map(recipe => recipe.cuisine)).size > 1;
});
const recordsWithCrossCuisineIngredientClone = new Set(
  crossCuisineGroups.flat().map(recipe => recipe.id)
).size;

const vagueCookPattern = /\bcook\b[^.]{0,120}\b(?:safely until done|until done)\b/i;
const temperaturePattern = /(?:\b\d{2,3}\s*(?:°\s*)?(?:c|f)\b|internal temperature|thermometer)/i;
const storageSafetyPattern = /(?:within\s+2\s+hours|40\s*(?:°\s*)?f|4\s*(?:°\s*)?c|reheat[^.]*165|reheat[^.]*74)/i;
const genericSaucePattern = /house seasoning sauce/i;
const genericSeasoningPattern = /fresh herbs and spices/i;

const vagueCookDirections = recipes.filter(recipe => vagueCookPattern.test(recipe.instructions.join(' ')));
const temperatureDirections = recipes.filter(recipe => temperaturePattern.test(recipe.instructions.join(' ')));
const storageSafetyDirections = recipes.filter(recipe => {
  const text = [
    ...(recipe.instructions || []),
    recipe.foodSafety || '',
    recipe.storage || '',
    recipe.mealPrep && recipe.mealPrep.reheatingInstructions || ''
  ].join(' ');
  return storageSafetyPattern.test(text);
});
const genericSauceRecipes = recipes.filter(recipe => recipe.ingredients.some(item => item.id === 'sauce' || genericSaucePattern.test(item.name)));
const genericSeasoningRecipes = recipes.filter(recipe => recipe.ingredients.some(item => item.id === 'herbs' || genericSeasoningPattern.test(item.name)));
const genericFlavorAliasRecipes = recipes.filter(recipe => recipe.ingredients.some(item => ['sauce', 'herbs', 'salsa'].includes(item.id)));
const fiveIngredientRecipes = recipes.filter(recipe => recipe.ingredients.length === 5);
const fourIngredientRecipes = recipes.filter(recipe => recipe.ingredients.length === 4);
const missingRegion = recipes.filter(recipe => !recipe.region && !recipe.regionalContext);
const missingPreparationState = recipes.filter(recipe => recipe.ingredients.some(item => !item.preparationState));
const emptySubstitutions = recipes.filter(recipe => !Array.isArray(recipe.substitutions) || recipe.substitutions.length === 0);
const noExplicitStorageInstructions = recipes.filter(recipe => !recipe.storage && !(recipe.mealPrep && recipe.mealPrep.storageInstructions));
const repeatedIngredientWithinRecipe = recipes.filter(recipe => {
  const ids = recipe.ingredients.map(item => item.id);
  return new Set(ids).size !== ids.length;
});

const expectedMethodByTitle = {
  'Roasted': /\broast(?:ed|ing)?\b/i,
  'Protein Bake': /\bbak(?:e|ed|ing)\b/i,
  'Sheet-Pan Dinner': /(?:sheet[ -]pan|\broast(?:ed|ing)?\b|\boven\b)/i,
  'Simmered Stew': /\bsimmer(?:ed|ing)?\b/i,
  'Quick Sauté': /\bsauté(?:ed|ing)?\b/i,
  'Morning Wrap': /\b(?:wrap|roll|fold)\b/i,
  'Lunch Wrap': /\b(?:wrap|roll|fold)\b/i,
  'Hearty Soup': /\b(?:soup|broth|stock|simmer)\b/i,
  'Snack Bites': /\b(?:bite|shape|roll|portion)\b/i
};
const methodMismatchByTitle = {};
Object.entries(expectedMethodByTitle).forEach(([titleToken, pattern]) => {
  methodMismatchByTitle[titleToken] = recipes.filter(recipe => {
    return recipe.name.includes(titleToken) && !pattern.test(recipe.instructions.join(' '));
  }).length;
});

const rawTemperatureRelevantIds = new Set(['egg', 'whites', 'turkey']);
const temperatureRelevantRecipes = recipes.filter(recipe => {
  const protein = recipe.ingredients.find(item => item.section === 'Protein');
  return protein && rawTemperatureRelevantIds.has(protein.id);
});
const temperatureRelevantMissingTemperature = temperatureRelevantRecipes.filter(recipe => !temperaturePattern.test(recipe.instructions.join(' ')));

const cookedAnimalIds = new Set(['chicken', 'beef', 'pork', 'salmon', 'shrimp']);
const cookedAnimalCookAgainRecipes = recipes.filter(recipe => {
  const protein = recipe.ingredients.find(item => item.section === 'Protein');
  return protein && cookedAnimalIds.has(protein.id) && /\bcook\b/i.test(recipe.instructions.join(' '));
});

const cuisineSpecificIngredientIds = new Set([
  'gochujang', 'kimchi', 'gochugaru', 'masa', 'cornTortilla', 'paneer', 'ghee',
  'curryLeaf', 'miso', 'dashi', 'nori', 'soba', 'fishSauce', 'lemongrass',
  'galangal', 'harissa', 'zaatar', 'sumac', 'tahini', 'andouille', 'okra'
]);
const noNamedCuisineSpecificIngredient = recipes.filter(recipe => {
  return !recipe.ingredients.some(item => cuisineSpecificIngredientIds.has(item.id));
});

const statusCounts = recipes.reduce((counts, recipe) => {
  const status = recipe.provenance && recipe.provenance.status || 'missing';
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});

const byMealSlot = recipes.reduce((counts, recipe) => {
  const slot = recipe.mealSlots[0];
  counts[slot] = (counts[slot] || 0) + 1;
  return counts;
}, {});

const byCuisine = recipes.reduce((counts, recipe) => {
  counts[recipe.cuisine] = (counts[recipe.cuisine] || 0) + 1;
  return counts;
}, {});

const metrics = {
  generatedAt: new Date().toISOString(),
  scope: 'InSync generated foundation catalog only',
  recordCount: recipes.length,
  cuisineCount: Object.keys(byCuisine).length,
  byCuisine,
  byMealSlot,
  statusCounts,
  names: duplicateSummary(nameGroups),
  ingredientFingerprints: duplicateSummary(ingredientGroups),
  instructionFingerprints: duplicateSummary(instructionGroups),
  structureFingerprints: duplicateSummary(structureGroups),
  recordsWithCrossCuisineIngredientClone,
  crossCuisineIngredientCloneGroups: crossCuisineGroups.length,
  genericSauceRecipes: genericSauceRecipes.length,
  genericSeasoningRecipes: genericSeasoningRecipes.length,
  genericFlavorAliasRecipes: genericFlavorAliasRecipes.length,
  fiveIngredientRecipes: fiveIngredientRecipes.length,
  fourIngredientRecipes: fourIngredientRecipes.length,
  vagueCookDirections: vagueCookDirections.length,
  recipesWithTemperatureDirection: temperatureDirections.length,
  temperatureRelevantRecipes: temperatureRelevantRecipes.length,
  temperatureRelevantMissingTemperature: temperatureRelevantMissingTemperature.length,
  cookedAnimalIngredientToldToCookAgain: cookedAnimalCookAgainRecipes.length,
  recipesWithStorageSafetyDirection: storageSafetyDirections.length,
  noExplicitStorageInstructions: noExplicitStorageInstructions.length,
  repeatedIngredientWithinRecipe: repeatedIngredientWithinRecipe.length,
  methodMismatchByTitle,
  missingRegion: missingRegion.length,
  missingPreparationState: missingPreparationState.length,
  emptySubstitutions: emptySubstitutions.length,
  noNamedCuisineSpecificIngredient: noNamedCuisineSpecificIngredient.length
};

eq(metrics.recordCount, 1440, 'audit covers the entire generated foundation catalog');
eq(metrics.cuisineCount, 12, 'catalog contains 12 cuisine labels');
ok(Object.values(byCuisine).every(count => count === 120), 'each cuisine label has 120 records');
ok(Object.values(byMealSlot).every(count => count === 360), 'each meal slot has 360 records');
eq(statusCounts['draft-calculated'], 1440, 'every foundation record remains draft-calculated');

eq(metrics.names.unique, 1440, 'generated display names are unique');
eq(metrics.ingredientFingerprints.unique, 362, 'only 362 ingredient fingerprints support 1,440 display names');
ok(metrics.recordsWithCrossCuisineIngredientClone > 0, 'ingredient-identical records cross cuisine labels');
ok(metrics.genericSauceRecipes > recipes.length / 2, 'generic house sauce appears in more than half the catalog');
eq(metrics.genericSeasoningRecipes, 360, 'every snack relies on one generic herbs-and-spices nutrition item');
eq(metrics.genericFlavorAliasRecipes, 1440, 'every record relabels one of three generic flavor records as cuisine-specific');
eq(metrics.fiveIngredientRecipes, 1080, 'every non-snack generated recipe has exactly five ingredients');
eq(metrics.fourIngredientRecipes, 360, 'every generated snack has exactly four ingredients');
eq(metrics.vagueCookDirections, 1080, 'every non-snack record uses the vague cook-until-done instruction');
eq(metrics.recipesWithTemperatureDirection, 0, 'no generated recipe provides an internal cooking temperature or thermometer cue');
ok(metrics.temperatureRelevantRecipes > 0, 'catalog contains egg or ground-turkey recipes that need explicit doneness guidance');
eq(metrics.temperatureRelevantMissingTemperature, metrics.temperatureRelevantRecipes, 'all clearly temperature-relevant records lack explicit temperature guidance');
ok(metrics.cookedAnimalIngredientToldToCookAgain > 0, 'recipes ambiguously tell users to cook ingredients labeled already cooked');
eq(metrics.recipesWithStorageSafetyDirection, 0, 'no record gives time-and-temperature storage or reheating safety directions');
eq(metrics.noExplicitStorageInstructions, 1440, 'all records lack explicit storage instructions');
eq(metrics.missingRegion, 1440, 'all records lack regional context');
eq(metrics.missingPreparationState, 0, 'all records now carry an explicit preparation-state field');
eq(metrics.emptySubstitutions, 1440, 'all records have empty substitution lists');
eq(metrics.noNamedCuisineSpecificIngredient, 1440, 'none use a named cuisine-specific ingredient ID from the audit reference set');
eq(metrics.repeatedIngredientWithinRecipe, 36, '36 snacks repeat the same ingredient as separate lines');
eq(metrics.methodMismatchByTitle.Roasted, 240, 'all Roasted variants omit a roasting method');
eq(metrics.methodMismatchByTitle['Protein Bake'], 72, 'all Protein Bake recipes omit a baking method');
eq(metrics.methodMismatchByTitle['Sheet-Pan Dinner'], 72, 'all Sheet-Pan Dinner recipes omit a sheet-pan or oven method');
eq(metrics.methodMismatchByTitle['Simmered Stew'], 72, 'all Simmered Stew recipes omit a simmering method');
eq(metrics.methodMismatchByTitle['Quick Sauté'], 72, 'all Quick Sauté recipes omit a sautéing method');
eq(metrics.methodMismatchByTitle['Morning Wrap'], 72, 'all Morning Wrap recipes omit assembly directions');
eq(metrics.methodMismatchByTitle['Lunch Wrap'], 72, 'all Lunch Wrap recipes omit assembly directions');
eq(metrics.methodMismatchByTitle['Hearty Soup'], 72, 'all Hearty Soup recipes omit soup liquid and simmering directions');
eq(metrics.methodMismatchByTitle['Snack Bites'], 72, 'all Snack Bites recipes omit shaping or portioning directions');

console.log('\nCONTENT_AUDIT_METRICS=' + JSON.stringify(metrics));
console.log(`\n${passed} cookbook content release checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const context = { console, window: null, globalThis: null, Number, Math, Object, Array, String, Set, Date, JSON };
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of ['contracts.js', 'cookbook-schema.js', 'ingredient-nutrients.js', 'cookbook-data.js', 'pilot-recipes.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}

const Registry = context.InSyncNutrientRegistry;
const catalog = context.INSYNC_RECIPES;
const pilot = context.INSYNC_PILOT_RECIPES;
const CORE = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'];
const DISPLAY = CORE.concat(['sugar', 'saturatedFat', 'cholesterol', 'calcium', 'iron', 'potassium']);
let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log('PASS:', name);
}

function close(actual, expected, tolerance = 0.11) {
  assert(Number.isFinite(actual), `${actual} must be finite`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} must be within ${tolerance} of ${expected}`);
}

function audit(recipes) {
  let ingredientLines = 0;
  let mappedLines = 0;
  let unresolvedLines = 0;
  const unresolvedIds = new Set();
  for (const recipe of recipes) {
    ingredientLines += recipe.ingredients.length;
    const independentlyCalculated = Object.fromEntries(DISPLAY.map(key => [key, 0]));
    const nutrientSupported = Object.fromEntries(DISPLAY.map(key => [key, true]));
    for (const ingredient of recipe.ingredients) {
      const result = Registry.resolve(ingredient);
      if (!result.resolved) {
        unresolvedLines += 1;
        unresolvedIds.add(ingredient.id);
        continue;
      }
      mappedLines += 1;
      assert.strictEqual(ingredient.sourceRef, `USDA-FDC-${result.record.fdcId}`);
      assert.strictEqual(ingredient.nutrientMappingStatus, 'mapped');
      for (const key of DISPLAY) {
        const value = result.record.nutrients[key];
        if (!Number.isFinite(value)) nutrientSupported[key] = false;
        else independentlyCalculated[key] += value * ingredient.grams / 100 / recipe.baseServings;
      }
    }
    for (const key of DISPLAY) {
      if (nutrientSupported[key]) close(recipe.nutrition[key], Math.round(independentlyCalculated[key] * 10) / 10);
      else assert.strictEqual(recipe.nutrition[key], null, `${recipe.id} ${key} must disclose unsupported data`);
    }
    assert.strictEqual(recipe.nutritionProvenance.unresolvedMappings.length, recipe.ingredients.filter(item => item.nutrientMappingStatus === 'blocked').length);
    assert.strictEqual(recipe.provenance.status, 'draft-calculated');
    assert.strictEqual((recipe.provenance.reviewHistory || []).length, 0);
  }
  return { ingredientLines, mappedLines, unresolvedLines, unresolvedIds: [...unresolvedIds].sort() };
}

test('registry contains 69 explicitly selected FoodData Central records', () => {
  assert.strictEqual(Object.keys(Registry.records).length, 69);
  assert.strictEqual(new Set(Object.values(Registry.records).map(row => row.fdcId)).size, 69);
});

test('every mapped record has specific USDA provenance and a complete core panel', () => {
  for (const record of Object.values(Registry.records)) {
    assert.match(record.sourceRef, /^USDA-FDC-\d+$/);
    assert.match(record.sourceUrl, new RegExp(`/food-details/${record.fdcId}/nutrients$`));
    assert(record.datasetRelease && record.publicationDate && record.description);
    for (const key of CORE) assert(Number.isFinite(record.nutrients[key]), `${record.sourceRef} missing ${key}`);
    assert(Number.isFinite(record.nutrients.saturatedFat), `${record.sourceRef} missing saturated fat`);
  }
});

test('composite and non-equivalent placeholders remain explicit blockers', () => {
  assert.deepStrictEqual(Object.keys(Registry.unresolved).sort(), ['beef', 'berries', 'cheese', 'coconutMilk', 'couscous', 'greens', 'herbs', 'pork', 'sauce', 'seaweed', 'soba', 'soySauce', 'spices']);
  for (const id of Object.keys(Registry.unresolved)) {
    const result = Registry.resolve({ id, name: id, grams: 1 });
    assert.strictEqual(result.resolved, false);
    assert(result.reason.length > 20);
  }
  assert.strictEqual(Registry.resolve({ id: 'salsa', name: 'lime cilantro sauce' }).resolved, false);
});

let catalogAudit;
test('all 1,440 catalog records are recalculated deterministically from canonical grams', () => {
  assert.strictEqual(catalog.length, 1440);
  catalogAudit = audit(catalog);
  assert.deepStrictEqual(catalogAudit, {
    ingredientLines: 6840,
    mappedLines: 4836,
    unresolvedLines: 2004,
    unresolvedIds: ['beef', 'berries', 'greens', 'herbs', 'pork', 'salsa', 'sauce', 'turkey']
  });
});

let pilotAudit;
test('all 48 pilot records are recalculated through the same registry', () => {
  assert.strictEqual(pilot.length, 48);
  pilotAudit = audit(pilot);
  assert.deepStrictEqual(pilotAudit, {
    ingredientLines: 334,
    mappedLines: 278,
    unresolvedLines: 56,
    unresolvedIds: ['berries', 'coconutMilk', 'couscous', 'potato', 'seaweed', 'soba', 'soySauce', 'spices', 'sweetPotato']
  });
});

test('coverage is disclosed rather than converted into false approval', () => {
  const all = catalog.concat(pilot);
  assert.strictEqual(all.filter(recipe => recipe.provenance.status !== 'draft-calculated').length, 0);
  assert.strictEqual(all.filter(recipe => recipe.nutritionProvenance.complete).length, 2);
  assert(all.every(recipe => recipe.nutritionProvenance.estimated === true));
  assert(all.every(recipe => !context.InSyncCookbookSchema.readiness(recipe).productionApproved));
});

test('browser and offline shells load the registry before cookbook data', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert(index.indexOf('ingredient-nutrients.js') < index.indexOf('cookbook-data.js'));
  assert(sw.includes("'ingredient-nutrients.js'"));
});

console.log(`\n${passed} nutrient registry checks passed`);

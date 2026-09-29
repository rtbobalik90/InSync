'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const context = { console, window: null, globalThis: null, Number, Math, Object, Array, String, JSON };
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of ['cookbook-data.js', 'meal-scaling.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}

const Scaling = context.MealScaling;
const sample = context.INSYNC_RECIPES.find(recipe => recipe.baseServings === 1);
let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('PASS:', name); }
  catch (error) { console.error('FAIL:', name); throw error; }
}
function close(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
}

test('normalizes universal household counts from 1 through 20', () => {
  assert.strictEqual(Scaling.normalizePeople(0), 1);
  assert.strictEqual(Scaling.normalizePeople(7.4), 7);
  assert.strictEqual(Scaling.normalizePeople(50), 20);
});

test('supports named and custom portion multipliers', () => {
  assert.strictEqual(Scaling.portionMultiplier('small'), 0.75);
  assert.strictEqual(Scaling.portionMultiplier('standard'), 1);
  assert.strictEqual(Scaling.portionMultiplier('large'), 1.25);
  assert.strictEqual(Scaling.portionMultiplier(1.4), 1.4);
});

test('multiplies ingredients by people, per-person servings, portion, and leftovers', () => {
  const scaled = Scaling.scaleRecipe(sample, {
    peopleEating: 4, servingsPerPerson: 1, portion: 'large', leftoverServings: 2, mode: 'weight'
  });
  assert.strictEqual(scaled.plan.eatingServings, 5);
  assert.strictEqual(scaled.plan.preparedServings, 7);
  close(scaled.ingredients[0].exact.grams, sample.ingredients[0].grams * 7);
});

test('keeps personal nutrition separate from household and leftover totals', () => {
  const scaled = Scaling.scaleRecipe(sample, { peopleEating: 3, portion: 'small', leftoverServings: 1 });
  close(scaled.nutrition.perPersonEating.kcal, sample.nutrition.kcal * 0.75, 0.11);
  close(scaled.nutrition.eatingTotal.kcal, sample.nutrition.kcal * 2.25, 0.11);
  close(scaled.nutrition.preparedTotal.kcal, sample.nutrition.kcal * 3.25, 0.11);
  close(scaled.nutrition.leftoversTotal.kcal, sample.nutrition.kcal, 0.11);
});

test('toggles household and weighted display without changing canonical math', () => {
  const standard = Scaling.scaleRecipe(sample, { peopleEating: 3, mode: 'standard' });
  const weight = Scaling.scaleRecipe(sample, { peopleEating: 3, mode: 'weight' });
  close(standard.ingredients[0].exact.grams, weight.ingredients[0].exact.grams);
  assert.notStrictEqual(standard.ingredients[0].display, weight.ingredients[0].display);
  assert.match(weight.ingredients[0].display, /g|kg|mL|L/);
});

test('returns exact and practical quantities instead of corrupting arithmetic with rounding', () => {
  const ingredient = { id: 'oil', name: 'Oil', grams: 4.5, standard: { amount: 1, unit: 'teaspoon' } };
  const scaled = Scaling.scaleIngredient(ingredient, 1.33, 'standard');
  close(scaled.exact.standardAmount, 1.33);
  assert.strictEqual(scaled.practical.standardAmount, 1.375);
  assert.strictEqual(scaled.display, '1 \u215c teaspoons');
});

test('rounds discrete recipe items and grocery purchases to whole units', () => {
  const egg = { id: 'egg', name: 'Egg', grams: 50, standard: { amount: 1, unit: 'large egg' } };
  const scaled = Scaling.scaleIngredient(egg, 2.2, 'standard');
  assert.strictEqual(scaled.exact.standardAmount, 2.2);
  assert.strictEqual(scaled.practical.standardAmount, 3);
  assert.strictEqual(scaled.display, '3 large eggs');
});

test('reports batch maximum overflow without blocking universal household scaling', () => {
  const scaled = Scaling.scaleRecipe(sample, { peopleEating: 20, leftoverServings: 5 });
  assert.strictEqual(scaled.plan.preparedServings, 25);
  assert.strictEqual(scaled.plan.exceedsRecipeBatchMaximum, true);
  assert.ok(scaled.plan.batchesRequired >= 3);
});

test('does not purchase a leftover meal twice', () => {
  const meals = [
    { recipe: sample, peopleEating: 2, leftoverServings: 2 },
    { recipe: sample, peopleEating: 2, leftoverOf: 'meal-1' }
  ];
  const groceries = Scaling.aggregateGroceries(meals, { mode: 'weight' });
  const first = groceries.find(item => item.id === sample.ingredients[0].id);
  close(first.grams, sample.ingredients[0].grams * 4);
  assert.strictEqual(first.occurrences, 1);
});

test('consolidates repeated ingredients across meals by canonical ingredient id', () => {
  const groceries = Scaling.aggregateGroceries([
    { recipe: sample, peopleEating: 2 },
    { recipe: sample, peopleEating: 3 }
  ], { mode: 'weight' });
  const first = groceries.find(item => item.id === sample.ingredients[0].id);
  close(first.grams, sample.ingredients[0].grams * 5);
  assert.strictEqual(first.occurrences, 2);
});

test('deducts measured pantry inventory without dropping the entire grocery line', () => {
  const ingredient = sample.ingredients[0];
  const groceries = Scaling.aggregateGroceries([{ recipe: sample, peopleEating: 3 }], {
    mode: 'weight', pantry: [{ id: ingredient.id, grams: ingredient.grams }]
  });
  const first = groceries.find(item => item.id === ingredient.id);
  close(first.required.grams, ingredient.grams * 2);
  close(first.pantryUsed.grams, ingredient.grams);
  close(first.required.standardAmount, ingredient.standard.amount * 2);
  assert.strictEqual(first.fullyStocked, false);
});

test('converts matching household pantry inventory back to canonical quantity', () => {
  const ingredient = sample.ingredients[0];
  const groceries = Scaling.aggregateGroceries([{ recipe: sample, peopleEating: 3 }], {
    mode: 'standard', pantry: [{
      id: ingredient.id,
      standardAmount: ingredient.standard.amount,
      standardUnit: ingredient.standard.unit
    }]
  });
  const first = groceries.find(item => item.id === ingredient.id);
  close(first.required.grams, ingredient.grams * 2);
  close(first.required.standardAmount, ingredient.standard.amount * 2);
});

test('pantry phrases match whole words without hiding substring lookalikes', () => {
  const grahamRecipe = {
    id: 'rcp-graham', baseServings: 1, nutrition: {},
    ingredients: [{ id: 'graham-crackers', name: 'Graham crackers', grams: 30, standard: { amount: 4, unit: 'piece' } }]
  };
  const unsafe = Scaling.aggregateGroceries([{ recipe: grahamRecipe, peopleEating: 1 }], { pantry: ['ham'] });
  assert.strictEqual(unsafe[0].fullyStocked, false);
  close(unsafe[0].required.grams, 30);
  const safe = Scaling.aggregateGroceries([{ recipe: grahamRecipe, peopleEating: 1 }], { pantry: ['graham'] });
  assert.strictEqual(safe[0].fullyStocked, true);
});

test('preserves incompatible measurements with a shared ingredient id as flagged separate rows', () => {
  const massRecipe = {
    id: 'rcp-shared-mass', baseServings: 1, nutrition: {},
    ingredients: [{ id: 'shared', name: 'Shared ingredient', grams: 100, standard: { amount: 1, unit: 'cup' } }]
  };
  const volumeRecipe = {
    id: 'rcp-shared-volume', baseServings: 1, nutrition: {},
    ingredients: [{ id: 'shared', name: 'Shared ingredient', milliliters: 120, standard: { amount: 8, unit: 'tablespoon' } }]
  };
  const groceries = Scaling.aggregateGroceries([
    { recipe: massRecipe, peopleEating: 1 },
    { recipe: volumeRecipe, peopleEating: 1 }
  ], { mode: 'weight' });
  const shared = groceries.filter(item => item.id === 'shared');
  assert.strictEqual(shared.length, 2);
  assert.ok(shared.every(item => item.measurementConflict));
  close(shared.reduce((total, item) => total + item.grams, 0), 100);
  close(shared.reduce((total, item) => total + item.milliliters, 0), 120);
  assert.ok(shared.every(item => item.conflictReason));
});

test('honors recipe base yield when calculating the ingredient factor', () => {
  const recipe = Object.assign({}, sample, { baseServings: 4 });
  const scaled = Scaling.scaleRecipe(recipe, { peopleEating: 6, mode: 'weight' });
  close(scaled.plan.ingredientFactor, 1.5);
  close(scaled.ingredients[0].exact.grams, sample.ingredients[0].grams * 1.5);
});

test('explicit prepared servings include leftovers but never underfeed current eaters', () => {
  const scaled = Scaling.scaleRecipe(sample, { peopleEating: 4, preparedServings: 2 });
  assert.strictEqual(scaled.plan.eatingServings, 4);
  assert.strictEqual(scaled.plan.preparedServings, 4);
  assert.strictEqual(scaled.plan.leftoverServings, 0);
});

test('supports legacy batch-source meal records while the planner migrates', () => {
  const groceries = Scaling.aggregateGroceries([
    { recipe: sample, dinerCount: 2, portionScale: 1, batchSource: true, servings: 3 }
  ], { mode: 'weight' });
  const first = groceries.find(item => item.id === sample.ingredients[0].id);
  close(first.grams, sample.ingredients[0].grams * 6);
});

console.log(`\n${passed} meal scaling checks passed`);

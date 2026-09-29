'use strict';

/*
 * Independent nutrition release audit for the bundled cookbook.
 *
 * This suite deliberately does not mutate or approve recipe data. It verifies
 * arithmetic and release controls, then inventories evidence gaps that must
 * remain blockers until a qualified human review supplies record-level proof.
 * The audit criteria are grounded in USDA FoodData Central and FDA guidance;
 * broad outlier limits below are software anomaly screens, not dietary advice.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const USDA_FDC_ID = /^USDA-FDC-\d+$/;
const CORE = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'];
const PRODUCTION = CORE.concat(['sugar', 'saturatedFat']);
const FDA_BIG_NINE = [
  'milk', 'egg', 'fish', 'crustacean shellfish', 'tree nuts',
  'peanut', 'wheat', 'soybeans', 'sesame'
];
const ALIASES = {
  eggs: 'egg', shellfish: 'crustacean shellfish', soy: 'soybeans',
  soybean: 'soybeans', peanuts: 'peanut', 'tree nut': 'tree nuts'
};
const ANIMAL_IDS = new Set([
  'egg', 'whites', 'chicken', 'turkey', 'beef', 'pork', 'salmon',
  'shrimp', 'yogurt', 'cottage', 'milk', 'tuna', 'paneer', 'feta', 'honey'
]);
const MEAT_FISH_IDS = new Set(['chicken', 'turkey', 'beef', 'pork', 'salmon', 'shrimp', 'tuna']);
const COMPOSITE_IDS = new Set(['sauce', 'miso', 'soySauce', 'spices']);
const OUTLIER_MAX = { kcal: 2000, protein: 200, carbs: 300, fat: 150, fiber: 100, sodium: 5000 };

function canonicalAllergen(value) {
  const key = String(value == null ? '' : value).trim().toLowerCase();
  return ALIASES[key] || key;
}

function loadCatalog(file, catalogGlobal, foodGlobal) {
  let source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const marker = `window.${catalogGlobal}=`;
  assert(source.includes(marker), `${file} must expose ${catalogGlobal}`);
  source = source.replace(marker, `window.${foodGlobal}=FOOD;\n  ${marker}`);
  const context = { console, window: null, Number, Math, Object, Array, String, Date, JSON, Set };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  const registryPath = path.join(ROOT, 'ingredient-nutrients.js');
  if (fs.existsSync(registryPath)) {
    vm.runInContext(fs.readFileSync(registryPath, 'utf8'), context, { filename: 'ingredient-nutrients.js' });
  }
  vm.runInContext(source, context, { filename: file });
  return { recipes: context[catalogGlobal], food: context[foodGlobal], registry: context.InSyncNutrientRegistry || null };
}

function loadRuntime() {
  const context = { console, window: null, globalThis: null, Number, Math, Object, Array, String, Date, JSON, Set };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  for (const file of ['contracts.js', 'cookbook-schema.js', 'meal-scaling.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  return context;
}

function close(actual, expected, tolerance = 0.11) {
  return Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
}

function foundationFoodRow(row) {
  return {
    kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat,
    fiber: row.fiber, sodium: row.sodium, allergens: row.allergens || [],
    label: row.name
  };
}

function pilotFoodRow(row) {
  return {
    kcal: row[1], protein: row[2], carbs: row[3], fat: row[4],
    fiber: row[5], sodium: row[6], allergens: row[7] || [], label: row[0]
  };
}

function recompute(recipe, food, pilot, registry) {
  const total = Object.fromEntries(CORE.map(key => [key, 0]));
  const recordsBySource = {};
  if (registry && registry.records) {
    Object.values(registry.records).forEach(record => { recordsBySource[record.sourceRef] = record; });
  }
  for (const ingredient of recipe.ingredients) {
    const raw = food[ingredient.id];
    assert(raw, `${recipe.id} references known ingredient ${ingredient.id}`);
    const mapped = recordsBySource[ingredient.sourceRef];
    if (registry && !mapped) continue;
    const row = mapped ? mapped.nutrients : (pilot ? pilotFoodRow(raw) : foundationFoodRow(raw));
    const factor = Number(ingredient.grams) / 100;
    for (const key of CORE) {
      if (typeof row[key] !== 'number' || !Number.isFinite(row[key])) total[key] = null;
      else if (total[key] !== null) total[key] += row[key] * factor;
    }
  }
  const servings = Number(recipe.baseServings) || 1;
  for (const key of CORE) if (total[key] !== null) total[key] = Math.round((total[key] / servings) * 10) / 10;
  return total;
}

function addIssue(bag, code, recipe, detail, severity = 'blocker') {
  bag.push({ code, severity, recipeId: recipe.id, detail });
}

function auditCatalog(label, recipes, food, pilot, registry) {
  const issues = [];
  const metrics = {
    label, recipes: recipes.length, ingredientLines: 0, recomputationMismatches: 0,
    invalidNumbers: 0, outliers: 0, missingSpecificSources: 0,
    ambiguousPreparationStates: 0, sourceStateUnverified: 0,
    allergenMismatches: 0, dietaryContradictions: 0,
    glutenFreeEvidenceGaps: 0, compositeAllergenEvidenceGaps: 0,
    measureEquivalenceFailures: 0, reviewIntegrityFailures: 0,
    productionNutrientGaps: 0
  };
  const ratioGroups = new Map();

  for (const recipe of recipes) {
    metrics.ingredientLines += recipe.ingredients.length;

    const recomputed = recompute(recipe, food, pilot, registry);
    for (const key of CORE) {
      const rawValue = recipe.nutrition && recipe.nutrition[key];
      const value = Number(rawValue);
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < 0) {
        metrics.invalidNumbers++;
        addIssue(issues, 'invalid_nutrient_number', recipe, `${key}=${String(recipe.nutrition && recipe.nutrition[key])}`);
      } else if (!close(value, recomputed[key])) {
        metrics.recomputationMismatches++;
        addIssue(issues, 'nutrient_recomputation_mismatch', recipe, `${key}: stored ${value}, recomputed ${recomputed[key]}`);
      }
      if (Number.isFinite(value) && value > OUTLIER_MAX[key]) {
        metrics.outliers++;
        addIssue(issues, 'software_outlier_screen', recipe, `${key}=${value} exceeds audit screen ${OUTLIER_MAX[key]}`, 'warning');
      }
    }

    for (const key of PRODUCTION) {
      const value = recipe.nutrition && recipe.nutrition[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        metrics.productionNutrientGaps++;
        addIssue(issues, 'missing_production_nutrient', recipe, key);
      }
    }

    const ingredientAllergens = new Set();
    for (const ingredient of recipe.ingredients) {
      const row = pilot ? pilotFoodRow(food[ingredient.id]) : foundationFoodRow(food[ingredient.id]);
      const grams = Number(ingredient.grams);
      const amount = Number(ingredient.standard && ingredient.standard.amount);
      const unit = String(ingredient.standard && ingredient.standard.unit || '').toLowerCase();
      for (const value of ingredient.allergens || []) ingredientAllergens.add(canonicalAllergen(value));

      for (const field of ['grams']) {
        if (!Number.isFinite(Number(ingredient[field])) || Number(ingredient[field]) <= 0) {
          metrics.invalidNumbers++;
          addIssue(issues, 'invalid_ingredient_number', recipe, `${ingredient.id}.${field}=${String(ingredient[field])}`);
        }
      }

      if (!USDA_FDC_ID.test(String(ingredient.sourceRef || ''))) {
        metrics.missingSpecificSources++;
        addIssue(issues, 'non_specific_nutrition_source', recipe, `${ingredient.id}: ${ingredient.sourceRef || 'missing'}`);
      }

      const state = String(ingredient.preparationState || '').trim().toLowerCase();
      if (!state || state === 'as listed' || state === 'state not specified' || state === 'as described in ingredient name') {
        metrics.ambiguousPreparationStates++;
        addIssue(issues, 'ambiguous_preparation_state', recipe, `${ingredient.id}: ${state || 'missing'}`);
      }
      if (state && state !== 'as listed' && !USDA_FDC_ID.test(String(ingredient.sourceRef || ''))) {
        metrics.sourceStateUnverified++;
        addIssue(issues, 'source_state_not_reconciled', recipe, `${ingredient.id}: ${state}`);
      }

      const declared = new Set((ingredient.allergens || []).map(canonicalAllergen));
      for (const expected of row.allergens.map(canonicalAllergen)) {
        if (!declared.has(expected)) {
          metrics.allergenMismatches++;
          addIssue(issues, 'ingredient_allergen_mismatch', recipe, `${ingredient.id} missing ${expected}`);
        }
      }

      if (COMPOSITE_IDS.has(ingredient.id) && !USDA_FDC_ID.test(String(ingredient.sourceRef || ''))) {
        metrics.compositeAllergenEvidenceGaps++;
        addIssue(issues, 'composite_allergen_evidence_gap', recipe, `${ingredient.id} needs a specific product or complete sub-ingredient declaration`);
      }

      if (Number.isFinite(grams) && grams > 0 && Number.isFinite(amount) && amount > 0 && unit) {
        const key = `${ingredient.id}|${unit}`;
        if (!ratioGroups.has(key)) ratioGroups.set(key, []);
        ratioGroups.get(key).push({ recipe, ratio: grams / amount, ingredient });
      }
    }

    const recipeAllergens = new Set((recipe.allergens || []).map(canonicalAllergen));
    for (const allergen of ingredientAllergens) {
      if (!recipeAllergens.has(allergen)) {
        metrics.allergenMismatches++;
        addIssue(issues, 'recipe_allergen_mismatch', recipe, `recipe-level contains list missing ${allergen}`);
      }
    }
    for (const allergen of recipeAllergens) {
      if (!FDA_BIG_NINE.includes(allergen)) {
        metrics.allergenMismatches++;
        addIssue(issues, 'noncanonical_allergen', recipe, allergen);
      }
    }

    const ids = new Set(recipe.ingredients.map(item => item.id));
    const dietary = recipe.dietary || {};
    if (dietary.vegan && [...ids].some(id => ANIMAL_IDS.has(id))) {
      metrics.dietaryContradictions++;
      addIssue(issues, 'vegan_claim_contradiction', recipe, 'animal-derived ingredient present');
    }
    if (dietary.vegetarian && [...ids].some(id => MEAT_FISH_IDS.has(id))) {
      metrics.dietaryContradictions++;
      addIssue(issues, 'vegetarian_claim_contradiction', recipe, 'meat, poultry, fish, or shellfish present');
    }
    if (dietary.dairyFree && recipeAllergens.has('milk')) {
      metrics.dietaryContradictions++;
      addIssue(issues, 'dairy_free_claim_contradiction', recipe, 'milk allergen present');
    }
    if (dietary.glutenFree && recipeAllergens.has('wheat')) {
      metrics.dietaryContradictions++;
      addIssue(issues, 'gluten_free_claim_contradiction', recipe, 'wheat allergen present');
    }
    if (dietary.glutenFree && [...ids].some(id => ['oats', 'miso', 'soySauce', 'sauce', 'spices'].includes(id))) {
      metrics.glutenFreeEvidenceGaps++;
      addIssue(issues, 'gluten_free_claim_needs_product_evidence', recipe, 'claim depends on certified or product-specific ingredient evidence');
    }

    const status = recipe.provenance && recipe.provenance.status;
    const history = recipe.provenance && recipe.provenance.reviewHistory || [];
    if (status !== 'draft-calculated' || history.length !== 0) {
      metrics.reviewIntegrityFailures++;
      addIssue(issues, 'unexpected_release_status', recipe, `${status}; ${history.length} review event(s)`);
    }
  }

  for (const [key, rows] of ratioGroups.entries()) {
    if (rows.length < 2) continue;
    const ratios = rows.map(row => row.ratio).sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)];
    for (const row of rows) {
      const relativeError = Math.abs(row.ratio - median) / median;
      if (relativeError > 0.15) {
        metrics.measureEquivalenceFailures++;
        addIssue(issues, 'dual_measure_internal_inconsistency', row.recipe, `${key}: ${(relativeError * 100).toFixed(1)}% from catalog median`);
      }
    }
  }

  return { metrics, issues };
}

function run() {
  const foundation = loadCatalog('cookbook-data.js', 'INSYNC_RECIPES', '__FOUNDATION_FOOD__');
  const pilot = loadCatalog('pilot-recipes.js', 'INSYNC_PILOT_RECIPES', '__PILOT_FOOD__');
  const runtime = loadRuntime();
  const foundationAudit = auditCatalog('foundation', foundation.recipes, foundation.food, false, foundation.registry);
  const pilotAudit = auditCatalog('pilot', pilot.recipes, pilot.food, true, pilot.registry);
  const all = foundation.recipes.concat(pilot.recipes);

  assert.strictEqual(foundation.recipes.length, 1440, 'complete foundation catalog is audited');
  assert.strictEqual(pilot.recipes.length, 48, 'complete pilot catalog is audited');
  assert.strictEqual(Array.from(runtime.InSyncCookbookSchema.allergens).join('|'), FDA_BIG_NINE.join('|'), 'schema contains all nine FDA major allergens including sesame');
  assert.strictEqual(foundationAudit.metrics.recomputationMismatches, 0, 'foundation stored nutrition recomputes from its embedded generic table');
  assert.strictEqual(pilotAudit.metrics.recomputationMismatches, 0, 'pilot stored nutrition recomputes from its embedded generic table');
  assert.strictEqual(foundationAudit.metrics.invalidNumbers + pilotAudit.metrics.invalidNumbers, 0, 'catalog contains no negative, NaN, or missing core numeric quantities');
  assert.strictEqual(foundationAudit.metrics.dietaryContradictions + pilotAudit.metrics.dietaryContradictions, 0, 'ingredient-level dietary flags have no direct contradictions');
  assert.strictEqual(foundationAudit.metrics.allergenMismatches + pilotAudit.metrics.allergenMismatches, 0, 'embedded ingredient allergens roll up to recipe contains lists');

  let personalScalingFailures = 0;
  for (const recipe of all) {
    const one = runtime.MealScaling.scaleRecipe(recipe, { peopleEating: 1, portion: 'standard' });
    for (const peopleEating of [4, 20]) {
      const household = runtime.MealScaling.scaleRecipe(recipe, { peopleEating, portion: 'standard' });
      for (const key of CORE) {
        if (!close(household.nutrition.perPersonEating[key], one.nutrition.perPersonEating[key])) personalScalingFailures++;
        if (!close(household.nutrition.eatingTotal[key], one.nutrition.perPersonEating[key] * peopleEating)) personalScalingFailures++;
      }
    }
  }
  assert.strictEqual(personalScalingFailures, 0, 'personal nutrition remains independent of household count for all 1,488 records');

  const productionFoundation = runtime.InSyncCookbookSchema.validateCatalog(foundation.recipes, { profile: 'production' });
  const productionPilot = runtime.InSyncCookbookSchema.validateCatalog(pilot.recipes, { profile: 'production' });
  assert.strictEqual(productionFoundation.ok, false, 'foundation catalog remains blocked from production');
  assert.strictEqual(productionPilot.ok, false, 'pilot catalog remains blocked from production');
  assert(foundationAudit.metrics.missingSpecificSources > 0 && pilotAudit.metrics.missingSpecificSources > 0, 'specific food-composition records are required before release');
  assert.strictEqual(foundationAudit.metrics.reviewIntegrityFailures + pilotAudit.metrics.reviewIntegrityFailures, 0, 'draft status and empty review history are internally honest');

  const result = {
    verdict: 'BLOCKED',
    auditedRecipes: all.length,
    nutritionArithmetic: 'internally_recomputed_from_current_mapped_registry_records',
    productionCertification: false,
    personalNutritionHouseholdIsolation: personalScalingFailures === 0,
    officialBasis: {
      usdaDataDocumentation: 'https://fdc.nal.usda.gov/data-documentation/',
      usdaApiGuide: 'https://fdc.nal.usda.gov/api-guide/',
      fdaFoodAllergies: 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies',
      fdaServingSize: 'https://www.fda.gov/food/nutrition-facts-label/serving-size-nutrition-facts-label',
      fdaGlutenFree: 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/gluten-free-labeling-foods'
    },
    catalogs: [foundationAudit.metrics, pilotAudit.metrics],
    blockerCounts: {
      nonSpecificIngredientSources: foundationAudit.metrics.missingSpecificSources + pilotAudit.metrics.missingSpecificSources,
      ambiguousPreparationStates: foundationAudit.metrics.ambiguousPreparationStates + pilotAudit.metrics.ambiguousPreparationStates,
      stateSpecificSourceReconciliationsNeeded: foundationAudit.metrics.sourceStateUnverified + pilotAudit.metrics.sourceStateUnverified,
      missingProductionNutrientFields: foundationAudit.metrics.productionNutrientGaps + pilotAudit.metrics.productionNutrientGaps,
      compositeAllergenEvidenceGaps: foundationAudit.metrics.compositeAllergenEvidenceGaps + pilotAudit.metrics.compositeAllergenEvidenceGaps,
      glutenFreeEvidenceGaps: foundationAudit.metrics.glutenFreeEvidenceGaps + pilotAudit.metrics.glutenFreeEvidenceGaps,
      dualMeasureInconsistencies: foundationAudit.metrics.measureEquivalenceFailures + pilotAudit.metrics.measureEquivalenceFailures,
      namedHumanNutritionReviews: 0,
      namedHumanCulinaryReviews: 0,
      independentReleaseApprovals: 0
    },
    sampleIssues: foundationAudit.issues.concat(pilotAudit.issues).slice(0, 30)
  };
  console.log(JSON.stringify(result, null, 2));
  console.log('\nPASS: audit controls executed and correctly refused production certification');
}

run();

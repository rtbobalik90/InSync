/* InSync Cookbook Schema v1.
   This module validates bundled recipe data without network access. It keeps a
   foundation profile for the current draft catalog and a stricter production
   profile for records that may be represented as reviewed or approved. */
(function () {
  'use strict';

  var CONTRACT = window.InSyncContracts && window.InSyncContracts.cookbook || {};
  var SCHEMA_VERSION = 1;
  var MEAL_SLOTS = (CONTRACT.mealSlots || ['Breakfast', 'Lunch', 'Dinner', 'Snack']).slice();
  var MEASUREMENT_MODES = (CONTRACT.measurementModes || ['standard', 'weight']).slice();
  var STATUSES = (CONTRACT.recipeStatuses || ['draft-calculated', 'culinary-reviewed', 'nutrition-reviewed', 'production-approved']).slice();
  var ALLERGENS = ['milk', 'egg', 'fish', 'crustacean shellfish', 'tree nuts', 'peanut', 'wheat', 'soybeans', 'sesame'];
  var ALLERGEN_ALIASES = { shellfish: 'crustacean shellfish', soy: 'soybeans', 'tree nut': 'tree nuts', peanuts: 'peanut' };
  var REVIEW_ROLES = { 'culinary-reviewed': 'culinary', 'nutrition-reviewed': 'nutrition', 'production-approved': 'release' };
  var CORE_NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'];
  var PRODUCTION_NUTRIENTS = CORE_NUTRIENTS.concat(['sugar', 'saturatedFat']);
  var EXTENDED_NUTRIENTS = PRODUCTION_NUTRIENTS.concat(['cholesterol', 'calcium', 'iron', 'potassium']);
  var HOUSEHOLD_UNITS = [
    'cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'ounce',
    'piece', 'slice', 'clove', 'can', 'package', 'large egg',
    'medium apple', 'medium banana', 'medium avocado', 'tortilla'
  ];

  function text(value) { return String(value == null ? '' : value).trim(); }
  function numeric(value) { return typeof value === 'number' && Number.isFinite(value); }
  function positive(value) { return numeric(value) && value > 0; }
  function nonNegative(value) { return numeric(value) && value >= 0; }
  function integer(value) { return typeof value === 'number' && Number.isInteger(value); }
  function array(value) { return Array.isArray(value) ? value : []; }
  function optionProfile(options) { return options && options.profile === 'production' ? 'production' : 'foundation'; }
  function add(errors, path, code, message) { errors.push({ path: path, code: code, message: message }); }
  function canonicalAllergen(value) {
    value = text(value).toLowerCase();
    return ALLERGEN_ALIASES[value] || value;
  }
  function unique(values) {
    var seen = {};
    return array(values).filter(function (value) {
      var key = text(value).toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function hasSpecificNutritionSource(sourceRef) {
    sourceRef = text(sourceRef);
    return /^USDA-FDC-\d+$/.test(sourceRef) || /^(CIQUAL|CoFID|AUSNUT|CNF|NEVO|IFCT)-[A-Za-z0-9._-]+$/.test(sourceRef);
  }
  function isIsoDate(value) {
    value = text(value);
    return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z)?$/.test(value) && !isNaN(Date.parse(value));
  }

  function canonicalQuantity(ingredient) {
    ingredient = ingredient || {};
    if (positive(ingredient.grams)) return { kind: 'mass', value: +ingredient.grams, unit: 'g' };
    if (positive(ingredient.milliliters)) return { kind: 'volume', value: +ingredient.milliliters, unit: 'mL' };
    if (positive(ingredient.count)) return { kind: 'count', value: +ingredient.count, unit: text(ingredient.countUnit) || 'piece' };
    return null;
  }

  function validateReviewHistory(provenance, errors) {
    provenance = provenance || {};
    var statusIndex = STATUSES.indexOf(provenance.status);
    if (statusIndex < 0) return;
    var history = array(provenance.reviewHistory), reviewers = [];
    var requiredStatuses = STATUSES.slice(1, statusIndex + 1);
    requiredStatuses.forEach(function (reviewStatus, requiredIndex) {
      var review = history.find(function (event) { return event && event.status === reviewStatus; });
      var path = 'provenance.reviewHistory';
      if (!review) {
        add(errors, path, 'missing_review', 'Missing review evidence for ' + reviewStatus + '.');
        return;
      }
      if (history.indexOf(review) !== requiredIndex) add(errors, path, 'invalid_review_order', 'Review evidence must follow the release pipeline order.');
      if (!text(review.reviewerId)) add(errors, path, 'missing_reviewer', 'Reviewer identity is required for ' + reviewStatus + '.');
      if (text(review.role).toLowerCase() !== REVIEW_ROLES[reviewStatus]) add(errors, path, 'invalid_review_role', 'Reviewer role must match the release gate.');
      if (!isIsoDate(review.reviewedAt)) add(errors, path, 'invalid_review_date', 'Review date must be an ISO date.');
      if (!text(review.notes)) add(errors, path, 'missing_review_notes', 'Review notes are required.');
      if (text(review.reviewerId)) reviewers.push(text(review.reviewerId).toLowerCase());
    });
    if (history.length !== requiredStatuses.length) add(errors, 'provenance.reviewHistory', 'invalid_review_history_length', 'Review history must contain exactly the gates attained by the current status.');
    if (unique(reviewers).length !== reviewers.length) add(errors, 'provenance.reviewHistory', 'self_approval_forbidden', 'Each release gate requires a different reviewer.');
    var authorId = text(provenance.authorId).toLowerCase();
    if (authorId && reviewers.indexOf(authorId) >= 0) add(errors, 'provenance.reviewHistory', 'author_self_approval_forbidden', 'The recipe author cannot review or approve the same recipe.');
  }

  function validateIngredient(ingredient, options) {
    var errors = [], profile = optionProfile(options), item = ingredient || {};
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text(item.id))) add(errors, 'id', 'invalid_ingredient_id', 'Ingredient ID must be stable and URL-safe.');
    if (!text(item.name)) add(errors, 'name', 'missing_ingredient_name', 'Ingredient display name is required.');
    if (!canonicalQuantity(item)) add(errors, 'quantity', 'missing_canonical_quantity', 'A positive gram, milliliter, or count quantity is required.');
    var quantityKinds = [positive(item.grams), positive(item.milliliters), positive(item.count)].filter(Boolean).length;
    if (profile === 'production' && quantityKinds !== 1) add(errors, 'quantity', 'ambiguous_canonical_quantity', 'Production ingredients must use exactly one canonical quantity kind.');
    if (!item.standard || !positive(item.standard.amount) || !text(item.standard.unit)) {
      add(errors, 'standard', 'missing_household_measure', 'A positive household amount and unit are required.');
    } else if (profile === 'production' && HOUSEHOLD_UNITS.indexOf(text(item.standard.unit).toLowerCase()) < 0) {
      add(errors, 'standard.unit', 'unknown_household_unit', 'Household unit must be in the canonical unit registry.');
    }
    if (!text(item.section)) add(errors, 'section', 'missing_section', 'Recipe section is required.');
    if (!Array.isArray(item.allergens)) add(errors, 'allergens', 'invalid_allergens', 'Ingredient allergens must be an array.');
    array(item.allergens).forEach(function (allergen, index) {
      if (ALLERGENS.indexOf(canonicalAllergen(allergen)) < 0) add(errors, 'allergens.' + index, 'unknown_allergen', 'Use a canonical allergen value.');
    });
    if (!text(item.sourceRef)) add(errors, 'sourceRef', 'missing_nutrition_source', 'Nutrition source reference is required.');
    if (profile === 'production' && !hasSpecificNutritionSource(item.sourceRef)) add(errors, 'sourceRef', 'non_specific_nutrition_source', 'Production ingredients require a specific food-composition record ID.');
    if (profile === 'production' && (!text(item.preparationState) || /^(as listed|as described in ingredient name|state not specified)$/i.test(text(item.preparationState)))) add(errors, 'preparationState', 'missing_preparation_state', 'A specific preparation state, such as raw, cooked, drained, or chopped, is required.');
    return { ok: !errors.length, profile: profile, errors: errors, canonicalQuantity: canonicalQuantity(item) };
  }

  function validateRecipe(recipe, options) {
    var errors = [], profile = optionProfile(options), item = recipe || {};
    if (!/^rcp-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(item.id))) add(errors, 'id', 'invalid_recipe_id', 'Recipe ID must begin with rcp- and remain stable.');
    if (!integer(item.version) || +item.version < 1) add(errors, 'version', 'invalid_version', 'Recipe version must be a positive integer.');
    if (!text(item.name)) add(errors, 'name', 'missing_name', 'Recipe name is required.');
    if (!text(item.summary)) add(errors, 'summary', 'missing_summary', 'Recipe summary is required.');
    if (!text(item.cuisine)) add(errors, 'cuisine', 'missing_cuisine', 'Cuisine is required.');
    if (!array(item.mealSlots).length) add(errors, 'mealSlots', 'missing_meal_slots', 'At least one meal slot is required.');
    array(item.mealSlots).forEach(function (slot, index) {
      if (MEAL_SLOTS.indexOf(slot) < 0) add(errors, 'mealSlots.' + index, 'invalid_meal_slot', 'Meal slot is not supported.');
    });
    if (!positive(item.baseServings)) add(errors, 'baseServings', 'invalid_base_servings', 'Base servings must be greater than zero.');
    if (!text(item.yieldLabel)) add(errors, 'yieldLabel', 'missing_yield_label', 'Human-readable yield is required.');

    var nutrientKeys = profile === 'production' ? PRODUCTION_NUTRIENTS : CORE_NUTRIENTS;
    nutrientKeys.forEach(function (key) {
      if (!nonNegative(item.nutrition && item.nutrition[key])) add(errors, 'nutrition.' + key, 'invalid_nutrient', key + ' must be a non-negative number per serving.');
    });
    if (!text(item.nutritionBasis)) add(errors, 'nutritionBasis', 'missing_nutrition_basis', 'Nutrition basis is required.');

    if (!Array.isArray(item.ingredients) || item.ingredients.length < 2) add(errors, 'ingredients', 'insufficient_ingredients', 'At least two structured ingredients are required.');
    array(item.ingredients).forEach(function (ingredient, index) {
      validateIngredient(ingredient, options).errors.forEach(function (error) {
        add(errors, 'ingredients.' + index + '.' + error.path, error.code, error.message);
      });
    });
    if (!Array.isArray(item.instructions) || !item.instructions.length) add(errors, 'instructions', 'missing_instructions', 'Cooking instructions are required.');
    array(item.instructions).forEach(function (step, index) {
      if (!text(step)) add(errors, 'instructions.' + index, 'empty_instruction', 'Instruction steps cannot be empty.');
    });

    ['prepMinutes', 'cookMinutes', 'totalMinutes'].forEach(function (key) {
      if (!nonNegative(item.time && item.time[key])) add(errors, 'time.' + key, 'invalid_time', key + ' must be a non-negative number.');
    });
    if (item.time && nonNegative(item.time.totalMinutes) && nonNegative(item.time.prepMinutes) && nonNegative(item.time.cookMinutes) && +item.time.totalMinutes < +item.time.prepMinutes + +item.time.cookMinutes) {
      add(errors, 'time.totalMinutes', 'inconsistent_total_time', 'Total time cannot be less than prep time plus cook time.');
    }
    if (!text(item.difficulty)) add(errors, 'difficulty', 'missing_difficulty', 'Difficulty is required.');
    if (!array(item.equipment).length) add(errors, 'equipment', 'missing_equipment', 'At least one equipment item is required.');
    ['vegetarian', 'vegan', 'glutenFree', 'dairyFree'].forEach(function (key) {
      if (!item.dietary || typeof item.dietary[key] !== 'boolean') add(errors, 'dietary.' + key, 'invalid_dietary_flag', key + ' must be explicitly true or false.');
    });
    if (!Array.isArray(item.allergens)) add(errors, 'allergens', 'invalid_allergens', 'Recipe allergens must be an array.');
    var ingredientAllergens = unique([].concat.apply([], array(item.ingredients).map(function (ingredient) { return array(ingredient.allergens).map(canonicalAllergen); })));
    var recipeAllergens = unique(array(item.allergens).map(canonicalAllergen));
    ingredientAllergens.forEach(function (allergen) {
      if (recipeAllergens.indexOf(allergen) < 0) add(errors, 'allergens', 'missing_ingredient_allergen', 'Recipe allergen list must include ' + allergen + '.');
    });

    if (!item.scaling || !positive(item.scaling.minimumServings) || !positive(item.scaling.maximumServings) || +item.scaling.maximumServings < +item.scaling.minimumServings) add(errors, 'scaling', 'invalid_scaling_range', 'Scaling requires a valid minimum and maximum serving range.');
    if (!item.mealPrep || typeof item.mealPrep.suitable !== 'boolean') add(errors, 'mealPrep', 'invalid_meal_prep', 'Meal-prep suitability must be explicit.');
    if (!Array.isArray(item.substitutions)) add(errors, 'substitutions', 'invalid_substitutions', 'Substitutions must be an array.');
    if (!item.provenance || STATUSES.indexOf(item.provenance.status) < 0 || !text(item.provenance.source)) add(errors, 'provenance', 'invalid_provenance', 'Provenance requires a recognized status and source.');

    if (profile === 'production') {
      if (!text(item.region)) add(errors, 'region', 'missing_region', 'Regional origin or universal adaptation note is required.');
      if (!Array.isArray(item.tags) || !item.tags.length) add(errors, 'tags', 'missing_tags', 'Search tags are required.');
      if (!item.storage || !nonNegative(item.storage.refrigeratorDays) || !text(item.storage.reheating)) add(errors, 'storage', 'missing_storage_guidance', 'Production recipes require refrigeration and reheating guidance.');
      if (!item.cost || !text(item.cost.tier) || !text(item.cost.currencyBasis)) add(errors, 'cost', 'missing_cost_basis', 'Cost tier and regional currency basis are required.');
      if (!item.image || !text(item.image.status) || !text(item.image.alt)) add(errors, 'image', 'invalid_image_metadata', 'Image status and accessible alt text are required.');
      validateReviewHistory(item.provenance, errors);
    }
    return { ok: !errors.length, profile: profile, errors: errors };
  }

  function validateCatalog(recipes, options) {
    var errors = [], ids = {}, list = array(recipes);
    list.forEach(function (recipe, index) {
      validateRecipe(recipe, options).errors.forEach(function (error) {
        errors.push({ index: index, id: recipe && recipe.id || '', path: error.path, code: error.code, message: error.message });
      });
      var id = text(recipe && recipe.id);
      if (id && ids[id]) errors.push({ index: index, id: id, path: 'id', code: 'duplicate_recipe_id', message: 'Recipe ID is duplicated.' });
      ids[id] = true;
    });
    return { ok: !errors.length, profile: optionProfile(options), count: list.length, errors: errors };
  }

  function readiness(recipe) {
    var foundation = validateRecipe(recipe, { profile: 'foundation' });
    var production = validateRecipe(recipe, { profile: 'production' });
    var status = recipe && recipe.provenance && recipe.provenance.status || '';
    return {
      schemaValid: foundation.ok,
      productionValid: production.ok,
      nutritionReviewed: status === 'nutrition-reviewed' || status === 'production-approved',
      culinaryReviewed: status === 'culinary-reviewed' || status === 'nutrition-reviewed' || status === 'production-approved',
      productionApproved: status === 'production-approved' && production.ok,
      blockers: production.errors.slice()
    };
  }

  window.InSyncCookbookSchema = {
    version: SCHEMA_VERSION,
    profiles: ['foundation', 'production'],
    mealSlots: MEAL_SLOTS,
    measurementModes: MEASUREMENT_MODES,
    statuses: STATUSES,
    allergens: ALLERGENS.slice(),
    coreNutrients: CORE_NUTRIENTS.slice(),
    productionNutrients: PRODUCTION_NUTRIENTS.slice(),
    extendedNutrients: EXTENDED_NUTRIENTS.slice(),
    householdUnits: HOUSEHOLD_UNITS.slice(),
    canonicalQuantity: canonicalQuantity,
    validateIngredient: validateIngredient,
    validateRecipe: validateRecipe,
    validateCatalog: validateCatalog,
    readiness: readiness
  };
})();

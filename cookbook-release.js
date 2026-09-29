/* InSync cookbook safety and release gate.
   This module is intentionally independent from recipe generation and display.
   A structurally valid draft is not the same thing as production-approved food
   or nutrition content. */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CookbookRelease = api;
})(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';

  var STATUSES = [
    'draft-calculated',
    'culinary-reviewed',
    'nutrition-reviewed',
    'production-approved'
  ];
  var REQUIRED_NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'];
  /* Canonical vocabulary follows the FDA's nine major food allergens. Legacy
     recipe terms are normalized so older records can migrate safely. */
  var KNOWN_ALLERGENS = ['egg', 'fish', 'milk', 'peanut', 'sesame', 'crustacean shellfish', 'soybeans', 'tree nuts', 'wheat'];
  var ALLERGEN_ALIASES = {'shellfish':'crustacean shellfish', 'soy':'soybeans', 'tree nut':'tree nuts', 'peanuts':'peanut'};
  var SOURCES = {
    foodDataCentralApi:'https://fdc.nal.usda.gov/api-guide',
    foodDataCentralDocumentation:'https://fdc.nal.usda.gov/data-documentation',
    fdaFoodAllergies:'https://www.fda.gov/food/food-labeling-nutrition/food-allergies'
  };
  var ROLE_FOR_STATUS = {
    'culinary-reviewed': 'culinary',
    'nutrition-reviewed': 'nutrition',
    'production-approved': 'release'
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function canonicalAllergen(value) {
    value = lower(value);
    return ALLERGEN_ALIASES[value] || value;
  }
  function unique(values, normalize) {
    var seen = {};
    return (values || []).map(normalize || lower).filter(function (value) {
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    }).sort();
  }
  function finiteNonnegative(value) { return Number.isFinite(+value) && +value >= 0; }
  function statusOf(recipe) {
    var status = lower(recipe && recipe.provenance && recipe.provenance.status);
    return STATUSES.indexOf(status) >= 0 ? status : '';
  }
  function reviewHistory(recipe) {
    var history = recipe && recipe.provenance && recipe.provenance.reviewHistory;
    return Array.isArray(history) ? history : [];
  }
  function eventFor(recipe, status) {
    return reviewHistory(recipe).find(function (event) {
      return lower(event && event.status) === status;
    }) || null;
  }
  function specificSource(source) {
    var value = clean(source);
    return value.length >= 6 && !/(category|formula|test[- ]kitchen|placeholder|unresolved|pending|unknown|tbd)/i.test(value);
  }
  function add(list, code, message, path) {
    list.push({code:code, message:message, path:path || ''});
  }
  function arraysEqual(a, b) {
    return a.length === b.length && a.every(function (value, index) { return value === b[index]; });
  }

  function validateNutrition(recipe, errors, warnings) {
    var nutrition = recipe && recipe.nutrition;
    if (!nutrition || typeof nutrition !== 'object') {
      add(errors, 'NUTRITION_MISSING', 'Nutrition per serving is required.', 'nutrition');
      return;
    }
    REQUIRED_NUTRIENTS.forEach(function (key) {
      if (!finiteNonnegative(nutrition[key])) {
        add(errors, 'NUTRIENT_INVALID', key + ' must be a finite, nonnegative number.', 'nutrition.' + key);
      }
    });
    if (finiteNonnegative(nutrition.kcal) && +nutrition.kcal <= 0) {
      add(errors, 'CALORIES_EMPTY', 'Calories per serving must be greater than zero.', 'nutrition.kcal');
    }
    if (!clean(recipe && recipe.nutritionBasis)) {
      add(errors, 'NUTRITION_BASIS_MISSING', 'Nutrition must identify its serving basis.', 'nutritionBasis');
    }
    if (REQUIRED_NUTRIENTS.every(function (key) { return finiteNonnegative(nutrition[key]); })) {
      var macroCalories = (+nutrition.protein * 4) + (+nutrition.carbs * 4) + (+nutrition.fat * 9);
      var reported = +nutrition.kcal;
      if (reported > 0 && Math.abs(macroCalories - reported) / reported > 0.35) {
        add(warnings, 'MACRO_ENERGY_VARIANCE', 'Calculated macro energy differs from reported calories by more than 35%.', 'nutrition');
      }
    }
  }

  function validateAllergens(recipe, errors) {
    var ingredients = Array.isArray(recipe && recipe.ingredients) ? recipe.ingredients : [];
    if (!Array.isArray(recipe && recipe.allergens)) {
      add(errors, 'ALLERGEN_DECLARATION_MISSING', 'Recipe contains allergens must be an explicit array, including when empty.', 'allergens');
    }
    ingredients.forEach(function (item, index) {
      if (!Array.isArray(item && item.allergens)) {
        add(errors, 'INGREDIENT_ALLERGEN_DECLARATION_MISSING', 'Every ingredient needs an explicit contains-allergens array.', 'ingredients.' + index + '.allergens');
      }
    });
    var declared = unique(recipe && recipe.allergens, canonicalAllergen);
    var ingredientAllergens = unique([].concat.apply([], ingredients.map(function (item) {
      return Array.isArray(item && item.allergens) ? item.allergens : [];
    })), canonicalAllergen);
    var advisory = unique(recipe && recipe.mayContainAllergens, canonicalAllergen);
    declared.concat(ingredientAllergens).forEach(function (allergen) {
      if (KNOWN_ALLERGENS.indexOf(allergen) < 0) {
        add(errors, 'ALLERGEN_UNKNOWN', 'Unknown allergen declaration: ' + allergen + '.', 'allergens');
      }
    });
    ingredientAllergens.forEach(function (allergen) {
      if (declared.indexOf(allergen) < 0) {
        add(errors, 'ALLERGEN_UNDECLARED', allergen + ' is present in an ingredient but missing from the recipe declaration.', 'allergens');
      }
    });
    declared.forEach(function (allergen) {
      if (ingredientAllergens.indexOf(allergen) < 0) {
        add(errors, 'ALLERGEN_UNSUPPORTED', allergen + ' is declared at recipe level but not supported by an ingredient declaration.', 'allergens');
      }
    });
    if (!arraysEqual(declared, ingredientAllergens)) {
      add(errors, 'ALLERGEN_SET_MISMATCH', 'Recipe and ingredient allergen declarations must match.', 'allergens');
    }
    advisory.forEach(function (allergen) {
      if (KNOWN_ALLERGENS.indexOf(allergen) < 0) {
        add(errors, 'ADVISORY_ALLERGEN_UNKNOWN', 'Unknown may-contain allergen: ' + allergen + '.', 'mayContainAllergens');
      }
      if (declared.indexOf(allergen) >= 0) {
        add(errors, 'ADVISORY_CONTAINS_CONFLICT', allergen + ' cannot be both contained and advisory may-contain.', 'mayContainAllergens');
      }
    });
  }

  function validateDietaryClaims(recipe, errors) {
    var dietary = recipe && recipe.dietary;
    if (!dietary || typeof dietary !== 'object') {
      add(errors, 'DIETARY_MISSING', 'Dietary compatibility flags are required.', 'dietary');
      return;
    }
    ['vegetarian', 'vegan', 'glutenFree', 'dairyFree'].forEach(function (claim) {
      if (typeof dietary[claim] !== 'boolean') {
        add(errors, 'DIETARY_FLAG_INVALID', claim + ' must be explicitly true or false.', 'dietary.' + claim);
      }
    });
    var allergens = unique(recipe && recipe.allergens, canonicalAllergen);
    var ingredientText = (recipe && recipe.ingredients || []).map(function (item) {
      return lower(item && item.name);
    }).join(' ');
    var animalMeat = /\b(beef|chicken|pork|turkey|salmon|shrimp|fish|shellfish|lamb|veal|bacon|ham)\b/.test(ingredientText);
    if (dietary.glutenFree === true && allergens.indexOf('wheat') >= 0) {
      add(errors, 'GLUTEN_FREE_CONFLICT', 'A gluten-free claim conflicts with a wheat declaration.', 'dietary.glutenFree');
    }
    if (dietary.dairyFree === true && allergens.indexOf('milk') >= 0) {
      add(errors, 'DAIRY_FREE_CONFLICT', 'A dairy-free claim conflicts with a milk declaration.', 'dietary.dairyFree');
    }
    if (dietary.vegan === true) {
      if (dietary.vegetarian !== true || dietary.dairyFree !== true) {
        add(errors, 'VEGAN_FLAG_CONFLICT', 'A vegan recipe must also be vegetarian and dairy-free.', 'dietary.vegan');
      }
      if (animalMeat || allergens.some(function (a) { return ['egg', 'fish', 'milk', 'shellfish'].indexOf(a) >= 0; })) {
        add(errors, 'VEGAN_INGREDIENT_CONFLICT', 'A vegan claim conflicts with animal-derived ingredients or allergens.', 'dietary.vegan');
      }
    }
    if (dietary.vegetarian === true && (animalMeat || allergens.some(function (a) { return ['fish', 'shellfish'].indexOf(a) >= 0; }))) {
      add(errors, 'VEGETARIAN_INGREDIENT_CONFLICT', 'A vegetarian claim conflicts with meat or seafood ingredients.', 'dietary.vegetarian');
    }
  }

  function validateProvenance(recipe, status, errors, warnings) {
    var provenance = recipe && recipe.provenance;
    if (!provenance || typeof provenance !== 'object') {
      add(errors, 'PROVENANCE_MISSING', 'Recipe provenance is required.', 'provenance');
      return;
    }
    if (!clean(provenance.source)) add(errors, 'RECIPE_SOURCE_MISSING', 'A recipe-level source is required.', 'provenance.source');
    (recipe.ingredients || []).forEach(function (ingredient, index) {
      if (!clean(ingredient && ingredient.sourceRef)) {
        add(errors, 'INGREDIENT_SOURCE_MISSING', 'Every ingredient needs a nutrition source reference.', 'ingredients.' + index + '.sourceRef');
      } else if (!specificSource(ingredient.sourceRef)) {
        add(warnings, 'INGREDIENT_SOURCE_GENERIC', 'Ingredient source must be replaced with a specific record before approval.', 'ingredients.' + index + '.sourceRef');
      }
    });
    if (status === 'production-approved' && !specificSource(provenance.source)) {
      add(errors, 'RECIPE_SOURCE_NOT_RELEASE_READY', 'Production recipes require specific, non-placeholder provenance.', 'provenance.source');
    }
    if (status === 'production-approved') {
      (recipe.ingredients || []).forEach(function (ingredient, index) {
        if (!specificSource(ingredient && ingredient.sourceRef)) {
          add(errors, 'INGREDIENT_SOURCE_NOT_RELEASE_READY', 'Production ingredients require specific source records.', 'ingredients.' + index + '.sourceRef');
        }
      });
    }
  }

  function validateReviews(recipe, status, errors) {
    var statusIndex = STATUSES.indexOf(status);
    if (statusIndex < 0) {
      add(errors, 'STATUS_INVALID', 'Status must follow the cookbook release pipeline.', 'provenance.status');
      return;
    }
    var required = STATUSES.slice(1, statusIndex + 1);
    var history = reviewHistory(recipe);
    var actual = history.map(function (event) { return lower(event && event.status); });
    if (!arraysEqual(actual, required)) {
      add(errors, 'REVIEW_SEQUENCE_INVALID', 'Review evidence must exactly match the completed release stages in order.', 'provenance.reviewHistory');
    }
    var reviewers = [];
    var previousTime = 0;
    required.forEach(function (reviewStatus) {
      var event = eventFor(recipe, reviewStatus);
      var expectedRole = ROLE_FOR_STATUS[reviewStatus];
      if (!event) {
        add(errors, 'REVIEW_EVIDENCE_MISSING', 'Missing evidence for ' + reviewStatus + '.', 'provenance.reviewHistory');
        return;
      }
      var reviewerId = clean(event.reviewerId);
      if (!reviewerId || lower(event.role) !== expectedRole || !clean(event.reviewedAt) || !clean(event.notes)) {
        add(errors, 'REVIEW_EVIDENCE_INCOMPLETE', reviewStatus + ' requires reviewerId, role, reviewedAt, and notes.', 'provenance.reviewHistory');
      }
      var reviewTime = Date.parse(event.reviewedAt);
      if (!Number.isFinite(reviewTime)) {
        add(errors, 'REVIEW_DATE_INVALID', reviewStatus + ' requires a valid review date.', 'provenance.reviewHistory');
      } else if (previousTime && reviewTime < previousTime) {
        add(errors, 'REVIEW_DATE_OUT_OF_ORDER', 'Review dates must follow the release sequence.', 'provenance.reviewHistory');
      }
      if (Number.isFinite(reviewTime)) previousTime = reviewTime;
      if (reviewerId) reviewers.push(lower(reviewerId));
    });
    if (unique(reviewers).length !== reviewers.length) {
      add(errors, 'SELF_APPROVAL_FORBIDDEN', 'Culinary, nutrition, and release gates require different reviewers.', 'provenance.reviewHistory');
    }
    var authorId = lower(recipe && recipe.provenance && recipe.provenance.authorId);
    if (authorId && reviewers.indexOf(authorId) >= 0) {
      add(errors, 'AUTHOR_SELF_APPROVAL_FORBIDDEN', 'The recipe author cannot review or approve the same recipe.', 'provenance.reviewHistory');
    }
  }

  function validate(recipe) {
    var errors = [], warnings = [];
    var status = statusOf(recipe);
    validateNutrition(recipe || {}, errors, warnings);
    validateAllergens(recipe || {}, errors);
    validateDietaryClaims(recipe || {}, errors);
    validateProvenance(recipe || {}, status, errors, warnings);
    validateReviews(recipe || {}, status, errors);
    /* RecipeSchema owns the broader structural contract. When it is loaded,
       the final release gate requires its strict production profile too. */
    if (status === 'production-approved' && root && root.InSyncCookbookSchema && typeof root.InSyncCookbookSchema.validateRecipe === 'function') {
      var schemaResult = root.InSyncCookbookSchema.validateRecipe(recipe, {profile:'production'});
      (schemaResult.errors || []).forEach(function (error) {
        add(errors, 'SCHEMA_' + String(error.code || 'INVALID').toUpperCase(), error.message || 'RecipeSchema production validation failed.', error.path || '');
      });
    }
    var publishable = status === 'production-approved' && errors.length === 0;
    return {ok:errors.length === 0, publishable:publishable, status:status, errors:errors, warnings:warnings};
  }

  function reviewInput(input, expectedRole) {
    input = input || {};
    var reviewerId = clean(input.reviewerId);
    var role = lower(input.role);
    var reviewedAt = clean(input.reviewedAt);
    var notes = clean(input.notes);
    if (!reviewerId) throw new Error('reviewerId is required');
    if (role !== expectedRole) throw new Error('review role must be ' + expectedRole);
    if (!reviewedAt || !Number.isFinite(Date.parse(reviewedAt))) throw new Error('reviewedAt must be a valid date');
    if (!notes) throw new Error('review notes are required');
    return {reviewerId:reviewerId, role:role, reviewedAt:reviewedAt, notes:notes};
  }

  function advance(recipe, nextStatus, review) {
    if (!recipe || typeof recipe !== 'object') throw new Error('recipe is required');
    nextStatus = lower(nextStatus);
    var current = statusOf(recipe);
    var expectedIndex = STATUSES.indexOf(current) + 1;
    if (!current || STATUSES[expectedIndex] !== nextStatus) throw new Error('status transition must follow the release pipeline');
    var evidence = reviewInput(review, ROLE_FOR_STATUS[nextStatus]);
    var priorReviewers = reviewHistory(recipe).map(function (event) { return lower(event && event.reviewerId); }).filter(Boolean);
    if (priorReviewers.indexOf(lower(evidence.reviewerId)) >= 0) throw new Error('a reviewer cannot approve more than one gate');
    if (lower(recipe.provenance && recipe.provenance.authorId) === lower(evidence.reviewerId)) throw new Error('the recipe author cannot approve their own work');

    var copy = JSON.parse(JSON.stringify(recipe));
    copy.provenance = copy.provenance || {};
    copy.provenance.reviewHistory = reviewHistory(copy).slice();
    copy.provenance.reviewHistory.push({
      status:nextStatus,
      reviewerId:evidence.reviewerId,
      role:evidence.role,
      reviewedAt:evidence.reviewedAt,
      notes:evidence.notes
    });
    copy.provenance.status = nextStatus;
    copy.provenance.reviewedBy = evidence.reviewerId;
    copy.provenance.reviewedAt = evidence.reviewedAt;
    var result = validate(copy);
    if (!result.ok) {
      var codes = result.errors.map(function (error) { return error.code; });
      throw new Error('release gate failed: ' + unique(codes).join(', '));
    }
    return copy;
  }

  function assertPublishable(recipe) {
    var result = validate(recipe);
    if (!result.publishable) {
      var reasons = result.errors.map(function (error) { return error.code; });
      if (result.status !== 'production-approved') reasons.unshift('NOT_PRODUCTION_APPROVED');
      throw new Error('recipe cannot be published: ' + unique(reasons).join(', '));
    }
    return true;
  }

  function presentation(recipe) {
    var result = validate(recipe);
    return {
      status:result.status || 'invalid',
      approved:result.publishable,
      label:result.publishable ? 'Production approved' : 'Draft review content',
      disclaimer:'Nutrition values are estimates for planning, not medical advice.' + (result.publishable ? '' : ' This recipe is not yet approved for production nutrition or dietary guidance.')
    };
  }

  function audit(recipes) {
    var results = (Array.isArray(recipes) ? recipes : []).map(function (recipe) {
      var result = validate(recipe);
      return {id:clean(recipe && recipe.id), status:result.status, ok:result.ok, publishable:result.publishable, errors:result.errors, warnings:result.warnings};
    });
    return {
      count:results.length,
      valid:results.filter(function (result) { return result.ok; }).length,
      publishable:results.filter(function (result) { return result.publishable; }).length,
      blocked:results.filter(function (result) { return !result.publishable; }).length,
      results:results
    };
  }

  return {
    statuses:STATUSES.slice(),
    requiredNutrients:REQUIRED_NUTRIENTS.slice(),
    knownAllergens:KNOWN_ALLERGENS.slice(),
    sources:Object.assign({}, SOURCES),
    schemaProfile:'production',
    validate:validate,
    advance:advance,
    assertPublishable:assertPublishable,
    presentation:presentation,
    audit:audit
  };
});

/* InSync universal serving, measurement, and grocery scaling engine.
   Canonical quantities remain exact. Practical display rounding is applied only
   at the presentation and purchasing boundaries. */
(function (root) {
  'use strict';

  var MODES = ['standard', 'weight'];
  var PORTIONS = { small: 0.75, standard: 1, large: 1.25 };
  var WHOLE_UNITS = ['egg', 'large egg', 'medium egg', 'tortilla', 'can', 'jar', 'package', 'packet', 'roll', 'bun'];
  var PLURALS = {
    cup: 'cups', tablespoon: 'tablespoons', teaspoon: 'teaspoons', ounce: 'ounces',
    'fluid ounce': 'fluid ounces', piece: 'pieces', slice: 'slices', clove: 'cloves',
    can: 'cans', jar: 'jars', package: 'packages', packet: 'packets', egg: 'eggs',
    'large egg': 'large eggs', 'medium egg': 'medium eggs', tortilla: 'tortillas',
    roll: 'rolls', bun: 'buns'
  };
  var FRACTIONS = [
    [0, ''], [0.125, '\u215b'], [0.25, '\u00bc'], [0.333333, '\u2153'],
    [0.375, '\u215c'], [0.5, '\u00bd'], [0.625, '\u215d'],
    [0.666667, '\u2154'], [0.75, '\u00be'], [0.875, '\u215e'], [1, '']
  ];

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, number(value, minimum)));
  }

  function round(value, places) {
    var power = Math.pow(10, places == null ? 2 : places);
    return Math.round((number(value, 0) + Number.EPSILON) * power) / power;
  }

  function cleanText(value, limit) {
    return String(value == null ? '' : value).trim().slice(0, limit || 240);
  }

  function normalizedPhrase(value) {
    return cleanText(value, 240).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function containsWholePhrase(value, phrase) {
    value = normalizedPhrase(value);
    phrase = normalizedPhrase(phrase);
    return !!phrase && (' ' + value + ' ').indexOf(' ' + phrase + ' ') >= 0;
  }

  function normalizedUnit(unit) {
    var value = cleanText(unit, 40).toLowerCase();
    var aliases = {
      cups: 'cup', tbsp: 'tablespoon', tablespoons: 'tablespoon', tsp: 'teaspoon', teaspoons: 'teaspoon',
      oz: 'ounce', ounces: 'ounce', 'fl oz': 'fluid ounce', 'fluid ounces': 'fluid ounce',
      pieces: 'piece', slices: 'slice', cloves: 'clove', eggs: 'egg', cans: 'can', jars: 'jar',
      packages: 'package', packets: 'packet', tortillas: 'tortilla', rolls: 'roll', buns: 'bun'
    };
    return aliases[value] || value;
  }

  function normalizeMode(mode) {
    return MODES.indexOf(mode) >= 0 ? mode : 'standard';
  }

  function normalizePeople(value) {
    return Math.round(clamp(value, 1, 20));
  }

  function portionMultiplier(value) {
    if (typeof value === 'string' && PORTIONS[value.toLowerCase()] != null) return PORTIONS[value.toLowerCase()];
    return clamp(value == null ? 1 : value, 0.25, 3);
  }

  function unitName(unit, amount) {
    unit = cleanText(unit, 40) || 'piece';
    return Math.abs(number(amount, 0) - 1) < 0.0001 ? unit : (PLURALS[unit] || unit);
  }

  function fractionText(value) {
    value = Math.max(0, number(value, 0));
    var whole = Math.floor(value + 0.000001);
    var remainder = value - whole;
    var best = FRACTIONS[0];
    var distance = Infinity;
    FRACTIONS.forEach(function (candidate) {
      var next = Math.abs(remainder - candidate[0]);
      if (next < distance) { distance = next; best = candidate; }
    });
    if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
    if (distance > 0.055) return String(round(value, value < 10 ? 2 : 1));
    if (!whole && !best[1]) return '0';
    return (whole ? String(whole) : '') + (whole && best[1] ? ' ' : '') + best[1];
  }

  function isWholeItem(ingredient, unit) {
    if (ingredient && ingredient.wholeItem != null) return !!ingredient.wholeItem;
    return WHOLE_UNITS.indexOf(cleanText(unit, 40).toLowerCase()) >= 0;
  }

  function practicalStandard(amount, unit, ingredient, purchasing) {
    amount = Math.max(0, number(amount, 0));
    unit = cleanText(unit, 40);
    if (isWholeItem(ingredient, unit)) {
      if (purchasing || ingredient.allowPartial !== true) return Math.ceil(amount - 0.000001);
      return Math.ceil(amount * 2 - 0.000001) / 2;
    }
    var lower = unit.toLowerCase();
    var increment = (lower === 'teaspoon' || lower === 'tablespoon' || lower === 'cup') ? 0.125 :
      (lower === 'ounce' || lower === 'fluid ounce') ? 0.25 :
      (lower === 'slice' || lower === 'clove' || lower === 'piece') ? 0.5 : 0.1;
    return round(Math.round(amount / increment) * increment, 3);
  }

  function practicalMetric(value, kind) {
    value = Math.max(0, number(value, 0));
    if (!value) return 0;
    if (kind === 'count') return Math.ceil(value - 0.000001);
    if (value < 10) return round(value, 1);
    if (value < 100) return Math.round(value);
    if (value < 500) return Math.round(value / 5) * 5;
    return Math.round(value / 10) * 10;
  }

  function metricDisplay(quantity) {
    if (quantity.grams > 0) {
      return quantity.grams >= 1000 ? fractionText(round(quantity.grams / 1000, 2)) + ' kg' : fractionText(quantity.grams) + ' g';
    }
    if (quantity.milliliters > 0) {
      return quantity.milliliters >= 1000 ? fractionText(round(quantity.milliliters / 1000, 2)) + ' L' : fractionText(quantity.milliliters) + ' mL';
    }
    return fractionText(quantity.count) + ' ' + unitName(quantity.countUnit || 'piece', quantity.count);
  }

  function standardDisplay(amount, unit) {
    if (!(amount > 0) || !unit) return '';
    return fractionText(amount) + ' ' + unitName(unit, amount);
  }

  function scalePlan(recipe, options) {
    recipe = recipe || {};
    options = options || {};
    var people = normalizePeople(options.peopleEating != null ? options.peopleEating : options.dinerCount);
    var servingsPerPerson = clamp(options.servingsPerPerson == null ? 1 : options.servingsPerPerson, 0.25, 4);
    var portion = portionMultiplier(options.portion != null ? options.portion : options.portionMultiplier != null ? options.portionMultiplier : options.portionScale);
    var eatingServings = people * servingsPerPerson * portion;
    var leftoverServings = clamp(options.leftoverServings == null ? 0 : options.leftoverServings, 0, 100);
    var preparedServings = eatingServings + leftoverServings;
    if (options.preparedServings != null) preparedServings = Math.max(eatingServings, clamp(options.preparedServings, 0.25, 120));
    if (options.batchSource && number(options.servings, 1) > 1 && options.preparedServings == null && options.leftoverServings == null) {
      preparedServings = eatingServings * clamp(options.servings, 1, 100);
    }
    leftoverServings = Math.max(0, preparedServings - eatingServings);
    var baseServings = Math.max(0.25, number(recipe.baseServings, 1));
    var maximum = Math.max(baseServings, number(recipe.scaling && recipe.scaling.maximumServings, 20));
    return {
      peopleEating: people,
      servingsPerPerson: round(servingsPerPerson, 3),
      portionMultiplier: round(portion, 3),
      eatingServings: round(eatingServings, 3),
      leftoverServings: round(leftoverServings, 3),
      preparedServings: round(preparedServings, 3),
      baseServings: round(baseServings, 3),
      ingredientFactor: preparedServings / baseServings,
      batchesRequired: Math.max(1, Math.ceil(preparedServings / maximum)),
      exceedsRecipeBatchMaximum: preparedServings > maximum
    };
  }

  function scaleIngredient(ingredient, factor, mode) {
    ingredient = ingredient || {};
    factor = Math.max(0, number(factor, 1));
    mode = normalizeMode(mode);
    var standard = ingredient.standard || {};
    var exact = {
      grams: round(Math.max(0, number(ingredient.grams, 0)) * factor, 3),
      milliliters: round(Math.max(0, number(ingredient.milliliters, 0)) * factor, 3),
      count: round(Math.max(0, number(ingredient.count, 0)) * factor, 3),
      countUnit: cleanText(ingredient.countUnit, 40) || 'piece',
      standardAmount: round(Math.max(0, number(standard.amount, 0)) * factor, 4),
      standardUnit: cleanText(standard.unit, 40)
    };
    var practical = {
      grams: practicalMetric(exact.grams, 'grams'),
      milliliters: practicalMetric(exact.milliliters, 'milliliters'),
      count: isWholeItem(ingredient, exact.countUnit) ? practicalMetric(exact.count, 'count') : exact.count,
      countUnit: exact.countUnit,
      standardAmount: practicalStandard(exact.standardAmount, exact.standardUnit, ingredient, false),
      standardUnit: exact.standardUnit
    };
    var display;
    if (mode === 'weight') {
      display = metricDisplay(practical);
    } else {
      display = standardDisplay(practical.standardAmount, practical.standardUnit) || metricDisplay(practical);
    }
    return {
      id: cleanText(ingredient.id, 100), name: cleanText(ingredient.name, 180) || 'Ingredient',
      section: cleanText(ingredient.section, 80), optional: !!ingredient.optional,
      allergens: Array.isArray(ingredient.allergens) ? ingredient.allergens.slice() : [],
      exact: exact, practical: practical, display: display, mode: mode,
      roundingChangedQuantity: JSON.stringify(exact) !== JSON.stringify(practical)
    };
  }

  function scaleNutrition(nutrition, servings) {
    var result = {};
    Object.keys(nutrition || {}).forEach(function (key) {
      if (Number.isFinite(Number(nutrition[key]))) result[key] = round(number(nutrition[key], 0) * servings, 1);
    });
    return result;
  }

  function scaleRecipe(recipe, options) {
    if (!recipe) return null;
    options = options || {};
    var plan = scalePlan(recipe, options);
    var mode = normalizeMode(options.mode);
    var perPersonServings = plan.servingsPerPerson * plan.portionMultiplier;
    return {
      recipe: recipe,
      mode: mode,
      plan: plan,
      ingredients: (recipe.ingredients || []).map(function (ingredient) {
        return scaleIngredient(ingredient, plan.ingredientFactor, mode);
      }),
      nutrition: {
        perBaseServing: Object.assign({}, recipe.nutrition || {}),
        perPersonEating: scaleNutrition(recipe.nutrition, perPersonServings),
        eatingTotal: scaleNutrition(recipe.nutrition, plan.eatingServings),
        preparedTotal: scaleNutrition(recipe.nutrition, plan.preparedServings),
        leftoversTotal: scaleNutrition(recipe.nutrition, plan.leftoverServings)
      }
    };
  }

  function pantryIndex(pantry) {
    var result = { unlimited: {}, measured: {} };
    if (typeof pantry === 'string') pantry = pantry.split(/[,;\n]/);
    (pantry || []).forEach(function (entry) {
      if (typeof entry === 'string') {
        var name = normalizedPhrase(entry);
        if (name) result.unlimited[name] = true;
        return;
      }
      entry = entry || {};
      var key = normalizedPhrase(entry.id || entry.name);
      if (!key) return;
      result.measured[key] = {
        grams: Math.max(0, number(entry.grams, 0)), milliliters: Math.max(0, number(entry.milliliters, 0)),
        count: Math.max(0, number(entry.count, 0)), standardAmount: Math.max(0, number(entry.standardAmount, 0)),
        standardUnit: cleanText(entry.standardUnit, 40)
      };
    });
    return result;
  }

  function deductAvailable(required, available) {
    var used = { grams: 0, milliliters: 0, count: 0, standardAmount: 0 };
    var original = {
      grams: required.grams, milliliters: required.milliliters,
      count: required.count, standardAmount: required.standardAmount
    };
    var primary = original.grams > 0 ? 'grams' : original.milliliters > 0 ? 'milliliters' : original.count > 0 ? 'count' : '';
    var adjustedAvailable = Object.assign({}, available || {});
    if (primary && !(number(adjustedAvailable[primary], 0) > 0) &&
        original.standardAmount > 0 && number(adjustedAvailable.standardAmount, 0) > 0 &&
        required.standardUnit === cleanText(adjustedAvailable.standardUnit, 40)) {
      adjustedAvailable[primary] = original[primary] * number(adjustedAvailable.standardAmount, 0) / original.standardAmount;
    }
    ['grams', 'milliliters', 'count'].forEach(function (key) {
      used[key] = Math.min(required[key], number(adjustedAvailable[key], 0));
      required[key] = round(required[key] - used[key], 3);
    });
    if (primary && original.standardAmount > 0) {
      var remainingRatio = required[primary] / original[primary];
      required.standardAmount = round(original.standardAmount * remainingRatio, 4);
      used.standardAmount = round(original.standardAmount - required.standardAmount, 4);
    } else if (required.standardUnit === cleanText(available && available.standardUnit, 40)) {
      used.standardAmount = Math.min(required.standardAmount, number(available && available.standardAmount, 0));
      required.standardAmount = round(required.standardAmount - used.standardAmount, 4);
    }
    return used;
  }

  function groceryDisplay(item, mode) {
    mode = normalizeMode(mode);
    if (mode === 'weight' || !item.standardUnit || !(item.standardAmount > 0)) {
      return metricDisplay({
        grams: practicalMetric(item.grams, 'grams'), milliliters: practicalMetric(item.milliliters, 'milliliters'),
        count: item.wholeItem ? Math.ceil(item.count - 0.000001) : item.count, countUnit: item.countUnit
      });
    }
    var amount = practicalStandard(item.standardAmount, item.standardUnit, { wholeItem: item.wholeItem }, true);
    return standardDisplay(amount, item.standardUnit);
  }

  function measurementSignature(ingredient) {
    var exact = ingredient.exact || {};
    var kinds = [];
    if (exact.grams > 0) kinds.push('mass');
    if (exact.milliliters > 0) kinds.push('volume');
    if (exact.count > 0) kinds.push('count:' + normalizedUnit(exact.countUnit));
    if (!kinds.length) kinds.push('unspecified');
    return kinds.join('+') + '|standard:' + normalizedUnit(exact.standardUnit);
  }

  function aggregateGroceries(meals, options) {
    options = options || {};
    var resolveRecipe = typeof options.resolveRecipe === 'function' ? options.resolveRecipe : function (id) {
      var recipes = options.recipes || [];
      return recipes.find(function (recipe) { return recipe.id === id; }) || null;
    };
    var mode = normalizeMode(options.mode);
    var grouped = {};
    (meals || []).forEach(function (meal) {
      meal = meal || {};
      if (meal.leftoverOf || meal.skipGroceries) return;
      var recipe = meal.recipe || resolveRecipe(meal.recipeId);
      if (!recipe) return;
      var scaled = scaleRecipe(recipe, {
        peopleEating: meal.peopleEating != null ? meal.peopleEating : meal.dinerCount,
        servingsPerPerson: meal.servingsPerPerson,
        portion: meal.portion != null ? meal.portion : meal.portionScale,
        leftoverServings: meal.leftoverServings,
        preparedServings: meal.preparedServings,
        batchSource: meal.batchSource,
        servings: meal.servings,
        mode: mode
      });
      scaled.ingredients.forEach(function (ingredient) {
        if (ingredient.optional && options.includeOptional === false) return;
        var canonicalKey = ingredient.id || normalizedPhrase(ingredient.name);
        var signature = measurementSignature(ingredient);
        var key = canonicalKey + '|' + signature;
        var row = grouped[key] || (grouped[key] = {
          id: ingredient.id, name: ingredient.name, sections: {}, occurrences: 0,
          canonicalKey: canonicalKey, measurementSignature: signature,
          grams: 0, milliliters: 0, count: 0, countUnit: ingredient.exact.countUnit,
          standardAmount: 0, standardUnit: ingredient.exact.standardUnit,
          wholeItem: isWholeItem({}, ingredient.exact.standardUnit || ingredient.exact.countUnit)
        });
        row.occurrences += 1;
        if (ingredient.section) row.sections[ingredient.section] = true;
        row.grams += ingredient.exact.grams;
        row.milliliters += ingredient.exact.milliliters;
        row.count += ingredient.exact.count;
        if (!row.standardUnit || row.standardUnit === ingredient.exact.standardUnit) row.standardAmount += ingredient.exact.standardAmount;
      });
    });
    var pantry = pantryIndex(options.pantry);
    var signatureCounts = {};
    Object.keys(grouped).forEach(function (key) {
      var canonicalKey = grouped[key].canonicalKey;
      signatureCounts[canonicalKey] = (signatureCounts[canonicalKey] || 0) + 1;
    });
    return Object.keys(grouped).map(function (key) {
      var row = grouped[key];
      row.grams = round(row.grams, 3); row.milliliters = round(row.milliliters, 3);
      row.count = round(row.count, 3); row.standardAmount = round(row.standardAmount, 4);
      var normalizedId = normalizedPhrase(row.id);
      var normalizedName = normalizedPhrase(row.name);
      var unlimited = pantry.unlimited[normalizedId] || pantry.unlimited[normalizedName] || Object.keys(pantry.unlimited).some(function (phrase) {
        return containsWholePhrase(normalizedId, phrase) || containsWholePhrase(normalizedName, phrase);
      });
      var required = {
        grams: unlimited ? 0 : row.grams, milliliters: unlimited ? 0 : row.milliliters,
        count: unlimited ? 0 : row.count, standardAmount: unlimited ? 0 : row.standardAmount,
        standardUnit: row.standardUnit
      };
      var available = pantry.measured[normalizedId] || pantry.measured[normalizedName];
      var pantryUsed = unlimited ? { unlimited: true } : deductAvailable(required, available);
      var output = Object.assign({}, row, {
        sections: Object.keys(row.sections).sort(), pantryUsed: pantryUsed,
        required: required, fullyStocked: !required.grams && !required.milliliters && !required.count && !required.standardAmount,
        measurementConflict: signatureCounts[row.canonicalKey] > 1,
        conflictReason: signatureCounts[row.canonicalKey] > 1 ? 'Same ingredient ID uses incompatible quantity kinds or standard units.' : ''
      });
      output.display = output.fullyStocked ? 'Already in pantry' : groceryDisplay(Object.assign({}, output, required), mode);
      return output;
    }).sort(function (a, b) { return a.name.localeCompare(b.name) || a.measurementSignature.localeCompare(b.measurementSignature); });
  }

  root.MealScaling = {
    modes: MODES.slice(), portionProfiles: Object.assign({}, PORTIONS),
    normalizePeople: normalizePeople, portionMultiplier: portionMultiplier,
    fractionText: fractionText, practicalStandard: practicalStandard,
    scalePlan: scalePlan, scaleIngredient: scaleIngredient, scaleNutrition: scaleNutrition,
    scaleRecipe: scaleRecipe, aggregateGroceries: aggregateGroceries
  };
})(typeof window !== 'undefined' ? window : globalThis);

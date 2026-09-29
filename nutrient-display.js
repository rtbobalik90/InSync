/* InSync nutrient provenance presentation.
   This module reads bundled recipe metadata only. It does not fetch data,
   calculate nutrients, or change a recipe's release status. */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NutrientDisplay = api;
})(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function list(value) { return Array.isArray(value) ? value : []; }
  function unique(values) {
    var found = {}, output = [];
    list(values).forEach(function (value) {
      value = clean(value);
      var key = lower(value);
      if (!key || found[key]) return;
      found[key] = true;
      output.push(value);
    });
    return output;
  }
  function nutritionMeta(recipe) {
    recipe = recipe || {};
    var provenance = recipe.provenance || {};
    return recipe.nutritionProvenance || recipe.nutrientProvenance || provenance.nutrition || {};
  }
  function sourceId(source) {
    if (typeof source === 'string' || typeof source === 'number') return clean(source);
    return clean(source && (source.sourceId || source.id || source.fdcId || source.ref));
  }
  function isSpecificSource(ref) {
    ref = clean(ref);
    if (!ref || /(category|formula|placeholder|unknown|unresolved|pending|tbd)/i.test(ref)) return false;
    return /(?:fdc|usda)[^0-9]*[0-9]{4,}/i.test(ref) || /^[0-9]{4,}$/.test(ref) || /^https:\/\//i.test(ref);
  }
  function dateValue(recipe, meta) {
    var provenance = recipe && recipe.provenance || {};
    return clean(meta.calculatedAt || meta.calculationDate || recipe.nutritionCalculatedAt || provenance.calculatedAt);
  }
  function dateLabel(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return 'Calculation date not recorded';
    return new Date(value).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric', timeZone:'UTC' });
  }
  function releaseResult(recipe) {
    if (root && root.CookbookRelease && typeof root.CookbookRelease.validate === 'function') {
      return root.CookbookRelease.validate(recipe);
    }
    var status = lower(recipe && recipe.provenance && recipe.provenance.status);
    return {status:status, publishable:false, errors:[], warnings:[]};
  }
  function unresolvedMappings(recipe, meta) {
    var explicit = list(meta.unresolvedMappings).map(function (entry) {
      if (typeof entry === 'string') return {ingredient:entry, sourceRef:'', reason:'Unresolved nutrition mapping'};
      return {
        ingredient:clean(entry && (entry.ingredient || entry.ingredientName || entry.id)) || 'Ingredient',
        sourceRef:sourceId(entry && (entry.sourceRef || entry.source)),
        reason:clean(entry && entry.reason) || 'Unresolved nutrition mapping'
      };
    });
    var seen = {};
    explicit.forEach(function (entry) { seen[lower(entry.ingredient)] = true; });
    list(recipe && recipe.ingredients).forEach(function (ingredient) {
      var ref = clean(ingredient && ingredient.sourceRef);
      var name = clean(ingredient && ingredient.name) || 'Ingredient';
      if (!isSpecificSource(ref) && !seen[lower(name)]) {
        explicit.push({ingredient:name, sourceRef:ref, reason:ref ? 'Generic source reference' : 'Source record missing'});
        seen[lower(name)] = true;
      }
    });
    return explicit;
  }
  function sourceIds(recipe, meta) {
    var ids = list(meta.sourceRecords).map(sourceId)
      .concat(list(meta.sourceIds).map(sourceId))
      .concat(list(recipe && recipe.ingredients).map(function (ingredient) { return sourceId(ingredient && ingredient.sourceRef); }));
    return unique(ids).filter(isSpecificSource);
  }
  function statusLabel(result) {
    if (result.publishable) return 'Production approved';
    if (result.status === 'nutrition-reviewed') return 'Nutrient reviewed';
    if (result.status === 'culinary-reviewed') return 'Culinary reviewed, nutrition estimate';
    return 'Draft nutrition estimate';
  }
  function summarize(recipe) {
    recipe = recipe || {};
    var meta = nutritionMeta(recipe);
    var release = releaseResult(recipe);
    var unresolved = unresolvedMappings(recipe, meta);
    var sources = sourceIds(recipe, meta);
    var approved = release.publishable === true;
    var estimated = !approved || meta.estimated !== false;
    var calculatedAt = dateValue(recipe, meta);
    return {
      status:release.status || 'invalid',
      label:statusLabel(release),
      approved:approved,
      estimated:estimated,
      calculatedAt:calculatedAt,
      calculationDateLabel:dateLabel(calculatedAt),
      calculationMethod:clean(meta.calculationMethod || meta.method) || 'Ingredient estimate',
      sourceIds:sources,
      sourceCount:sources.length,
      unresolvedMappings:unresolved,
      unresolvedCount:unresolved.length,
      completeMapping:unresolved.length === 0 && sources.length > 0,
      disclaimer:approved
        ? 'Nutrition is calculated per stated serving from the recorded ingredient sources.'
        : 'Nutrition is an estimate for meal planning. It is not professional nutrition or medical guidance.'
    };
  }
  function catalogSummary(recipes) {
    var rows = list(recipes).map(summarize);
    return {
      count:rows.length,
      approved:rows.filter(function (row) { return row.approved; }).length,
      estimated:rows.filter(function (row) { return row.estimated; }).length,
      unresolved:rows.filter(function (row) { return row.unresolvedCount > 0; }).length,
      fullyMapped:rows.filter(function (row) { return row.completeMapping; }).length
    };
  }

  return {
    summarize:summarize,
    catalogSummary:catalogSummary,
    isSpecificSource:isSpecificSource
  };
});

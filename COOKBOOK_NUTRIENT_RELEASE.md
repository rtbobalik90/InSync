# InSync Whole Cookbook Nutrient Release

## Release scope

The bundled cookbook contains 1,440 recipes across 12 cuisines. All 1,440 records remain available to the offline planner. The separate 48-recipe pilot collection remains isolated from the main catalog and is never selected by automatic weekly generation.

The app now presents nutrient provenance in two places:

- Cookbook cards show whether nutrition is estimated or verified and whether source mappings remain unresolved.
- Planned recipe detail shows the release state, calculation method, calculation date, specific source record IDs, unresolved ingredient mappings, and the applicable nutrition disclaimer.

## Supported nutrient metadata

The presentation layer accepts nutrient metadata from `recipe.nutritionProvenance`, `recipe.nutrientProvenance`, or `recipe.provenance.nutrition`. This compatibility order lets the nutrient pipeline land its results without coupling data generation to the interface.

The preferred record is:

```json
{
  "nutritionProvenance": {
    "calculatedAt": "2026-09-06T12:00:00Z",
    "calculationMethod": "Ingredient mass rollup",
    "estimated": true,
    "sourceRecords": [
      { "sourceId": "USDA-FDC-171287" }
    ],
    "unresolvedMappings": [
      {
        "ingredient": "Prepared sauce",
        "sourceRef": "USDA-FDC-category-sauce",
        "reason": "Specific food record not selected"
      }
    ]
  }
}
```

Ingredient-level `sourceRef` values remain authoritative. Specific USDA FoodData Central identifiers are displayed and deduplicated. Category references, placeholders, missing references, and unresolved references are displayed as mapping gaps rather than source records.

## Release truth rules

- Nutrient metadata cannot approve a recipe.
- Only `CookbookRelease.validate(recipe).publishable` can produce the `Production approved` presentation.
- A draft remains labeled `Draft nutrition estimate`, even if its nutrient metadata incorrectly sets `estimated` to `false`.
- A `nutrition-reviewed` recipe is labeled `Nutrient reviewed`, but is not presented as production approved.
- Missing calculation dates are shown as `Calculation date not recorded`.
- Current generic category mappings are visible to the user and are not counted as specific source records.
- Nutrition remains described as meal-planning information, not professional nutrition or medical guidance, until the complete independent approval chain passes.

## Offline boundary

`nutrient-display.js` is part of the versioned service-worker shell. It performs no network calls and reads only the recipe data already bundled with the app. A network failure therefore does not remove recipes, nutrition values, review status, or source mapping information.

## Verification

Run:

```bash
node tests/nutrient-display-tests.js
node tests/cookbook-release-tests.js
node tests/cookbook-integration-qa-tests.js
node tests/screen-smoke-tests.js
```

These checks cover full-catalog availability, pilot separation, estimate labeling, unresolved mappings, specific source IDs, calculation dates, release-state integrity, browser load order, offline caching, and screen integration.

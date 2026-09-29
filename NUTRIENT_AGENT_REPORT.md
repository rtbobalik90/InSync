# InSync Nutrient Agent Report

## Verdict

The cookbook nutrient engine has been upgraded and independently verified, but the cookbook is not eligible for production nutrition approval.

All 1,440 catalog recipes and all 48 pilot recipes are recalculated at runtime from canonical ingredient grams using bundled USDA FoodData Central records. Unresolved ingredients are excluded from calculated totals, identified in `nutritionProvenance.unresolvedMappings`, and retained as release blockers. No culinary, nutrition, or production review status was granted.

## Official data basis

- USDA FoodData Central Foundation Foods, April 2026
- USDA FoodData Central FNDDS 2021-2023, published October 2024
- USDA FoodData Central SR Legacy, April 2018
- Data documentation: https://fdc.nal.usda.gov/data-documentation
- Dataset downloads: https://fdc.nal.usda.gov/download-datasets.html

The bundled registry contains 69 specifically selected USDA records. Sixty-four unique FDC IDs are referenced by the current recipes. Each mapped record includes its numeric FDC ID, exact USDA description, data type, publication date, dataset release, per-100-gram basis, and direct FoodData Central URL.

## Coverage

| Collection | Recipes | Ingredient lines | Mapped lines | Unresolved lines | Line coverage | Fully mapped and panel-complete recipes |
|---|---:|---:|---:|---:|---:|---:|
| Main catalog | 1,440 | 6,840 | 4,836 | 2,004 | 70.70% | 0 |
| Pilot | 48 | 334 | 278 | 56 | 83.23% | 2 |
| Total | 1,488 | 7,174 | 5,114 | 2,060 | 71.29% | 2 |

The two fully mapped and panel-complete records are still `draft-calculated` and are not professionally reviewed or production approved.

## Nutrients calculated where supported

- Calories
- Protein
- Carbohydrate
- Total fat
- Dietary fiber
- Total sugar
- Saturated fat
- Sodium
- Cholesterol
- Calcium
- Iron
- Potassium

A missing USDA value remains `null`. Schema validation now rejects `null` and blank values instead of coercing them to zero.

## Unresolved ingredient definitions

The following 13 ingredient keys remain globally blocked because assigning a convenient but non-equivalent FDC record would create false precision:

- `beef`: unspecified cut, trim, grade, and cooking method
- `berries`: unspecified fruit species and proportions
- `cheese`: unspecified reduced-fat cheese variety or blend
- `coconutMilk`: light formulation is not defined
- `couscous`: whole-wheat claim does not match the available generic record
- `greens`: unspecified leafy-green species and proportions
- `herbs`: undefined cuisine-dependent blend
- `pork`: unspecified cut, trim, enhancement, and cooking method
- `sauce`: undefined cuisine-dependent formula
- `seaweed`: rehydrated recipe weight does not match raw wakame data
- `soba`: exact record lacks the required dietary-fiber value
- `soySauce`: no generic record matches both reduced-sodium and tamari claims
- `spices`: undefined blend that varies by recipe

The independent source audit also identifies seven shared keys requiring preparation-state splits: broccoli, chicken, oats, potato, salmon, sweet potato, and turkey. The runtime resolver uses a specific FDC record only when collection context or the ingredient state establishes a defensible match. Ambiguous uses remain unresolved.

Cuisine-renamed `salsa` lines are also blocked when the displayed ingredient is not actually ready-to-serve salsa.

## Verification

- Registry IDs, descriptions, and nutrient values were compared with the downloaded official USDA CSV files.
- Registry ID mismatches: 0
- Registry description mismatches: 0
- Registry nutrient-value mismatches: 0
- Referenced numeric FDC IDs absent from official files: 0
- Confirmed preparation-state mismatches after resolver corrections: 0
- Focused nutrient registry checks: 7 passed
- Cookbook schema checks: 19 passed
- Cookbook catalog checks: 87 passed
- Pilot recipe checks: 616 passed
- Meal scaling checks: 17 passed
- Cookbook release checks: 33 passed
- Nutrient display checks: 22 passed
- Cookbook integration checks: 47 passed
- FDC source-audit checks: 179 passed

The independent production gate correctly returns `BLOCKED`. That result is intentional and protects the app from presenting partial calculations as approved nutrition.

## Required work before production shipment

1. Replace every composite placeholder with weighed component ingredients.
2. Split every raw and cooked ingredient into state-specific canonical ingredient IDs.
3. Define beef, pork, cheese, light coconut milk, tamari, greens, and mixed berries precisely.
4. Reconcile raw-to-cooked yields where recipes measure one state and serve another.
5. Recalculate until every non-optional ingredient line has a compatible specific FDC record and every required nutrient is supported.
6. Complete named, independent culinary review, nutrition review, and release approval for every recipe.

Until those steps are complete, the cookbook may be distributed only as clearly labeled draft review content, not as a production-approved nutrition cookbook.

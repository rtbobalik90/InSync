# InSync Cookbook Nutrition QA and Release Audit

## Release verdict

**BLOCKED for production approval.**

The cookbook may be distributed only as a clearly labeled draft review build. It must not be described as nutrition-reviewed, culinary-reviewed, or production-approved.

This conclusion is based on a complete audit of the 1,440 foundation recipes and 48 pilot recipes. An automated nutrient agent can recompute values and enforce data controls, but it cannot supply the missing food-specific evidence or act as a named qualified human reviewer.

## What passed

| Control | Result |
|---|---:|
| Recipes audited | 1,488 |
| Ingredient lines audited | 7,174 |
| Stored core nutrient values recomputed from the current mapped registry records | 100% matched |
| Negative, NaN, or missing core numeric quantities | 0 |
| Broad software outlier screens triggered | 0 |
| Direct ingredient-level dietary contradictions | 0 |
| Ingredient-to-recipe allergen roll-up mismatches | 0 |
| FDA major allergen registry | All 9 present, including sesame |
| Household count affecting per-person nutrition | 0 failures across 1, 4, and 20 eaters |
| Draft status integrity | 100% remained draft with no fabricated review events |

The arithmetic result means only that the stored recipe totals agree with the application's current mapped records. Recipes with unresolved ingredients currently show mapped-only totals, not complete meal totals. Arithmetic agreement does not establish that every selected food record matches the exact brand, preparation state, yield, or drained weight used in the recipe.

## Production blockers

| Blocker | Count | Release impact |
|---|---:|---|
| Ingredient lines without a numeric FoodData Central record | 2,060 | These lines remain excluded from the mapped-only calculation and prevent a complete recipe total. |
| Ambiguous or missing preparation states | 2,054 | Raw, cooked, drained, rehydrated, and prepared weights cannot be reliably reconciled. |
| Confirmed preparation-state mismatches after remediation | 0 | The cooked-egg mismatch was corrected to a cooked hard-boiled egg record. |
| Missing production nutrient values | 64 | Some recipes still lack sugar or saturated fat because a mapped source record does not supply the value. |
| Composite ingredient allergen evidence gaps | 1,034 | Sauces, tamari, miso, and seasoning blends require a complete ingredient declaration or a specific product record. |
| Gluten-free claims awaiting product evidence | 740 | Oats, sauces, seasonings, miso, and tamari require certified or product-specific evidence before a safety-sensitive claim is approved. |
| Internal household-to-weight measurement inconsistencies | 80 | Some rounded household amounts imply materially different gram-per-unit values for the same ingredient and unit. |
| Named human nutrition reviews | 0 | No record has qualified reviewer evidence. |
| Named human culinary reviews | 0 | Yield, method, preparation loss, and portion size have not been kitchen-tested. |
| Independent release approvals | 0 | The release chain is incomplete. |

## Independent USDA verification

The source audit read the official downloadable CSV files directly rather than trusting application metadata. It inspected:

- FoodData Central Foundation Foods, April 2026 download
- FoodData Central FNDDS 2021-2023, October 2024 download
- FoodData Central SR Legacy, April 2018 download

The nutrient pipeline now includes 69 selected registry records and applies 64 unique numeric FDC IDs to recipe ingredient lines. The independent audit verified every registry ID, official description, and stored nutrient value directly against the downloaded CSV tables with zero registry mismatches.

That sourcing progress does not complete the cookbook. The foundation catalog maps 4,836 of 6,840 ingredient lines, or 70.70 percent. The pilot maps 278 of 334 lines, or 83.23 percent. There are still 2,060 unresolved ingredient lines, 2,054 ambiguous or missing preparation states, and 64 missing sugar or saturated-fat values. The earlier cooked-egg mismatch was corrected to FDC 173424, a cooked hard-boiled whole-egg record.

USDA explains that FoodData Central data types have different sources and update schedules. Foundation Foods are based on analytically derived values, FNDDS values are compiled for dietary studies, branded values come from manufacturers, and SR Legacy is historical. Selecting an ID therefore requires a deliberate match to the ingredient and preparation state, not simply a name search.

## Allergen and dietary-claim controls

The FDA identifies nine major food allergens: milk, eggs, fish, Crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and sesame. Sesame has been the ninth major allergen since January 1, 2023.

The InSync schema contains all nine categories and currently rolls ingredient allergens into the recipe-level contains list correctly. Production review must still verify:

1. The type of tree nut, species of fish, and species of Crustacean shellfish are retained in the consumer-facing declaration.
2. Composite packaged ingredients have complete sub-ingredient and allergen data.
3. A precautionary cross-contact statement is kept separate from a confirmed contains declaration.
4. A precautionary statement is not used as a substitute for product and kitchen controls.

The FDA gluten-free labeling standard is a safety-sensitive product claim. Ingredient heuristics alone cannot establish compliance, particularly for oats and packaged sauces. InSync should continue showing a qualification such as "check certified packaged ingredients" until product-level evidence and cross-contact controls are recorded.

## Serving and household scaling

FDA consumer guidance explains that nutrition information is normally stated for one serving and that eating two servings gives twice the calories and nutrients. InSync follows that relationship correctly in the scaling engine:

- Per-person nutrition remains based on the selected individual's portion.
- Household totals multiply by the number of eaters.
- Leftover totals remain separate from current eating totals.
- Changing the household from 1 to 20 people does not change the nutrition logged for one person's standard portion.

The application's "adult serving" label is a planning convention, not an FDA serving-size determination. It should not be represented as an official recommended serving size.

## Required evidence before approval

A recipe can advance only after all of the following are attached to the record:

1. A numeric FDC ID for every ingredient, with the official description and data type captured.
2. A preparation state that matches the selected official food record.
3. Ingredient quantities reconciled for raw weight, cooked weight, drained weight, edible portion, and recipe yield where applicable.
4. Recomputed calories, protein, carbohydrate, fat, fiber, sodium, total sugar, and saturated fat from those selected records.
5. Household measures reconciled to canonical grams or milliliters using verified portion weights or kitchen measurement evidence.
6. Product-specific allergen evidence for every composite or packaged ingredient.
7. Qualified, named culinary and nutrition reviews with dates and notes.
8. Independent release approval by a person who did not author or perform either prior review.

## Automated audit commands

```bash
node tests/nutrition-release-audit-tests.js
INSYNC_FDC_ROOT=/workspace/scratch/9cc900a6f9eb/tmp/fdc python3 tests/fdc-independent-release-audit.py
```

Both tests are designed to succeed when the release gate correctly refuses unsupported approval. A successful test run is not itself a nutrition certification.

## Official references

- USDA FoodData Central Data Documentation: https://fdc.nal.usda.gov/data-documentation/
- USDA FoodData Central API Guide: https://fdc.nal.usda.gov/api-guide/
- FDA Food Allergies: https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies
- FDA Serving Size on the Nutrition Facts Label: https://www.fda.gov/food/nutrition-facts-label/serving-size-nutrition-facts-label
- FDA Gluten-Free Labeling of Foods: https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/gluten-free-labeling-foods

# InSync Cookbook USDA FoodData Central Sourcing Audit

## Release decision

**The current 1,440-recipe catalog and 48-recipe pilot cannot honestly pass nutrient review or ship as nutrient-approved content.**

The audit found a workable source record for most individual foods, but every current recipe still carries a placeholder or category-level source reference. Several heavily reused ingredients are undefined composites, and seven shared ingredient keys combine incompatible raw and cooked preparation states.

This is a data-quality hold, not a software failure. The recipes can remain available as clearly labeled draft estimates, but they must not be represented as verified nutrition.

## Scope and evidence

The audit evaluated:

- All 1,440 generated recipes in `cookbook-data.js`
- All 48 review recipes in `pilot-recipes.js`
- All 77 ingredient keys declared in the two FOOD tables
- All 73 unique ingredient keys currently emitted by recipes
- Ingredient names, gram amounts, stated preparation states, and current `sourceRef` values
- USDA FoodData Central Foundation Foods, April 2026
- USDA FoodData Central FNDDS 2021-2023, published October 2024
- USDA FoodData Central SR Legacy, April 2018

Only official USDA FoodData Central downloads and documentation were used. Branded records were not used to stand in for undefined generic foods.

Official references:

- USDA FoodData Central downloads: https://fdc.nal.usda.gov/download-datasets/
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide
- USDA FoodData Central data documentation: https://fdc.nal.usda.gov/data-documentation

## Ingredient-key coverage

| Decision | Ingredient keys | Share |
|---|---:|---:|
| Direct preparation-specific mapping proposed | 57 | 74.0% |
| Raw/cooked state split required | 7 | 9.1% |
| Exact source blocked | 13 | 16.9% |
| Total declared FOOD keys inventoried | 77 | 100% |

The seven state-split keys have usable USDA candidates, so 64 of 77 declared keys have a source candidate with the required core nutrient panel. Among the 73 keys currently emitted into recipes, 61 meet that threshold. They are not release-ready until the recipe records specify which state applies.

Four declared keys are currently dormant: `banana`, `cheese`, `peanut`, and `zucchini`. They remain in scope because a future generator change could emit them without changing the FOOD tables.

## Recipe-level impact

| Collection | Recipes | Avoid blocked or state-split keys | Current recipes with specific source references |
|---|---:|---:|---:|
| Generated catalog | 1,440 | 33 | 0 |
| Pilot collection | 48 | 3 | 0 |
| Total | 1,488 | 36 | 0 |

In the generated catalog:

- 1,365 recipes contain at least one blocked ingredient key.
- 772 recipes contain at least one ingredient key that requires a preparation-state split.
- All 1,440 recipes use category placeholder references.

In the pilot collection:

- 45 recipes contain at least one blocked ingredient key.
- 23 recipes contain at least one ingredient key that requires a preparation-state split.
- All 48 recipes use pending-ID placeholder references.

## Direct mapping examples

These are representative exact source decisions. The complete mapping is in `fdc-source-map.json`.

| Ingredient and state | FDC ID | FoodData Central description |
|---|---:|---|
| Chicken breast, cooked and roasted | 171477 | Chicken, broilers or fryers, breast, meat only, cooked, roasted |
| Chicken breast, raw and skinless | 171077 | Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw |
| Atlantic farmed salmon, cooked with dry heat | 175168 | Fish, salmon, Atlantic, farmed, cooked, dry heat |
| Atlantic farmed salmon, raw | 175167 | Fish, salmon, Atlantic, farmed, raw |
| Brown long-grain rice, cooked | 169704 | Rice, brown, long-grain, cooked |
| White long-grain rice, cooked without salt | 169757 | Rice, white, long-grain, regular, unenriched, cooked without salt |
| Black beans, cooked without salt | 173735 | Beans, black, mature seeds, cooked, boiled, without salt |
| Chickpeas, cooked without salt | 173757 | Chickpeas, mature seeds, cooked, boiled, without salt |
| Rolled oats, dry | 173904 | Cereals, oats, regular and quick, not fortified, dry |
| Oats cooked in water without salt | 173905 | Cereals, oats, regular and quick, cooked with water, without salt |
| Paneer | 2705740 | Cheese, paneer |

All 75 selected candidate records in the proposal were checked against the downloaded official datasets. The FDC ID and description comparisons produced zero mismatches.

## Blocked source definitions

| Ingredient key | Why one FDC ID would be misleading | Required correction |
|---|---|---|
| `beef` | "Lean cooked beef" omits cut, grade, fat trim, and cooking method. | Select a specific cut, trim, raw weight basis, and cooking method. |
| `berries` | "Mixed berries" omits species and blend proportions. | List each fruit and its gram weight. |
| `coconutMilk` | "Light coconut milk" is formulation and product dependent. | Specify an exact product or define coconut milk and water separately. |
| `cheese` | "Reduced-fat shredded cheese" does not identify a cheese variety or blend. | Select a specific cheese or defined product. |
| `couscous` | The pilot says whole-wheat, but the generic cooked USDA record does not establish whole-wheat composition. | Specify a matching product or revise the ingredient definition. |
| `greens` | "Mixed leafy greens" omits species and proportions. | List each green and its gram weight. |
| `herbs` | One undefined fresh herb and spice blend is reused under cuisine-specific display names. | Decompose every seasoning blend into individual ingredients. |
| `pork` | "Cooked pork loin" omits loin cut, fat trim, enhancement, and method. | Select a specific pork cut and preparation basis. |
| `sauce` | One invented nutrient profile is renamed into twelve cuisine sauces. | Create a weighed formula for each actual sauce. |
| `seaweed` | Recipes weigh rehydrated wakame, while the candidate record is raw wakame. | Establish a measured hydration yield or use an exact prepared record. |
| `soba` | The exact cooked soba record does not report dietary fiber. | Select a complete source or document an approved supplemental method. |
| `soySauce` | No generic record found is both tamari and reduced sodium. | Specify an exact product or change the claim. |
| `spices` | One undefined blend is used across different cuisines and recipes. | Decompose into weighed individual seasonings. |

## Highest-impact blockers

The generated catalog depends on three invented or undefined blend records at very high frequency:

| Ingredient key | Catalog ingredient uses | Impact |
|---|---:|---|
| `sauce` | 990 | The same nutrition profile is presented as unrelated cuisine sauces. |
| `herbs` | 360 | Seasoning identity and nutrient contribution are undefined. |
| `berries` | 252 | Fruit composition cannot be reproduced or verified. |
| `beef` | 100 | Cut and preparation are undefined. |
| `greens` | 72 | Leaf species and proportions are undefined. |
| `pork` | 60 | Cut and preparation are undefined. |

Because these fields are reused by the deterministic generator, correcting a small ingredient dictionary without rebuilding the recipe formulas would repeat the same sourcing defect throughout the cookbook.

## Preparation-state conflicts

The following shared keys need state-specific IDs or recipe-level variants:

- `broccoli`: cooked values in the catalog, raw ingredient use in the pilot
- `chicken`: cooked values used for both cooked and raw pilot ingredients
- `oats`: cooked in the catalog, dry in the pilot
- `potato`: cooked hash use and raw tray-roast use share one key
- `salmon`: cooked values used for raw ingredient weights
- `sweetPotato`: cooked values used where recipes may begin from raw cubes
- `turkey`: raw and cooked uses share one underdefined nutrient record

Preparation words such as sliced, cubed, chopped, and crumbled generally do not require a new nutrient record by themselves. Raw, cooked, drained, and rehydrated states do.

## Required production remediation

1. Replace `sauce`, `herbs`, `spices`, `berries`, and `greens` with actual weighed component ingredients.
2. Define exact meat cuts, fat levels, and raw or cooked weight basis for beef, pork, chicken, turkey, and salmon.
3. Split shared ingredient keys when raw and cooked records are both used.
4. Recalculate every recipe from the selected FDC records rather than copying the current constants forward.
5. Write the selected FDC ID, data type, release, and preparation state into every ingredient record.
6. Reconcile household measures against USDA portions or an independently measured kitchen conversion.
7. Run automated nutrient totals, rounding, allergen, and serving-scaling checks.
8. Require independent culinary and credentialed nutrition review before production approval.

## Automated controls added

`tests/fdc-source-audit-tests.js` now verifies that:

- All 77 declared FOOD keys have a sourcing decision.
- Placeholder and pending references are detected.
- Undefined composites stay blocked.
- Raw and cooked state collisions are detected.
- Proposed mapped records contain numeric FDC IDs and explicit preparation states.
- The current cookbook cannot be mistaken for a source-complete release.

Current result: **179 checks passed, 0 failed.**

## Final conclusion

The USDA source layer is now inventoried and the defensible record candidates are documented. The audit does not approve the current nutrient totals. Shipping the current catalog as a draft cookbook is possible if estimates remain prominently labeled. Shipping it as a verified nutrient cookbook is blocked until the undefined formulas and preparation-state conflicts are corrected and all totals are recalculated.

# InSync Cookbook Content Release Audit

**Audit scope:** `cookbook-data.js`, 1,440 generated foundation records  
**Audit type:** culinary-content release readiness, separate from nutrient calculation  
**Decision:** **Do not ship these records as a finished cookbook**  
**Permitted use:** internal prototype, schema test fixture, meal-planner demonstration, and controlled review queue

## Executive finding

The catalog is structurally useful but is not yet a cookbook a person can reliably cook from. It contains the requested count, cuisine labels, meal-slot distribution, dual-unit ingredient fields, scaling metadata, and release statuses. Those accomplishments prove that the application can carry a large recipe library.

They do not prove that the records are distinct, culturally grounded, method-complete, food-safe, or professionally reviewed.

The strongest evidence is not a subjective editorial judgment:

- All 1,440 records are still marked `draft-calculated`.
- Only 362 ingredient fingerprints support 1,440 unique display names.
- 1,332 records, or 92.5%, share their ingredient fingerprint with at least one other record.
- 1,060 records, or 73.6%, have an ingredient-identical counterpart under another cuisine label.
- 1,245 records, or 86.5%, reuse an exact instruction set.
- All 1,080 non-snack records say to cook the protein "safely until done" without a target temperature or a sensory doneness test.
- No generated record includes an internal cooking temperature, thermometer cue, time-and-temperature storage direction, or reheating temperature.

A nutrient review can validate arithmetic and source mappings. It cannot turn a repeated formula into 1,440 independently authored and tested recipes. Nutrient approval and culinary approval must remain separate gates.

## Release classification

| Release question | Result | Evidence |
|---|---:|---|
| Can the app load and scale 1,440 records? | Yes | 1,440 records, 12 cuisines, 120 per cuisine, 360 per meal slot |
| Are all display names unique? | Yes | 1,440 unique names |
| Are there 1,440 distinct recipes? | No | 362 ingredient fingerprints and only 402 exact instruction fingerprints |
| Are cuisine labels supported by regional data? | No | 1,440 records have no region or regional-context field |
| Are cooking methods complete enough to follow? | No | 1,080 vague cook-until-done directions and systematic title-method conflicts |
| Are storage and reheating directions complete? | No | 1,440 lack explicit storage instructions; 0 contain time-and-temperature safety guidance |
| Are the records professionally approved? | No | 1,440 remain `draft-calculated` |
| Can this ship as internal application infrastructure? | Yes, behind the draft gate | The schema, scaling model, filters, and status controls are useful test infrastructure |
| Can this ship as a consumer cookbook? | No | Culinary distinctness, method, authenticity, safety, and approval gates remain unresolved |

## Repetition and distinctness

### Names

All 1,440 names are textually unique. The generator accomplishes this by combining cuisine, one of six modifiers, and one of twenty format names. Name uniqueness therefore overstates recipe uniqueness.

Each modifier appears 240 times:

- Sunrise
- Garden
- Roasted
- Rustic
- Weeknight
- Trail

The modifier usually changes the name and some descriptive tags, not the ingredients or preparation method. In particular, all 240 `Roasted` records lack roasting directions.

### Ingredient patterns

| Metric | Count | Share of catalog |
|---|---:|---:|
| Unique ingredient fingerprints | 362 | 25.1% relative to 1,440 records |
| Records in repeated ingredient groups | 1,332 | 92.5% |
| Records with an ingredient-identical counterpart in another cuisine | 1,060 | 73.6% |
| Cross-cuisine repeated ingredient groups | 172 | Not applicable |
| Largest identical ingredient group | 36 | 2.5% |
| Recipes with a duplicate ingredient line inside one recipe | 36 | 2.5% |

An ingredient fingerprint includes ingredient ID, gram amount, and optional status. It deliberately ignores the displayed cuisine name. This exposes records whose underlying food amounts are identical even when their titles differ.

### Instruction patterns

| Metric | Count | Share of catalog |
|---|---:|---:|
| Unique exact instruction fingerprints | 402 | 27.9% relative to 1,440 records |
| Records in repeated instruction groups | 1,245 | 86.5% |
| Repeated instruction groups | 207 | Not applicable |
| Largest exact instruction group | 30 | 2.1% |
| Unique structural patterns | 4 | One structure per meal slot |

Every non-snack receives the same four-step framework. Every snack receives the same two-step framework. Ingredient names are substituted into those sentences, but cooking technique is not developed for the named format.

## Generic flavor components

All 1,440 records use one of three generic flavor-source records, then relabel it with cuisine language:

- 990 recipes use ingredient ID `sauce`, whose source record is `House seasoning sauce`.
- 360 snacks use ingredient ID `herbs`, whose source record is `Fresh herbs and spices`.
- 90 Mexican non-snack recipes use ingredient ID `salsa`, whose source record is `Fresh salsa`.

Examples such as `ginger scallion sauce`, `garam masala sauce`, `ginger sesame sauce`, `sumac herb sauce`, and `cajun spice sauce` are display labels. They do not have separate component ingredients, recipes, preparation instructions, allergen declarations, or specific nutrient sources.

This is a critical nutrient and culinary problem. A sauce cannot be nutritionally reconciled from a display label when its oil, sugar, salt, dairy, soy, sesame, fish, nut, and other components are not defined. It is also not enough to establish cuisine identity by renaming one shared sauce record.

## Cuisine authenticity and representation risk

The audit does not declare a recipe authentic or inauthentic. That judgment requires qualified reviewers with relevant culinary and cultural knowledge. It does identify objective reasons the current labels are unsupported:

- All 1,440 records lack regional context.
- All summaries use broad `cuisine-inspired` wording generated from the cuisine label.
- None of the 1,440 records contains a named ingredient ID from the audit's reference set of 22 widely recognizable cuisine-specific ingredients, such as miso, dashi, gochujang, gochugaru, masa, paneer, curry leaf, fish sauce, lemongrass, galangal, harissa, za'atar, sumac, tahini, and andouille.
- 1,060 records share their complete ingredient ID and gram pattern with a record assigned to another cuisine.
- The 360 snacks reuse the same five snack concepts across every cuisine, with a seasoning label providing most of the distinction.

Absence from the reference set is a risk signal, not proof of cultural invalidity. The correct response is review and recipe redevelopment, not an automated authenticity claim.

## Method and title conflicts

The recipe title often promises a cooking technique or finished form that the instructions never perform.

| Title pattern | Records with missing method |
|---|---:|
| Roasted | 240 |
| Protein Bake | 72 |
| Sheet-Pan Dinner | 72 |
| Simmered Stew | 72 |
| Quick Sauté | 72 |
| Morning Wrap | 72 |
| Lunch Wrap | 72 |
| Hearty Soup | 72 |
| Snack Bites | 72 |

These categories overlap. For example, `Mexican Roasted Sheet-Pan Dinner` has no oven instruction, pan arrangement, roasting time, or sheet-pan equipment. `Mexican Roasted Hearty Soup` has no liquid, broth, soup instruction, or simmering step. `Mexican Roasted Snack Bites` says only to combine or arrange yogurt, cooked oats, berries, and lime-cilantro seasoning.

The issue cannot be corrected by nutrient calculation because it is a recipe-authoring failure.

## Cooking safety and operational clarity

### Unsafe vagueness

- 1,080 non-snack recipes contain the direction `Cook the [protein] safely until done`.
- 0 of 1,440 recipes provide an internal temperature, thermometer cue, or explicit temperature-based cooking direction.
- 470 recipes contain egg, egg white, or ground turkey as the protein and still lack explicit temperature guidance.
- 450 recipes tell the user to `cook` an animal ingredient whose ingredient record is already labeled cooked, including cooked chicken breast, cooked beef, cooked pork loin, cooked salmon, or cooked shrimp.
- All 1,440 records now carry a preparation-state field. The independent nutrient audit still flags ambiguous or unresolved states where the underlying ingredient definition is not specific enough.

The audit does not prescribe temperatures because the ingredient state, cooking method, thickness, appliance, and jurisdictional guidance must first be settled for each recipe. Adding a universal temperature to every generated record would create new risk.

### Storage and reheating

All recipes carry a numeric refrigerator-day value and freezer-day value. Those numbers are not accompanied by operational handling directions.

- 1,440 records lack explicit storage instructions.
- 0 records state a cooling window, cold-holding temperature, or reheating temperature.
- 0 records distinguish storage directions for assembled meals from components that should remain separate.
- Snack records containing yogurt or cottage cheese say to serve, but do not state refrigeration requirements.

Numeric shelf-life fields alone are not sufficient consumer instructions.

## Completeness risks beyond nutrients

| Finding | Count |
|---|---:|
| Records with exactly five ingredients | 1,080, all non-snacks |
| Records with exactly four ingredients | 360, all snacks |
| Records with no substitutions | 1,440 |
| Records missing regional context | 1,440 |
| Records with at least one missing ingredient preparation-state field | 0 |
| Records missing explicit storage instructions | 1,440 |
| Records still marked `draft-calculated` | 1,440 |

Uniform brevity is not automatically a defect, but perfect uniformity across twelve cuisines and four meal periods is strong evidence of formula generation rather than independently developed recipes.

## What the nutrient agent can and cannot approve

### The nutrient agent can verify

- Ingredient quantity arithmetic
- Per-serving calculations
- Scaling arithmetic
- Unit conversions when the ingredient form and density are defined
- Nutrient source identifiers
- Rounding and tolerance rules
- Agreement between ingredient totals and displayed nutrition
- Allergen propagation from fully specified ingredients

### The nutrient agent cannot approve

- Whether a recipe tastes good
- Whether the stated yield is physically accurate
- Whether the method produces the named dish
- Whether the dish appropriately represents its named cuisine or region
- Whether a generic sauce label contains undeclared ingredients or allergens
- Whether raw and cooked ingredient assumptions are correct when the recorded state remains generic or unresolved
- Whether refrigerator and freezer life is suitable for the assembled dish
- Whether the recipe was test-cooked successfully

Therefore, passing a nutrient calculation agent must not advance these records to `culinary-reviewed` or `production-approved`.

## Safe automated corrections

The following changes are safe to automate because they expose known facts or remove mechanical defects without claiming culinary, cultural, or medical authority:

1. **Keep all 1,440 records behind the existing draft release gate.** Do not expose them in a production cookbook filter.
2. **Change consumer-facing draft labels to `Prototype meal formula` or `Recipe concept under review`.** Do not call the collection a finished cookbook until culinary approval exists.
3. **Run the new content audit in continuous integration.** Fail a consumer release if vague doneness language, missing preparation state, unsupported method titles, undefined component sauces, or missing approval evidence is present.
4. **Merge exact duplicate ingredient lines within a record.** Add gram and household amounts, preserve the ingredient ID, and recalculate nutrition. This corrects the 36 duplicated berry lines without inventing an ingredient.
5. **Attach machine-readable issue flags.** Examples include `METHOD_TITLE_MISMATCH`, `GENERIC_COMPONENT_UNDEFINED`, `PREPARATION_STATE_MISSING`, `COOKING_TEMPERATURE_MISSING`, `STORAGE_INSTRUCTIONS_MISSING`, and `CROSS_CUISINE_CLONE`.
6. **Suppress unsupported marketing modifiers.** A name containing `Roasted`, `Bake`, `Sheet-Pan`, `Stew`, `Soup`, `Wrap`, `Sauté`, or `Bites` should be blocked when its instructions lack the matching operation. Automatic neutral renaming may be used only for internal review queues, not as final recipe authorship.
7. **Require component recipes for sauces and seasonings.** The system can automatically reject a component label that lacks ingredient composition, allergens, yield, and nutrient source mapping. The component itself must be authored and reviewed by qualified people.
8. **Require independent gate evidence.** Nutrient review may advance only the nutrition gate. Culinary and final release approval must remain separate and attributable.

## Corrections that are not safe to automate

Do not automatically:

- Add cuisine-specific ingredients merely to make a dish appear authentic.
- Generate an authenticity statement or regional attribution.
- Replace generic sauces with invented ingredient lists.
- Assume an ingredient labeled `cooked` was intended to be raw, or vice versa.
- Assign a universal cooking temperature without resolving ingredient state and method.
- Claim allergen-free status for an undefined sauce or seasoning blend.
- Invent refrigerator life, freezer life, reheating directions, or child portions.
- Mark a recipe culinary-reviewed because its fields are complete.

## Required path to a shippable cookbook

1. Select a smaller production tranche, ideally 12 to 24 recipes from one cuisine.
2. Replace each generated formula with an independently authored recipe record.
3. Define every sauce, seasoning blend, and prepared component as ingredients or as a linked subrecipe.
4. Resolve raw/cooked state, edible portion, drained state, and yield for every ingredient.
5. Test-cook the recipe at its base yield and at one scaled yield.
6. Record method-specific times, temperatures, sensory cues, storage, reheating, and leftover handling.
7. Complete cuisine and regional review by a reviewer appropriate to that cuisine.
8. Reconcile nutrition from specific source records after the final ingredient list and yield are locked.
9. Perform independent allergen and release review.
10. Publish only records that reach `production-approved` with complete review history.

The current system is ready to manage this workflow. The current generated recipe content is not ready to bypass it.

## Reproducible audit

Run:

```bash
node tests/cookbook-content-release-audit-tests.js
```

The test audits all 1,440 records and emits a machine-readable `CONTENT_AUDIT_METRICS` JSON object. At the time of this report, all 34 audit assertions pass. Passing means the test accurately detects and quantifies the present risks. It does not mean the cookbook is approved for release.

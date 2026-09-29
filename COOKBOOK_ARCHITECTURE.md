# InSync Universal Cookbook Foundation

## Product decision

InSync meal planning is offline-first and deterministic. The built-in cookbook supplies recipes, ingredients, instructions, nutrition, scaling, prep metadata, and shopping data without requiring an AI request. AI remains optional for explanations and conversational help.

## Catalog target

- 12 launch cuisines
- 120 recipes per cuisine
- 1,440 total catalog records
- 30 breakfasts, 30 lunches, 30 dinners, and 30 snacks per cuisine
- Schema is open-ended. Cuisine names are data, not a permanent product limit.

## Universal behavior

- The active profile supplies nutrition targets, units, preferences, diets, allergens, pantry items, and dislikes.
- No recipe or planner rule assumes a specific person, couple, household, country, or goal.
- Each meal stores `dinerCount` independently, from 1 through 20.
- One eater means one full planned serving. Nutrition shown in the personal plan remains per personal serving.
- Ingredient quantities and the grocery list multiply by `dinerCount`, personal portion scaling, and batch-prep servings.
- Household and weight displays are alternate views of one canonical quantity. Calculations never multiply formatted strings.

## Measurement contract

Every ingredient carries:

- Stable ingredient ID
- Display name
- Canonical grams, milliliters, or count
- Standard household amount and unit
- Recipe section
- Allergen tags
- Nutrition-source reference

`weight` mode renders grams, kilograms, milliliters, or liters. `standard` mode renders cups, tablespoons, teaspoons, ounces, slices, pieces, and other practical household units. Recipe-specific mass equivalents preserve the relationship between the two displays.

## Required recipe record

Each recipe contains identity and version, name and summary, cuisine and meal slots, protein classification, base yield, nutrition per serving, structured ingredients, instructions, prep/cook/total time, difficulty, equipment, dietary compatibility, allergens, search tags, flavor and texture, meal-prep and storage guidance, cost tier, scaling limits, substitutions, image status, and provenance/review status.

`cookbook-schema.js` is the executable Recipe Schema v1 contract. It exposes `window.InSyncCookbookSchema` and remains compatible with direct browser loading, the offline service worker, and Node VM tests.

### Validation profiles

| Profile | Purpose | Result meaning |
|---|---|---|
| `foundation` | Validate the current calculated catalog without overstating its maturity | The record is structurally usable by the deterministic planner |
| `production` | Enforce all requirements needed for reviewed content | The record is complete enough to enter or complete the human review gates |

Passing `foundation` validation does not imply culinary accuracy, cultural authenticity, nutrition accuracy, or production approval. The generated 1,440-record catalog intentionally passes the foundation profile and fails the production profile until its missing evidence and review data are supplied.

## Canonical ingredient contract

Each recipe ingredient is a line item that refers to a stable ingredient identity. A production line item requires:

- `id`: stable ingredient key. Renaming the visible ingredient must not change this key.
- `name`: localized display label.
- Exactly one positive canonical quantity: `grams`, `milliliters`, or `count` plus `countUnit`.
- `standard.amount` and `standard.unit`: the practical household equivalent for the same quantity.
- `preparationState`: the state used for both measurement and nutrition, such as raw, cooked, drained, chopped, or packed.
- `section`: grouping within the recipe, such as Main, Sauce, or Finish.
- `optional`: explicit inclusion flag.
- `allergens`: canonical allergen tags.
- `sourceRef`: a specific food-composition record identifier.

The launch allergen registry is `milk`, `egg`, `fish`, `shellfish`, `tree nuts`, `peanut`, `wheat`, `soy`, and `sesame`. Recipe-level allergens must include every allergen carried by its ingredient lines.

The production source format accepts specific USDA FoodData Central IDs such as `USDA-FDC-171077`. Named national datasets can use their own stable namespace. Category placeholders such as `USDA-FDC-category-chicken` remain valid only for foundation drafts.

### Quantity rules

Canonical quantities are the source of arithmetic. Household measures are alternate displays and must represent the same physical amount.

```text
scaled canonical quantity = base quantity * requested servings * portion scale / base servings
```

- Mass uses grams and renders grams or kilograms in weight mode.
- Volume uses milliliters and renders milliliters or liters in weight mode.
- Discrete food uses count and a practical count unit.
- Household amounts scale from the stored equivalent, not from formatted fractions.
- Conversion records must preserve the ingredient and preparation state. A cup of raw spinach is not interchangeable with a cup of cooked spinach.
- Display rounding never changes the underlying canonical value.

## Production recipe additions

In addition to the foundation fields, production validation requires:

- `region`: regional origin or a clear universal-adaptation note.
- Nutrition per serving for calories, protein, carbohydrates, fat, fiber, sugar, saturated fat, and sodium.
- Complete storage and reheating guidance.
- Cost tier plus a regional currency basis instead of a universal price claim.
- Search tags and accessible image metadata.
- Specific food-composition record IDs for every ingredient.
- Preparation state for every ingredient.
- Review evidence appropriate to the recipe status.

Fields may be extended with micronutrients, translations, locale-specific household measures, food-safety temperatures, ingredient substitutions, and regional pricing. Extensions must not change the meaning of the required v1 fields.

## Planning contract

The offline planner:

1. Applies cuisine, protein, dietary, allergen, absolute-exclusion, preference, dislike, and favorite rules.
2. Selects 28 dated meals without requiring a network call.
3. Sizes personal portions against the active calorie and protein targets.
4. Applies batch-lunch and dinner-leftover rules.
5. Preserves stable recipe IDs in the weekly plan.
6. Consolidates canonical ingredient quantities into a week-scoped grocery list.
7. Re-renders recipes and groceries when diner count or measurement mode changes.

## Validation and approval states

Catalog records use explicit review states:

- `draft-calculated`: structurally valid and calculated from ingredient reference values, but not production-approved.
- `culinary-reviewed`: quantities, method, timing, yield, and cuisine fit reviewed.
- `nutrition-reviewed`: the culinary gate has passed, then nutrient calculations and source mappings have been reviewed.
- `production-approved`: the culinary and nutrition gates have passed, then an independent release reviewer has approved publication.

The order is mandatory: `draft-calculated` to `culinary-reviewed` to `nutrition-reviewed` to `production-approved`. Each completed gate adds an event to `provenance.reviewHistory` with the resulting status, `reviewerId`, role, ISO review date, and notes. Later statuses require evidence for every earlier gate. Culinary, nutrition, and release gates require different reviewers. If `provenance.authorId` is present, that author cannot review or approve the same recipe. A recipe with a `production-approved` label that fails production validation is not approved at runtime.

The review roles must remain independent from initial recipe generation. The same person or automated process may prepare evidence for both reviews, but approval records must identify the accountable reviewers and dates.

The current generated foundation is `draft-calculated`. It establishes the complete system and content inventory, not final culinary approval.

## Nutrition data policy

Ingredient nutrition should be mapped to USDA FoodData Central records where available. FoodData Central provides public-domain food-composition data and an API intended for application use. Standard household measures must always retain their metric equivalent. The app must describe calculated recipe nutrition as an estimate and must not present it as medical advice.

Sources:

- https://fdc.nal.usda.gov/api-guide
- https://fdc.nal.usda.gov/data-documentation
- https://www.fda.gov/food/nutrition-facts-label/serving-size-nutrition-facts-label

## Next production gate

Replace formula-level ingredient references with specific FoodData Central identifiers, then review recipes cuisine by cuisine. A cuisine pack is production-ready only when all 120 records pass schema, allergen, nutrition, serving, measurement, instruction, cultural-fit, and cooking-safety checks.

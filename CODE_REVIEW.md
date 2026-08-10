# InSync 6.0.0-p5 — Nutrition 2.0 Review

## Architecture
A new `nutrition.js` domain owns deterministic Nutrition decisions. It consumes Store state and planned meals but does not own the network transport or primary screen rendering.

Responsibilities include:
- four-slot day/week validation;
- calorie/protein target-range verification;
- absolute-exclusion checking;
- pantry-staple matching;
- meal-prep timeline derivation;
- dinner-sized target derivation;
- Shared Dinner target/privacy model;
- one-recipe/two-portion validation;
- target-aware Eating Out fit calculations.

`cloud.js` still uses Claude to compose recipes and weekly meals, but generated output must clear the Nutrition validators before it is committed as ready.

## Targeted repair
Weekly generation is deliberately failure-local. After the initial plan is assembled, each date is validated independently. Only failing dates are requested again, and verified dates remain intact. This protects completed AI work and avoids spending time/tokens rebuilding a correct week because one day missed its numbers.

## Food preference safety
Soft dislikes and hard exclusions are separate state fields. Hard exclusions are checked in deterministic validators after generation, so a prompt-compliance miss cannot silently place a forbidden ingredient into an accepted plan.

## Shared Dinner privacy
Shared Dinner does not require sharing meal logs or daily targets. The owner may explicitly opt in to sending only:
- display name;
- dinner-sized calorie target;
- dinner-sized protein target.

The field is optional within partner sync schema 7, so existing sync compatibility is retained. Partner payload normalization bounds and sanitizes the target before local use.

## Shared Dinner logging model
One shared recipe contains two portion records. The local planned/loggable meal uses the current phone owner's calories/protein, while the attached Shared Dinner object preserves both portion instructions for household cooking coordination.

## Pantry and real-life logging
Pantry matching changes shopping-list output only; it never removes an ingredient from the recipe itself. Eating Out is modeled separately from generated meal prep and carries its own source marker in meal history.

## State safety
Nutrition additions are additive inside local state v10:
- `mealPrefs.mustNot`
- `mealPrefs.pantry`
- `mealPrefs.sharedDinnerShare`
- optional planned-meal `sharedDinner` metadata
- meal `source` metadata

No destructive migration or reset is introduced. Partner sync remains schema 7.

## Faith
Faith remains parked and dormant in the active shell, with prior source/data preserved for a later design pass.

# InSync Meal Scaling Engine

`meal-scaling.js` is the deterministic calculation layer for recipe quantities,
meal nutrition, leftovers, and grocery consolidation. Load it after
`cookbook-data.js` and before any screen that calls `window.MealScaling`.

## Scaling model

The engine keeps four concepts separate:

- `peopleEating`: whole people from 1 through 20.
- `servingsPerPerson`: servings allocated to each person, default 1.
- `portion`: `small` (0.75), `standard` (1), `large` (1.25), or a numeric
  multiplier from 0.25 through 3.
- `leftoverServings`: additional full servings prepared for later.

The calculation is:

```text
eatingServings = peopleEating * servingsPerPerson * portionMultiplier
preparedServings = eatingServings + leftoverServings
ingredientFactor = preparedServings / recipe.baseServings
```

For an explicit batch yield, pass `preparedServings`. The result reports how
many cooking batches are required when the amount exceeds the recipe's stated
`scaling.maximumServings`.

## Main API

```js
const result = MealScaling.scaleRecipe(recipe, {
  peopleEating: 5,
  servingsPerPerson: 1,
  portion: 'standard',
  leftoverServings: 2,
  mode: 'weight'
});
```

The result contains:

- `plan`: eating, leftover, and prepared serving totals plus the scale factor.
- `ingredients[].exact`: canonical arithmetic quantities.
- `ingredients[].practical`: kitchen-friendly rounded quantities.
- `ingredients[].display`: the selected household or weighted label.
- `nutrition.perPersonEating`: nutrition for one person's selected portion.
- `nutrition.eatingTotal`: nutrition served now.
- `nutrition.preparedTotal`: nutrition for the complete prepared batch.
- `nutrition.leftoversTotal`: nutrition reserved for later.

Exact quantities must be used for later calculations. Display strings and
practical quantities must never be parsed back into arithmetic.

## Grocery aggregation

```js
const groceries = MealScaling.aggregateGroceries(meals, {
  recipes: INSYNC_RECIPES,
  mode: 'standard',
  pantry: [
    { id: 'rice', grams: 300 },
    'salt'
  ],
  includeOptional: false
});
```

The aggregator consolidates by canonical ingredient ID, skips meals with a
`leftoverOf` reference, supports measured pantry deductions, rounds discrete
items upward for purchasing, and retains exact required quantities alongside
the display label.

Free-text pantry entries match complete words or phrases only. For example,
`oil` may match `olive oil`, but `ham` cannot match `graham crackers`.

If the same canonical ingredient ID arrives with incompatible quantity kinds
or standard units, the engine preserves separate rows instead of discarding a
quantity. Each affected row has `measurementConflict: true`, a
`measurementSignature`, and a `conflictReason` for review.

Existing planner records remain supported during migration:

- `dinerCount` is accepted as an alias for `peopleEating`.
- `portionScale` is accepted as an alias for `portion`.
- A `batchSource` record with `servings > 1` scales a household batch.
- A record with `leftoverOf` does not add groceries a second time.

## Integration rule

The meal-builder interface should save numeric selections, not rendered
measurement strings. Persist `peopleEating`, `servingsPerPerson`, `portion`,
`leftoverServings`, and the recipe ID, then call the engine whenever the screen
or grocery list renders.

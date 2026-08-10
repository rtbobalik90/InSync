# InSync 6.0.0-p5 — Nutrition 2.0

## Verified weekly planning
Generated meal weeks are no longer accepted merely because 28 recipe objects exist. InSync now validates each date independently for:
- all four required meal slots;
- calorie target range;
- protein target;
- absolute food exclusions.

If one date fails, only that date is sent back for repair. Successful days remain untouched.

## Preference levels
Meal preferences now distinguish:
- **Prefer not to include** — a soft preference Claude should avoid when practical.
- **Must never include** — a hard exclusion enforced by code after generation.

The hard field is intended for allergy/religious/medical/absolute household exclusions and is never treated as a casual dislike.

## Shared Dinner
Added the first Shared Dinner workflow:
- one common home-cooked recipe;
- one owner portion;
- one partner portion;
- separate calorie/protein targets;
- the phone logs only its owner's portion while retaining both portion instructions on the shared recipe.

Partner target sharing is separately opt-in. The sync payload may carry only a bounded dinner-sized calorie/protein target and name; exact meals, daily nutrition totals and food history remain private.

## Meal-prep timeline
The planner now converts the week into dated prep/cooking tasks, including batch-prep sources and meaningful dinner prep. The app can tell the user **when to cook**, not only what meal exists on a future day.

## Pantry staples
Users can list staples already kept on hand. Matching staples are suppressed from the generated shopping list while remaining part of recipe instructions.

## Eating Out
Restaurant logging now shows a target-aware fit indicator based on what remains for the day. Restaurant meals are saved with a distinct source so planning and real-life logging remain separate concepts.

## Faith status
Faith remains intentionally parked. Its source and private state are preserved but its dedicated Phase 3/3B interface is not loaded.

## Versioning
- App/UI: `6.0.0-p5`
- Local state: `insync.v10` (unchanged)
- Partner sync: schema `7` (unchanged)
- Service worker: `insync-v10-22`

## Next planned phase
Phase 6 — Together 2.0 + Weekly Campfire.

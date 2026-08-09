# InSync 5.4.0 — Meal Prep Memory

## What changed

### Home-cooked weekly generation
- Weekly meal generation is now explicitly **home-cooked only**.
- Claude is instructed not to return fast food, restaurant/takeout, drive-thru, meal-delivery or chain-brand meals.
- Returned weeks are validated before they replace an existing plan. Chain/fast-food names, missing ingredients/instructions, thumbs-downed meals and user avoid-keywords can reject a generated week atomically.

### Plan preferences before generation
The Meal Planner now includes persistent controls immediately above weekly generation:
- cuisines: Mexican, Chinese, Indian, American, Italian, Mediterranean, Thai, Japanese, Korean, Greek, Middle Eastern and Cajun;
- proteins: Chicken, Beef, Turkey, Pork, Fish, Shrimp, Eggs and Vegetarian;
- free-text **Things I like** keywords;
- free-text **Things I do not like / avoid** keywords.

Leaving cuisine or protein chips blank means no restriction. These preferences stay on the device until changed and are included in future weekly generation.

### Favorites and dislikes
- Any planned recipe can be marked **Favorite**.
- Favorites are saved as reusable recipe snapshots in the local Cookbook.
- Compatible favorites are deliberately reintroduced into later AI-generated weeks instead of forcing 28 brand-new meals every time.
- A reused favorite begins as a fresh occurrence; an old finished-photo reference is not copied into the new week.
- **Not for me** removes the current planned occurrence, removes it from Favorites, and adds the meal name to the future-generation exclusion list.

### Finished-meal photographs
- Planned recipes now have a **Finished plate** section.
- A camera/photo can be attached after the meal is made, replaced, or removed.
- Meal-prep photos use the same IndexedDB photo store as the rest of InSync rather than localStorage.
- They remain local to the device, are included in complete InSync backups, and are not sent through partner sync.
- Logging a planned meal copies its finished photo into the logged-meal record so later editing/removal does not share one destructive photo reference.

### Cookbook integration
- Favorites now appear first in Cookbook.
- Thumbs-downed meals are filtered from Cookbook suggestions/ideas.
- Manually placing a favorite into another week starts without carrying the prior occurrence's finished photo.

## Compatibility
- App version: **5.4.0**
- State schema: **v10** (no destructive migration required)
- Partner sync schema: **5** (unchanged; meal-planning preferences/photos remain local)
- Service-worker cache: **insync-v10-7**

5.4.0 retains all 5.3.1 expedition artwork, nutrition four-slot planning, two-device GitHub sync, automatic visible-app pulls, rolling chat, local-date scoring, historical score snapshots, recovery-day scoring, backups/restores, photo storage, privacy controls and iPhone viewport/scroll fixes.

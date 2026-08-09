# InSync 5.3.0 — Nutrition Week Planner + Start-Date Scoring

## What changed in 5.3.0

### Weekly points now begin when InSync actually begins

A new profile could previously show points earlier in the same week even though the app had only been started that day. The scoring engine treated an otherwise empty historical date as a recovery day, which is legitimately worth three points. InSync now has an explicit journey-start boundary: pre-start dates are non-scoring/blank, the weekly challenge excludes them, and sync schema 5 carries each person's start date so the other phone follows the same rule. Cached partner history before that declared start is removed when the newer payload arrives.

### Nutrition has four real daily meal destinations

Breakfast, Lunch, Dinner and Snack are permanently visible on Nutrition instead of exposing only one "next" meal. Each slot shows its own totals and entries. Tapping Add breakfast/lunch/dinner/snack opens the logger already assigned to that slot, while multiple entries per slot remain supported.

### The Meal Planner is now a real seven-day planner

The planner is date-based rather than a loose list of ideas. It provides:

- seven dated days per displayed week;
- Breakfast, Lunch, Dinner and Snack on every day (**28 slots**);
- Previous / This week / Next week navigation;
- separate persisted plans for different weeks;
- one-button **Build my week** generation around the current calorie/protein targets;
- complete recipe objects containing nutrition, serving count, prep time, ingredient quantities, recipe/prep notes and cooking steps;
- a dedicated recipe-detail screen;
- direct logging of today's planned meal into Nutrition;
- a shopping list derived from that displayed week's recipe ingredients;
- rebuild/clear behavior scoped to only the displayed week.

If Claude returns an incomplete week, InSync rejects it atomically and keeps the existing plan rather than leaving a half-written planner. Sunday defaults an untouched planner to the upcoming Monday-Sunday week.

### Release plumbing

- Settings version: **5.3.0**.
- State schema remains **v10** (the added planner fields are backward-compatible).
- Partner sync schema advances to **5** for the start-date boundary.
- Service-worker cache advances to `insync-v10-5`.
- A dedicated meal-planner regression suite is now part of the ship gate.

## Automated verification before packaging

- 469 stabilization/regression checks
- 23 sync stress/reconciliation checks
- 54 screen/malformed-state checks
- 11 dedicated meal-planner checks
- **557 total, 0 failures**

The exact distribution ZIP is also extracted and retested before handoff; see `TEST_REPORT.md` for that clean-room result.

---

## Earlier 5.2.x stabilization retained

5.3.0 retains the earlier phone-local dates, safe v5-v10 migrations, secret separation, transactional backup/restore, IndexedDB photographs, private-sync-repository enforcement, serialized/conflict-aware GitHub writes, rolling Together conversation and automatic visible-app sync, immutable historical score basis, recovery-day/calorie scoring, personalized targets, training-plan validation, expedition reconciliation, corrected achievements, notification/privacy controls, explicit Back routing, iPhone standalone viewport/scroll fixes, CSP/no-referrer policy, optimized WebP assets, atomic service-worker shell install, malformed-data sanitation and removal of destructive demo/debug code.

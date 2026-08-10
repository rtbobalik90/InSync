# InSync 5.5.4 — Code Review

## Scope

This review focused on the complete **Set up my next week** path and the Train landing screen. The work stays inside the existing local-first architecture: Store remains the persistence boundary, Insights derives readiness/progression facts, Cloud owns Claude I/O, and Screens/UI own presentation.

## Root causes found

### 1. Walking still consumed a gym-frequency day
The training prompt and validator inherited the older design where a high-frequency week could contain a dedicated Walk day. After 5.5.3 made walking a daily independent activity, that behavior became incorrect. A five-day gym preference could therefore produce only four lifting sessions.

**Fix:** the writer now requires exactly the selected number of lifting days, rejects Walk/Cardio day names, and explains to Claude that walking is tracked separately.

### 2. Valid meals were lost when training failed
The old setup transaction generated all 28 meals, kept them only in memory, then requested training. If training failed afterward, no meal plan was committed and the next tap restarted the expensive meal generation.

**Fix:** setup is now a resumable two-part coordinator. Each successful half is persisted immediately. A retry inspects semantic readiness and runs only the missing half.

### 3. Recovery validation conflated biceps and triceps
Exercise navigation intentionally groups curls and triceps work under **Arms**, but using that broad UI category for recovery validation caused ordinary consecutive Push/Pull days to be rejected.

**Fix:** recovery validation keeps the UI grouping but internally separates Arms movements into Biceps and Triceps.

### 4. Future plan lookup ignored staged plans
`Store.planFor(date)` previously read only the active plan. A staged plan could exist for next Monday while future-day previews still showed the wrong schedule or Rest.

**Fix:** plan lookup selects a plan by the requested date's week, preferring the staged plan for its own week and the active plan for its stamped week.

### 5. Readiness trusted metadata too much
A matching `futurePlanMeta.weekOf` could mark training ready even if the plan array was empty, and meal readiness was based on a raw count rather than the required date/slot matrix.

**Fix:** readiness now verifies all 28 exact date+slot meal records and the exact configured number of non-Walk lifting-plan rows with exercise arrays.

### 6. Week-boundary activation was launch-heavy
A PWA left open across Sunday night into Monday could retain the staged plan until a full reload.

**Fix:** scheduled-plan promotion is also checked on foreground return and in the existing visible-app periodic tick.

## Train presentation review

The supplied iPhone screenshot showed a large dark/dead middle band on a rest day: the artwork disappeared too early and the weekly context was below the opening view. The Train screen now uses a lower custom scrim, a compact walk card, and a measured fold anchored at the **This week** card. This preserves the app's visual language while making better use of the hero image. A staged next week gets its own preview card instead of changing the active week early.

## Risk review

- No new external dependency was introduced.
- Local state remains schema v10.
- Partner sync remains schema 6.
- Meal and training setup still uses the existing local Claude credential path.
- The current active plan is never overwritten by a future plan before its week begins.
- Partial setup failures now preserve completed work rather than rolling it back.
- Existing privacy boundaries are unchanged.

## Remaining architectural debt

`screens.js`, `store.js`, `cloud.js`, and `app.js` remain large modules. They are stable but should eventually be split by domain during a deliberate major refactor. This release avoids that speculative change because it would add regression risk unrelated to the reported behavior.

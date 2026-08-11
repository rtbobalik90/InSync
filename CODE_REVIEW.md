# InSync 6.0.0-p6.0 — Phase 6 Code Review

## Review result
Phase 6 is additive over the P5.8 production baseline. Existing health, expedition, training, nutrition, history and Grand Canyon art systems remain intact.

## Architecture
- New `together.js` isolates Together-specific mode, mission, Campfire and share-payload logic.
- Screens render Together workflows but do not calculate raw mission/share semantics themselves.
- Partner sync remains sanitized at the Cloud boundary and normalized again by Store.
- The local Together mode is deliberately excluded from sync to prevent presentation preference conflicts.

## Privacy review
- Duo Mission sync contains mission week/id plus bounded aggregate progress.
- Campfire sync contains only a user-entered short shared intention.
- Weekly partner summary always shares points/logged-day context; workouts/steps/protein aggregates only cross when their existing privacy toggles allow them.
- No new private journal, reflection, photo, exact bodyweight, meal-log or workout-set detail is shared.

## Safety / game-design review
- Duo Missions are finite weekly targets and explicitly state that extra grinding does not change health prescriptions.
- Missions do not alter calorie targets, step targets, training frequency, progression logic, recovery recommendations or expedition completion rules.
- Spiritual practices remain outside the scoring/mission system.

## Compatibility
- Local storage remains `insync.v10` with additive normalization for `together` state.
- Sync schema advances from 7 to 8; older payloads without Together data remain readable, and schema-8 core fields remain readable by earlier sanitizers that ignore unknown fields.
- P5.8 -> P6 replacement upgrade is non-destructive.

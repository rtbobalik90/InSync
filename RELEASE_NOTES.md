# InSync 6.0.0-p5.5 — Visual Scrims + Train Architecture Refinement

## What changed

### Expedition artwork treatment
InSync now uses three deliberate image-protection levels instead of one blanket dark wash:
- **Light** — Home, Together, Coach, unlocked Checkpoints, Arrival/Completion moments.
- **Medium** — Journey and Nutrition.
- **Heavy** — Train and workout-day surfaces where controls need the strongest contrast.

The purpose is to preserve interface readability while allowing the production expedition artwork to stay visible and dimensional.

### Train landing rebuilt
The main Train tab is now a weekly command view rather than a duplicate of today's workout screen.
- **This Week** is the only training card at the opening rest position.
- Previous/next week arrows browse training weeks.
- Tapping a day opens the full workout-day surface.
- **Your Plan** follows below the fold, including current-week AI rewrite when available.
- **Records & Progression**, **Exercise Library**, **Body**, and **Add a Workout** live below the plan.
- Day-specific readiness, Walk Timer, movement list, session controls, steps, and manual workout logging were moved into the selected day.

### Home check-in cleanup
- Morning Check-In disappears from Home once that morning has been saved.
- Existing P5.4 morning values are treated as already completed so upgrading does not re-prompt a finished check-in.
- Nightly Review disappears from Home once the review has been written.
- Both remain editable from History / Day History.

## Compatibility
- Local state key remains `insync.v10`.
- Partner sync remains schema 7.
- Faith remains parked.
- No phone-data reset is required.

## Release identifiers
- App/UI: `6.0.0-p5.5`
- Service worker: `insync-v10-27`

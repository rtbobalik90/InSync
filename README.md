# InSync 6.0.0-p6.0 — Together 2.0 + Weekly Campfire

InSync is a private, local-first two-person health and expedition PWA. Phase 6 turns Together from a partner-status surface into a true shared workflow while preserving individual health targets and privacy.

## Phase 6 highlights
- Together styles: Cooperative, Competitive, Quiet Support. The choice is local to each phone and never forces the partner into the same presentation.
- Duo Missions: four bounded shared objectives for the current or next week. Missions use aggregate progress only and never change calories, step targets, training volume or expedition rules.
- Weekly Campfire: weekly review, privacy-safe partner summary, optional Coach interpretation, shared carry-forward intention, next-week training/meal readiness, Duo Mission planning, Shared Dinner coordination and a close-the-week ritual.
- Quick encouragement: one-tap supportive messages plus the existing conversation and reaction feed.
- Shared Dinner coordination is surfaced inside Together and Campfire without exposing exact food logs.
- Partner notifications for Duo Mission proposals and Campfire intentions.
- Home's weekly-review teaser now opens Weekly Campfire.

## Privacy / sync
- Local state key remains `insync.v10`; no data reset.
- Partner sync advances to schema 8.
- Together presentation mode stays local-only.
- Partner sync adds only explicit Together workflow data: Duo Mission id/progress, short Campfire intention, next-week readiness and privacy-safe weekly aggregates.
- Existing privacy toggles still control weekly workout, step and nutrition aggregates.
- Private reflections, photos, exact weight, raw meal history and private journals are not added to Together sync.

## Files added
- `together.js` — Together 2.0 domain logic and bounded share payload.
- `tests/together-2-campfire-tests.js` — dedicated Phase 6 regression suite.

## Release identity
- Runtime: `6.0.0-p6.0`
- Service worker: `insync-v10-33`
- Local state: `insync.v10`
- Partner sync: schema 8

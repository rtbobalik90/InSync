# InSync 6.0.0-p6.0 — Together 2.0 + Weekly Campfire

## Together 2.0
- Added Cooperative, Competitive and Quiet Support presentation modes.
- Cooperative emphasizes combined weekly progress; Competitive retains the fair 10-point daily contest; Quiet Support removes score comparisons from Together.
- The mode is intentionally local to each phone.

## Duo Missions
- Added four bounded shared missions: Twelve Together, Training Team, Eight Strong Days and Four Full Days.
- Missions can be selected for this week or next week.
- Progress combines only after both phones choose the same mission.
- Mission progress never changes health targets or rewards overtraining/grinding.

## Weekly Campfire
- Added a dedicated `#campfire` experience.
- Shows deterministic week stats and privacy-safe partner aggregates.
- Reuses the grounded Coach weekly review when available.
- Adds one explicitly shared carry-forward intention.
- Includes the Next Week Command Center for training and meals.
- Coordinates next week's Duo Mission and Shared Dinner.
- Closing the Campfire marks the local review complete and establishes the two existing measurable next-week goals without locking plans.

## Partner experience
- Added one-tap encouragement.
- Added notifications for partner Duo Mission proposals and Campfire intentions.
- Existing conversation, trail moments, reactions, expedition progress and badges remain available.

## Sync / privacy
- Partner sync schema: 8.
- New shared fields are sanitized and bounded.
- Together mode remains local-only.
- Weekly health aggregates continue to obey the existing privacy toggles.
- No private reflection, journal, photo, exact weight or raw food history is added to sync.

## Technical
- Added `together.js` to the online and offline shell.
- Runtime: `6.0.0-p6.0`.
- Service worker cache: `insync-v10-33`.
- No local-state reset.

# InSync 6.0.0-p5.6 — Code Review

## Scope
This hotfix intentionally changes only two user-facing behaviors: Train hero image protection and dated step correction.

## Findings
- The P5.5 Train screen used the heavy expedition scrim across the top of the artwork. The dedicated `SCRIMS.train` treatment now leaves the upper 58% unwashed and keeps the lower blend into the dark card stack.
- Historical step storage and the dated Log sheet already supported writing to a supplied date, but the Train-day UI only displayed the step total. A dated Add/Edit steps action is now exposed directly on every non-future Train day.
- History retains its existing dated Steps edit route.
- `Store.setSteps(value, date)` remains the single deterministic write path, so corrected steps are stored on the intended day rather than today.

## Compatibility
No local-state migration, partner-sync change, expedition-art rename, or user-data reset is required.

# InSync 6.0.0-p4 — Training 2.0 Review

## Architecture
A new `training.js` domain owns deterministic training decisions. It consumes Store history and the existing exercise library but does not own UI or network calls.

Responsibilities include:
- gym/equipment profiles;
- readiness interpretation;
- exercise eligibility;
- progression recommendations and evidence;
- recovery/deload proposal signals;
- rest-duration defaults;
- movement-pattern warm-ups;
- structured walking-distance calculation.

`insights.js` delegates progression to this engine when it is loaded. `cloud.js` may still use Claude to compose a weekly program, but the prompt is constrained to eligible exercises and `validatePlan()` rejects unavailable equipment before anything reaches Store.

## State safety
Training additions remain additive inside local state v10:
- `trainingProfile`
- day-level `readiness`
- structured walk fields
- working-set effort/RIR
- session rest-timer state

No destructive migration or reset is introduced. Partner sync remains schema 7.

## Progression safety
The next-load decision is never taken from Claude output. The deterministic engine uses:
- exercise rep range;
- recent working sets;
- recent load/reps;
- Easy/Right/Hard or RIR;
- current readiness;
- recent discomfort substitutions.

The UI renders the supporting facts under **Why this?** so a recommendation is inspectable rather than a black box.

## Recovery behavior
Readiness and deload are proposals, not automatic plan mutations. Pain is treated only as a caution signal: InSync explicitly does not diagnose it and does not force progression.

## Distance correctness
Structured treadmill/manual walking can be more accurate than step-derived distance. Expedition contribution therefore takes the maximum credible source per day rather than summing sources that may represent the same walk.

## Media requirement
Every exercise newly made available to the planner ships with a real animated WebP asset. Claude cannot prescribe an exercise outside the registered library/equipment rules.

## Faith
Faith remains parked and dormant in the active shell, with prior source/data preserved for a later design pass.

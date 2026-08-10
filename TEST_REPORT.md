# InSync 5.5.4 — Release Test Report

## Release gate

The production working tree and the final packaged ZIP were each run through the complete automated suite in a clean Node environment.

| Suite | Passed | Failed |
|---|---:|---:|
| Core stabilization / persistence / migrations / assets / wiring | 496 | 0 |
| Two-phone cloud sync / concurrency | 30 | 0 |
| Weekly rhythm / history / coaching / reactions | 57 | 0 |
| Meal planner / recipes / meal-prep memory | 25 | 0 |
| Notification bell states | 10 | 0 |
| Screen and malformed-state smoke rendering | 71 | 0 |
| Daily Walk / recovery-day timer | 42 | 0 |
| Next-week setup + Train rework | 23 | 0 |
| **Total** | **754** | **0** |

## 5.5.4-specific coverage

The new next-week/Train suite verifies that:

- a Walk/Cardio placeholder cannot consume one of the selected gym days;
- a valid five-day lifting split is accepted as five lifting days;
- malformed/unsafe first training output receives exactly one automatic repair attempt;
- biceps/triceps recovery does not falsely reject a normal Push/Pull sequence;
- staged future training retains all requested lifting days;
- `Store.planFor()` resolves a staged future week before Monday promotion;
- 28 valid meals remain saved when training subsequently fails;
- retrying setup skips the already-saved meal half and retries only training;
- successful setup creates exactly two measurable goals;
- the training-session goal matches the configured lifting frequency;
- stale future-plan metadata cannot claim training is ready without real plan rows;
- 28 arbitrary meal rows cannot claim meal setup is complete without the exact seven-date × four-slot matrix;
- Train uses the compact daily Walk timer and anchors its resting fold through **This week**;
- Train can use its lower custom hero scrim without changing other screens;
- staged next-week training is visibly previewable without becoming active early;
- onboarding no longer teaches that walking replaces a gym day.

## Static production checks

- Production JavaScript parses successfully.
- `manifest.webmanifest` parses successfully.
- 126/126 production raster/WebP images decode.
- 41/41 exercise demonstration WebPs remain animated.
- 0 zero-byte files.
- 0 duplicate production-image hash groups.
- production action/route/asset wiring remains covered by the stabilization/smoke suites.
- version agreement: app **5.5.4**, local state **v10**, partner sync **schema 6**, service-worker cache **insync-v10-13**.

## Physical-device acceptance still worth checking

Automated tests cannot reproduce every iOS Home Screen PWA lifecycle behavior. On the two real phones, the most useful acceptance checks are:

1. open Weekly Review and run **Set up my next week** with the real Claude key;
2. confirm progress moves through meals and training and the ready state survives closing/reopening the PWA;
3. verify the coming Train week contains the selected number of lifting sessions, not a Walk placeholder;
4. on a rest day, confirm the Train hero shows more artwork, the Walk timer sits higher, and **This week** is visible in the opening composition;
5. if the PWA remains open across Sunday night into Monday, confirm staged training activates without requiring a reinstall/reload.

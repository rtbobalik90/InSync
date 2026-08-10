# InSync 5.5.2 — Code Review

## Release assessment

**Code release gate: PASS**, subject to the real-device acceptance checks documented in `TEST_REPORT.md`.

The 5.5.2 build preserves the 5.5.0 architecture and extends the existing local-first architecture rather than creating parallel data systems. `Store` remains the persistence boundary, `Insights` derives cross-cutting facts from that store, `Cloud` owns Claude/GitHub I/O, and screen/action modules remain presentation and interaction layers.

## Workout-walk design review

The walk timer is stored inside the existing `session` object rather than in DOM memory or a second timer database. `startedAt` is persisted and elapsed time is derived from wall-clock time, so iOS suspension or a full app reload cannot make the displayed duration drift backward. Stopping converts the live interval into accumulated milliseconds; resuming starts a new live interval on top of that accumulated duration.

Completed walk metadata is archived inside the same workout record as the lift summary. Pace/speed and elevation/incline are intentionally bounded strings rather than falsely normalized measurements because a user may enter treadmill speed (`3.5 mph`), running-style pace (`16:00 /mi`), incline (`5%`) or actual elevation gain (`300 ft`). This keeps the record faithful to what the device or treadmill reports.

`finishSession()` independently refuses to close a workout while the walk is live. That rule lives in the Store as well as the UI handler, so a stale screen or future code path cannot silently truncate a running walk.

## Architecture decisions

### One source of truth
Weekly reviews, progression, calendar detail, Coach patterns, reactions and sync health derive from the same normalized Store state already used by scoring and history. There is no second analytics database to drift out of sync.

### Future plans are staged, not destructive
A training plan generated for next week is stored in `futurePlan`/`futurePlanMeta` and promoted only when that week becomes current. The active week is not overwritten early.

### Privacy remains field-bounded
Together activity is generated only from data already eligible for sharing. Workout, calorie/protein and step activities respect their corresponding privacy switches. Exact meals, exact lift details, reflections, progress photos and exact bodyweight are not added to the partner payload.

### External input is normalized twice
GitHub payloads are sanitized in `cloud.js`, while Store normalization independently constrains imported/restored state. Activity IDs, reaction keys, dates, scores, numeric health fields and timestamps are bounded before screens can read them. This protects both sync traffic and user-editable backup JSON.

### Service-worker activation is conservative
The app can detect an updated service worker without forcing an immediate reload. Activation/reload waits until the app is not editing, no modal is open, no workout is active and the user is on Home or Settings.

## Maintainability

`insights.js` is intentionally a derivation layer rather than another state owner. That keeps weekly review, progression, calendar, activity and sync-health logic testable without further expanding `screens.js` or `store.js` responsibilities.

The largest legacy modules (`screens.js`, `store.js`, `cloud.js`, `app.js`) are still substantial. They should be split by domain during a future major architectural release, not immediately after a stable production pass. A speculative refactor now would add regression risk without improving the user-facing 5.5.2 release.

## Known platform boundary

Automated tests can validate data, rendering contracts, sync serialization and browser-independent logic, but they cannot certify iOS camera permission prompts, actual Home Screen PWA suspension/resume, real GitHub/Claude credentials, or physical two-iPhone network transitions. Those are the final hardware acceptance gate, not an unresolved code defect.


## Notification-state review

5.5.2 keeps notification read-state local to each phone. Informational notifications use stable ids and a bounded 200-item seen list; they are acknowledged by opening the Notification Centre. Action-required notifications are derived from unresolved domain state instead of a dismiss flag, so viewing the centre cannot accidentally clear an expedition invitation, unread partner note, or coach proposal. The header prioritizes action count over informational state when both exist.

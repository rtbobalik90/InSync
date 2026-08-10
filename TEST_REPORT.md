# InSync 6.0.0-p1 — Phase 1 Release Test Report

## Release gate

The working tree must pass every automated suite. The production ZIP is then extracted into a separate clean-room directory and the exact same suites are run again against the files that will actually be deployed.

| Suite | Passed | Failed |
|---|---:|---:|
| Core stabilization / persistence / migrations / assets / wiring | 502 | 0 |
| Two-phone cloud sync / concurrency | 30 | 0 |
| Weekly rhythm / history / coaching / reactions | 57 | 0 |
| Lizzie-device planner / second-user regression | 50 | 0 |
| **Lizzie deep-audit state / units / preferences / restore** | **87** | **0** |
| **Lizzie ↔ Robert pair-symmetry sync** | **14** | **0** |
| Meal planner / recipes / meal-prep memory | 25 | 0 |
| Next-week setup + Train | 23 | 0 |
| Notification bell states | 10 | 0 |
| Screen and malformed-state smoke rendering | 72 | 0 |
| Daily Walk / recovery-day timer | 42 | 0 |
| **Phase 1 architecture / Journey / Base Camp contracts** | **40** | **0** |
| **Total** | **952** | **0** |

## Deep-audit coverage

The 87-check owner-side audit verifies, among other things:

- `strong` goal survives reload;
- interrupted Coach state cannot remain permanently pending;
- Claude-selected verse state survives reload;
- malformed chapter state is normalized and old rolling chapters migrate to true calendar weeks;
- one-word initials stay consistent;
- partner identity changes cannot display the previous person's cached data;
- canonical lb ↔ kg and kcal ↔ kJ conversions are reversible at user input boundaries;
- every major Lizzie screen renders with kg + km + kJ enabled together;
- walking trends/review/arrival respect km and metre climb display;
- lower adult weight proposals and kg/kJ Coach proposals convert safely back to canonical storage;
- semantic next-week readiness rejects placeholder meals, invented exercises and newly disliked exercises;
- expired future training cannot activate late;
- successful meal batches survive a later batch failure and retry resumes only missing batches;
- all four female goal modes produce bounded finite onboarding targets;
- every supported 2–6 day built-in lifting plan passes the production validator;
- post-onboarding goal/frequency changes preserve the active week and invalidate stale staged training;
- cross-owner backup restore and malformed ownerless onboarded backups are rejected safely;
- production logic contains no hard-coded Robert or Lizzie identity.

## Pair-symmetry coverage

The 14-check two-device simulation runs separate Lizzie-owner and Robert-owner VMs against one mock private GitHub repository. It verifies both filename directions, shared-step privacy, non-shared meal data, proposal/acceptance flow in both directions, decision ownership, wrong-owner payload rejection and correct network paths.

## Static production checks

The release gate additionally verifies JavaScript syntax, manifest JSON, action/route wiring, service-worker cache contract, zero-byte files, literal production asset references and production image integrity.

Version contract:

- app **6.0.0-p1**;
- local state **v10**;
- partner sync **schema 6**;
- service-worker cache **insync-v10-16**.

## Physical-device acceptance boundary

Automated tests cannot inspect the literal private localStorage currently on Lizzie's iPhone, call the real Anthropic service with her private key, or perfectly reproduce every iOS Home Screen PWA suspension. This release therefore tests old, malformed, metric, partial-planner and Lizzie-shaped states plus the real truncation failure class, while the final acceptance step remains using the exact deployed build on the physical phones.

## Final package verification

The finalized 6.0.0-p1 ZIP was extracted into a fresh clean-room directory. All **952/952** regression assertions passed again from that extracted package with **0 failures**. The clean-room static gate also found:

- **126/126** production images decode successfully;
- **41/41** exercise demonstration images remain animated;
- **0** zero-byte files;
- **0** duplicate production-image hashes;
- no production `TODO`, `FIXME`, `debugger`, `console.log` or `console.debug` residue.

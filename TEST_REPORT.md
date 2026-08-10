# InSync 6.0.0-p3b — Phase 3B Release Test Report

## Result

**1,156 automated assertions passed. 0 failed.**

The full test suite was run against the Phase 3B working repository after all Faith/Journey changes.

## Suite breakdown

| Suite | Passed | Failed |
|---|---:|---:|
| Cloud sync | 30 | 0 |
| Completion features | 57 | 0 |
| Phase 3 Faith Foundation | 81 | 0 |
| **Phase 3B Faith/Journey redesign** | **67** | **0** |
| Phase 2 Intelligence | 52 | 0 |
| Lizzie deep audit | 87 | 0 |
| Lizzie device | 50 | 0 |
| Robert/Lizzie pair symmetry | 14 | 0 |
| Meal planner | 25 | 0 |
| Next-week / Train | 23 | 0 |
| Notification bell | 10 | 0 |
| Phase 1 foundation | 40 | 0 |
| Screen smoke | 72 | 0 |
| Stabilization / production integrity | 506 | 0 |
| Daily workout / recovery walk | 42 | 0 |
| **Total** | **1,156** | **0** |

## Phase 3B-specific coverage

The new suite verifies:
- verified local KJV passage storage
- Daily Camp Faith integration
- expedition-aware Faith Hub
- Journey **Along the Road** experience
- waypoint Scripture sourced from the verified library
- Bible / passage rendering
- Memory Trail mode availability
- progressive Word Bank behavior
- Tap to Reveal, First Letters, Type It and Speak flows
- Prayer at Camp privacy language and one-request sharing
- Close Camp three-part reflection rhythm
- private waypoint note persistence
- waypoint notes excluded from partner sync
- waypoint notes excluded from general AI context
- no Faith or waypoint Base Camp XP
- new routes/actions
- offline shell inclusion
- `insync.v10` local compatibility
- partner schema 7 compatibility

## Build identifiers

- App/UI: **6.0.0-p3b**
- Faith module: **1.1.0**
- Scripture Library: **1.0.0**
- Local storage: **insync.v10**
- Partner sync: **schema 7**
- Service worker: **insync-v10-19**

# InSync P6.2 Base Camp 1.0 RC1 Execution Report

Date: September 6, 2026  
Runtime: `6.0.0-p6.2`  
Local store: `insync.v10`  
Partner payload: schema `8`  
Service-worker cache: `insync-v10-38`

## Release position

The integrated release candidate is code-complete for Base Camp 1.0 and the approved Sprint 1 friction work. The deterministic release gate passes on the exact packaged source. The candidate is ready for the documented real-device certification, but it is not yet approved for rollout to Robert's and Lizzie's daily phones.

## Completed work

### Release foundation

- Added a one-command deterministic gate at `node qa/run-tests.js`.
- Added reviewed media profiles that reject partial or accidental asset restores.
- Fixed the missing `trail-notes.js` application load.
- Fixed Campfire archive month navigation across year and month boundaries.
- Advanced the installed-app cache identifier to `insync-v10-38`.

### Base Camp 1.0

- Added a modular, local-only 6×6 camp.
- Added a catalog, state engine, renderer, interaction layer, and Journey entry point.
- Added object selection, placement, movement, rotation, and removal.
- Enforced bounds and collision rules.
- Used the existing atomic state import path for persistence.
- Prevented Base Camp edits from starting partner auto-sync.
- Preserved backup and restore compatibility without changing `insync.v10`.

### Partner privacy and Together

- Gated trail-distance mission progress behind step sharing.
- Gated training-session mission progress behind workout sharing.
- Gated score-derived strong/perfect-day missions behind all four health-sharing permissions.
- Applied the same privacy boundaries to derived social activity.
- Added seven human-readable pairing states shared by Together and Settings:
  - Not set up
  - This phone ready
  - Waiting for partner
  - Paired and current
  - Paired but stale
  - Offline
  - Needs attention
- Added a four-step guide for the existing private GitHub two-phone flow.
- Preserved local entries through sync failures and preserved partner schema 8.

### First-use and daily-use friction

- Added an explicit training-location/equipment step to onboarding.
- Added Planet Fitness, Home, Full gym, and Custom choices.
- Required a valid Custom equipment selection and kept the preview equipment-compatible.
- Saved the exact equipment profile and initial plan selected during onboarding.
- Reworded Coach behavior as an evidence-based proposal that requires user approval.
- Rebuilt Settings as an eight-section hub with focused routes and masked secrets.
- Clarified that notification controls affect only InSync's notification centre.
- Rebuilt History as a broad hub and moved the former meal-only view to `Meal history`.

### Artwork

- Restored the authoritative P6.2.1 production media donor.
- Confirmed 158 substantive assets and zero transport placeholders.
- Classified 222 duplicated route slots as intentional future-expedition fallbacks.
- Confirmed Grand Canyon as the completed universal expedition pack.
- Preserved substantive legacy Camino, Milford, and Inca route artwork.
- Recorded every asset classification and future-art boundary in `ART_ASSET_REGISTRY.md`.

## Automated release gate

Command:

```bash
node qa/run-tests.js
```

Final result:

| Gate | Result |
| --- | ---: |
| Test files | 34 |
| Active suites passing | 32 |
| Retired Faith suites | 2 |
| Assertions passed | 2,074 |
| Assertions failed | 0 |
| Substantive media assets | 158 |
| Intentional future-route slots | 222 |
| Transport placeholders | 0 |

## Required before daily-phone rollout

The real-device matrix in `MOBILE_RELEASE_CERTIFICATION.md` is still `NOT RUN`. It requires Robert's and Lizzie's actual iPhones and credentials. The release decision remains `NO-GO` until these items pass:

1. Back up both current daily installations and verify the files outside the phones.
2. Test upgrade and cold offline launch on both daily phones.
3. Complete fresh onboarding as both identities, including different equipment choices.
4. Complete the two-phone pairing, bidirectional sync, stale/offline recovery, and privacy-toggle matrix.
5. Validate walk and rest timers through backgrounding and lock-screen time.
6. Validate camera, barcode, progress photo, meal photo, restore, and rollback paths.
7. Complete small-screen, Dynamic Type, VoiceOver, contrast, and reduced-motion checks.
8. Complete a 24-hour normal-use soak on both phones.

No automated browser E2E run is claimed. The available environment did not contain a browser binary, and emulation would not replace the real-iPhone gate in any case.

## Next phase

After RC1 passes real-device certification:

1. Fix and retest any device findings without changing schema or storage unless explicitly approved.
2. Freeze and deploy the certified package with a recorded rollback package and a new rollback cache identifier.
3. Produce and approve one complete non-Grand-Canyon expedition art pack before expanding route artwork in bulk.
4. Keep secure invite-based pairing, a managed credential broker, encrypted backups, true push notifications, and broader Base Camp economy/visits in platform-hardening or later product phases.
5. Keep the dedicated Faith feature parked until Robert explicitly reactivates it.

## Governing artifacts

- `DECISION_LOG.md`
- `SPRINT_1_BACKLOG.md`
- `PRIVACY_AND_DATA_CONTRACT.md`
- `ART_ASSET_REGISTRY.md`
- `MOBILE_RELEASE_CERTIFICATION.md`
- `TEST_REPORT.md`


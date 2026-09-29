# InSync 6.0.0-p6.2 Test Report

## Baseline result

Command: `node qa/run-tests.js`

Status: **PASS**

- 34 deterministic test files discovered and run in lexical order.
- 2,074 functional assertions passed.
- 0 functional or media assertions failed.
- 32 active suites passed cleanly.
- Base Camp 1.0 contributes 29 passing assertions.
- Guided pairing contributes 19 passing assertions.
- Equipment-aware onboarding and Coach copy contribute 25 passing assertions.
- Partner-derived privacy filtering contributes 23 passing assertions.
- Settings, History, and in-app notification clarity contribute 25 passing assertions.
- 2 retired Faith suites contained no active assertions and correctly directed coverage to `faith-parked-tests.js`.

## Production-media baseline

The authoritative P6.2.1 media donor is integrated. The gate distinguishes finished assets from intentional future-expedition route slots.

| Area | Files |
| --- | ---: |
| Substantive production assets | 158 |
| Intentional future-route slots | 222 |
| Transport placeholders | 0 |
| **Total** | **380** |

All global art, app icons, badge images, and exercise demonstrations are restored. Grand Canyon is the completed universal expedition pack. Camino, Milford, and Inca retain substantive legacy route artwork. Other route-specific slots remain intentional fallbacks and are tracked in `ART_ASSET_REGISTRY.md`.

## Expected failing assertions

None in the production-current profile. The gate still recognizes the original transport-slim profile for diagnostic use, but a production candidate must not use that profile.

## Gate behavior

The runner exits successfully only when all of the following are true:

1. No unexpected assertion fails.
2. A non-media suite does not exit abnormally.
3. Every expected media failure matches its named suite, message pattern, and exact count.
4. The test inventory remains at the reviewed baseline.
5. The media inventory matches a reviewed profile and a production candidate contains no transport placeholders.
6. Application, test, and media content remains unchanged for the duration of the run.

The production-current profile permits no expected test failure. A real application regression cannot be classified as a media limitation unless the baseline is explicitly reviewed and updated.

## Scope boundary

This is a deterministic Node-based regression and package-integrity baseline. It does not replace real-device validation for iOS/Android PWA installation, service-worker upgrade behavior, camera/barcode capture, notifications, GitHub synchronization against a live private repository, Claude API behavior, offline transitions, or Robert/Lizzie two-device privacy and pairing flows.

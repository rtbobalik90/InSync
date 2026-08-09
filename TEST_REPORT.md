# InSync 5.2.2 — Ship-Readiness Test Report

## Automated release result

The working release candidate currently passes all three suites:

```bash
node tests/stabilization-tests.js
# 452 passed, 0 failed

node tests/cloud-sync-tests.js
# 23 passed, 0 failed

node tests/screen-smoke-tests.js
# 50 passed, 0 failed
```

**525 total checks passed, 0 failed.**

The distribution ZIP was extracted into a fresh clean-room directory and these same three suites were rerun against the packaged bytes with the same zero-failure result.

## Stabilization/regression coverage — 452 checks

Includes the iPhone Home Screen standalone viewport fix: full `100lvh` canvas, `navigator.standalone` fallback, and visual-viewport remeasurement.

Also covers same-route sheet scroll preservation, queued/coalesced Store renders, logging-modal scroll preservation, same-step onboarding scroll preservation, and the absence of browser-native hash-anchor/form-submit jump paths.

Coverage includes:

- Central Time evening/local-date rollover.
- calendar-real validation of imported/synced dates.
- v5-v9 → v10 migration, prior-key cleanup and secret migration.
- damaged-current-state fallback and unreadable-only blocking recovery mode.
- localStorage quota/save failure detection.
- transactional restore behavior and prior-state preservation on failed commit.
- prototype-pollution and unsafe store-path rejection.
- complete reset behavior including current/prior state, secrets and photo database wiring.
- immutable historical score basis after target/plan changes.
- recovery-day 10/10, calorie range and next-step regressions.
- expedition same-day baseline/double-count prevention.
- partner expedition schema/privacy contract and Store-level arrival guard.
- invitation revision changes for nudge/counter/acceptance.
- secret-safe backup state.
- personalized onboarding targets.
- starter-plan exact frequency and Sunday recovery.
- Claude-plan exact frequency, Sunday and 48-hour muscle validation.
- Steps/weight privacy payload behavior.
- rolling partner history.
- note retry/date/delivery-state behavior.
- completed-week, together-week, verse, Sabbath and calendar-contiguous achievement evidence.
- backup/restore, secret fields, explicit Back routing and photo IndexedDB wiring.
- every exercise media reference, every badge asset and every literal production asset reference.
- image signatures and animated-WebP structure.
- asset-size ceiling, service-worker strategy and shell-install safety.
- current Claude/GitHub configuration markers.
- JavaScript syntax for every production script.
- absence of production debugger/log/TODO leftovers and destructive demo actions.

## GitHub sync stress/reconciliation — 23 checks

The isolated sync harness covers:

- overnight note delivery and authored date.
- local acknowledgement only after successful GitHub write.
- no double-count on re-sending the same represented note.
- SHA conflict retry with a fresh GET/PUT cycle.
- overlapping push serialization.
- newest-state wins for queued writes.
- overlapping full-sync serialization.
- sanitized partner state/history merge.
- successful sync timestamp/error clearing.
- partner arrival advancing the matching local expedition safely.
- new-leg local step baseline protection.
- partner mileage accepted only for a matching route/leg.
- previous-leg contribution preserved in the arrival record.
- stale partner files unable to move a route backward or contaminate the current leg.
- failed download/error visibility and later recovery.
- verified private repository caching during the session.

## Screen and malformed-state smoke coverage — 50 checks

The VM-backed render suite exercises all major screen functions without runtime exceptions, including Home, Coach, Nutrition, Training, Together, Settings, Body, Photos, Capture, Records, Badges, Reflection, Trends, Planner, Cookbook, History, exercise detail, notifications and expedition handshake states.

It also renders realistic active/completed workout and expedition states, repeats the screen sweep after importing deliberately malformed planner/proposal/partner/day structures, and verifies the route-complete state does not render another `advance-leg` action.

## Final static integrity checks

The following checks were run before packaging and again after extracting the exact release ZIP:

- every production/test JavaScript file passes `node --check`;
- `manifest.webmanifest` parses as JSON;
- `styles.css` parses without parser errors;
- every production image decodes successfully;
- every exercise demonstration remains animated WebP;
- no zero-byte production file exists;
- no exact duplicate production asset hash remains;
- no stale backup/temp file is packaged;
- no production TODO/FIXME/debugger/console debug code remains;
- all literal `data-action` controls have an application handler;
- total optimized assets remain below the release ceiling.

Final clean-room static result: all production and test JavaScript parsed; the manifest and CSS parsed; **121/121 production images decoded**; **41/41 exercise WebPs remained animated**; there were no zero-byte files, duplicate production image hashes, packaged temp/backup files, stale release references, or production debug/TODO markers; assets remained **27.1 MiB**.

## Browser-environment limitation

The available execution environment blocks Chromium navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`, so this report does **not** claim a browser/iPhone interaction test that did not occur. VM screen rendering and static/runtime unit checks are useful, but they cannot reproduce Safari camera permissions, PWA lifecycle, actual IndexedDB persistence, network credentials or Home Screen update behavior.

## Required real two-iPhone acceptance gate

Use the exact packaged release on both devices and complete these checks before declaring deployment complete:

1. Install/update the PWA from the production URL on both phones and confirm Settings shows **Version 5.2.2**.
2. On both phones, fully close/reopen the PWA and confirm local logs persist.
3. Capture a progress photo and a meal photo; fully close/reopen; confirm both remain usable.
4. Connect both phones to the same dedicated private GitHub sync repository and complete **Sync now** in each direction.
5. Send a note Phone A → Phone B, then edit/send another while Phone A is offline; reconnect after midnight or after a delay and confirm the edited note arrives once with the correct date/status.
6. Confirm points, streak and allowed privacy totals travel both directions while disabled fields remain absent.
7. Turn Steps privacy off on one phone and confirm daily steps/leg mileage stop crossing while both phones still retain the same expedition route/leg identity.
8. Propose an expedition, nudge/counter if desired, accept it, and confirm the handshake state travels correctly both directions.
9. Advance one phone to the next expedition leg first; sync the other later; confirm both land on the same leg and old-leg miles do not appear on the new leg.
10. Complete the final leg of a test route/state and confirm the route remains complete with no repeated arrival button.
11. Change nutrition targets or replace the weekly training plan after a completed scored day; confirm the old day's points do not change.
12. Leave one phone unsynced for at least one logged day, then reconnect and confirm rolling partner history fills the missed day.
13. Test Coach, meal-photo analysis and plan generation with the real Claude key.
14. Create a backup containing logs, photographs and an active-session test if practical; restore it on a test install and confirm data/photos return while GitHub/Claude keys do not.
15. Deploy a harmless code/version change at the same URL and confirm the installed PWA updates without uninstall/reinstall.
16. Test airplane mode after content has been opened once: core screens should reopen from cache and local logging should remain usable, then sync after connectivity returns.

The code/static gate can pass without these external checks; the complete production gate cannot.

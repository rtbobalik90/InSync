# InSync 5.3.0 — Ship-Readiness Test Report

## Automated release result

The current release candidate passes all four automated suites:

```bash
node tests/stabilization-tests.js
# 469 passed, 0 failed

node tests/cloud-sync-tests.js
# 23 passed, 0 failed

node tests/screen-smoke-tests.js
# 54 passed, 0 failed

node tests/meal-planner-tests.js
# 11 passed, 0 failed
```

**557 total checks passed, 0 failed.**

A final exact-ZIP clean-room result is recorded at the bottom of this report after packaging.

## 5.3.0 regressions specifically covered

### Journey-start scoring

- A date before the user's actual InSync start date cannot earn recovery-day or any other points.
- The actual start day can still earn its legitimate recovery/session/health points.
- The 35-day sync history omits pre-start dates.
- Sync schema 5 carries the person's start date so the partner chart can blank those dates as well.
- Together's weekly bars and challenge total use that start boundary instead of manufacturing points for an unstarted week.

### Daily meal slots

- Nutrition permanently renders Breakfast, Lunch, Dinner and Snack.
- Each Add control carries its exact slot into the meal logger.
- Multiple meals may still exist within one slot.
- Imported/persisted meal-plan keys accept exactly those four meal slots.

### Weekly meal planner

- The planner renders seven real dates with four slots each: **28 slots**.
- A complete 28-slot Claude response is accepted; a 27-slot/incomplete response is rejected atomically so a partial AI response cannot wipe a good week.
- Generated recipes preserve nutrition, servings, prep time, ingredient amounts and cooking instructions.
- Planned meals open into a recipe-detail screen with Ingredients and Make it sections.
- Today's planned meal can be written into the daily meal log.
- The displayed week's shopping list derives from its ingredient lists.
- Week navigation and per-week clear/rebuild behavior are wired.

## Stabilization/regression coverage — 469 checks

The broader suite retains coverage for local-date rollover; v5-v9 → v10 migration; damaged-local-state recovery; storage failures; transactional backup/restore; prototype-pollution rejection; immutable historical score snapshots; correct recovery-day/calorie/step/weigh-in scoring; expedition baseline and double-count prevention; privacy payloads; invitation revisions; badge evidence; rolling Together conversations; automatic visible-app sync; scroll preservation; iPhone standalone viewport behavior; service-worker safety; asset references/signatures; all exercise animations; production JavaScript syntax; and the absence of destructive demo/debug paths.

## GitHub sync stress/reconciliation — 23 checks

The isolated sync harness covers overnight delivery, authored dates, acknowledgement only after successful writes, deduplication, SHA conflict retry, overlapping push/full-sync serialization, newest-state wins, partner history sanitation, expedition leg reconciliation, stale-file protection, error visibility/recovery, and private-repository verification caching.

## Screen and malformed-state smoke coverage — 54 checks

The VM render suite exercises all major screen functions and malformed-state variants without runtime exceptions. 5.3.0 adds explicit Nutrition four-slot rendering, the 28-slot weekly planner, and planned-recipe detail routes to the screen gate.

## Dedicated meal-planner suite — 11 checks

The planner harness validates a complete mocked 28-meal Claude result, exact dated key coverage, Breakfast/Snack presence, recipe steps, ingredient amounts, coach source tagging, atomic rejection of incomplete weeks, four-slot persistence, planner UI slot definitions, recipe-detail rendering, and generation/logging action wiring.

## Final static integrity gate

Before release, and again after extracting the final distribution ZIP, verify:

- every production/test JavaScript file passes `node --check`;
- `manifest.webmanifest` parses as JSON;
- CSS has balanced syntax/no parser failure in the release checks;
- every production image has a valid non-empty image header and every exercise demo remains animated WebP;
- no zero-byte production file, packaged temp/backup file, destructive seed action, production debugger/console/TODO marker, or duplicate production image hash remains;
- all literal `data-action` controls have an application handler;
- optimized assets remain under the release ceiling.

## Browser-environment limitation

The available execution environment does not reproduce Safari/iOS Home Screen behavior, real camera permission prompts, real IndexedDB lifecycle, or live GitHub/Claude credentials. Automated VM/static gates are strong code checks but are not a substitute for the final two-iPhone acceptance test.

## Required real two-iPhone acceptance gate

1. Install/update the exact release on both phones and confirm Settings shows **Version 5.3.0**.
2. Close/reopen each PWA and confirm local logs persist.
3. On a brand-new/current-start profile, open Together and confirm no weekly points appear before the profile's real start date. Today may show only the points actually earned today.
4. On Nutrition, confirm Breakfast, Lunch, Dinner and Snack all appear; log one entry from each slot and verify it lands in the correct slot.
5. Open Meal Planner on both current and next week. Confirm seven dates × four slots render and week navigation does not overwrite another week.
6. With the real Claude key, tap **Build my week**. Confirm all 28 slots fill, several planned meals open into full recipes, and the shopping list populates from ingredients.
7. On a meal planned for today, tap **Log this meal today** and verify its nutrition is added to the correct daily slot.
8. Connect both phones to the same dedicated private GitHub sync repository and complete the initial Sync now in each direction.
9. Send Together messages both directions; confirm send clears the composer, messages appear in-thread, and automatic foreground/visible-app sync receives the reply without routine Settings refreshes.
10. Confirm points, streak, allowed privacy totals and start-date history travel both directions while disabled fields remain absent.
11. Turn Steps privacy off on one phone and confirm daily steps/leg mileage stop crossing while route/leg identity remains aligned.
12. Exercise expedition proposal/counter/nudge/acceptance and asynchronous leg advancement on the two devices.
13. Capture progress/meal photos, restart the PWA and verify media persists.
14. Create and restore a backup containing logs/photos; confirm data returns while GitHub/Claude secrets are excluded.
15. Test Coach, meal-photo analysis and training-plan generation with the real Claude key.
16. Test airplane mode after the core app has been loaded, then reconnect and verify automatic sync catches up.
17. Deploy a harmless later version at the same URL and verify the installed PWA updates without uninstall/reinstall.

The code/static gate may pass before these service/hardware checks; complete production certification still requires them.

## Exact packaged-ZIP clean-room result

**PASS.** The release archive was built, extracted into a fresh directory, and all four suites plus JavaScript/manifest/zero-byte static checks passed against the extracted bytes. The final archive is repackaged after this status update and rerun once more before handoff.

# InSync 5.5.6 — Code Review

## Scope

This was a full second-user code audit, not a planner-only patch. The review traced state normalization and migration, owner/partner identity, two-phone sync direction, privacy boundaries, backup/restore, onboarding targets, units, Coach persistence, weekly chapters, meal generation, future training, Settings preference changes, Daily Walk coexistence and all exported screens.

## Canonical storage contract

InSync intentionally keeps stable internal units:

- weight / lifted load: pounds;
- distance: miles;
- energy: kilocalories.

User-facing input/output is converted at the boundary. 5.5.6 closes legacy paths that previously displayed or stored selected kg/kJ values as if they were canonical lb/kcal. Distance and climb output likewise go through the selected-unit formatters.

This approach avoids rewriting historical records when the user changes units and prevents cumulative rounding drift.

## State normalization fixes

The v10 state contract now explicitly normalizes `profile.startWeight`, `coachPending`, `chapters`, chosen-verse cache shape, profile sex and every previously supported goal including `strong`.

`coachPending` is intentionally reset on load/import because an in-flight browser request cannot survive a killed/suspended PWA. Weekly chapters are canonicalized to Monday calendar weeks and deduplicated by week.

No local key/schema bump is required: the v10 merger supplies new defaults and the existing normalization/migration pass safely repairs older shapes in memory before the next save.

## Future-week correctness

Readiness is semantic rather than metadata-based. Meals must have all exact date/slot combinations plus usable grocery ingredients and instructions. Training must contain real exercise IDs, obey current exclusions, match the selected lifting frequency and satisfy recovery rules.

A future plan can activate only when `futurePlanMeta.weekOf` exactly equals the current Monday. Expired plans are cleared. Meal setup persists each validated batch as it finishes, making retry genuinely resumable within the meal half rather than only between meals and training.

Goal/frequency changes are now atomic Store operations. They leave the current plan alone, clear staged training generated under the old preference and remove the stale next-week lifting goal so the next setup regenerates consistently.

## Identity and restore safety

Owner and partner names are not merely labels; their normalized identity keys determine private sync filenames.

- Partner identity changes clear partner-derived caches.
- Material owner renames clear stale sync-health success state.
- Connected Settings warns before a material owner rename.
- Restore refuses a different-owner backup over an active onboarded device and refuses an ownerless backup marked onboarded.

This prevents a particularly dangerous two-phone failure mode where Lizzie's phone could retain Lizzie's local GitHub token/repository settings while importing Robert's owner identity and then begin writing the same sync filename as Robert's phone.

## Privacy review

The partner payload remains schema 6. Full meal plans, meal preferences, exact foods, exact lifted weights, photographs and exact bodyweight remain local. Optional calories/protein, workouts and steps follow their privacy switches; turning steps off also withholds shared expedition mileage. The deep pair test runs both device directions to prevent one-sided privacy assumptions.

## Remaining architectural debt

The app is still a dependency-free browser PWA with large domain modules. Direct browser-held API credentials remain a deliberate private-app tradeoff. A future major refactor could split planning, sync and Store normalization into smaller modules, but this audit intentionally avoided a broad rewrite that would increase regression risk while repairing production behavior.

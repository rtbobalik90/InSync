# InSync 5.5.2

InSync is a private, local-first two-person health and fitness PWA. Daily nutrition, training, body tracking, faith/reflection, progression, photos, goals and history live primarily on each phone. A small privacy-controlled subset is exchanged through a dedicated private GitHub repository so Together, expeditions, chat and reactions can work across two devices.

## Core navigation

- **Home** — daily score, next step, Coach observations, weekly goals/review and expedition status.
- **Journey** — expedition selection and leg progress.
- **Train** — Monday–Sunday training week, sessions, progression, substitutions and records.
- **Nutrition** — Breakfast/Lunch/Dinner/Snack logging, weekly meal planning, recipes, favorites, preferences and shopping list.
- **Together** — shared expedition, weekly points, conversation and lightweight reactions.
- **Coach** — grounded coaching and Claude conversation using the same local log.

## The weekly rhythm

### Weekly Review
On Sunday evening/night, or afterward, InSync can review the completed/current closing week. It uses only evidence present in the log: points, workouts, logged nutrition, steps, weight direction, expedition miles, newly recorded badges and favorites added that week.

The review can then **Set up my next week**:
1. Build a complete 7-day × 4-slot meal week.
2. Stage the next training week without replacing the current one early.
3. Create exactly two measurable personal goals.

When the new Monday arrives, the staged training week promotes automatically.

### Meal prep
Meal Planner supports:
- four daily slots: Breakfast, Lunch, Dinner and Snack;
- cuisine and protein selection;
- like/avoid keyword memory;
- home-cooked-only generation;
- recipe ingredients, method, servings, prep time and nutrition;
- favorite recipe memory;
- thumbs-down exclusion with an **allow again** control;
- finished-plate photos stored locally in IndexedDB;
- batch-prep lunches;
- dinner leftovers on selected cook nights;
- a shopping list derived from the displayed week's actual grocery-bearing recipes.

### Workout walk
Every active lifting session now opens with a dedicated **Workout walk** block above the exercise list. The walk clock is independent of the overall session clock: Start begins from a persisted timestamp, Stop freezes the elapsed walk, and Resume continues from the accumulated time. Locking the phone, switching InSync screens, or a same-screen render does not reset the walk.

After Stop, the user can record flexible **Pace / speed** text (for example `16:00 /mi` or `3.5 mph`) and **Elevation / incline** text (for example `5% incline` or `300 ft`). Completed walk time and those details are stored with the workout and appear in the session-complete and training-history views. Finishing a workout never silently stops a live walk; the user must stop it first so the stored duration remains intentional.

### Training progression
Training derives the next cue from real exercise history. Depending on the record it can recommend holding the load, adding a clean rep, repeating the top of the range, or adding a conservative 5 lb after the top has been achieved twice.

Before sets are logged, an exercise can be swapped. Occupancy swaps are temporary; discomfort/dislike swaps are remembered so future Coach plans avoid those movements. The Training page lets the user allow a remembered movement again.

## History and calendar

The calendar shows actual activity by date and never invents pre-install history. Opening a day can show:
- daily score and score components;
- meals/macros;
- workout detail;
- steps and derived trail distance;
- weight/body metrics;
- verse/reflection;
- progress-photo evidence.

## Coach memory

Coach patterns are derived, not guessed. Current rules can notice repeated protein misses, repeated step gaps, training consistency/attention, meaningful weight movement and accumulated meal dislikes. These facts are also supplied to Claude when AI coaching is enabled.

## Together and reactions

Together includes the rolling two-person conversation plus a bounded shared activity feed. A 10/10 day may appear automatically; workout, protein and step activity appears only when the corresponding privacy switch permits it. Partner activity can receive ❤️, 👏 or 🔥 reactions.

## Dedicated private sync repository

Use a second GitHub repository only for sync data. Do **not** put the app files in it.

Recommended repository:
- private;
- initialized with a README so `main` exists;
- GitHub Pages disabled.

Both phones use the same repository, for example:

`rtbobalik90/insync-sync`

Each phone should use its own fine-grained token limited to that repository with **Contents: Read and write**. Metadata read access may be automatically present. The app repository and sync-data repository must remain separate.

InSync writes each person's small JSON sync record and reads the partner's. The private payload can contain points/streak/badges, chat, expedition state, bounded history, shared activity/reactions, acknowledgement timestamps, and optional privacy-controlled health summaries. It is not a full backup.

### Automatic sync behavior

A meaningful local change schedules a push. The app also pulls when it launches/returns to the foreground/reconnects, when Together is opened, and periodically while the PWA is visible. iOS may suspend JavaScript while the app is fully backgrounded; it catches up when the app resumes.

**Sync Now** is a force/troubleshooting control, not a normal daily requirement.

### Sync Health
Settings reports last successful exchange, failures, partner update freshness and whether the partner has acknowledged the version of your data it received.

## Backups

Use **Create Backup** for the complete personal backup. Backups include application state and local photos but intentionally exclude GitHub and Claude secret keys. Restore is preflighted and transactional; damaged local bytes are protected by recovery mode rather than overwritten as a blank install.

## PWA updates



## Notification bell states

The header bell is neutral when nothing new is waiting, gold with a dot for unread informational activity, and gold with a numbered badge/glow when one or more items require action. Opening Notifications acknowledges informational items; unresolved actions remain counted until the underlying invitation, note, or coach proposal is handled.

Version 5.5.2 uses service-worker cache `insync-v10-11`. An update can download while the app is running, but reload waits for a safe Home/Settings moment so an active workout, modal or edit is not interrupted.

## Version matrix

- App/UI: **5.5.2**
- Local state: **v10**
- Partner sync: **schema 6**
- Service worker: **insync-v10-11**

See `TEST_REPORT.md`, `CODE_REVIEW.md` and `RELEASE_NOTES.md` for the release gate and detailed changes.

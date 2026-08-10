# InSync 5.5.4

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
1. Build and immediately save a complete 7-day × 4-slot meal week.
2. Write exactly the selected number of **lifting** days; the daily walk never consumes a gym day.
3. Stage future training without replacing the active week early.
4. Create exactly two measurable personal goals.

Setup is resumable. If meals finish but training fails validation or the network/API call fails, the 28 meals stay saved; the next tap retries only training. Training receives one automatic repair pass when Claude returns malformed JSON, an invented exercise, a walk/cardio placeholder, or an unsafe recovery layout. The readiness check verifies real meal slots and real plan rows rather than trusting stale metadata. When the new Monday arrives, the staged training week promotes automatically, including while the PWA remains open across the week boundary.

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

### Daily walk timer
Training opens with a dedicated **Walk timer** on every current day, including lifting days, dedicated walk days and recovery/rest days. The same clock also appears above the exercise list during an active lift. Start begins from a persisted timestamp, Stop freezes elapsed time, and Resume continues from the accumulated duration. Locking the phone, switching InSync screens, completing the lifting portion, or a same-screen render does not reset or stop the walk.

After Stop, the user can record flexible **Pace / speed** text (for example `16:00 /mi` or `3.5 mph`) and **Elevation / incline** text (for example `5% incline` or `300 ft`). The walk is stored on that calendar day and appears in Training/history independently of whether a workout was completed. Past days offer a manual duration/pace/elevation correction instead of a live timer; future dates cannot start one early.

### Training progression
Training derives the next cue from real exercise history. Depending on the record it can recommend holding the load, adding a clean rep, repeating the top of the range, or adding a conservative 5 lb after the top has been achieved twice.

Before sets are logged, an exercise can be swapped. Occupancy swaps are temporary; discomfort/dislike swaps are remembered so future Coach plans avoid those movements. The Training page lets the user allow a remembered movement again.

### Train landing screen
The Train landing view intentionally keeps the expedition/training artwork visible longer, uses a compact daily Walk timer near the top, and places **This week** directly beneath it so the current Monday–Sunday plan is visible in the opening phoneful. If next week has already been staged, a separate **Next week — Ready** strip previews those seven days without activating them early.

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

Version 5.5.4 uses service-worker cache `insync-v10-13`. An update can download while the app is running, but reload waits for a safe Home/Settings moment so an active workout, modal or edit is not interrupted.

## Version matrix

- App/UI: **5.5.4**
- Local state: **v10**
- Partner sync: **schema 6**
- Service worker: **insync-v10-13**

See `TEST_REPORT.md`, `CODE_REVIEW.md` and `RELEASE_NOTES.md` for the release gate and detailed changes.

## Daily walk timer

The Training walk timer belongs to the calendar day, not to a lifting session. It is available on lift days, walk days and recovery/rest days, and it remains available after the lifting portion is marked complete. Start/Stop uses a persisted wall-clock timestamp, so locking the iPhone or moving between InSync screens does not reset elapsed time. Pace/speed and elevation/incline can be saved after stopping. Past days are never allowed to run a live timer; they offer a manual duration/pace/elevation correction instead. Existing 5.5.1/5.5.2 workout-owned walk records migrate into the corresponding day record.


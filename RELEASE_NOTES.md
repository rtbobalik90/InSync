# InSync 5.5.2 — Notification Visibility

InSync 5.5.2 builds on 5.5.0, which completes the core weekly operating loop around the existing daily tracker, nutrition planner, training system, Together expedition and private two-phone sync.

## Added in 5.5.2 — notification visibility

- Bell now has three explicit states: neutral when quiet, gold with a dot for unread informational activity, and gold with a numbered badge/glow when something requires action.
- Opening Notifications acknowledges informational items so the gold dot clears after they have been seen.
- Action-required items are not cleared merely by opening Notifications; their numbered badge remains until the invitation, partner note, or coach proposal is actually handled.
- Informational read-state is persisted locally with stable notification ids and bounded to the most recent 200 items.
- Notification controls include accessible labels describing whether activity or required actions are waiting.


## Carried forward from 5.5.1

### Persistent Workout Walk
- Every active lifting session now places a **Workout walk** card above the movement list.
- **Start walk** uses a persisted wall-clock timestamp rather than an in-memory counter, so screen renders, phone locking and PWA suspension do not reset elapsed time.
- **Stop walk** freezes the accumulated time. **Resume walk** continues from that exact duration.
- After stopping, the user can save **Pace / speed** and **Elevation / incline** using the notation that matches the treadmill or outdoor walk.
- A live walk cannot be silently ended by **Finish session**; the app requires an explicit Stop first.
- Completed walk duration, pace/speed and elevation/incline are stored inside that workout and surface on Session Complete and historical Training views.
- **Reset walk** intentionally clears only the walk portion of the current workout.
- Live/imported walk fields are bounded and normalized alongside the rest of the local-first Store.

## Added in 5.5.0

### Weekly Review + next-week setup
- A grounded weekly review becomes available Sunday evening/night and remains available the following week.
- The review summarizes points, training, nutrition, steps, weight trend, expedition miles, favorites and newly recorded badges from the actual logged week.
- Claude can turn those facts into a concise review without inventing measurements that are not in the log.
- **Set up my next week** stages the next training week, builds the next 28-slot meal week and creates exactly two measurable personal goals.
- Future training is staged separately and activates when its Monday arrives; planning next week cannot overwrite the current training week.

### Meal-prep planning
- Weekly generation supports batch-prep lunches from 2–5 weekdays.
- Dinner-leftover mode cooks on selected nights and plans reheats between them. Monday is always a real fresh cook night when leftovers are enabled.
- Grocery-bearing source meals are distinguished from leftovers so the shopping list does not purchase the same batch repeatedly.
- Favorites, cuisine/protein choices, like/avoid keywords and thumbs-down history still shape generation.
- Meal dislikes can now be reviewed and explicitly **allowed again**.

### Training progression + substitutions
- Each movement can surface a factual next-session cue from actual lift history: start controlled, add a rep, repeat the top of the range, or add a conservative 5 lb after owning the top twice.
- During an active session, an unlogged movement can be swapped for a same-group alternative.
- **Machine occupied** is session-only. **Does not feel right** and **I do not like this movement** are remembered for future coach plans.
- Remembered movement exclusions can be reviewed on Training and explicitly allowed again.
- The weekly Training strip is the real Monday–Sunday week. Scheduled walks complete from their step requirement rather than fake workout records.

### History + calendar
- History now includes a true month calendar and complete date detail.
- A day can show score, meals/macros, workouts, steps, trail distance, body metrics, verse/reflection and progress-photo evidence.
- Calendar markers identify nutrition, training, reflection, body/weight and photo activity.

### Proactive Coach memory
- The Coach can notice repeated protein gaps, repeated step misses, training consistency/attention, meaningful weight direction and accumulated meal dislikes.
- Those same grounded observations are included in Claude coach context, so proactive copy and conversational answers use the same evidence.

### Sync Health
- Settings now reports connection state, last successful exchange, partner update recency, acknowledgement of the data the partner has received, app version and update status.
- A failed sync surfaces as a visible health problem instead of silently looking current.
- Partner activity, reactions and acknowledgement timestamps are sanitized before they can enter local state.

### Together reactions
- The shared activity layer can surface 10/10 days and, when the matching privacy permission is enabled, workouts, protein-target days and step-target days.
- Partner activity can receive ❤️, 👏 or 🔥.
- Reactions synchronize through the same dedicated private GitHub repository and can be toggled off.

## Reliability and data-integrity hardening
- State normalization now rejects malformed activity IDs, reaction keys and invalid partner update timestamps even when they arrive through a hand-edited backup.
- Service-worker updates wait for a safe Home/Settings moment rather than reloading over an active workout, modal or edit.
- Learned meal and movement exclusions are reversible.
- The existing local-date boundary, historical score snapshots, private sync, rolling chat, expedition leg reconciliation, backups/restores, IndexedDB photo storage and iPhone viewport/scroll corrections remain intact.

## Version matrix
- App/UI: **5.5.2**
- Local state schema: **v10** (`insync.v10`)
- Partner sync schema: **6**
- Service-worker cache: **insync-v10-11**

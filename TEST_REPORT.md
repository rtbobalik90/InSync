# InSync 6.0.0-p6.2 — Test Report

## Result
- Full deterministic repository suite: **1,868 PASS assertions / 0 failures** across **29 test files**.
- Dedicated P6.2 Notes from the Trail suite: **30 PASS / 0 failures**.

## P6.2 coverage
- First Trail Notes build exposes six concise historical milestone entries.
- Unseen notes stack locally.
- Individual clear leaves other notes unread.
- Clear All clears the current unread queue.
- Read state is local and persistent.
- Story cache is keyed to the exact unread ID set and invalidates when that set changes.
- Offline fallback is deterministic.
- Detailed journal distinguishes New and Read entries.
- Popup exposes Close, Clear All and View Trail Notes.
- Close is session-only and does not clear note state.
- Settings preserves a permanent Trail Notes entry after popup clearance.
- AI prompt has no personal-context allow-list and receives exact release facts only.
- Trail Notes state is absent from partner-sync code.
- New module is loaded by the app and cached by the service worker.
- Runtime/cache identity is P6.2 / `insync-v10-35`.

## Regression coverage
All prior deterministic suites pass, including cloud sync, Together/Campfire, Journey checkpoints, Grand Canyon artwork, Train 2.0, Nutrition 2.0, historical editing, barcode fallback, Faith parked state, screen smoke and production integrity.

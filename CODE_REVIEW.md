# InSync 6.0.0-p5.5 — Code Review

## Review focus
This pass intentionally changed presentation and information architecture without changing the persisted local-state or partner-sync schema.

### Visual scrims
`ui.js` now owns `SCRIMS.light`, `SCRIMS.medium`, and `SCRIMS.heavy`. Screens choose the appropriate preset rather than carrying unrelated one-off gradients. Train retains the strongest treatment; scenic surfaces use lighter treatments.

### Train architecture
The main `train()` screen contains no live readiness or walk controls. `trainDay()` owns those day-specific controls. Weekly navigation is hash-based (`#train/week/YYYY-MM-DD`) and therefore requires no new persistent UI state. Past weeks derive labels from recorded workouts/frozen score basis rather than projecting the current plan backward.

### Morning completion
`setMorning()` records `morningCheckInAt`, and normalization validates it. Home also treats existing current-day weight/sleep/resting-HR data as an already-completed morning so P5.4 users are not re-prompted after upgrade.

### Privacy / sync
No new health fields are added to partner sync. `morningCheckInAt` is local day state only. Partner sync remains schema 7.

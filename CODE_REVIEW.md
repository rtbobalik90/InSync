# InSync 5.2.3 — Ship-Readiness Review

## Verdict

**Code/static release gate: PASS.**

The third audit treated the exact release candidate as a production two-phone PWA rather than as a feature-complete prototype. It found several edge cases that were not covered by the earlier green suites, corrected them, and added permanent regression coverage.

There is no current finding that justifies an architectural rewrite before deployment. The remaining release gate is real-device acceptance on the two iPhones with the actual GitHub repository, Claude credentials, camera, Safari/PWA lifecycle and offline behavior.

## Material third-pass corrections

### Historical scores are now immutable

Previously, old days could be recomputed using today's targets or a newly generated weekly training plan. A day that was legitimately 10/10 could therefore change later and alter a completed weekly challenge.

Each meaningful day now stores a bounded `scoreBasis` containing the targets and training requirement in force for that day. Historical points and completed-week calculations read that snapshot.

### Restore and damaged-local-data handling are transactional

Restore normalization now happens in memory before the one durable localStorage commit. A failed state commit leaves the prior saved state intact, and photograph restore rolls back to the prior IndexedDB media set if the state restore fails.

If current localStorage is unreadable, InSync either recovers a readable older application copy or blocks ordinary writes and offers the damaged raw bytes for download. It does not silently treat damaged data as a new install.

### Date validation is calendar-real, not regex-only

Phone-local dates remain the source of truth. Imported and synced date keys must now also represent an actual calendar day, preventing strings such as `2026-02-31` from entering state simply because they match `YYYY-MM-DD`.

### Sync is serialized and conflict-aware

GitHub repository writes and full sync rounds are explicitly serialized. A 409/422 content conflict refreshes the remote SHA and retries once. Network calls have bounded timeouts, failures are visible in Settings, and recovery clears stale failure state.

### Notes survive offline retries and midnight

The latest partner note carries its authored date and remains representable after midnight. Successful GitHub write acknowledgement is the single source of truth for `notesSent`, whether delivery came from a manual send, automatic retry or later full sync.

Editing an already-sent note clears its old sent timestamp immediately so new offline text cannot falsely look delivered. Home shows an unread partner note as news once rather than repeating an old note every day; Together can still display the latest note intentionally.

### Expedition state is reconciled by route and leg

The shared expedition/Together payload now uses sync schema 4 and identifies route/leg state. This fixes a two-phone failure where the lagging phone's previous-leg mileage could be interpreted as mileage on the already-advanced phone's new leg.

Partner progress only contributes to the matching current leg. A partner may safely pull the other phone forward on the same route, stale files cannot move a route backward, and previous-leg contribution is preserved only for the arrival it belongs to.

The route-complete UI now has a real terminal state. The Store also refuses duplicate completion or premature arrival unless distance and both-walker requirements are actually met.

### Achievement evidence uses calendar continuity

Several achievements previously used evidence that looked plausible but could bridge missing days or weeks. Third-pass corrections include:

- First Step requires an actual logged action, not merely opening a screen.
- Clean Week requires consecutive calendar days rather than seven qualifying records with gaps.
- Dawn Riser cannot bridge skipped mornings.
- Twelve Weeks requires weigh-ins across twelve distinct weeks rather than only enough elapsed time between first and last entries.

Earlier stabilization corrections to verse reading, notes, Sabbath, completed weekly challenges and both-person logging remain covered.

### Claude contract updated without breaking compact responses

The default model is `claude-sonnet-5`, while the model ID remains editable in Settings. Sonnet 5 thinking is disabled for InSync's deliberately compact UI/JSON calls so reasoning tokens do not consume response budgets intended for the returned content.

### Service-worker runtime writes are non-fatal

The shell remains atomic, code remains network-first, and artwork remains stale-while-revalidate. Runtime cache write/quota rejection is now swallowed after a successful network response so a full cache cannot turn a successful request into an application error.

## Security and privacy boundary

- Secrets remain outside normal application state and backups.
- Prototype-pollution keys are rejected on import and generic state paths.
- Partner files are treated as external input and normalized before reaching screens or scoring.
- Exact bodyweight, meals, lifting details, reflections and photographs do not enter partner sync.
- Core Together state includes expedition route/leg identity; expedition mileage obeys the Steps privacy switch.
- The sync repository must be private and separate from the application deployment repository.
- Browser Content Security Policy restricts scripts, connections, images, fonts, objects and form actions to the services/features InSync actually uses.

## Maintainability assessment

The framework-free module architecture is appropriate for a private two-person PWA. `screens.js`, `store.js`, `cloud.js`, `log.js` and `app.js` are large, but restructuring them immediately before real-device acceptance would add regression risk without improving release safety.

For the next major feature cycle, extract domain modules (Training, Nutrition, Together, Settings), sync transport/reconciliation, and persistence/migrations behind the existing regression suite. That is future maintainability work, not a 5.2.3 release blocker.

## Release gate

- Code/static gate: **PASS**
- Exact packaged ZIP clean-room gate: **PASS** — the distribution archive was extracted fresh and reran the full automated/static gate with zero failures
- Real two-iPhone hardware/service gate: **PENDING** until the checklist in `TEST_REPORT.md` is completed
## 5.2.3 Together conversation follow-up

The former single-note mailbox has been replaced with a rolling two-person conversation. Each phone owns only the messages it authored, publishes the latest 50 in its private sync file, and reads the partner's authored list. This avoids cross-device message-write conflicts because neither phone edits the other phone's history.

Sending commits the message locally, immediately clears the composer, displays the message in the thread, and marks it `waiting to sync` until the GitHub write succeeds. A successful write acknowledges each included pending message exactly once. Partner message arrays are sanitized before entering local state, while the previous single-note fields remain for one-release compatibility with a 5.2.2 partner.

While InSync is visible it now schedules an automatic sync check every 60 seconds, in addition to launch, foreground, reconnect, and state-change triggers. iOS may suspend a Home Screen PWA in the background; when it resumes, InSync immediately catches up. Manual **Sync now** remains a diagnostic/recovery control, not a normal-use requirement.

## 5.2.3 navigation stability follow-up

A real iPhone interaction report exposed a UI issue the VM screen suite could not reproduce: synchronous Store renders replaced the active `.sheet` DOM and reset Safari scroll to zero on same-screen actions. The router now preserves scroll on exact-route refreshes and queues/coalesces Store-driven renders. Logging modals preserve their own scroll on same-kind repaints and no longer autofocus their first field after every repaint. Onboarding also preserves scroll when validation or a selection repaints the same step. New static regression checks cover these paths.


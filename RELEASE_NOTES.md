# InSync 5.2.2 — Scroll Stability Hotfix

## What changed

- Fixed same-screen controls jumping the user back to the top of long pages after a Store save. InSync now preserves the current `.sheet` scroll position when the exact same route re-renders.
- Real route changes still open as new screens; scroll preservation is intentionally limited to same-route state refreshes.
- Store-driven renders are queued and coalesced instead of synchronously replacing the DOM from inside a click handler. This prevents a tap from destroying the control that is still handling it and reduces duplicate render churn.
- Delegated app controls now prevent browser default navigation/submission behavior defensively.
- Service-worker cache advanced to `insync-v10-3` so installed iPhones receive the corrected `app.js`.

## Verification added

The release suite now explicitly checks that the app contains no hash-anchor controls or forms capable of browser-native top jumps, that same-route scroll restoration is wired, and that Store renders are queued rather than performed re-entrantly.

## Previous 5.2.1 viewport fix retained

## iPhone Home Screen viewport fix

- Standalone iOS now uses the full large viewport rather than the smaller dynamic viewport that could leave a dark band below the bottom navigation.
- Added an iOS `navigator.standalone` fallback so the full-height rule applies even if the display-mode media query is late during launch.
- Re-measures the sheet resting position when the visual viewport changes so the home ledger stays attached to the navigation fold.
- Service-worker cache advanced to `insync-v10-2` so the corrected CSS is picked up cleanly on existing installs.

This is the third production-hardening release and replaces the prior 5.1.1 candidate.

## Data integrity

- State schema advanced to **v10** while preserving migration from v5-v9 installs.
- Historical daily scoring now freezes the targets and training requirement in effect on each meaningful logged day.
- Target changes and newly generated weekly plans no longer rewrite old scores or completed weekly challenge results.
- Backup now retains an active workout session as part of complete application state.
- Restore normalization/commit is transactional, with photograph rollback if state restore fails.
- Corrupted newest local data can recover from an older readable InSync copy.
- Unreadable-only local data enters a blocking recovery mode that preserves the damaged bytes instead of overwriting them.
- Calendar validation rejects impossible dates, not just malformed date strings.

## Two-phone sync

- Partner sync schema advanced to **3**.
- GitHub pushes and full sync rounds are serialized to prevent overlapping repository writes.
- 409/422 SHA conflicts retry against a fresh repository read.
- GitHub calls have bounded timeouts and failures remain visible until a later successful sync.
- Offline notes persist across midnight with their authored date.
- Notes are counted as sent only after the shared GitHub write succeeds; automatic retry and manual send use the same acknowledgement path.
- Editing a previously sent note immediately returns it to an unsent state until the edited text is confirmed remotely.
- Partner files are normalized and identity-checked before state reconciliation.
- Expedition payloads carry route/leg identity so stale previous-leg mileage cannot contaminate a new leg.
- A phone that learns its partner has advanced the same route safely follows the monotonic leg index without double-counting local steps.
- Stale partner files cannot move expedition progress backward.

## Expedition completion

- Completed routes now render a real terminal state instead of resolving `leg()` back to the final leg.
- A completed route cannot expose or process another arrival.
- The Store independently enforces both arrival conditions: total distance reached and each person contributing at least one fifth.
- The arrival action routes to the arrival screen only after the Store confirms a valid advance.

## Achievements

- First Step now requires actual logged activity.
- Clean Week requires consecutive calendar days.
- Dawn Riser requires uninterrupted qualifying mornings.
- Twelve Weeks requires weigh-ins across twelve distinct weeks.
- Existing fixes for verse-reading, note-sending, completed-week, both-logged, Sabbath and historical milestone evidence remain in place.

## AI and networking

- Default Claude model updated to `claude-sonnet-5`; the Settings model field remains editable.
- Thinking is disabled for Sonnet 5 in InSync's compact-response calls so the existing short UI/JSON output budgets remain stable.
- Claude requests time out rather than hanging indefinitely.
- GitHub Contents requests use the API version pinned for this release.
- Service-worker runtime cache writes are non-fatal if browser cache storage is full.

## Privacy and disclosure

- Settings now explicitly states that expedition route/leg is core Together state shared between the two phones.
- Steps privacy still controls current/previous-leg mileage and daily step totals.
- Exact bodyweight, exact meals, lifted weights/reps, reflections and photographs never enter partner sync.
- Claude feature text explains that request-relevant facts/photo data are sent to Anthropic only when those features are invoked.

## Prior stabilization retained

5.2.1 also includes all earlier repairs: phone-local dates, safe migrations, storage-error reporting, secret separation, complete media backup/restore, dedicated-private-repository enforcement, rolling partner history, automatic sync, correct calorie/rest-day scoring, personalized onboarding, AI-plan validation, IndexedDB meal photos, notification switches, explicit Back routing, CSP/no-referrer policy, optimized WebP assets, atomic service-worker shell install, image-integrity tests, complete reset, prototype-pollution protection and removal of destructive demo/debug code.

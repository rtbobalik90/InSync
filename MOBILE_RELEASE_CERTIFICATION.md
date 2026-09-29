# InSync Mobile Release Certification

**Target build:** InSync `6.0.0-p6.2`  
**Local store:** `insync.v10`  
**Partner sync:** schema `8`  
**Service-worker cache:** `insync-v10-38`  
**Status:** Execution plan only. No real-device test in this document is marked as run.

This is the release gate for the two daily-use installations owned by Robert and Lizzie. Repository tests are a prerequisite, but they do not replace this matrix. The release is certified only after the required checks below have evidence from real iPhones.

## 1. Certification lanes

| Lane | Owner | Device and OS to record before execution | Installation | Purpose |
|---|---|---|---|---|
| `R-DAILY` | Robert | iPhone model: ____ / iOS: ____ / free storage: ____ | Existing Home Screen app | Upgrade, retained data, daily workflows, privacy, recovery |
| `L-DAILY` | Lizzie | iPhone model: ____ / iOS: ____ / free storage: ____ | Existing Home Screen app | Upgrade, retained data, daily workflows, privacy, recovery |
| `R-FRESH` | Robert | `R-DAILY` or a second real iPhone: ____ | Fresh install from an isolated test origin | First use, onboarding, installability, permissions |
| `L-FRESH` | Lizzie | `L-DAILY` or a second real iPhone: ____ | Fresh install from an isolated test origin | First use, onboarding, installability, permissions |
| `SMALL` | Robert or Lizzie | Smallest supported real iPhone: ____ / iOS: ____ | Fresh test install | Small-screen layout and accessibility |
| `PAIR` | Both | `R-DAILY` + `L-DAILY` | Existing upgraded apps | Bidirectional pairing, privacy, conflict and retry checks |

The `SMALL` lane should use an iPhone SE-class screen, preferably 375 × 667 points. If InSync intends to support a 320 × 568 point iPhone, that size also requires a real-device pass. Responsive browser emulation may be used for diagnosis, but it does not certify this gate.

Fresh-install testing must use a different origin from the live app, not merely a different path on the same host. Browser storage is origin-scoped. The fresh lane must also use a dedicated private test sync repository, separate from both the published app repository and live sync repository.

## 2. Controlled test data and safety rules

Before any live-phone upgrade or recovery test:

1. On each daily phone, open Settings and create a backup. Confirm the `.json` file exists in Files and has non-zero size.
2. Copy both backups to a second safe location. Name them `robert-pre-p62-YYYY-MM-DD.json` and `lizzie-pre-p62-YYYY-MM-DD.json`.
3. Record each app version, last successful sync time, visible current-day totals, photo count, active expedition/leg, unread Trail Notes count, and active timer state.
4. Do not use **Start over** on either daily phone. Reset tests belong only on a fresh-lane installation.
5. Never paste a GitHub or Claude token into screenshots, videos, issue text, or this document. Blur repository names if they identify a private account.
6. Do not switch owner names on an active paired phone. Identity rejection is tested only with a test backup or fresh lane.

Use synthetic entries so the result is unambiguous:

| Person | Test entries |
|---|---|
| Robert | Note `R-P62`, quick encouragement `R to L P62`, 1,234 test steps, one test meal, one 2-minute walk |
| Lizzie | Note `L-P62`, quick encouragement `L to R P62`, 2,345 test steps, one different test meal, one 2-minute walk |

Delete synthetic entries after certification if the UI supports safe historical editing. Never delete real data to make a test easier.

## 3. Severity and result rules

| Severity | Meaning | Release effect |
|---|---|---|
| `S0 Critical` | Data loss/corruption, wrong-person data, secret exposure, private photo/body/meal data shared, restore or rollback cannot recover | Immediate stop. Release cannot proceed. |
| `S1 High` | Install/upgrade/offline shell fails, sync is materially wrong, timer loses time, camera is unusable, primary workflow blocked, accessibility blocks completion | Release blocker until fixed and fully retested. |
| `S2 Medium` | Important workflow has a reliable workaround, or layout/accessibility defect causes material friction without blocking completion | Fix before release unless Robert explicitly accepts a written exception with owner and due date. |
| `S3 Low` | Cosmetic polish issue with no data, privacy, navigation, readability, or task-completion impact | May ship only when logged with evidence and follow-up owner. |

Allowed results are `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`. A check is `PASS` only when every listed step and pass criterion succeeds. “Looks okay” is not certification evidence.

## 4. Evidence record

Create one record per test ID. Screenshots should show the app state, not credentials.

| Field | Required value |
|---|---|
| Test ID / result | ____ / `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` |
| Tester / lane | ____ / ____ |
| Date and local time | ____ |
| Device / iOS | ____ / ____ |
| App version shown | ____ |
| Install mode | Safari tab / Home Screen standalone |
| Network state | Wi-Fi / cellular / Airplane Mode / restored |
| Preconditions | Data, privacy switches, pairing and timer state before test |
| Actual result | Exact observed behavior and text of any error |
| Data after test | Totals, photo count, sync timestamp and other affected values |
| Evidence | Screenshot/video filenames and, for sync, redacted GitHub file timestamp or commit link |
| Issue | Issue ID, severity, owner and retest build, or `none` |
| Tester sign-off | Initials: ____ |

For upgrade, restore, privacy and conflict tests, evidence must include before and after values. For any failure, attach a short screen recording when reproducible and note the first step that diverged.

## 5. Install, upgrade and lifecycle matrix

| ID | Lane | Procedure | Pass criteria | Evidence | Severity if failed |
|---|---|---|---|---|---|
| `INS-01` | `R-FRESH` | Remove only the isolated test-origin icon/data. Open the HTTPS test URL in Safari, add it to the Home Screen, launch from the icon, complete onboarding as Robert with partner Lizzie, then close and relaunch. | Correct name/icon/portrait standalone launch; onboarding completes once; Robert remains the owner after relaunch; Home, Journey, Train, Nutrition, Together and Settings open without blank or broken screens. | Install video; Home and Settings screenshots; version | S1 |
| `INS-02` | `L-FRESH` | Repeat `INS-01` as Lizzie with partner Robert. | Same as `INS-01`, with Lizzie retained as owner and no Robert-local test history present. | Install video; Home and Settings screenshots; version | S1 |
| `INS-03` | `R-FRESH`, `L-FRESH` | Deny camera access on first request, return to InSync, then allow it in iOS settings and try again. Cancel the picker once as well. | Denial/cancel returns safely with no false log or broken sheet; later permission permits capture without reinstall. | Permission screenshots and retry video | S1 |
| `UPG-01` | `R-DAILY` | Record baseline, create backup, fully close InSync, deploy/open P6.2, wait for network refresh, close and reopen from Home Screen twice. Do not clear browser data. | Version is P6.2; existing profile, historical days, targets, meals, workouts, measurements, photos, expedition, achievements, privacy choices and connection settings remain; no duplicate onboarding; new Trail Notes appear as designed. | Before/after checklist and screenshots | S0 |
| `UPG-02` | `L-DAILY` | Repeat `UPG-01` on Lizzie’s daily phone. | Same retained-data criteria, scoped to Lizzie. Robert’s local/private records do not appear. | Before/after checklist and screenshots | S0 |
| `UPG-03` | `R-DAILY`, `L-DAILY` | After upgrade, clear one Trail Note, close and reopen; then clear all remaining notes. Open Settings > Trail Notes. | Individual clear leaves other notes; read state survives relaunch and stays phone-local; Clear All clears the queue; journal remains reachable from Settings. One person’s clearing does not clear the other phone. | Before/after screenshots on both phones | S2 |
| `OFF-01` | `R-DAILY`, `L-DAILY` | While online, visit all primary tabs once. Fully close the app, enable Airplane Mode, cold-launch from the Home Screen icon, and navigate all primary tabs plus Settings. | App reaches usable UI within 10 seconds; cached shell opens; no blank screen or endless loader; local data and cached art render; local logging remains possible; network features show a truthful recoverable state. | Cold-launch video per phone | S1 |
| `OFF-02` | `SMALL` | Repeat `OFF-01` immediately after a fresh online install and one complete online launch. | Freshly installed shell cold-starts offline with the same criteria. | Cold-launch video | S1 |
| `LIFE-01` | `R-DAILY`, `L-DAILY` | Open a data-entry sheet, type an unsaved value, switch to another app for 30 seconds, return, then lock for 5 minutes and return. Repeat from Home, Train session and Together. | App resumes without reload loop, white/black screen or wrong route. Saved state is correct. Unsaved form behavior is consistent and does not silently create a record; if the form rerenders, the loss is visible and logged as a UX issue. | Resume video and resulting record screenshot | S1 for saved-state loss; S2 for avoidable draft loss |
| `LIFE-02` | `R-DAILY`, `L-DAILY` | With InSync backgrounded, change Wi-Fi to cellular and back, then foreground and run Sync Now. | UI remains responsive; exactly one coherent sync completes; last-sync/error status updates; repeated taps cannot create conflicting writes. | Video plus redacted sync timestamps | S1 |

## 6. Timers, camera, photos and barcode

| ID | Lane | Procedure | Pass criteria | Evidence | Severity if failed |
|---|---|---|---|---|---|
| `TIME-01` | `R-DAILY`, `L-DAILY` | Start today’s walk timer. At ~30 seconds background the app, lock the phone for at least 90 seconds, reopen, pause, wait 30 seconds, resume, then stop around 2 minutes of running time. Add pace/elevation or treadmill detail and navigate away/back. | Running time advances while locked based on elapsed time; paused time is excluded; resume continues; stop persists duration and entered details; finishing a lifting session does not stop the separate walk timer. Tolerance: displayed running time within 5 seconds of a reference stopwatch. | Continuous comparison video and final walk screenshot | S1 |
| `TIME-02` | `R-DAILY`, `L-DAILY` | Start a workout with automatic rest enabled. Log a set, confirm rest begins, lock for at least 60 seconds, reopen, add 30 seconds, then skip. Repeat with automatic rest disabled. | Timer survives lock using its absolute end time; remaining time is within 5 seconds of reference; add and skip work; ready state appears at zero; disabled setting prevents automatic start. | Video and setting screenshot | S1 |
| `TIME-03` | `R-DAILY`, `L-DAILY` | Start walk/rest timers, fully close InSync, wait 60 seconds, relaunch. Then change foreground route while each timer runs. | Persisted timers restore with correct elapsed time and never reset, duplicate, go negative or attach to the wrong date/session. | Relaunch video | S1 |
| `PHOTO-01` | `R-DAILY`, `L-DAILY` | Take a progress photo from Body, save it, relaunch, view comparison/timeline, and delete only the synthetic photo. | Rear camera/file picker opens; image orientation and crop are usable; saved photo survives relaunch; timeline/detail loads; deletion removes only the selected photo; count changes by exactly one. | Capture-to-delete video; count before/after | S0 for wrong deletion/data loss; otherwise S1 |
| `PHOTO-02` | `R-DAILY`, `L-DAILY` | Photograph a manually logged meal; view, replace and remove it. Add a finished photo to a planned meal and log that meal. | Each image persists and appears on its intended meal; replace removes stale association; remove does not delete meal; planned-meal photo copies safely to the logged meal. No image appears on the partner phone after sync. | Screenshots before/after sync | S0 for cross-phone image; otherwise S1 |
| `BAR-01` | `R-DAILY`, `L-DAILY` | Scan a clear packaged-food barcode in bright light, then a partially obscured barcode. Test manual digit entry/fallback with network unavailable. | Clear barcode produces the exact printed digits or an editable result; unreadable image is not guessed; cancellation is safe; manual entry remains available and can complete a log offline. | Photo of package digits plus result screenshots | S1 |
| `PHOTO-03` | `SMALL` | Repeat progress, meal and barcode capture while the phone is at low free-storage warning threshold only if this can be staged safely. Otherwise mark `BLOCKED`, not passed. | A successful save is durable, or failure is explicit and leaves previous state unchanged. No partial/broken photo record is created. | Storage level and outcome video | S0 for corruption; otherwise S1 |

## 7. Pairing, sync, conflicts and privacy

Use the dedicated private test repository for fresh-lane tests. The live pair test must use the already-approved private live sync repository. Confirm the repository is private and is not the repository publishing InSync.

| ID | Lane | Procedure | Pass criteria | Evidence | Severity if failed |
|---|---|---|---|---|---|
| `PAIR-01` | `R-FRESH`, `L-FRESH` | Configure Robert/partner Lizzie on one phone and Lizzie/partner Robert on the other, using the same private test repo/branch and valid device-local tokens. Run connection validation, then Sync Now on Robert and Lizzie. | Private repository accepted; published-app or public repo is rejected; two distinct `sync/robert.json` and `sync/lizzie.json` records are used; each phone displays the correct partner. Secrets are never rendered in screens or backup. | Redacted Settings shots and repo filenames/timestamps | S0 |
| `PAIR-02` | `R-FRESH` | Temporarily set owner and partner to the same normalized name, or point at a mismatched partner record. Attempt sync, then restore correct names. | Sync is blocked with an actionable error; no wrong-identity file is written or ingested; correcting names restores service. | Error screenshot and redacted repo timestamp | S0 |
| `SYNC-01` | `PAIR` | With both online, Robert creates `R to L P62`, a partner note, a reaction and a Together action. Robert syncs, then Lizzie syncs. Repeat in reverse with Lizzie’s distinct values. | Every intended shared item arrives once on the correct partner phone; timestamps/order are reasonable; no private meal, lifted weight, exact bodyweight or photo appears; own local history remains unchanged. | Side-by-side before/after plus redacted file timestamps | S0 |
| `SYNC-02` | `PAIR` | Put Robert offline. Create a quick encouragement and a shareable update; attempt sync. Bring network back, foreground app and invoke Sync Now. Repeat with Lizzie. | Offline action remains saved locally; status says retry is needed and does not falsely claim delivery; later sync delivers exactly once; stale error clears and last successful sync updates. | Offline/online video and received item | S1 |
| `SYNC-03` | `PAIR` | Both phones, without syncing first, create different quick encouragements and reactions. Trigger Sync Now nearly simultaneously, then sync both again. | Both identities retain their own writes; both partners receive the other’s items once; no duplicate, lost update, cross-identity overwrite or endless sync loop. | Both videos plus redacted repository commit sequence | S0 for overwrite; otherwise S1 |
| `SYNC-04` | `PAIR` | From one phone trigger sync, background/foreground immediately and tap Sync Now repeatedly. Repeat on the other phone. | UI stays responsive; in-flight requests serialize; final repository file is valid JSON; no duplicate shared activity and no stuck disabled control. | Video and redacted final file validation | S1 |
| `SYNC-05` | `PAIR` | Make different local-only edits on both phones: a meal, lifted weight, progress photo, personal measurement and Trail Note read state. Sync in both directions twice. | Every local-only edit remains only on its originating phone; partner sync does not overwrite it; Trail Note read state differs as set. | Side-by-side screens after two rounds | S0 |
| `PRIV-01` | `PAIR` | On Robert, turn Weight, Energy and protein, Workouts, and Steps/walks off. Add synthetic values, sync both phones and inspect Lizzie’s Together view. Repeat with Lizzie as source. | Disabled optional fields are absent from the outbound payload and partner UI; exact weight, meals, lifted weights and all photos are absent regardless of switches; core Together fields continue to sync. | Toggle shots, partner UI, redacted payload field list | S0 |
| `PRIV-02` | `PAIR` | Enable one optional field at a time, sync, verify only that category appears, then disable it and sync again. Include Steps off while an expedition is active. | Only explicitly enabled aggregate crosses; disabling removes it from the next payload/partner view; Steps off pauses shared expedition mileage without exposing raw private records. | Four before/after pairs and payload field list | S0 |
| `PRIV-03` | `PAIR` | Export both backups after media and connection setup. Search the files for token fragments and inspect partner payloads for prohibited data classes. | Backups contain app state/photos as documented but no GitHub or Claude secrets. Partner files contain no photos, exact meals, lifted weights, exact bodyweight, private faith journal or Trail Note state. | Redacted search result and field inventory | S0 |

## 8. Backup, restore and rollback

Run destructive restore simulations only on isolated fresh-lane installs until the final non-destructive daily-phone verification.

| ID | Lane | Procedure | Pass criteria | Evidence | Severity if failed |
|---|---|---|---|---|---|
| `BACK-01` | `R-FRESH`, `L-FRESH` | Create synthetic days, settings, progress photo, meal photo and expedition state. Export backup and save to Files. | One readable non-empty JSON bundle is created with `format: insync-backup`; expected state and media are present; connection secrets are absent. | Filename/size and redacted structure inventory | S0 |
| `REST-01` | `R-FRESH`, `L-FRESH` | Record counts/values. Change several values and remove a photo, then restore that same owner’s backup and confirm the prompt. Relaunch twice and sync. | State and all backed-up photos return exactly; post-backup mutations are replaced; owner identity is correct; device connection keys remain unchanged; relaunch and sync work. | Before/mutated/restored comparison | S0 |
| `REST-02` | `R-FRESH` | While onboarded as Robert, try to restore Lizzie’s backup. Then select an invalid JSON file and a structurally invalid JSON file. | Cross-owner restore is rejected; invalid files are rejected; current state, media, identity and connection settings remain byte-for-byte or visibly unchanged. | Error shots and state before/after | S0 |
| `REST-03` | `L-FRESH` | Begin a restore and cancel at the confirmation. Then test a valid backup after one contained media value has been made invalid in a disposable copy. | Cancel changes nothing; invalid media causes the entire restore to fail safely; prior state and photos remain intact. | Before/after counts and error screenshot | S0 |
| `ROLL-01` | Test deployment + `R-FRESH`, `L-FRESH` | Record rollback package identifiers. Deploy P6.2 over a populated previous-build installation, then redeploy the approved previous code using a **new rollback service-worker cache name**. Relaunch online twice, then cold-start offline. | Known-good code regains control; offline shell matches rollback; existing `insync.v10` data and photos remain readable; no onboarding/reset; sync schema remains compatible. | Version/cache evidence and before/after data inventory | S0 |
| `ROLL-02` | `R-DAILY`, `L-DAILY` | Perform a tabletop drill only: identify deploy owner, exact known-good commit/package, rollback cache name, backup locations, live health check, stop conditions and user communication. Do not intentionally break a daily phone. | Two people can state who acts, what is deployed, how success is verified and when restore is used. All artifacts are accessible without relying on the failing app. | Completed rollback record and artifact locations | S1 |

Rollback must redeploy known-good source with a new cache identifier. Reusing either the failed release cache name or the old cache name is not acceptable because installed clients may retain the wrong shell. A data restore is a separate last-resort action and must never be the first rollback step.

## 9. Accessibility and small-screen matrix

| ID | Lane | Procedure | Pass criteria | Evidence | Severity if failed |
|---|---|---|---|---|---|
| `A11Y-01` | `R-DAILY`, `L-DAILY`, `SMALL` | Set iOS text size to default, then two increments above default. Visit onboarding, all five tabs, Settings, a long meal screen, workout session, photo detail, Together/Campfire and Trail Notes. | No essential text is clipped or hidden; cards may grow; buttons remain readable/tappable; fixed headers/tabs do not cover content; every screen can scroll to its final action. | Screen recording at larger text on each size | S1 if action blocked; otherwise S2 |
| `A11Y-02` | `SMALL` | In portrait, exercise all primary tabs, sheets, keyboard forms, confirmation dialogs, camera return, workout controls and bottom navigation. Repeat with Display Zoom if available. | No horizontal page scroll, overlap, off-screen close/save control, keyboard-trapped action, unsafe-area collision or accidental tap due to crowded controls. Touch targets for primary actions are approximately 44 × 44 points. | Full-path video and defect screenshots | S1 if action blocked; otherwise S2 |
| `A11Y-03` | `R-DAILY`, `L-DAILY` | Enable VoiceOver. From cold launch, navigate tabs, open Settings/privacy, start/pause a walk, log a meal, initiate a photo, send encouragement and create backup. | Focus order follows the visual task; interactive controls have understandable role/name/state; toggles announce state; unlabeled decorative art is not a focus trap; all named tasks are completable without sight. | Audio screen recording and control exceptions | S1 if task blocked; otherwise S2 |
| `A11Y-04` | `R-DAILY`, `L-DAILY` | Enable Increase Contrast, Differentiate Without Color and Reduce Motion, one at a time and together. Inspect selected tabs, progress/status, errors, charts/cards and modal transitions. | Meaning is not color-only; text and controls remain legible; focus/selected/error states remain distinguishable; reduced motion causes no stuck or invisible UI. | Screenshots for each setting | S2 |
| `A11Y-05` | `SMALL` | Test in bright outdoor light and at minimum practical screen brightness using both light-sensitive photos and text-heavy screens. | Core text, controls and status can be read without relying on subtle gradients; camera return does not strand the user. | Photos of device in conditions | S2 |

## 10. Release gate and sign-off

The release is `GO` only when all of the following are true:

- Repository deterministic suite is green on the exact deployment candidate and recorded separately.
- Every required real-device case is `PASS` on both `R-DAILY` and `L-DAILY` where those lanes are listed.
- Fresh install passes for both owner identities.
- The smallest supported real iPhone passes the `SMALL` cases.
- No open `S0` or `S1` issue exists.
- No `S2` issue exists unless Robert explicitly accepts it in writing with an owner, workaround and target fix date.
- Both pre-upgrade backups are readable and stored outside the phones.
- Bidirectional sync and all privacy checks pass after the final candidate deployment.
- Rollback package, unique rollback cache name and deploy owner are recorded before rollout.
- Robert and Lizzie each complete a 24-hour normal-use soak with at least one cold launch, one foreground resume, one local log and one sync. No lost/duplicated entry, privacy regression or unexplained storage/sync error occurs.

Any code, service-worker shell, storage, media, sync or privacy change after certification invalidates the affected tests. Changes to `store.js`, `media.js`, `cloud.js`, `sw.js`, upgrade behavior or owner identity require the full upgrade, offline, privacy, backup/restore and pairing sections to be rerun.

### Final record

| Gate | Result / reference |
|---|---|
| Exact commit or package | ____ |
| Production URL | ____ |
| Repository suite | ____ |
| Robert matrix | ____ |
| Lizzie matrix | ____ |
| Small-iPhone matrix | ____ |
| Pair/privacy matrix | ____ |
| Backup locations verified | ____ |
| Rollback package/cache/owner | ____ |
| 24-hour soak start/end | ____ |
| Accepted S2 exceptions | ____ |
| Open S0/S1 issues | must be `none` |
| Decision | `GO` / `NO-GO` |
| Robert approval and date | ____ |
| Lizzie confirmation and date | ____ |

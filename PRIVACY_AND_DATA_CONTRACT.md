# InSync Privacy and Data Contract

Status: implementation audit for InSync 6.0.0-p6.2  
Primary evidence: `store.js`, `cloud.js`, `media.js`, `intelligence.js`, `prompt-registry.js`, `together.js`, `nutrition.js`, `faith.js`, `app.js`, and `screens.js`  
Contract date: 2026-09-06

## Purpose and status language

This document records what the current build actually stores, exports, sends, and retains. It is not a claim that the current implementation is fully private or production-ready.

- **Current** means the behavior exists in this codebase now.
- **Proposed** means the behavior is required before a broader production release but is not implemented by this document.
- **Private-only** means excluded from the partner sync payload. It does not mean encrypted on the device, encrypted inside a backup, or withheld from an AI service when the user explicitly invokes a feature that needs it.
- **Partner-shared** means written to a dedicated private GitHub repository and then read by the paired device. GitHub and anyone with repository access can also access that material.

## Governing rules

1. The canonical owner state is the normalized object stored under `localStorage` key `insync.v10`.
2. Progress and meal photographs are stored separately in IndexedDB database `insync-photos`, object store `photos`. The canonical state keeps only photo identifiers and dates.
3. The Claude and GitHub credentials are stored under the separate `localStorage` key `insync.secrets.v1`.
4. Credentials must never be included in a normal state export, full backup, partner payload, AI prompt, application log, or error message.
5. Partner sharing is allow-list based. A field not named in the partner-sharing table below must not cross to GitHub.
6. AI is optional and request-driven. Core logging, scoring, training execution, privacy settings, and partner data must remain usable without Claude.
7. No AI response may silently change targets, privacy settings, stored history, or active plans. A user action or an explicit approval step is required.
8. Reset is device-local. It clears the current state keys and photograph database, but does not erase GitHub history, downloaded backups, or data already transmitted to third parties.

## Data stores and trust boundaries

| Store or recipient | Current contents | Current protection | Current retention |
|---|---|---|---|
| `localStorage: insync.v10` | The complete normalized app state listed below, including health records, journal-like text, partner cache, settings, AI-derived records, and sync metadata | Browser origin isolation only. Plaintext JSON, not application-encrypted | Until edited, pruned, restored over, browser data is cleared, or Start over succeeds |
| IndexedDB: `insync-photos/photos` | Progress photos, meal photos, recipe photos, and other captured image blobs/data URLs keyed by photo id | Browser origin isolation only. Not application-encrypted | Until individually deleted, overwritten during restore, browser data is cleared, or Start over succeeds |
| `localStorage: insync.secrets.v1` | `claudeKey`, `githubToken` | Separated from state exports, but still plaintext and script-readable | Until removed, browser data is cleared, or Start over succeeds |
| Downloaded backup JSON | Full exported state plus all IndexedDB photographs as base64 data URLs | No encryption or password protection in the app | Controlled by the user and the device/file provider after download |
| Dedicated private GitHub sync repository | One current sync file per profile at `sync/<profile-slug>.json`, plus repository commit history | GitHub access controls and HTTPS in transit. Payload is base64 in the Contents API, not encrypted | Current file persists until changed or deleted. Earlier values may remain recoverable in Git history |
| Anthropic Messages API | The exact prompt content and optional image supplied for the invoked feature, plus the Claude API key in the request header | HTTPS in transit; direct browser request | Governed by the configured Anthropic account and Anthropic policy, not by InSync code |
| JavaScript memory | In-flight prompts, AI responses, `LAST_REQUEST`, and decoded partner payloads | Ephemeral page memory | Normally until reload or process eviction, except results deliberately written into canonical state |

## Canonical local data

All fields below are **Current** unless marked otherwise. `Store.normalizeStateShape()` validates or bounds many values during load and restore, but that validation is not encryption or access control.

| Category | Canonical state | Privacy classification |
|---|---|---|
| Identity and onboarding | `profile` name, initials, height, age, sex, start date, start weight; `onboarded` | Local by default. Name, initials, and effective journey start date are partner core |
| Goals and presentation | `goal`, `targets`, `units`, `frequency`, `notifs`, `notificationInfoSeen` | Private-only except values used to calculate separately allowed shared summaries |
| Daily health log | `days[date]`: meals and ingredients/macros, workouts and exercise/load/set/effort/RIR detail, walks/timers/pace/elevation/speed/incline/distance, steps, exact weight, resting heart rate, sleep, reflection, verse-read state, partner-note compatibility fields, frozen scoring basis | Private-only except the explicit aggregates and message fields in the partner table |
| Journey | `expedition`, checkpoint arrivals, current/previous leg contributions, route history, `lastArrival` | Route, leg, relevant timestamps, and mileage when steps sharing is enabled are partner-shared |
| Pairing and received data | `partner`, `partnerData`, `partnerHistory`, `partnerLoggedHistory`, `partnerLegMiles`, `partnerNoteSeen` | Local cache of data received from partner; included in backup |
| Messages and reactions | `sentMessages`, `notesSent`, `reactionsGiven` | Partner-shared, subject to payload caps. Legacy note fields can also provide the latest message |
| Invitations | `invite`, route proposal/counter/acceptance trail | Partner-shared for the two-device expedition handshake |
| Achievements | `earned`, `badgeEarnedAt` | Earned badge ids are partner core. Exact local earning timestamps are not sent directly |
| Plans and preferences | Current/future training plans and metadata, meal ideas/plans, shopping checks, meal preferences/favorites/dislikes, exercise preferences, training profile | Private-only, except shared-dinner profile and next-week readiness described below |
| Faith | Scripture memory records, prayer journal, gratitude, waypoint notes, Sabbath and Rule of Life settings; selected shared prayer id and prayer acknowledgements | Private-only except one explicitly selected ongoing prayer and bounded acknowledgements |
| Reviews and coaching | `weeklyReviews`, `weeklyGoals`, chapters, coach cache/chat, verse cache, target proposal, `aiPrefs`, `aiEvidence` | Private-only. Included in backups. Some entries are AI-generated or derived from AI output |
| Together | Local display mode, local missions and Campfire records | Mode stays private. Mission payload, privacy-safe weekly summary, Campfire intention, and next-week readiness are partner-shared |
| Base Camp | Level, XP, land tier, theme, visit permission, inventory, collections, rewards, placed objects, level-up timestamp | Current Phase 1 behavior is private-only. `allowPartnerVisit` has no current sync effect |
| App operations | Trail Notes seen/story cache, active workout session, sync timestamps/errors, GitHub repo/branch, Claude model | Local. Non-secret connection configuration is included in backups |
| Photo index | `photos[]` and photo ids embedded in records | Local state references; actual images live in IndexedDB and backup media |

Important current behavior:

- Calling `Store.state()` exposes the live state object to any same-origin script. This is a code architecture boundary, not a security boundary.
- State migrations move legacy `connections.githubToken` and `connections.claudeKey` values into the secret key, and remove the old copies only after the secret write succeeds.
- Empty historical day records are pruned before writes, but most real history has no automatic expiration.
- `partnerData` is part of the owner backup. Therefore a backup contains both the owner's complete local record and the most recently received partner payload.

## Backup and restore contract

### Current export

The Settings backup action downloads plaintext JSON with this envelope:

```json
{
  "format": "insync-backup",
  "version": 1,
  "exportedAt": "ISO timestamp",
  "state": "Store.exportState() result",
  "media": "all IndexedDB photographs keyed by id"
}
```

`Store.exportState()` clones the entire canonical state. It removes legacy `connections.githubToken` and `connections.claudeKey` properties if present. The separate `insync.secrets.v1` object is not exported. Non-secret connection information, partner cache, private journal content, and AI-generated records remain in the export.

### Current restore

- A backup must include an object-like `profile` and `days` structure.
- A configured device refuses a backup whose normalized owner identity differs from the active owner. An intentional Start over is required first.
- The user receives a destructive replacement confirmation.
- Photographs are validated, current photographs are read for rollback, and the incoming photograph map replaces the IndexedDB shelf.
- State is normalized and migrated in memory before a single state write.
- If the state write fails, the prior state is restored in memory and the old photograph map is restored when possible.
- Existing device credentials remain unchanged because they are outside the restored state.
- A legacy raw-state JSON file is accepted. Because it has no `media` envelope, restoring it replaces the photo shelf with an empty map.

### Proposed backup requirements

- Add optional user-controlled encryption for backups containing health, faith, message, and photograph data.
- Add size, schema-version, and top-level key limits before deeply cloning an imported state.
- Preview owner, export date, record counts, included partner cache, and photograph count before confirmation.
- Make legacy-state restore explicitly warn that it contains no photographs.
- Offer separate exports for owner-only data and owner-plus-received-partner data.
- Document that changing or deleting a local backup does not affect GitHub or Anthropic copies.

## Partner-sharing allow-list

The outbound payload is generated by `Cloud.sharePayload()` and sanitized on receipt by `sanitizePartnerPayload()`. The dedicated repository must be private, must be separate from the GitHub Pages app repository, must use an existing initialized branch, and must not resemble the app repository at the root or under `/docs`.

### Partner core, always shared when sync is used

| Fields | Notes |
|---|---|
| `schema`, name, initials, current date, effective start date, update timestamp | Profile and payload metadata |
| Current points and streak | Derived health behavior summary, even when every health toggle is off |
| All earned badge ids | May disclose the behavior represented by the badge |
| Up to 35 days of points and logged/not-logged history in each upload | Receiver caches up to about 45 days locally |
| Latest legacy note plus up to 50 authored messages | Message text, ids, dates, created/sent/display times |
| Up to 7 days of activity and reaction map | A 10-of-10 activity is always included; workout, protein, and step activities obey their category toggles |
| Expedition route, leg index, leg start, arrival update timestamp | Shared even if step sharing is off; distance fields then remain absent |
| Invitation/proposal state | Route, proposal trail, counters, decision, reply, and timestamps |
| Partner-seen timestamp | A lightweight acknowledgement of the last partner update |
| Prayer acknowledgements | Up to 80 locally recorded acknowledgement ids/timestamps are sent |

### Controlled or explicitly selected fields

| Control | Default | Shared when enabled/selected | Excluded when disabled/unselected |
|---|---:|---|---|
| `privacy.weight` | Off | Recent weight **change** and contributing-day count, only when at least two weights exist in the last 14-day lookup | Exact weight is always excluded; weight trend omitted |
| `privacy.calories` | On | Current daily calories and protein; weekly average protein; protein-target activity | Exact meal names, ingredients, macros by meal, meal photos, and calorie history omitted |
| `privacy.workouts` | On | Current workout count; weekly workout count; workout activity text including session name | Exercises, loads, sets, effort/RIR, and duration details omitted from the direct fields |
| `privacy.steps` | On | Current steps, current leg miles, prior-leg mileage when applicable, weekly average steps and expedition miles, step-target activity | These direct values omitted. Route and leg still cross |
| `mealPrefs.sharedDinnerShare` | Off | Name and calculated dinner-sized calorie/protein targets | Full daily targets, food history, meal preferences, and exact meal log omitted |
| `faith.sharedPrayerId` | Empty | Exactly one ongoing prayer: id, text, category, created timestamp | Prayer journal, answered-prayer history, gratitude, waypoint notes, and Rule of Life text omitted |
| Mission selection | No mission | Mission id, week, progress, and timestamp for current/next week | No mission entry when no mission is selected |
| Campfire intention | Empty | Week, up to 280 characters of intention text, update/close times | No intention when empty |

### Other Together fields currently shared without a separate privacy toggle

- Weekly points and logged-day count.
- Next-week readiness: week, whether training is prepared, whether meals are prepared, and meal count up to 28.
- Duo Mission identity and timing. Progress is included only when the mission's required sharing permissions are enabled.
- Mission type `trail-miles` requires step sharing, and `training-sessions` requires workout sharing.
- Mission types `strong-days` and `perfect-days` require all four health sharing switches because their scores can reflect several health inputs.

## Privacy toggle semantics

### Current

- The four `privacy.*` switches filter the next generated outbound payload. They do not delete fields already committed to GitHub, remove old Git commits, clear the receiving phone's cached `partnerData`, or retract information already seen.
- Weight sharing means trend only, never exact bodyweight.
- Energy sharing also controls protein totals and protein-related activity.
- Steps sharing also controls shared expedition mileage. It does not hide the route or leg.
- Photos have no sharing switch because no photo is included in the partner payload.
- The Together presentation `mode` is a local display preference, not a disclosure control. Quiet mode does not change the payload.
- Shared Dinner and shared prayer use separate opt-ins, outside the four `privacy.*` switches.

### Proposed

- Every sharing control must state both what will be shared next and what cannot be retracted from GitHub history or the partner's cache.
- Turning a category off should trigger a tombstone or versioned removal signal so the partner app clears cached values immediately after sync.
- Mission progress now respects the relevant health toggles. Any future mission type must declare and test its sharing dependency before release.
- Quiet mode should clearly state that it changes presentation only, or it should become a real disclosure preset.
- Add a single "Pause all partner sharing" control that stops push operations without destroying local data.
- Add a "Disconnect and redact" workflow that deletes active sync files, clears both local partner caches where possible, and explains the limits of Git history.
- Add explicit controls or disclosure for badge ids, points/history, activity, next-week readiness, and prayer acknowledgements.

## AI context and transmission contract

### Current context scopes

The prompt registry declares per-capability allow-lists using these builders:

| Scope | Data made available by the builder |
|---|---|
| `user` | Name, goal, units, targets, training frequency |
| `today` | Date, journey day, streak, daily calories/protein/steps, workout count, meal-slot names, exact current weight when present, reflection-written boolean, targets |
| `recent` | Computed 7-day and 28-day aggregates plus bounded pattern text |
| `training` | Up to 28 days scanned; up to 18 recent sessions, including exercise name, weight, reps, sets; disliked and discomfort exercise ids |
| `nutrition` | Meal preferences, disliked meals, favorite meal names, and up to 40 recent unique meal names |
| `journey` | Route/leg identity, route endpoints, owner and partner leg miles |
| `faith` | Verified chosen Scripture, spiritual-practice counts/booleans; explicitly excludes prayer, gratitude, Rule of Life, waypoint, and reflection text |
| `partner-shared` | Only sanitized partner fields already present on this device: name/date, points/streak, badge count, note, route/leg, optional calorie/protein/workout/steps/mileage/trend fields |

The active prompt ids and declared scope allow-lists are defined in `prompt-registry.js`. Important examples are daily next step (`user`, `today`, `recent`, `journey`), training week (`user`, `recent`, `training`), meal estimate (`user`, `nutrition`), coach chat (`user`, `today`, `recent`, `journey`), and connectivity test (no context).

### Current request-specific transmissions

- Daily and coach-chat requests transmit current targets and activity metrics; coach chat may include up to six prior local chat messages and the new free-text question.
- Training-plan requests transmit age, sex, height, goal, gym/equipment, recent session names/durations, best loads, progression summaries, and avoided exercise ids.
- Weekly review/chapter and target-proposal requests transmit bounded historical daily or weekly health figures, including weight information when the feature constructs it.
- Nutrition requests transmit user-entered meal/restaurant/dish text and, for planning, preferences and recent food history needed by that prompt.
- Meal-photo and barcode-photo requests transmit the user-selected image as base64 directly to Anthropic. Partner sync never receives that image.
- Faith verse selection transmits the supplied week of health/activity facts and an in-app Scripture menu. General faith context deliberately excludes private prayer and journal text.
- Trail Notes transmits hardcoded release facts only.

AI results can be stored locally as coach text/chat, chosen verse rationale, training plans, meal plans/recipes, weekly reviews/chapters, target proposals, Trail Notes story cache, and bounded explainability evidence. The in-memory `LAST_REQUEST` disappears on reload. `aiEvidence` keeps at most 20 records and stores labels/values, prompt id/version, constitution version, and timestamp, not raw prompts or photographs.

### Enforcement limitation

The registry allow-list is currently a declared policy and system-prompt instruction, not a hard outbound data-loss-prevention gate. Several `cloud.js` functions manually compose messages rather than serializing only an approved context object. A future edit could therefore add disallowed data without being blocked automatically.

### Proposed AI requirements

- Route every AI request through a serializer that accepts only the registered scope objects plus an explicit per-request attachment schema.
- Reject an outbound request when its actual scope/attachment manifest exceeds the registry entry.
- Show a concise "data sent for this request" disclosure before the first use of each photo, coaching, planning, and faith capability.
- Require an explicit user action for every image transmission. Never upload a stored image automatically.
- Add an option to clear locally stored AI chat/results without clearing the health log.
- Record only metadata required for troubleshooting, never raw prompt bodies, photographs, credential headers, or full API responses.
- Pin and validate supported model identifiers rather than treating an arbitrary settings string as trusted configuration.
- Document third-party processing and retention against the actual Anthropic account terms before release.

## Secrets and credentials

### Current

- `claudeKey` and `githubToken` live in a separate localStorage object and are excluded from backups.
- The Claude key is sent only as `x-api-key` to `https://api.anthropic.com/v1/messages`.
- The GitHub token is sent only as a bearer token to GitHub API requests made by `cloud.js`.
- The app makes direct browser calls and enables Anthropic's dangerous direct-browser-access header. Any malicious script running in the same application origin can read both credentials and all local data.
- GitHub token scope is not inspected or constrained by the app. A token can therefore have more access than InSync needs.
- Credentials remain on the device when a same-owner backup is restored. Start over removes the current and previous state keys, the secret key, and the photo database.

### Proposed

- Replace long-lived browser credentials with a narrowly scoped backend or broker using revocable, short-lived tokens.
- If direct GitHub access remains, require a fine-grained token restricted to the dedicated sync repository and contents read/write only.
- Add key removal and rotation controls independent of Start over.
- Apply a strict Content Security Policy, dependency integrity controls, and a no-third-party-script rule to the production host.
- Never place secrets in service-worker caches, URLs, analytics, telemetry, crash reports, screenshots, or DOM values longer than required for user editing.

## Known inference, retention, and disclosure risks

| Risk | Current evidence | Required disposition |
|---|---|---|
| Plaintext local health and faith data | State, photos, and secrets use browser storage without app encryption | Accept only for private prototype use; mitigate before broader release |
| Plaintext portable backup | Backup contains the full state and base64 photos | Add clear warning and optional encryption |
| Git history retention | Each sync uses a GitHub Contents API commit; overwriting a file creates history | Treat shared data as potentially persistent; design redaction/disconnect workflow |
| Toggle non-retraction | Turning a toggle off omits future fields but does not clear previous remote/cache/history values | Add tombstones and user-facing disclosure |
| Derived mission inference | Mission progress is gated by the applicable health switches, but enabling those switches can still reveal behavior through the mission total | Preserve the current gates and disclose each future mission's sharing dependency |
| Core score inference | Points, streak, logged history, perfect-day activity, and badge ids cross regardless of health toggles | Make these disclosures explicit and independently controllable if required |
| Workout-name leakage | Workout activity text includes the session name when workout sharing is on | Clarify this in Settings or reduce it to a boolean event |
| Planning inference | Next-week meals/training readiness and meal count cross without a dedicated toggle | Add disclosure/control |
| Received partner data in owner backup | `partnerData` and cached histories are cloned into the full backup | Offer owner-only export or prominently disclose inclusion |
| Direct browser secrets | Same-origin code can read both service credentials | Use a broker/short-lived tokens and harden the host |
| AI allow-list is not technical enforcement | Prompts are manually composed in `cloud.js` | Add scope serializer and automated negative tests |
| AI provider retention is external | InSync has no deletion or retention API integration | Document provider policy and user deletion path |
| Reset scope may be misunderstood | Reset is local only | State this in the confirmation and completion message |
| Local browser eviction or corruption | Browser storage can be cleared, quota-limited, or damaged | Keep tested backups and provide integrity/restore diagnostics |
| Identity slug collisions | Filenames derive from normalized names | Preserve current same-name block; add stable random pair/profile ids |

## Acceptance tests for future implementation

These tests are proposed release gates. They supplement the current unit tests and must run against both owner identities.

### Local storage and backup

1. A complete state round trip preserves every normalized owner field and photograph byte-for-byte while excluding both credentials.
2. Searching an exported backup for the actual Claude key and GitHub token returns no match, including legacy `connections` locations.
3. The backup UI states that the file contains private health, faith, messages, received partner data, and photographs and that it is not encrypted unless encryption has been added.
4. A malformed, oversized, prototype-polluting, wrong-owner, or future-incompatible backup fails before any state or photo mutation.
5. If photo replacement or state persistence fails, both the prior state and prior photo shelf remain recoverable and a clear error is shown.
6. Restoring a legacy raw-state backup warns that no photographs are present and requires separate confirmation before clearing the photo shelf.
7. Start over clears `insync.v10`, every supported previous state key, `insync.secrets.v1`, and the IndexedDB photo database, then reports that remote and downloaded copies were not erased.

### Partner payload and privacy

8. With all four health toggles off and no optional shares selected, the serialized payload contains no calories, protein, workouts, workout names, steps, walk/mileage fields, weight/trend values, meal data, load data, photos, prayer text, gratitude, reflections, or Rule of Life text.
9. Each health toggle changes only its documented fields and never causes unrelated fields to appear.
10. Exact weight, exact meal records, ingredients, lifted loads/sets, resting heart rate, sleep, reflections, private prayers, gratitude, waypoint notes, and all photos never appear in a partner payload under any toggle combination.
11. Turning a toggle off produces and applies a removal signal so the receiving phone immediately drops the previously received optional values.
12. A trail-distance mission cannot transmit distance when step sharing is off unless the user separately consents; the same rule applies to training missions when workout sharing is off.
13. Score-based mission progress, badge ids, points/history, perfect-day activity, and planning-readiness fields have explicit tested controls or an approved, accurately disclosed partner-core classification.
14. Unsharing a prayer removes it from the next active sync document and clears it from the receiver after sync, while acknowledging that prior Git history may persist.
15. Disabling Shared Dinner removes the dinner profile from the next payload and receiver cache.
16. Quiet Together mode is verified either to change only presentation with explicit copy saying so, or to apply a documented disclosure preset.
17. The receiver rejects wrong-profile, malformed, out-of-range, prototype-polluting, oversized, unknown-schema, and invalid-date payloads without mutating current partner state.
18. Sync refuses a public repository, the publishing repository, an app-like repository, an unknown branch, identical identity slugs, or missing owner/partner identities.
19. Each device writes only its own stable profile id file and reads only its paired profile id file; owner name edits do not create ambiguous identities.

### AI

20. Every prompt id has a registry entry, declared scopes, attachment schema, response validator, fallback, and retention classification.
21. Instrumented tests compare the real outbound request manifest to the registry and fail if a field or image exceeds the allow-list.
22. Connectivity test sends no owner, partner, health, faith, meal, workout, journey, chat, or image context.
23. Photo and barcode analysis sends exactly the image selected by the user and no stored photo library, partner data, journal text, or credentials inside the body.
24. Faith prompts never receive prayer-journal text, gratitude text, Rule of Life text, waypoint notes, reflection text, or unverified Scripture.
25. Couple and expedition AI receive only sanitized partner-shared data, never the partner cache's unsupported or private fields.
26. AI failure, timeout, invalid JSON, or model retirement leaves core data usable and never partially applies a target or plan change.
27. Clearing AI history removes the documented local AI caches/results without deleting health history.
28. Request and error logging is tested to contain no API keys, bearer tokens, full prompts, raw images, or full third-party responses.

### Secrets and operational security

29. A least-privilege credential cannot read or write outside the dedicated sync repository/path.
30. Removing or rotating either credential does not alter the health log or photographs.
31. Content Security Policy tests block unapproved scripts, frames, connections, and inline injection paths in the production host.
32. Service-worker caches and browser-visible URLs contain no credentials or private sync/AI payloads.
33. Settings and restore screens never repopulate a secret from a backup, and displayed secret values cannot leak through ordinary rendered HTML or application logs.

## Release decision

The current implementation has a thoughtful local-first structure, separate secret storage, a narrow partner payload, inbound sanitization, and user-invoked AI. It is appropriate for a controlled private prototype when both users understand the plaintext local storage, plaintext backups, direct browser credentials, GitHub history, and third-party AI processing.

Broader release should remain blocked until the mission-derived disclosure gap, toggle retraction behavior, credential architecture, backup protection/disclosure, and hard AI scope enforcement have approved implementations and passing acceptance tests.

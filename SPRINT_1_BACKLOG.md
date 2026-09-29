# InSync Sprint 1 Backlog

Version 1.0 | September 6, 2026

## Sprint outcome

Remove the highest-impact daily-use friction without changing InSync's core identity, privacy model, data schema, active plans, or established artwork.

A successful Sprint 1 lets Robert and Lizzie:

1. Understand whether the two phones are actually paired and know how to repair the connection.
2. Receive a usable first training plan based on the equipment each person actually has.
3. Understand that the Coach proposes changes and never silently applies them.
4. Understand which alerts exist only inside InSync.
5. Find Settings and historical records without hunting through long or inconsistently named screens.

## Entry gates

Sprint 1 implementation begins only when:

- Robert resolves DR-001 through DR-006 in `DECISION_LOG.md`.
- Sprint 0 has a reproducible automated baseline with no unexplained code failures.
- The private/shared field matrix is locked before pairing and Together copy changes.
- File leases are assigned for `app.js`, `screens.js`, `store.js`, `cloud.js`, `onboarding.js`, `styles.css`, and tests.
- The transport-slim asset limitation is documented and visual failures caused only by placeholders are not counted as code regressions.

## Priority order

| Order | Work package | Priority | Primary owner | Required reviewers | Dependency |
|---:|---|---|---|---|---|
| 0 | S1-00 Decision and contract gate | P0 | Program Director | Robert's Personal Representative, Data/Privacy Lead | Sprint 0 evidence |
| 1 | S1-01 Guided partner setup and pairing status | P0 | Partner Sync and Conflict Specialist | Product Architect, Privacy Reviewer, Mobile PWA, QA | S1-00, DR-001 |
| 2 | S1-02 Together connection and failure states | P0 | Together Engineer | Partner Sync Specialist, Copy Fit Reviewer, QA | S1-01 state contract |
| 3 | S1-03 Equipment-aware onboarding | P0 | Training and Walk Timer Engineer | Training Logic Reviewer, Product Architect, QA | S1-00, DR-002 |
| 4 | S1-04 Coach proposal truthfulness | P0 | Coach and Goals Engineer | AI Coach Evaluator, Personal Representative, QA | S1-00, DR-003 |
| 5 | S1-05 In-app notification clarity | P1 | Achievements and Notification Engineer | Product Architect, Accessibility, QA | S1-00, DR-004 |
| 6 | S1-06 Settings information architecture | P1 | Settings, Privacy and Data Tools Engineer | Architecture, Accessibility, Data/Privacy, QA | S1-01, S1-04, S1-05, DR-005 |
| 7 | S1-07 History hub | P1 | Progress, Measurements, Photos and History Engineer | Architecture, Product, QA | S1-00, DR-006 |
| 8 | S1-08 Integrated regression and device certification | P0 release gate | Quality Engineering and Release Lead | Mobile PWA, Data/Privacy, Program Director | S1-01 through S1-07 |

## S1-00: Decision and contract gate

**Objective:** Turn the six open product questions into locked decisions and give each implementation owner an unambiguous assignment packet.

**Why now:** Pairing, navigation, and copy changes can otherwise produce competing designs or implementation churn.

**In scope:**

- DR-001 through DR-006 in `DECISION_LOG.md`.
- Pairing-state vocabulary and transition table.
- Settings group map.
- History destination map and route compatibility rule.
- Exact Coach and notification wording contracts.
- File leases and reviewer assignments.

**Out of scope:** Code and visual implementation.

**Acceptance criteria:**

- Every decision request has Robert's dated answer.
- Every work package has one primary owner and independent reviewer.
- No two active work packages own the same primary file at the same time.
- The pairing contract distinguishes transport connectivity, this-phone readiness, partner presence, freshness, offline state, and failure.
- The History route plan preserves existing bookmarks or old in-app links.

**Dependencies:** Sprint 0 current-state, route, privacy, and test inventories.

**Decision request:** Robert must answer DR-001 through DR-006.

**Deliverable:** Updated decision log plus one assignment packet per approved work package.

## S1-01: Guided partner setup and pairing status

**Objective:** Make the existing private GitHub pairing flow understandable, testable, and recoverable without exposing more private data.

**Why now:** Pairing is central to Together, yet the current flow asks users to configure technical credentials and infer whether both phones are truly connected.

**Current state:**

- Each phone writes its own sanitized file and reads the file derived from the configured partner name.
- Setup requires a GitHub token, dedicated private repository, branch, and matching partner names.
- Automated symmetry tests prove Robert and Lizzie write separate files and reject owner mismatches.
- Real two-phone setup and recovery remain unverified.

**In scope:**

- A guided setup sequence with one clear step at a time.
- Repository privacy and access validation.
- This-phone write test using non-sensitive test metadata or the normal sanitized payload.
- Partner-file lookup and owner validation.
- Human-readable states from D-102.
- Last exchange, partner update, and partner-received timestamps.
- Retry and repair guidance that preserves local entries.
- A sharing preview before the first live exchange.

**Out of scope:**

- Managed backend, login accounts, signed payloads, or invite links.
- Adding fields to partner schema 8 without a separately approved sharing-contract change.
- Exposing tokens after save.

**Acceptance criteria:**

- A person can tell which setup step is incomplete without reading a raw API error.
- Invalid token, missing repository, public repository, wrong branch, missing partner file, wrong-owner payload, offline device, and temporary GitHub failure each produce distinct guidance.
- Successful setup identifies `This phone ready` separately from `Paired and current`.
- A missing partner file never presents as data loss or a successful pair.
- Local entries remain available during every connection failure.
- Secrets remain excluded from backup and partner payloads.
- Changing the phone owner or partner name still requires deliberate confirmation where it can break pairing.
- Existing schema 8 compatibility tests continue to pass.

**Dependencies:** Locked field-level sharing matrix, DR-001, pairing-state contract, sequential leases on `cloud.js`, `store.js`, `screens.js`, `app.js`, and `styles.css`.

**Owner:** Partner Sync and Conflict Specialist.

**Required reviewers:** Product Architect, Privacy Threat Modeler, Mobile PWA Lead, Partner Symmetry Tester.

**Tests required:** Unit tests for state derivation, GitHub failure simulations, wrong-owner rejection, secret exclusion, two-browser symmetry, actual Robert/Lizzie phone setup, offline-to-online retry, and update without clearing storage.

**Decision request:** Confirm the current GitHub transport remains acceptable for the private-prototype phase.

## S1-02: Together connection and failure states

**Objective:** Make Together useful and emotionally clear when partner data is empty, waiting, stale, private, offline, or retrying.

**Why now:** A technically correct sync layer still fails the product if a missing number looks like zero, a privacy choice looks like inactivity, or a stale partner file looks current.

**In scope:**

- Explicit UI states for not paired, waiting for partner, first sync, current, stale, partner field private, this phone offline, retry pending, and sync error.
- Clear calls to action that route to pairing repair when appropriate.
- Preservation of cached partner data with freshness labeling during temporary failures.
- Separate treatment of unavailable, private, and genuinely zero values.
- Duo Mission, Campfire, encouragement, and expedition status under each connection state.

**Out of scope:** Changing the shared-score rules, mission catalog, Campfire mechanics, or privacy defaults.

**Acceptance criteria:**

- No partner metric displays `0` unless zero was actually shared.
- Private fields say they are private without pressuring the partner to change a setting.
- Cached data remains visible during a temporary failure and is labeled with its last update time.
- Offline and retry states state that the person's local work is safe.
- Partner absence cannot create or advance a Duo Mission, Campfire response, or expedition contribution.
- Every state is understandable without opening Settings, while repair actions lead to the correct Settings subpage.

**Dependencies:** S1-01 pairing state contract and locked private/shared field matrix.

**Owner:** Together, Campfire and Duo Mission Engineer.

**Required reviewers:** Partner Sync Specialist, Copy Fit Reviewer, Privacy Reviewer, End-to-End Daily Flow Tester.

**Tests required:** Deterministic state fixtures for all eight states, partner privacy permutations, stale cache, offline retry, two-phone mission/Campfire scenarios, and visual checks at narrow iPhone widths.

**Decision request:** None beyond DR-001 unless Robert wants a specific stale threshold. Recommended default for review is 24 hours, with a stronger warning only after 72 hours.

## S1-03: Equipment-aware onboarding

**Objective:** Capture where each person trains before showing the first plan, then build the preview only from allowed equipment.

**Why now:** Current onboarding asks frequency and immediately previews a Planet Fitness plan. The equipment profile appears only later in Settings.

**In scope:**

- New onboarding step after training frequency and before targets/plan.
- Planet Fitness, Home, Full gym, and Custom choices.
- Custom equipment selection using the canonical equipment vocabulary.
- Plan preview generated from the selected profile.
- Onboarding draft isolation until completion.
- Back-navigation persistence for equipment choices.
- Initial saved `trainingProfile` aligned with the preview.

**Out of scope:** Exercise-library expansion, dynamic facility lookup, equipment photos, or silently rewriting an existing user's active week.

**Acceptance criteria:**

- The flow order is welcome, name, body, goal, frequency, equipment, targets, plan, pair, Coach.
- No first plan is shown before a valid equipment choice.
- Custom requires at least one equipment category and always supports Bodyweight as an explicit option.
- Every exercise in the preview passes `Training.equipmentAllows` for the draft profile.
- The completed onboarding state saves exactly the selected gym/equipment profile.
- Going back and forward does not lose the choice or typed onboarding data.
- Existing users do not re-enter onboarding and their active plan is unchanged.
- Robert and Lizzie can independently choose different setups.

**Dependencies:** DR-002, canonical equipment vocabulary, sequential leases on `onboarding.js`, `training.js` if required, `store.js`, `styles.css`, and tests.

**Owner:** Training and Walk Timer Engineer.

**Required reviewers:** Training Logic Reviewer, Product Architect, Accessibility Reviewer, QA.

**Tests required:** All four profiles, custom equipment validation, preview compatibility, back/forward state, completed save, existing-user migration/no-op, and narrow-screen touch targets.

**Decision request:** Confirm explicit choice versus Planet Fitness default. Recommended: explicit choice.

## S1-04: Coach proposal truthfulness

**Objective:** Make every user-facing Coach statement match the locked rule that changes require evidence, a visible proposal, and user approval.

**Why now:** Onboarding currently promises the Coach will "replace" the starting targets after a fortnight, while the AI constitution and Settings use proposals that the person accepts or declines.

**In scope:**

- Onboarding targets explanation and closing letter.
- Coach target-proposal notification and Settings proposal card.
- Evidence disclosure, accept, decline, and no-change outcomes.
- Minimum-data wording that says a proposal depends on enough useful logs, not merely elapsed time.
- Search for any other automatic-change promise in user-facing copy.

**Out of scope:** Changing target mathematics, minimum-day rules, AI prompt permissions, or auto-applying any target.

**Acceptance criteria:**

- No user-facing copy promises automatic target replacement.
- Copy says at least two weeks plus sufficient useful evidence, not exactly fourteen elapsed days regardless of data quality.
- Proposed current and new values are shown before acceptance.
- Accept changes only the listed targets.
- Decline preserves current targets and marks the proposal answered.
- Coach failure or malformed output preserves every current target.
- The exact proposed copy in `DECISION_LOG.md`, or Robert's approved revision, is covered by tests.

**Dependencies:** DR-003 and Personal Representative copy review.

**Owner:** Coach and Goals Engineer.

**Required reviewers:** AI Coach Evaluator, Robert's Personal Representative, Data/Privacy Lead, QA.

**Tests required:** Text contract checks, insufficient-data state, valid proposal, malformed proposal, accept, decline, and no-Claude fallback.

**Decision request:** Approve or revise the recorded proposal wording.

## S1-05: In-app notification clarity

**Objective:** Remove any implication that current notification switches send device push alerts.

**Why now:** The implementation is an in-app notification centre, but the general `Notifications` label can create a false expectation of phone delivery.

**In scope:**

- Rename the Settings group to `In-app notifications`.
- Add the approved explanation that controls affect only InSync's centre.
- Preserve the three bell states: quiet, new information, and unresolved action.
- Review all eight categories for plain-language event descriptions.
- Preserve the deliberate absence of daily pressure-to-log reminders.

**Out of scope:** Service-worker push subscriptions, permission prompts, remote delivery, badges on the operating-system icon, scheduled reminders, or new event categories.

**Acceptance criteria:**

- Settings explicitly says alerts do not reach the phone.
- Notification Centre and Settings use consistent terminology.
- Turning off a category removes only that derived in-app category.
- Opening the centre marks only informational items read; unresolved actions remain until resolved.
- The bell's accessible label correctly distinguishes information from actions.
- No copy claims push, background, or scheduled delivery.

**Dependencies:** DR-004 and sequential lease with S1-06 for Settings.

**Owner:** Achievements and Notification Engineer.

**Required reviewers:** Product Architect, Accessibility Reviewer, Copy Fit Reviewer, QA.

**Tests required:** Notification-category toggles, action persistence, informational-read behavior, accessible labels, no-push copy contract, and empty state.

**Decision request:** Confirm push remains deferred.

## S1-06: Settings information architecture

**Objective:** Turn Settings into a clear hub with focused subpages while preserving every existing control and safeguard.

**Why now:** The current screen places credentials, pairing, privacy, Coach preferences, equipment, targets, notifications, units, recovery, and About in one long scroll.

**In scope:**

- Settings landing hub with the eight groups in D-108.
- Focused subroutes with summaries showing current state where useful.
- Pending Coach proposal at the top of the hub and directly reachable from Notifications.
- Pairing repair route into Together, sharing & sync.
- Preservation of all current fields, toggles, warnings, confirmations, and secret handling.
- Back behavior, deep links, accessibility headings, and route smoke coverage.

**Out of scope:** Rebranding, changing defaults, changing what is shared, introducing accounts, or weakening reset/restore safeguards.

**Acceptance criteria:**

- Every existing Settings control appears exactly once in the new structure.
- A user can reach any group from the hub in one tap and return without losing edits.
- The hub summarizes pairing health, Coach connection, notification state, and training profile without exposing secrets.
- Pending proposals remain prominent and require an explicit accept or decline.
- Secrets are masked, local-only, and excluded from backup.
- Reset and identity-changing restore retain existing confirmations.
- Direct links from Train, Coach, Notifications, and Together open the relevant subpage rather than the top of a long screen.
- Existing `#settings` links continue to work.

**Dependencies:** S1-01, S1-04, S1-05, DR-005, route contract, and sequential file leases.

**Owner:** Settings, Privacy and Data Tools Engineer.

**Required reviewers:** Application Architecture Lead, Accessibility Reviewer, Data/Privacy Lead, Screen Smoke Tester.

**Tests required:** Route smoke tests for every group, control inventory comparison, state persistence, deep links, back navigation, keyboard/focus checks, secret exclusion, restore/reset protections, and narrow-screen layouts.

**Decision request:** Approve hub plus focused subpages or choose jump links on the current page.

## S1-07: History hub

**Objective:** Create one clear entrance to InSync's complete living record and resolve the `History` versus `Calendar` naming conflict.

**Why now:** `#history` currently means meal history while `#calendar` is the broad daily record titled History. Training, body, photos, weekly reviews, and Campfires live on separate routes.

**In scope:**

- New History hub using the destinations in D-110.
- Rename the current meal-only screen and route to Meal history.
- Route compatibility for old `#history` links or an explicit one-time migration strategy.
- Summary facts on hub cards only when derived from existing local data.
- Calendar remains the route to individual days and archived Campfires.
- Preserve historical correction behavior.

**Out of scope:** New analytics, deletion tools, cross-partner history, data-model consolidation, or merging private records.

**Acceptance criteria:**

- `History` opens a hub rather than a meal-only list.
- Every destination in the approved map is reachable in one tap.
- Meal history remains intact under a clear name.
- Existing day-history links, month navigation, weekly reviews, records, cardio, body, trends, photos, and Campfire archive still render.
- Crossing-month Campfire records return to the correct archive month.
- Historical editing still recalculates the selected day and preserves current expedition rules.
- No private history is added to partner sync.
- Empty destinations explain what will appear without suggesting that missing data equals failure.

**Dependencies:** DR-006, route inventory, compatibility decision, sequential leases on `app.js`, `screens.js`, `ui.js` if necessary, `styles.css`, and tests.

**Owner:** Progress, Measurements, Photos and History Engineer.

**Required reviewers:** Application Architecture Lead, Product Architect, Historical Edit and Data Integrity Tester, Accessibility Reviewer.

**Tests required:** Route compatibility, hub links, empty/populated states, calendar navigation, cross-month Campfire return, historical correction, local-only privacy, back navigation, and mobile visual QA.

**Decision request:** Confirm `History` becomes the hub and meal history receives its own destination.

## S1-08: Integrated regression and real-device certification

**Objective:** Independently prove Sprint 1 works as one release on both owners' real phones without data loss or privacy regression.

**Why now:** Unit and repository tests cannot certify install/update behavior, touch layout, camera permissions, app resume, or actual two-phone exchange.

**In scope:**

- Full deterministic repository suite against the full-media production tree.
- Fresh install and upgrade from P6.2 without clearing storage.
- Robert and Lizzie onboarding with different equipment profiles.
- Guided pair, first exchange, stale state, offline entry, reconnect, retry, and wrong-owner recovery.
- Coach proposal accept and decline.
- In-app notification behavior and wording.
- Settings and History navigation.
- Camera, barcode, walk/rest timer, lock/resume, backup/restore, and critical five-tab smoke checks.
- Accessibility and narrow-screen visual pass.

**Out of scope:** Base Camp, new art production, managed backend, push notifications, and Faith.

**Acceptance criteria:**

- Zero unexplained automated failures on the full production repository.
- Existing `insync.v10` data and schema 8 partner exchange survive upgrade.
- Both phones complete pairing and show the same accurate connection state.
- Entries created offline remain local and synchronize after reconnection without duplication or loss.
- No private meal, exact weight, lifted load, photo, reflection, credential, or private preference enters the partner payload.
- All Sprint 1 screens fit and remain operable on both actual phones.
- The app installs, cold-starts offline after caching, resumes after lock, and updates without requiring data reset.
- Release notes, runtime version, and service-worker cache identifier agree.
- QA, not an implementer, signs the release report.
- Robert approves the user-facing release candidate.

**Dependencies:** Completed S1-01 through S1-07, full production media, candidate version/cache update, and actual device access.

**Owner:** Quality Engineering and Release Lead.

**Required reviewers:** Mobile PWA Lead, Data/Privacy Lead, Program Director, Robert.

**Tests required:** Complete automated suite plus the real-device matrix above.

**Decision request:** Robert must identify the exact phone/browser versions used by both owners when certification begins.

## Definition of done for every work package

- The locked decision and assignment packet are cited in the implementation handoff.
- Protected behavior is named before code changes begin.
- Changed behavior has focused deterministic tests.
- Relevant existing regression suites pass.
- Mobile layouts are checked at the smallest supported width.
- Privacy and backup consequences are documented.
- User-facing copy receives Product and Personal Representative review.
- An independent reviewer records pass, fail, or blocked with evidence.
- Release documentation describes only behavior proven in the candidate.

## Sprint 1 non-goals

- Base Camp implementation.
- Faith activation.
- Real push notifications.
- Managed accounts or public release architecture.
- Secure invite identity or signed partner payloads.
- Storage migration to IndexedDB.
- Bulk art replacement.
- Broad visual redesign.
- Global module rewrite.

## Recommended execution sequence

1. Robert resolves the six decision requests.
2. Program Director locks contracts and issues file leases.
3. Pairing state contract is implemented and reviewed.
4. Together consumes the approved pairing states.
5. Equipment onboarding and Coach wording proceed in parallel where file leases do not overlap.
6. Notification wording is completed before Settings assembly.
7. Settings hub integrates approved pairing, Coach, and notification destinations.
8. History hub is implemented under a separate `screens.js` lease.
9. QA merges the candidate, runs the full regression suite, and performs actual two-phone certification.
10. Robert reviews the release candidate and approves release or returns bounded corrections.


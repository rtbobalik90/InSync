# InSync Decision Log

Version 1.0 | September 6, 2026

## Purpose

This is the product decision record for the current InSync production program. It separates decisions already embodied in the product from proposals that still need approval. Agents may recommend changes, but only Robert can move a proposed product decision to Locked.

## Status definitions

| Status | Meaning |
|---|---|
| Locked | Approved or clearly established in the current product. Preserve unless Robert explicitly changes it. |
| Proposed | Recommended direction awaiting Robert's approval or real-device evidence. Do not present as final. |
| Parked | Intentionally outside the current sprint or release. Do not implement incidentally. |
| Superseded | Replaced by a later decision. Preserve only for historical context. |

## Locked decisions

| ID | Decision | Evidence and consequence |
|---|---|---|
| D-001 | InSync is a private, mobile-first health, training, nutrition, journey, and togetherness PWA for Robert and Lizzie. | This is the product mission in the production plan and is reflected throughout the current app. Product decisions should optimize dependable daily use for two people, not public multi-tenant scale. |
| D-002 | The product North Star is: steward the body, grow in faith, and walk the road together. | `intelligence.js` defines this as the AI constitution North Star. Faith may inform the product's heart even while the dedicated Faith feature is parked. |
| D-003 | The five primary navigation areas are Home, Journey, Train, Nutrition, and Together. | `app.js` and `ui.js` define the five-tab shell. Supporting destinations remain secondary routes. |
| D-004 | Each phone has one owner. There is no shared login, account switcher, or combined private record. | Onboarding and Settings state that each device belongs to its owner. Identity-changing restores are blocked when they could overwrite an active paired device. |
| D-005 | The complete personal record is local-first and private by default. | Local store remains `insync.v10`. Exact meals, lifted loads, photographs, reflections, and exact bodyweight do not enter partner sync. |
| D-006 | Partner sharing is explicit and sanitized. | Partner sync remains schema 8. Optional sharing switches cover weight change, energy/protein totals, workouts, and steps. Core Together state includes identity, points, streak, earned badges, messages, and expedition state. |
| D-007 | Coach output is advisory and may never silently modify a person's targets, plan, privacy, partner data, or history. | `intelligence.js` and `prompt-registry.js` require visible proposals and user approval. This rule controls all Sprint 1 Coach copy. |
| D-008 | The app must remain usable without Claude. | Onboarding and Coach screens provide deterministic fallback behavior when no Claude key exists. AI is enhancement, not a core-app dependency. |
| D-009 | Current notification controls affect only InSync's in-app notification centre. | Current code derives notification items from app state. No real device push delivery contract is implemented. Daily pressure-to-log reminders are deliberately absent. |
| D-010 | Daily reminders that shame or pressure a person to log are not part of InSync. | The Notifications screen explicitly explains their absence, and the AI constitution forbids shame, guilt, and streak threats. |
| D-011 | Training plans may use only movements allowed by the person's saved gym and equipment profile. | `training.js` filters exercises by equipment. Settings owns Planet Fitness, Home, Full gym, and Custom equipment profiles. |
| D-012 | Changing gym equipment does not silently rewrite the active week. | Settings and Train preserve the active plan and ask for a deliberate rewrite when it no longer fits the equipment profile. |
| D-013 | Past days remain editable and corrections recalculate the historical day. | History and day-history routes support steps, morning data, meals, workouts, and reflections for an earlier date. |
| D-014 | Weekly Campfires remain in History as read-only records after closing. | P6.1 and P6.2 behavior stores closed Campfires and exposes them from History & Calendar. Each phone closes its own Campfire independently. |
| D-015 | Notes from the Trail remain a permanent, local release journal. | P6.2 stores read status locally, preserves the complete journal, and does not add Trail Notes to partner sync. |
| D-016 | The supplied P6.2 package is transport-slim. Placeholder media is not an app defect or permission to redesign established assets. | `CLAUDE_CODE_START_HERE.md` preserves the asset paths while omitting most heavy non-Grand-Canyon media. Final visual certification requires the full production repository. |
| D-017 | Base Camp must be modular and must not trigger a rewrite of working InSync features. | The Base Camp starter brief reserves domain modules and directs `app.js` and `screens.js` to remain routing surfaces where practical. |
| D-018 | Robert approves major product-heart changes, privacy decisions, and canonical artwork. | The production organization assigns recommendation and review work to agents without transferring product ownership. |

## Sprint 1 decisions authorized for execution

Robert authorized execution of the recommended Sprint 1 plan on September 6, 2026. D-101 through D-111 are therefore locked for this release candidate. Real-device certification in D-111 remains an open release activity, not a completed claim.

| ID | Decision | Approved execution | Why it is needed |
|---|---|---|---|
| D-101 | Keep Sprint 1 pairing on the current private GitHub transport, but replace the raw setup experience with a guided connection wizard and verified status. | Approve. Treat this as a usability and reliability layer, not the final security architecture. | Pairing currently requires a token, repository path, branch, matching partner names, and manual interpretation of sync state. |
| D-102 | Show pairing as a staged status: Not set up, This phone ready, Waiting for partner, Paired and current, Paired but stale, Offline, Needs attention. | Approve. Use plain language plus a details disclosure for technical errors. | A single generic connection line does not tell Robert or Lizzie what has succeeded, what is missing, or what to do next. |
| D-103 | Add a `Where will you train?` onboarding step before the first training-plan preview. | Approve. Recommended order: frequency, equipment, targets, plan. | The current onboarding plan preview always says it was built from Planet Fitness equipment even though the saved equipment profile can later be Home, Full gym, or Custom. |
| D-104 | Do not preselect a gym as if it were known. Require a deliberate choice among Planet Fitness, Home, Full gym, and Custom. | Approve, with Planet Fitness visually listed first but not silently selected. | A wrong default produces a polished but unusable first plan. Requiring one tap prevents incorrect assumptions. |
| D-105 | Change onboarding Coach copy from promising automatic replacement to promising a review and visible proposal after enough evidence exists. | Approve. Use the wording recorded below. | Current copy says the Coach "will replace" starting targets, which conflicts with the locked approval-before-change rule. |
| D-106 | Rename the Settings section and explanatory copy to `In-app notifications` until real push notifications exist. | Approve. | The current `Notifications` label can reasonably be read as phone-level push delivery even though the controls only affect the in-app centre. |
| D-107 | Keep real phone push notifications out of Sprint 1. Add them only after Robert approves exact events, quiet hours, delivery behavior, and privacy handling. | Approve. | Push requires a separate delivery and permission architecture and should not be smuggled into a copy-clarity sprint. |
| D-108 | Replace the single long Settings page with a Settings hub and focused subpages while retaining direct access to urgent Coach proposals. | Approve. Recommended groups are listed below. | Current Settings combines identity, credentials, sync, Coach behavior, training, targets, privacy, notification controls, units, data recovery, and About in one long surface. |
| D-109 | Make `History` a true hub. Move the current meal-only history screen to `Meal history` and preserve its old route through a compatibility alias or redirect. | Approve. | The app currently uses `#calendar` as the broad history destination while `#history` is meal-only. The naming is internally inconsistent and makes history feel fragmented. |
| D-110 | The History hub should link to Calendar & daily records, Weekly reviews, Training sessions, Walking & cardio, Meal history, Body trends, Progress photos, and Campfire archive. | Approve. Surface only categories that already exist and preserve their current records. | This creates one dependable place to find the living record without inventing a new data model. |
| D-111 | Real-device certification on Robert's and Lizzie's actual phones is a release gate, not an optional polish task. | Approve as a standing release rule. | Repository tests do not prove install, update, camera, offline resume, lock-screen timer behavior, or two-phone pairing. |

## Sprint 1 wording contracts

These wording contracts are approved for the Sprint 1 implementation.

### Coach proposal wording

Replace the automatic-change promise in onboarding with:

> These are starting estimates. After at least two weeks of useful logs, the Coach can review what is actually happening and propose adjustments. You will see the evidence and choose whether to use them. Nothing changes without your approval.

Replace the closing letter's automatic language with:

> In about two weeks, if there is enough consistent information to learn from, I can show you what I noticed and propose targets that fit you better. You decide whether anything changes.

### Notification wording

Settings section title:

> In-app notifications

Settings explanation:

> These switches control what appears in InSync's notification centre. They do not send alerts to your phone. InSync does not use a daily reminder to pressure you to log.

Notification-centre footer:

> InSync does not use a daily pressure-to-log reminder. Notification preferences control what appears in this centre.

### Pairing status wording

| State | Primary line | Next action |
|---|---|---|
| Not set up | Partner sync is not set up on this phone. | Start setup |
| This phone ready | This phone can sync. Waiting for your partner's phone. | Show partner steps |
| Waiting for partner | Your shared file is ready, but no valid partner file has arrived yet. | Ask partner to finish setup or retry |
| Paired and current | You and {partner} are in sync. | Show last successful exchange |
| Paired but stale | The connection works, but {partner}'s last update is older than expected. | Sync now |
| Offline | This phone is offline. Your entries are safe here and will retry when you reconnect. | Retry when online |
| Needs attention | Partner sync needs attention. Your local entries are still safe. | Open repair steps |

## Proposed Settings information architecture

The Settings landing page should remain a hub, not another infinite form. A pending Coach proposal appears at the top because it asks for a decision.

| Group | Contents |
|---|---|
| Profile & goals | Name, body profile, primary goal, daily targets, gym-day frequency |
| Training setup | Gym type, custom equipment, effort style, automatic rest timer, default rest |
| Coach & intelligence | Claude connection, model, tone, directness, meal complexity, training style, privacy explanation |
| Together, sharing & sync | Partner identity, sharing preview, privacy switches, guided GitHub connection, sync health, manual retry |
| In-app notifications | Eight existing notification categories and the no-push explanation |
| Units & display | Weight, distance, and energy units |
| Data & recovery | Backup, restore, local-data explanation, start over with safeguards |
| About InSync | Version, Trail Notes, days walked, badges, product statement |

## Proposed History hub information architecture

| Destination | Existing source | Hub summary |
|---|---|---|
| Calendar & daily records | `calendar`, `day-history` | Review or correct any day |
| Weekly reviews | `weekly-review` | See completed weekly chapters and carry-forward focus |
| Training sessions | `workouts`, `records` | Review sessions, movements, and progression |
| Walking & cardio | `cardio` | Review walking and cardio history |
| Meal history | current `history` screen | Review meals by date |
| Body trends | `body`, `trends` | Review weight and measurements over time |
| Progress photos | `photos` | Review local-only progress images |
| Campfire archive | `campfire-history` records listed in Calendar | Revisit closed weekly conversations |

## Parked decisions

| ID | Decision | Revisit trigger |
|---|---|---|
| D-201 | The dedicated Faith feature remains parked. | Robert explicitly reactivates the Faith product scope after the current reliability, friction, Base Camp, and art program. |
| D-202 | Secure invite-based identity, signed partner envelopes, and a managed sync service are parked for the platform-hardening sprint. | Sprint 1 proves the guided flow and Robert approves moving beyond the current private prototype. |
| D-203 | Moving Claude and partner credentials behind an authenticated backend is parked for platform hardening. | InSync expands beyond private use or Robert prioritizes removing browser-held secrets sooner. |
| D-204 | IndexedDB canonical storage and encrypted automatic recovery are parked for platform hardening. | Sprint 0 backup/restore evidence is complete and the storage migration contract is approved. |
| D-205 | Real phone push notifications are parked. | Robert approves notification events, quiet hours, permission timing, privacy rules, and whether both people want them. |
| D-206 | Base Camp earned-XP economy, land expansion, partner visits, and full object catalog are parked beyond the local-only Base Camp 1.0 slice. | The 6×6 starter camp passes state, collision, backup, upgrade, and mobile interaction testing. |
| D-207 | Bulk creation of remaining expedition, badge, and exercise artwork is parked until the full production media repository is restored and the Grand Canyon reference is verified. | Full-media baseline is available and one additional expedition pack is approved end-to-end. |
| D-208 | Large-scale refactoring of global application modules is parked. | A bounded change requires extraction and behavioral-equivalence tests prove it can be done safely. |

## Resolved Sprint 1 requests

Robert's September 6, 2026 instruction to execute the plan authorized each recommended answer below.

| Request | Choices | Executed answer | Work package |
|---|---|---|---|
| DR-001: Sprint 1 pairing transport | A. Improve the current private GitHub flow. B. Stop and build the managed backend now. | A. Improve the current flow now; keep the managed backend in platform hardening. | S1-01 and S1-02 |
| DR-002: Onboarding equipment choice | A. Require an explicit gym/equipment choice. B. Keep Planet Fitness preselected. | A. Require a choice, with Planet Fitness listed first. | S1-03 |
| DR-003: Coach promise | A. Coach proposes and the user approves. B. Coach automatically changes targets after two weeks. | A. This matches the existing safety constitution and current Settings approval flow. | S1-04 |
| DR-004: Notifications | A. Clarify in-app only and defer push. B. Add real phone push in Sprint 1. | A. Clarify now and design push separately. | S1-05 |
| DR-005: Settings structure | A. Hub plus focused subpages. B. Keep one long scrolling page and add jump links. | A. Hub plus focused subpages. | S1-06 |
| DR-006: History route | A. Make `History` the hub and rename meal history. B. Keep `History` meal-only and continue using Calendar as the broad history page. | A. Make `History` the hub and preserve the old meal route through compatibility handling. | S1-07 |

## Change protocol

1. A proposal is added with its owner, evidence, and affected work packages.
2. Robert approves, rejects, modifies, or parks it.
3. The Decision Librarian updates the status and date before implementation starts.
4. The Dependency Planner updates affected backlog items.
5. The Documentation Steward verifies release notes and user-facing copy against the locked decision.

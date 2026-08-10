# InSync 5.5.6 — Lizzie Deep Audit

## Why this release exists

After the 5.5.5 planner-reliability fix, the entire app was re-audited with Lizzie treated as the local device owner rather than as a partner fixture. This pass went beyond **Set up my next week** and traced second-user identity, onboarding state, units, targets, Coach state, meal/training staging, weekly review, history, notifications, backup/restore, privacy and both directions of two-phone sync.

The audit found several real issues that could affect a valid second-user installation even though the main happy-path tests were green.

## Second-user state hardening

- **Get stronger now persists.** The onboarding value `strong` was previously removed by reload normalization and silently fell back to lose-fat.
- A stale `coachPending` flag is cleared on app load/import so an iOS suspension or close cannot leave Coach stuck on **Thinking…** forever.
- The chosen daily verse now keeps its real `{date,index,why}` shape across reloads instead of being silently discarded and re-requested.
- `profile.startWeight` and weekly Coach `chapters` are part of the normalized state contract. Malformed chapter data can no longer break Coach.
- Weekly chapters are canonical Monday–Sunday records. Older rolling seven-day chapters are migrated to their calendar Monday and duplicate writes in the same week collapse to the newest one.
- Valid profile sex is restricted to the supported `Male` / `Female` values; malformed restored text is cleared before it can enter target or Coach logic.
- Single-word owner/partner initials now use the same two-letter rule everywhere (`Lizzie` → `LI`, `Robert` → `RO`).

## Real unit support

InSync still stores canonical pounds, miles and kilocalories internally, but the selected display/input units are now honored consistently.

- **kg:** bodyweight, morning logging, manual workouts, active-session lift history, Coach proposals and Settings inputs convert both directions safely.
- **km:** walking trends, weekly review, expedition summaries and arrival/next-leg cards use the selected distance unit.
- **kJ:** Home, Nutrition, meal logging/editing, history, weekly review, Coach context/proposals and Settings targets display kJ and convert typed kJ back to canonical kcal.
- Arrival climb now reads the route leg's real climb field and converts feet to metres for metric users.
- Lower bodyweight goals are no longer blocked by the old 120-lb Coach proposal floor; proposals are converted from the user's selected weight unit before storage.

## Next-week reliability and preference changes

- Completed meal batches are now persisted as each batch succeeds. If batch 3 fails, retry resumes from batch 3 instead of rebuilding Monday–Thursday.
- Prepared meal readiness requires complete dated recipes with grocery ingredients and instructions, not just 28 placeholder rows.
- Prepared training readiness validates real exercise IDs, current dislike/discomfort preferences, exact lifting frequency and recovery rules.
- A staged training week is valid for exactly its intended Monday. If the phone stays closed past that week, the expired plan is discarded rather than promoted late.
- Settings now exposes the **Primary goal** and **Gym days** controls that onboarding already promised could be changed later.
- Changing goal or gym frequency keeps the current week intact but invalidates a staged future training week and its stale future lifting goal so the next setup is regenerated under the new preference.
- All built-in 2-, 3-, 4-, 5- and 6-day plans are regression-checked against the same validator used for Claude plans.

## Two-phone identity safety

- Partner cache, history, expedition miles, pending invite/reactions and sync-health stamps are cleared when the configured partner identity materially changes. Capitalization-only edits keep the cache.
- A material owner rename clears the old green sync-health success timestamp and, when GitHub sync is connected, Settings warns that the private sync filename is changing.
- Restore now blocks a backup belonging to a different owner from being placed over an already-onboarded paired device. This prevents one phone from keeping its local connection keys while accidentally adopting the other person's sync identity.
- An onboarded backup without a valid owner name is rejected transactionally.
- A permanent two-device symmetry test proves Lizzie writes only `sync/lizzie.json`, Robert writes only `sync/robert.json`, privacy direction reverses correctly, invite decisions travel both ways, and a payload with the wrong owner identity is rejected.

## Preserved planner fix

5.5.5's bounded meal generation remains in place: four meal batches, one repair attempt per batch, visible progress, home-cooked validation, exact 28-slot completion and training generation only after the meal week is complete.

## Version contract

- App/UI: **5.5.6**
- Local state: **v10**
- Partner sync: **schema 6**
- Service-worker cache: **insync-v10-15**

No partner payload fields were widened in this release, so sync schema 6 remains compatible with the prior build while both phones update.

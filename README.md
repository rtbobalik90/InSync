# InSync 6.0.0-p5.3 — Journey Checkpoints & Expedition Art Slots

InSync p5.3 adds the first production-ready **place-memory layer** to Journey. Active travel and reached destinations are now different visual moments: Travel/Leg artwork carries the route while miles are being accumulated; Checkpoint Arrival artwork unlocks when a real location is reached and stays available as a permanent tappable place page.

## Journey checkpoint experience
- Every expedition now has an explicit checkpoint catalog in `journeys.js`.
- The starting checkpoint is unlocked immediately when an expedition begins.
- Before the first mile, Journey opens on the scenic starting-checkpoint art slot.
- Once movement begins, Journey switches to the current Travel/Leg art slot.
- Completing a leg records its destination checkpoint and opens the **Arrived** moment.
- Reached checkpoint names become tappable in Journey.
- Checkpoint pages show the scenic place image, reached date when known, previous-leg breakdown, cumulative distance and the recorded two-person contribution when available.
- Future checkpoints remain locked and their scenic arrival asset is not exposed by the locked detail page.
- The final checkpoint remains a real place page; a separate **Expedition Complete** screen owns the whole-route Arrival Ceremony artwork and recap.

## Image-ready before the artwork is delivered
The new paths are reserved now, but no new expedition artwork is required to install p5.3. `UI.screen` layers the existing known-good production artwork underneath the future image slot. Reserved image slots ship as tiny transparent WebP placeholders, so the known-good artwork remains visible until each finished image replaces its placeholder.

New asset families:
- `assets/art/<route>/sections/<surface>.webp`
- `assets/art/<route>/travel/leg-XX.webp`
- `assets/art/<route>/checkpoints/checkpoint-XX.webp`

See **`EXPEDITION_ASSET_DROP_GUIDE.md`** for every exact filename across all 12 routes.

## Checkpoint history and migration
Checkpoint history is additive inside local state `insync.v10`. Existing route progress is converted into unlocked checkpoint records without inventing facts. If an older install already passed a checkpoint but has no trustworthy historical timestamp or contribution split, the place remains unlocked and the detail page explicitly says those missing values were not guessed.

Newly reached checkpoints can retain:
- checkpoint index;
- reached timestamp;
- completed leg index;
- local leg miles;
- partner leg miles.

Partner-sync schema remains **7**. No destructive reset or protocol downgrade is required.

## Expedition-aware app art slots
The current expedition is now ready to provide dedicated art for:
- Home;
- Journey;
- Train;
- Nutrition;
- Together;
- Coach;
- Base Camp;
- whole-expedition Arrival Ceremony.

Until those images are supplied, each screen retains its existing production artwork underneath the new slot.

## Existing p5.2 usability work remains
- Morning Check-In is Home's pre-scroll priority from 4:00 AM through 11:59 AM.
- Nightly Review is Home's pre-scroll priority from 6:00 PM onward.
- Historical days can be corrected for steps, morning metrics, meals, workouts and nightly review.
- Barcode-photo fallback uses the shared camera path and resized JPEG processing.
- Training 2.0 and Nutrition 2.0 remain intact.
- Faith remains parked and is not re-enabled by this release.

## Active primary experience
**Home · Journey · Train · Nutrition · Together**

Coach remains globally accessible.

## Compatibility
- App/UI: `6.0.0-p5.3`
- Local state: `insync.v10` — unchanged
- Partner sync: schema `7` — unchanged
- Service worker: `insync-v10-25`
- No data reset required

## Verification
**1,731 automated assertions pass with 0 failures** before packaging. The packaged full build is also extracted and retested in a clean directory before release.

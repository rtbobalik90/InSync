# InSync 6.0.0-p5.3 — Journey Checkpoints & Expedition Art Slots

## Reached places are now real destinations
Journey no longer treats a route only as a list of mileage segments. Each expedition now has a checkpoint catalog beginning with its actual starting place and continuing through the destinations reached along the road.

- Starting checkpoint unlocks when the expedition begins.
- Before the first mile, Journey shows the starting checkpoint art slot.
- Once walking begins, Journey changes to the active Travel/Leg artwork.
- Completing a leg unlocks its destination checkpoint.
- The arrival moment now uses the dedicated scenic checkpoint image slot rather than simply recycling travel artwork.
- Reached locations remain tappable from Journey and open a permanent checkpoint detail page.
- Locked future checkpoint pages do not expose their destination artwork.

## Checkpoint detail pages
Unlocked place pages include:
- scenic checkpoint hero;
- reached date when it is known;
- route and checkpoint identity;
- previous-leg breakdown;
- leg distance;
- cumulative distance from the route start;
- climb when the catalog provides it;
- local/partner contribution for newly recorded checkpoints.

Existing users retain previously reached locations. Migration never fabricates a date or contribution split when the old state did not contain enough information.

## Whole-route completion is separate
The final checkpoint and the expedition-completion ceremony are intentionally separate product moments.

- Final checkpoint: **you reached this actual place**.
- Arrival Ceremony: **you completed the entire expedition**.

A new `#expedition-complete/<routeId>` surface uses `sections/arrival.webp`, summarizes distance/legs/places, shows recorded contribution when trustworthy, and provides a route-memory list back into the reached checkpoint pages.

## Image-ready Theme Engine slots
Every one of the 12 routes now reserves deterministic image paths for:
- eight app sections;
- each Travel/Leg image;
- each Checkpoint Arrival image.

The feature can ship before new images are generated. Transparent v2 placeholders reveal the current known-good production art underneath until the finished files replace them. See `EXPEDITION_ASSET_DROP_GUIDE.md` for exact drop paths.

## Storage and sync
- Adds `expedition.arrivals` inside local state v10.
- Starting and newly reached checkpoint records are local-first.
- Partner progress can create the matching arrival record when sync advances the shared leg.
- Partner sync remains schema 7.
- No data reset required.

## Versioning
- App/UI: `6.0.0-p5.3`
- Local state: `insync.v10`
- Partner sync: schema `7`
- Service worker: `insync-v10-25`

## Still preserved from p5.2
Time-aware Home Morning Check-In/Nightly Review, editable past-day history, barcode-photo hotfix, Training 2.0, Nutrition 2.0 and parked Faith all remain intact.

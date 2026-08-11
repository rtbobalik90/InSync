# InSync 6.0.0-p5.4 — Grand Canyon Production Art Pack

P5.4 installs the first complete production expedition-art pack into the checkpoint-aware Journey system introduced in p5.3. Grand Canyon Rim to Rim now has real artwork across the recurring app sections, all four active travel legs, and all five checkpoint-arrival places.

## Grand Canyon art now live
Delivered production artwork:
- Home / Daily Camp — four time-aware states: dawn, day, sunset, night
- Journey / The Road
- Train
- Nutrition / Provisions
- Together
- Coach
- Base Camp environment
- Final Arrival Ceremony
- 4 Travel / Leg images
- 5 Checkpoint Arrival images: North Rim Trailhead, Cottonwood Camp, Phantom Ranch, Indian Garden, South Rim

The source PNGs were converted to optimized WebP assets at their original 941×1672 vertical composition so they remain crisp on mobile without pushing the PWA over the production asset-budget gate.

## Time-aware Grand Canyon Home
Grand Canyon is the first expedition with a complete four-state Home pack. `Journeys.homeArt()` selects the correct artwork from the same `Store.timeOfDay()` state already used by InSync:
- `home-dawn.webp`
- `home-day.webp`
- `home-sunset.webp`
- `home-night.webp`

Other expeditions continue using their generic reserved `sections/home.webp` slot until a complete time-aware set is delivered, so incomplete packs never create broken heroes.

## Journey behavior preserved
- Starting checkpoint is unlocked when the expedition begins.
- Before the first mile, Journey uses the scenic starting checkpoint image.
- Once movement begins, Journey uses the active Travel / Leg artwork.
- Completing a leg unlocks its destination checkpoint and arrival moment.
- Reached checkpoints remain tappable permanent place pages.
- Locked future checkpoint pages do not reveal the scenic art early.
- The final checkpoint remains distinct from the whole-expedition Final Arrival Ceremony.

## Compatibility
- App/UI: `6.0.0-p5.4`
- Local state: `insync.v10` — unchanged
- Partner sync: schema `7` — unchanged
- Service worker: `insync-v10-26`
- Faith remains parked
- No data reset required

## Verification
The active automated suite passes **1,787 assertions with 0 failures**. The final full ZIP and a clean p5.3 → p5.4 replacement-file upgrade are both retested after packaging.

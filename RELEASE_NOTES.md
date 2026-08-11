# InSync 6.0.0-p5.4 — Grand Canyon Production Art Pack

## First expedition art pack installed
Grand Canyon Rim to Rim is now the first expedition to replace the transparent Theme Engine placeholders with finished production artwork.

Installed:
- 4 time-aware Home / Daily Camp images
- Journey hero
- Train hero
- Nutrition / Provisions hero
- Together hero
- Coach hero
- Base Camp environment
- Final Arrival Ceremony
- 4 active Travel / Leg images
- 5 scenic Checkpoint Arrival images

## Home changes with the real day
The Grand Canyon Home hero now follows InSync's existing dawn/day/sunset/night state. The four images supplied for Daily Camp are all used rather than collapsing the set into one static Home image.

## Checkpoint system
The p5.3 behavior remains intact: Travel art represents movement between places; checkpoint art represents the place actually reached. North Rim Trailhead is available at expedition start, then Cottonwood Camp, Phantom Ranch, Indian Garden and South Rim unlock as their legs are completed.

## Performance
The original vertical PNGs were converted to optimized WebP while retaining the 941×1672 source dimensions. The complete build remains under the existing production asset-size gate.

## Versioning
- App/UI: `6.0.0-p5.4`
- Local state: `insync.v10`
- Partner sync: schema `7`
- Service worker: `insync-v10-26`
- No reset required

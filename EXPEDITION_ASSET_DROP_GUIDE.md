# InSync 6.0.0-p5.3 — Expedition Image Drop Guide

## The important part

The checkpoint/Journey feature is already wired. **You do not need to wait for the artwork to use this build.** Every new asset path has a known-good legacy fallback underneath it. Every reserved slot currently contains a tiny transparent WebP, so InSync shows the existing art underneath until the finished image replaces that placeholder.

When the generated art is ready, place each image at the exact path below. Keep filenames and folders unchanged. Recommended format: **WebP, vertical 9:16**.

### Three distinct image jobs

- **Section art:** recurring Home/Journey/Train/Nutrition/Together/Coach/Base Camp/whole-expedition Arrival Ceremony.
- **Travel art:** active route segment while miles are being accumulated.
- **Checkpoint art:** scenic place image unlocked after the actual destination is reached. Checkpoint `00` is the starting point and is unlocked immediately.

**Final checkpoint ≠ Arrival Ceremony.** The final checkpoint is the actual place reached. `sections/arrival.webp` is the heightened whole-route completion image.

## Universal section filenames

Every expedition uses the same 8 filenames:

```text
sections/home.webp
sections/journey.webp
sections/train.webp
sections/nutrition.webp
sections/together.webp
sections/coach.webp
sections/base-camp.webp
sections/arrival.webp
```

## Camino de Santiago — `camino`

Base folder: `assets/art/camino/`

### App sections

- `assets/art/camino/sections/home.webp`
- `assets/art/camino/sections/journey.webp`
- `assets/art/camino/sections/train.webp`
- `assets/art/camino/sections/nutrition.webp`
- `assets/art/camino/sections/together.webp`
- `assets/art/camino/sections/coach.webp`
- `assets/art/camino/sections/base-camp.webp`
- `assets/art/camino/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Saint-Jean-Pied-de-Port → Roncesvalles: `assets/art/camino/travel/leg-01.webp`
- Leg 02 — Roncesvalles → Zubiri: `assets/art/camino/travel/leg-02.webp`
- Leg 03 — Zubiri → Pamplona: `assets/art/camino/travel/leg-03.webp`
- Leg 04 — Pamplona → Puente la Reina: `assets/art/camino/travel/leg-04.webp`
- Leg 05 — Puente la Reina → Estella: `assets/art/camino/travel/leg-05.webp`
- Leg 06 — Estella → Los Arcos: `assets/art/camino/travel/leg-06.webp`

### Checkpoint arrival images

- Checkpoint 00 — Saint-Jean-Pied-de-Port Trailhead: `assets/art/camino/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Roncesvalles: `assets/art/camino/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Zubiri: `assets/art/camino/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Pamplona: `assets/art/camino/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Puente la Reina: `assets/art/camino/checkpoints/checkpoint-04.webp` — unlocks after leg 4
- Checkpoint 05 — Estella: `assets/art/camino/checkpoints/checkpoint-05.webp` — unlocks after leg 5
- Checkpoint 06 — Los Arcos: `assets/art/camino/checkpoints/checkpoint-06.webp` — unlocks after leg 6

## Milford Track — `milford`

Base folder: `assets/art/milford/`

### App sections

- `assets/art/milford/sections/home.webp`
- `assets/art/milford/sections/journey.webp`
- `assets/art/milford/sections/train.webp`
- `assets/art/milford/sections/nutrition.webp`
- `assets/art/milford/sections/together.webp`
- `assets/art/milford/sections/coach.webp`
- `assets/art/milford/sections/base-camp.webp`
- `assets/art/milford/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Glade Wharf → Clinton Hut: `assets/art/milford/travel/leg-01.webp`
- Leg 02 — Clinton Hut → Mintaro Hut: `assets/art/milford/travel/leg-02.webp`
- Leg 03 — Mintaro Hut → Dumpling Hut: `assets/art/milford/travel/leg-03.webp`
- Leg 04 — Dumpling Hut → Sandfly Point: `assets/art/milford/travel/leg-04.webp`

### Checkpoint arrival images

- Checkpoint 00 — Glade Wharf: `assets/art/milford/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Clinton Hut: `assets/art/milford/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Mintaro Hut: `assets/art/milford/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Dumpling Hut: `assets/art/milford/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Sandfly Point: `assets/art/milford/checkpoints/checkpoint-04.webp` — unlocks after leg 4

## Grand Canyon rim to rim — `grand`

**STATUS: PRODUCTION ART DELIVERED in p5.4.**

Base folder: `assets/art/grand/`

### Time-aware Home (Grand Canyon first complete pack)

- Dawn: `assets/art/grand/sections/home-dawn.webp`
- Day: `assets/art/grand/sections/home-day.webp`
- Sunset/dusk: `assets/art/grand/sections/home-sunset.webp`
- Night: `assets/art/grand/sections/home-night.webp`

InSync selects these automatically from `Store.timeOfDay()`. The generic `sections/home.webp` remains a reserved compatibility slot.

### App sections

- `assets/art/grand/sections/home.webp`
- `assets/art/grand/sections/journey.webp`
- `assets/art/grand/sections/train.webp`
- `assets/art/grand/sections/nutrition.webp`
- `assets/art/grand/sections/together.webp`
- `assets/art/grand/sections/coach.webp`
- `assets/art/grand/sections/base-camp.webp`
- `assets/art/grand/sections/arrival.webp`

### Travel / leg images

- Leg 01 — North Rim → Cottonwood Camp: `assets/art/grand/travel/leg-01.webp`
- Leg 02 — Cottonwood Camp → Phantom Ranch: `assets/art/grand/travel/leg-02.webp`
- Leg 03 — Phantom Ranch → Indian Garden: `assets/art/grand/travel/leg-03.webp`
- Leg 04 — Indian Garden → South Rim: `assets/art/grand/travel/leg-04.webp`

### Checkpoint arrival images

- Checkpoint 00 — North Rim Trailhead: `assets/art/grand/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Cottonwood Camp: `assets/art/grand/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Phantom Ranch: `assets/art/grand/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Indian Garden: `assets/art/grand/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — South Rim: `assets/art/grand/checkpoints/checkpoint-04.webp` — unlocks after leg 4

## Inca Trail to Machu Picchu — `inca`

Base folder: `assets/art/inca/`

### App sections

- `assets/art/inca/sections/home.webp`
- `assets/art/inca/sections/journey.webp`
- `assets/art/inca/sections/train.webp`
- `assets/art/inca/sections/nutrition.webp`
- `assets/art/inca/sections/together.webp`
- `assets/art/inca/sections/coach.webp`
- `assets/art/inca/sections/base-camp.webp`
- `assets/art/inca/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Km 82 → Wayllabamba: `assets/art/inca/travel/leg-01.webp`
- Leg 02 — Wayllabamba → Pacaymayo: `assets/art/inca/travel/leg-02.webp`
- Leg 03 — Pacaymayo → Wiñay Wayna: `assets/art/inca/travel/leg-03.webp`
- Leg 04 — Wiñay Wayna → Machu Picchu: `assets/art/inca/travel/leg-04.webp`

### Checkpoint arrival images

- Checkpoint 00 — Km 82 Trailhead: `assets/art/inca/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Wayllabamba: `assets/art/inca/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Pacaymayo: `assets/art/inca/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Wiñay Wayna: `assets/art/inca/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Machu Picchu: `assets/art/inca/checkpoints/checkpoint-04.webp` — unlocks after leg 4

## Jesus Trail — `jesus`

Base folder: `assets/art/jesus/`

### App sections

- `assets/art/jesus/sections/home.webp`
- `assets/art/jesus/sections/journey.webp`
- `assets/art/jesus/sections/train.webp`
- `assets/art/jesus/sections/nutrition.webp`
- `assets/art/jesus/sections/together.webp`
- `assets/art/jesus/sections/coach.webp`
- `assets/art/jesus/sections/base-camp.webp`
- `assets/art/jesus/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Nazareth → Cana: `assets/art/jesus/travel/leg-01.webp`
- Leg 02 — Cana → Kibbutz Lavi: `assets/art/jesus/travel/leg-02.webp`
- Leg 03 — Lavi → Moshav Arbel: `assets/art/jesus/travel/leg-03.webp`
- Leg 04 — Arbel → Capernaum: `assets/art/jesus/travel/leg-04.webp`

### Checkpoint arrival images

- Checkpoint 00 — Nazareth Trail Start: `assets/art/jesus/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Cana: `assets/art/jesus/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Kibbutz Lavi: `assets/art/jesus/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Moshav Arbel: `assets/art/jesus/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Capernaum: `assets/art/jesus/checkpoints/checkpoint-04.webp` — unlocks after leg 4

## Mount Sinai — `sinai`

Base folder: `assets/art/sinai/`

### App sections

- `assets/art/sinai/sections/home.webp`
- `assets/art/sinai/sections/journey.webp`
- `assets/art/sinai/sections/train.webp`
- `assets/art/sinai/sections/nutrition.webp`
- `assets/art/sinai/sections/together.webp`
- `assets/art/sinai/sections/coach.webp`
- `assets/art/sinai/sections/base-camp.webp`
- `assets/art/sinai/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Saint Catherine’s Monastery → Elijah’s Basin: `assets/art/sinai/travel/leg-01.webp`
- Leg 02 — Elijah’s Basin → The summit: `assets/art/sinai/travel/leg-02.webp`
- Leg 03 — The summit → The Camel Path: `assets/art/sinai/travel/leg-03.webp`

### Checkpoint arrival images

- Checkpoint 00 — Saint Catherine’s Monastery Trail Start: `assets/art/sinai/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Elijah’s Basin: `assets/art/sinai/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Mount Sinai Summit: `assets/art/sinai/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Camel Path: `assets/art/sinai/checkpoints/checkpoint-03.webp` — unlocks after leg 3

## Tour du Mont Blanc — `montblanc`

Base folder: `assets/art/montblanc/`

### App sections

- `assets/art/montblanc/sections/home.webp`
- `assets/art/montblanc/sections/journey.webp`
- `assets/art/montblanc/sections/train.webp`
- `assets/art/montblanc/sections/nutrition.webp`
- `assets/art/montblanc/sections/together.webp`
- `assets/art/montblanc/sections/coach.webp`
- `assets/art/montblanc/sections/base-camp.webp`
- `assets/art/montblanc/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Les Houches → Les Contamines: `assets/art/montblanc/travel/leg-01.webp`
- Leg 02 — Les Contamines → Croix du Bonhomme: `assets/art/montblanc/travel/leg-02.webp`
- Leg 03 — Croix du Bonhomme → Courmayeur: `assets/art/montblanc/travel/leg-03.webp`
- Leg 04 — Courmayeur → Refuge Bonatti: `assets/art/montblanc/travel/leg-04.webp`
- Leg 05 — Refuge Bonatti → La Fouly: `assets/art/montblanc/travel/leg-05.webp`
- Leg 06 — La Fouly → Champex: `assets/art/montblanc/travel/leg-06.webp`
- Leg 07 — Champex → Les Houches: `assets/art/montblanc/travel/leg-07.webp`

### Checkpoint arrival images

- Checkpoint 00 — Les Houches — Start: `assets/art/montblanc/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Les Contamines: `assets/art/montblanc/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Croix du Bonhomme: `assets/art/montblanc/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Courmayeur: `assets/art/montblanc/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Refuge Bonatti: `assets/art/montblanc/checkpoints/checkpoint-04.webp` — unlocks after leg 4
- Checkpoint 05 — La Fouly: `assets/art/montblanc/checkpoints/checkpoint-05.webp` — unlocks after leg 5
- Checkpoint 06 — Champex: `assets/art/montblanc/checkpoints/checkpoint-06.webp` — unlocks after leg 6
- Checkpoint 07 — Les Houches — Return: `assets/art/montblanc/checkpoints/checkpoint-07.webp` — unlocks after leg 7

## John Muir Trail — `muir`

Base folder: `assets/art/muir/`

### App sections

- `assets/art/muir/sections/home.webp`
- `assets/art/muir/sections/journey.webp`
- `assets/art/muir/sections/train.webp`
- `assets/art/muir/sections/nutrition.webp`
- `assets/art/muir/sections/together.webp`
- `assets/art/muir/sections/coach.webp`
- `assets/art/muir/sections/base-camp.webp`
- `assets/art/muir/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Happy Isles → Tuolumne Meadows: `assets/art/muir/travel/leg-01.webp`
- Leg 02 — Tuolumne Meadows → Reds Meadow: `assets/art/muir/travel/leg-02.webp`
- Leg 03 — Reds Meadow → Mono Creek: `assets/art/muir/travel/leg-03.webp`
- Leg 04 — Mono Creek → Muir Trail Ranch: `assets/art/muir/travel/leg-04.webp`
- Leg 05 — Muir Trail Ranch → LeConte Canyon: `assets/art/muir/travel/leg-05.webp`
- Leg 06 — LeConte Canyon → Whitney Portal: `assets/art/muir/travel/leg-06.webp`

### Checkpoint arrival images

- Checkpoint 00 — Happy Isles Trailhead: `assets/art/muir/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Tuolumne Meadows: `assets/art/muir/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Reds Meadow: `assets/art/muir/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Mono Creek: `assets/art/muir/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Muir Trail Ranch: `assets/art/muir/checkpoints/checkpoint-04.webp` — unlocks after leg 4
- Checkpoint 05 — LeConte Canyon: `assets/art/muir/checkpoints/checkpoint-05.webp` — unlocks after leg 5
- Checkpoint 06 — Whitney Portal: `assets/art/muir/checkpoints/checkpoint-06.webp` — unlocks after leg 6

## Torres del Paine circuit — `paine`

Base folder: `assets/art/paine/`

### App sections

- `assets/art/paine/sections/home.webp`
- `assets/art/paine/sections/journey.webp`
- `assets/art/paine/sections/train.webp`
- `assets/art/paine/sections/nutrition.webp`
- `assets/art/paine/sections/together.webp`
- `assets/art/paine/sections/coach.webp`
- `assets/art/paine/sections/base-camp.webp`
- `assets/art/paine/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Laguna Amarga → Serón: `assets/art/paine/travel/leg-01.webp`
- Leg 02 — Serón → Refugio Dickson: `assets/art/paine/travel/leg-02.webp`
- Leg 03 — Dickson → John Gardner Pass: `assets/art/paine/travel/leg-03.webp`
- Leg 04 — Grey Glacier → Paine Grande: `assets/art/paine/travel/leg-04.webp`
- Leg 05 — Paine Grande → Base of the Towers: `assets/art/paine/travel/leg-05.webp`

### Checkpoint arrival images

- Checkpoint 00 — Laguna Amarga: `assets/art/paine/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Serón: `assets/art/paine/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Refugio Dickson: `assets/art/paine/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — John Gardner Pass: `assets/art/paine/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Grey Glacier: `assets/art/paine/checkpoints/checkpoint-04.webp` — unlocks after leg 3 (secondary place on that leg)
- Checkpoint 05 — Paine Grande: `assets/art/paine/checkpoints/checkpoint-05.webp` — unlocks after leg 4
- Checkpoint 06 — Base of the Towers: `assets/art/paine/checkpoints/checkpoint-06.webp` — unlocks after leg 5

## Appalachian Trail, southern section — `appalachian`

Base folder: `assets/art/appalachian/`

### App sections

- `assets/art/appalachian/sections/home.webp`
- `assets/art/appalachian/sections/journey.webp`
- `assets/art/appalachian/sections/train.webp`
- `assets/art/appalachian/sections/nutrition.webp`
- `assets/art/appalachian/sections/together.webp`
- `assets/art/appalachian/sections/coach.webp`
- `assets/art/appalachian/sections/base-camp.webp`
- `assets/art/appalachian/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Springer Mountain → Hawk Mountain: `assets/art/appalachian/travel/leg-01.webp`
- Leg 02 — Hawk Mountain → Neel Gap: `assets/art/appalachian/travel/leg-02.webp`
- Leg 03 — Neel Gap → Unicoi Gap: `assets/art/appalachian/travel/leg-03.webp`
- Leg 04 — Unicoi Gap → Dicks Creek Gap: `assets/art/appalachian/travel/leg-04.webp`
- Leg 05 — Dicks Creek Gap → Bly Gap: `assets/art/appalachian/travel/leg-05.webp`
- Leg 06 — Bly Gap → Standing Indian: `assets/art/appalachian/travel/leg-06.webp`
- Leg 07 — Standing Indian → Wayah Bald: `assets/art/appalachian/travel/leg-07.webp`
- Leg 08 — Wayah Bald → Nantahala Outdoor Center: `assets/art/appalachian/travel/leg-08.webp`

### Checkpoint arrival images

- Checkpoint 00 — Springer Mountain Trail Start: `assets/art/appalachian/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Hawk Mountain: `assets/art/appalachian/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Neel Gap: `assets/art/appalachian/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Unicoi Gap: `assets/art/appalachian/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Dicks Creek Gap: `assets/art/appalachian/checkpoints/checkpoint-04.webp` — unlocks after leg 4
- Checkpoint 05 — Bly Gap: `assets/art/appalachian/checkpoints/checkpoint-05.webp` — unlocks after leg 5
- Checkpoint 06 — Standing Indian: `assets/art/appalachian/checkpoints/checkpoint-06.webp` — unlocks after leg 6
- Checkpoint 07 — Wayah Bald: `assets/art/appalachian/checkpoints/checkpoint-07.webp` — unlocks after leg 7
- Checkpoint 08 — Nantahala Outdoor Center: `assets/art/appalachian/checkpoints/checkpoint-08.webp` — unlocks after leg 8

## Kilimanjaro, Machame route — `kilimanjaro`

Base folder: `assets/art/kilimanjaro/`

### App sections

- `assets/art/kilimanjaro/sections/home.webp`
- `assets/art/kilimanjaro/sections/journey.webp`
- `assets/art/kilimanjaro/sections/train.webp`
- `assets/art/kilimanjaro/sections/nutrition.webp`
- `assets/art/kilimanjaro/sections/together.webp`
- `assets/art/kilimanjaro/sections/coach.webp`
- `assets/art/kilimanjaro/sections/base-camp.webp`
- `assets/art/kilimanjaro/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Machame Gate → Machame Camp: `assets/art/kilimanjaro/travel/leg-01.webp`
- Leg 02 — Machame Camp → Shira Camp: `assets/art/kilimanjaro/travel/leg-02.webp`
- Leg 03 — Shira Camp → Barranco: `assets/art/kilimanjaro/travel/leg-03.webp`
- Leg 04 — Barranco → Barafu: `assets/art/kilimanjaro/travel/leg-04.webp`
- Leg 05 — Barafu → Uhuru Peak: `assets/art/kilimanjaro/travel/leg-05.webp`

### Checkpoint arrival images

- Checkpoint 00 — Machame Gate: `assets/art/kilimanjaro/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Machame Camp: `assets/art/kilimanjaro/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Shira Camp: `assets/art/kilimanjaro/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Barranco: `assets/art/kilimanjaro/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Barafu: `assets/art/kilimanjaro/checkpoints/checkpoint-04.webp` — unlocks after leg 4
- Checkpoint 05 — Uhuru Peak: `assets/art/kilimanjaro/checkpoints/checkpoint-05.webp` — unlocks after leg 5

## Everest Base Camp — `everest`

Base folder: `assets/art/everest/`

### App sections

- `assets/art/everest/sections/home.webp`
- `assets/art/everest/sections/journey.webp`
- `assets/art/everest/sections/train.webp`
- `assets/art/everest/sections/nutrition.webp`
- `assets/art/everest/sections/together.webp`
- `assets/art/everest/sections/coach.webp`
- `assets/art/everest/sections/base-camp.webp`
- `assets/art/everest/sections/arrival.webp`

### Travel / leg images

- Leg 01 — Lukla → Phakding: `assets/art/everest/travel/leg-01.webp`
- Leg 02 — Phakding → Namche Bazaar: `assets/art/everest/travel/leg-02.webp`
- Leg 03 — Namche Bazaar → Tengboche: `assets/art/everest/travel/leg-03.webp`
- Leg 04 — Tengboche → Dingboche: `assets/art/everest/travel/leg-04.webp`
- Leg 05 — Dingboche → Lobuche: `assets/art/everest/travel/leg-05.webp`
- Leg 06 — Lobuche → Base Camp: `assets/art/everest/travel/leg-06.webp`
- Leg 07 — Base Camp → Kala Patthar: `assets/art/everest/travel/leg-07.webp`
- Leg 08 — Pheriche → Lukla: `assets/art/everest/travel/leg-08.webp`

### Checkpoint arrival images

- Checkpoint 00 — Lukla — Start: `assets/art/everest/checkpoints/checkpoint-00.webp` — unlocked at expedition start
- Checkpoint 01 — Phakding: `assets/art/everest/checkpoints/checkpoint-01.webp` — unlocks after leg 1
- Checkpoint 02 — Namche Bazaar: `assets/art/everest/checkpoints/checkpoint-02.webp` — unlocks after leg 2
- Checkpoint 03 — Tengboche: `assets/art/everest/checkpoints/checkpoint-03.webp` — unlocks after leg 3
- Checkpoint 04 — Dingboche: `assets/art/everest/checkpoints/checkpoint-04.webp` — unlocks after leg 4
- Checkpoint 05 — Lobuche: `assets/art/everest/checkpoints/checkpoint-05.webp` — unlocks after leg 5
- Checkpoint 06 — Everest Base Camp: `assets/art/everest/checkpoints/checkpoint-06.webp` — unlocks after leg 6
- Checkpoint 07 — Kala Patthar: `assets/art/everest/checkpoints/checkpoint-07.webp` — unlocks after leg 7
- Checkpoint 08 — Pheriche: `assets/art/everest/checkpoints/checkpoint-08.webp` — unlocks after leg 7 (secondary place on that leg)
- Checkpoint 09 — Lukla — Return: `assets/art/everest/checkpoints/checkpoint-09.webp` — unlocks after leg 8

## What happens before the finished images arrive

- Home, Train, Nutrition, Together and Coach use their current known-good artwork underneath the new expedition section slot.
- Journey uses the starting checkpoint image before the first mile, then switches to the active Travel/Leg image once movement begins. Missing new art falls back to the route’s existing production art.
- Arrival moments and reopened checkpoint pages use the checkpoint path first and existing route/leg art underneath it.
- Locked future checkpoints do **not** expose or preload their checkpoint scenic image on the checkpoint page.

## Drop-off workflow

When the artwork is finished, send the files to ChatGPT with the expedition and asset name if the filename is not already exact. The files can then be placed into these reserved paths without changing the feature code.

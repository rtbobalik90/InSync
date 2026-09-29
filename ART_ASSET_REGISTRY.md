# InSync Art Asset Registry

**Registry version:** 1.1  
**Working package audited:** InSync 6.0.0 P6.2 Claude Code Base Camp Starter  
**Authoritative media donor audited read-only:** InSync 6.0.0 P6.2.1 Journey Arrival Gate Full  
**Audit date:** 2026-09-06  
**Scope:** Every user-facing media contract under `assets/`, with the current working-tree inventory and authoritative P6.2.1 donor inventory kept separate

## 1. Executive ruling

The current working tree contains the transport-slim media originally supplied with the Base Camp starter. The authoritative P6.2.1 full archive has also been found and audited read-only. It restores 129 substantive files omitted from the slim transfer: 20 global application images, 39 badge images, 53 animated exercise demonstrations, and 17 legacy route/banner images across Camino, Milford, and Inca.

The P6.2.1 donor is the approved final-integration media source for this workstream. It still intentionally contains 222 reserved expedition-slot placeholders. Those remaining placeholders represent future section, travel, and checkpoint contracts. They are not evidence that prior approved fallback art is lost.

The placeholders prove that the path contracts exist. They do not prove that the corresponding production artwork is unfinished, missing from the full repository, or available for redesign.

The correct production action is:

1. Restore the 129 substantive donor files from P6.2.1 during final integration.
2. Preserve every previously approved or locked asset.
3. Generate or redesign art only after the authoritative source has been checked and the asset has been explicitly classified as requiring new work.
4. Replace media in place without renaming its contracted path unless the code and registry are deliberately migrated together.

## 2. Status definitions

| Status | Meaning | Production action |
|---|---|---|
| **Verified production** | A substantive file is present, decodes correctly, is mapped by the application, and package documentation marks the set as delivered. | Preserve. Perform visual and device QA before release. |
| **Verified substantive** | A real, non-placeholder file is present and decodes, but this audit alone does not establish final creative approval. | Preserve pending approval-history reconciliation. |
| **Slim-transfer placeholder** | A 46-byte 16 x 16 stand-in occupies the correct path only to reduce transfer size. | Replace from the P6.2.1 media donor during final integration. Never merge it over substantive donor media. |
| **Reserved expedition slot** | A 34-byte 4 x 4 transparent WebP occupies a future section, travel, or checkpoint path in the authoritative donor. Grand Canyon's compatibility Home slot is 1 x 1. | Preserve until approved route art is assigned to the exact path. Do not report as a broken image or lost asset. |
| **Prior-created locked, unverified here** | Project history says the set was previously created or locked, but this slim package does not carry enough media to inspect it. | Recover original source and verify its mapping before any new generation. |
| **Production gap confirmed** | The full repository and approved source archive have been checked and no usable approved asset exists. | Create through the production pipeline below. |

File size alone is an audit signal, not the permanent definition of approval. In the slim tree, the 46-byte 16 x 16 images are explicitly identified as transport placeholders by `CLAUDE_CODE_START_HERE.md`. In the authoritative donor, all 222 remaining tiny files decode as transparent WebP compatibility/reserved slots: 221 are 4 x 4, and Grand Canyon `sections/home.webp` is 1 x 1.

## 3. Dual inventory

Empty `.gitkeep` markers are excluded from all totals.

| Asset group | Contracted files | Slim substantive | Slim placeholders | P6.2.1 donor substantive | P6.2.1 reserved slots | Final-integration ruling |
|---|---:|---:|---:|---:|---:|---|
| Expedition art | 264 | 25 | 239 | 42 | 222 | Restore 17 legacy/banner files; preserve 222 deliberate route slots |
| Global application art | 20 | 0 | 20 | 20 | 0 | Restore all 20 donor files |
| Achievement badges | 39 | 0 | 39 | 39 | 0 | Restore all 39 PNG files |
| Exercise demonstrations | 53 | 0 | 53 | 53 | 0 | Restore all 53 animated WebP files |
| App identity and PWA icons | 4 | 4 | 0 | 4 | 0 | Already substantive; donor is authoritative |
| **Total** | **380** | **29** | **351** | **158** | **222** | **Restore 129 omitted substantive files from donor** |

### Inventory interpretation

- Both sources contain the same 380 contracted media paths.
- The slim tree has 29 substantive files and 351 transport placeholders.
- The P6.2.1 donor has 158 substantive files and 222 intentional reserved slots.
- The 129-file difference is exact: 20 global art + 39 badges + 53 exercises + 7 Camino legacy/banner + 5 Milford legacy/banner + 5 Inca legacy/banner.
- All 222 remaining donor placeholders are within expedition art. There are no placeholder global, badge, exercise, or icon files in the donor.

The four substantive app-identity files are:

- `assets/icon-192.png`
- `assets/icon-512.png`
- `assets/icon-maskable-512.png`
- `assets/insync-icon.webp`

These files decode as image media in both inventories and are not placeholders. The P6.2.1 donor remains authoritative if a byte-level conflict appears during final integration.

## 4. Expedition completeness

Every route has its section, travel, and checkpoint path contract in place. Some older routes also retain banner and legacy leg-art paths used by `journeys.js` as fallbacks.

| Route ID | Expedition | Sections | Travel legs | Checkpoints | Legacy or banner paths | Total | Donor substantive | Donor reserved slots | Registry status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `grand` | Grand Canyon rim to rim | 12 | 4 | 5 | 5 | 26 | 25 | 1 | Verified production pack; generic `sections/home.webp` is the reserved placeholder compatibility slot |
| `camino` | Camino de Santiago | 8 | 6 | 7 | 7 | 28 | 7 | 21 | Banner plus six locked legacy leg visuals verified substantive; new section/travel/checkpoint slots remain reserved |
| `milford` | Milford Track | 8 | 4 | 5 | 5 | 22 | 5 | 17 | Banner plus four locked legacy leg visuals verified substantive; new section/travel/checkpoint slots remain reserved |
| `inca` | Inca Trail to Machu Picchu | 8 | 4 | 5 | 5 | 22 | 5 | 17 | Banner plus four legacy leg visuals verified substantive; new section/travel/checkpoint slots remain reserved |
| `jesus` | Jesus Trail | 8 | 4 | 5 | 0 | 17 | 0 | 17 | All new expedition slots reserved in donor |
| `sinai` | Mount Sinai | 8 | 3 | 4 | 0 | 15 | 0 | 15 | All new expedition slots reserved in donor |
| `montblanc` | Tour du Mont Blanc | 8 | 7 | 8 | 0 | 23 | 0 | 23 | All new expedition slots reserved in donor |
| `muir` | John Muir Trail | 8 | 6 | 7 | 0 | 21 | 0 | 21 | All new expedition slots reserved in donor |
| `paine` | Torres del Paine circuit | 8 | 5 | 7 | 0 | 20 | 0 | 20 | All new expedition slots reserved in donor |
| `appalachian` | Appalachian Trail, southern section | 8 | 8 | 9 | 0 | 25 | 0 | 25 | All new expedition slots reserved in donor |
| `kilimanjaro` | Kilimanjaro, Machame route | 8 | 5 | 6 | 0 | 19 | 0 | 19 | All new expedition slots reserved in donor |
| `everest` | Everest Base Camp | 8 | 8 | 10 | 0 | 26 | 0 | 26 | All new expedition slots reserved in donor |
| **Total** |  | **100** | **70** | **78** | **16** | **264** | **42** | **222** |  |

### Grand Canyon verified contents

The carried Grand Canyon pack contains 25 distinct substantive WebP files:

- One route banner at 1731 x 909
- Four legacy leg/location fallback images at 941 x 1672
- Four time-aware Home images at 941 x 1672: dawn, day, sunset, and night
- Seven other substantive section images at 941 x 1672: Journey, Train, Nutrition, Together, Coach, Base Camp, and Arrival
- Four active-travel leg images at 941 x 1672
- Five checkpoint images at 941 x 1672

`assets/art/grand/sections/home.webp` is a reserved compatibility slot, not production artwork. The four time-aware Home files supply the actual Grand Canyon Home experience.

The source-to-path mapping is recorded in `GRAND_CANYON_ART_MAP.md`. The complete universal expedition contract is recorded in `EXPEDITION_ASSET_DROP_GUIDE.md`.

### Legacy and reserved-slot distinction

The P6.2.1 donor proves that Camino, Milford, and Inca have substantive banner/legacy leg sets. Their newer universal section, active-travel, and checkpoint destinations are still transparent reserved slots. Runtime fallbacks preserve the legacy visuals until those new destinations receive approved art. Grand Canyon is the only route with the universal pack delivered in this donor.

The remaining eight routes have their universal contracts reserved but no route-specific substantive media in the donor. This is an artwork backlog, not an app-path defect.

## 5. Global application art

All 20 global application-art paths are substantive in the P6.2.1 donor. The current slim working tree contains placeholders at these same paths and must be restored from the donor during final integration:

```text
assets/art/camp-dawn.webp
assets/art/camp-day.webp
assets/art/camp-night.webp
assets/art/camp-sunset.webp
assets/art/campfire.webp
assets/art/chapter-alpine.webp
assets/art/chapter-forest.webp
assets/art/chapter-pass.webp
assets/art/chapter-ridge.webp
assets/art/chapter-trailhead.webp
assets/art/coach-desk.webp
assets/art/coastal-expedition.webp
assets/art/dispatch-day.webp
assets/art/dispatch-night.webp
assets/art/expedition-none.webp
assets/art/expedition-overlook.webp
assets/art/meal-example.webp
assets/art/onboarding-welcome.webp
assets/art/provisions.webp
assets/art/train-banner.webp
```

The donor files are still WebP images and range from 87,438 to 380,326 bytes. They include the global camp time-of-day set and substantive Coach, Coastal Expedition, Provisions, Training, Journey chapter, dispatch, onboarding, and fallback visuals. Their exact relationship to the remembered locked-set names still requires screen-by-screen mapping, but the files themselves have been recovered.

## 6. Achievement badges

`badges.js` defines 39 achievements and resolves each image through `assets/badges/<badge-id>.png`. The P6.2.1 donor contains 39 substantive PNG images at 320 x 320. The slim working tree contains placeholders at the same paths.

| Badge family | Contracted files | Donor substantive | Donor placeholders |
|---|---:|---:|---:|
| Firsts | 6 | 6 | 0 |
| Streaks | 5 | 5 | 0 |
| Strength | 6 | 6 | 0 |
| Distance | 5 | 5 | 0 |
| Together | 5 | 5 | 0 |
| Body | 4 | 4 | 0 |
| Consistency | 4 | 4 | 0 |
| Faith | 4 | 4 | 0 |
| **Total** | **39** | **39** | **0** |

The previously established direction is a flat vintage outdoor-patch system. Treat the 39 donor files as the recovered production badge set. Preserve them until visual QA confirms their match to the approved direction.

## 7. Exercise demonstrations

`exercises.js` defines 53 movements and maps each movement to `assets/exercises/<exercise-id>.webp`. The P6.2.1 donor contains a substantive animated WebP for all 53 movements. The slim working tree contains placeholders at the same paths.

The contracted exercise IDs are:

```text
alternating-curls, arm-circles, assisted-pull-up, biceps-curl-machine,
butt-kickers, cable-curls, cable-hip-extension, cable-lateral-raise,
cable-row, calf-extension, chest-fly-machine, concentration-curls,
dead-bug, dumbbell-chest-press, dumbbell-rdl, dumbbell-shoulder-press,
elbow-to-knee, face-pull, fast-feet, glute-machine, hammer-curls,
high-knees, hip-abduction-machine, hip-adduction-machine,
horizontal-leg-press, inchworm, incline-curls, jumping-jacks,
lat-pulldown-cable, lateral-raise, leg-extension, linear-leg-press,
lunges, pallof-press, plank, preacher-curls, pull-up-bar,
pulldown-machine, push-ups, reverse-fly-machine, seated-leg-curl,
shoulder-press-machine, side-bends, smith-shoulder-press, split-squat,
squats, step-ups, triceps-cable-extension, triceps-kickback,
triceps-machine, triceps-pushdown, triceps-seated-extension, windmills
```

All 53 donor files decode as animated WebP. Forty-one are 300 x 300 and twelve are 360 x 240. Frame counts range from 4 to 102. Restore this donor set before judging exercise guidance, playback behavior, or visual consistency.

## 8. Locked and prior-created visual sets

The following sets are known from the established InSync project history. The evidence column distinguishes what was recovered in the P6.2.1 donor from what remains unmapped or unverified by name.

| Visual set | Prior project status | P6.2.1 donor evidence | Required action |
|---|---|---|---|
| Home Hero, male and female | Locked prior-created set | Global images are recovered, but two explicit profile variants are not identifiable by filename alone | Map donor files and runtime/profile rules before editing |
| Journey Map | Locked prior-created set | `chapter-*`, `expedition-*`, and route files are substantive, but the exact approved map mapping is not proven by filename alone | Verify screen mapping against the running full-media build |
| Camp Dashboard, times of day | Locked prior-created set | `camp-dawn/day/sunset/night.webp` are substantive; Grand Canyon also has four substantive time-aware Home files | Verify global and route-specific time selection on device |
| Evening Reflection | Locked prior-created set | `dispatch-day.webp` and `dispatch-night.webp` are substantive candidates; exact mapping remains unverified | Confirm exact screen/path mapping |
| AI Coach | Locked prior-created set | `coach-desk.webp` and Grand Canyon Coach art are substantive | Preserve and verify character/environment continuity |
| Coastal Expedition | Locked prior-created set | `coastal-expedition.webp` is substantive | Preserve and verify its runtime surface |
| Strength Training | Locked prior-created set | `train-banner.webp` is substantive; exact set mapping is not proven here | Confirm mapping and preserve approved treatment |
| Training Yard | Locked prior-created set | Substantive training art exists, but exact source-to-path mapping is not proven here | Confirm mapping and preserve approved treatment |
| Nutrition Provisions | Locked prior-created set | `provisions.webp` and `meal-example.webp` are substantive | Confirm which screens use each and preserve |
| Together banner | Locked prior-created set | Global art is recovered, but exact filename mapping is not proven here | Confirm mapping before any new generation |
| Coach background | Locked prior-created set | `coach-desk.webp` is substantive | Confirm exact relationship and preserve |
| Grand Canyon rim-to-rim full set | Locked and delivered | 25 substantive files carried and documented | Preserve; complete mobile visual QA |
| Camino de Santiago, six legs | Locked prior-created set | Banner plus all six legacy leg files are substantive | Preserve; map these to the 21 reserved universal slots only through approved derivatives or deliberate reuse |
| Milford Track, four legs | Locked prior-created set | Banner plus all four legacy leg files are substantive | Preserve; map these to the 17 reserved universal slots only through approved derivatives or deliberate reuse |

No entry in this table should be labeled lost. Where an exact named mapping remains uncertain, the correct status is recovered candidate or unverified mapping, not missing.

## 9. Source-of-truth order

When sources disagree, use this order:

1. Robert's explicit approval or current direction
2. Original approved production file and its source/reference package
3. The authoritative P6.2.1 Journey Arrival Gate Full media donor
4. Full production repository and release history
5. This registry and the route mapping documents
6. Runtime path contracts in `journeys.js`, `media.js`, `badges.js`, and `exercises.js`
7. New concepts or generations

A transport placeholder never outranks an approved production file.

## 10. Production pipeline

Every art item moves through the following gates. No stage may be skipped for a locked or recurring asset.

### Gate 1: Recover

- Use the located P6.2.1 Journey Arrival Gate Full archive as the authoritative media donor for final integration.
- Inspect and manifest the donor before controlled extraction. Do not merge the slim package's media over it.
- Build a manifest containing asset ID, exact path, byte size, dimensions, format, animation state, and SHA-256 hash.
- Match source files, exports, and approved references to their runtime paths.

**Exit condition:** Every current path is classified as approved production, candidate production, intentional compatibility slot, or confirmed production gap.

### Gate 2: Reconcile approvals

- Compare recovered files with the locked-set table above.
- Record the most recent approved version, approver, source reference, intended screen, intended profile, route, time-of-day state, and crop behavior.
- Resolve duplicate concepts and ambiguous names without deleting either source.
- Ask Robert only about conflicts that materially change the experience.

**Exit condition:** The team knows what must be preserved, what needs QA, and what genuinely needs creation.

### Gate 3: Write the asset brief

For each confirmed gap, define:

- Asset ID and exact destination path
- Screen, state, route, profile, and trigger
- Visual subject, emotional purpose, and continuity references
- Required orientation, composition-safe zones, crop behavior, and focal point
- Animation requirement for exercise media
- Any forbidden changes to recurring people, environments, symbols, color language, or tone

**Exit condition:** The asset can be produced without creative guesswork or changing established identity.

### Gate 4: Produce source masters

- Create or edit from the approved references.
- Keep a lossless source master separate from the optimized runtime export.
- Produce related route or badge families as coherent batches.
- Use Grand Canyon as the carried expedition reference for format, composition, and screen hierarchy, not as a reason to make every landscape visually identical.
- For recurring Robert/Lizzie representations, lock identity references before producing variants.

**Exit condition:** A coherent source master exists and has passed internal art-direction review.

### Gate 5: Export to contract

- Preserve the exact filename and destination path.
- Expedition vertical art should follow the established 941 x 1672 reference unless a documented surface contract requires another size.
- Banner art should follow its actual runtime crop and aspect-ratio contract. Grand Canyon's carried banner is 1731 x 909.
- Export still route art as optimized WebP.
- Export exercise demonstrations as animated WebP when animation is part of the approved source.
- Export badges as true PNG files matching the recovered donor contract. The donor set is 320 x 320 PNG; the slim placeholders' internal WebP encoding is transport-only and must not drive a format migration.
- Strip unnecessary metadata and verify alpha behavior where used.

**Exit condition:** The runtime export decodes, meets the path contract, and stays within the agreed performance budget.

### Gate 6: Integrate safely

- Replace only the targeted placeholder or superseded production export.
- Do not alter route logic simply to accommodate an image.
- Update the service-worker cache version when required by the release process.
- Add the asset to the manifest with its source, status, dimensions, hash, and approval note.

**Exit condition:** Existing fallbacks remain valid and no unrelated production media was overwritten.

### Gate 7: Visual QA

Verify on Robert's and Lizzie's target phones and at minimum test:

- Installed PWA and browser mode
- Portrait viewport, safe areas, and common mobile widths
- Focal-point crop, legibility, overlays, buttons, and text contrast
- Dawn, day, sunset, and night variants where applicable
- Locked, active, completed, arrival, reopened-checkpoint, and offline states
- Robert and Lizzie profile-specific visuals
- Reduced-motion behavior for animated demonstrations
- Slow network, cached load, failed load, and fallback behavior
- No premature loading or exposure of locked future checkpoint art

**Exit condition:** There is no blocking visual, accessibility, privacy, caching, or performance defect.

### Gate 8: Approve and release

- Robert approves material changes to locked visual identity.
- Mark the asset `Verified production` in this registry.
- Preserve its source master and runtime export.
- Record the release version and do not overwrite it without a new approval record.

## 11. Recommended production sequence

This is the order that protects approved work and produces the greatest product coverage fastest.

1. **P6.2.1 donor integration and manifest:** restore the 129 substantive files omitted from the slim working tree, then calculate hashes before creating anything new.
2. **Grand Canyon reference QA:** validate the carried 25-file pack on both phones and lock it as the route-level visual benchmark.
3. **Global locked-set reconciliation:** integrate the 20 recovered global files, then map Home Hero, Journey Map, Camp Dashboard, Evening Reflection, AI Coach, Coastal Expedition, Strength Training, Training Yard, Nutrition Provisions, Together banner, and Coach background. These assets affect the broadest daily experience.
4. **Functional media restoration:** integrate all 53 recovered exercise demonstrations and 39 recovered achievement badges, then test animation, recognition, accessibility, caching, and badge-state presentation.
5. **Camino production reconciliation:** integrate and verify the recovered banner and six legacy leg files, then complete its 21 reserved section/travel/checkpoint slots without discarding existing art.
6. **Milford production reconciliation:** integrate and verify the recovered banner and four legacy leg files, then complete its 17 reserved section/travel/checkpoint slots without discarding existing art.
7. **Remaining expedition waves:** finish one coherent route at a time in this order: Inca Trail, Jesus Trail, Mount Sinai, Tour du Mont Blanc, John Muir Trail, Torres del Paine, Appalachian Trail, Kilimanjaro, Everest Base Camp.
8. **Whole-library device pass:** test route switching, progression states, offline caching, install/update behavior, and asset performance across the complete library.

Within every unfinished route, production order is:

1. Core section set: Home, Journey, Train, Nutrition, Together, Coach, Base Camp, Arrival
2. Active-travel legs in route order
3. Checkpoints in route order, including checkpoint 00
4. Banner and legacy fallback paths when that route uses them
5. Time-aware variants only where the experience specification calls for them

## 12. Immediate work queue

| Priority | Work item | Owner lane | Blocking dependency | Deliverable |
|---|---|---|---|---|
| P0 | Integrate authoritative P6.2.1 donor media | Release lead / asset librarian | Stable final-integration window | 129 substantive files restored without overwriting newer code |
| P0 | Generate full hash and dimension manifest | Asset librarian | Donor integration | Machine-readable asset manifest |
| P0 | Reconcile the locked-set table | Art director and continuity reviewer | Approved references and manifest | Approved/preserve/create status per asset |
| P1 | Grand Canyon mobile visual QA | Mobile QA and art QA | Robert and Lizzie target phones | Issue list and sign-off record |
| P1 | Validate exercise and badge originals | Asset librarian | Donor integration | 92 verified production assets |
| P1 | Validate global application art | Asset librarian | Donor integration | 20 verified global files plus mapping notes |
| P2 | Verify Camino and Milford packs | Expedition art team | Original locked files | Two reconciled route packs |
| P3 | Produce confirmed route gaps | Expedition art team | Approved briefs | Finished route waves |

## 13. Change-control rules

- Never commit a transport placeholder into the full production repository over a substantive asset.
- Never classify an asset as missing until the full repository and approved archive have been checked.
- Never silently rename an asset path used by runtime code or the service worker.
- Never treat a newly generated variation as canonical until Robert approves it.
- Never change an established recurring person, route identity, or global art direction merely because a new generation is attractive.
- Keep source masters, runtime exports, and approval records together in the production asset library.
- Update this registry whenever an asset moves between placeholder, candidate, approved, superseded, or compatibility-slot status.

## 14. Audit basis

This registry was established from direct inspection of:

- `CLAUDE_CODE_START_HERE.md`
- `EXPEDITION_ASSET_DROP_GUIDE.md`
- `GRAND_CANYON_ART_MAP.md`
- `journeys.js`
- `badges.js`
- `exercises.js`
- All files under the slim working tree's `assets/`
- The full central directory and all 380 media entries inside `InSync_6.0.0_P6.2.1_Journey_Arrival_Gate_Full.zip`, inspected read-only

Both inventories contain the same 380 contracted media files excluding `.gitkeep` markers. The slim working tree contains 29 substantive files and 351 transfer placeholders. The authoritative P6.2.1 donor contains 158 substantive files and 222 deliberate expedition slots. Its substantive media includes 20 global WebPs, 39 true 320 x 320 PNG badges, 53 animated WebP exercise demonstrations, 42 route images, and four app/PWA identity files. Its 222 tiny slots consist of 221 transparent 4 x 4 WebPs plus the intentional 1 x 1 Grand Canyon compatibility Home slot. Final integration will restore the 129 substantive donor files missing from the slim tree. No asset archive was extracted or overwritten during this audit.

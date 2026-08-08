# InSync v3.1.0

This is the complete GitHub Pages package for the Journey Editorial redesign with Robert/Lizzie-specific and time-of-day artwork. Upload the **contents of this folder** to the repository root.

## Dynamic artwork

- Robert uses the male Home/workout/reflection set.
- Lizzie uses the female Home/workout/reflection set.
- The campsite changes automatically between dawn, day, sunset, and night using the phone's local time.
- All supplied artwork is stored locally under `assets/art/` and works offline after the first successful load.

# InSync v3.0.0

InSync is a private, local-first health, fitness, nutrition, accountability, and AI-coaching PWA for Robert and Lizzie.

This release applies the approved **Journey Editorial** visual direction while preserving the existing working data model and tools.

## Main areas

- **Home:** Scripture, XP, level, daily focus, health totals, and next milestone.
- **Journey:** Long-term illustrated progression path and chapters.
- **Train:** AI and self-driven workouts, treadmill logging, and machine entry.
- **Nutrition:** Meal photos, editable AI nutrition estimates, barcode lookup, and meal history.
- **Together:** Shared accountability, notes, photos, partner challenges, and approved progress.
- **Achievements:** 50+ badges driven by real logged activity.
- **Reflection:** Private Christian evening reflection and prayer prompts.

## Data and privacy

- Local IndexedDB remains the primary store.
- Claude API credentials remain stored only in the local browser/device.
- GitHub cloud sync remains optional.
- Robert and Lizzie use separate private profiles.
- Shared records are distinct from private health records.

## Install

Upload the contents of this folder to the root of the GitHub Pages repository. After deployment, open the site in Safari, refresh once, remove the old Home Screen shortcut, and add it again so iOS installs the v3 icon and cache.

## Verification completed

- `node --check app.js`
- `node --check ai.js`
- `node --check github-sync.js`
- `node --check storage.js`
- `node tests/smoke.test.mjs`


## v4.0 Design Notes
The primary visual direction is a mature expedition journal: warm ivory, charcoal, sage, bronze and landscape artwork. Theme choices are available after onboarding under Profile & Appearance.

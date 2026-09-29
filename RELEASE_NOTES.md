# InSync Base Camp + Cookbook Integration RC1

- Combined the full-media Base Camp 1.0 candidate and the later cookbook code while preserving all Base Camp modules and substantive artwork.
- Updated the offline shell to contain both module sets under cache `insync-v10-39`.
- This is a development candidate. Mobile certification is not complete, and the generated cookbook recipes are draft content that must not be represented as finished or production approved.

# InSync Universal Cookbook Foundation

- Added a bundled offline catalog foundation containing 1,440 structured recipe records across 12 launch cuisines.
- Added 120 records per cuisine, split evenly across breakfast, lunch, dinner, and snack.
- Added canonical ingredient quantities with switchable household and weight displays.
- Added independent 1–20 eater scaling to each planned meal.
- Household ingredient quantities and the consolidated shopping list now respond to eater count.
- Added offline weekly planning around active profile calorie/protein targets.
- Added dietary-pattern and allergen filters before plan selection.
- Preserved batch-lunch, dinner-leftover, favorite, dislike, pantry, and week-scoped planning behavior.
- Added explicit provenance and review states. Foundation recipes remain calculated drafts until nutrition and culinary review.

# InSync 6.0.0-p6.2 — Notes from the Trail

## Base Camp 1.0 and Sprint 1 integration

- Added a private, local-only 6×6 Base Camp with object placement, movement, rotation, removal, collision checks, bounds checks, and atomic persistence.
- Restored the authoritative P6.2.1 production media baseline: 158 substantive assets and 222 tracked future-expedition route slots, with no transport placeholders.
- Added an explicit training-equipment choice to onboarding and ensured the first plan preview fits that equipment.
- Reworded Coach setup so target changes are evidence-based proposals that require approval.
- Rebuilt Settings as an eight-section hub and clarified that current notifications appear only inside InSync.
- Rebuilt History as a hub while preserving meal history as a focused destination.
- Gated derived Duo Mission progress and social activity by the relevant partner-sharing permissions.
- Added guided pairing and human-readable connection states across Together and Settings.
- Kept local storage at `insync.v10`, partner sync at schema 8, and the dedicated Faith feature parked.

## New
- Story-based launch update sheet: **Notes from the Trail**.
- Multiple unseen updates stack until the person clears them.
- Individual × controls and **Clear all** mark release entries read on that phone only.
- **Close** hides the sheet for the current app session without marking entries read.
- **View Trail Notes** opens a permanent detailed release journal.
- Settings now includes a persistent Trail Notes entry for later review.

## AI-assisted story
- Optional Claude story generation receives only the exact hardcoded release-note facts.
- The `trail.notes` prompt has no personal context allow-list and explicitly forbids invented facts.
- Story output is bounded and cached only for the exact unread-note set.
- Offline/no-AI fallback is deterministic and immediate.

## Included first-run journal
The first Trail Notes capable build includes concise milestones for:
- Journey checkpoints and destination pages.
- Grand Canyon production artwork.
- Train weekly/day restructuring and visual polish.
- Together 2.0, Duo Missions and Weekly Campfire.
- P6.1 Campfire/Together follow-through.
- Notes from the Trail itself.

## Compatibility
- No data reset.
- Local storage: `insync.v10`.
- Partner sync: schema 8 unchanged.
- Trail Notes read state stays local and is never added to partner payloads.
- Runtime: `6.0.0-p6.2`.
- Service worker: `insync-v10-38`.

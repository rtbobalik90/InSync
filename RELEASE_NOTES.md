# InSync 6.0.0-p6.2 — Notes from the Trail

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
- Service worker: `insync-v10-35`.

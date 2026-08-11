# P6.2 Code Review — Notes from the Trail

## Data boundary
- Release facts live in code in `trail-notes.js`.
- Local state stores only read note IDs and one bounded story cache.
- `appUpdates` is not referenced by `cloud.js` partner sharing/sanitation logic.
- Partner sync remains schema 8.

## AI boundary
- New prompt id: `trail.notes`.
- Prompt context allow-list is empty; no health, nutrition, training, faith, body or partner context is supplied.
- `Cloud.trailNotesStory()` receives only the selected release-entry facts.
- Prompt explicitly forbids adding any fact not present in those entries.
- The detailed release journal always shows deterministic hardcoded facts regardless of AI availability.

## Interaction behavior
- Popup is checked after normal app rendering and on foreground entry.
- It is suppressed during active session/arrival/capture/earned moment routes and while a logging modal is open.
- Close is session-only; it does not mutate read state.
- Individual clear and Clear All persist locally without triggering partner sync.
- A changed unread set invalidates the prior cached story.

## Upgrade safety
- Additive `appUpdates` normalization; no local storage schema reset.
- Service-worker shell includes the new module.
- Cache bumped to `insync-v10-35`.

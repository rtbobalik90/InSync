# InSync 6.0.0-p6.2 — Notes from the Trail

P6.2 adds a local, story-based release journal so each phone can understand what changed between app updates.

## Notes from the Trail
- Unseen release entries stack independently on each phone.
- The launch popup has one × per entry, Clear All, Close, and View Trail Notes.
- × / Clear All mark notes read on only that device.
- Close hides the popup for the current app session without clearing the queue; unread notes return on the next app launch/update session.
- View Trail Notes opens the complete, persistent release journal. It is also available later from Settings > About > Trail Notes.
- The full journal is never deleted when a note is marked read.

## AI story layer
- Release facts are hardcoded in `trail-notes.js`.
- If Claude is configured, InSync may rewrite only those exact facts into a short field-journal paragraph.
- The AI prompt explicitly forbids inventing features, numbers, actions, promises or results.
- The generated story is cached against the exact set of unread note IDs.
- If the unread set changes, the old story is discarded and a new one can be written.
- If AI is unavailable, a deterministic local story is shown immediately.
- No user health data or partner data is required for this AI request.

## Compatibility
- Local store remains `insync.v10`.
- Partner sync remains schema 8.
- Trail Notes read state is local-only and absent from partner sync.
- Faith remains parked.
- Runtime: `6.0.0-p6.2`
- Service worker: `insync-v10-39`

## Universal cookbook build

The app now includes the offline 1,440-recipe cookbook foundation, Recipe Schema v1, independent release gates, universal meal scaling, per-meal eater and portion controls, dual measurement views, canonical grocery aggregation, and the separate 48-recipe pilot review collection. See `COOKBOOK_IMPLEMENTATION_REPORT.md` for the current validation boundary and `COOKBOOK_QA_MATRIX.md` for the release checklist.

## Current build

Base Camp game files and local saved data are retained for a later release, but the route, runtime scripts, domain entry, and offline preload are parked. The app supports a solo expedition when no partner name is set. Adding a partner keeps the shared route agreement and each-person walking requirement. Guided pairing, equipment-aware onboarding, grouped Settings, and History remain. `MOBILE_RELEASE_CERTIFICATION.md` is still unexecuted; this integration is not approved for daily-phone use.

Artwork audit: the full-media source is present, with 158 substantive media files and no transport placeholders. The expedition pack still has 222 reserved art slots, mostly for later routes. Existing referenced artwork resolves, but these reserved slots require real art before the corresponding route surfaces can be called finished.

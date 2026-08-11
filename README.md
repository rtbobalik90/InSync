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
- Service worker: `insync-v10-35`

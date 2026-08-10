# InSync 6.0.0-p3b — Phase 3B Code Review

## Review conclusion

Phase 3B is an additive presentation/interaction rebuild over the Phase 3 Faith foundation. It does not require a destructive state migration and does not widen the partner-sharing boundary.

## Architecture decisions

### Scripture is deterministic
`scripture.js` owns stored Scripture used by the new reader and waypoint experiences. Faith and Journey consume verified local text; Claude is not used to generate or quote Bible passages.

### Faith remains a cross-cutting journey domain
Primary navigation remains:

**Home · Journey · Train · Nutrition · Together**

Faith is reached contextually from Daily Camp, Journey, Coach and evening reflection. This prevents a second, disconnected mini-application from emerging inside InSync.

### Private formation data stays private
`faith.waypointNotes` joins prayer journal, gratitude and reflection as owner-private content. Partner payload construction remains intentionally narrow and only carries the explicitly selected shared prayer plus bounded acknowledgements.

### Game boundary remains hard
The Faith module has no reward emission or Base Camp XP path. The redesigned interactions do not change that contract.

## Risk review

### Local state
Low risk. `faith.waypointNotes` is additive and normalized under the existing `insync.v10` store. Existing installs retain their data.

### Partner sync
Low risk. Schema remains 7. No new private Faith fields were added to the shared payload.

### Offline behavior
`scripture.js` was added to the service-worker shell and the cache was bumped to `insync-v10-19`.

### Browser support
Scripture listening uses native `speechSynthesis` only when available; core reading/memory functionality does not depend on it.

### Accessibility
The practice flows use native buttons, textareas, details/summary and normal focus behavior. Scripture remains actual text rather than text baked into art.

## Release gate

All automated suites pass: **1,156 / 1,156**.

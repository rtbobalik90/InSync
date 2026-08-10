# InSync 6.0.0-p3 — Phase 3 Code Review

## Review conclusion

**Phase 3 is structurally ready to ship into the current private two-phone InSync environment.** Faith is implemented as a bounded domain rather than being scattered across Home, Coach and Together.

## Architecture decisions

### Faith remains supporting infrastructure
Faith does not consume a sixth bottom tab. It is reachable from Home, Coach and Reflection and has its own internal routes.

### Private-first data model
The local store owns Scripture Memory, prayers, gratitude, Sabbath and Rule of Life. Only one explicitly selected ongoing prayer request can enter partner sync.

### No game coupling
`faith.js` does not emit reward events, write Base Camp XP or alter daily health scoring. This enforces the summit's noncompetitive spiritual-formation boundary in code rather than copy alone.

### Intelligence gets summaries, not journals
The Context Builder may see counts/status such as reviews due, prayer counts and Sabbath state. It does not receive prayer text, gratitude text, Rule-of-Life text or reflections by default.

### Partner sync schema 7
The new schema adds only `sharedPrayer` and `prayerAcks`. Existing schema-6 partner files remain readable because these fields are optional during sanitation.

## Data-safety notes

- Faith state is included in the user's private backup/restore flow.
- Connection secrets remain outside the ordinary state object.
- Shared prayer text is bounded and sanitized as external partner input.
- Prayer acknowledgements are bounded and timestamp-validated.
- Imported malformed Faith structures are normalized before persistence.

## Known intentional limits

- No licensed multi-translation Scripture library has been added; Memory Trail uses the verified Scripture already shipped inside InSync.
- No speech recognition is required for recitation; the user self-checks.
- Shared prayer is one request at a time by design.
- Faith does not yet generate a separate long-form spiritual-history screen; answered prayers and gratitude can feed Living History in a later phase.
- No spiritual reminders/push infrastructure is added in this phase.

## Next engineering focus

Phase 4 should move Training from a strong logger toward a deterministic coaching loop. Progression and deload logic should stay code-grounded, with AI explaining/proposing rather than inventing exercise rules.

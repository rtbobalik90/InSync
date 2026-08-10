# InSync 6.0.0-p3b — Faith Woven Into the Journey

InSync is a local-first, two-person Christian health and formation journey. Phase 3B rebuilds the Faith experience around the approved visual direction: Faith now lives inside Daily Camp, the active expedition, the evening close, and the shared road instead of feeling like a separate feature dashboard.

## What changed in Phase 3B

### Daily Camp integration
Home now carries a calm **Today at Camp** faith briefing with Today's Scripture, Memory Trail status, Prayer, and an evening **Close Camp** entry. It remains visually grounded in the active expedition.

### Along the Road
The Journey screen now includes a waypoint formation moment for the current leg:
- verified local Scripture
- Read
- private Reflect
- Add to Memory Trail

Waypoint reflections remain local/private and are not sent to the partner or general AI context.

### Faith Hub
Faith remains a deeper destination without becoming a sixth primary navigation tab. The Hub now acts as a quiet gateway into:
- Bible
- Memory Trail
- Prayer
- Journal / Close Camp
- Rhythm / Sabbath / Rule of Life

The active expedition artwork and camp context remain present throughout.

### Scripture Library
New `scripture.js` provides a local verified Scripture layer. It combines the existing daily verse catalog with selected longer KJV passages used by the redesigned Faith experience. AI is never asked to invent Bible text.

### Memory Trail practice
Memory Trail now supports focused practice modes inspired by dedicated Scripture-memory tools while retaining InSync's visual language:
- Read
- Tap to Reveal
- Word Bank
- First Letters
- Type It
- Speak / self-check

Word Bank difficulty progressively hides more words. Spaced review from the original Phase 3 remains intact.

### Prayer at Camp
Prayer remains private by default. One request can still be deliberately shared with the partner, who can acknowledge **I prayed for this** without points, rankings, XP, or competitive scoring.

### Close Camp
Evening Reflection is now a journey ritual centered on:
1. Where did you notice God today?
2. What are you grateful for?
3. What are you carrying into tomorrow?

The day's Scripture is carried into the screen, while health facts are available as secondary trail context instead of dominating the reflection.

### Rhythm
Sabbath and Rule of Life remain available under **Rhythm**, secondary to the daily Faith experience. Sabbath continues to reduce pressure across Home and Coach.

## Privacy and game boundaries

Phase 3B preserves the Phase 3 rules:
- prayer journal is private by default
- gratitude is private
- reflections are private
- waypoint reflections are private
- only one explicitly selected prayer request enters partner sync
- partner prayer acknowledgement is not a score
- Scripture, prayer, gratitude, Sabbath, Rule of Life and waypoint reflection do not award Base Camp XP
- general AI context receives safe structural counts, not private spiritual journal text

## Compatibility

- App/UI: **6.0.0-p3b**
- Local storage key/schema: **insync.v10** — unchanged; no forced reset
- Partner sync schema: **7** — unchanged from Phase 3
- Faith module: **1.1.0**
- Scripture Library: **1.0.0**
- Service worker cache: **insync-v10-19**

## Test status

The repository passes **1,156 automated assertions with 0 failures** across the complete release suite, including 67 new Phase 3B Faith/Journey redesign checks.

See `TEST_REPORT.md` for the suite breakdown.

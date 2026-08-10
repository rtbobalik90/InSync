# InSync 6.0.0-p3 — Phase 3 Faith Foundation

## Release purpose

Phase 3 makes Christian formation a real product pillar while preserving the summit rule that spiritual disciplines are never proof of worth, competitive points or partner rankings.

## New production module

### `faith.js`
Provides:
- Scripture Memory Trail;
- spaced review scheduling;
- private prayer journal;
- answered-prayer state;
- explicit one-request partner sharing;
- `I prayed for this` acknowledgement;
- gratitude;
- Sabbath mode;
- Rule of Life foundation;
- private-safe Faith summaries for the Intelligence layer.

## Scripture Memory Trail

A verse can move through:
1. Read;
2. hidden-word practice;
3. first-letter prompts;
4. typed recall;
5. recitation/self-check;
6. spaced review.

The system stores progression and review dates without using a spiritual streak-loss mechanic.

## Prayer Journal and shared prayer

All prayers start private. Ongoing prayers can be marked answered with a private note and reopened later.

One ongoing request can be intentionally shared with the partner. Partner sync advances to **schema 7** and carries only:
- shared prayer id;
- shared request text;
- category;
- creation timestamp;
- prayer acknowledgements.

Private prayer entries, answer notes, gratitude, Rule-of-Life text and reflections do not cross.

## Sabbath Mode

A selected weekday can run in Sabbath mode. On that day Home and Coach remove score-closing/deficit language. Logging remains available, but the product language emphasizes rest, Scripture, gratitude and unhurried stewardship.

## Rule of Life

Private weekly rhythms can be stored for worship, Scripture, prayer, rest, body stewardship, meal preparation and relationship/family life. These fields are deliberately non-scored.

## Intelligence boundary

Faith context now exposes safe counts/state to registered AI skills while continuing to exclude private journal text. The Phase 2 AI Constitution remains authoritative.

## Compatibility

- App/UI: **6.0.0-p3**
- Local state: **v10** (additive; no forced reset)
- Partner sync: **schema 7**
- Service-worker cache: **insync-v10-18**

## Regression gate

The working repository passes **1,088 / 1,088 automated assertions with 0 failures**, including **81 Phase 3 Faith-specific evaluations**.

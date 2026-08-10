# InSync 6.0.0-p3 — Faith Foundation

InSync is a local-first, two-person Christian health and formation journey. Version 6.0.0-p3 completes Phase 3 of the 6.0 roadmap: Faith becomes a first-class product system while remaining explicitly noncompetitive and private by default.

## Product direction

Primary navigation remains:

**Home · Journey · Train · Nutrition · Together**

Coach remains globally accessible. Faith is a supporting system reachable from Home, Coach, Reflection and its dedicated Faith Hub.

The product still follows three pillars:
- **Body** — training, walking, nutrition, recovery and health habits;
- **Spirit** — Scripture, prayer, memorization, gratitude, Sabbath and reflection;
- **Together** — shared expeditions, encouragement and deliberately shared prayer.

## Phase 3 additions

### Faith Hub
A dedicated Christian formation route now gathers Scripture Today, Memory Trail, Prayer Journal, Gratitude, Sabbath and Rule of Life without adding a sixth bottom navigation tab.

### Scripture Memory Trail
The app now supports a complete memorization sequence built only from verified in-app Scripture:
1. Read.
2. Hide selected words.
3. First-letter prompt.
4. Type from memory.
5. Recite/self-check.
6. Spaced review.

Memory states are **Learning**, **Familiar**, **Memorized**, and **Review due**. Missing a review never deletes a verse or breaks a spiritual streak because Faith does not use competitive streak mechanics.

### Prayer Journal
Prayer entries are private by default and may be:
- categorized;
- kept ongoing;
- marked answered with an optional private answer/reflection;
- reopened later.

Exactly one ongoing request may be explicitly selected for partner sharing. Private journal entries, answer notes, gratitude and reflections do not enter partner sync.

### Shared Prayer
Partner sync schema 7 introduces a narrowly scoped shared-prayer contract:
- one explicitly shared request;
- category and creation time;
- `I prayed for this` acknowledgement.

The acknowledgement is relational feedback only. It never becomes points, XP or a leaderboard.

### Gratitude
Evening Reflection now includes an optional gratitude field. Gratitude is date-keyed, private, backed up with the owner log and visible in the Faith Hub.

### Sabbath Mode
Sabbath may be enabled on a selected weekday. When active:
- Home does not render the normal target-deficit ledger;
- Home explicitly says the day is not a score to close;
- Coach stops presenting a list of open health gaps;
- Scripture, gratitude, rest and an unhurried walk are emphasized without turning rest into another performance requirement.

### Rule of Life
A private, non-scored weekly rhythm can now be written for:
- worship;
- Scripture;
- prayer;
- rest;
- body stewardship;
- meal preparation;
- relationship/family life.

## Faith + Intelligence boundary

Phase 2 Intelligence remains underneath Faith. AI may receive safe structural facts such as Scripture-memory counts, whether a review is due, prayer counts or whether Sabbath is active. It does **not** receive private prayer text, gratitude text, Rule-of-Life text or evening reflection content by default.

The AI Constitution continues to prohibit:
- claiming God spoke through the model;
- claiming spiritual authority;
- replacing Scripture, church or pastoral care;
- inventing Scripture quotations;
- ranking partners spiritually;
- shame/guilt mechanics.

## Game boundary

Faith has no reward-emission path. Scripture practice, prayer, gratitude, Sabbath and Rule-of-Life configuration do **not** award Base Camp XP and do not alter competitive health points.

## Architecture

Phase 3 adds:
- `faith.js` — Faith domain logic, Scripture Memory Trail, prayer state, gratitude, Sabbath and Rule of Life;
- additive `faith` state under the existing local store;
- partner-sync schema 7 for deliberately shared prayer only;
- Faith-safe context summaries inside `intelligence.js`;
- Faith routes/screens and event handlers.

Existing Phase 1/2 architecture remains intact:
- `domains.js`
- `contracts.js`
- `journeys.js`
- `theme.js`
- `rewards.js`
- `camp.js`
- `intelligence.js`
- `prompt-registry.js`

## Privacy model

Local state remains the source of truth. Connection secrets remain stored separately from normal backups. Faith data is local-first.

Partner sync may contain only the prayer request deliberately selected for sharing plus prayer acknowledgements. The sync contract does not include the private prayer journal, answers, gratitude, Rule of Life or reflection text.

## Compatibility

- App/UI: **6.0.0-p3**
- Local state: **v10** — additive Faith state; no forced reset
- Partner sync: **schema 7**
- Service worker: **insync-v10-18**

An older schema-6 partner file remains readable; it simply has no shared-prayer fields.

## Test gate

The release passes **1,088 / 1,088 automated assertions with 0 failures**, including **81 Phase 3 Faith Foundation checks**.

## Next roadmap phase

**Phase 4 — Training 2.0**

Planned scope:
- readiness check;
- effort/RIR;
- rest timer;
- progression engine 2.0;
- deload proposals;
- gym/equipment profiles;
- expanded exercise library/media;
- structured walk metrics.

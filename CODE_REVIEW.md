# InSync 6.0.0-p5.3 — Journey Checkpoint Code Review

## Architecture
The new Journey layer is deliberately split between **catalog truth** and **experienced history**.

`journeys.js` owns deterministic route content:
- route legs and distances;
- checkpoint names/order;
- which completed leg unlocks each checkpoint;
- primary vs secondary checkpoint semantics;
- section-art paths;
- Travel/Leg art paths;
- Checkpoint Arrival art paths;
- cumulative checkpoint distance.

`store.js` owns only what actually happened:
- whether current route progress has passed the unlock boundary;
- reached timestamp when known;
- completed leg index;
- owner leg miles;
- partner leg miles.

This avoids copying geography into user state and prevents future route-content updates from requiring a destructive local migration.

## Migration safety
`expedition.arrivals` is additive within existing `insync.v10` state.

Older installs may have `legIndex` progress but no arrival history. Normalization creates bounded migrated checkpoint markers for places that must already be unlocked. Those records are explicitly marked `migrated:true`; the UI does not invent an arrival timestamp or contribution split.

## Unlock semantics
Checkpoint availability remains derivable from route progress:
- start checkpoint: open immediately;
- current/future destination: locked;
- checkpoint attached to an already completed leg: open;
- completed/walked expedition: all checkpoints open.

Because availability is not dependent solely on the new history map, a damaged or older arrival map cannot lock away legitimate prior progress.

## Arrival recording
`beginExpedition()` records the trailhead with a real local timestamp.

`advanceLeg()` keeps the existing distance/fairness gate, then records every checkpoint tied to that completed leg. One checkpoint is designated primary for the immediate Arrived screen. Secondary place checkpoints allow the current simplified route catalog to preserve meaningful locations without forcing an artificial extra mileage leg.

Partner sync can also record the matching checkpoint when a newer shared leg advances this phone. Sync schema remains 7.

## Visual fallback architecture
The generated v2 art intentionally does not have to be finished yet. The build ships a 4×4 transparent WebP at every reserved v2 image path.

`UI.screen({ art, artFallback })` renders the reserved expedition asset as the top image layer and the current known-good art beneath it. While the placeholder is transparent, the production fallback remains visible. When the final artwork replaces the exact file, the same screen code automatically displays it.

The 238 tiny placeholders are not added to the service-worker core install list; artwork continues to use the existing lazy/stale-while-revalidate path. This avoids bloating first-install shell work while keeping every repository path valid.

## Distinct visual states
The code intentionally keeps four jobs separate:
1. App section art — recurring screen atmosphere.
2. Travel/Leg art — movement through the active route segment.
3. Checkpoint Arrival art — the scenic place that was reached.
4. Final Arrival Ceremony art — whole-expedition completion.

Journey shows the starting checkpoint before the first mile, then switches to Travel art. Arrived/checkpoint detail uses checkpoint art. The new `expeditionComplete()` surface uses the final section arrival art.

## Privacy
Checkpoint history contains bounded expedition progress only. It does not introduce meal history, workout details, body metrics, journal content or private AI context into partner sync. The existing pair-progress boundary remains intact.

## Faith / Training / Nutrition boundaries
Faith remains parked. The checkpoint work does not touch Faith reward logic or expose its stored content. Training 2.0 and Nutrition 2.0 remain unchanged except that their existing screens can now request expedition-specific section artwork with a fallback.

## Image handoff
`EXPEDITION_ASSET_DROP_GUIDE.md` is generated from the production Journey catalog and lists every exact asset path across all 12 routes. Artwork can therefore be dropped into the reserved directories later without another feature redesign.

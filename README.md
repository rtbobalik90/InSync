# InSync 6.0.0-p5.6

Current production build: **Visual Scrims + Train Architecture Refinement**.

This build keeps the Phase 5.4 Grand Canyon production art and checkpoint system, while refining how expedition art is presented and simplifying the Train experience.

## Train
The Train tab is now intentionally layered:
1. Weekly navigator / This Week.
2. Your Plan.
3. Records & Progression.
4. Exercise Library.
5. Body.
6. Add Workout / current-plan controls where applicable.

Open a specific day to access Readiness, the Walk Timer, planned exercises, session start/logging, steps and historical corrections. Previous and next training weeks are browsable from the weekly card.

## Home
Morning and nightly prompts are action cards. They disappear when completed and remain editable through History.

## Expedition artwork
UI exposes light, medium and heavy scrim presets. Scenic/emotional screens preserve more artwork; utility-heavy Train screens retain stronger contrast.

## Compatibility
- Local storage: `insync.v10`
- Partner sync: schema 7
- Runtime: `6.0.0-p5.6`
- Service worker: `insync-v10-28`
- Faith: parked


## P5.6 hotfix

- Train hero art is open/undarkened across the top and only fades into the card stack near the bottom.
- Current and historical Train-day Steps cards now include Add/Edit steps.
- Historical steps continue to be editable from History as well.


P5.7: Phase 2 overlay refinement begins with a train-specific hero treatment that removes the heavy full-screen wash and keeps the canyon image open through the upper and middle frame.


P5.7.2: Train hero geometry corrected. The main Train photograph now extends to 690px instead of ending at 390px, and the fade begins around 62% of the hero so the photograph stays visible until the card transition.


## P5.8 - Experience Polish / Phase 3
- Route-aware screen shell for section-specific visual treatment.
- Scenic headers and expedition scrims are lighter and more localized.
- Cards gain subtle depth and more consistent spacing.
- Train week labels wrap cleanly instead of clipping long workout names.
- Larger 44px header touch targets, explicit focus states, and reduced-motion support.
- Runtime 6.0.0-p5.8; service worker insync-v10-32.

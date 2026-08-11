# InSync 6.0.0-p5.6 — Train Art + Historical Steps Hotfix

## Visual refinement
- Train now uses a dedicated expedition scrim with **no dark wash across the top 58% of the hero image**.
- The lower gradient remains so the artwork still blends naturally into the dark Train card stack.
- Both the Train landing page and individual Train-day pages use the same dedicated treatment.

## Historical steps correction
- Every current or past Train day now has an obvious **Add steps / Edit steps** button directly inside its Steps card.
- The button opens the existing dated steps sheet and saves to the selected calendar date, not today.
- Future days do not expose edit actions.
- History & Calendar retains its dated Steps correction path as well.
- Late phone/watch sync corrections can therefore be entered from either Train day or History.

## Compatibility
- Runtime: `6.0.0-p5.6`
- Service worker: `insync-v10-28`
- Local storage remains `insync.v10`.
- Partner sync schema remains 7.
- Faith remains parked.


## P5.7 — Phase 2 kickoff
- Added a train-specific screen class and lighter header scrim.
- Rebuilt the Train hero scrim so the photo stays open through the middle of the frame and only transitions near the card stack.
- Applied the same treatment to the individual workout-day screen.
- Bumped the service-worker cache to insync-v10-29.


## P5.7.1 — Train Day Hero Correction
- Removed the legacy permanent blur from individual Train day screens.
- Workout-day expedition art now remains crisp and uses the same localized Train scrim as the weekly Train page.
- Bumped the service-worker cache to insync-v10-30.


## P5.7.2 — Train hero geometry correction
- Extended the main Train hero from 390px to 690px so the artwork continues behind the transition instead of ending in a dead black band.
- Delayed the dedicated Train fade until roughly 62% of the hero, with the strongest darkening confined to the lower transition into the weekly card.
- Preserved the crisp workout-day hero treatment.
- Runtime 6.0.0-p5.7.2; service-worker cache insync-v10-31.


## P5.8 - Phase 3 Experience Polish
- Added route-aware and tab-aware screen classes to the shared UI shell.
- Rebalanced light/medium/heavy expedition scrims so scenic art remains visible while cards carry most contrast.
- Lightened header protection on Home, Together, Coach, Journey, Nutrition, Checkpoints and Arrivals.
- Preserved the approved Train hero geometry and lower-only fade.
- Improved weekly Train day tiles so multi-word plan names wrap to two lines rather than showing broken ellipses.
- Added subtle card depth, 14px stack rhythm, 44px header touch targets, focus-visible states and reduced-motion support.
- Tightened Train hero copy for a cleaner mobile hierarchy.
- No local-state reset and no partner-sync schema change.
- Runtime 6.0.0-p5.8; service worker insync-v10-32.

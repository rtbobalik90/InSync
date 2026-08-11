# InSync 6.0.0-p5.8 — Phase 3 Experience Polish Code Review

## Scope
This pass deliberately avoids adding new health logic. It standardizes the visual shell and interaction polish across the existing product while preserving the approved Train hero geometry.

## Changes reviewed
- `UI.screen()` now emits route-aware and tab-aware CSS classes without altering route behavior.
- Expedition scrims were rebalanced to let scenic artwork carry more of the visual experience.
- Header protection is localized by route instead of relying on one global heavy black lid.
- Train retains its lower-only transition, with the headline width and copy tuned for mobile.
- Weekly Train labels use a bounded two-line treatment instead of ellipsis-only clipping.
- Cards use consistent depth/rhythm, and primary header controls meet a 44px touch target.
- Focus-visible and prefers-reduced-motion behavior were added without changing core flows.

## Data / privacy
No state migration. No partner-sync schema change. No new shared fields. Faith remains parked.

## Verification
Full deterministic suite: 1,771 PASS / 0 FAIL.

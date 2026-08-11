# InSync 6.0.0-p5.7.2 — Test Report

Phase 2 Train hero geometry correction.

Focused regression coverage verifies:
- the main Train hero extends to 690px rather than ending at 390px;
- the expedition art remains visually open through the upper/middle hero;
- the fade begins low in the image and resolves into the app ground only near the card transition;
- workout-day art remains crisp rather than permanently blurred;
- historical/current day step editing remains available;
- runtime and service-worker identifiers are current.

Full deterministic suite: 25 test files passed, 0 failed; 1,762 PASS assertions.

Runtime: `6.0.0-p5.7.2`
Service worker: `insync-v10-31`

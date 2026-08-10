# InSync 6.0.0-p4 — Training 2.0

Phase 4 turns Train from a workout logger into a deterministic personal-training loop while keeping Faith parked for later redesign.

## Active primary experience
**Home · Journey · Train · Nutrition · Together**

Coach remains globally accessible. Faith remains parked, with its source/data preserved but not loaded by the active production shell.

## Training 2.0
- 10-second readiness check: energy, soreness and pain flag.
- User-controlled lighter-session option; no automatic workout rewrite.
- Easy / Right / Hard effort logging, with optional 0–5 Reps In Reserve mode.
- Persistent automatic rest timer with add-time and skip controls.
- Deterministic progression engine with a visible “Why this?” evidence trail.
- Deload/recovery-week proposals derived from recent effort/readiness, requiring explicit approval.
- Per-person gym profiles: Planet Fitness, Home, Full gym, or Custom equipment.
- AI plan validation constrained to exercises the configured gym can actually support.
- Expanded exercise library with 12 new animated movement assets.
- Structured walk metrics: speed, incline, manual distance and elevation gain.
- Expedition walking distance uses the best available source per day, preventing treadmill/step double-counting.

## Architecture rule
Claude may compose a weekly plan and explain it, but progression, readiness handling, equipment eligibility and deload proposals are code-derived. Training recommendations never depend on Claude inventing exercise logic.

## Compatibility
- Local state: v10
- Partner sync: schema 7
- No data reset required

## Test status
**1,142 automated assertions pass with 0 failures.**

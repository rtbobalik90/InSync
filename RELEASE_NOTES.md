# InSync 6.0.0-p4 — Training 2.0

## Training loop
- Added a fast readiness check for energy, soreness and a non-diagnostic pain flag.
- Readiness can propose a lighter session, but the user chooses whether to use it.
- Lighter mode reduces one working set per non-warm-up movement without silently changing the exercise plan.
- Every set can record Easy / Right / Hard effort, or optional Reps In Reserve.
- Automatic rest timers persist through normal app redraws/phone lock state and support +30 seconds or Skip.

## Progression Engine 2.0
- Progression now reads actual working-set history rather than asking AI to infer the next load.
- It understands target rep range, recent load/reps, effort/RIR, current readiness, and recent discomfort substitutions.
- Two comfortable top-range sessions can advance load conservatively.
- Hard/0-RIR finishes hold the load instead of forcing progression.
- Low readiness or a pain flag suppresses load progression.
- Every recommendation carries evidence displayed through **Why this?**.

## Recovery / deload
- InSync can propose a lighter week from repeated hard-set load or strained readiness signals.
- A proposal never activates itself.
- Accepting a recovery week is explicit, persisted, reversible, and reduces working-set volume rather than rewriting the training program.

## Gym and equipment profiles
Per-person settings now support:
- Planet Fitness
- Home
- Full gym
- Custom equipment

Claude's weekly-plan prompt receives the configured equipment set, and code rejects generated plans containing unavailable movements.

## Exercise library expansion
Added real animated WebP media and library definitions for:
- Chest fly machine
- Face pull
- Cable lateral raise
- Reverse fly machine
- Seated leg curl
- Hip abduction machine
- Hip adduction machine
- Dumbbell Romanian deadlift
- Step-ups
- Split squat
- Dead bug
- Pallof press

## Walking
Daily walking now optionally records:
- treadmill speed
- incline
- manual/outdoor distance
- elevation gain

Expedition contribution uses the strongest available walking-distance source for each day rather than adding step-derived distance and treadmill/manual distance together.

## Faith status
Faith remains intentionally parked. Its source and private state are preserved but its dedicated Phase 3/3B interface is not loaded.

## Versioning
- App/UI: `6.0.0-p4`
- Local state: `insync.v10` (unchanged)
- Partner sync: schema `7` (unchanged)
- Service worker: `insync-v10-21`

## Next planned phase
Phase 5 — Nutrition 2.0.

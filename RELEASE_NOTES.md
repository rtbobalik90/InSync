# InSync 5.5.4 — Next Week + Train

## Why this release exists

The 5.5.3 daily-walk redesign exposed an older assumption inside **Set up my next week**: the training writer still believed a Walk day could consume one of the selected gym days. The setup flow also held a valid 28-meal result in memory until training finished, so a later training failure could make the whole operation appear to have done nothing. This release fixes those behaviors and tightens the Train landing screen from the real iPhone feedback.

## Set up my next week

- The selected weekly frequency now means exactly that many **lifting sessions**. Walking is separate every day and can never replace a gym day.
- Claude is explicitly told to return only lifting days and to keep Sunday as recovery. Walk/cardio placeholders are rejected at validation.
- Recovery validation now distinguishes biceps from triceps even though both are presented under the app's broader **Arms** UI category. This prevents a normal Push/Pull split from being falsely rejected as back-to-back Arms training.
- Training generation receives one automatic repair attempt when the first response is malformed or fails the plan contract.
- The 28-meal week is committed as soon as it passes validation. If training fails afterward, the meal week remains saved. Re-running setup retries only the missing half.
- Next-week readiness now verifies the actual four meal slots on each of seven dates and the actual number of lifting-plan rows. Stale metadata or arbitrary rows cannot masquerade as a completed setup.
- Future-plan lookup can resolve staged training for future dates before Monday, which makes previewing next week accurate.
- Staged training promotes when its Monday arrives at launch, on foreground return, or during the visible-app periodic check.
- Weekly training goals now match the full selected lifting frequency rather than subtracting a day for walking.

## Train screen rework

- The dark hero gradient is delayed/lowered so more of the training artwork remains visible.
- The daily Walk timer uses a more compact Train presentation and sits higher in the opening composition.
- **This week** is anchored directly below the Walk timer and participates in the measured resting position, so the current week is part of the initial screen instead of being buried below a large dead band.
- When the coming training week has been staged, Train shows a **Next week — Ready** Monday–Sunday preview without activating it early.
- A future training-day detail view reads the staged future plan rather than incorrectly falling back to the active week.

## Preserved behavior

- Daily Walk remains available on lift, walk and recovery days and stays independent of lifting completion.
- Nutrition preferences, favorites, meal-prep logic, history, weekly review, Coach patterns, Together reactions, notification bell states, private GitHub sync and backup behavior are unchanged except where required for the setup fixes above.
- No local-state schema or partner-sync schema bump was required.

## Version contract

- App/UI: **5.5.4**
- Local state: **v10**
- Partner sync: **schema 6**
- Service-worker cache: **insync-v10-13**

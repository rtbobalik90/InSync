# InSync — Home redesign brief

Source: `uploads/InSync-Robert-Lizzie-PWA-v4.0.0/` (PWA, local-first, two users: Robert & Lizzie).

## Audit findings (v4.0.0)
1. `styles.css` stacks four design systems — `:root` redefined 4× (dark navy v1 → "premium iOS dark" v1.1 → Journey Editorial v3 → v4). Nothing deleted; each release is an override layer.
2. Two competing brands: warm gold cinematic artwork/logo vs. Inter + Georgia + emoji + 8-color gradient theme picker.
3. Emoji used as the icon system (👟🏋️🍎💧🔥✦🍽) beside custom nav art and gold medallions.
4. Georgia stands in for the wordmark's high-contrast Didone serif — mismatch.
5. Photography carries all emotion; data layer is stock dashboard (conic rings, progress tracks, stat cards).
6. Home costs ~3.5 screens of scroll (510px hero + 270px camp card + quest sheet + stats + milestone).
7. Two nav systems: 5 bottom tabs + drawer with ~14 more destinations; 19 screens for 2 users.
8. Train flips the whole app dark via `body:has()`. "78 Daily score" is opaque. 9–10px type below legibility floor.

## Decisions
- **Scope now:** Home only. Deliverable = high-fidelity screen designs the user ports into the PWA himself.
- **Audience:** just the two of them.
- **Light/dark:** adaptive across the whole app, driven by real sunrise/sunset approximated from device timezone (no permission prompt).
- **Theme picker:** remove entirely.
- **Icons:** one hand-drawn line set matching existing nav art (mountains, kettlebell, bowl, cabin).
- **Daily score ring:** cut.
- **Home hero:** full-bleed camp artwork with today's numbers (calories, protein, steps) laid over the bottom of it. Numbers win the top; artwork is the ground.
- **Voice:** field journal + scriptural reflective. Verse opens the screen; the journal line sits beneath it as the day's status.
- **Journal line counts:** current streak — "11 days on the trail".
- **Next action:** a written line generated each morning by the AI coach, sitting under the numbers.
- **Partner (Lizzie) on Robert's Home:** only surfaces when there is something new — her shared totals, streak alongside his, latest note, shared challenge progress. Otherwise Home stays about him.
- **Dev affordance:** add a skip button to bypass onboarding during testing; flag clearly for removal before release.

## Home direction (chosen from built candidates)
- **Winner: Ledger** (`home-ledger.dc.html`) — shorter photo with the numbers tipped in on a ruled journal card. Plate (`home-plate.dc.html`) rejected.
- **Photo:** make it taller — roughly half the screen before the journal card starts.
- **Buttons:** the filled bronze pills are out. Use squared editorial blocks — filled primary + hairline-outlined secondary, ~2px radius.
- **Type:** Playfair Display (display/serif, matches the wordmark's high-contrast serif) + Archivo (UI sans). Tabular numerals.
- **Dark palette:** ground #14150F, card #1E201A, ink #F3EDE1, muted #A69C89 / #8B8474, bronze #C6A15D, sage #8FA184.

- **Corners:** square the buttons only; cards, avatars and everything else keep their current radii.
- **Bottom nav:** edge-to-edge, pinned to the bottom, hairline rule on top — no floating pill.
- **Verse:** sits high in the photo, near the top, so the landscape reads clean beneath it.
- **Scroll:** photo stays fixed; the journal card slides up over it.
- **Card rest position:** low — the full campsite (tent, fire, foreground) is visible on open. The day's numbers sit below the fold, one scroll away. This deliberately overrides the earlier "numbers win the top" answer.
- **Photo:** 580px tall, cropped at `center 58%` to bring the campsite into frame.

## Next phase
- **Time states:** build all four — dawn, day, sunset, night.
- **Journal card in daylight:** translucent — takes its tint from the photo behind it. Light at noon, dark at night.
- **Empty Home (day one):** a first-day welcome from the coach replaces the usual next-step line. Everything else holds its shape.
- **Next screen:** Nutrition, opening as a running log — meals as journal entries down the page.
- **Legibility guard:** heavy blur behind the translucent card — the photo becomes colour and light, never detail.
- **Meal entry:** photo on the left, meal and macros as text — a tight repeating row.
- **Time-state artwork:** the existing camp set for all four — camp-dawn, camp-day, camp-sunset, camp-night. Same campsite always; the light is what changes.
- **Bottom nav:** icons only, no text labels.

## Home — final spec (signed off)
- Photo layer 690px, `background-position: center bottom`, so the full campsite sits in view above the cards. Fades to solid `#14150F` over its last ~80px.
- Cards rest at 587px — the numbers box fully visible at rest, everything below earned by scrolling.
- Photo blurs to 16px on scroll with a slight scale; verse and wordmark fade out.
- Cards are solid `#0D0E0A` in all four states. The cream/light card treatment is retired — every state shares one dark surface.
- Bottom nav: edge-to-edge, icons only, hairline top rule.

## Meal scan → detail (from reference apps)
Taken from references: ingredient-level breakdown, camera-to-plate pins. Rejected: radial calorie gauge (same opaque composite as the cut daily score), bright white styling, emoji food icons.
- **Flow:** shoot first, then the frozen photo fills in with pins while it thinks.
- **Thinking state:** pins drop in one by one as each is found — the analysis is the animation.
- **Pin:** small gold dot on the food with a hairline leader to a label set off the plate.
- **Estimates:** shown as plain numbers, no confidence UI. He edits if they look wrong.
- **Editing:** swipe a row to remove a wrong ingredient, tap to adjust the rest.
- **Missing ingredient:** one "something missing?" action opening add-by-hand, retake, and database search.
- **Nothing recognised:** show whatever it did find, however little, and let him build from there. No apology screen.
- **Detail screen:** keeps the full-bleed photo with the list sliding over it, same as Home and Nutrition.
- **States to show:** analysing, result, mid-edit (row swiped open), sparse (one ingredient), saved.

## Meal generator, cookbook, planner
- **Build order:** generator + cookbook first (the planner consumes them), then trends, then the planner.
- **Generator input:** photograph the fridge or type the ingredients. It generates immediately — he fixes the recipe afterwards rather than verifying a detected list first.
- **Always target-aware:** every recipe is built to fit what is left of the day. This is the thing generic recipe apps cannot do.
- **The word is "cuisine."**
- **Honesty marker:** a generated recipe's macros are estimates and say so. Ingredient data is real; quantities are guessed. (Barcode = read, restaurant = published or estimated, generated = computed.)
- **Impossible gaps:** when no honest recipe fits, offer the week rather than the day. Days flex inside a weekly allowance; nothing is owed or repaid.
- **Home:** gains a quiet weekly line under the day's numbers ("2,400 spare this week"). Home stays daily otherwise.
- **New recipe** gives a fully new dish each time under the same constraints.
- **Recipe images:** I cannot generate food photography. A new recipe shows an empty photo slot prompting him to shoot it after cooking; the cookbook shows real photos once they exist.
- **Cookbook:** explicit saves plus anything cooked three or more times. Auto-added entries carry a quiet "cooked N times" marker, no separate grouping.
- **Planner (later):** plans whatever he marks as needing a plan, not a fixed 21 meals. Cost shown per meal, never as a confident weekly total. Shopping list grouped by aisle, tapping an item reveals which recipes need it.

## Trends (later)
One card, one question, one number, one action. No composite score. The six questions: which meal slot misses, is the weight trend real or noise, weekday versus weekend, did the change work, logging consistency, chapter pace.

## Together
- **Friendly competition**, not co-op — side by side, someone is ahead.
- **Weighted points**, earned identically by both, so different targets stay comparable: workout 3, protein 2, calories 2, steps 2, weigh-in 1. Ten a day maximum.
- **This week prominent, running total quiet underneath.**
- **Being behind must read as closable** — "nine points back, one walk covers it". Never a rebuke.
- **Privacy:** each person picks what crosses over, item by item, in settings. The screen states what is shared and what is not.

## Reflection
- A journal he writes freely into, with the day's numbers attached quietly at the bottom.
- The morning's verse is the thing he writes against — it greets the empty page.

## Train
Deliberately deferred — to be built together, as today's workout with a light week view above it.

## Together — expedition system (supersedes the shared camp)
Twelve expeditions, each a real place, four weeks each. Chosen together; the next is picked jointly at the end of each expedition.

The twelve: Camino de Santiago (Spain), Appalachian Trail (USA), John Muir Trail (California), Tour du Mont Blanc (Alps), Everest Base Camp (Nepal), Kilimanjaro (Tanzania), Inca Trail to Machu Picchu (Peru), Torres del Paine (Patagonia), Milford Track (New Zealand), Grand Canyon rim to rim (Arizona), Jesus Trail (Galilee), Mount Sinai (Egypt).

- **Faith places** — a few carry scripture tied to the place itself (Jesus Trail, Sinai, the Camino).
- **Legs vary by expedition** — Kilimanjaro fewer, the Camino more. Legs unlock on shared XP.
- **Falling short is not punished** — the expedition simply takes longer. You arrive when you arrive.
- **Hero** — the current leg's artwork, its name, and how far to the next unlock. The two position markers are gone.
- **Shared camp: cut.** The expedition is the progression; a second growing system competed with it.
- **Geography is real** — each leg is an actual segment with real distance and elevation.
- **Two unlock conditions, both shown as bars:** combined miles walked advance the route; shared XP unlocks the leg. No per-person floor — combined miles are enough (half-each was tested and dropped as too strict).
- **Arrival:** a full-screen moment naming the place, the date and what each contributed. Whoever opens the app next sees it; the other sees it when they open theirs.
- **Selector:** three expeditions open at a time, chosen by difficulty. Opening three are the Camino, the Milford Track and the Grand Canyon. Harder ones gate until an easier expedition is finished.
- **Difficulty is shown and enforced.**

## Together — the handshake and notifications
- **Proposing:** nothing starts until she answers. Together shows a waiting state.
- **Her view:** a full-screen invitation — the route, its length and climb, accept or counter.
- **No plain refusal.** She counters with a different route, which returns to him as a new proposal to accept.
- **Counter cap:** after two counters the app decides, and it picks the route neither of them has walked before.
- **Waiting:** after a day, he can nudge. The nudge reads as a quiet push — "Robert is waiting on the Camino" — never impatience.
- **Notification centre** reachable from the bell on Home (currently a dead icon).
- **Push events:** she proposed, she accepted, she sent a note, she sent a high five, a challenge accepted, a challenge expiring, a leg opened, she earned a badge. **The "neither of you logged today" nudge was deliberately cut** — it is the app nagging, and it fires hardest on the worst days.
- **Voice:** the app's own — "She's in. The Camino starts today."

## Train
- **Library:** 25 Planet Fitness loops supplied — 12 machine/dumbbell lifts (biceps, triceps, glutes, legs) and 13 bodyweight and dynamic-stretch moves. Warm-ups come from the bodyweight set; the lifts are the workout itself.
- **Machine loops** sit small on each exercise row, so he knows which machine to walk to at a glance.
- **The workout is a list he ticks off**, tapping into an exercise to log each set.
- **Logging:** set by set as he finishes, weight and reps, one tap to repeat the last set.
- **Rest timer:** automatic but silent — on screen only, no sound or buzz.
- **Plan:** coach-written, and he can swap any exercise. The coach offers one alternative and he confirms.
- **Week strip:** named days — Push, Pull, Legs, Rest.
- **Finish:** a summary — what he lifted, XP earned, and what it did to the expedition.
- **Rest day:** its own screen about what recovery is doing. Nothing to log.

## Standing rules (learned the hard way)
- 11px is the type floor and it must clear 4.5:1. Three separate defects came from 11px text placed on a busy or tinted ground: the Nutrition eyebrow, the "Reading the plate" caption, and the selected portion chip's gram sub-label.
- Never dim small text with `opacity` — set the colour outright, so its contrast is knowable. Dark ink at 72% on gold blends up to an unreadable olive.
- Text over photography sits on a dark chip or in the top quarter where the scrim is strongest; text shadows are not a substitute for ground.
- `#8A8371` is the muted-ink floor on dark cards. `#7E7767` fails 4.5:1 at body sizes and is only safe on inactive controls — it has been retired twice for this.
- Never type a total that a list already implies. Derive it — a screen about trustworthy numbers cannot have arithmetic that drifts.

## Progression — settled
One system, not three. **Levels are cut. Chapters are cut. Journey is cut as a section.**
The expedition in Together IS the progression: where the two of you are on a real route, which legs are walked, what unlocks next.
- Home's old "Chapter two · Level 6 · Building Rhythm" card is now the expedition position — route name, current leg, stops walked, miles together. It derives from the same route definition Together uses.
- Journey's bottom-tab slot goes to the **AI Coach**. Five tabs: Home, Coach, Train, Nutrition, Together. **Body lives inside Train.**
- Milestones (weight thresholds, firsts, expeditions finished, strength records, streaks, days logged) live in Together beside the badges — the same shelf of things earned.

## Settings
- **Shape:** grouped cards on one page, matching the rest of the app.
- **Entry:** tap the avatar in the header.
- **Cards:** Profile, Targets, Privacy, Notifications, Units, Data, About. No account card — no sign-out, no user switching; each of them has their own device.
- **Targets:** the coach proposes and adjusts over time; nothing changes without a tap. A proposal arrives as a notification and opens the proposal itself.
- **Privacy:** per-metric toggles (weight, calories, workouts, steps). Progress photos have no toggle — never shared, and Settings says so plainly.
- **Notifications:** the eight from the handshake spec, controllable here. The daily logging reminder stays cut.

## Badges
- **Eight categories:** Streaks, Firsts, Strength, Distance, Consistency, Body, Together, Faith. No target count — as many as each category needs.
- **Form:** stamped seals, passport style, each drawn individually as hand-built SVG (no generated artwork).
- **Tier:** common / hard / rare, shown as a small label.
- **Browsing:** categories with counts; open one to see its stamps.
- **Locked stamps:** name and condition both hidden — a blank stamp and a count. The coach mentions one occasionally when he's near it; that is the only pull.
- **Detail:** date earned, exactly what was done, where he was in the expedition, whether Lizzie has it, tier, next in series.
- **Earning moment:** full-screen, fires at the end of the action (after saving the workout or meal), never mid-set.
- **Lizzie's page:** her earned stamps only. Her unearned ones are not visible.

## Home content order
1. Camp artwork hero (time-of-day) with verse, journal/streak line, and today's numbers overlaid at the bottom
2. AI coach's next action for today
3. Journey position — level, chapter, next milestone
4. Lizzie, conditionally

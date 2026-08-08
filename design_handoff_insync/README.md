# Handoff: InSync v5

## Overview

InSync is a local-first PWA for two people — Robert and Lizzie — tracking training, nutrition, body metrics and a shared expedition. Sixteen screens were redesigned from the v4.0.0 package. This bundle is the design reference and the spec for porting them into one app.

Target repo: `rtbobalik90/InSync` (currently empty).

## About the design files

The `.dc.html` files in this bundle are **design references written in HTML** — prototypes showing intended look and behaviour, not production code to copy.

Each one is a **standalone review page**, and carries three things that must NOT be ported:

1. **A row of state-switcher buttons at the top** (`Analysing / Result / Mid-edit …`). These exist only so the designs could be reviewed. They are not app UI.
2. **Its own copy of the header and bottom nav.** In the app there is one of each, in the shell.
3. **Hardcoded arrays of fake data.** Every screen invents its own numbers. In the app they all read from one store.

What IS the design: everything inside the 390×844 phone frame, minus the chrome above.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, and interaction behaviour. Recreate pixel-accurately. Every hex, size and radius in this document is the intended value.

## Architecture — what makes it one app

The v4.0.0 package already had the right shape: `index.html`, `app.js` with render functions returning HTML strings, a hash router, `styles.css`, `config.js`. Keep that shape. Do not introduce a build step or a framework unless you have a reason — this app is two users on two phones.

```
index.html          one page, one #app container
app.js              router + screen registry
store.js            NEW — the single source of truth (see Data layer)
screens/
  home.js           each exports render(state) -> html string
  coach.js
  nutrition.js
  train.js
  together.js
  body.js
  settings.js
  ...
components/
  header.js         ONE header, used by every screen
  nav.js            ONE bottom nav, five tabs
  cards.js          the repeating card/row primitives
styles.css          one token block at :root, nothing else redefines it
assets/art/         photography (see Assets)
```

### Rules that keep it one app

- **One `:root`.** The v4 stylesheet redefined `:root` four times across four releases; that is what made it unmaintainable. There is one token block. Nothing overrides it.
- **One header, one nav.** Screens render content only. The shell draws chrome.
- **No screen computes a number it did not derive from the store.** See "Derived values" — this was the single most common defect during design.
- **No screen-level theme switching.** v4 flipped the whole app dark via a `body:has()` hack on the Train screen. The app is dark; Home varies its photograph by time of day, not its palette.

## Navigation

Five bottom tabs, **icons only, no labels**:

| Tab | Screen | Contains |
| --- | --- | --- |
| Home | `home` | The day |
| Coach | `coach` | Today's line, Ask, Its working, Evening |
| Train | `train` | Session, Walk, Records, Body |
| Nutrition | `nutrition` | Log, scan, planner, cookbook, trends |
| Together | `together` | Expedition, challenges, notes, badges |

Bottom nav: edge-to-edge, pinned, `height:76px`, `padding:0 6px 12px`, `background:rgba(20,21,15,.94)`, `border-top:1px solid rgba(243,237,225,.14)`, `backdrop-filter:blur(22px)`. Active tab: icon `#E4CB99` with a 22×2px `#C6A15D` rule at the top of the button. Inactive: `#8B8474`.

Settings is **not** a tab — it opens from tapping the avatar in the header.

There is no Journey tab. It was cut: the expedition system in Together does chapters, progression and unlocking, and two sections doing that job is one too many.

## Design tokens

### Colour

| Token | Hex | Use |
| --- | --- | --- |
| ground | `#14150F` | App background |
| card | `#0D0E0A` | Every card surface |
| card-alt | `#1E201A` | Rare — nested surfaces |
| ink | `#F3EDE1` | Primary text |
| ink-over | `#F6F1E6` | Text over photography |
| muted | `#A29A87` | Secondary text |
| muted-floor | `#8A8371` | **Quietest legal text colour** |
| dim | `#8B8474` | Inactive icons, unit suffixes |
| inactive | `#7E7767` | **Inactive controls ONLY** — fails 4.5:1 on `#0D0E0A` |
| bronze | `#C6A15D` | Primary action, accent |
| bronze-lift | `#DCBE85` | Bronze hover |
| bronze-over | `#F2DFB4` | Accent text over photography |
| bronze-text | `#D8B87C` | Accent text on cards |
| sage | `#8FA184` | Secondary/positive |
| sage-text | `#95A889` | Sage text on cards |
| danger | `#5E2A22` | Destructive only — appears nowhere else |
| hairline | `rgba(243,237,225,.14)` | Card borders |
| rule | `rgba(243,237,225,.13)` | Dividers |

`#7E7767` was retired twice during design for failing contrast on card text. It is safe only on disabled controls.

### Typography

- **Display:** Playfair Display, 400/500/600, plus 400 italic. Numbers, headlines, card titles, quotes. `font-variant-numeric: tabular-nums` on every figure.
- **UI:** Archivo, 400/500/600/700. Labels, body, buttons, eyebrows.
- **Never** Georgia (v4's stand-in), never Inter.

Scale:

| Role | Size | Weight | Tracking | Transform |
| --- | --- | --- | --- | --- |
| Hero headline | 25–26px Playfair | 500 | — | — |
| Card title | 21–23px Playfair | 500 | — | — |
| Row title | 17px Playfair | 500 | — | — |
| Big figure | 27px Playfair | 400 | — | tabular |
| Row figure | 19–20px Playfair | 400 | — | tabular |
| Body | 12.5–14px Archivo | 400 | — | — |
| Eyebrow | 11px Archivo | 600 | `.15–.2em` | uppercase |
| Button | 11.5px Archivo | 600/700 | `.12em` | uppercase |

**11px is the absolute floor.** Nothing below it, anywhere. v4 had 9px and 10px labels; that was the first thing flagged in the audit and it recurred three times during design.

### Geometry

- Card radius `16px`. Phone frame `26px`. Avatars/round buttons `50%`.
- **Buttons are square** — `border-radius: 2px`. No pills anywhere.
- Card gap `12px`. Screen padding `0 14px`. Card padding `17px`.
- Primary button `min-height:52px` (46px inside cards). Secondary same height, `1px solid rgba(243,237,225,.26)`, transparent.
- Every tappable target ≥44px.

### Buttons

```
Primary    background:#C6A15D; color:#191A12; border:0; radius:2px;
           font:700 11.5px Archivo; letter-spacing:.12em; uppercase
           hover -> background:#DCBE85

Secondary  background:transparent; color:#E8E0CF;
           border:1px solid rgba(243,237,225,.26); radius:2px;
           font:600 11.5px Archivo; letter-spacing:.12em; uppercase
           hover -> border-color:#C6A15D

Destructive  background:#5E2A22; color:#F6DED8
```

### Toggles

46×27px, radius 99px. On: track `rgba(198,161,93,.9)`, knob `#191A12` at `left:23px`. Off: track `rgba(243,237,225,.1)`, border `rgba(243,237,225,.24)`, knob `#8A8371` at `left:2px`. Transition `.18s ease`.

## The photo-and-card pattern

Every screen with photography uses the same construction. Get this right once and reuse it.

```html
<div class="frame">                      <!-- 390×844, overflow hidden -->
  <div class="photo"></div>              <!-- fixed, blurs on scroll -->
  <div class="fade header">…</div>       <!-- z-index 10, fades on scroll -->
  <div class="fade hero-text">…</div>    <!-- z-index 2, fades on scroll -->
  <div class="scroll">                   <!-- z-index 8, inset 0 -->
    <div class="spacer"></div>           <!-- pointer-events:none -->
    <div class="cards">…</div>
  </div>
</div>
```

**Photo layer.** `position:absolute; left:-24px; right:-24px; top:-24px; bottom:-24px;` (the overhang stops blur bleeding at the edges), `background-size:cover`, `will-change:filter`, `transform-origin:center top`.

**Scroll handler.** Range 240–340px depending on screen:

```js
const p = Math.min(1, Math.max(0, scroller.scrollTop / RANGE));
photo.style.filter = `blur(${p * 16}px)`;
photo.style.transform = `scale(${1 + p * 0.04})`;
const o = Math.max(0, 1 - p * 1.9);
fades.forEach(el => el.style.opacity = o);
```

**Scrim.** A single gradient in the photo layer's `background-image`, before the url. Strong at top for the header, thin through the middle so the photograph survives, fading to solid ground before the cards:

```
linear-gradient(180deg,
  rgba(10,12,8,.58)  0%,
  rgba(10,12,8,.06) 22%,
  rgba(10,12,8,.06) 38%,
  rgba(20,21,15,.12) 46%,
  rgba(20,21,15,.64) 55%,
  #14150F 63%, #14150F 100%)
```

Two failures to avoid, both hit during design:
- **The seam.** A separate text scrim that ends at full strength mid-photo creates a visible horizontal band. Text scrims must fade back to transparent through empty padding.
- **Header dead zone.** The scroll layer sits above the header unless the header is `z-index:10+` and the spacer is `pointer-events:none`.

**Rest position.** The spacer height decides what is visible before scrolling. Per screen: Home 587px, Coach (Today) 556px, Coach (other) 210px, Nutrition 262px, Settings 210px. Home's 587 is exact — it puts the day's numbers card fully in view with nothing half-cut by the nav.

## Data layer

**Real local storage.** Entries persist; every total computes from what was logged. Nothing is a literal.

### Store shape

```js
{
  profile:   { name, heightIn, age, startedISO },
  goal:      'lose-fat' | 'build-muscle' | 'hold' | 'get-stronger',
  targets:   { calories, protein, steps, weightLb },
  units:     { weight:'lb'|'kg', distance:'mi'|'km', energy:'kcal'|'kJ' },
  privacy:   { weight:false, calories:true, workouts:true, steps:true },
  notifs:    { invite, counter, target, accept, leg, note, badge, weekly },

  meals:     [ { id, dateISO, time, slot, name, photo,
                 items:[{ name, grams, kcal, protein, carbs, fat }] } ],
  workouts:  [ { id, dateISO, type:'lift'|'walk',
                 exercises:[{ machine, sets:[{ weight, reps }] }],
                 minutes, incline, speed } ],
  morning:   [ { dateISO, weightLb, restingHr, sleepHours } ],
  bodyFat:   [ { dateISO, pct } ],
  photos:    [ { id, dateISO, uri } ],          // never synced
  reflections:[ { dateISO, text, verseRef } ],

  expedition: { routeId, legIndex, hisMiles, herMiles, proposedBy, status },
  points:     [ { dateISO, who:'him'|'her', source, value } ],
  badges:     [ { id, earnedISO, who } ]
}
```

localStorage key `insync:v5`. One read on boot, one write on mutation.

### Derived values — do not hardcode

This is the most important rule in the document. During design, prose containing a number contradicted the data beside it **eight separate times**. Every one of these must be computed:

| Value | Derived from |
| --- | --- |
| Daily totals (kcal, protein, carbs, fat) | Sum of `meals` for the date |
| "X to go" / "X short" | `target − total` |
| Streak / "Day N on the trail" | Consecutive days with any entry since `startedISO` |
| Session count, "Nth session this week" | `workouts` filtered to the week |
| Miles walked | `minutes × pace`, pace from speed |
| Calories burned | MET formula — one implementation, used by Train and Records alike |
| Points, gap, "N points back" | Sum of `points`; never stored as a column |
| Legs walked, expedition % | Route definition + `hisMiles`/`herMiles` |
| Weight change, 7-day average | `morning` series |
| Badge counts, "N of M shared" | Filter the arrays |
| Every sentence containing a figure | The same source as the figure next to it |

**A sentence containing a number is not a string.** Build it from the same value it describes.

### Points system

Weighted, identical for both people, ten a day:

| Source | Points |
| --- | --- |
| Workout complete | 3 |
| Protein target | 2 |
| Calorie target | 2 |
| Step target | 2 |
| Morning weigh-in | 1 |

Identical weights are what make a contest possible between two people with different targets.

## Screens

Each has its own `.dc.html` in this bundle. Below is what each is for and the non-obvious rules.

### Home — `home-time-states.dc.html`
Four time states (dawn, day, sunset, night) driven by real sunrise/sunset approximated from device timezone — no permission prompt, no location. The camp photograph changes; the palette does not. Verse opens the screen, journal/streak line below it, day's numbers card at 587px. Coach's next-step line, then journey position, then Lizzie **only when there is something new**.

### Coach — `Coach.dc.html`
Four states: Today (sharp photo, cards at 556px), Ask (blurred, 210px), Its working (blurred, 210px), Evening (blurred, 210px). Today's photo stays sharp because it is the morning screen; the others are working views. Ask has suggested questions, a scrolling exchange, and an input pinned above the nav (scroll padding 212px so the last reply clears it). Its working shows the evidence behind today's line. Chapters are coach-written retrospectives; milestones are the record they are built from.

### Nutrition — `Nutrition-v2.dc.html`
A running log: meals as journal entries down the page — photo left, name and macros as text, calories right. Yesterday continues below today; the log does not reset at midnight. The unfilled next meal carries the remaining gap.

### Meal scan — `meal-scan.dc.html`
Shoot first, then the frozen photo fills with pins one at a time. Pin = 4.5px `#C6A15D` dot with a hairline leader to a label chip in one of the four dark corners (the bowl fills the frame; the corners are the only true off-plate margin). Ghost lines hold space while resolving; totals sit `#8B8474` until complete, then `#F3EDE1`. Swipe a row to remove, tap to adjust. One "Something missing?" action opens add-by-hand, retake, and database search. If nothing is recognised, show what it did find — no apology screen.

### Barcode / restaurant / generator / planner / trends
`barcode-scan.dc.html`, `restaurant-add.dc.html`, `meal-generator.dc.html`, `week-planner.dc.html`, `trends-v2.dc.html`. The planner derives everything from the ticked slots — hero, CTA, meal rows, cost average, shopping list, multipliers all move together, and the shopping list drops items no recipe needs. Trends cards are one question, one sentence answering it, the evidence, one action; a card with nothing to say says so rather than inventing advice.

### Train — `Train.dc.html`
Session and walk. Machines, sets, weights. Swap an exercise when a machine is taken, with the coach explaining the substitution.

### Records — `Train-Records.dc.html`
Per-exercise progression with PRs marked, workout history, cardio trends. Eight weeks of history.

### Body — `Body.dc.html`
Six states. Morning entry is **one card, three fields, one keypad** — weight, resting heart rate, sleep in a single pass. Body fat weekly. Charts show gaps honestly: a broken line with a dotted rule across unrecorded spans. Weight chart carries a 7-day average behind the daily line. Photo timeline pins the first photo left so every comparison is against the start. Capture ghosts the previous photo behind thirds guides. Photos never leave the device.

### Together — `Together.dc.html`
One continuous screen: current leg hero, two unlock bars, route, today's expedition, challenge board, accountability notes, quick-send encouragement, activity stream, badges, weekly summary, privacy. Evening state is the campfire. Three expeditions open (Camino, Milford, Grand Canyon); nine hidden until unlocked. Everything derives from one route definition. See `EXPEDITIONS.md` for all twelve routes and 64 legs.

### Handshake — `Together — Handshake.dc.html`
Invitation, waiting, countering, accepted, notifications. **There is no decline button** — the alternative to accepting is proposing somewhere else. Two counters and the app settles it by choosing the route neither has walked. Notifications group by whether they need an answer.

### Reflection — `Reflection.dc.html`
The morning's verse over the night camp, then a blank page. The day's numbers attach below the entry, never above it. Past nights keeps nights with nothing written, with their numbers.

### Settings — `Settings.dc.html`
Four states. Grouped cards, entered from the avatar. **No account card** — no sign-out, no user switching; each person has their own device. Goal drives all four targets: pick "build muscle" and calories rise while steps *drop* so the surplus survives the day. The coach proposes; nothing changes without a tap. Privacy is per metric; photos have no toggle and the card says so. Notifications names the daily logging reminder as **deliberately absent** — it would fire hardest on the days you were already struggling.

First-run state contains the **testing bypass**: "Skip to seeded day" drops into a seeded state (meals logged, workout done, 11-day streak). **Remove this card before release.**

## Interactions

- Scroll blur/fade as specified above.
- Toggles `.18s ease`.
- Pin drop `omPinIn .34s cubic-bezier(.2,.9,.3,1.4)`, staggered `0.55s` per pin; leader `omLeaderIn .3s ease-out` at `+0.2s`; label `omLabelIn .3s ease-out` at `+0.34s`.
- Row entry `omRowIn .34s ease-out`, staggered with its pin.
- Swipe-to-remove: row translates `-96px`, `.22s ease`, revealing a `#5E2A22` panel.
- No page transitions between tabs. The shell swaps content.

## Assets

In `assets/art/`:

- `camp-dawn.jpg`, `camp-day.jpg`, `camp-sunset.jpg`, `camp-night.jpg` — Home's four time states
- `campfire.png` — Together evening
- `chapter-trailhead/forest/ridge/pass/alpine.jpg` — chapter imagery
- `coastal-expedition.jpg`, `expedition-overlook.png` — expedition banners
- `dispatch-day.png`, `dispatch-night.png` — notification centre
- `provisions.png` — planner
- `train-banner.png` — Train
- `meal-example.jpg` — meal photography
- `camino/`, `milford/`, `grand/` — banner + per-leg plates for the three open expeditions

The other nine expeditions need art before they unlock: 12 banners and 64 leg plates in total, of which 3 banners and 15 legs exist. `EXPEDITIONS.md` lists every leg with distance and climb, and what each image needs to do.

Progress photos are user-supplied; the design uses frames, not images.

## What is not designed

- The full badge set — 6 marks drawn against 50-plus, and no badge detail view.
- Empty day-one Home.
- Nine expeditions' artwork.

## Files in this bundle

All `.dc.html` design references, `EXPEDITIONS.md`, `DESIGN-BRIEF.md` (the decision log — every choice and why), and `assets/`.

Open the `.dc.html` files directly in a browser. Ignore the button row at the top of each; it is a review control.

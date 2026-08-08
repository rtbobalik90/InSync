# InSync

A two-person health app. Not a product — built for Robert and Lizzie, and the design assumes exactly two users who trust each other.

Open `index.html`. No build step, no dependencies.

## What's here

**The app** — `index.html`, `styles.css`, `store.js`, `ui.js`, `screens.js`, `app.js`, `sw.js`, `manifest.webmanifest`.

**The designs** — sixteen `.dc.html` files, one per screen. These are review artifacts, not app files. Each carries a row of state-switcher buttons at the top and its own copy of the header and nav so it can be looked at on its own. What's *the design* is everything inside the phone frame.

**The specs** — `DESIGN-BRIEF.md` (every decision and why), `EXPEDITIONS.md` (12 routes, 64 legs), `BADGES.md` (39 badges with conditions and tiers).

## Architecture

One page. One `#app` container. `location.hash` is the router. `render()` replaces the container's HTML and rebinds. No framework, no bundler.

```
store.js    the only state. Persists to localStorage under insync.v5
ui.js       shared chrome — header, bottom nav, the photo-and-sheet construction
screens.js  one function per tab, returns HTML for the sheet body
app.js      router, event delegation, first-run seed
```

**The five tabs are Home, Coach, Train, Nutrition, Together.** Everything else — Body, Records, Badges, Settings, Reflection, Notifications — is reached from inside a tab, not from the nav.

### The screen construction

Every screen is a fixed photograph with a sheet of cards sliding over it. The photo blurs and the overlay text fades as the sheet rises. `UI.screen({...})` builds it; `UI.bindScroll()` wires the motion.

The sheet's resting position is **measured, not typed**. `UI.restFor()` reads the nav's top edge and the first card's real height and sets the spacer from that, so the first card always clears the nav whatever the copy does to its height.

## The rule that matters

**Nothing on screen is typed.** Every figure, count, percentage and sentence containing a number is derived from `Store`.

During design this was violated eight times — a sentence would assert "four sessions this week" beside a strip showing three, because the prose was written before the data existed and never revisited. If you find yourself typing a number into a string, that number belongs in `store.js` as a selector.

Selectors that already exist: `totals()`, `streak()`, `daysIn()`, `points()`, `pointRows()`, `nextStep()`, `timeOfDay()`, `logged()`.

## Design system

One token layer in `styles.css`. It is not overridden anywhere else — the v4 stylesheet stacked four `:root` blocks from four releases and every change after that was guesswork about which layer won.

| | |
| --- | --- |
| Ground / card | `#14150F` / `#0D0E0A` |
| Ink / muted / floor | `#F3EDE1` / `#A29A87` / `#8A8371` |
| Gold / sage | `#C6A15D` / `#8FA184` |
| Display / UI | Playfair Display / Archivo |

**Type floor is 11px.** Nothing smaller, anywhere.

**`#8A8371` is the muted-ink floor.** Anything darker is for inactive controls and decoration only — never for text a person needs to read. Recession comes from weight and size, not darker ink.

**Buttons are squared** (2px radius). Cards keep 16px. Remove actions use `--danger`, which appears nowhere else, so destruction reads as destruction.

**No emoji.** Icons are inline SVG in `ui.js`. Badges are real artwork in `assets/badges/`.

## Still to port

`app.js` has a `STUBS` map. Each entry names the design file it comes from. Porting one means: strip the state-switcher row and the duplicated header and nav, replace hardcoded arrays with `Store` reads, add it to the router.

Order that avoids rework: extend `store.js` first for whatever the screen needs, then port the markup.

# InSync

Two people, one trail. A local-first PWA for one couple: training, meals, body metrics and a shared expedition.

Everything lives on the phone that logged it. There is no account, no server and no sign-in. The two devices reach each other through a private GitHub repository, and the coach reaches Claude directly from the device. Both keys are optional; the app works without either.

## Files

```
index.html            the whole app, one container
styles.css            all styling
store.js              the only state; persists to localStorage under insync.v8
cloud.js              Claude (the coach) and GitHub (reaching the other phone)
ui.js                 shared chrome — header, bottom nav, photo-and-sheet shell
media.js              camera capture, image shrinking, photo storage (IndexedDB)
exercises.js          the exercise library; every entry has a GIF in assets/exercises
foods.js              quick-add food table
badges.js             the 39 badges; every condition is a function of real state
screens.js            one function per screen, returns HTML for the sheet body
onboarding.js         nine-screen first run; gates the app until it completes
log.js                the logging sheets (meal, workout, morning, steps, barcode)
app.js                router and init
sw.js                 service worker: network-first for code, cache-first for artwork
manifest.webmanifest  install metadata
assets/               artwork, badge stamps, exercise GIFs, app icons
```

No build step, no dependencies, no bundler. Open `index.html` and it runs.

## Hosting

Any static host over **https** (GitHub Pages is enough). The service worker and the
camera both require a secure origin; on `http` the app still runs but will not
install or use the camera.

With GitHub Pages: push this folder to the repository, then Settings → Pages →
deploy from branch. Open the URL on the phone and use *Add to Home Screen*.

## Setting it up on a phone

1. Open the URL and walk the nine onboarding screens. The last one takes a
   Claude API key with a **Test and save** button — paste one and the coach
   writes from the first day. Skipping it is fine; the coach falls back to its
   own rules.
2. Settings → Connections: paste a GitHub token, the repository (`owner/name`)
   and the branch, and the partner's name.
3. Do the same on the second phone, with the two names swapped.

**Pairing.** Each device writes only its own totals to `sync/<name>.json` and reads
only the other's. The names must match across the two phones; capitals and
spacing do not matter. What crosses over is governed entirely by the privacy
toggles, and progress photos never cross — there is no switch for them.

## What is unproven

The code is complete and internally consistent, but as shipped it has never run:

- against a real GitHub token — sync, and the expedition handshake across two devices
- against a real Claude key — the coach's line, the verse choice, meal reading,
  barcode reading, the plan writer, the target proposal
- against a real camera, or on iOS at all

Expect the first pass on a phone to find something.

## Notifications

The eight toggles in Settings are stored preferences. Nothing sends a push —
that needs a server, and this app deliberately has none. Everything arrives when
the app is opened, through the notification centre behind the bell.

## Conventions worth keeping

- **Nothing on screen is typed.** Every figure, count and sentence containing a
  number is derived from the store. Distances come from steps, badges from the
  log, totals from the lists that imply them.
- **Units are display only.** Everything is stored in pounds, miles and
  kilocalories and converted at the edge, so switching units cannot round the
  history away.
- **11px is the type floor**, and small text is dimmed by setting its colour
  outright, never with `opacity`.
- **Neither device assumes whose it is.** No name is hardcoded anywhere; both
  read from `profile` and `partner`.

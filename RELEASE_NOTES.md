# InSync 6.0.0-p3b — Phase 3B Faith Woven Into the Journey

## Release purpose

Phase 3B replaces the rejected Phase 3 Faith presentation while preserving its sound backend, privacy, sync, Sabbath, prayer and memorization foundations. The goal is for Faith to feel native to the expedition and Daily Camp rather than forced into the app as a collection of spiritual utility cards.

## New / redesigned

- **Today at Camp** Faith briefing on Home
- **Along the Road** Scripture/reflection moment on the active Journey leg
- redesigned expedition-aware **Faith Hub**
- new local `scripture.js` verified Scripture Library
- in-app **Bible / passage reader**
- expanded **Memory Trail** modes:
  - Read
  - Tap to Reveal
  - Word Bank
  - First Letters
  - Type It
  - Speak / self-check
- redesigned **Prayer at Camp**
- redesigned **Close Camp** evening reflection
- **Rhythm** presentation for Sabbath and Rule of Life
- private waypoint journal storage
- text-to-speech hooks for stored Scripture where the browser supports speech synthesis

## Preserved safeguards

- no spiritual leaderboard or Faith XP
- no prayer/Scripture rewards into Base Camp economy
- one-request explicit prayer sharing only
- private prayer, gratitude, reflection and waypoint journal stay out of partner sync
- private spiritual text stays out of general AI context
- no AI-generated Scripture text
- Sabbath remains pressure-reducing

## Technical changes

- new `scripture.js`
- `faith.js` -> **1.1.0**
- `store.js` adds normalized private `faith.waypointNotes`
- `screens.js` adds Scripture, passage, Memory Trail, waypoint and Close Camp surfaces
- `app.js` adds the new routes/actions and speech/reveal/word-bank handlers
- `styles.css` adds the approved expedition-native Faith visual system
- `ui.js` adds a heart icon used by Close Camp
- `index.html` loads Scripture Library before Faith
- `sw.js` cache -> **insync-v10-19** and includes Scripture Library offline

## Compatibility

- App/UI: **6.0.0-p3b**
- local state remains **insync.v10**
- partner schema remains **7**
- existing Phase 3 Faith data is preserved
- no local-data reset is required

## Verification

Complete repository suite: **1,156 passed / 0 failed**.

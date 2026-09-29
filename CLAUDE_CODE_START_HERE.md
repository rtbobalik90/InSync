# InSync P6.2 — Claude Code Base Camp Starter

This is a transport-slim copy of the current production P6.2 source tree for building **Base Camp 1.0** in Claude Code.

## Important
- All production JavaScript, CSS, HTML, manifests, service worker, docs, and tests are preserved.
- **Grand Canyon production artwork is preserved in full** as the visual reference/current expedition.
- To keep this upload small enough for Claude Code, heavy **exercise media, badge artwork, and non-Grand-Canyon expedition artwork** have been replaced with tiny transport placeholders **at the exact same file paths**.
- Those placeholders are NOT production assets and are NOT permission to delete, rename, redesign, or replace the corresponding asset contracts.
- Do not modify existing screens merely because one of those transport-only images looks blank/neutral in this slim package.
- When the Base Camp work is returned to the main production build, the original production media will be restored automatically by merging the code changes into the full InSync repository.

## Assignment boundary
Build Base Camp 1.0 as a modular world-builder against this source tree. Preserve all existing InSync behavior. Do not rebuild the app, do not alter Train/Nutrition/Together/Journey simply to accommodate this slim package, and do not use missing/placeholder media as evidence of an app defect.

Recommended new modules are things like:
- `basecamp-engine.js`
- `basecamp-catalog.js`
- `basecamp-renderer.js`
- `basecamp-state.js`
- `basecamp-ui.js`
- `assets/basecamp/`

Keep Base Camp logic out of `screens.js`/`app.js` as much as practical; those files should mainly route into the module.

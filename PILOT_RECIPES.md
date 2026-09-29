# InSync Recipe Pilot Review Collection

`pilot-recipes.js` is a 48-recipe review collection covering American, Indian, Japanese, and Mediterranean cuisines. It contains three breakfast, lunch, dinner, and snack records for each cuisine.

The app loads and caches this file, and `Cookbook.pilot()` returns a copy of its records. The normal `Cookbook.all()` catalog remains the existing 1,440-recipe foundation, so loading the pilot does not double-count catalog totals or make draft pilot records eligible for normal weekly planning.

The collection is structurally valid under the canonical foundation schema. Every recipe retains the canonical `draft-calculated` provenance status and a blocked production gate. Culinary review, nutrition reconciliation against specific food-composition identifiers, allergen review, cultural-fit review, and final release approval remain pending.

Run `node tests/pilot-recipes-tests.js` to validate count, distribution, schema shape, measurement coverage, scaling behavior, and approval safeguards.

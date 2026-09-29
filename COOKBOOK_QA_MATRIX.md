# InSync Cookbook and Meal Planner QA Matrix

## Release gates

The cookbook may ship only when the automated foundation gate is green and the selected recipe pack has passed the human review gates. Structural validity does not make a recipe nutritionally or culinarily approved.

| Gate | Required result |
| --- | --- |
| Repository regression | All cookbook and planner tests pass. Any unrelated failures are documented with exact assets or modules. |
| Catalog foundation | Exactly 1,440 unique records, 12 cuisines, 120 per cuisine, and 30 per cuisine and meal slot. |
| Pilot pack | Exactly 48 named pilot records, 12 each for American, Indian, Japanese, and Mediterranean, with 3 per meal slot and explicit review status. |
| Schema | Every required field passes type, range, enum, relationship, and provenance checks. |
| Measurements | Standard and weight views represent the same canonical quantity within the approved tolerance. |
| Scaling | Eater, portion, batch, and leftover factors are applied exactly once. Recipe maximum yields are respected or a safe scaling warning is shown. |
| Nutrition | Per-serving nutrition remains personal while ingredient and grocery quantities scale for the household. Calculations reconcile to sourced ingredients. |
| Safety | Allergens, dietary claims, cooking-safety statements, storage, and reheating guidance are reviewed. |
| Product integration | Planning, replacement, favorites, dislikes, logging, shopping, persistence, offline use, and mobile interaction all remain functional. |

## Detailed test matrix

| Area | Automated checks | Human or device checks | Pass criteria |
| --- | --- | --- | --- |
| Recipe identity | ID format, uniqueness, version, nonempty name, cuisine, course, and meal slots | Names are distinct, readable, and culturally appropriate | No duplicate IDs or confusing duplicate names |
| Catalog counts | Global, cuisine, and cuisine-slot counts | Spot-check displayed counts in Cookbook | 1,440 total, 120 per cuisine, 30 per meal slot |
| Complete schema | Required objects and fields, enum values, finite nonnegative values, time arithmetic, yield and scaling bounds | Instructions, equipment, storage, substitutions, cost, and descriptions are useful | Zero schema errors |
| Provenance | Status enum, source references, reviewer fields consistent with status | Source claims are specific and auditable | Drafts are never labeled approved |
| 48-recipe pilot | Pilot IDs, cuisine distribution, slot distribution, review metadata, specific ingredient sources | Culinary, cultural-fit, yield, safety, and nutrition review | 48 records pass all assigned review gates |
| Ingredient identity | Stable IDs, display names, canonical quantity, standard measure, section, source reference | Prep state and ingredient wording are unambiguous | Every ingredient is computable and purchasable |
| Household measures | Positive amount and supported unit; pluralization and fraction formatting | Kitchen-practical amounts at 1, 2, 4, 8, and 12 servings | No unusable measures or misleading rounding |
| Weight measures | Positive g, kg, mL, L, or count; threshold formatting | Metric display is clear in all recipes | No blank or zero display |
| Equivalence | Reconstruct canonical quantity from standard measure and compare | Spot-weigh high-risk ingredients | Within ingredient-specific tolerance |
| Eater count | Clamp and persist 1 through 20; each increment scales once | Buttons, disabled states, labels, and screen refresh | Correct at 1, 2, 4, 12, and 20 |
| Portion scale | Clamp 0.25 through 3; nutrition and ingredients follow contract | Small, standard, and large portions make sense | No double scaling |
| Recipe yield | Base servings and max batch rules included in factor | Large-batch warning or safe alternate directions | Recipe limit is never silently exceeded |
| Batch lunches | Source quantities multiplied by prepared servings; child meals excluded from shopping | Timeline and labels match behavior | Ingredients purchased once for all portions |
| Dinner leftovers | Cook-day source covers all linked leftover meals | Reheat guidance and dates are clear | No duplicate grocery quantities |
| Grocery aggregation | Canonical ID consolidation, compatible units, pantry removal, deterministic sorting | Names and amounts are understandable | No lost, duplicated, or mixed-unit quantity |
| Measurement toggle | Standard and weight list totals share canonical source | Toggle updates recipe and grocery list immediately | Same food quantity in either view |
| Nutrition math | Ingredient totals, per-serving division, portion scaling, rounding tolerance | Compare pilot values with selected authoritative records | Values reconcile within approved tolerance |
| Planned-meal logging | Log personal serving, not all diner portions; keep macros and source | Today's log matches displayed personal nutrition | Household count does not inflate personal intake |
| Dietary rules | Vegetarian, vegan, gluten-free, and dairy-free derived from all ingredients | Review sauces, seasonings, cross-contact, and substitutions | No unsupported dietary claim |
| Allergens | Recipe union equals ingredient allergen union; case normalization; selected allergens excluded | Review hidden allergens in sauces and prepared foods | No known allergen omitted |
| Exclusions | Whole-token matching for must-not, avoid, dislikes, and proteins | Common synonyms and culturally specific ingredients | Hard exclusions never return |
| Favorites | Compatible favorite prioritization without bypassing safety rules | Favorite indicator and reuse feel intentional | Incompatible favorite is excluded |
| Plan completeness | 28 stable date-slot keys; one recipe per slot; deterministic fallback | Week reads naturally without excessive repetition | Seven complete days |
| Target validation | Daily calories and protein meet product contract | Plans appear realistic, not just mathematically valid | Every day passes configured bounds |
| Universal audience | No hardcoded user, partner, country, goal, or household assumption | Neutral language; child and adult households considered | Any profile can use core planner |
| Localization readiness | Cuisine and unit data are extensible; locale-safe dates and numbers | Long translations and right-to-left risk review | Layout does not rely on English string length |
| Persistence | Recipe ID, eater count, portion, batch, mode, and status survive normalization and reload | Close and reopen installed PWA | No loss or mutation |
| Offline behavior | Cookbook, engine, and data are in the service-worker shell and need no network | Airplane-mode build, open, scale, and shop | Core flow works offline |
| Mobile interaction | Static wiring checks plus viewport and accessibility assertions | iPhone and Android: scroll, tap, back, rotate, dynamic text | No clipping, hidden controls, or accidental reload |
| Accessibility | Buttons have labels, disabled state, focus behavior, sufficient target semantics | Screen reader and 200 percent text-size review | Core flow is independently operable |
| Security and imports | Store normalization rejects malformed planner and recipe references | Restore an older backup into the new build | No unsafe key or invalid record enters state |
| Regression | Existing Store, Nutrition, Cloud fallback, favorites, photos, and service worker suites | Smoke test Home, Train, Nutrition, Together | No cookbook change breaks another domain |

## Final integration findings

- The focused cookbook, schema, release, scaling, pilot, planner, nutrition, screen, and cross-module suites pass 941 checks with zero failures.
- Thirty-three of thirty-five repository test files pass.
- `stabilization-tests.js` currently reports 99 asset-quality failures. They are empty or invalid badge images, non-animated exercise WebPs, duplicate or placeholder artwork, and missing or empty Inca Trail art.
- `training-2-tests.js` currently reports 24 exercise-media failures.
- The asset failures predate the cookbook integration and do not indicate cookbook arithmetic failures, but they prevent a fully green repository release gate.

## Risk disposition

1. Resolved: the new schema module provides separate foundation and production validation profiles.
2. Resolved: the 48-recipe pilot is separately identifiable, loaded offline, and blocked from production.
3. Ingredient sources are category placeholders rather than specific FoodData Central records.
4. Generic sauces and seasonings do not carry cuisine-specific hidden allergen data.
5. Resolved: the engine supports 1 to 20 eaters and the UI shows the required number of batches when a recipe maximum is exceeded.
6. Resolved at the engine boundary: exact canonical quantities are retained separately from practical display rounding and tested across both modes.
7. Resolved: pantry matching uses normalized whole-word and phrase boundaries.
8. Resolved: incompatible quantity kinds or units remain separate, retain all amounts, and carry an explicit conflict flag.
9. Cookbook browsing shows only the first 60 records and does not yet provide complete search, meal-slot filtering, or pagination.
10. Resolved and regression-tested: diner count scales household ingredients and groceries while personal nutrition remains unchanged.

Items 3, 4, and 9 remain planned production work. The review and release gates prevent draft ingredient sources or unsupported allergen claims from being represented as production approved.

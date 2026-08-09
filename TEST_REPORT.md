# InSync 5.4.0 — Release Test Report

## Automated release gate

The 5.4.0 working tree passed:

- **485 / 485** stabilization/regression checks
- **23 / 23** GitHub two-phone sync/concurrency checks
- **54 / 54** screen-render/malformed-state checks
- **23 / 23** dedicated meal-planner checks
- **585 / 585 total checks, 0 failures**

## 5.4.0 meal-prep checks

The dedicated planner suite now proves:

- a complete 28-slot home-cooked week is accepted;
- incomplete 27-slot weeks are rejected atomically;
- restaurant/fast-food chain meals are rejected;
- cuisine and protein selections reach the Claude generation prompt;
- like and avoid keywords reach the Claude generation prompt;
- avoid keywords are enforced against returned ingredients;
- saved favorites deliberately return in later generated weeks;
- a reused favorite does not carry the previous occurrence's finished photo;
- thumbs-downed meal names cannot return in generated weeks;
- Breakfast, Lunch, Dinner and Snack remain permanent planner slots;
- recipe detail exposes ingredients, cooking steps, finished-photo controls, Favorite and Not for me;
- preference, generation, logging and photo actions all have production handlers.

## Existing ship gates retained

The stabilization and screen suites continue to cover phone-local dates, state migration, safe storage/import, immutable historical score bases, weekly challenge math, expedition reconciliation, notification/privacy logic, explicit Back navigation, same-screen scroll preservation, iPhone standalone viewport behavior, service-worker cache/update behavior, JavaScript syntax, production action wiring, image/asset references and malformed-state rendering.

The GitHub suite continues to cover serialized writes, SHA-conflict retries, private-repository enforcement, automatic sync recovery, rolling messages/history and simultaneous two-phone updates.

## Hardware acceptance still required

Before treating a newly deployed build as fully hardware-certified, confirm on the real iPhones:

1. Settings shows **Version 5.4.0** on both devices.
2. Both devices remain connected to the same private sync repository with their own tokens.
3. Meal Planner preferences can be selected and survive an app close/reopen.
4. Generate a full week and confirm no restaurant/fast-food/chain meals appear.
5. Favorite one meal, generate a later week, and confirm a compatible favorite can recur.
6. Mark a meal Not for me and confirm it does not return on a later generation.
7. Add a finished photo, reopen the recipe, and confirm the photo remains.
8. Log today's planned meal and confirm its copied photo appears on the logged meal.
9. Create a complete backup and restore it on a test/reset device if practical, confirming meal-prep photos restore.

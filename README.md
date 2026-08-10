# InSync 6.0.0-p5 — Nutrition 2.0

Phase 5 turns Nutrition from an AI meal-plan surface into a verified household planning system. The planner can still use Claude for recipe composition, but InSync now proves the daily math, enforces hard exclusions in code, repairs only failing days, and coordinates an optional Shared Dinner without exposing either person's private meal history.

## Active primary experience
**Home · Journey · Train · Nutrition · Together**

Coach remains globally accessible. Faith remains parked, with its source/data preserved but not loaded by the active production shell.

## Nutrition 2.0
- Deterministic four-slot day validation: Breakfast, Lunch, Dinner and Snack.
- Daily calories must land inside the accepted target range and protein must meet target before a generated day is called ready.
- Generated weeks are verified by code after AI output.
- A failed day is repaired independently rather than regenerating the entire week.
- **Must never include** is a true hard exclusion, separate from softer dislikes/preferences.
- Pantry staples can be marked as already on hand so they do not continually reappear on the shopping list.
- Meal-prep timeline turns the weekly plan into dated cooking/prep tasks.
- **Shared Dinner:** one household recipe with two personalized portions and two private nutrition logs.
- Shared Dinner target sharing is explicit opt-in and sends only a dinner-sized calorie/protein target—not daily totals, meals or food history.
- Eating Out is target-aware and stored as its own meal source rather than being confused with generated meal prep.

## AI boundary
Claude proposes recipes. InSync verifies them. Calorie/protein acceptance, hard exclusions, partner target privacy and generated-week readiness are deterministic application rules.

## Compatibility
- Local state: v10
- Partner sync: schema 7
- Shared Dinner profile is an optional backward-compatible field inside schema 7
- No data reset required

## Test status
**1,173 automated assertions pass with 0 failures.**

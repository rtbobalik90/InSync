# InSync 6.0.0-p5.5 — Test Report

The production repository passes the full deterministic Node suite after the Train/visual refinement.

New P5.5 coverage verifies:
- light / medium / heavy expedition scrim system;
- screen-specific scrim assignment;
- Train landing contains the weekly overview rather than day-specific readiness/walk controls;
- previous/next training-week navigation;
- Your Plan precedes Records / Exercise Library / Body;
- selected training day owns readiness, walk timer and workout actions;
- manual workout addition remains available;
- morning completion marker persistence/sanitization;
- completed morning and nightly Home prompts disappear;
- History retains edit paths;
- runtime/service-worker update identifiers.

Full suite result before packaging: **1,813 assertions passed, 0 failed**.

Runtime: `6.0.0-p5.5`  
Service worker: `insync-v10-27`

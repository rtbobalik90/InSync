# InSync 6.0.0-p5.6 — Test Report

This release adds regression coverage for the Train hero scrim and historical step editing.

P5.6-specific checks verify that:
- Train has no global dark wash across the top 58% of the hero;
- Train still fades strongly into the card stack at the bottom;
- Train landing and Train day both use the dedicated scrim;
- current and prior Train days expose Add/Edit steps;
- future days stay non-editable;
- the dated action passes the selected date through Log.open;
- Log saves steps to `open.date`;
- Store writes corrected historical steps to that day without changing today;
- runtime and service-worker IDs are bumped.

Full deterministic suite before packaging: **1,755 checks passed, 0 failed test files**.

Runtime: `6.0.0-p5.6`  
Service worker: `insync-v10-28`

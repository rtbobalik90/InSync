# Deterministic release gate

Run the complete repository baseline from the project root:

```sh
node qa/run-tests.js
```

Add `--verbose` to print every suite's raw assertion output.

The command runs all `tests/*-tests.js` files in lexical order with a fixed timezone and locale. Functional failures remain fatal and their raw output is printed. The gate accepts only two reviewed media profiles: the exact transport-slim package or the current production package. It distinguishes transport placeholders from intentional future-expedition route slots by exact file fingerprint. In transport-slim mode, known placeholder failures are matched by test, assertion text, and exact count. In the production-current profile, no expected test failures are allowed. A partial restore, functional failure, expected-failure count drift, test inventory drift, or source/media change during the run fails the gate.

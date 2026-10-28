---
description: Implement the next spec from docs/roadmap.md — questions up front, then every slice without stopping
argument-hint: "[spec #] [slice n] [parallel]"
---

Run one step of the loop in `docs/process.md` → "The loop", with these arguments: `$ARGUMENTS`

Read `docs/process.md` and `docs/roadmap.md` first and follow them exactly. Before any code, read the main docs (`docs/product.md`, `docs/roadmap.md`, `docs/conventions.md`), pin down the spec's purpose and aims, and ask every question for the whole spec (all slices) in one batch; if the spec is `draft`, ask in that same batch to move it to `ready`. Then run its slices without stopping; commit each slice on the spec's branch; after the last slice of a UI spec run the Playwright UI check (step 8) and review its screenshots; never merge into `main`, push, deploy, or touch remote accounts.

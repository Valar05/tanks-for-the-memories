# Architecture

## Loop

Feed -> Order -> Consequence -> Memory

## Systems

- A live feed of claims shows source, confidence, age, and content.
- Reports arrive continuously while older reports remain unresolved.
- The selected report is resolved with concise multiple-choice commands.
- Each command alters score, attention, pressure, and memory.
- At least one report is incomplete, stale, or wrong to force interpretation.
- Attention collapse or pressure overload ends the run.
- Victory comes from managing the feed, not from observing a map.

## Views

- Live feed: the battlefield surface.
- Command options: A/B/C/D decisions for the selected report.
- WWDD validation: a visible runtime summary of the doctrine check.

## Runtime pieces

- `src/main.ts` builds the feed UI, the report generator, the decision loop, and the validation summary.
- `src/styles.css` handles the feed-first layout and responsive panels.
- `scripts/smoke.mjs` validates the feed doctrine markers before a real build.

# Architecture

## Loop

Feed -> Order -> Consequence -> Memory

## Systems

- A live feed of claims shows source, confidence, age, and content.
- Reports arrive continuously while older reports remain unresolved.
- Each report arrives as a voice bark plus a physical evidence carrier.
- The selected report is resolved with concise multiple-choice commands.
- Each command alters score, attention, pressure, and memory.
- At least one report is incomplete, stale, or wrong to force interpretation.
- Attention collapse or pressure overload ends the run.
- Victory comes from managing the feed, not from observing a map.
- Major mistakes produce an after-action memory sheet with Original Report, Reality, Consequence, and Lesson.

## Views

- Live feed: the battlefield surface.
- Command options: A/B/C/D decisions for the selected report.
- Memory panel: after-action lesson sheets.

## Runtime pieces

- `src/main.ts` builds the feed UI, the report generator, the decision loop, the TTS interrupt layer, and the memory sheets.
- `src/styles.css` handles the feed-first layout and evidence-card presentation.
- `scripts/generate-cartesia-feed-assets.mjs` fetches voice inventory, generates TTS clips, and writes the voice/audio manifest.
- `scripts/smoke.mjs` validates the feed doctrine markers before a real build.

# Architecture

## Loop

Observation -> Interpretation -> Commitment -> Revelation -> Memory

## Systems

- A commander station inside a Sherman turret shows source, confidence, age, and content for each contact.
- Contacts arrive continuously while older claims remain unresolved.
- Each contact arrives as a voice bark plus a physical evidence carrier.
- The player commits through posture: head out, hatch cracked, buttoned up, or optics scan.
- Each posture changes what the commander can trust through hatch view, optics, radio, and intercom.
- At least one contact is incomplete, stale, or wrong to force interpretation.
- Attention collapse or pressure overload ends the run.
- Victory comes from managing the picture inside armor, not from watching a full battlefield map.
- Major mistakes produce an after-action memory sheet with Original Report, Reality, Consequence, and Lesson.

## Views

- Commander station: the embodied cockpit view with hatch rim, optics frame, and radio presence.
- Contact strip: a small list of incoming claims, not the main screen.
- Posture controls: A/B/C/D decisions that change the commander's physical situation.
- Memory panel: after-action lesson sheets.

## Runtime pieces

- `src/main.ts` builds the station UI, the contact generator, the posture loop, the TTS interrupt layer, and the memory sheets.
- `src/styles.css` handles the armored interior layout and evidence-card presentation.
- `scripts/generate-cartesia-feed-assets.mjs` fetches voice inventory, generates TTS clips, and writes the voice/audio manifest.
- `scripts/smoke.mjs` validates the commander-station markers before a real build.

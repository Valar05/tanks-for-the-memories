# Architecture

## Loop

Observation -> Interpretation -> Commitment -> Revelation -> Memory

Long-term game loop:

Campaign choice -> Procedural mission seed -> Lead-from-front tank command -> After-action memory -> Historical branch pressure

## Systems

- The repository is currently a corpus/design workbench and prototype ground, not the shipped game.
- The intended game has an outside campaign layer and an inside tank-command mission layer.
- The outside layer is multiple choice and corpus based: historical metadata changes branch pressure, mission seeds, crew state, support, and future consequences.
- The inside layer is a small, dense, repeatable tank-command scenario with embodied controls, crew voice, radio delay, and command timing.
- A commander station inside a Sherman turret shows source, confidence, age, and content for each contact.
- Contacts arrive continuously while older claims remain unresolved.
- Each contact arrives as a voice bark plus a physical evidence carrier.
- The player commits through posture: head out, hatch cracked, buttoned up, or optics scan.
- Each posture changes what the commander can trust through hatch view, optics, radio, and intercom.
- At least one contact is incomplete, stale, or wrong to force interpretation.
- Attention collapse or pressure overload ends the run.
- Victory comes from managing the picture inside armor, not from watching a full battlefield map.
- Major mistakes produce an after-action memory sheet with Original Report, Reality, Consequence, and Lesson.
- First slice should stay around D-Day plus a few days inland; beach operations and DD flotation attachments are not first-slice targets.

## Views

- Commander station: the embodied cockpit view with hatch rim, optics frame, and radio presence.
- Procedural Three.js tank preview: a runtime-generated Sherman silhouette beside the station, used as a tank-body reference until a sourced GLB is available.
- Alpha texture proof: generated Pillow plates and a manifest-controlled contact sheet proving texture-only tank identity on fixed Sherman geometry.
- Contact strip: a small list of incoming claims, not the main screen.
- Posture controls: A/B/C/D decisions that change the commander's physical situation.
- Memory panel: after-action lesson sheets.

## Runtime pieces

- `src/main.ts` builds the station UI, the contact generator, the posture loop, the TTS interrupt layer, and the memory sheets.
- `src/main.ts` also owns the procedural Three.js preview scene: hull, turret, gun, tracks, road wheels, hatch marker, and hedgerow occluders.
- `scripts/generate_alpha_texture_proof.py` creates the first fixed-geometry Alpha texture proof, manifest, and real texture needs report.
- `src/styles.css` handles the armored interior layout and evidence-card presentation.
- `scripts/generate-cartesia-feed-assets.mjs` fetches voice inventory, generates TTS clips, and writes the voice/audio manifest.
- `scripts/smoke.mjs` validates the commander-station markers before a real build.

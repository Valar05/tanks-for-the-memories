# Tanks For The Memories

A small WW2 command simulation about uncertainty, posture, and memory from inside a Sherman turret.

The player is a young tank lieutenant, not a dashboard user.
The player wins by reading the tank's fragments better than the battlefield can change.

## Current vision

Tanks For The Memories is an embodied command game about managing uncertainty from inside a crewed machine.

Current promoted doctrine:

- [Repo Doctrine](./REPO_DOCTRINE.md) - durable working doctrine extracted from the corpus
- [Verne-Wells Doctrine](./docs/doctrine/verne-wells-doctrine.md) - discovery and consequence as the project's creative engine
- [Repo Crucible Report](./docs/doctrine/repo-crucible-report.md) - gold, ore, and dross classification for current direction
- [Archival Memory Visual Doctrine](./docs/doctrine/archival-memory-visual-doctrine.md) - historical memory under pressure, not a black-and-white filter

## Current slice

- A commander station inside a Sherman turret
- Hatch, optics, radio, and intercom as the main information channels
- A small folded map as a physical tool, not a main screen
- A/B/C/D posture choices that change what the commander can trust
- At least one incomplete, stale, or wrong contact in the picture
- False-picture memory where a believable report later resolves into a different reality
- Crew voice and radio interruption layer
- Memory events that summarize what the commander learned

## What works

- Commander-station layout with hatch rim, optics frame, and radio bay
- A/B/C/D posture controls for head out, hatch cracked, buttoned up, and optics scan
- Continuous contact arrival while older claims remain unresolved
- Backlog pressure and attention collapse
- Voice interrupt layer for contact arrival
- Physical evidence carriers for scout, radio, visual, and HQ claims
- After-action memory sheets with original report, reality, consequence, and lesson

## Commands

- `A` head out
- `B` hatch cracked
- `C` buttoned up
- `D` optics scan
- `R` restart after victory or failure
- `Wake radio net` to unlock ambient audio and TTS playback

## Local setup

- `npm install`
- `npm run smoke`
- `npm run build`
- `npm run dev`

## Notes

- No live AI or LLM calls are used at runtime.
- The prototype is commander-station-first, not dashboard-first.
- Reports are claims, not truth.
- Contacts keep arriving while unresolved ones age in place.

## Repo Doctrine

See [REPO_DOCTRINE.md](./REPO_DOCTRINE.md) for the durable working doctrine extracted from the corpus.

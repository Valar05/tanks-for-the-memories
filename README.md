# Tanks For The Memories

A small WW2 tank-command information simulation.

The player is a platoon commander, not a driver. The loop is:

Information -> Order -> Consequence -> Memory

## Current Vision

Tanks For The Memories is a tank commander operation game about managing uncertainty from inside a crewed machine.

The player succeeds by becoming less wrong faster than the battlefield changes around them.

Current promoted doctrine:

- [Repo Doctrine](./REPO_DOCTRINE.md) - durable working doctrine extracted from the corpus
- [Verne-Wells Doctrine](./docs/doctrine/verne-wells-doctrine.md) - discovery and consequence as the project's creative engine
- [Repo Crucible Report](./docs/doctrine/repo-crucible-report.md) - gold, ore, and dross classification for current direction
- [Archival Memory Visual Doctrine](./docs/doctrine/archival-memory-visual-doctrine.md) - historical memory under pressure, not a black-and-white filter

## Current slice

- One Normandy bocage lane
- Player Sherman
- Wingman Sherman
- One hidden enemy AT gun
- Farmhouse and church landmarks
- Hedgerow cover and muddy road

## What works

- Typed command input
- Voice input when the browser supports SpeechRecognition
- Information ledger with report data
- Hatch, buttoned-up, gunner scope, and map/report views
- Wingman scout, advance, hold, and attack behavior
- Failure report plus checkpoint restart

## Commands

- report
- scout left
- scout right
- advance
- halt
- reverse
- hold
- attack contact
- hatch open
- button up
- gunner scope
- map

Invalid commands do nothing and produce no correction message.

## Local setup

- `npm install`
- `npm run smoke`
- `npm run build`
- `sh scripts/bootstrap.sh`

## Notes

- No live AI or LLM calls are used at runtime.
- The prototype uses Three.js primitives instead of finished art assets.
- Reports can be partial, stale, or unconfirmed.
- The map/report view shows uncertainty, not omniscience.
- Camera and UI should privilege observer-sourced awareness over god view.

## Repo Doctrine

See [REPO_DOCTRINE.md](./REPO_DOCTRINE.md) for the durable working doctrine extracted from the corpus.

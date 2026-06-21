# Tanks For The Memories

A small WW2 tank-command information simulation.

The player is a platoon commander, not a driver. The loop is:

Information -> Order -> Consequence -> Memory

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

- npm install
- npm run smoke
- npm run build
- sh scripts/bootstrap.sh

## Notes

- No live AI or LLM calls are used at runtime.
- The prototype uses Three.js primitives instead of finished art assets.
- Reports can be partial, stale, or unconfirmed.
- The map/report view shows uncertainty, not omniscience.

## Repo Doctrine

See [REPO_DOCTRINE.md](./REPO_DOCTRINE.md) for the durable working doctrine extracted from the corpus.

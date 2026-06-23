# Tanks For The Memories

A small WW2 command simulation about reports, orders, consequences, and memory.

The player is a platoon commander, not a driver.
The player wins by reading the feed better than the battlefield can change.

## Current vision

Tanks For The Memories is a feed-first information game about managing uncertainty from inside a crewed machine.

Current promoted doctrine:

- [Repo Doctrine](./REPO_DOCTRINE.md) - durable working doctrine extracted from the corpus
- [Verne-Wells Doctrine](./docs/doctrine/verne-wells-doctrine.md) - discovery and consequence as the project's creative engine
- [Repo Crucible Report](./docs/doctrine/repo-crucible-report.md) - gold, ore, and dross classification for current direction
- [Archival Memory Visual Doctrine](./docs/doctrine/archival-memory-visual-doctrine.md) - historical memory under pressure, not a black-and-white filter

## Current slice

- One live report feed
- Scout, radio, visual, and HQ reports
- At least one incomplete, stale, or wrong claim in the queue
- Multiple-choice command decisions that change outcomes
- Attention pressure from unresolved reports
- Memory events that summarize what the commander learned

## What works

- Feed cards with source, confidence, age, and content
- A/B/C/D command choices for the selected report
- Continuous report arrival while older claims remain unresolved
- Backlog pressure and attention collapse
- WWDD validation panel inside the app

## Commands

- `A` advance immediately
- `B` request confirmation
- `C` send wingman
- `D` hold position
- `R` restart after victory or failure

## Local setup

- `npm install`
- `npm run smoke`
- `npm run build`
- `sh scripts/bootstrap.sh`

## Notes

- No live AI or LLM calls are used at runtime.
- The prototype is feed-first, not map-first.
- Reports are claims, not truth.
- New reports keep arriving while unresolved ones age in place.

## Repo Doctrine

See [REPO_DOCTRINE.md](./REPO_DOCTRINE.md) for the durable working doctrine extracted from the corpus.

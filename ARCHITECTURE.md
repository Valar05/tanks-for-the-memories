# Architecture

## Flow

Speech input -> intent parser -> command queue -> tank agent state machine -> vehicle behavior

## Modules

- `src/main.ts`: app bootstrap, Three.js scene, HUD, voice input, and tank behavior.
- `src/styles.css`: fullscreen UI styling and responsive HUD layout.

## Runtime Model

- `player`, `ally`, and `enemy` tanks are represented by simple boxes.
- Commands are parsed from voice transcripts and queued before execution.
- Accepted commands emit radio acknowledgements into the log.
- Camera toggling is handled with `C` and `V` keyboard shortcuts.

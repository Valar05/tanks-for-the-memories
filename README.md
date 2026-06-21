# Tanks For The Memories

Voice-command-first military prototype built with TypeScript, Vite, and Three.js.

## Vision

The player never directly drives a vehicle. Instead, the player acts as a commander and issues voice orders to a small tank unit. The game loop is built around:

Speech input -> intent parsing -> command queue -> tank agent state machine -> vehicle behavior

## Controls

- `C`: Commander camera
- `V`: Drone camera
- Button: Start or stop voice input

## Commands

Supported command phrases include:

- `driver advance`
- `driver halt`
- `driver reverse`
- `gunner scan`
- `gunner fire`
- `wingman follow`
- `wingman attack`
- `wingman hold`

Low-confidence speech is ignored silently. Accepted commands appear in the command log.


## Local Setup

- `npm install`
- `npm run smoke`
- `npm run build`
- `sh scripts/bootstrap.sh`

## Architecture

- `src/main.ts` wires the scene, HUD, voice input, and tank logic.
- `SpeechRecognition` feeds transcripts into a simple parser.
- Parsed commands are queued and consumed by tank state machines.
- TankAgent behavior is intentionally simple: idle, moving, attacking, and holding.
- The scene uses a flat terrain, a road strip, and three box tanks with no art assets.

## Notes

- This prototype expects browser Web Speech API support.
- No networking, AI conversation, or physics engine is used.

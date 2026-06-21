Create a new TypeScript Vite project named Tanks For The Memories.

Goal:
Build a voice-command-first military prototype.

The player NEVER directly controls vehicles.

The player only:
- Rotates camera
- Switches between commander camera and drone camera
- Issues voice commands

Architecture:
SpeechInput
→ IntentParser
→ CommandQueue
→ TankAgent
→ Vehicle Behavior

Initial Commands:
Driver advance
Driver halt
Driver reverse
Gunner scan
Gunner fire
Wingman follow
Wingman attack
Wingman hold

Requirements:
Use Three.js.
Create a flat terrain.
Spawn:
- Player tank
- Allied tank
- Enemy tank

Represent tanks as simple colored boxes.
No art assets.
No networking.
No physics engine.

Implement TankAgent state machine:
Idle
Moving
Attacking
Holding

Speech recognition should use browser Web Speech API.
Low confidence commands are ignored silently.
No error messages.
No AI conversation.
Accepted commands should appear in a command log.

Add radio acknowledgements:
Moving.
Holding.
Target acquired.
Engaging.

Controls:
C key: Commander Camera
V key: Drone Camera

Produce a clean folder structure and architecture documentation.
Create README describing vision and controls.
Commit all work to git.

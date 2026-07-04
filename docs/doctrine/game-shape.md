# Game Shape Doctrine

`tanks-for-the-memories` is currently a corpus and design workbench, not the finished current game.

The intended game is a roguelike history simulation about a tank commander in Normandy. It has two linked layers:

- Outside missions: a multiple-choice, corpus-based campaign layer that turns historical metadata into branch pressure, unit state, mission availability, memory, and alternate local outcomes.
- Inside missions: small, dense, procedural, repeatable tank-command scenarios where the player leads from the front through embodied tank controls, crew voice, radio procedure, and commander orders.

## Player Role

The main character is a tank commander in Normandy.

The player is not an omniscient strategy cursor and not primarily the driver. The player reads terrain, reports, crew calls, and historical pressure, then commits the tank and crew under uncertainty.

## Campaign Layer

The campaign layer should feel like a corpus-driven history roguelike.

- Choices are multiple choice, but not trivial menu flavor.
- Historical metadata changes the procedural mission seed, available support, terrain pressure, enemy likelihood, crew stress, logistics, and branch outcomes.
- Branching is local and historical: the wider Normandy campaign remains recognizable, while the player's commander can enter different operational paths, losses, memories, and consequences.
- The first campaign scope is D-Day plus a few days inland.
- Beach operations are in scope later, but not the first slice.
- DD tank flotation screens, motorboat-like attachments, and beach-assault hardware are explicitly not first-slice targets.

## Mission Layer

The mission layer should borrow control inspiration from tank sims and command inspiration from squad-command games.

- The player leads from the front, inside or near a Sherman, not from a detached tactical map.
- Controls should support tank-command verbs: move, halt, orient hull, orient turret, scan, button up, unbutton, target, fire, reverse, smoke, report, rally, and call crew orders.
- Voice commands and crew acknowledgements are core input/output, inspired by Republic Commando-style order flow.
- Missions are short, dense, procedural, and repeatable.
- Repeatability comes from different information states, terrain occlusion, crew condition, contact uncertainty, and campaign metadata, not from random arena churn.

## First Slice

The first playable slice should prove one inland Normandy command loop after D-Day:

1. The campaign layer presents a small set of historically grounded operational choices.
2. The selected choice seeds a compact procedural mission.
3. The mission forces the commander to manage visibility, crew reports, vehicle posture, and command timing.
4. The outcome writes back to campaign memory, crew state, and future branch pressure.

Do not start with the beach. Do not start with amphibious attachments. Start with a dense inland command situation where the tank commander has enough agency to make the dual-layer structure visible.

## Current Prototype Status

The current browser prototype is a sketch of commander-station information pressure. Its procedural Three.js tank is a useful visual touch, but it is not the core game by itself.

Preserve useful pieces from the prototype:

- commander-station pressure
- reports as claims rather than truth
- hatch, optics, radio, and intercom as information channels
- after-action memory
- procedural tank-body visual reference

Do not let the prototype define the whole product as a static station UI. The target is a campaign-linked tank-command game with repeatable procedural missions.

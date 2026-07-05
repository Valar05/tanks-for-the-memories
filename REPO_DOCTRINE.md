# Repo Doctrine

This repository is a corpus and design workbench, not the finished current game.

It is a historical simulation substrate with a query layer. Rough source notes, discoveries, mechanics, and prototype probes belong here when they help define the future game shape.

## Canonical Principle

Model what people knew, when they knew it, and what they believed was true.

Do not model only events.
Model information flow, delay, distortion, trust, and consequence.

## Intended Game Identity

Tanks For The Memories is intended to become a roguelike history simulation about a tank commander in Normandy.

The game has two linked layers:

- outside missions: a multiple-choice, corpus-based campaign shaped by historical metadata, branch pressure, unit state, memory, and local outcomes
- inside missions: small, dense, procedural, repeatable tank-command scenarios inspired by tank-sim control language and Republic Commando-style voice/order flow

The first scope is D-Day plus a few days inland. The beach can matter later, but it is not the first slice. DD flotation screens, motorboat-like attachments, and beach-assault hardware are not first-slice targets.

The current browser prototype is a commander-station probe, not the full product.


## Current Prompt Authority Gate

The newest user instruction is repository truth for the current turn. Prior doctrine, plans, artifacts, screenshots, exports, and cloud packets do not authorize mutation when they conflict with the newest correction.

Before any visual/modeling/export/deploy/browser-wake mutation, the agent must verify a current prompt contract naming the latest command, forbidden stale premise, allowed mutation type, target artifact, and evidence lane. Missing, stale, or mismatched contracts fail closed.

A direct correction cancels the active premise immediately. Continuing to implement the canceled premise is red-build disobedience, not iteration. `Implement the plan` only applies to the latest accepted plan after corrections are incorporated.

## Visual Evidence Rule

Tank visual work in this repository is cloud-gated. Local screenshots, Android `screencap`, localhost browser capture, and local visual harness frames are forbidden for visual validation and must not be used as acceptance proof. Visual success requires the cloud visual truth release lane plus Sense Simulation review of the named visible relationship. If cloud review is blocked, repair the cloud review surface or report that blocker; do not substitute local capture.

Visual QA is mandatory for visual work. A visual change without accepted-lane visual QA is red or blocked, never complete. Diagnostics, tests, bboxes, manifests, deploys, and browser wake are supporting evidence only; they cannot replace visual QA.

Browser wake is not a discovery tool. Never wake the browser so the user can find out whether an unknown visual change worked. Wake only after the accepted cloud/Sense evidence lane already says the named visible relationship passes, or when a real external decision is required and the visual state has already been characterized.

Boxmodel geometry tuning must use the hosted gesture-only tuner (`boxmodel-tank.html?tune=1`) when coordinate placement is uncertain. Do not continue blind mesh edits after a cloud screenshot disproves the visible relationship. Select one named part, adjust location/rotation/scale through the tuner, export the tuning JSON or share URL, then bake only an accepted cloud-reviewed tuning snapshot into source assets.

The authored boxmodel v1.8 front track/glacis gap is a structural coverage problem, not a manual-positioning task. Preserve the tuner for future part authoring, but do not ask the user to place runtime panels to cover that known gap; add narrow integrated coverage in the exporter and validate it through cloud/Sense review.

### Tank Hard-Surface Red-Build Rule

A tank visual fix is only real when the visible hull/track/turret/barrel relationship changes. Validators that check object names, route wiring, manifest text, material slots, or internal bbox overlap are diagnostic only; they do not prove visual success.

For front/rear sponson and track-well gaps, the fix must cover the exterior visible armor skin that bridges hull, glacis or rear plate, and outer track skirt. Do not count boxes placed behind the skirt, internal returns, freestanding blockers, or pasted slabs as coverage if the silhouette still shows black air.

`authored_sherman_armored_v1` is the current false-green example. It passed checks while omitting the visible front slot-wall faces and leaving the same armor gaps visible. Treat it as red/unaccepted until cloud/Sense evidence proves a real visible relationship change.

If a screenshot or cloud/Sense review shows unchanged gaps, stop geometry edits. State the expected relationship, actual visible relationship, unchanged evidence, and exporter/validator cause before any further model work.

## Commander Identity

Tanks For The Memories is a tank commander operation game about managing uncertainty from inside and around a crewed machine.

The player is not the driver.
The player is not a free camera.
The player is not an omniscient tactician.

The player is a commander converting partial reports, crew observations, visual fragments, radio delay, and machine state into decisions under pressure.

## Design Commitments

- Information is the primary resource.
- The player is a commander, not a driver.
- Battlefield awareness is a camera system, not a map layer.
- Contacts are edge-triggered memory records.
- Crew interactions are memory-bearing state, not flavor text.
- Narrative output is after-action memory, not mission-complete decoration.
- Rear areas are playable systems, not background.
- Daily life is a system: sleep, food, hygiene, mail, boredom, fear, and fatigue all matter.
- Damage is a state machine, not a binary dead/alive switch.
- Occupation and captivity are branches of the simulation, not end states.
- Medical care is a queue.
- Logistics is tempo control.
- Visibility is posture-, terrain-, and role-dependent.
- Battlefield awareness is observer-sourced and confidence-weighted.
- Battlefield contacts are edge-triggered records: first sighting creates the contact, later sightings refine confidence and status without replaying the reveal.
- The camera and UI should follow information events, not omniscient input.
- Training is role learning, not vehicle learning.
- Replacement personnel change both capacity and trust.
- Morale is not flavor; it is operational throughput.
- Command is attention management under uncertainty.
- The Verne-Wells tone axis matters: discovery asks how it works; consequence asks what it costs.
- Campaign choices seed mission conditions, and mission outcomes write back to campaign memory.
- Mission repeatability should come from terrain occlusion, information state, crew condition, and historical metadata, not from generic arena randomization.

## Battlefield Awareness Camera Doctrine

The camera follows information events, not just player input.

The camera should behave like battlefield awareness: fragmented, contextual, emotionally charged, and limited by what soldiers can actually perceive.

The player is receiving battlefield knowledge through human observers.

Every camera intervention must answer:

> Who knows this, and how do they know it?

The camera may reveal evidence, but not omniscience.

A first implementation should prove one event:

- a unit spots a meaningful new contact
- the camera briefly frames the event from that observer's perspective
- the game records a confidence-preserving memory marker
- the player resumes command without losing orientation

Reusable rule:

> The soldiers are the camera operators.

## Contact Memory Doctrine

Contacts are not disposable pings.

The first meaningful sighting creates a durable memory record. Later sightings refine confidence, identity, position, and status.

A contact can be:

- suspected
- confirmed
- misidentified
- last seen
- sound-only
- smoke-obscured
- reported by radio
- contradicted by later evidence

This preserves the difference between knowing, suspecting, and misremembering.

## What To Preserve

- Source provenance and file-level metadata.
- Exact claim-to-source links.
- Confidence levels and extraction notes.
- Derived variables, mechanic candidates, and pressure systems.
- Cases where information was missing, late, wrong, contradictory, or destructive.
- Who observed each event, from where, and with what confidence.
- Crew memory tags, after-action consequences, and report history.

## What To Prefer

- State machines over static stats.
- Queues over instantaneous resolution.
- Network models over isolated events.
- Delayed and partial information over omniscient truth.
- Evidence markers over perfect map data.
- Edge-triggered memory records over repeated reveal spam.
- Distillation cards over long prose when the goal is implementation.
- Multiple source perspectives when the event is contested or memory-shaped.

## What To Hunt For

Always ask every source:

- What mechanic does this imply?
- What variable does this imply?
- What pressure system does this imply?
- What failure mode does this imply?
- What doctrine does this imply?
- What gameplay loop does this imply?
- What player decision does this imply?
- What observation source does this imply?
- What confidence level does this imply?
- What after-action memory does this imply?

Prioritize discoveries that convert:

- History -> Simulation
- Doctrine -> Mechanics
- Behavior -> Variables
- Information -> Pressure
- Observation -> Memory
- Consequence -> After-action report

## High-Value Systems

The repository currently treats these as first-class:

- Command attention budget
- Battlefield-awareness camera events
- Edge-triggered contact memory records
- Radio latency and message structure
- HQ picture staleness
- Visibility and identification failure
- Bocage route compression
- Replacement trust decay and recovery
- Crew memory and morale state
- Fatigue-induced decision degradation
- Vehicle recovery and repair queues
- Medical triage and evacuation throughput
- Mail and home-contact morale
- Occupation and rear-area governance
- Sanitation and disease attrition
- Chaplaincy and grief processing
- POW/captivity branching
- Route control and convoy security
- Rear-area throughput as a network
- Verne-Wells narration and mission framing

## Implementation Rule

If a discovery can change UI, state, camera, report history, or turn structure, it belongs in the simulation.
If it only adds color, it belongs in the corpus.
If it changes both, it belongs in both.

Before adding a feature, ask:

1. Does this improve command under uncertainty?
2. Does this preserve commander-not-driver play?
3. Does this clarify source, confidence, latency, or consequence?
4. Does this support battlefield awareness as human observation?
5. Does this strengthen after-action memory?
6. Does it support the outside-campaign / inside-mission structure?
7. Can it be tested in the current inland Normandy slice?

## Rejected Drift

Treat these as anti-goals unless deliberately quarantined for experiment:

- omniscient RTS camera
- free-roaming scouting fantasy
- driver-first tank action
- beach-first scope creep
- DD flotation or motorboat attachment work in the first slice
- retro filter as identity
- lore unconnected to playable pressure
- UI that exposes exact truth without modeled source

## Handoff Rule

Never claim completion because enough facts were found.
Claim completion only when the corpus can answer with source-backed structure, and the structure changes implementation decisions.

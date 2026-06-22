# Repo Doctrine

This repository is not a content dump. It is a historical simulation substrate with a query layer.

## Canonical Principle

Model what people knew, when they knew it, and what they believed was true.

Do not model only events.
Model information flow, delay, distortion, trust, and consequence.

## Current Game Identity

Tanks For The Memories is a tank commander operation game about managing uncertainty from inside a crewed machine.

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
6. Can it be tested in the current bocage slice?

## Rejected Drift

Treat these as anti-goals unless deliberately quarantined for experiment:

- omniscient RTS camera
- free-roaming scouting fantasy
- driver-first tank action
- retro filter as identity
- lore unconnected to playable pressure
- UI that exposes exact truth without modeled source

## Handoff Rule

Never claim completion because enough facts were found.
Claim completion only when the corpus can answer with source-backed structure, and the structure changes implementation decisions.

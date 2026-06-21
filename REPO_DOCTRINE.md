# Repo Doctrine

This repository is not a content dump. It is a historical simulation substrate with a query layer.

## Canonical Principle

Model what people knew, when they knew it, and what they believed was true.

Do not model only events.
Model information flow, delay, distortion, trust, and consequence.

## Design Commitments

- Information is the primary resource.
- The player is a commander, not a driver.
- Rear areas are playable systems, not background.
- Daily life is a system: sleep, food, hygiene, mail, boredom, fear, and fatigue all matter.
- Damage is a state machine, not a binary dead/alive switch.
- Occupation and captivity are branches of the simulation, not end states.
- Medical care is a queue.
- Logistics is tempo control.
- Visibility is posture-, terrain-, and role-dependent.
- Training is role learning, not vehicle learning.
- Replacement personnel change both capacity and trust.
- Morale is not flavor; it is operational throughput.
- Command is attention management under uncertainty.

## What To Preserve

- Source provenance and file-level metadata.
- Exact claim-to-source links.
- Confidence levels and extraction notes.
- Derived variables, mechanic candidates, and pressure systems.
- Cases where information was missing, late, wrong, contradictory, or destructive.

## What To Prefer

- State machines over static stats.
- Queues over instantaneous resolution.
- Network models over isolated events.
- Delayed and partial information over omniscient truth.
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

Prioritize discoveries that convert:

- History -> Simulation
- Doctrine -> Mechanics
- Behavior -> Variables
- Information -> Pressure

## High-Value Systems

The repository currently treats these as first-class:

- Command attention budget
- Radio latency and message structure
- HQ picture staleness
- Visibility and identification failure
- Bocage route compression
- Replacement trust decay and recovery
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

## Implementation Rule

If a discovery can change UI, state, or turn structure, it belongs in the simulation.
If it only adds color, it belongs in the corpus.
If it changes both, it belongs in both.

## Handoff Rule

Never claim completion because enough facts were found.
Claim completion only when the corpus can answer with source-backed structure, and the structure changes implementation decisions.

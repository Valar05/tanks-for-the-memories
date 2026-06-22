# Repo Crucible Report

## Status

Crucible pass created from current visible doctrine and recent project direction.

This report classifies the repo's current ideas as gold, ore, or dross so future agents know what to preserve, test, or discard.

## North Star

Tanks For The Memories is a tank commander operation game about managing uncertainty from inside a crewed machine.

The player is not the driver.
The player is not a free camera.
The player is not a perfect tactician with perfect information.

The player is a commander converting partial reports, crew observations, visual fragments, radio delay, and machine state into decisions under pressure.

## Existing Gold

### 1. Information Is The Primary Resource

The game should model what people knew, when they knew it, and what they believed was true.

This is the repo's strongest doctrine and should override generic tank-game instincts.

Implementation pressure:

- reports may be stale
- contacts may be unconfirmed
- the map may be wrong
- scouts may contradict HQ
- confidence matters more than omniscient truth

### 2. Player Is Commander, Not Driver

Direct vehicle control should remain subordinate to command decisions.

The player can issue orders, request observations, change posture, and decide risk.

Avoid turning the game into a conventional tank shooter unless a feature still reinforces command pressure.

### 3. Command Is Attention Management

The commander is a scarce attention processor.

Every system should compete for attention:

- radio reports
- crew calls
- visibility choices
- map checks
- target confirmation
- movement orders
- damage states
- wingman status

The player should never have enough attention to inspect everything perfectly.

### 4. Archival Memory, Not Black-And-White Filter

The game should feel remembered and reconstructed, not simply desaturated.

Use archival effects as evidence/reconstruction cues, not permanent decoration.

### 5. Verne-Wells Voice

The project is not merely `Vernepunk`.

It is the tension between discovery and consequence:

- Verne: how does it work?
- Wells: what does it cost?

This should shape narration, visual direction, mission framing, UI labels, and crew/report writing.

## Ore: Needs Testing

### 1. Dynamic Contextual Camera

Idea:

A spotter, wingman, or crew member detects something and the camera briefly frames the observation from that human perspective.

Value:

This may make the player feel information arriving through people instead of an omniscient UI.

Risk:

It may steal control, confuse orientation, or become cinematic noise.

Test:

Build one reveal event:

- wingman spots possible AT gun
- camera briefly cuts or frames from wingman's angle
- ledger records uncertain contact
- player must decide whether to trust it

Gold condition:

The player understands who saw what, from where, with what confidence.

### 2. Voice Command Operation

Idea:

The player issues natural typed or spoken orders.

Value:

This supports commander fantasy and accessibility-friendly operation.

Risk:

Free-form language can create parser frustration.

Test:

Keep a small command grammar:

- report
- scout left/right
- advance
- halt
- reverse
- hold
- attack contact
- hatch open
- button up
- gunner scope
- map

Gold condition:

Invalid commands explain available options instead of silently failing.

### 3. Crew As Reality Translators

Idea:

Each crew role translates a different slice of the battlefield.

- driver: terrain and motion
- gunner: line of sight and target geometry
- loader: ammunition and tempo
- radio operator: reports and latency
- commander: synthesis and risk

Value:

This makes the tank feel like a crewed machine ecosystem.

Risk:

Too many voices can become chatter soup.

Test:

Give each role one high-value callout type and suppress low-value chatter.

### 4. Failure Reports As Learning Artifacts

Idea:

Failure should produce a report, not just a restart.

Value:

This reinforces the memory/reconstruction loop.

Risk:

Can become punitive or wordy.

Test:

After failure, show:

- last confirmed information
- last stale assumption
- missed cue
- resulting consequence
- retry checkpoint

## Dross: Avoid Or Demote

### 1. Generic Tank Shooter Drift

Anything that makes the player primarily aim, drive, and shoot from a direct-control perspective without information pressure should be rejected or quarantined.

### 2. Retro Filter As Identity

Black-and-white, film grain, or old footage styling is not enough.

Visual style must communicate uncertainty, evidence, observation, and reconstruction.

### 3. Lore Before Playable Pressure

The project can support story, but story should first serve the vertical slice:

- what does the player know?
- what can the player ask?
- what decision is pressured?
- what changes because they were wrong or right?

### 4. Omniscient UI

Any UI that tells the player exact enemy position, exact certainty, or full battlefield state without a modeled source undermines the core game.

## Recommended Next Slice

Build one complete mission loop:

### Mission: The Bridge Report

HQ says the road is open.
A scout report says the bridge is damaged.
A civilian group is moving away from the bridge.
A wingman reports possible movement in the hedgerow.
The player must decide whether to advance, scout, halt, expose the commander, or request more information.

### Required Systems

- command input
- report ledger
- uncertainty/confidence tags
- hatch posture
- map/report view
- wingman observation
- one hidden AT threat
- one failure report
- checkpoint restart

### Success Criteria

The player succeeds by producing a better battlefield picture before committing the column.

Combat may happen, but combat is not the point.
The point is whether the commander made the battlefield less unknown quickly enough.

## Implementation Doctrine

Before adding new features, every task should answer:

1. Does this improve command under uncertainty?
2. Does this preserve the commander-not-driver role?
3. Does this make information source, confidence, or latency clearer?
4. Does this strengthen the Verne-Wells tension between machinery and consequence?
5. Can it be tested in the current vertical slice?

If the answer is no, it is probably decorative.

## Final Crucible Classification

Gold:

- information pressure
- commander role
- attention budget
- archival memory
- crewed machine ecosystem
- Verne-Wells doctrine

Ore:

- dynamic contextual camera
- voice command operation
- crew-specific observation roles
- failure reports
- bridge-report vertical slice

Dross:

- generic tank shooter control drift
- retro filter identity
- omniscient UI
- lore unconnected to playable pressure

## One-Line Direction

Build a game where the player wins by becoming less wrong faster than the battlefield can punish them.

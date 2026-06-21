# Discovery: Command is attention management

## Discovery
The real scarce resource is not ammunition or armor; it is the commander’s attention budget across contacts, reports, navigation, and crew management.

## Historical Evidence
- source_library/13_sixteen-line-message-format.md:15-17 - structured reporting imposes order on communication.
- source_library/03_cross-channel-attack-ch9.md:16-21 - late/scattered reports and supply shortfalls delay command understanding.
- source_library/33_fm-17-30-tank-platoon.md:15-17 - platoon movement and command responsibilities are core.
- source_library/34_fm-17-33-the-tank-battalion-light-and-medium.md:15-17 - battalion-level role sets make command broader than gunnery.

## Why It Matters
This is the design pivot that can change the UI: the player should be forced to choose what to monitor and what to trust.

## Simulation Variable
- Name: `attention_budget`
- Definition: How many simultaneous contacts, reports, and tasks the commander can process well.
- Range: 0-100
- Related: `contact_load`, `decision_quality`

## Mechanic Candidate
Attention allocation across contacts, reports, and orders.

## Pressure System Impact
Too many simultaneous inputs should create command paralysis or simplification errors.

## Confidence
- 0.93

## Sources
- source_library/13_sixteen-line-message-format.md
- source_library/03_cross-channel-attack-ch9.md
- source_library/33_fm-17-30-tank-platoon.md
- source_library/34_fm-17-33-the-tank-battalion-light-and-medium.md

## Tags
- command, attention, mechanic

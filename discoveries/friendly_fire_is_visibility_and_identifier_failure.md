# Discovery: Friendly fire is a visibility and identifier failure

## Discovery
Friendly fire in Normandy is not just tragic randomness. It emerges from smoke, night movement, cross-domain coordination, and weak identification.

## Historical Evidence
- source_library/09_operation-totalize.md:15-21 - allied aircraft and ground forces misidentified each other in smoke and night movement.
- source_library/08_operation-cobra.md:15-21 - Cobra explicitly includes friendly-fire casualties.

## Why It Matters
Target identification should be a mechanic in itself, especially when air, armor, and infantry are all active.

## Simulation Variable
- Name: `identity_confidence`
- Definition: Confidence that a contact is friend, foe, or neutral.
- Range: 0-100
- Related: `IFF_clarity`, `contact_classification`

## Mechanic Candidate
Contact classification and misidentification under smoke/night/coalition pressure.

## Pressure System Impact
The harder it is to identify contacts, the more likely the player hurts allies or wastes time waiting.

## Confidence
- 0.91

## Sources
- source_library/09_operation-totalize.md
- source_library/08_operation-cobra.md

## Tags
- friendly-fire, visibility, coalition

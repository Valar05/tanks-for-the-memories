# Discovery: Replacement crews reduce trust before they add capacity

## Discovery
Fresh manpower helps the unit survive, but new crew members initially lower cohesion, prediction accuracy, and trust in the commander.

## Historical Evidence
- source_library/41_united_states_army_air_forces.md:15-17 - rotation policy and replacement limits are part of how the Army managed exhaustion.
- source_library/50_army_ground_forces.md:15-17 - Army Ground Forces controlled training scale and replacement flow.
- source_library/19_bomb-tank.md:15-17 - Bomb is an explicit replacement-personnel case that turns the vehicle into a memory vessel.

## Why It Matters
Replacement should not be a free heal. It should restore numbers while temporarily degrading coordination and implicit knowledge.

## Simulation Variable
- Name: `replacement_familiarity`
- Definition: How well replacements know the unit and each other.
- Range: 0-100
- Related: `crew_confidence`, `trust_in_commander`

## Mechanic Candidate
Arrival, onboarding, and trust ramp for replacement personnel.

## Pressure System Impact
The unit can be numerically stronger and tactically worse at the same time.

## Confidence
- 0.92

## Sources
- source_library/41_united_states_army_air_forces.md
- source_library/50_army_ground_forces.md
- source_library/19_bomb-tank.md

## Tags
- replacement, trust, crew

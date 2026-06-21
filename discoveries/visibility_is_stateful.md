# Discovery: Visibility is stateful, not a static stat

## Discovery
What a commander can see depends on posture, terrain, vehicle role, and whether the vehicle is being used as a reconnaissance platform or a firing platform.

## Historical Evidence
- source_library/30_m3-stuart.md:15-18 - the light tank is explicitly tied to reconnaissance use, support role, and gunnery training references.
- source_library/11_m4-sherman.md:15-17 - the Sherman is framed as an infantry-support vehicle in doctrine terms.
- source_library/10_battle-villers-bocage.md:15-17 - confined roads and tactical surprise let terrain dominate vehicle quality.

## Why It Matters
The camera model should change with command posture and terrain instead of being a fixed 360-degree oracle.

## Simulation Variable
- Name: `visibility_arc`
- Definition: Effective scan arc available to the commander in the current posture and terrain.
- Range: 0-360
- Related: `buttoned_visibility_penalty`, `hatch_visibility_bonus`

## Mechanic Candidate
Commander viewpoint state machine with buttoned/open posture and terrain occlusion.

## Pressure System Impact
Seeing less makes every other system worse because the player has less reliable ground truth.

## Confidence
- 0.88

## Sources
- source_library/30_m3-stuart.md
- source_library/11_m4-sherman.md
- source_library/10_battle-villers-bocage.md

## Tags
- visibility, mechanic, terrain

# Discovery: Bocage turns terrain into information compression

## Discovery
Bocage does not just slow movement; it compresses line of sight, collapses routes, and makes surprise more powerful than armor quality.

## Historical Evidence
- source_library/08_operation-cobra.md:15-21 - Cobra is about the shift from bocage attrition to maneuver and the rhino modification workaround.
- source_library/10_battle-villers-bocage.md:15-17 - confined roads and surprise dominate vehicle quality.
- source_library/04_utah-beach-to-cherbourg-carentan.md:15-17 - hedgerow-canalized fighting breaks command transmission.

## Why It Matters
This means bocage should be modeled as a map-reading and route-discovery problem, not only as a movement penalty.

## Simulation Variable
- Name: `route_dependency`
- Definition: How strongly movement depends on a small set of known usable routes.
- Range: 0-100
- Related: `terrain_readability`, `recon_value`

## Mechanic Candidate
Hidden-route terrain with route discovery and ambush windows.

## Pressure System Impact
The map itself becomes an enemy because every movement choice narrows future options.

## Confidence
- 0.93

## Sources
- source_library/08_operation-cobra.md
- source_library/10_battle-villers-bocage.md
- source_library/04_utah-beach-to-cherbourg-carentan.md

## Tags
- terrain, pressure, mechanic

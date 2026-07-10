# Upper Glacis Silhouette Edge v07 Lessons

Scratch lesson note for `real_sherman_upper_glacis_silhouette_edges_scratch_v07`.

This is not production acceptance. It records what the edge-chain experiment taught after v04-v06 and the later red v07/template pivots.

## Two Goals That Must Stay Coupled

1. Preserve silhouette.
2. Preserve the manifold nature of each authored piece.

Either goal alone is a trap:

- Good silhouette from copied source shell debris repeats the f05/f16 nonmanifold failure class.
- Good topology from generic slabs repeats the v02/v06 burger/slab failure class.

The useful path is measured exterior evidence converted into fresh closed authored solids.

## What v07 Changed

v06 converted selected feature clusters into simplified convex hull footprints. That kept topology clean, but broad centroid hulls erased shoulder/deck breaks and created the visible right-side/deck block mismatch.

v07 keeps the v06 working infrastructure:

- source import
- world-space mesh extraction
- face adjacency
- normal clustering
- unique cluster assignment
- primary manufactured plane lock
- socket/ring measurement
- closed prism authoring
- topology and depth diagnostics

The one important replacement is final footprint construction:

- selected feature faces produce candidate boundary edges
- candidate edges become connected projected chains
- the exterior chain becomes the authored polygon
- convex hull area remains diagnostic only
- each polygon is still extruded into its own closed solid

## Measured Result

Compared with v06:

- topology stayed green: boundary `0`, nonmanifold `0`
- IoU improved from `0.6478695953` to `0.6995427825`
- mean depth error improved from `0.2052109626` to `0.0492291942`
- p95 depth error improved from `0.3762822151` to `0.1651744843`
- right-side overreach stayed `0.0`

This supports the edge-chain hypothesis for scratch diagnostics: the active v06 miss was primarily footprint generation, not plane fitting or cluster ownership.

## Important Implementation Lesson

Connected edge chains are measurement, not automatically clean geometry.

The first v07 run found a valid left-return chain, but the projected point order produced a self-intersecting narrow loop. The correction did not fall back to all source vertices or cluster hulls. It reordered only the selected measured chain points around their centroid, then reran simplification and self-intersection gates.

Carry this rule forward:

> Repair ordering of measured evidence before inventing new boundaries.

If a future chain is noisy, the acceptable repairs are:

- reorder the selected chain points
- reject tiny chains
- classify debris/internal seams
- simplify while preserving extrema and shoulder/deck/front breaks

The unacceptable repairs are:

- bounding rectangles
- percentage rectangles
- all-cluster convex hulls as final geometry
- source shell solidify
- blanket snapping
- dense raycast reconstruction

## What Still Looks Weak

The local render is cleaner and the depth panel is much better than v06, but the object still reads as simplified plate language, not an accepted Sherman mother hull.

Known visual risks:

- broad regions are still independent simplified polygons, so seams can read diagrammatic
- socket/ring remains secondary but still visually dominant in close angle
- exterior chain overlay shows real source noise and internal feature lines; not every chain is a manufactured seam
- local Blender renders are diagnostic only, not cloud/Sense acceptance

Do not promote this asset without a new visual review pass and likely a next authoring step that turns edge-chain measurements into cleaner manufactured interfaces.

## Next Useful Experiment

Do not create another plane-fitting variant.

The next useful experiment should consume v07 edge-chain measurements and author canonical shared interfaces:

- one exterior silhouette chain per side/front/deck boundary
- one owned shoulder/deck/front break per interface
- neighboring pieces consume the same interface coordinates
- no region independently estimates a nearly matching seam

In other words, v07 proves where the outline evidence is. The next pass should convert that evidence into manufactured shared seams instead of letting every solid keep its own independently simplified boundary.

## Stop Conditions For Future Agents

Stop instead of exporting another variant if:

- silhouette only improves by reusing source shell topology
- manifold only passes by flattening into slabs
- right/deck mismatch returns while metrics stay green
- the edge overlay cannot explain where a final polygon came from
- a candidate claim depends on local render or manifest text instead of accepted visual review

## Verdict

Edge-chain reconstruction is supported as the next measurement layer. It is not, by itself, the final authored hull solution.

# Measurement Solids Pipeline v01-v02 Read

Scratch diagnostic only; not production/cloud accepted.

## New Doctrine Implemented

The source mesh is now treated as measurement, not geometry. The exporter measures the dominant upper plane, manufactured boundary stations, socket center/radius, side seam stations, and source depth quantiles, then discards source vertices and authors fresh closed solids.

Forbidden operations are explicit in the measurement report: no source triangle copying, no source-shell solidify, no blanket vertex snapping, and no dense raycast reconstruction.

## v01 Result

- Topology: pass, zero boundary/nonmanifold edges.
- Stats: 760 vertices, 1504 triangles.
- Shape: red. IoU 0.582, p95 depth 0.196.
- Visual diagnostic: clean plate/ring assembly but too little lower/side hull volume.

## v02 Result

- Topology: pass, zero boundary/nonmanifold edges.
- Stats: 760 vertices, 1504 triangles.
- Shape: still red. IoU 0.588, p95 depth 0.169.
- Improvement: lower apron reduced depth error and made lower mass real geometry.
- Remaining failure: silhouette still reads as slab/ring because side/deck masses are under-modeled and source upper-deck shoulders/details are not yet represented as authored solids.

## Next Construction Change

Do not abandon measurement-to-solids. The process fixed the topology failure class. The next useful pass should add measured, independently closed side/deck shoulder solids from the same cloud questions:

- upper left/right shoulder armor planes
- rear/upper deck transition plane behind socket
- front/lower glacis face plane with correct visible height
- optional hatch cap only after the core silhouette passes

The next pass should increase silhouette coverage by adding named manufactured solids, not by copying source topology or raycasting surface vertices.

## Depth Panels

- v01: `../renders/real_sherman_upper_glacis_measurement_solids_scratch_v01/depth_side_by_side.png`
- v02: `../renders/real_sherman_upper_glacis_measurement_solids_scratch_v02/depth_side_by_side.png`

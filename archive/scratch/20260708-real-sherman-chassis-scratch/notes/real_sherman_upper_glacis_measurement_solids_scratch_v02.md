# real_sherman_upper_glacis_measurement_solids_scratch_v02

NOT a candidate. Scratch diagnostic only; not production/cloud accepted.

## Construction Strategy

The source mesh is used as a measuring instrument only. Plane, boundary, socket, vertical depth, and seam landmarks are measured, then fresh closed solids are authored: main glacis armor plate, left/right edge returns, lower hull apron/seam, socket cylinder, and raised ring. No source topology is preserved.

## Gates

- Topology: pass boundary=0 nonmanifold=0
- Shape: red_depth_or_silhouette IoU=0.5882685170243667 p95=0.16885900497436523
- Candidate: False

## Stats

- Vertices: 760
- Polygons: 684
- Triangles: 1504

## Lesson

This pass makes flat collapse harder by requiring named solids/regions instead of one dominant surface, and makes source-shell debris impossible by never consuming source triangles as output geometry.

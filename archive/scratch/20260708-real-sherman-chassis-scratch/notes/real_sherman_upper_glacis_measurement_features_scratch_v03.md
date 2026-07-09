# real_sherman_upper_glacis_measurement_features_scratch_v03

NOT a candidate. Scratch diagnostic only; not production/cloud accepted.

## Construction Strategy

Feature decomposition replaces the v02 one-plane slab. The source cloud measures named main glacis, shoulders, front face, deck transition, returns, socket, and ring. Fresh closed solids are authored from those measurements.

## Gates

- Topology: pass boundary=0 nonmanifold=0
- Region area: pass ring_socket_fraction=0.197969934738055
- Shape: red_depth_or_silhouette IoU=0.6192474282620466 p95=0.36430978775024414
- Candidate: False

## Stats

- Vertices: 488
- Polygons: 404
- Triangles: 944

## Lesson

This pass is useful if it proves named feature decomposition and non-ring hull area dominance. It is still red unless visual/cloud review later accepts the manufactured Sherman read.

# real_sherman_upper_glacis_measurement_clusters_scratch_v04

NOT a candidate. Scratch diagnostic only; not production/cloud accepted.

## Construction Strategy

Cluster discovery replaces the v04 UV-rectangle labels. The source cloud is clustered by adjacency and face normals, then named manufactured regions are authored as fresh closed solids from cluster boundaries.

## Gates

- Topology: pass boundary=0 nonmanifold=0
- Region area: pass ring_socket_fraction=0.11873188434082914
- Shape: red_depth_or_silhouette IoU=0.636108019448187 p95=0.5428004264831543
- Candidate: False

## Stats

- Vertices: 572
- Polygons: 446
- Triangles: 1112

## Lesson

This pass is useful if it proves manufactured feature clusters can improve silhouette while preserving manifold topology. It is still red unless visual/cloud review later accepts the manufactured Sherman read.

# real_sherman_upper_glacis_cluster_owned_silhouette_scratch_v05

NOT a candidate. Scratch diagnostic only; not production/cloud accepted.

## Construction Strategy

Cluster ownership and silhouette bounds replace the v04 overbuilt shared-cluster labels. The source cloud is clustered by adjacency and face normals, then named manufactured regions are authored as fresh closed solids from cluster boundaries.

## Gates

- Topology: pass boundary=0 nonmanifold=0
- Region area: pass ring_socket_fraction=0.17730643425721818
- Shape: red_depth_or_silhouette IoU=0.6248735495388277 p95=0.5374026298522949
- Candidate: False

## Stats

- Vertices: 544
- Polygons: 432
- Triangles: 1056

## Lesson

This pass is useful if it proves manufactured feature clusters can improve silhouette while preserving manifold topology. It is still red unless visual/cloud review later accepts the manufactured Sherman read.

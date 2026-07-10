# real_sherman_upper_glacis_silhouette_edges_scratch_v07

diagnostic candidate. Scratch diagnostic only; not production/cloud accepted.

## Construction Strategy

Cluster ownership plus primary plane locking are preserved from v06. The changed experiment is boundary generation: named manufactured regions are authored as fresh closed solids from measured connected edge-chain footprints, with convex hulls retained only as diagnostics.

## Gates

- Topology: pass boundary=0 nonmanifold=0
- Region area: pass ring_socket_fraction=0.15124777297686998
- Shape: diagnostic_promising IoU=0.6995427824951013 p95=0.1651744842529297
- Silhouette edge gate: pass failures=[]
- Candidate: True

## Stats

- Vertices: 600
- Polygons: 460
- Triangles: 1168

## Lesson

This pass is useful if it proves connected source edge chains can preserve silhouette while every authored piece remains manifold. It is still red unless visual/cloud review later accepts the manufactured Sherman read.

# real_sherman_upper_hull_manufactured_scratch_v07

Local diagnostic 80 percent pass; cloud/Sense still required.

## Metrics

- Topology: pass boundary=0 nonmanifold=0 duplicate_faces=0
- Aggregate IoU: 0.7513738462359281
- Mean depth: 0.11109634239057549
- P95 depth: 0.20801353454589844
- Left IoU: 0.7649862776253069
- Right IoU: 0.734046769718589

## Construction

Seven major hull solids are generated from shared named interface lines. The socket/ring is separate but integrated by front/rear tangents; no cluster convex hull is used as final boundary.

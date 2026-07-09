# real_sherman_upper_glacis_f05_revamp_scratch_f12

topology PASS but NOT a visual candidate. Scratch diagnostic only; not production/cloud accepted.

## Process Fix

This pass stops the f10/f11 overlay premise. The final exported geometry is newly built from closed solids measured against the source upper-glacis reference: a solid top armor shell, an owned cylindrical socket wall, a separate closed raised ring, and a separate closed hatch cap.

## Topology Gate

- Total boundary edges: 0
- Total nonmanifold edges: 0
- Candidate flag: False

## Stats

- Vertices: 640
- Polygons: 610
- Triangles: 1276

## Depth Diagnostic

- Silhouette IoU: 0.7110105580693816
- Mean abs depth error: 0.041375842058680515
- p95 abs depth error: 0.15014171600341797

## Review Note

Topology passing only earns the right to inspect the shape. It is not visual acceptance. If the shape reads too primitive, the next pass must add source-supported manufactured plate loops while preserving the same watertight architecture.

# real_sherman_upper_glacis_f05_revamp_scratch_f13

topology PASS but NOT a visual candidate. Scratch diagnostic only; not production/cloud accepted.

## Process Fix

This pass stops the f10/f11 overlay premise. The final exported geometry is newly built from closed solids measured against the source upper-glacis reference: a solid top armor shell, an owned cylindrical socket wall, and a separate closed raised ring. Hatch cap modeling is deliberately omitted in this pass.

## Topology Gate

- Total boundary edges: 0
- Total nonmanifold edges: 0
- Candidate flag: False

## Stats

- Vertices: 768
- Polygons: 768
- Triangles: 1536

## Depth Diagnostic

- Silhouette IoU: 0.7144134300188736
- Mean abs depth error: 0.04275787698811498
- p95 abs depth error: 0.20475435256958008

## Review Note

Topology passing only earns the right to inspect the shape. It is not visual acceptance. If the shape reads too primitive, the next pass must add source-supported manufactured plate loops while preserving the same watertight architecture.

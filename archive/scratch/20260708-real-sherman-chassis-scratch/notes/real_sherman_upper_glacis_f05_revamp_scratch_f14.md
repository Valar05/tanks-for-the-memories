# real_sherman_upper_glacis_f05_revamp_scratch_f14

NOT a visual candidate. Scratch diagnostic only; not production/cloud accepted.

## Process Fix

Broad armor is generated from a fitted deck plane. Source samples define boundary and socket landmarks, but broad top-plate vertices are not raycast back onto source height noise.

## Gates

- Topology: pass boundary=0 nonmanifold=0
- Plane: pass broad_max=3.2754614950891714e-08
- Shape: red_depth_parity_weak IoU=0.4850675888085508
- Candidate flag: False

## Stats

- Vertices: 768
- Polygons: 768
- Triangles: 1536

## Review Note

If this still looks too simplified, the next pass should improve the source-supported outer/manufactured plate loops in plane UV space, not return to source-raycast heights.

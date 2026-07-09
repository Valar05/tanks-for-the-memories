# Upper Glacis Socket Depth Diagnostic Index

This note indexes the scratch tooling added for the f12-f16 upper-glacis/socket recovery attempts.

## Assumptions

- f05 is the visual/depth target for upper-glacis silhouette and key manufactured planes.
- Watertight topology is required, but it is not sufficient.
- A flat pancake with a clean ring is red even when manifold, because it loses the Sherman upper-hull structure.
- Hatch detail is intentionally out of scope for these passes.
- Local renders are scratch diagnostics only; they are not cloud/Sense acceptance.

## Side-by-side depth panels

Each panel shows `source_depth`, `retopo_depth`, and `depth_abs_error` in one image.

| pass | approach | depth panel | verdict |
| --- | --- | --- | --- |
| f12 | first solid plate, cylindrical cut, ring, hatch cap | `../renders/real_sherman_upper_glacis_f05_revamp_scratch_f12/depth_side_by_side.png` | red: topology architecture started working, visual/jagged/hatch premise wrong |
| f13 | clean solid plate, cylindrical cut, separate ring, no hatch cap | `../renders/real_sherman_upper_glacis_f05_revamp_scratch_f13/depth_side_by_side.png` | red: topology pass, broad shape still slab-like |
| f14 | fitted planar deck to remove lumpy source sampling | `../renders/real_sherman_upper_glacis_f05_revamp_scratch_f14/depth_side_by_side.png` | red: plane pass, pancake-with-hole flat collapse |
| f16 | source-shell solidify plus boolean socket | `../renders/real_sherman_upper_glacis_f05_revamp_scratch_f16/depth_side_by_side.png` | red: source debris/nonmanifold explosion |

## Gate lesson

The next exporter must make flat collapse impossible before handoff:

- require named plane regions, not one dominant deck plane
- require f05-like depth/silhouette coverage before candidate language
- require topology pass before any visual candidate language
- reject source-shell solidify if it creates debris or nonmanifold edges
- keep ring/socket as real closed geometry, but never let that become the only recognizable form

# f05 Revamp Doctrine

Active target: `real_sherman_upper_glacis_f05_revamp_scratch_f10`.

## Rule

`f05` is the visual target. Do not restart from analytic hull envelopes, convex hull simplification, Quadriflow, source-island deletion, or face-center deletion. Preserve the f05 broad hull silhouette, plate breaks, side returns, deck slope, turret-ring location, and hatch placement.

## Allowed Repair

Use clean measured analytic shells only as local overlays/replacements for named failure zones:

- turret ring/cylinder projection
- hatch/recess seam area
- tiny raised detail seam covers
- UV/material ownership for texture readiness

## Rejection

Reject any pass that reads like f07 box-and-disk, f08 bad decimation, or f09 over-deleted ring island. The acceptance sentence is: looks like f05, but ring/hatch seams are cleaner and the mesh is more textureable.

## Non-Negotiable Watertight Gate

Watertight/manifold geometry is required, not optional. A scratch pass may render diagnostics, but it must not be called a candidate, almost-there, selected, texture-ready, or promoted if any exported shell has accidental boundary edges or nonmanifold edges.

Hard stop conditions:

- `boundary_edges > 0` on any shell unless the manifest explicitly names that edge as an intentional aperture boundary.
- `nonmanifold_edges > 0` anywhere.
- hatch, ring, socket, or armor shell relies on overlay cover-up instead of connected/closed local replacement geometry.
- boundary/nonmanifold report is treated as a note instead of a blocking failure.

If this gate fails, the exporter must write a red read and skip candidate language. The next edit must repair topology before visual polish, UV polish, or material work.

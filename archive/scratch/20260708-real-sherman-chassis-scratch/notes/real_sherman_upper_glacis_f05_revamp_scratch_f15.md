# real_sherman_upper_glacis_f05_revamp_scratch_f15

Red/incomplete scratch attempt. No GLB, no manifest, no viewer handoff.

Intent: keep f14 fitted-plane architecture while recovering the broader f13 source boundary by selecting the outer loop in world XY and projecting it to the fitted plane.

Result: Blender entered render but hit headless EEVEE shader failure during the partial run and was killed. Only partial depth diagnostics were written. Treat f15 as an implementation/debug attempt, not a model artifact.

Next usable path: either rerun f15 with render disabled until after manifest/export, or fold its boundary recovery into a new f16 exporter with a cheaper pre-render diagnostic path. Do not return to raycast heights for broad armor.

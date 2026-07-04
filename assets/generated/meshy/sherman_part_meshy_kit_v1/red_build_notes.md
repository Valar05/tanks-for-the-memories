# Red Build: Sherman Meshy Kit V1

Status: red/unreviewed.

The GLBs were generated and preserved, but this cannot count as an accepted kit because the required human visual attention gate failed. The agent deployed and opened the cloud viewer, then continued reporting readiness without confirmed user review.

## Preservation

Keep the generated GLB/FBX files, Meshy manifests, and contract reports as evidence. Do not delete them.

## Blocker

Do not wire this kit into runtime, promote it, or treat it as accepted until the user sees the cloud GLB viewer and explicitly accepts or rejects each part.

## Required Recovery

1. Wake browser to the cloud GLB viewer.
2. Get explicit visual review on hull, turret, mantlet/barrel, and mobile gear.
3. Update `assembly_manifest.json` with accepted/rejected per-part status.
4. Only then proceed to authored tread ribbon and runtime assembly.

## Geometry Failure: Turret / Barrel

User visual read: the turret and barrel diverge; the models are not compatible.

Cause: the turret shell and mantlet/barrel were generated as independent Meshy outputs from independent source images. They do not share a socket profile, scale reference, local origin, or elevation axis. The turret can be a plausible standalone object and the barrel can be a plausible standalone object while still failing as a composed mechanical assembly.

Status: reject current turret + mantlet/barrel pairing. Do not use them for turret traversal or cannon verticality.

Salvage candidate: hull and mobile gear only, pending visual acceptance.

Recovery: generate a matched turret/mantlet interface pair, or generate turret-with-mantlet as one asset and handle only the barrel/elevation behavior separately if Meshy cannot preserve the socket as separate compatible parts.

## Correction: Barrel Only

User correction: do not make an authored toy barrel, and do not use the overmodeled Meshy mantlet/barrel block. Make a low-poly Meshy barrel only.

Result: `sherman_part_meshy_barrel_only_v1` succeeded and produced a barrel-only GLB at 920 approximate triangles.

Status: barrel geometry is salvaged as a candidate. Turret/mantlet/socket compatibility is still unsolved; the rejected mantlet/barrel block remains rejected.

# Final Report

Status: `blocked`

No next scratch upper-glacis experiment was produced.

The repository branch/head matched the PR #1 handoff:

- Branch: `codex/upper-glacis-recovery-tools`
- HEAD: `31dc201`

The controlling prompt required reading `docs/doctrine/scratch-mode.md` before mutation. That file is absent in this checkout, although both `CODEX_STARTS_HERE.md` and `docs/prospector/upper-glacis-failure-quarantine-20260710.md` list it as required canon. Because that intake gate failed, I did not edit the v08 exporter, create a v09 exporter, run Blender export, create GLB/PNG artifacts, update model-review pages, push, deploy, or comment on the PR.

Existing v08 state was reproduced:

- Candidate: `false`
- Topology: `pass`
- Shared-interface report: `pass`
- Assembly-interface report: `red`
- Failure reasons: `iou_below_v07_tolerance`, `p95_above_v07_tolerance`
- Silhouette IoU: `0.6312073067771894`
- Mean depth error: `0.07681155175782363`
- P95 depth error: `0.21370792388916016`

Verification:

- `python3 -m py_compile archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_shared_interfaces_v08.py`: pass
- Debian proot Blender: available, `Blender 4.3.2`
- `npm run build`: failed, missing `esbuild-wasm`
- `npm test`: failed, no `test` script

Required next action:

Restore or explicitly supersede `docs/doctrine/scratch-mode.md`, then install npm dependencies before a new worker attempts `real_sherman_upper_glacis_multi_region_shared_skin_scratch_v09`.

Visual acceptance was not claimed. No local diagnostic was treated as acceptance.

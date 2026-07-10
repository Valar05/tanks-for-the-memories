# Upper Glacis Failure Quarantine - 2026-07-10

Purpose: keep the next PR #1 agent from mistaking old scratch ore for current canon. This is a quarantine map, not a deletion list. Failed attempts remain preserved as evidence unless a later explicit cleanup command removes ignored runtime junk.

## Canon For The Incoming Agent

Use these as the current handoff truth:

- `CODEX_STARTS_HERE.md`
- `PROJECT_ORIENTATION.md`
- `docs/doctrine/cloud-visual-truth.md`
- `docs/doctrine/scratch-mode.md`
- `archive/scratch/20260708-real-sherman-chassis-scratch/notes/real_sherman_upper_glacis_silhouette_edges_v07_lessons.md`
- `archive/scratch/20260708-real-sherman-chassis-scratch/notes/real_sherman_upper_glacis_shared_interfaces_scratch_v08.md`
- `archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_silhouette_edges_v07.py` as the best silhouette/depth baseline, not as accepted geometry
- `archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_shared_interfaces_v08.py` as the latest rejected shared-interface experiment, not as a candidate

Current task truth:

- Preserve silhouette.
- Preserve manifold assembly.
- Do not promote any current GLB as production geometry.
- Next useful experiment must be a true multi-region shared-vertex visible skin.
- Durable review target is a GitHub Pages-readable model-review anchor plus local viewer link; neither is visual acceptance.

## Explicitly Quarantined As Non-Canon

These artifacts are preserved ore only. Do not continue from them unless the new prompt explicitly reopens that failure class.

| Line | Quarantine reason |
| --- | --- |
| `real_sherman_upper_glacis_retopo_landmark_scratch_f01` through `f05` | Source-topology / source-faithful retopo loop. Strong depth metrics in places, but it copied source noise/topology or left unacceptable mesh/authoring behavior. |
| `real_sherman_upper_glacis_analytic_primitives_scratch_f06` and `f07` | Analytic primitive reset. Manifold-ish but visually regressed toward box/disk/pancake forms. |
| `real_sherman_upper_glacis_clean_source_islands_scratch_f08` and `surgical_hybrid_f09` | Source-island salvage. Metrics could look good, but source debris/topology remained the product. |
| `real_sherman_upper_glacis_f05_revamp_scratch_f10` through `f16` | F05 revamp loop. It taught that watertightness alone is not enough; several passes collapsed silhouette or produced lumpy/source-shell artifacts. |
| `real_sherman_upper_glacis_measurement_solids_scratch_v01` through `measurement_features_v03` | Early measured solids. Closed pieces existed, but surface/feature design was wrong. |
| `real_sherman_upper_glacis_measurement_clusters_scratch_v04` through `plane_locked_silhouette_scratch_v06` | Cluster envelope loop. Topology could pass while shape read as slabs, shelves, or debris-expanded regions. |
| `real_sherman_upper_glacis_silhouette_edges_scratch_v07` | Best silhouette baseline, but still non-canon because it exported independent closed prisms that read as stacked boxes. |
| `real_sherman_upper_glacis_shared_interfaces_scratch_v08` | Latest rejected result. Shared-interface bookkeeping passed, but the one-piece visible skin became a smooth slab/ring and regressed depth/silhouette. |
| `real_sherman_upper_hull_manufactured_scratch_v07` | Parametric template branch. Useful as design evidence, but superseded for this PR by the narrower upper-glacis manifold investigation. |
| `real_sherman_chassis_*scratch*`, `*_referencekit_*`, `*_platekit_*`, `*_retopo_*`, `*_castbudget_*` | Broader chassis/reference-kit exploration. Useful lessons, but not the active upper-glacis PR path. |

## Stale Or Dangerous Repo References

- `docs/current_prompt_contract.md` is stale for this handoff. It references an older `real_sherman_chassis_reference_kit_scratch_v1` target and must not override `CODEX_STARTS_HERE.md` or the newest user prompt.
- Any manifest field saying `candidate: true` inside `archive/scratch/20260708-real-sherman-chassis-scratch/` is historical evidence only. Current human verdict overrides it.
- `public/tftm/models/sherman_hull_candidate_current/` is the active older hull-candidate runtime line, not the active upper-glacis PR target.
- `src/scratch-hull-deconstruction.ts` still references `real_sherman_chassis_retopo_scratch_v1` as a review mode. That is not canon for this upper-glacis recovery.

## Ignored Runtime Junk

These are already ignored and should stay out of PR evidence:

- `archive/scratch/20260708-real-sherman-chassis-scratch/exporters/__pycache__/`
- `archive/scratch/20260708-real-sherman-chassis-scratch/source_blends/**/*.blend1`
- any `*.pyc`

Do not spend agent time interpreting these as model attempts. They are local runtime residue.

## Failure Lessons To Carry Forward

- Topology pass does not imply a believable Sherman part.
- Depth/silhouette metrics can reward source copying; visual truth and manufactured-part intent still rule.
- A piece can be individually manifold while the assembly is junk.
- One continuous envelope can remove box seams while creating a pancake/slab failure.
- Shared interfaces must be actual shared geometry/topology, not just matching report lines.
- The turret socket must be authored into the deck/topology; do not place a ring on top of a slab.
- The next pass should start from measurements and authored interfaces, not from any quarantined mesh as geometry.

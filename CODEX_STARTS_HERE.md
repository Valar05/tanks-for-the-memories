# CODEX STARTS HERE

This is the cold-start handoff for a blank cloud worker picking up `Valar05/tanks-for-the-memories` during the Sherman upper-glacis recovery PR. It intentionally repeats the important parts of `PROJECT_ORIENTATION.md` so the worker can reorient without hidden chat history.

## Current Repository Target

- Repository: `https://github.com/Valar05/tanks-for-the-memories`
- Working branch: `codex/upper-glacis-recovery-tools`
- Pull request: `https://github.com/Valar05/tanks-for-the-memories/pull/1`
- Do not trust remembered commit ids; verify current branch/head before editing because this document is updated during handoffs.
- Current investigation root: `archive/scratch/20260708-real-sherman-chassis-scratch/`
- Active component: `source_component_0_upper_front_glacis`
- Current artifact is scratch/red, not production geometry. Non-canon scratch clutter is quarantined in `docs/prospector/upper-glacis-failure-quarantine-20260710.md` and indexed in `docs/prospector/upper-glacis-attempt-index.md`.

Before editing, always verify branch and head because this file may be stale:

```sh
git branch --show-current
git rev-parse --short HEAD
git log --oneline -5
```

## Cloud Worker Authority

A blank cloud worker must be able to continue this PR from GitHub-tracked repository content alone. Local Codex memories, local filesystem notes outside this repo, linked skills, sibling repositories, Android localhost tools, Termux-only state, and prior chat history are supplemental convenience only; they are not required authority.

If a required fact, rule, artifact, or review link is only available through local memory or local filesystem state, move the durable version into this repository before asking a cloud worker to rely on it. If the worker cannot perform a required step from repo docs and tracked artifacts, it must report the exact cloud/tooling blocker rather than infer from hidden local context.

## Prompt Authority Gate

Before any mutation, state these four facts in plain text:

1. current user command
2. forbidden stale premise
3. intended mutation
4. why that mutation satisfies the current command

If those four facts do not line up, do not edit, export, validate, deploy, commit, or wake a browser. New user corrections override old plans, old PR comments, old diagnostics, and this document.

## Cloud Prerequisites And Known Blockers

A cloud worker needs repository checkout plus normal Node/npm dependencies from `package-lock.json`. For mesh exporters it also needs Blender available in the execution image; the Termux-specific Debian proot command below is the local Android route, not a universal cloud requirement.

Required but external credentials/tools:

- GitHub push access for `Valar05/tanks-for-the-memories`.
- Git LFS support for tracked GLB/Blend/PNG scratch evidence.
- Firebase/GCP access only when running the existing cloud visual review deploy lane.
- Sense Simulation or an equivalent accepted cloud visual review tool for visual acceptance.

Known current tooling blocker:

- Durable GitHub Pages model-review anchors are required as review handles, but this repo currently documents the desired shape rather than owning a complete Pages generator. If the worker cannot publish `https://valar05.github.io/tanks-for-the-memories/model-review/<asset_id>/` from tracked tools, it must report that exact blocker and still provide the tracked GLB/report/depth links.

## Installed / Expected Dependencies

Runtime and web tooling:

- Node.js with npm available.
- `package-lock.json` is present; prefer `npm ci` on a clean worker.
- npm package dependencies from `package.json`:
  - runtime: `three`
  - dev/build: `@types/node`, `esbuild-wasm`, `typescript`, `vite`
- Important npm scripts:
  - `npm run build`
  - `npm run smoke`
  - `npm run cloud-visual-release`
  - `npm run visual-qa:boxmodel-tank`
  - `npm run cloud-review:boxmodel`
  - `npm run prompt-contract-smoke`

Blender / mesh tooling:

- Tank exporters are Blender Python scripts. Do not assume host `blender` exists.
- On the Termux workspace, Blender is run inside Debian proot:

```sh
proot-distro login debian -- blender --background --python /storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories/archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_shared_interfaces_v08.py
```

- Python modules used by the upper-glacis scratch exporters are Blender-provided or stdlib: `bpy`, `mathutils`, `mathutils.bvhtree`, `json`, `math`, `collections`, `pathlib`.
- Plain `python3 -m py_compile <exporter>` is a guardrail only; it does not prove Blender execution.

Git / artifact tooling:

- Git LFS is required. Recent scratch pushes included GLB, Blend, and PNG artifacts.
- If GitHub rejects the branch for unknown LFS objects, run:

```sh
git lfs push --all origin codex/upper-glacis-recovery-tools
git push origin codex/upper-glacis-recovery-tools
```

Official model viewer and durable cloud anchor:

- Mesh artifacts must provide two review handles:
  - a local `model-viewer-lab` link for immediate scratch inspection
  - a durable GitHub Pages-readable review anchor for cloud workers and PR review
- The desired durable artifact is a GitHub Pages page shaped like:

```text
https://valar05.github.io/tanks-for-the-memories/model-review/<asset_id>/
```

- That page should load the committed GLB/GLTF plus `model_manifest.json`, identify the asset id and commit, and remain readable without Android localhost, Termux, or sibling-repo filesystem access.
- The durable page is a review anchor, not visual acceptance. Cloud/Sense review is still required before claiming visual success.
- Local link helper, useful for scratch inspection only:

```sh
node ../model-viewer-lab/tools/make_model_viewer_link.mjs --src /tanks-for-the-memories/path/to/model.glb --manifest /tanks-for-the-memories/path/to/model_manifest.json --title asset_id --port 8804
```

- Current tooling truth: `../model-viewer-lab/tools/make_model_viewer_link.mjs` emits localhost URLs. If a blank worker cannot publish the GitHub Pages anchor from existing repo tools, report a Pages/hosting/tooling blocker. Do not treat that as ambiguity in this document.

Viewer UX requirements for both local and durable anchors:

- Preserve orbit camera, fit/front/side/top camera controls, and portrait-first full-camera view.
- Preserve object visibility, object selection, transform/tweak, reset, and export capability.
- Keep object and tool panels hidden by default; the first view should be the model, not a UI jungle.
- Keep edit capability locked by default; unlocking must be an explicit reviewer action.
- Do not remove object adjustment tools to simplify the page. Hide them until toggled.

## Visual Evidence Rule

This repo is cloud-gated for visual acceptance. Local screenshots, Android `screencap`, localhost browser capture, and local visual-harness frames are not acceptance evidence.

Allowed as diagnostics:

- Blender renders
- GLB/model manifests
- bbox/topology checks
- depth/silhouette panels
- local viewer links
- durable GitHub Pages model-review anchors
- source-string and route checks

Required for acceptance of visual work:

- current cloud visual truth surface
- Sense Simulation review of the named visible relationship
- explicit statement of expected visible relationship, actual visible relationship, what changed, and what did not change

Scratch mode can skip cloud acceptance only when the newest user command explicitly keeps the work in scratch mode. Scratch artifacts remain experimental until deliberately promoted.

## Canon And Quarantine Before Modeling

Read `docs/prospector/upper-glacis-failure-quarantine-20260710.md` and `docs/prospector/upper-glacis-attempt-index.md` before creating or editing another upper-glacis exporter. The quarantine note is the current non-canon map; the attempt index pairs approach code with reports and depth/visual comparison panels. They exist because several archived scratch manifests still look active or even say `candidate: true`, but human review has rejected them.

For this PR handoff, canon means:

- `CODEX_STARTS_HERE.md` plus the newest user prompt
- v07 as the best silhouette/depth baseline, not accepted geometry
- v08 as the latest rejected shared-interface experiment
- the next target: true multi-region shared-vertex visible skin

Non-canon junk means old scratch meshes, old candidate flags, stale prompt contracts, source-faithful retopo loops, cluster/envelope loops, one-piece slab/ring loops, and ignored runtime residue like `__pycache__` or `.blend1`. Preserve the lessons; do not continue from the geometry.

## Current Upper-Glacis Investigation State

The source mesh is measurement, not output geometry. Do not copy source triangles, preserve source topology, shell-solidify the source, blanket-snap vertices, or dense-raycast a reconstructed surface onto the source.

The two active goals from the review loop are:

1. preserve silhouette
2. preserve manifold nature of pieces

The investigation has not yet achieved both.

### v07

Files:

- Exporter: `archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_silhouette_edges_v07.py`
- Asset: `real_sherman_upper_glacis_silhouette_edges_scratch_v07`
- Lessons: `archive/scratch/20260708-real-sherman-chassis-scratch/notes/real_sherman_upper_glacis_silhouette_edges_v07_lessons.md`

Result:

- Better silhouette/depth than prior attempts.
- Still red because it exported individually closed feature prisms that read as stacked boxes/tiles.
- Key issue: each piece could be manifold while the assembled hull was visually and architecturally incoherent.

v07 baseline metrics used by v08:

- silhouette IoU: `0.6995427824951013`
- mean depth error: `0.04922919424753341`
- p95 depth error: `0.1651744842529297`

### v08

Files:

- Exporter: `archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_shared_interfaces_v08.py`
- Asset: `real_sherman_upper_glacis_shared_interfaces_scratch_v08`
- Manifest: `archive/scratch/20260708-real-sherman-chassis-scratch/models/real_sherman_upper_glacis_shared_interfaces_scratch_v08/model_manifest.json`
- Lessons: `archive/scratch/20260708-real-sherman-chassis-scratch/notes/real_sherman_upper_glacis_shared_interfaces_scratch_v08.md`

Result at commit `243a3eb`:

- Candidate: `false`
- Topology: pass
- Boundary edges: `0`
- Nonmanifold edges: `0`
- Shared-interface report: pass
- Assembly-interface report: red
- Failure reasons: `iou_below_v07_tolerance`, `p95_above_v07_tolerance`
- Vertices: `456`
- Polygons: `376`
- Triangles: `904`
- silhouette IoU: `0.6312073067771894`
- mean depth error: `0.07681155175782363`
- p95 depth error: `0.21370792388916016`
- max depth error: `0.5346145629882812`

Visual/engineering lesson:

- v08 removed the obvious seven-prism box-stack failure.
- It overcorrected into a smooth slab/ring form and lost too much manufactured shoulder/deck/front hull structure.
- The shared-interface bookkeeping is useful, but a one-piece envelope is not a valid geometry strategy.

## Do Not Repeat These Failure Classes

- Do not call topology pass success when the assembled object reads wrong.
- Do not export a quilt of independent closed prisms and claim manifold hull recovery.
- Do not replace the hull with one broad envelope slab and claim shared-interface success.
- Do not use convex hulls, cluster extents, or source vertices as final plate boundaries.
- Do not let the turret ring sit on a slab; the deck/socket opening must be authored.
- Do not create a new speculative variant unless it asks a genuinely new question.
- Do not use local diagnostic renders as visual acceptance.

## Highest-Value Next Experiment

The next useful experiment is a true multi-region shared-vertex visible skin.

Concrete direction:

- Keep v07/v08 measurement and reporting infrastructure.
- Build large authored armor regions: main glacis, left cheek, right cheek, front/lower transition, rear deck transition, left return, right return, turret socket/ring support.
- Use canonical shared interface coordinates to create actual shared mesh edges, not just a report.
- Remove duplicate internal walls between adjacent armor regions.
- Preserve plate breaks as visible hard-surface structure.
- Author the socket opening into the deck/topology, with ring support integrated rather than floating on top.
- Keep every region closed or make the final assembled skin a single coherent closed solid with intentional seams. Do not mix both concepts ambiguously.

Expected acceptance for the next scratch experiment:

- topology: `0` boundary edges, `0` nonmanifold edges
- no duplicate internal walls along shared seams
- no visible stacked boxes
- no one-piece pancake/slab silhouette
- silhouette/depth should not regress from v07 without a clear visual win
- local renders and depth panels are diagnostic only

## Cold Worker First Commands

Run these before planning code changes:

```sh
pwd
git branch --show-current
git rev-parse --short HEAD
git log --oneline -5
sed -n '1,220p' CODEX_STARTS_HERE.md
sed -n '1,220p' PROJECT_ORIENTATION.md
sed -n '1,220p' docs/doctrine/cloud-visual-truth.md
sed -n '1,220p' docs/doctrine/scratch-mode.md
python3 -m py_compile archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_shared_interfaces_v08.py
```

Then inspect the current reports:

```sh
python3 - <<'PY_REPORT'
import json
from pathlib import Path
base = Path('archive/scratch/20260708-real-sherman-chassis-scratch/models/real_sherman_upper_glacis_shared_interfaces_scratch_v08')
for name in ['model_manifest.json', 'depth_error_report.json', 'shared_interface_report.json', 'assembly_interface_report.json']:
    data = json.loads((base / name).read_text())
    print('\n##', name)
    for key in ['candidate', 'topology_status', 'shape_review_status', 'status', 'silhouette_iou', 'mean_abs_depth_error', 'p95_abs_depth_error', 'failure_reasons']:
        if key in data:
            print(key, data[key])
PY_REPORT
```

## Prompt To Hand A Blank Agent

Use this as the starting prompt when assigning the next cloud worker:

```text
You are continuing PR #1 in Valar05/tanks-for-the-memories on branch codex/upper-glacis-recovery-tools.

Start by reading CODEX_STARTS_HERE.md, PROJECT_ORIENTATION.md, docs/doctrine/cloud-visual-truth.md, docs/doctrine/scratch-mode.md, and the v07/v08 scratch notes. Verify current branch/head before editing.

Current red state: v07 preserved more silhouette but produced independent manifold prisms that read as stacked boxes. v08 introduced canonical shared-interface reporting and a single primary visible skin; topology and shared-interface reports passed, but it regressed silhouette/depth and visually collapsed into a slab/ring. Do not defend v08 as success.

Goal: produce the next scratch experiment only if it materially tests a true multi-region shared-vertex visible skin for the Sherman upper glacis. Preserve silhouette and manifold assembly. Do not copy source triangles, use convex hulls as final boundaries, export independent stacked prisms, or create one envelope slab. Shared interfaces must become actual mesh topology.

Before mutation, state the current command, forbidden stale premise, intended mutation, and why it satisfies the command. Keep artifacts in archive/scratch, write a lessons note, provide the official local model-viewer link plus the desired GitHub Pages model-review anchor, and classify the result honestly as red/candidate based on reports and visual diagnostics. The cloud anchor must preserve camera and hidden-by-default object adjustment tools. Do not claim visual acceptance without the cloud/Sense lane.
```

## PR Comment Discipline

When updating PR #1, include:

- commit SHA
- local viewer URL and durable GitHub Pages model-review anchor, or the exact Pages/tooling blocker
- exact status: red/candidate/promote/abandon
- topology results
- silhouette/depth metrics
- comparison against v07 and v08 where relevant
- links to exporter, manifest, depth panel, assembly/interface reports, and lessons note
- one clear hypothesis verdict

Do not call diagnostic progress success.

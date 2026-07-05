# Cloud Visual Truth Gate

Local screenshots, Android `screencap`, localhost browser capture, and local visual harness frames are forbidden as acceptance evidence for the tank visual workflow. The accepted visual lane is a cloud-hosted build plus Sense Simulation review.

Visual QA is mandatory. Any visual change without accepted-lane visual QA remains red or blocked. Build commands, deploy commands, route checks, manifests, GLB bboxes, source strings, and browser wake do not count as visual QA and cannot close the build.

## Cloud-Only Attention Rule

Do not present a local browser, localhost URL, local screenshot, Android `screencap`, temporary-server capture, or stale capture as proof for this tank visual pass. When the user needs to see the tank, deploy the current release packet to cloud hosting, then use the cloud review surface and Sense Simulation before waking the browser for attention. Browser wake is blocked unless the cloud-hosted artifact is current and Sense Simulation says the named visible relationships pass.

Do not use `screencap`, local Android screenshots, local browser screenshots, temporary-server frames, or localhost inspection as a fallback after waking the user. On this project they are forbidden acceptance paths. If Sense Simulation cannot inspect the cloud artifact, report the cloud-review blocker and repair the cloud review surface; do not substitute local capture.

The proof is not "24 instanced GPU tanks." The proof is 24 independently animated tanks rendered within the phone budget. Shared geometry is acceptable only as a rendering optimization; every visible tank must have its own smoothed animation state for drive phase, wheel spin, tread phase, turret horizontal traverse, and barrel vertical elevation.

Do not accept source variables as visual proof. If the barrel still reads as an ugly black tube, or if vertical barrel motion is not visible around the turret front/socket, the build is red even when `barrelPitch` exists in code.

Required pre-wake commands use the cloud release lane only. Choose the target surface:

```sh
npm run visual-qa:model-assay
npm run visual-qa:single-tank
npm run visual-qa:boxmodel-tank
npm run boxmodel-tuner-smoke
```

The command result is not visual acceptance by itself. Visual QA is non-optional, and acceptance requires cloud-hosted Sense Simulation review showing:

- cannon visually seated in the turret/mantlet area, not separated from it
- barrel vertical motion readable around the socket/pivot
- tread reads as a Sherman-like trapezoid belt volume with visible side/back thickness
- tread motion reads as belt/material travel rather than a rounded static ribbon
- 24 tanks remain independently animated and plausible on phone

If cloud/Sense review still shows separated barrel, rounded/one-sided tread, or an untextured single tank, the result is a cloud red build. Do not wake the user for acceptance.

## Conquer Failure Loop

The mission is not to report failure. The mission is to conquer failure.

A captured red build is a work order, not a stopping point. After visual QA proves a relationship failure, immediately enter the breaker loop unless the next step requires a credit spend, external account action, or human design choice that cannot be inferred from repository truth.

Breaker loop:

1. Name the visible relationship that failed.
2. Identify the blocker class: asset incompatibility, geometry silhouette, material read, animation pivot, camera/framing, cache/deploy, or harness blind spot.
3. Choose the highest-leverage breaker action, not the smallest code tweak.
4. Use the cloud brain: cloud-hosted build, fresh visual QA frames, Meshy/OpenAI assets when appropriate, repo corpus, docs, manifests, screenshots, and sense simulation together.
5. Change the artifact.
6. Rebuild and redeploy when the review lane is cloud-only.
7. Run the cloud review gate again.
8. Inspect the cloud/Sense result for the named visible relationship.
9. Repeat until the relationship passes, the artifact class is replaced, or a real external decision is required.

Do not end a turn with only "red build" when there is still an obvious breaker action. A red verdict must be paired with the next action already taken, a concrete patch in progress, or a precise blocker such as "requires Meshy credit approval for a new separated mantlet/socket asset."

Wake rule:

- Wake for acceptance only after the accepted cloud/Sense evidence lane already says the named visible relationship passes.
- Wake for decision only when the breaker loop reaches a real choice, credit spend, or external account action and the visual state has already been characterized by the agent.
- Never wake to discover whether a visual change worked. Wake is not QA, not review capture, and not a request for the user to inspect an unknown outcome.
- Do not let `ok: true` from the capture harness mean visual success; it only means pixels were captured.

Post-deploy non-wake rule:

- Deploying a visual build does not justify waking the browser.
- After deploy, the agent must inspect the accepted cloud/Sense evidence artifact first. If that evidence is missing, stale, blocked, or red, do not wake. Repair the evidence lane, continue the breaker loop, or report the blocker.
- If the evidence shows a red build, say so and continue the breaker loop when a next action is available; do not wake the user to confirm the failure.
- If the evidence shows the named visible relationship passes, waking the exact cloud URL with a fresh cache-bust token is allowed as an attention handoff, not as discovery.

Visual-change wake rule:

- Any visual change must pass the accepted evidence lane before browser wake.
- This includes code, assets, materials, shaders, model composition, animation, camera/framing, deployment, screenshots, generated files, exported files, or any other artifact whose quality is judged by what the user sees.
- Verification commands, source checks, GLB inspection, manifests, LFS status, tests, and media refresh are diagnostic only. They cannot authorize wake.
- If no trustworthy visual review surface exists yet, state that as the blocker and build or repair the review surface before claiming visual success or waking the browser.
- Waking an unknown visual outcome pushes QA onto the user and is itself a red-build workflow violation, even if files, commit, push, tests, packaging, and deploy succeeded.

## False-Change Penalty

If a fresh cloud screenshot looks materially unchanged after a claimed visual fix, treat that as worse than a bad fix. The failure is not "the geometry needs one more tweak"; the failure is that the evidence gate allowed code churn to masquerade as visual progress.

Penalty rule:

- Do not make another success claim from source markers, manifests, or deploy logs.
- State the screenshot read first, including what did not change.
- Name the failed visible relationship in the next commit/deploy notes.
- Add or strengthen a guard that forbids the exact false-change path.
- Do not report "fixed" until a fresh cloud screenshot or time-separated cloud capture shows a visible delta that addresses the named relationship.

For the current red build, the named false-change relationships are:

- tread still reads as side/background treatment rather than a convincing track volume
- barrel still reads as an ugly black tube
- barrel verticality is not perceptible
- proof UI text claims more than the visible artifact proves
- page-level cache bust is insufficient if bundled JS/CSS asset URLs are stable

### Authored Armored V1 False-Green Case

`authored_sherman_armored_v1` is red/unaccepted until a fresh cloud/Sense comparison proves otherwise. It passed exporter, manifest, route, and bbox-style checks while the same front and rear armor gaps remained visible.

The failed visible relationship is: front and rear lower sponson armor must visually bridge hull/glacis/rear plate to the outer track skirt. The actual visible result left black air in the same corner slots.

Future Sherman geometry gates must include a cloud/Sense visible-relationship comparison against the prior baseline and the rejected build. The report must state:

- expected visible relationship
- actual visible relationship
- what visibly changed
- what did not change
- whether telemetry and validators support or contradict the visible read

Do not accept a guard that only proves node presence, route wiring, object names, material slots, source strings, or internal bbox overlap. The guard must fail when the exterior viewer-facing armor slot is still open.


### Boxmodel V1-15 No-Op Churn Verdict

`authored_sherman_boxmodel_v1` revision `v1-15-cast-turret-readable-wheels` is red/unaccepted by user visual report. Source, GLB, manifest, and hosted token checks changed, but the visible tank did not materially improve enough to count as a visible delta.

The required verdict artifact is `docs/visual-verdicts/boxmodel-v1-15-red.json`. Boxmodel cloud gates and no-op diagnostics must require a verdict artifact for the exact build token and GLB token before they pass. A red verdict may allow diagnostic commands to complete, but it must print that the build is unaccepted and must not authorize fixed/changed/ready-for-acceptance language.

Before another boxmodel geometry edit, run `npm run tank-visual-repair-preflight`. The preflight intake at `docs/visual-repair-intakes/boxmodel-after-v1-15-no-op.json` must name the visible target, current actual read, forbidden old mistake, single edit class, accepted evidence needed, and what would prove no-op. If the preflight fails, do not edit geometry.

The visible failure packet at `docs/visual-failure-packets/boxmodel-v1-15-identical-mesh-read.json` is mandatory context: v1-15 looked identical because dominant silhouette-driving forms stayed effectively unchanged while only subordinate detail geometry moved. Any future geometry proposal that leaves hull/sponson shell, track slab/skirt volume, turret mass, and full track-well armor surfaces effectively unchanged is no-op churn by default and must not be built.

`npm run boxmodel-dominant-shape-smoke` compares the current boxmodel GLB against `docs/visual-failure-packets/boxmodel-v1-15-dominant-shape-baseline.json`. A future revision that changes tokens or detail meshes while leaving the dominant hull/sponson/track/turret bboxes within the no-op threshold must fail before cloud review.

The stale Blender visibility failure is part of the bug: diagnostic renders for `authored_sherman_boxmodel_v1` must fail if their recorded `model_revision` differs from the current model manifest revision. Offline renders remain diagnostic only even when current.


## Authored Retopo Replacement Gate

Close-up review has rejected the current Meshy chassis/turret as production geometry. The next replacement target is `authored_sherman_retopo_v1`: fully authored hard-surface hull and turret geometry, separable turret/barrel/tread/wheel nodes, and split face PNG texture plates for DALL-E-friendly paint passes. The old Meshy chassis/turret remain reference ore and red-build evidence, not the production base.

Acceptance requires cloud/Sense review of `retopo-tank.html` showing usable close-up chassis and turret form, a barrel visually owned by the mantlet, sane face-plate texture mapping, and no local capture evidence.

## Target Artifact

The legacy tank target is the phone-runtime Meshy Sherman:

- runtime manifest: `public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json`
- runtime GLB: `public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/m4a3_75_vvss_sherman_alpha_mobile.glb`
- Meshy GLB role: active visible static body reference
- debug runtime: procedural kitbash proof only, not player-facing
- next model gate: `docs/doctrine/scorpion-informed-heavy-tank-systems-contract.md`

## Required Cloud Captures

Capture the hosted build at phone proportions first, then desktop only as a secondary reference.

- single-tank phone portrait, first loaded frame after GLB settles, showing one linked textured Sherman
- single-tank phone landscape, first loaded frame after GLB settles, showing olive armor albedo and tread albedo
- single-tank right-side camera interaction evidence from the cloud route
- phone portrait, first loaded frame after GLB settles
- phone landscape, first loaded frame after GLB settles
- phone portrait after at least five seconds of runtime motion
- desktop medium viewport after at least five seconds of runtime motion
- time-separated capture showing unsynchronized horizontal turret traverse and vertical barrel elevation across all 24 tanks


## Boxmodel Cloud Review Operator

Use one stable workflow command for boxmodel cloud review instead of ad hoc deploy, curl, grep, and per-URL approvals:

```sh
npm run cloud-review:boxmodel
```

This command owns the boxmodel cloud-review lane:

- builds `generated/cloud-visual-truth/tftm-release`
- runs `npm run visual-qa:boxmodel-tank`
- redeploys the existing Firebase Hosting channel `tftm-boxmodel-v1-13` on project `home-center-dclar`
- fetches `boxmodel-tank.html` from the hosted review URL
- discovers the current cache-busted `assets/boxmodel-tank.js?v=...` URL from the hosted HTML
- verifies the hosted JS contains the release manifest build token and the runtime GLB cache token
- rejects stale rejected tokens such as `v1-12-watertight-visible-sponson-shells`

Do not create a new Firebase channel for every tank pass; channel quota is limited. Reuse the existing boxmodel review channel unless the channel itself is broken. Do not run one-off `curl` commands for each changing bundle URL; update the operator script when a new stable check is needed.

The operator still does not provide visual acceptance. It proves only that the cloud review surface is current and ready for Sense Simulation.

## Sense Simulation Review

Judge what the viewer perceives, not what the code claims.

Desired experience:

The vehicle reads as a non-toy Sherman-family tank with credible hull mass, turret, cannon, tracks, and field-worn material. Static Meshy body credibility is preferred over animated toy geometry. The viewer should not see primitive kitbash as the player-facing tank.

Observed experience checklist:

- Does the tank read as hard-surface armor rather than primitive assembly?
- Does the hull read first, before decoration?
- Does the turret belong to the turret ring?
- Does the cannon appear attached to the mantlet?
- Does the barrel use a Sherman-compatible material instead of black tube read?
- Does the barrel visibly elevate around a rear/socket pivot?
- Is there visible change from the prior rejected screenshot, not merely changed source?
- Is the Meshy body visible as the main tank?
- Is the procedural kitbash tank hidden from the player-facing preview?
- Does the tank avoid a toy/primitive assembly read?
- Does Alpha texture identity stay subordinate to the vehicle shape?
- Does the phone frame preserve the tank silhouette without clipping or UI collision?

Acceptance:

Accept this pass only if cloud screenshots show the Meshy body as the visible non-toy tank and no active procedural toy tank. Future animation work must satisfy the systems contract before replacing this static reference.

## Next Animation Gate

Tread animation can return only through one of these methods:

- authored separable track geometry
- material/UV offset on track belt regions
- flat overlay/marker loop that does not rotate the background-facing side surface
- another cloud-reviewed method that reads as belt travel instead of fan sweep

The current approved authored mesh exception is `tread_ribbon_only`, but "ribbon" means a closed 3D Sherman-like trapezoid track volume, not a side facade or generic rounded belt. It must include outer and inner sidewalls, top run tucked under the hull, long grounded bottom run, angled front and rear returns, side/back thickness, and animated PBR material lanes. Static raised link blocks are rejected as the primary motion proof because they imply moving tread links while the geometry stays still. Hull, turret, barrel, and wheel/gear visual assets remain Meshy-generated unless a later doctrine explicitly changes that.

### Authored Retopo V1.1 Review

The `authored_sherman_retopo_v1` asset now carries silhouette revision `v1.1-sherman-silhouette-subdivision`. Cloud/Sense review should judge whether the added detail layer improves Sherman silhouette without turning the split face plate system into visible seams. Runtime plates are intentionally seam-minimized; authoring templates are allowed to retain guide borders for repaint work.

### Blender Boxmodel Review Gate

The current cloud-first visual candidate is `authored_sherman_boxmodel_v1`, not the rejected high-poly retopo. Acceptance requires Sense Simulation on `boxmodel-tank.html` to confirm the silhouette moved toward a Sherman, the turret no longer reads as a cube, the barrel/mantlet relationship is coherent, and the box UV plates are paintable without local capture evidence.

The boxmodel v1.1 repair requires solidified overlapping armor plates and a named coaxial MG on the cannon elevation assembly; zero-thickness separated planes are a red build.

### Boxmodel Gesture Tuner Gate

When a cloud screenshot disproves a boxmodel armor fix and the remaining problem is coordinate placement, stop blind exporter edits and use the hosted gesture-only tuner at `boxmodel-tank.html?tune=1`. The tuner is the required authoring surface for one-part-at-a-time location, rotation, and scale edits. It must show a parts list, one selected highlighted part, move/rotate/scale controls, right-side camera rotation, exportable tuning JSON or URL state, and no 3D gizmo.

Acceptance still requires cloud/Sense review. Local screenshots, localhost inspection, Android `screencap`, and local visual-harness frames remain forbidden. Bake only a cloud-reviewed tuning snapshot back into the exporter or model source.
## Boxmodel Red-Build Axis Rule - 2026-07-04

For `boxmodel-tank.html`, the cloud/Sense review must explicitly reject any build where the tank lies on its side, wheels face vertically, hatches appear on side armor, or armor plates read as detached cardboard planes. Local capture remains forbidden; however, source validators must still prove the GLB runtime bounds are X length, Y height, Z width before deployment.


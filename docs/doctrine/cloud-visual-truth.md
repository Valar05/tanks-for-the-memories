# Cloud Visual Truth Gate

Local screenshots, Android `screencap`, localhost browser capture, and local visual harness frames are forbidden as acceptance evidence for the tank visual workflow. The accepted visual lane is a cloud-hosted build plus Sense Simulation review.

## Cloud-Only Attention Rule

Do not present a local browser, localhost URL, local screenshot, Android `screencap`, temporary-server capture, or stale capture as proof for this tank visual pass. When the user needs to see the tank, deploy the current release packet to cloud hosting, then use the cloud review surface and Sense Simulation before waking the browser for attention. Browser wake is blocked unless the cloud-hosted artifact is current and Sense Simulation says the named visible relationships pass.

Do not use `screencap`, local Android screenshots, local browser screenshots, temporary-server frames, or localhost inspection as a fallback after waking the user. On this project they are forbidden acceptance paths. If Sense Simulation cannot inspect the cloud artifact, report the cloud-review blocker and repair the cloud review surface; do not substitute local capture.

The proof is not "24 instanced GPU tanks." The proof is 24 independently animated tanks rendered within the phone budget. Shared geometry is acceptable only as a rendering optimization; every visible tank must have its own smoothed animation state for drive phase, wheel spin, tread phase, turret horizontal traverse, and barrel vertical elevation.

Do not accept source variables as visual proof. If the barrel still reads as an ugly black tube, or if vertical barrel motion is not visible around the turret front/socket, the build is red even when `barrelPitch` exists in code.

Required pre-wake commands use the cloud release lane only. Choose the target surface:

```sh
npm run visual-qa:model-assay
npm run visual-qa:single-tank
```

The command result is not visual acceptance by itself. Acceptance requires cloud-hosted Sense Simulation review showing:

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

- Wake for acceptance only after the cloud review gate and Sense Simulation pass.
- Wake for decision only when the breaker loop reaches a real choice or credit spend.
- Do not let `ok: true` from the capture harness mean visual success; it only means pixels were captured.

Post-deploy review rule:

- Any time a visual build is deployed and the agent is about to report on that build, wake the browser to the exact cloud URL with a fresh cache-bust token first.
- After waking, inspect the freshest available cloud/Sense review artifact before final reporting.
- If the screenshot/capture shows a red build, say so and continue the breaker loop when a next action is available.
- Do not confuse review wake with acceptance wake: review wake proves the user and agent are looking at the current artifact; acceptance still requires the visible relationships to pass.
- Do not skip review wake merely because local visual QA is blocked. If cloud/Sense review is blocked, wake the cloud artifact only for review, report the cloud-review blocker, and do not claim acceptance.

Visual-change wake rule:

- Any change that affects visuals and needs user review requires a wake before the agent claims success.
- This includes code, assets, materials, shaders, model composition, animation, camera/framing, deployment, screenshots, generated files, exported files, or any other artifact whose quality is judged by what the user sees.
- Wake the most direct current review surface for the artifact: cloud URL, hosted viewer, browser page, Android-visible file, upload/import path, or the accepted project review lane.
- Verification commands, source checks, GLB inspection, manifests, LFS status, tests, and media refresh are diagnostic only. They can support the wake; they cannot replace it.
- If no trustworthy visual review surface exists yet, state that as the blocker and build or repair the review surface before claiming visual success.
- If the agent forgets the wake after a user-review visual change, the result is a visual red build even if the files, commit, push, tests, and packaging all succeeded.

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

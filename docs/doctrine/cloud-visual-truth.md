# Cloud Visual Truth Gate

Local screenshots and local browser capture are not authoritative for the tank visual pass when device capture is failing. The accepted visual lane is a cloud-hosted build plus Sense Simulation review.

## Cloud-Only Attention Rule

Do not present a local browser, localhost URL, local screenshot, or stale capture as proof for this tank visual pass. When the user needs to see the tank, deploy the current release packet to cloud hosting and wake the browser to the cloud URL with a fresh cache-bust value.

The proof is not "24 instanced GPU tanks." The proof is 24 independently animated tanks rendered within the phone budget. Shared geometry is acceptable only as a rendering optimization; every visible tank must have its own smoothed animation state for drive phase, wheel spin, tread phase, turret horizontal traverse, and barrel vertical elevation.

Do not accept source variables as visual proof. If the barrel still reads as an ugly black tube, or if vertical barrel motion is not visible around the turret front/socket, the build is red even when `barrelPitch` exists in code.

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

## Target Artifact

The current tank target is the phone-runtime Meshy Sherman:

- runtime manifest: `public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json`
- runtime GLB: `public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/m4a3_75_vvss_sherman_alpha_mobile.glb`
- Meshy GLB role: active visible static body reference
- debug runtime: procedural kitbash proof only, not player-facing
- next model gate: `docs/doctrine/scorpion-informed-heavy-tank-systems-contract.md`

## Required Cloud Captures

Capture the hosted build at phone proportions first, then desktop only as a secondary reference.

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

The current approved authored mesh exception is `tread_ribbon_only`, but "ribbon" means a closed 3D tread belt volume, not a side facade. It must include outer and inner sidewalls, top run, bottom run, front return, rear return, and raised shoes/grousers across belt width. Hull, turret, barrel, and wheel/gear visual assets remain Meshy-generated unless a later doctrine explicitly changes that.

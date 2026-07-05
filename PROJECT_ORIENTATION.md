# Tanks For The Memories Project Orientation

Read this file before editing code, assets, generated models, doctrine, or visual review tooling in this project.

## Project Shape

This repository is a historical simulation substrate and design workbench for a Normandy tank commander game. The current browser surfaces are probes, not the finished game.

Start with these files:

1. `REPO_DOCTRINE.md`
2. `docs/doctrine/cloud-visual-truth.md`
3. `docs/doctrine/sherman-hard-model-texture-architecture.md`
4. The relevant exporter, validator, runtime page, and manifest for the asset under work

## Visual Evidence Rule

Tank visual work is cloud-gated. Local screenshots, Android `screencap`, localhost browser capture, and local visual-harness frames are forbidden as visual acceptance evidence. Visual success requires the cloud visual truth release lane plus Sense Simulation review of the named visible relationship.

Offline Blender renders, GLB bboxes, route checks, source-string checks, and model manifests are diagnostic only. They may explain a failure or guard against regressions, but they cannot close a visual build.

## Tank Hard-Surface Red-Build Rule

A tank model fix is only real when the intended visible relationship changes. For hull, track, turret, mantlet, barrel, and coaxial MG work, state the expected relationship and the actual visible relationship before editing.

The current red-build lesson is `authored_sherman_armored_v1`: it passed exporter, manifest, route, and bbox-style checks while the same front and rear armor gaps remained visible. Treat that asset as red/unaccepted until a fresh cloud/Sense comparison proves otherwise.

For sponson, glacis, and track-well repairs:

- The front and rear lower sponson armor must visually bridge hull/glacis/rear plate to the outer track skirt.
- The repair must cover the exterior visible armor skin, not merely place boxes behind the skirt or inside the track well.
- The closure must cover triangular upper voids and lower rectangular shadow slots when both are visible.
- Freestanding blockers, internal returns, pasted slabs, or boxes that leave the silhouette showing air are red.
- A validator that checks only node names, object presence, manifest text, route wiring, or internal bbox overlap is false-green.

If a fresh screenshot or cloud/Sense review says the same armor gaps remain, stop geometry edits. Name the failed visible relationship, identify the exporter cause, and strengthen the gate before touching the model again.

## Authored Sherman Armor Gap Failure

The specific armored-v1 failure was caused by solving the wrong surface:

- The old boxmodel had `left_visible_glacis_slot_wall__hull_left` and `right_visible_glacis_slot_wall__hull_right` to address the visible front slot.
- The armored exporter copied shoulder/web pieces but omitted those visible slot-wall faces.
- It then added `front_armored_return` and `rear_armored_return` boxes that could exist behind or beside the gap without sealing the visible exterior opening.
- The validator accepted size and rough bbox relation behind the skirt, not whether the viewer-facing hull/track slot was covered.

Do not repeat this pattern. For future hard-surface fixes, define the missing visible face first, then validate that face against the neighboring visible planes.

## Implementation Hygiene

Use controlled shared-storage writes with immediate readback for doctrine edits. Do not use `apply_patch` in this Android shared-storage workspace when project instructions forbid it.

Do not edit generated assets, exports, or model geometry while updating doctrine unless the user explicitly asks for that implementation work.

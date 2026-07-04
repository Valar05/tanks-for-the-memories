# Sherman Hard-Model Texture Architecture

This document locks the first Sherman base as a hard-surface identity platform.

Alpha and later named tanks do not redesign the vehicle. The chassis, turret, running gear, armor package, and silhouette remain fixed. Identity comes from texture language: paint, wear, decals, grime, maintenance marks, and history layers.

## Fixed Base

- Vehicle: M4A3 75mm Sherman with VVSS.
- Geometry policy: fixed chassis and fixed turret for identity skins.
- First-slice exclusions: no DD flotation, beach hardware, style armor, fantasy accessories, or decorative silhouette changes.
- Runtime role: low-poly Sherman base that can accept high-definition texture language.

## Surface IDs

These `surface_id` values are the stable bridge between the hard model, generated proof plates, Meshy/GLB imports, and runtime material slots.

| surface_id | Hardpoint link | Texture role |
| --- | --- | --- |
| `glacis` | `hull_family` | Primary recognition stripe, white A, ghost number, front scratches |
| `turret_shell` | `turret_family` | Matching recognition stripe, squad symbol, horizontal fading |
| `rear_hull` | `engine_bay` | Small rear accent, engine grime, maintenance panel wear |
| `engine_deck` | `engine_bay` | Oil staining, heat fade, inspection notes |
| `driver_hatch` | `crew_access` | Handwritten reminder, boot wear, touch-up paint |
| `commander_hatch` | `crew_access` | Crew traffic, rubbed paint, minimal rust |
| `mantlet` | `main_gun_mount` | Bare steel edge wear, subdued grime |
| `barrel` | `main_gun_mount` | Heat discoloration, tiny chips, no identity graphics |
| `vvss_bogies` | `suspension` | Mud, grease, road dust |
| `track_belt` | `suspension` | Rubber/steel wear, mud only below hull line |
| `fuel_caps` | `engine_bay` | Fuel staining and hand-wipe marks |
| `maintenance_panels` | `hull_family` | Scratches, chalk notes, inspection dates |

## Identity Rules

- Geometry never names the tank.
- Color, wear, and markings name the tank.
- Each named tank gets one primary recognition color.
- Medium-distance recognition must not require UI text.
- Decals are field-painted and imperfect unless the specific crew identity says otherwise.
- Maintenance habits are part of the identity.

## Alpha Binding

Alpha uses the fixed base without geometry changes:

- Recognition color: deep crimson.
- Primary marks: broad glacis stripe, turret stripe, small rear accent, hand-painted white A.
- Maintenance language: clean, disciplined, veteran, touched up repeatedly.
- Grime policy: mud only low, oil/fuel localized, minimal rust.

The old Pillow proof remains only as discarded reference ore. It is not the Alpha production path. Alpha must be produced as a Meshy retexture/model-texture asset or another UV-aware texture workflow that changes the tank material itself, not runtime planes.

## Runtime Baseline Albedo

The single-tank inspection scene may link the existing constrained default albedo set at runtime to prove baseline material readability: olive armor albedo for the body and tread albedo for track/tread surfaces. This is not a named-tank texture variant and must not copy the Sherman model or fork the texture set. Named commander identity still requires UV-aware texture/decal work; runtime baseline albedo only prevents the linked Sherman from appearing untextured.

## Authored Retopo Face Plates

The close-up retopo path is `authored_sherman_retopo_v1`. It replaces the unusable Meshy chassis/turret with authored hard-surface geometry and split face texture plates. Each plate is a large 0-1 rectangular PNG target so DALL-E can paint one surface family at a time: glacis, hull sides, rear, engine deck, turret front/sides/top, mantlet, barrel strip, tracks, wheels, and bogies. Do not pack these into an atlas until cloud/Sense accepts silhouette and paint language.

DALL-E prompt rule: name the surface in the prompt and keep labels out of the image itself. Text, letters, chalk notes, and fine symbols remain a later controlled decal pass.

## Vanilla Baseline Preservation

The first accepted phone Meshy Sherman is preserved as `public/tftm/models/m4a3_75_vvss_sherman_vanilla_mobile/`. This baseline has `identity_id: vanilla` and no Alpha/Tango/Whiskey overlay. Keep it as the comparison asset for future recognition-language work.

## Alpha Production Gate

Alpha is not accepted until the recognition language is part of a Meshy retexture/model-texture output or equivalent UV-aware material asset. Do not fake identity with random red runtime planes.

## Meshy Retexture Status

A direct CLI/API attempt to retexture the existing phone Meshy task (`019f2a16-c82b-7b52-b541-c707b58c5d00`) with an Alpha texture prompt was rejected by Meshy: the image-to-3D endpoint does not accept an `api-image-to-3d` task as `input_task_id`. The saved dry-run and failure provenance live in `assets/generated/meshy/m4a3_75_vvss_sherman_alpha_retexture/manifest.json`.

Do not work around this by adding runtime color planes. The next valid route is Meshy Web/UI retexture if available, or a repo CLI extension for the correct Meshy texture/retexture endpoint.

A later image-to-3D attempt from the Alpha character-sheet reference (`019f2ba7-4ad8-7bd1-a094-8469439725e3`) is also rejected. Human visual review read it as a red highlighter on a beige generated tank, not as Alpha personality. Preserve it as evidence only: `assets/generated/meshy/alpha_sherman_player_character_from_reference_v1/manifest.json`.

Do not repeat character-sheet image-to-3D as the Alpha texture path. It changes the model and overfits the recognition color. Alpha needs nuanced paint, wear, chalk, overpaint, and maintenance history bound to the accepted Sherman surface IDs.

A valid Retexture API path now exists in the workspace Meshy CLI. The first candidate from `/openapi/v1/retexture` is `m4a3_75_vvss_sherman_alpha_retexture_v2`, based on accepted vanilla task `019f2a16-c82b-7b52-b541-c707b58c5d00` with original UV preservation, PBR, HD texture, and no character-sheet image input. It is accepted-enough as the current Alpha baseline after human cloud visual review, while still not gameplay-animation-ready.

Commander platoon variants use the same Retexture API route and the same accepted vanilla base task. Alpha, Bravo, Tango, and Delta must read as one platoon through shared olive drab, Normandy wear, and identical silhouette; their differences come only from recognition color, field paint, chalk, wear habits, stowage coloration, and maintenance personality.

## Commander Font-Noise Failure

Bravo/Tango/Delta v1 proved that Meshy Retexture should not be asked to write commander identity through letters, chalk notes, route marks, range math, road-sign text, or symbol piles. Human visual review read those variants as harsh pseudo-font texture rather than crew personality. The v2 route treats each tank individually: one recognition stripe, one restraint-focused wear language, no text burden. If readable letters are required later, author them through a controlled UV/decal texture pass rather than asking Meshy to improvise typography.

## Alpha-Style Derivative Route

If human visual review says only one commander tank has the right graphic shell, do not keep asking Meshy to generate unrelated variants. Use the accepted texture as the source family and derive other commander colors deterministically from its base-color map. This preserves the successful read and avoids the one-good-tank plus rejected-tanks failure.

### Runtime Plate Seams

For authored retopo reviews, authoring templates may keep safe-area guide borders and center marks, but runtime texture plates should not show obvious guide seams. If a cloud review shows visible plate boxes, treat that as placeholder albedo leakage, not accepted paint language. The current silhouette revision is `v1.1-sherman-silhouette-subdivision`: a stable authored asset id with a second geometry/detail pass for Sherman-like massing, cast turret read, VVSS bogies, track cleats, fenders, and barrel/mantlet ownership.

# Vehicle Animation Workflow Contract

This pass defines the tank as an animatable vehicle system before any Meshy generation is accepted.

The first generated tank target is still the fixed M4A3 75mm Sherman with VVSS. The asset must read as a heavy hard-surface vehicle and must preserve animation affordances for tread motion, turret traversal, cannon elevation, and posture-driven crew access. A good static model is not enough.

## Repository Evidence

- `ARCHITECTURE.md` defines the current Three.js Sherman silhouette as a temporary tank-body preview until a sourced GLB exists. It also names hull, turret, gun, tracks, road wheels, hatch marker, and hedgerow occluders as the runtime preview components.
- `docs/doctrine/sherman-hard-model-texture-architecture.md` locks the first base to an M4A3 75mm Sherman with VVSS. It fixes chassis, turret, running gear, armor package, and silhouette; named tank identity comes from paint, wear, decals, grime, maintenance marks, and history layers.
- `research/hardpoint_system/tank_hardpoint_architecture.md` treats hull family, turret family, main gun, suspension, optics, crew access, and external stowage as functional layers. They are not decoration.
- `research/hardpoint_system/hardpoints.json` ties those layers to visual and gameplay changes: barrel length, mantlet, muzzle brake, turret bustle, loader hatch, roadwheel count, track width, ride height, hatch view, stowage, and spare track links.
- `research/tank_components/index.json` names the concrete first-pass components: M4 welded/cast hull family, `turret_sherman_75`, `gun_75mm_m3`, and `susp_vvss`.
- `public/tftm/tanks/alpha/texture_manifest.json` proves the identity rule: geometry is locked, recognition color is single-primary, and forbidden motifs exclude fantasy styling.
- `src/main.ts` currently assembles the preview from boxes, cylinders, wheels, tracks, hatches, and decal planes. That procedural tank is fallback and measurement scaffolding, not the final visual bar.

## Functional Contract

The Meshy Sherman must support these runtime functions:

| Function | Required visual truth | Runtime affordance |
| --- | --- | --- |
| Hull identity | M4A3/Sherman-family hull mass reads first | stable `hull_root` |
| Turret traversal | turret visibly belongs to the turret ring | `turret_traverse_pivot` at ring center |
| Cannon verticality | gun elevates from mantlet, not barrel midpoint | `cannon_elevation_pivot` at mantlet |
| Tread animation | continuous left/right track runs read as moving belts | `left_track_motion` and `right_track_motion`, or material/overlay regions |
| Road wheel motion | VVSS bogies and road wheels read as suspension, not random circles | grouped wheel nodes or overlay-compatible wheel positions |
| Crew posture | commander hatch can imply head-out, cracked, or buttoned state | `commander_hatch` transform or hatch marker |
| Texture identity | Alpha markings survive medium distance without UI text | surface IDs or material slots matching the hard-model doctrine |

## Required Pivots

The accepted runtime model contract is:

```text
tank_root
  hull_root
  turret_traverse_pivot
    turret_shell
    cannon_elevation_pivot
      mantlet
      barrel
  left_track_motion
  right_track_motion
  roadwheel_groups
  commander_hatch
```

Meshy may not return this hierarchy cleanly. If it does not, the integration must classify the asset honestly instead of claiming full animation support.

## Meshy Acceptance Classes

`accept`

- Hard-surface Sherman read is strong.
- Hull, turret, cannon/mantlet, and track regions are separable or cleanly bindable.
- Turret traversal and cannon elevation can be implemented without visible sliding, bending, or detachment.
- Tread motion can be implemented with model parts, material offsets, or clean runtime overlays.
- Runtime budget is acceptable for the existing mobile browser preview.

`hybrid_accept`

- Hull/silhouette/material read is strong enough to replace the primitive body.
- One or more animation regions are fused, but the missing behavior can be supplied with restrained runtime geometry or overlays.
- Hybrid parts must be documented as supplemental animation pieces, not as authored model truth.

`reject`

- Toy, miniature, low-poly primitive, fantasy, or cartoon read.
- Bad Sherman silhouette or missing VVSS/track identity.
- Turret/cannon/track regions are fused in a way that prevents believable traversal, elevation, or tread motion.
- Mesh or texture budget is too high for the preview role.
- War Thunder-like copying, copied markings, logos, or exact game-asset resemblance.

## Generation Prompt Requirements

Every Meshy prompt for this base must include:

- original realistic World War II M4A3 75mm Sherman medium tank with VVSS
- hard-surface game-ready model, heavy cast/welded steel, olive drab, field wear
- clear hull, turret ring, turret shell, mantlet, 75mm cannon, commander hatch
- visible VVSS bogies, road wheels, sprocket, idler, return rollers, and continuous track belts
- track belts and wheels suitable for animation or runtime separation
- turret and cannon visually suitable for traversal and elevation
- no fantasy armor, no cartoon style, no DD flotation, no decorative silhouette changes
- no copied War Thunder assets, logos, markings, or skins

## Inspection Workflow

1. Generate or choose the concept image only after this contract is present.
2. Submit Meshy image-to-3D with remesh, PBR maps, GLB output, and a conservative polycount target.
3. Download and preserve the original Meshy output and manifest.
4. Inspect GLB node names, mesh counts, material slots, texture sizes, and approximate triangle count before touching runtime code.
5. Classify the model as `accept`, `hybrid_accept`, or `reject`.
6. Integrate only accepted or hybrid-accepted assets.
7. Keep the procedural Three.js tank as fallback until a Meshy GLB passes this contract.

## Phone Runtime Exception: Fused Meshy Treads

The current mobile Meshy Sherman is a hybrid_accept body/display base with a single fused mesh. Its tread and roadwheel regions are not separable enough for believable belt travel. Runtime must therefore keep the fused treads static and may animate only turret traverse, cannon elevation, hatch posture, camera, and vehicle-body presentation.

Do not rotate whole tread bands, roadwheel groups, or track-side overlays to imply movement. That produces a false sweep behind the gear: the viewer reads distortion, not tread travel. A later tread pass must use a flat belt/material offset, authored separable track geometry, or another cloud-reviewed technique that leaves the background stable.


## Kitbash Debug Runtime

The composed kitbash tank is debug/proof-only until it stops reading as toy. It must not be the player-facing tank. The active visible tank returns to the Meshy GLB static body reference while the next asset is specified through `docs/doctrine/scorpion-informed-heavy-tank-systems-contract.md`.

The useful lesson from the kitbash pass is still valid: phone tread motion can use texture scroll plus visible sprocket/idler/roadwheel support. But that mechanism must be hidden inside or matched to a hard-surface body that preserves the heavy armor read.

## Runtime Verification Gate

A runtime integration is not complete until it demonstrates:

- turret rotates around the turret ring without sliding
- cannon elevates around the mantlet without detaching
- treads show plausible motion independent of hull rotation
- posture changes still affect hatch/commander read
- medium-distance silhouette reads as a Sherman-like tank, not a toy
- Alpha texture identity remains subordinate to fixed geometry

## Current Recommendation

Do the Meshy pass only after a small GLB inspection helper exists or after an existing tool can report node hierarchy, material slots, texture sizes, and triangle counts. The next useful artifact is therefore not another prompt; it is the asset intake check that decides whether Meshy produced an animatable tank or only a static sculpture.

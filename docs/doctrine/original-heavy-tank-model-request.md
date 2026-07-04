# Original Heavy Tank Model Request Packet

This packet is the source of truth for the next model request. It uses Halo Scorpion as a systems reference only: heavy armor read, dominant turret/cannon, and modular track systems. It must not copy Halo, War Thunder, their silhouettes, logos, skins, or proprietary markings.

## Target

Create an original hard-surface heavy tank for a phone Three.js game. The vehicle should read as heavy, military, industrial armor at first glance, not a toy or primitive assembly. The style target is credible game-ready hard surface with mobile-friendly geometry.

## Required Moving Systems

The generated GLB must either contain named nodes/meshes/materials for these systems, or the asset must be rejected as gameplay-animation-ready:

- `hull_root`
- `turret_traverse_pivot`
- `turret_shell`
- `cannon_elevation_pivot`
- `mantlet`
- `main_barrel`
- `coaxial_weapon`
- `left_front_track_pod`
- `left_rear_track_pod`
- `right_front_track_pod`
- `right_rear_track_pod`
- `track_belt_material_regions`
- `sprocket_idler_groups`
- `roadwheel_groups`
- `commander_hatch`

## Meshy Concept Prompt

Original hard-surface futuristic heavy tank for a mobile Three.js game, inspired only by the systems logic of a four-track heavy battle tank: central armored hull, dominant rotating turret, long main cannon, coaxial weapon, four integrated armored tread pods, visible track belt surfaces, sprocket and idler gear detail, grouped roadwheels, commander hatch, heavy cast and welded armor plates, believable mechanical pivots, matte olive drab and dark steel, realistic field wear, panel seams, bolts, mud and dust low on the running gear, non-toy proportions, readable hard-surface silhouette, game-ready low-poly PBR model, separated visual modules suitable for turret traversal, cannon elevation, tread texture scrolling, wheel rotation, and hatch posture.

## Negative Prompt

No Halo copy, no War Thunder copy, no logos, no exact Scorpion silhouette, no copied game asset, no fantasy armor, no cartoon toy style, no cute proportions, no single fused sculpture, no red runtime planes, no decorative fins, no sci-fi hover parts, no DD flotation, no beach hardware, no excessive greeble, no massive polycount, no tiny per-link track geometry that breaks phone budget.

## Meshy Settings

- model type: `lowpoly`
- PBR: enabled
- remesh: enabled
- topology: triangle
- target polycount: 12000 preferred, 20000 hard reject
- formats: `glb fbx`
- origin: bottom
- texture: enabled
- HD texture: disabled unless a later texture pass is explicitly needed

## Acceptance

Accept only if inspection shows more than one node/mesh/material region and the required moving systems can be bound without visible lies. A strong static body that is fused into one mesh is allowed only as `static_reference_only`, never as gameplay-animation-ready.

The first cloud visual gate must answer:

- Does the vehicle read as heavy hard-surface armor before it reads as parts?
- Are track pods integrated into hull mass?
- Does the turret visibly own the main cannon?
- Are tread material regions usable for scrolling?
- Are sprocket/idler/roadwheel groups credible enough to support the tread illusion?
- Does the phone frame preserve the silhouette without toy proportions?

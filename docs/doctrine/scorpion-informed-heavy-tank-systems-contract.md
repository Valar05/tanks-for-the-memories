# Scorpion-Informed Heavy Tank Systems Contract

This is not a Halo copy request. The Halo Scorpion is the grail for system decomposition: a heavy readable hull, dominant turret/cannon, modular track units, and obvious moving parts. The next tank asset must be requested or built from this part contract before any visual generation.

## Moving Systems To Preserve

- `hull_root`: central armored body, non-toy mass, carries all modules.
- `turret_traverse_pivot`: turret ring center; turret rotates as a unit.
- `cannon_elevation_pivot`: mantlet/gun mount; cannon pitches from the mount, not the barrel midpoint.
- `left_front_track_pod`, `left_rear_track_pod`, `right_front_track_pod`, `right_rear_track_pod`: separated track modules or equivalent left/right separated units.
- `track_belt_material_regions`: visible belts with texture/UV scroll support.
- `sprocket_idler_groups`: wheel/gear rotation groups that visually justify tread motion.
- `roadwheel_groups`: grouped wheels or bogies, not random cylinders.
- `commander_hatch`: posture/readability element, optional animation.

## Visual Requirements

- First read must be heavy hard-surface armor, not primitive assembly.
- Tread modules must look integrated into hull mass, not pasted on.
- Turret and cannon must have clear mechanical ownership.
- Track motion may be texture-based for phone performance, but the support geometry must make it credible.
- The asset must stay original: no Halo/War Thunder copied geometry, logos, markings, or skins.

## Acceptance Gate

Accept a generated/modelled asset only if it has either named separable nodes for these systems or a manifest explaining how each system can be bound without visible lies. Reject fused single-mesh sculptures for gameplay animation, even when they look good. Keep them as static reference only.

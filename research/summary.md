# Normandy Armor Architecture Summary

This package turns Normandy-era Allied armor into a component system.

## Counts
- Vehicles: 10
- Components: 54
- Hardpoints: 17
- Ammo cards: 17
- Canonical crew roles: 6
- Sources: 20

## Smallest Useful Architecture

The smallest historically accurate hardpoint architecture that still covers most Allied tanks in Normandy is a 13-slot model:

1. hull family
2. turret family
3. main gun
4. secondary weapons
5. engine bay
6. transmission
7. suspension
8. radio bay
9. optics
10. armor package
11. special equipment
12. crew access
13. external stowage

This is enough to represent Shermans, Fireflies, DDs, M10s, M18s, M36s, Churchills, Cromwells, Stuarts, and M32 recovery vehicles.

## Key Implementation Rule

If a component changes visibility, information access, mobility, survivability, firepower, or reliability, it gets its own slot. If it only changes appearance, it stays as a skin or variant note.

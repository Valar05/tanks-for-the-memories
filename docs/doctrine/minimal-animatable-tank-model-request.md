# Minimal Animatable Tank Model Request

This is the source of truth for the next tank model request.

Goal: create an original hard-surface tank that is not a toy and can support only the essential gameplay motions.

## Required Parts

- `hull`
- `turret`
- `mantlet`
- `barrel`
- `left_tread_system`
- `right_tread_system`

## Required Motion

- turret rotates independently from hull
- barrel elevates from mantlet
- treads support believable phone-budget motion

## Tread Policy

Use whatever tread construction works for phone performance and visual truth:

- scrolling tread texture preferred
- sprocket/idler/wheel motion only if it supports the illusion
- no per-link tread geometry for v1
- no whole-tread-group rotation

## Visual Target

Original non-toy hard-surface tank. Use the Halo Scorpion only as a broad reference for heavy readable vehicle systems, not as a copied silhouette or IP asset.

## Meshy Prompt

Original hard-surface heavy tank for a phone Three.js game, non-toy armored vehicle, central armored hull, separate rotating turret, clear mantlet, elevating main barrel, left and right tread systems designed for texture-scrolled tread animation, visible sprocket/idler/wheel support where useful, heavy industrial armor plates, believable mechanical pivots, matte olive drab and dark steel, realistic field wear, panel seams, low mud and dust on running gear, readable game-ready silhouette, mobile low-poly PBR asset.

## Negative Prompt

No Halo copy, no War Thunder copy, no logos, no copied game asset, no exact Scorpion silhouette, no cartoon toy style, no cute proportions, no single fused sculpture if claiming animation support, no red runtime planes, no decorative sci-fi fins, no hover parts, no per-link tread geometry, no excessive greeble, no massive polycount.

## Meshy Settings

- model type: lowpoly
- PBR: enabled
- remesh: enabled
- topology: triangle
- target polycount: 12000
- reject over: 20000
- formats: glb, fbx
- origin: bottom

## Acceptance

Accept as gameplay-ready only if the asset has separable or bindable hull, turret, mantlet/barrel, and left/right tread systems. If it is visually strong but fused, save it as static reference only.

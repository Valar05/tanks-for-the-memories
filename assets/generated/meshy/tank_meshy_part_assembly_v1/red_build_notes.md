# Red Build: Atlas Gate Rejected

Status: `rejected_before_meshy`.

Expected visible state: isolated, crop-ready components for Meshy part generation.

Actual visible read:

- The part sheet shows a mostly assembled tank/chassis with tracks and road wheels.
- The hull candidate is not a hull shell only; it already contains the running gear mass.
- The style atlas contains baked text labels and typo artifacts.
- Using these images as Meshy inputs would likely spend credits on another fused or mechanically wrong model.

Decision: do not call Meshy from these images.

Next acceptable artifact: a new no-text, orthographic, isolated part sheet where hull, turret, mantlet/barrel, and gear/wheel are separated and crop-safe. The hull tile must not contain tracks, wheels, turret, barrel, or a complete tank silhouette.

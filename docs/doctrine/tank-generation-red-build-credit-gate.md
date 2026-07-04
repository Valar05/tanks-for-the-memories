# Tank Generation Red-Build Credit Gate

This doctrine exists because the atlas gate can fail before Meshy is called.

## Rule

Do not spend Meshy credits just because an OpenAI sheet looks polished. The sheet must be mechanically useful for the target assembly.

## Pre-Meshy Visual Reasoning Gate

Reject the sheet before any Meshy call if any of these are visible:

- a hull candidate includes tracks, road wheels, gears, turret, barrel, or complete chassis mass
- a part sheet shows a mostly assembled tank instead of isolated crop-ready parts
- labels, spelling errors, UI text, or typography are baked into the material image
- part boundaries are ambiguous enough that cropping would include unrelated systems
- the sheet optimizes for a cool tank image instead of separate Meshy inputs

## Required Part-Sheet Contract

The acceptable OpenAI part sheet is no-text and crop-safe:

- hull shell only, no tracks, no wheels, no turret, no barrel
- turret shell only, no hull, no barrel unless explicitly part of the turret asset
- mantlet/barrel only, no turret shell and no hull
- gear/wheel asset only, no tread belt and no hull
- neutral background, clear spacing, orthographic or near-orthographic view

## Credit Policy

- Preserve failed OpenAI sheets as red evidence.
- Set `next_spend_allowed` to `false` in the assembly manifest.
- Do not use red sheets as Meshy inputs, even for a test.
- A new Meshy call is allowed only after the cloud review page shows an accepted part sheet and the manifest records that acceptance.

## Current Red Evidence

The `tank_meshy_part_assembly_v1` part sheet is rejected. It shows a mostly assembled tank/chassis with tracks and road wheels, so the hull crop would import the exact running gear mass that must stay separate. The style atlas is also rejected for baked text/typo artifacts.

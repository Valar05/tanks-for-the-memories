# 3D Placement Corpus For Tank Parts

This corpus exists because prior agents repeatedly failed at basic 3D placement: panels were added where armor should have been remodeled, bbox checks passed while screenshots stayed wrong, and browser wake pushed visual QA onto the user.

Use this before moving, adding, scaling, or rotating any tank part.

## Core Lesson

The task is not to place an object in empty space. The task is to repair a visible relationship.

For tank work, the relationship is usually one of these:

- hull armor belongs to track armor
- sponson armor bridges hull to skirt
- turret belongs to turret ring
- barrel belongs to mantlet
- coaxial MG belongs to the gun assembly
- wheels sit inside the track/skirt volume
- track belt reads as a closed running-gear mass

If the relationship is wrong, object placement is a modeling failure even when coordinates, nodes, bboxes, manifests, and route checks pass.

## Coordinate Discipline

Do not edit coordinates until these are known and written in the work note:

- authored axes
- Blender axes
- runtime axes
- parent node of the part
- world-space bbox of the part being changed
- world-space bbox of each neighboring part it must visually join
- camera/view where the failure is visible

For the current authored Sherman boxmodel:

- authored coordinates are `X` forward/back, `Y` up/down, `Z` left/right
- Blender is Z-up and exporter helpers convert authored coordinates through `P`, `S`, and `R`
- Three.js runtime should read `X` length, `Y` height, `Z` width
- wheels must be thin on runtime `Z` so they face the hull sides

Never infer side/sign from part names alone. Measure left and right separately.

## Placement Workflow

1. State the failed visible relationship.
2. Identify the existing parts that should own that relationship.
3. Measure all involved parts in world space.
4. Define the missing visible surface, not just the missing volume.
5. Choose whether the correct fix is remodel, extend, replace, or remove.
6. Add a guard that fails the old mistake.
7. Use accepted visual QA before any success claim.

If step 4 cannot be stated as a surface relationship, do not place a part yet.

## Surface Before Volume

A visible hole is usually not solved by filling volume. It is solved by making the correct exterior surface continuous.

Bad framing:

- `there is a hole, add a box`
- `the bbox must reach Z 1.0`
- `put a cover on the outside plane`
- `add four panels for four gaps`

Good framing:

- `front lower sponson armor must visually become the side skin that bridges the glacis edge into the outer track skirt`
- `rear hull side must taper into the idler/track cover without a black corner slot`
- `a ray cast from outside the visible gap must hit armor before it can enter the tank interior`
- `mantlet must occlude the barrel base from the review camera`

If a repair reads as a separate rectangle, slab, plug, cheek, blocker, wing, or pasted panel, it failed even if it covers pixels.
If a raycast can get inside the tank through the repaired gap, the repair failed even if the surface looks covered from one view.

## Forbidden Repeat Mistakes

These are not new mistakes. They are known failures and must not be repeated:

- adding large flat panels over track gaps
- adding freestanding boxes or blockers in front of visible air
- placing returns behind the skirt while the exterior silhouette still shows a slot
- moving a part to the exterior side plane without integrating it into the hull form
- using node presence, object names, route wiring, or manifest text as visual proof
- using bbox overlap as proof that armor reads as joined metal
- waking the browser so the user discovers whether the visual changed
- accepting a release packet because it says the right review words

The v1-10 boxmodel failure was a labeled repeat of this class: exterior side-plane covers became giant pasted slabs. The coordinate idea was not enough because the vehicle form was wrong.

The v1-11 boxmodel failure was the next false-green: side raycasts passed, but the visible exterior silhouette barely moved. A hard-surface gap repair now needs a no-op/silhouette-delta guard as well as ray closure.

## Tank Gap Repair Rules

For front/rear sponson, glacis, and track-well gaps:

- The repair must be part of the hull/track armor form, not a cover sitting on top of it.
- The silhouette must improve from the camera where the failure was reported.
- A side, front, rear, or oblique ray through the reported opening must hit exterior armor before it reaches the tank interior.
- Rear gaps may require a different shape than front gaps; symmetry is not proof.
- The part must overlap or interlock with neighboring armor so it reads as joined metal.
- Thin planar faces are acceptable only when they are natural armor plates with believable seams, thickness, and attachment.
- If the screenshot shows a vertical rectangle pasted over the running gear, the fix is red.

For barrel, mantlet, and coaxial MG:

- The barrel rear must be visually seated in or behind the mantlet.
- The mantlet must hide the barrel base from the review camera.
- Coaxial MG must move with the gun assembly and read as a secondary barrel owned by the mantlet.

For wheels and tracks:

- Wheels face the hull side plane, not the ground or camera.
- Track mass must read as a closed belt or armored running gear, not a side facade.
- Track/skirt repairs must preserve visible top, bottom, front, rear, and side thickness where the camera can see them.

## Guard Requirements

A placement guard is useful only if it would have failed the old visual mistake.

Minimum guard for hard-surface placement:

- parse the exported GLB
- compute world-space bboxes for the changed part and neighboring parts
- cast diagnostic rays from outside each reported opening toward the tank interior
- assert each ray hits exterior armor before it reaches the interior volume
- compare against the prior GLB and fail if the changed shell barely moves the visible front/rear/top/exterior silhouette
- assert side-specific plane relationship
- assert enough span for the visible surface
- assert parent ownership if animation matters
- print failure messages that name the visible relationship, not just the node

Bad failure message:

`left_cover missing`

Good failure message:

`left rear hull/track armor is not represented by an exterior joined surface reaching the rear armor/idler corner; current part stops inboard of the visible side plane`

Even good guards remain diagnostic. They do not replace visual QA.

## Visual QA Is The Gate

Visual QA is mandatory and not optional.

Before reporting success, the accepted evidence lane must answer:

- expected visible relationship
- actual visible relationship
- what visibly changed
- what did not change
- whether diagnostics agree with or contradict the visual read

If the evidence lane is blocked, the result is blocked. If the screenshot shows the old relationship or a known failure class, the result is red. Do not wake the browser for unknown outcomes.

## Pre-Edit Checklist

Before changing geometry, answer these in writing:

- What exact visible relationship failed?
- Which existing object should own the missing surface?
- Which camera/view proves the failure?
- What are the neighboring bboxes?
- What old mistake could this edit accidentally repeat?
- What guard will fail that old mistake?
- What accepted visual QA artifact will judge the result?

If any answer is missing, do not edit geometry.

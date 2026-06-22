# Battlefield Awareness Camera Doctrine

## Principle

The camera follows **information events**, not just player input.

Tanks for the Memories should not use a purely omniscient RTS camera. The camera should behave like battlefield awareness: fragmented, contextual, emotionally charged, and limited by what soldiers can actually perceive.

The player is not a god floating above the war. The player is receiving battlefield knowledge through human observers.

## Core Rule

When a soldier discovers meaningful information, the camera may briefly seize attention and show the event from that soldier's perspective.

Example:

- Smoker spots a tank.
- Camera cuts to an XCOM-style dramatic reveal from Smoker's line of sight.
- The player sees what Smoker could reasonably see.
- The player gains that information, almost like psychic awareness, but still bounded by human vision.

This gives the player battlefield knowledge without granting perfect omniscience.

## Design Goal

The battlefield should feel **remembered**, not merely observed.

The camera is not only a navigation tool. It is a memory reconstruction system. It shows what mattered, who saw it, and how the player's understanding of the battle changed.

## Information Sources

Camera events should always come from an in-world observer or report source.

Possible sources:

- Scout sighting
- Smoker spotting armor or infantry
- Tank commander hatch observation
- Infantry squad visual contact
- Machine gun engagement
- Artillery observer callout
- Messenger or radio report
- Objective discovery
- Friendly unit being ambushed
- Tank kill or catastrophic vehicle damage
- Crew bailout
- Medic reaching a wounded soldier

Every camera interruption should answer:

> Who knows this, and how do they know it?

## Human Vision Constraint

The camera may only reveal what the observer could reasonably perceive.

A soldier seeing movement through smoke should not produce a clean tactical readout. The player might see:

- Dust
- Motion
- Muzzle flash
- Partial silhouette
- Treads through foliage
- A turret shape
- A shouted identification that might be wrong

The camera should not automatically reveal:

- Exact model
- Exact health
- Full enemy squad composition
- Hidden support units
- Perfect map position

The player receives evidence, not omniscience.

## Memory Reliability Rule

Because this is Tanks for the Memories, information can be imperfect.

A soldier may report:

> "Tiger! Tiger!"

But the sighting may later resolve into a Panzer IV, StuG, or something else.

This is not a bug. This is the game.

Battlefield memory can be:

- Incomplete
- Mistaken
- Delayed
- Distorted by fear
- Blocked by smoke, terrain, weather, and stress
- Corrected later by better observation

The player should feel the difference between **knowing**, **suspecting**, and **misremembering**.

## Camera Priority Hierarchy

Do not interrupt constantly. If every rifle shot steals the camera, the system becomes unusable goblin machinery.

Camera events need priority.

### Priority 1: Major Awareness Changes

Use dramatic camera intervention.

- First enemy sighting
- First armor sighting
- Ambush reveal
- New vehicle class spotted
- Anti-tank gun discovered
- Tank kill
- Friendly tank catastrophic hit
- Objective-critical discovery

### Priority 2: Tactical State Changes

Use shorter camera intervention or strong notification.

- Squad pinned
- Squad wiped
- Objective captured or lost
- Reinforcements arrive
- Artillery begins landing
- Enemy flank discovered
- Commander wounded or killed

### Priority 3: Ambient Battle Events

Usually do not seize camera. Use audio, UI marker, radio bark, or optional notification.

- Routine rifle fire
- Minor movement contact
- Suppression already understood by player
- Repeated known enemy sightings
- Low-value casualties

## Player Control Rule

The player should retain agency, but the battlefield may grab attention when something meaningfully changes.

Recommended behavior:

- Player can pan and inspect normally.
- High-priority awareness events may briefly override camera.
- The player can skip or dismiss repeated cinematic reveals.
- Reveals should be short and readable.
- After the reveal, return camera to player context or leave a clear trail back.

The goal is guidance, not hijacking.

## Presentation Pattern

A reveal should usually include:

1. Source unit context.
2. Directional movement or camera snap toward what they see.
3. Brief dramatic framing.
4. Audio callout or report.
5. Limited visual evidence.
6. Map marker or memory marker with confidence level.
7. Return to playable control.

Example:

> Smoker hears engine noise.
> Camera drops near Smoker's shoulder.
> Foliage shakes.
> A dark tank shape pushes through smoke.
> Smoker yells, "Tank! Eleven o'clock!"
> The map marks `suspected armor` instead of exact unit data.

## UI Doctrine

Information markers should preserve uncertainty.

Possible marker states:

- Suspected infantry
- Confirmed infantry
- Suspected armor
- Confirmed armor
- Misidentified armor
- Last seen position
- Reported muzzle flash
- Sound contact
- Smoke-obscured contact

Avoid pretending the player knows more than their soldiers know.

## Design Payoff

This solves several problems at once:

- Players stop staring at the wrong part of the battlefield.
- Soldiers become meaningful information sources.
- Fog of war becomes emotional instead of purely mechanical.
- The title's memory theme becomes gameplay, not decoration.
- The battle feels like a remembered human event, not a spreadsheet with explosions.

## Reusable Quote

> The soldiers are the camera operators.

## Acceptance Criteria

A first implementation of this doctrine is acceptable when:

- A unit spotting a new enemy can trigger a short camera reveal.
- The reveal is sourced from that unit's position or line of sight.
- The reveal does not expose information the unit could not know.
- The player receives a useful marker after the reveal.
- The player can resume control without confusion.
- Repeated low-value sightings do not constantly interrupt play.

## Simplest Viable Version

Build one event first:

**Smoker spots enemy tank.**

Implementation target:

- Detect first line-of-sight contact between Smoker and an enemy tank.
- Pause or slow time briefly.
- Move camera to Smoker-adjacent perspective.
- Frame the tank partially, with uncertainty preserved.
- Play/print a bark: "Tank! Eleven o'clock!"
- Add `suspected armor` marker at last seen position.
- Return control.

Do not generalize the whole system until this one reveal feels good.

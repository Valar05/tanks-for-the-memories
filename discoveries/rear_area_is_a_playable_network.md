# Discovery: The rear area is a playable network

## Discovery
Support units are not scenery. The rear area is a network of roads, depots, hospitals, mail channels, sanitation routines, and police control points, each with its own throughput and failure modes.

## Historical Evidence
- source_library/42_army_service_forces.md:15-17 - food, fuel, ammunition, transport, medical care, and repair sit behind the front line.
- source_library/49_united_states_army_ordnance_corps.md:15-17 - procurement, repair, bomb disposal, and maintenance depth are institutional work.
- source_library/54_military_police_corps_united_states.md:15-17 - traffic control, POW handling, route security, and rear-area order are explicit tasks.
- source_library/58_field_hospital.md:15-17 - casualty flow is staged and capacity-limited.
- source_library/46_military_mail.md:15-17 - mail is a morale and memory channel.
- source_library/56_field_hygiene_and_sanitation.md:15-17 - water, waste, insect-borne disease, and field health shape readiness.
- source_library/55_chaplain_corps_united_states_army.md:15-17 - grief response and moral support are organized functions.

## Why It Matters
This changes the map layer: the player should see roads, depots, aid stations, police, and mail as active nodes that can queue, fail, or save the unit.

## Simulation Variable
- Name: `rear_area_throughput`
- Definition: How much supply, care, and information can move through the support network per unit time.
- Range: 0-100
- Related: `maintenance_backlog`, `medical_load`, `traffic_delay`, `mail_latency`

## Mechanic Candidate
Support-network graph with queues, bottlenecks, and cascade failures.

## Pressure System Impact
A delay in one rear node can starve combat, care, morale, and recovery at once.

## Confidence
- 0.96

## Sources
- source_library/42_army_service_forces.md
- source_library/49_united_states_army_ordnance_corps.md
- source_library/54_military_police_corps_united_states.md
- source_library/58_field_hospital.md
- source_library/46_military_mail.md
- source_library/56_field_hygiene_and_sanitation.md
- source_library/55_chaplain_corps_united_states_army.md

## Tags
- rear-area, network, pressure, logistics

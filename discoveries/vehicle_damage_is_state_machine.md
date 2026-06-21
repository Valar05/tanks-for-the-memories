# Discovery: Vehicle damage is a state machine

## Discovery
A disabled tank is not dead. It may be stuck, immobile, recoverable, repairable, cannibalized, or abandoned, and each state has different consequences.

## Historical Evidence
- source_library/48_vehicle_recovery.md:15-17 - recovery splits into self-recovery, like-recovery, and dedicated recovery.
- source_library/49_united_states_army_ordnance_corps.md:15-17 - ordnance and maintenance depth determine whether vehicles return to service.
- source_library/42_army_service_forces.md:15-17 - supply and repair infrastructure sit behind the front line.

## Why It Matters
This changes combat outcome modeling from hit points to lifecycle management and battlefield salvage.

## Simulation Variable
- Name: `immobility_state`
- Definition: Current operational state of the vehicle.
- Range: 0-5
- Related: `recovery_delay`, `repair_queue`

## Mechanic Candidate
Vehicle state transitions with towing, repair, and abandonment outcomes.

## Pressure System Impact
Mobility loss becomes a logistics event, not an immediate delete.

## Confidence
- 0.95

## Sources
- source_library/48_vehicle_recovery.md
- source_library/49_united_states_army_ordnance_corps.md
- source_library/42_army_service_forces.md

## Tags
- vehicles, maintenance, pressure

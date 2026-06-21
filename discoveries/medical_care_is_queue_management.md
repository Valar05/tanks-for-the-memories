# Discovery: Medical care is queue management

## Discovery
Casualty treatment is a staged pipeline with bottlenecks at medics, litter bearers, vehicles, beds, and surgical time.

## Historical Evidence
- source_library/57_combat_medic.md:15-17 - the medic handles point-of-wounding care, evacuation, and frontline trauma care.
- source_library/58_field_hospital.md:15-17 - field hospitals turn injury into staged triage with queueing and capacity limits.
- source_library/62_10th_field_hospital.md:15-17 - the field hospital example makes the capacity concrete.
- source_library/63_95th_evacuation_hospital.md:15-17 - evacuation hospitals scale but still have finite beds and staff.

## Why It Matters
Injury should become an operational queue, not just a death timer.

## Simulation Variable
- Name: `evacuation_delay`
- Definition: Time from wounding to evacuation and treatment.
- Range: 0-24
- Related: `triage_capacity`, `medical_load`

## Mechanic Candidate
Casualty pipeline with triage and treatment capacity.

## Pressure System Impact
Medical throughput becomes a hidden force multiplier or hidden crisis.

## Confidence
- 0.9

## Sources
- source_library/57_combat_medic.md
- source_library/58_field_hospital.md
- source_library/62_10th_field_hospital.md
- source_library/63_95th_evacuation_hospital.md

## Tags
- medical, queue, pressure

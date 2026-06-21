# Global Simulation Report

This report distills the corpus into global simulation design implications.

## Scope

The simulation is not only about tank combat.
It is about WWII life under pressure:
- command
- logistics
- medical care
- daily routine
- morale
- occupation
- captivity
- sanitation
- mail
- fatigue
- visibility
- information delay

## Core Findings

### 1. The rear area is part of the battlefield

Supply, repair, evacuation, mail, security, and administration are active systems with their own throughput and failure modes.

Relevant corpus anchors:
- `source_library/42_army_service_forces.md`
- `source_library/49_united_states_army_ordnance_corps.md`
- `source_library/54_military_police_corps_united_states.md`
- `source_library/58_field_hospital.md`
- `discoveries/rear_area_is_a_playable_network.md`

### 2. Information is the primary resource

The unit does not act on reality directly. It acts on reports, rumors, observations, radio traffic, and stale headquarters pictures.

Relevant corpus anchors:
- `source_library/13_sixteen-line-message-format.md`
- `source_library/36_fm-24-5-basic-field-manual-signal-communication.md`
- `source_library/39_fm-24-19-radio-operator-s-handbook.md`
- `source_library/03_cross-channel-attack-ch9.md`
- `discoveries/radio_latency_message_shape.md`
- `discoveries/hq_picture_stale_by_default.md`

### 3. Visibility is stateful

What the commander can see depends on posture, terrain, exposure, and vehicle role.

Relevant corpus anchors:
- `source_library/30_m3-stuart.md`
- `source_library/11_m4-sherman.md`
- `source_library/10_battle-villers-bocage.md`
- `discoveries/visibility_is_stateful.md`
- `discoveries/bocage_is_information_compression.md`

### 4. Damage is a state machine

Disabled vehicles, wounded people, and blocked routes should move through states rather than instantly resolving to success or failure.

Relevant corpus anchors:
- `source_library/48_vehicle_recovery.md`
- `source_library/57_combat_medic.md`
- `source_library/58_field_hospital.md`
- `source_library/59_prisoner_of_war_camp.md`
- `discoveries/vehicle_damage_is_state_machine.md`
- `discoveries/medical_care_is_queue_management.md`
- `discoveries/capture_is_branch_not_end.md`

### 5. Daily life drives readiness

Sleep, food, hygiene, mail, boredom, grief, and rotation are not decoration. They change judgment, cohesion, and persistence.

Relevant corpus anchors:
- `source_library/43_united_states_army_during_world_war_ii.md`
- `source_library/46_military_mail.md`
- `source_library/47_garrison_ration.md`
- `source_library/55_chaplain_corps_united_states_army.md`
- `source_library/56_field_hygiene_and_sanitation.md`
- `discoveries/mail_is_morale_infrastructure.md`
- `discoveries/sanitation_is_hidden_attrition.md`
- `discoveries/chaplaincy_turns_grief_into_process.md`

### 6. Command is attention management

The commander is a scarce attention processor under uncertainty, not a perfect planner.

Relevant corpus anchors:
- `source_library/31_jacob-l-devers.md`
- `source_library/33_fm-17-30-tank-platoon.md`
- `source_library/34_fm-17-33-the-tank-battalion-light-and-medium.md`
- `discoveries/command_is_attention_management.md`
- `discoveries/training_is_role_learning_not_vehicle_learning.md`

## Simulation Variables

- `commander_training_level`
- `attention_budget`
- `report_latency`
- `hq_picture_freshness`
- `visibility_arc`
- `route_dependency`
- `replacement_familiarity`
- `trust_in_commander`
- `fatigue`
- `immobility_state`
- `rear_area_throughput`
- `medical_load`
- `mail_latency`
- `sanitation_state`
- `occupation_load`
- `captivity_stress`

## Mechanic Implications

- Use queues for medical, repair, supply, and communication delays.
- Use state machines for damaged vehicles, casualties, and captivity.
- Use network graphs for rear-area support and route security.
- Use confidence and freshness, not perfect knowledge.
- Make replacements, mail, sanitation, and grief alter state.
- Make occupation and captivity branch the simulation instead of ending it.

## Failure Modes

- stale headquarters picture
- radio delay and message loss
- friendly-fire identification failure
- replacement trust collapse
- fatigue-driven command errors
- convoy blockage
- repair backlog
- evacuation overload
- sanitation collapse
- grief accumulation
- occupation overload
- captivity stress

## Recommended Player Decisions

- what to observe personally
- what to report immediately
- what to trust from HQ
- whether to risk exposure for better visibility
- whether to rotate crews or press on
- whether to tow, abandon, or repair
- whether to prioritize ammo, fuel, food, or evacuation
- whether to pause for hygiene, mail, or rest
- how to govern occupied ground
- how to handle capture and aftermath

## Design Summary

The simulation should feel like a system of pressure, uncertainty, and partial control.

If the player can feel that war is being decided by attention, queues, trust, and rear-area throughput, the design is in the right shape.

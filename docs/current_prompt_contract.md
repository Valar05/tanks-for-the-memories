# Current Prompt Contract

latest_user_command: Keep everything, but group envelopes and identify.
controlling_user_correction: User revised away from removing chaff; all real Meshy islands should remain available while the tool groups them by spatial bounding-box envelopes for inspection.
forbidden_stale_premise: Do not filter, delete, quarantine, retopo, or generate a no-chaff GLB as the active result; do not treat one mesh id as one part; do not import candidate GLBs as accepted production assets.
allowed_mutation_type: asset_intake_cli; connected_island_detection; bounding_box_envelope_grouping; diagnostic_review_page; report_validation; generated_asset_intake_report; prompt_contract_update
allowed_target_artifact: scripts/inspect_candidate_assets.mjs, scripts/validate_asset_intake_report.mjs, src/asset-intake.ts, generated/asset-intake diagnostic reports, and docs/current_prompt_contract.md.
required_evidence_lane: Envelope grouping, validator checks, and build checks are diagnostic only; any visual acceptance of a candidate part still requires cloud visual truth plus Sense Simulation review.
updated_at: 2026-07-07

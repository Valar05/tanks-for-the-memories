# Current Prompt Contract

latest_user_command: Use the real Meshy mesh islands directly, but remove tiny chaff; no retopo premise.
controlling_user_correction: User clarified that the desired path is to keep real mesh geometry and exclude chaff, not retopologize or only report candidate islands.
forbidden_stale_premise: Do not say the only path is retopo, do not treat one GLB mesh as one fused part, do not include tiny bolts/chips/debris as useful pieces, and do not import candidate GLBs as accepted production assets.
allowed_mutation_type: asset_intake_cli; major_island_filtering; filtered_real_mesh_glb_generation; diagnostic_review_page; report_validation; generated_asset_intake_report; prompt_contract_update
allowed_target_artifact: scripts/inspect_candidate_assets.mjs, scripts/validate_asset_intake_report.mjs, src/asset-intake.ts, generated/asset-intake diagnostic reports, and docs/current_prompt_contract.md.
required_evidence_lane: Filtered-major-island GLB generation, validator checks, and build checks are diagnostic; any visual acceptance of a candidate part still requires cloud visual truth plus Sense Simulation review.
updated_at: 2026-07-07

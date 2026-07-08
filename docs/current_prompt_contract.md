# Current Prompt Contract

latest_user_command: Implement the hull-only guided hard-surface retopo plan.
controlling_user_correction: Retopo means simple readable hard-surface reconstruction from Meshy reference, not shrinkwrap, decimation, arbitrary mesh wrapping, or reuse of Meshy topology.
forbidden_stale_premise: Do not high-to-low decimate Meshy assets; do not shrinkwrap or wrap Meshy noise; do not modify existing authored chassis/tread assets; do not claim local checks as visual acceptance.
allowed_mutation_type: guided_hard_surface_hull_export; guided_hull_runtime_review; guided_hull_asset_validation; cloud_visual_release; cloud_gate_validation; prompt_contract_update
allowed_target_artifact: assets/authored/authored_sherman_guided_hull_v1, public/tftm/models/authored_sherman_guided_hull_v1, scripts/export_authored_sherman_guided_hull.*, scripts/validate_authored_guided_hull_asset.mjs, scripts/validate_guided_hull_cloud_gate.mjs, src/guided-hull.ts, guided-hull.html, src/sherman-asset-links.ts, scripts/build.mjs, package.json scripts for guided hull, generated/cloud-visual-truth/tftm-release, docs/current_prompt_contract.md.
required_evidence_lane: Export and validators are guardrails only. Visual acceptance requires cloud visual truth plus Sense Simulation review of the guided hull against fixed authored treads and Meshy ghost reference.
updated_at: 2026-07-08

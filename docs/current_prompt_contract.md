# Current Prompt Contract

latest_user_command: Implement the cloud pixel screenshot gate plan.
controlling_user_correction: User clarified that the current cloud gate should run on real rendered pixels, not only source/manifest checks.
forbidden_stale_premise: Do not treat existing visual-qa source/manifest gates as visual acceptance; do not use Android screencap, localhost, or local Termux Chromium as the accepted pixel lane; do not change tank geometry, materials, Meshy assets, wheel placement, treads, or turret pivots.
allowed_mutation_type: cloud_pixel_capture_workflow; playwright_cloud_capture_script; package_script_dependency_update; prompt_contract_update
allowed_target_artifact: GitHub Actions cloud-pixels workflow and scripts/capture_cloud_pixels.mjs for real cloud URL screenshots of hybrid-hull-treads material debug routes.
required_evidence_lane: GitHub Actions Playwright/Linux screenshots are pixel evidence artifacts; existing visual-qa gates remain readiness/contract checks. Visual acceptance still requires review of the captured screenshots or Sense-style verdict.
updated_at: 2026-07-07

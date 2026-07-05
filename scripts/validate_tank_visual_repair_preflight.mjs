import { existsSync, readFileSync } from 'node:fs';

const intakePath = 'docs/visual-repair-intakes/boxmodel-after-v1-15-no-op.json';
const verdictPath = 'docs/visual-verdicts/boxmodel-v1-15-red.json';
const failurePacketPath = 'docs/visual-failure-packets/boxmodel-v1-15-identical-mesh-read.json';
const dominantShapeBaselinePath = 'docs/visual-failure-packets/boxmodel-v1-15-dominant-shape-baseline.json';
const failures = [];
function fail(message) { failures.push(message); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

if (!existsSync(intakePath)) fail('missing tank visual repair intake ' + intakePath);
if (!existsSync(verdictPath)) fail('missing controlling visual verdict ' + verdictPath);
if (!existsSync(failurePacketPath)) fail('missing visible failure packet ' + failurePacketPath);
if (!existsSync(dominantShapeBaselinePath)) fail('missing dominant shape baseline ' + dominantShapeBaselinePath);

if (failures.length === 0) {
  const intake = readJson(intakePath);
  const verdict = readJson(verdictPath);
  const failurePacket = readJson(failurePacketPath);
  const dominantShapeBaseline = readJson(dominantShapeBaselinePath);
  const requiredStringFields = [
    'artifact_type',
    'id',
    'target_route',
    'current_build_token',
    'current_glb_token',
    'controlling_visual_verdict',
    'visible_target',
    'current_actual_read',
    'forbidden_old_mistake',
    'single_edit_class',
    'accepted_evidence_needed',
    'what_would_prove_no_op'
  ];
  for (const field of requiredStringFields) {
    if (!intake[field] || typeof intake[field] !== 'string') fail('intake missing required string field ' + field);
  }
  if (intake.artifact_type !== 'tank_visual_repair_intake') fail('intake artifact_type must be tank_visual_repair_intake');
  if (intake.controlling_visual_verdict !== verdictPath) fail('intake must point at controlling verdict ' + verdictPath);
  if (intake.current_build_token !== verdict.build_token) fail('intake build token must match verdict build token');
  if (intake.current_glb_token !== verdict.glb_token) fail('intake GLB token must match verdict GLB token');
  if (verdict.status !== 'red_unaccepted_no_op_churn') fail('this intake is for a red no-op verdict; saw ' + verdict.status);
  if (!String(intake.current_actual_read).includes('no-op churn')) fail('intake must name the current user-visible no-op churn read');
  if (!String(intake.forbidden_old_mistake).includes('pasted') || !String(intake.forbidden_old_mistake).includes('stale diagnostic')) fail('intake must forbid pasted geometry and stale diagnostic proof paths');
  if (!String(intake.single_edit_class).includes('one named') && !String(intake.single_edit_class).includes('replacement')) fail('intake must limit future work to one named repair or replacement decision');
  if (!String(intake.accepted_evidence_needed).includes('Cloud-hosted Sense Simulation')) fail('intake must require cloud-hosted Sense Simulation evidence');
  if (!Array.isArray(intake.next_allowed_actions) || intake.next_allowed_actions.length < 3) fail('intake must list concrete next allowed actions');
  if (!Array.isArray(intake.disallowed_success_language) || !intake.disallowed_success_language.includes('fixed')) fail('intake must disallow success language while red');
  if (intake.visible_failure_packet !== failurePacketPath) fail('intake must point at visible failure packet ' + failurePacketPath);
  if (!String(intake.dominant_shape_rule || '').includes('dominant exterior form')) fail('intake must require dominant exterior form replacement/reshaping');
  if (!Array.isArray(intake.what_not_to_build) || !intake.what_not_to_build.includes('small panels') || !intake.what_not_to_build.includes('gap plugs')) fail('intake must explicitly forbid small panels and gap plugs');
  if (failurePacket.artifact_type !== 'tank_visible_failure_packet') fail('failure packet artifact_type must be tank_visible_failure_packet');
  if (failurePacket.build_token !== verdict.build_token) fail('failure packet build token must match verdict');
  if (failurePacket.glb_token !== verdict.glb_token) fail('failure packet GLB token must match verdict');
  if (failurePacket.controlling_intake !== intakePath) fail('failure packet must point at controlling intake');
  if (!String(failurePacket.visible_failure || '').includes('dominant silhouette-driving forms')) fail('failure packet must name dominant silhouette-driving forms as the reason identical meshes keep happening');
  if (!Array.isArray(failurePacket.dominant_unchanged_shapes) || failurePacket.dominant_unchanged_shapes.length < 4) fail('failure packet must list dominant unchanged shapes');
  if (!Array.isArray(failurePacket.hidden_or_subordinate_changed_shapes) || failurePacket.hidden_or_subordinate_changed_shapes.length < 3) fail('failure packet must list hidden/subordinate changed shapes');
  for (const required of ['hull_lower_tub', 'track_motion', 'runtime camera']) {
    if (!failurePacket.dominant_unchanged_shapes.some((entry) => String(entry).includes(required))) fail('failure packet dominant unchanged shapes must include ' + required);
  }
  if (!String(failurePacket.why_prior_change_passed_diagnostics || '').includes('Bbox') || !String(failurePacket.why_prior_change_passed_diagnostics || '').includes('hosted review camera')) fail('failure packet must explain why diagnostics passed while visual read stayed no-op');
  if (!String(failurePacket.next_geometry_rule || '').includes('dominant exterior form')) fail('failure packet must forbid building unless dominant exterior form changes');
  if (!Array.isArray(failurePacket.no_build_if) || !failurePacket.no_build_if.some((entry) => String(entry).includes('panels')) || !failurePacket.no_build_if.some((entry) => String(entry).includes('dominant bboxes'))) fail('failure packet must define no-build conditions for panel/detail churn and unchanged dominant bboxes');
  if (intake.dominant_shape_baseline !== dominantShapeBaselinePath) fail('intake must point at dominant shape baseline');
  if (failurePacket.dominant_shape_baseline !== dominantShapeBaselinePath) fail('failure packet must point at dominant shape baseline');
  if (dominantShapeBaseline.artifact_type !== 'boxmodel_dominant_shape_baseline') fail('dominant shape baseline artifact_type must be boxmodel_dominant_shape_baseline');
  if (dominantShapeBaseline.model_revision !== verdict.glb_token) fail('dominant shape baseline revision must match red verdict GLB token');
  for (const node of ['hull_lower_tub__hull_left', 'left_sloped_sponson__hull_left', 'right_sloped_sponson__hull_right', 'left_track_motion', 'right_track_motion', 'turret_cast_oval_shell__turret_left']) {
    if (!dominantShapeBaseline.nodes?.[node]) fail('dominant shape baseline missing node ' + node);
  }
}

if (failures.length) {
  console.error('Tank visual repair preflight failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Tank visual repair preflight passed: future work is constrained by v1-15 red/no-op verdict, visible-target intake, and dominant-shape failure packet.');

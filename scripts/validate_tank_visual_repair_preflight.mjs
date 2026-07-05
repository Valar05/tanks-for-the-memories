import { existsSync, readFileSync } from 'node:fs';

const intakePath = 'docs/visual-repair-intakes/boxmodel-after-v1-15-no-op.json';
const verdictPath = 'docs/visual-verdicts/boxmodel-v1-15-red.json';
const failures = [];
function fail(message) { failures.push(message); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

if (!existsSync(intakePath)) fail('missing tank visual repair intake ' + intakePath);
if (!existsSync(verdictPath)) fail('missing controlling visual verdict ' + verdictPath);

if (failures.length === 0) {
  const intake = readJson(intakePath);
  const verdict = readJson(verdictPath);
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
}

if (failures.length) {
  console.error('Tank visual repair preflight failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Tank visual repair preflight passed: future work is constrained by the v1-15 red/no-op visual verdict and exact visible-target intake.');

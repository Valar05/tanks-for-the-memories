import { existsSync, readFileSync } from 'node:fs';

const expectedBuild = 'tftm-authored-sherman-boxmodel-v1-15-20260705';
const expectedGlbToken = 'v1-15-cast-turret-readable-wheels';
const verdictPath = 'docs/visual-verdicts/boxmodel-v1-15-red.json';

const failures = [];
function fail(message) { failures.push(message); }
if (!existsSync('generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json')) fail('missing generated cloud visual truth manifest; run npm run cloud-visual-release');
if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/boxmodel-tank.html')) fail('cloud release missing dist/boxmodel-tank.html');
if (!existsSync(verdictPath)) fail('missing boxmodel visual verdict ' + verdictPath + '; no-op churn cannot be gated by source tokens alone');
if (failures.length === 0) {
  const manifest = JSON.parse(readFileSync('generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json', 'utf8'));
  const verdict = JSON.parse(readFileSync(verdictPath, 'utf8'));
  const releaseVerdict = manifest.authored_boxmodel_review?.visual_verdict;
  const rules = JSON.stringify(manifest);
  const captures = (manifest.required_cloud_captures || []).join('\\n');

  if (verdict.artifact_type !== 'boxmodel_visual_verdict') fail('boxmodel visual verdict must identify artifact_type boxmodel_visual_verdict');
  if (verdict.build_token !== expectedBuild) fail('boxmodel visual verdict build token mismatch: ' + verdict.build_token);
  if (verdict.glb_token !== expectedGlbToken) fail('boxmodel visual verdict GLB token mismatch: ' + verdict.glb_token);
  if (verdict.status !== 'red_unaccepted_no_op_churn' && verdict.status !== 'accepted_cloud_sense') fail('boxmodel visual verdict must be explicit red or accepted, saw ' + verdict.status);
  for (const field of ['expected_visible_relationship','actual_visible_relationship','visibly_changed','did_not_change','diagnostics_assessment','acceptance_blocker']) {
    if (verdict[field] == null || (Array.isArray(verdict[field]) && verdict[field].length === 0 && field !== 'visibly_changed')) fail('boxmodel visual verdict missing required field ' + field);
  }
  if (!releaseVerdict) fail('cloud manifest must embed authored_boxmodel_review.visual_verdict');
  else {
    if (releaseVerdict.build_token !== verdict.build_token) fail('cloud manifest visual verdict build token does not match source verdict');
    if (releaseVerdict.glb_token !== verdict.glb_token) fail('cloud manifest visual verdict GLB token does not match source verdict');
    if (releaseVerdict.status !== verdict.status) fail('cloud manifest visual verdict status does not match source verdict');
  }
  if (verdict.status === 'red_unaccepted_no_op_churn' && !String(verdict.actual_visible_relationship || '').includes('no-op churn')) fail('red verdict must explicitly name no-op churn');
  if (!rules.includes('authored_sherman_boxmodel_v1')) fail('cloud manifest must name authored_sherman_boxmodel_v1');
  if (!rules.includes(expectedBuild)) fail('cloud manifest must require the boxmodel build token');
  if (!rules.includes('tftm-authored-sherman-boxmodel-tuner-v9-20260704')) fail('cloud manifest must require the boxmodel tuner build token');
  if (!rules.includes('boxmodel-tank.html?tune=1')) fail('cloud manifest must require hosted tuner route review');
  if (!rules.includes('Blender box-model')) fail('cloud manifest must identify Blender box-model source');
  if (!captures.includes('boxmodel-tank phone portrait')) fail('cloud captures must require boxmodel-tank phone portrait');
  if (!captures.includes('non-cube turret')) fail('cloud captures must require non-cube turret review');
  if (!rules.includes('narrow integrated track-well slot') && !rules.includes('smaller integrated slot walls')) fail('cloud manifest must require narrow integrated slot-wall review');
  if (!rules.includes('targeted no-wing slot-wall, no-pasted-turret-panel, and readable wheel/hub/bogie checks')) fail('cloud manifest must require targeted no-wing slot-wall, no-pasted-turret-panel, and readable wheel/hub/bogie review');
  if (!rules.includes('front-left, front-right, rear-left, and rear-right')) fail('cloud manifest must require all four hull/track corner review');
  if (!rules.includes('crack rays from outside those visible gaps hit exterior armor before entering the tank interior') && !rules.includes('no raycast-accessible interior through those cracks')) fail('cloud manifest must require raycast no-interior-access review for the visible hull/track cracks');
  if (!rules.includes('no pasted panels, blockers, floating boxes, or runtime overlays')) fail('cloud manifest must reject pasted panels/blockers/floating boxes/runtime overlays as the coverage fix');
  if (!captures.includes('box UV')) fail('cloud captures must require box UV review');
  if (!captures.includes('gesture-only part tuner')) fail('cloud captures must require gesture-only tuner review');
  if (!rules.includes('joined metal')) fail('cloud manifest must require joined metal armor, not rejected plug geometry');
  if (rules.includes('compound rectangular-lower/triangular-upper') || rules.includes('visibly expanded watertight sponson/skirt shell')) fail('cloud manifest must not require rejected compound plug geometry or v1-12 expanded shell wording');
  if (!captures.includes('front-left, front-right, rear-left, and rear-right')) fail('cloud captures must require four named hull/track corner review');
  if (!captures.includes('camera orientation widget')) fail('cloud captures must require camera orientation widget review');
  if (!captures.includes('no object transform handles')) fail('cloud captures must reject object transform handles');
  if (!rules.includes('local capture forbidden')) fail('cloud manifest must preserve local capture forbidden rule');
  if (!rules.includes('Sense Simulation')) fail('cloud manifest must require Sense Simulation');
}
if (failures.length) {
  console.error('Boxmodel tank cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Boxmodel tank cloud review gate passed: hosted-current gate includes explicit visual verdict; v1-15 remains red/unaccepted until cloud/Sense accepts it.');

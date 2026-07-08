import { existsSync, readFileSync } from 'node:fs';

const expectedBuild = 'tftm-meshy-direct-lowpoly-pbr-envelope-editor-v1-20260708';
const lowpolyManifestPath = 'public/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_manifest.json';
const releaseManifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const bundlePath = 'generated/cloud-visual-truth/tftm-release/dist/assets/assembled-tank.js';
const files = [
  lowpolyManifestPath,
  releaseManifestPath,
  'generated/cloud-visual-truth/tftm-release/dist/assembled-tank.html',
  'generated/cloud-visual-truth/tftm-release/dist/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_manifest.json',
  'generated/cloud-visual-truth/tftm-release/dist/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_hull_envelope.glb',
  'generated/cloud-visual-truth/tftm-release/dist/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_turret_envelope.glb',
  'generated/cloud-visual-truth/tftm-release/dist/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_treads_envelope.glb',
  bundlePath
];
const requiredParts = ['lowpoly_hull_envelope', 'lowpoly_turret_envelope', 'lowpoly_treads_envelope'];
const failures = [];
function fail(message) { failures.push(message); }
for (const file of files) if (!existsSync(file)) fail('missing ' + file);
if (failures.length === 0) {
  const lowpoly = JSON.parse(readFileSync(lowpolyManifestPath, 'utf8'));
  const release = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  const distLowpoly = JSON.parse(readFileSync('generated/cloud-visual-truth/tftm-release/dist/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_manifest.json', 'utf8'));
  const bundle = readFileSync(bundlePath, 'utf8');
  if (lowpoly.asset_id !== 'meshy_sherman_lowpoly_envelope_v1') fail('lowpoly asset id mismatch');
  if (distLowpoly.revision !== lowpoly.revision) fail('dist lowpoly manifest revision mismatch');
  for (const phrase of ['Direct Meshy lowpoly image-to-3D', 'No high-to-low pipeline', 'no local decimation']) if (!String(lowpoly.source_policy || '').includes(phrase)) fail('lowpoly source policy missing ' + phrase);
  for (const id of requiredParts) {
    const part = lowpoly.parts?.[id];
    if (!part) fail('missing lowpoly manifest part ' + id);
    else {
      if (part.requested?.model_type !== 'lowpoly') fail(id + ' must be direct model_type lowpoly');
      if (part.requested?.enable_pbr !== true || part.requested?.hd_texture !== true) fail(id + ' must request PBR and HD texture');
      if (part.unique_positions > part.budget.max_unique_positions) fail(id + ' unique positions exceed budget');
      if (part.triangles > part.budget.max_triangles) fail(id + ' triangles exceed budget');
    }
  }
  const review = release.lowpoly_assembled_review;
  if (!review) fail('cloud manifest must include lowpoly_assembled_review');
  else {
    if (review.route !== 'assembled-tank.html') fail('assembled review route mismatch');
    if (review.tuner_route !== 'assembled-tank.html?tune=envelopes') fail('assembled tuner route mismatch');
    if (review.expected_build !== expectedBuild) fail('assembled review build token mismatch');
    if (review.asset_id !== 'meshy_sherman_lowpoly_envelope_v1') fail('assembled review asset id mismatch');
    const policy = String(review.asset_policy || '');
    for (const phrase of ['model_type=lowpoly', 'No high-to-low pipeline', 'no local decimation', 'no material stripping']) if (!policy.includes(phrase)) fail('assembled asset policy must mention ' + phrase);
    const acceptance = String(review.acceptance || '');
    for (const phrase of [expectedBuild, 'lowpoly_hull_envelope', 'lowpoly_turret_envelope', 'lowpoly_treads_envelope', 'source Meshy UVs/materials/PBR textures are preserved', 'no high-to-low decimation', 'no stripped solid-fill plastic materials', 'local capture']) if (!acceptance.includes(phrase)) fail('assembled acceptance must mention ' + phrase);
  }
  for (const token of ['MESHY_SHERMAN_LOWPOLY_ENVELOPE_MANIFEST_URL', expectedBuild, 'lowpoly_hull_envelope', 'lowpoly_turret_envelope', 'lowpoly_treads_envelope', 'model_type=lowpoly']) if (!bundle.includes(token)) fail('assembled bundle missing ' + token);
  const captures = (release.required_cloud_captures || []).join('\\n');
  for (const phrase of ['assembled-tank', expectedBuild, 'model_type=lowpoly', 'no local decimation']) if (!captures.includes(phrase)) fail('required cloud captures must include ' + phrase);
  const questions = (release.sense_simulation_questions || []).join('\\n');
  for (const phrase of ['assembled-tank.html', expectedBuild, 'model_type=lowpoly', 'no high-to-low decimation', 'source Meshy UVs/materials/PBR textures preserved']) if (!questions.includes(phrase)) fail('Sense questions must include ' + phrase);
}
if (failures.length) {
  console.error('Assembled tank cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Assembled tank cloud review gate passed: packet declares direct Meshy model_type=lowpoly PBR envelope package; cloud/Sense acceptance is still required.');

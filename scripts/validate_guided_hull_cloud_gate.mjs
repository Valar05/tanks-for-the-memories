import { existsSync, readFileSync } from 'node:fs';

const expectedBuild = 'tftm-authored-sherman-guided-hull-v1-20260708';
const assetManifestPath = 'public/tftm/models/authored_sherman_guided_hull_v1/model_manifest.json';
const releaseManifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const bundlePath = 'generated/cloud-visual-truth/tftm-release/dist/assets/guided-hull.js';
const files = [assetManifestPath, releaseManifestPath, 'generated/cloud-visual-truth/tftm-release/dist/guided-hull.html', bundlePath, 'generated/cloud-visual-truth/tftm-release/dist/tftm/models/authored_sherman_guided_hull_v1/model_manifest.json', 'generated/cloud-visual-truth/tftm-release/dist/tftm/models/authored_sherman_guided_hull_v1/authored_sherman_guided_hull_v1.glb'];
const failures = [];
function fail(message) { failures.push(message); }
for (const file of files) if (!existsSync(file)) fail('missing ' + file);
if (failures.length === 0) {
  const asset = JSON.parse(readFileSync(assetManifestPath, 'utf8'));
  const release = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  const bundle = readFileSync(bundlePath, 'utf8');
  if (asset.asset_id !== 'authored_sherman_guided_hull_v1') fail('asset id mismatch');
  if (!String(asset.source_policy || '').includes('No Meshy topology')) fail('asset source policy must reject Meshy topology');
  if (asset.source_face_policy?.max_source_face_vertices > 4) fail('source face policy must allow only tris/quads');
  const review = release.guided_hull_review;
  if (!review) fail('release manifest missing guided_hull_review');
  else {
    if (review.route !== 'guided-hull.html') fail('guided review route mismatch');
    if (review.expected_build !== expectedBuild) fail('guided review build mismatch');
    const text = [review.asset_policy || '', review.acceptance || ''].join('\n');
    for (const phrase of ['simple authored armor planes', 'transparent Meshy hull reference', 'No Meshy topology', 'shrinkwrap', 'decimation', 'fixed authored_sherman_treads_v1']) if (!text.includes(phrase)) fail('guided review must mention ' + phrase);
  }
  for (const token of [expectedBuild, 'AUTHORED_SHERMAN_GUIDED_HULL_GLB_URL', 'MESHY_SHERMAN_LOWPOLY_HULL_ENVELOPE_GLB_URL', 'fixed_authored_sherman_treads_reference', 'transparent_meshy_hull_reference_group']) if (!bundle.includes(token)) fail('guided bundle missing ' + token);
  const captures = (release.required_cloud_captures || []).join('\n');
  for (const phrase of ['guided-hull', expectedBuild, 'no shrinkwrap', 'no decimation']) if (!captures.includes(phrase)) fail('required cloud captures missing ' + phrase);
  const questions = (release.sense_simulation_questions || []).join('\n');
  for (const phrase of ['guided-hull.html', 'transparent Meshy hull ghost', 'no giant front/rear ngon', 'no arbitrary mesh wrapping']) if (!questions.includes(phrase)) fail('Sense questions missing ' + phrase);
}
if (failures.length) {
  console.error('Guided hull cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Guided hull cloud review gate passed: packet declares hull-only guided hard-surface reconstruction; cloud/Sense visual acceptance is still required.');

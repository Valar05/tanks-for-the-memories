import { existsSync, readFileSync } from 'node:fs';

const expectedBuild = 'tftm-authored-sherman-chassis-v1-1-20260705';
const expectedRevision = 'v1-1-watertight-chassis-shell';
const assetManifestPath = 'public/tftm/models/authored_sherman_chassis_v1/model_manifest.json';
const treadManifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const releaseManifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const failures = [];
function fail(message) { failures.push(message); }
for (const file of [assetManifestPath, treadManifestPath, releaseManifestPath, 'generated/cloud-visual-truth/tftm-release/dist/chassisfirst-chassis.html']) if (!existsSync(file)) fail('missing ' + file);
if (failures.length === 0) {
  const asset = JSON.parse(readFileSync(assetManifestPath, 'utf8'));
  const tread = JSON.parse(readFileSync(treadManifestPath, 'utf8'));
  const release = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  if (asset.asset_id !== 'authored_sherman_chassis_v1') fail('chassis asset id mismatch');
  if (asset.silhouette_revision !== expectedRevision) fail('chassis revision mismatch');
  if (tread.silhouette_revision !== 'v1-8c-linked-mirror-tread-assembly') fail('golden tread revision mismatch');
  const review = release.authored_chassis_review;
  if (!review) fail('cloud manifest must include authored_chassis_review');
  else {
    if (review.route !== 'chassisfirst-chassis.html') fail('chassis review route mismatch');
    if (review.expected_build !== expectedBuild) fail('chassis review build token mismatch');
    if (review.asset_id !== 'authored_sherman_chassis_v1') fail('chassis review asset id mismatch');
    if (review.silhouette_revision !== expectedRevision) fail('chassis review revision mismatch');
    if (review.golden_tread_revision !== 'v1-8c-linked-mirror-tread-assembly') fail('chassis review must pin golden tread revision');
    const acceptance = String(review.acceptance || '');
    for (const phrase of ['one watertight chassis mesh', 'frozen authored_sherman_treads_v1 v1-8c', 'no visible tread-interface gaps', 'no turret, barrel, coaxial MG, wheels, or tread edits', 'local capture was not used']) if (!acceptance.includes(phrase)) fail('chassis acceptance must mention ' + phrase);
  }
  const captures = (release.required_cloud_captures || []).join('\n');
  if (!captures.includes('chassisfirst-chassis')) fail('required cloud captures must include chassisfirst-chassis');
  if (!captures.includes(expectedBuild)) fail('required cloud captures must include chassis build token');
  if (!captures.includes('v1-8c-linked-mirror-tread-assembly')) fail('required captures must name frozen tread token');
  const questions = (release.sense_simulation_questions || []).join('\n');
  if (!questions.includes('authored_sherman_chassis_v1')) fail('Sense questions must mention authored_sherman_chassis_v1');
  if (!questions.includes('one watertight chassis mesh')) fail('Sense questions must ask about one watertight chassis mesh');
}
if (failures.length) {
  console.error('Chassis-first cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Chassis-first cloud review gate passed: hosted packet declares v1.1 watertight chassis review lane with frozen v1.8c treads; cloud/Sense acceptance is still required.');

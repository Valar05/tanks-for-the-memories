import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const assetManifestPath = 'public/tftm/models/authored_sherman_textureable_v1/model_manifest.json';
const expectedBuild = 'tftm-authored-sherman-textureable-v1-1-20260705';
const expectedRevision = 'v1-1-contained-running-gear-textureable';
const failures = [];
function fail(message) { failures.push(message); }

if (!existsSync(manifestPath)) fail('missing cloud release manifest ' + manifestPath);
if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/textureable-tank.html')) fail('cloud release missing dist/textureable-tank.html');
if (!existsSync(assetManifestPath)) fail('missing textureable asset manifest ' + assetManifestPath);

if (failures.length === 0) {
  const release = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const asset = JSON.parse(readFileSync(assetManifestPath, 'utf8'));
  const review = release.authored_textureable_review;
  if (!review) fail('cloud manifest must include authored_textureable_review');
  else {
    if (review.route !== 'textureable-tank.html') fail('textureable review route mismatch');
    if (review.expected_build !== expectedBuild) fail('textureable review build token mismatch');
    if (review.asset_id !== 'authored_sherman_textureable_v1') fail('textureable review asset id mismatch');
    if (review.silhouette_revision !== expectedRevision) fail('textureable review revision mismatch');
    const acceptance = String(review.acceptance || '');
    for (const phrase of ['closed 3D track pods', 'wheels contained inside', 'turret ring gap hidden', 'integrated hatches', 'coaxial MG', 'split UV plates', 'local capture was not used']) {
      if (!acceptance.includes(phrase)) fail('textureable acceptance must mention ' + phrase);
    }
  }
  if (asset.silhouette_revision !== expectedRevision) fail('asset manifest revision mismatch');
  const captures = (release.required_cloud_captures || []).join('\n');
  if (!captures.includes('textureable-tank')) fail('required cloud captures must include textureable-tank');
  if (!captures.includes(expectedBuild)) fail('required cloud captures must include textureable build token');
  const questions = (release.sense_simulation_questions || []).join('\n');
  if (!questions.includes('authored_sherman_textureable_v1')) fail('Sense questions must mention authored_sherman_textureable_v1');
  if (!questions.includes('contained inside closed track pods')) fail('Sense questions must ask about wheel containment in track pods');
}

if (failures.length) {
  console.error('Textureable tank cloud gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Textureable tank cloud review gate passed: hosted packet declares the new textureable review lane; cloud/Sense acceptance is still required.');

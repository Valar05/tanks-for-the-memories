import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const assetManifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const expectedBuild = 'tftm-authored-sherman-treads-v1-3-20260705';
const expectedRevision = 'v1-3-wheels-in-profile-opening';
const failures = [];
function fail(message) { failures.push(message); }

if (!existsSync(manifestPath)) fail('missing cloud release manifest ' + manifestPath);
if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/treadfirst-treads.html')) fail('cloud release missing dist/treadfirst-treads.html');
if (!existsSync(assetManifestPath)) fail('missing tread-only asset manifest ' + assetManifestPath);

if (failures.length === 0) {
  const release = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const asset = JSON.parse(readFileSync(assetManifestPath, 'utf8'));
  const review = release.authored_treads_review;
  if (!review) fail('cloud manifest must include authored_treads_review');
  else {
    if (review.route !== 'treadfirst-treads.html') fail('tread review route mismatch');
    if (review.expected_build !== expectedBuild) fail('tread review build token mismatch');
    if (review.asset_id !== 'authored_sherman_treads_v1') fail('tread review asset id mismatch');
    if (review.silhouette_revision !== expectedRevision) fail('tread review revision mismatch');
    const acceptance = String(review.acceptance || '');
    for (const phrase of ['full tread assembly only', 'open perimeter sidewall frame', 'wheels inside the inner profile opening', 'sprockets, idlers, return rollers, bogie connectors', 'profile opening', 'preserve OrbitControls camera and orientation widget', 'no hull, turret, barrel, coaxial MG, or full tank scene', 'local capture was not used']) {
      if (!acceptance.includes(phrase)) fail('tread acceptance must mention ' + phrase);
    }
  }
  if (asset.silhouette_revision !== expectedRevision) fail('asset manifest revision mismatch');
  const captures = (release.required_cloud_captures || []).join('\n');
  if (!captures.includes('treadfirst-treads')) fail('required cloud captures must include treadfirst-treads');
  if (!captures.includes(expectedBuild)) fail('required cloud captures must include tread build token');
  const questions = (release.sense_simulation_questions || []).join('\n');
  if (!questions.includes('authored_sherman_treads_v1')) fail('Sense questions must mention authored_sherman_treads_v1');
  if (!questions.includes('no hull, turret, barrel, coaxial MG')) fail('Sense questions must forbid full tank geometry');
  if (!questions.includes('preserve the established OrbitControls')) fail('Sense questions must ask about preserved camera controls');
}

if (failures.length) {
  console.error('Tread-first cloud gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Tread-first cloud review gate passed: hosted packet declares v1.3 wheels-in-profile-opening review lane with preserved camera controls; cloud/Sense acceptance is still required.');

import { existsSync, readFileSync } from 'node:fs';

const root = 'generated/blender-visibility/authored_sherman_treads_v1';
const manifestPath = root + '/manifest.json';
const modelManifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const failures = [];
function fail(message) { failures.push(message); }
function pngSize(path) {
  const data = readFileSync(path);
  if (data.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

if (!existsSync(manifestPath)) fail('missing Blender tread visibility manifest; run npm run blender-visibility:treads');
if (!existsSync(modelManifestPath)) fail('missing authored tread model manifest ' + modelManifestPath);
let manifest = null;
if (failures.length === 0) manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest) {
  const modelManifest = JSON.parse(readFileSync(modelManifestPath, 'utf8'));
  if (manifest.model_revision !== modelManifest.silhouette_revision) fail('stale Blender tread visibility diagnostic: render revision ' + manifest.model_revision + ' does not match current model revision ' + modelManifest.silhouette_revision);
  if (manifest.type !== 'offline_blender_visibility_evidence') fail('manifest must identify offline Blender visibility evidence');
  if (manifest.user_authorized_local_offline_visual_evidence !== true) fail('manifest must mark user-authorized offline visual evidence for this pass');
  if (!String(manifest.acceptance_note || '').includes('User explicitly allowed offline/local screenshots')) fail('manifest must record the local/offline visual override');
  if (!String(manifest.source_blend || '').endsWith('authored_sherman_treads_v1.blend')) fail('manifest must name tread source blend');
  if (!manifest.source_blend_sha256 || manifest.source_blend_sha256.length !== 64) fail('manifest must record source blend sha256');
  const requiredViews = ['left_side','right_side','left_front_three_quarter','right_front_three_quarter','left_wheel_bay_close','right_wheel_bay_close'];
  const requiredPasses = ['material','clay','problem'];
  const views = new Set((manifest.views || []).map((view) => view.id));
  const passes = new Set((manifest.passes || []).map((pass) => pass.id));
  for (const view of requiredViews) if (!views.has(view)) fail('missing required Blender tread visibility view ' + view);
  for (const pass of requiredPasses) if (!passes.has(pass)) fail('missing required Blender tread visibility pass ' + pass);
  const imageKeys = new Set((manifest.images || []).map((image) => image.view + ':' + image.pass));
  for (const view of requiredViews) for (const pass of requiredPasses) if (!imageKeys.has(view + ':' + pass)) fail('missing render image entry ' + view + ':' + pass);
  for (const image of manifest.images || []) {
    const path = root + '/' + image.path;
    if (!existsSync(path)) { fail('missing render file ' + path); continue; }
    const size = pngSize(path);
    if (!size || size.width < 760 || size.height < 540) fail('render file must be PNG near expected size: ' + path);
  }
  const contact = root + '/' + manifest.contact_sheet;
  if (!existsSync(contact)) fail('missing contact sheet ' + contact);
  else {
    const size = pngSize(contact);
    if (!size || size.width < 1100 || size.height < 2000) fail('contact sheet dimensions are too small');
  }
}

if (failures.length) {
  console.error('Blender tread visibility validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Blender tread visibility validation passed: offline renders match current tread revision and are available for agent visual inspection.');

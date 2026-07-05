import { existsSync, readFileSync } from 'node:fs';

const root = 'generated/blender-visibility/authored_sherman_armored_v1';
const manifestPath = root + '/manifest.json';
const failures = [];
function fail(message) { failures.push(message); }
function pngSize(path) {
  const data = readFileSync(path);
  if (data.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

if (!existsSync(manifestPath)) fail('missing Blender visibility manifest; run npm run blender-visibility:armored');
let manifest = null;
if (failures.length === 0) manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest) {
  if (manifest.type !== 'offline_blender_visibility_diagnostic') fail('manifest must identify offline Blender visibility diagnostic');
  if (manifest.diagnostic_only !== true) fail('manifest must mark renders diagnostic_only');
  if (!String(manifest.acceptance_note || '').includes('not browser/cloud acceptance proof')) fail('manifest must reject acceptance-proof use');
  if (!String(manifest.source_blend || '').endsWith('authored_sherman_armored_v1.blend')) fail('manifest must name source blend');
  if (!manifest.source_blend_sha256 || manifest.source_blend_sha256.length !== 64) fail('manifest must record source blend sha256');
  const requiredViews = ['front','left_side','right_side','front_left_three_quarter','front_right_three_quarter','front_left_gap_close','front_right_gap_close','rear','rear_left_three_quarter','rear_right_three_quarter','rear_left_gap_close','rear_right_gap_close'];
  const requiredPasses = ['material','clay','problem'];
  const views = new Set((manifest.views || []).map((view) => view.id));
  const passes = new Set((manifest.passes || []).map((pass) => pass.id));
  for (const view of requiredViews) if (!views.has(view)) fail('missing required Blender visibility view ' + view);
  for (const pass of requiredPasses) if (!passes.has(pass)) fail('missing required Blender visibility pass ' + pass);
  const imageKeys = new Set((manifest.images || []).map((image) => image.view + ':' + image.pass));
  for (const view of requiredViews) {
    for (const pass of requiredPasses) {
      const key = view + ':' + pass;
      if (!imageKeys.has(key)) fail('missing render image entry ' + key);
    }
  }
  for (const image of manifest.images || []) {
    const path = root + '/' + image.path;
    if (!existsSync(path)) {
      fail('missing render file ' + path);
      continue;
    }
    const size = pngSize(path);
    if (!size || size.width < 700 || size.height < 500) fail('render file must be PNG near expected size: ' + path);
  }
  const contact = root + '/' + manifest.contact_sheet;
  if (!existsSync(contact)) fail('missing contact sheet ' + contact);
  else {
    const size = pngSize(contact);
    if (!size || size.width < 1000 || size.height < 3600) fail('contact sheet dimensions are too small');
  }
}

if (failures.length) {
  console.error('Blender visibility diagnostic validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Blender visibility diagnostic validation passed: offline renders, contact sheet, and manifest are present.');

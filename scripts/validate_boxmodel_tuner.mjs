import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function fail(message) { failures.push(message); }
function read(path) {
  if (!existsSync(path)) {
    fail('missing ' + path);
    return '';
  }
  return readFileSync(path, 'utf8');
}

const source = read('src/boxmodel-tank.ts');
const css = read('src/single-tank.css');
const releaseScript = read('scripts/build_cloud_visual_release.mjs');

const requiredPartIds = [
  'front-right-track-hole-plug',
  'front-left-track-hole-plug',
  'rear-right-track-hole-plug',
  'rear-left-track-hole-plug'
];

if (!source.includes("query.get('tune') === '1'")) fail('boxmodel scene must expose ?tune=1 mode');
if (!source.includes('tftm-authored-sherman-boxmodel-tuner-v3-20260704')) fail('tuner build token missing');
if (!source.includes("type TuneMode = 'move' | 'rotate' | 'scale'")) fail('tuner must have move/rotate/scale modes');
if (!source.includes("type TuneAxis = 'x' | 'y' | 'z' | 'uniform'")) fail('tuner must have gesture axis locks');
if (!source.includes('serializeTuneParts')) fail('tuner must serialize editable part transforms');
if (!source.includes('localStorage.setItem')) fail('tuner export must persist browser-side JSON');
if (!source.includes('window.history.replaceState')) fail('tuner export must create recoverable URL/hash state');
if (!source.includes('pointermove')) fail('tuner must use pointer gesture movement');
if (!source.includes('raycaster.intersectObjects')) fail('tuner must select parts by touch/raycast');
if (!source.includes('mesh.visible = part.visible')) fail('placed plugs must remain visible while one plug is selected for editing');
if (!source.includes('0x8c8b63')) fail('plug material must default to hull-compatible armor color');
if (!source.includes('scale: [0.34, 0.62, 0.92]')) fail('plug defaults must be narrow across hull and long parallel to tracks');
if (!source.includes('rotationDeg: [0, 0, 0]')) fail('plug defaults must not start wide-rotated or angled across tracks');
if (!source.includes('aria-pressed')) fail('parts list must expose one active selected row');
for (const id of requiredPartIds) {
  if (!source.includes(id)) fail('missing seeded tune part ' + id);
}
const forbiddenGizmoTerms = ['TransformControls', 'gizmo', 'axis-handle', 'drag-ring', 'rotation-ring'];
for (const term of forbiddenGizmoTerms) {
  if (source.toLowerCase().includes(term.toLowerCase())) fail('gesture-only tuner must not include 3D gizmo term: ' + term);
}
if (!css.includes('.tune-parts-panel')) fail('tuner CSS must include parts panel');
if (!css.includes('.tune-dock')) fail('tuner CSS must include transform dock');
if (!releaseScript.includes('boxmodel-tank.html?tune=1')) fail('cloud release must require tuner route review');
if (!releaseScript.includes('gesture-only boxmodel part tuner')) fail('cloud release must describe gesture-only tuner acceptance');
if (!releaseScript.includes('local capture forbidden')) fail('cloud release must preserve local capture forbidden rule');

if (failures.length) {
  console.error('Boxmodel tuner guardrail failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Boxmodel tuner guardrail passed: gesture-only part tuner is wired for cloud review.');

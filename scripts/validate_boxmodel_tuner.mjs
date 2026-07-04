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
  'front-right-track-panel',
  'front-left-track-panel',
  'rear-right-track-panel',
  'rear-left-track-panel'
];

if (!source.includes("query.get('tune') === '1'")) fail('boxmodel scene must expose ?tune=1 mode');
if (!source.includes('tftm-authored-sherman-boxmodel-tuner-v9-20260704')) fail('tuner build token missing');
if (!source.includes("type TuneMode = 'move' | 'rotate' | 'scale'")) fail('tuner must have move/rotate/scale modes');
if (!source.includes("type TuneAxis = 'all' | 'screen' | 'x' | 'y' | 'z'")) fail('tuner must have gesture axis locks');
if (!source.includes('serializeTuneParts')) fail('tuner must serialize editable part transforms');
if (!source.includes('localStorage.setItem')) fail('tuner export must persist browser-side JSON');
if (!source.includes('window.history.replaceState')) fail('tuner export must create recoverable URL/hash state');
if (!source.includes('OrbitControls')) fail('tuner camera must use Pose Lab-style OrbitControls');
if (!source.includes('controls.touches.ONE = THREE.TOUCH.ROTATE')) fail('one-finger camera orbit must use OrbitControls touch mapping');
if (!source.includes('controls.touches.TWO = THREE.TOUCH.DOLLY_PAN')) fail('two-finger camera dolly/pan must use OrbitControls touch mapping');
if (!source.includes('pointermove')) fail('tuner must use pointer gesture movement');
if (!source.includes('raycaster.intersectObjects')) fail('tuner must select parts by touch/raycast');
if (!source.includes('mesh.visible = part.visible')) fail('placed panels must remain visible while one panel is selected for editing');
if (!source.includes('0x56623f')) fail('panel material must default to hull-compatible armor green');
if (source.includes('0x8c8b63')) fail('flat armor panels must not keep the rejected tan/debug plug color');
if (!source.includes('scale: [0.08, 1.12, 1.22]')) fail('panel defaults must be very thin across hull, tall enough to cover the void, and long parallel to tracks');
if (!source.includes("kind: 'trackGapPanel'")) fail('track holes must use flat side armor panels, not rejected compound plug primitives');
if (!source.includes('createTrackGapPanelGeometry')) fail('tuner must build a named flat track-gap armor panel primitive');
if (source.includes('trackGapCompound') || source.includes('createTrackGapCompoundGeometry')) fail('rejected compound plug primitive must be removed');
if (source.includes('yShoulder') || source.includes('yPeak') || source.includes('zPeak')) fail('flat panel replacement must not keep triangular compound-plug geometry');
if (!source.includes('rotationDeg: [0, 0, 0]')) fail('panel defaults must not start wide-rotated or angled across tracks');
if (source.includes('model.rotation.y = -Math.PI / 2 - 0.18')) fail('tank model must not keep the old extra presentation yaw');
if (!source.includes('model.rotation.y = -Math.PI / 2;')) fail('tank model must use only the required axis correction yaw');
if (!source.includes('camera.position.set(0, 3.5, -6.2)')) fail('initial tuner camera must start square to the model frame');
if (!source.includes('aria-pressed')) fail('parts list must expose one active selected row');
if (!source.includes('is-collapsed')) fail('parts list must collapse by default');
if (source.includes('data-field=')) fail('primary transform UI must not use numeric transform fields');
if (css.includes('.tune-grid')) fail('primary tuner CSS must not include the old text-field transform grid');
if (!source.includes('data-axis="all"') || !source.includes('data-axis="x"') || !source.includes('data-axis="y"') || !source.includes('data-axis="z"')) fail('scale mode must expose explicit All/X/Y/Z axis buttons');
if (source.includes('data-axis-cycle')) fail('axis selection must not be hidden behind the old ambiguous cycle button');
if (!source.includes('cycleMode()')) fail('tapping selected object must cycle one transform mode at a time');
if (!source.includes("currentAxis = currentMode === 'scale' ? 'all' : 'screen'")) fail('mode changes must default Scale to All and Move/Rotate to Screen');
if (!source.includes("currentAxis === 'all' || currentAxis === 'screen'")) fail('scale mode must support explicit All/uniform scale plus X/Y/Z scale');
if (!source.includes('data-camera-view')) fail('camera orientation widget must expose snap-view buttons');
for (const id of requiredPartIds) {
  if (!source.includes(id)) fail('missing seeded tune panel ' + id);
}
const forbiddenGizmoTerms = ['TransformControls', 'axis-handle', 'drag-ring', 'rotation-ring'];
for (const term of forbiddenGizmoTerms) {
  if (source.toLowerCase().includes(term.toLowerCase())) fail('gesture-only tuner must not include 3D gizmo term: ' + term);
}
if (!css.includes('.tune-parts-panel')) fail('tuner CSS must include parts panel');
if (!css.includes('.orientation-widget')) fail('tuner CSS must include Godot-style camera orientation widget');
if (!css.includes('.tune-dock')) fail('tuner CSS must include transform dock');
if (!releaseScript.includes('boxmodel-tank.html?tune=1')) fail('cloud release must require tuner route review');
if (!releaseScript.includes('gesture-only boxmodel part tuner')) fail('cloud release must describe gesture-only tuner acceptance');
if (!releaseScript.includes('flat armor panels')) fail('cloud release must describe flat armor panel acceptance');
if (releaseScript.includes('compound rectangular-lower/triangular-upper') || releaseScript.includes('enabled plugs')) fail('cloud release must not preserve rejected plug acceptance language');
if (!releaseScript.includes('local capture forbidden')) fail('cloud release must preserve local capture forbidden rule');

if (failures.length) {
  console.error('Boxmodel tuner guardrail failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Boxmodel tuner guardrail passed: gesture-only flat armor panel tuner is wired for cloud review.');

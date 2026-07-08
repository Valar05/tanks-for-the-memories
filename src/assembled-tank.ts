import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_TREADS_GLB_URL, MESHY_SHERMAN_LOWPOLY_ENVELOPE_MANIFEST_URL } from './sherman-asset-links';
import { applyAuthoredShermanSharedTextures } from './authored-sherman-shared-materials';

type AssemblyArea = 'hull' | 'treads' | 'turret';
type TuneMode = 'move' | 'rotate' | 'scale';
type TuneAxis = 'all' | 'screen' | 'x' | 'y' | 'z';
type ManifestPart = {
  id: string;
  label: string;
  area: AssemblyArea;
  runtime_role: string;
  runtime_url: string;
  source_image: string;
  source_glb: string;
  triangles: number;
  vertices: number;
  default_visible: boolean;
  default_transform: { position: [number, number, number]; rotationDeg: [number, number, number]; scale: [number, number, number] };
};
type EnvelopeManifest = {
  asset_id: string;
  revision: string;
  source_policy: string;
  runtime_contract: Record<string, string>;
  parts: Record<string, ManifestPart>;
};
type AssemblyPart = {
  id: string;
  label: string;
  area: AssemblyArea;
  runtimeRole: string;
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  triangles: number;
  vertices: number;
  sourceImage: string;
  sourceGlb: string;
  object?: THREE.Object3D;
};

const root = document.querySelector<HTMLDivElement>('#assembled-tank-root');
if (!root) throw new Error('missing #assembled-tank-root');

const envelopeManifestUrl = MESHY_SHERMAN_LOWPOLY_ENVELOPE_MANIFEST_URL;
const visualBuild = 'tftm-meshy-direct-lowpoly-pbr-envelope-editor-v1-20260708';
const LOWPOLY_HULL_ENVELOPE_ID = 'lowpoly_hull_envelope';
const LOWPOLY_TURRET_ENVELOPE_ID = 'lowpoly_turret_envelope';
const LOWPOLY_TREADS_ENVELOPE_ID = 'lowpoly_treads_envelope';
const lowpolyEnvelopeIdList = [LOWPOLY_HULL_ENVELOPE_ID, LOWPOLY_TURRET_ENVELOPE_ID, LOWPOLY_TREADS_ENVELOPE_ID].join(', ');
const query = new URLSearchParams(window.location.search);
const isTuneMode = query.get('tune') === '1' || query.get('tune') === 'components' || query.get('tune') === 'envelopes';
const rootShell = isTuneMode ? ' is-tuning' : '';

root.innerHTML = '<main class="single-tank-shell' + rootShell + '">' +
  '<div class="single-tank-stage"><canvas aria-label="Hybrid Meshy envelope tank assembly editor"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Hybrid Meshy envelope tank readout">' +
    '<p class="single-tank-kicker">direct lowpoly envelope assembly</p>' +
    '<p class="single-tank-title">Meshy lowpoly PBR envelopes + authored treads</p>' +
    '<p class="single-tank-status" data-status>loading direct lowpoly Meshy PBR envelopes</p>' +
  '</section>' +
  (isTuneMode ? '<section class="tune-parts-panel is-collapsed" aria-label="Assembly envelopes" data-parts-panel>' +
    '<button class="tune-parts-toggle" type="button" data-toggle-parts><span data-selected-label>No envelope</span><span data-parts-caret>Envelopes</span></button>' +
    '<div class="tune-row tune-mode-row" data-area-row><button type="button" data-area="hull">Hull</button><button type="button" data-area="treads">Treads</button><button type="button" data-area="turret">Turret</button></div>' +
    '<div class="tune-parts-list" data-parts-list></div>' +
  '</section>' +
  '<section class="tune-dock" aria-label="Gesture transform controls" data-tune-dock>' +
    '<div class="tune-active"><span data-mode-label>Move / Screen</span><button type="button" data-export-tune>Export</button></div>' +
    '<div class="tune-row tune-mode-row" data-mode-row><button type="button" data-mode="move">Move</button><button type="button" data-mode="rotate">Rotate</button><button type="button" data-mode="scale">Scale</button></div>' +
    '<div class="tune-row tune-axis-row" data-axis-row><button type="button" data-axis="all">All</button><button type="button" data-axis="x">X</button><button type="button" data-axis="y">Y</button><button type="button" data-axis="z">Z</button></div>' +
    '<div class="tune-row tune-action-row"><button type="button" data-undo>Undo</button><button type="button" data-redo>Redo</button><button type="button" data-reset-part>Reset</button><button type="button" data-toggle-visible>Hide</button></div>' +
    '<div class="tune-row tune-action-row"><button type="button" data-toggle-lock>Lock</button><button type="button" data-focus-part>Focus</button><button type="button" data-reset-all>Reset All</button><button type="button" data-show-defaults>Defaults</button></div>' +
  '</section>' : '') +
  '<section class="orientation-widget" aria-label="Camera orientation widget" data-orientation-widget>' +
    '<button type="button" data-camera-view="front">Front</button><button type="button" data-camera-view="left">Left</button><button type="button" data-camera-view="top">Top</button><button type="button" data-camera-view="right">Right</button><button type="button" data-camera-view="back">Back</button>' +
  '</section>' +
  (isTuneMode ? '<section class="tune-export" hidden aria-label="Assembly export"><textarea data-export-output readonly></textarea></section>' : '') +
'</main>';

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
const statusEl = root.querySelector<HTMLElement>('[data-status]')!;
const partsPanel = root.querySelector<HTMLElement>('[data-parts-panel]');
const partsToggle = root.querySelector<HTMLButtonElement>('[data-toggle-parts]');
const partsListEl = root.querySelector<HTMLDivElement>('[data-parts-list]');
const selectedLabelEl = root.querySelector<HTMLElement>('[data-selected-label]');
const modeLabelEl = root.querySelector<HTMLElement>('[data-mode-label]');
const exportPanel = root.querySelector<HTMLElement>('.tune-export');
const exportOutput = root.querySelector<HTMLTextAreaElement>('[data-export-output]');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151711);
scene.fog = new THREE.Fog(0x151711, 10, 26);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
camera.position.set(0.15, 2.45, -6.1);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.24, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 2.2;
controls.maxDistance = 11.0;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

scene.add(new THREE.HemisphereLight(0xf2ead6, 0x252a20, 1.65));
const key = new THREE.DirectionalLight(0xffefd1, 2.3);
key.position.set(3.8, 4.8, 3.0);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9bb4ff, 0.75);
rim.position.set(-3.5, 2.4, -4.0);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.5), new THREE.MeshStandardMaterial({ color: 0x302d22, roughness: 0.96, metalness: 0.0 }));
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.47;
scene.add(floor);

const reviewGroup = new THREE.Group();
reviewGroup.name = 'meshy_sherman_envelope_assembly_v1_editor_root';
scene.add(reviewGroup);
const authoredTreadsGroup = new THREE.Group();
authoredTreadsGroup.name = 'authored_treads_parade_truth_reference';
reviewGroup.add(authoredTreadsGroup);
const hullGroup = new THREE.Group();
hullGroup.name = 'hull_envelope_model_swap_group';
reviewGroup.add(hullGroup);
const turretTraversePivot = new THREE.Group();
turretTraversePivot.name = 'turret_envelope_traverse_pivot_manual_editor';
reviewGroup.add(turretTraversePivot);
const treadCandidateGroup = new THREE.Group();
treadCandidateGroup.name = 'optional_meshy_tread_envelope_reference';
reviewGroup.add(treadCandidateGroup);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tuneMeshes: THREE.Object3D[] = [];
const parts: AssemblyPart[] = [];
let manifest: EnvelopeManifest | null = null;
let selectedArea: AssemblyArea = 'turret';
let selectedPart: AssemblyPart | null = null;
let lockedSelection: AssemblyPart | null = null;
let selectionBox: THREE.BoxHelper | null = null;
let currentMode: TuneMode = 'move';
let currentAxis: TuneAxis = 'screen';
let partsOpen = false;
let initialSnapshot = '';
let loadedCount = 0;
let expectedLoads = 1;
let gestureState: { pointerId: number; part: AssemblyPart; lastX: number; lastY: number; moved: boolean; tapCanCycle: boolean } | null = null;
const pointerPositions = new Map<number, { x: number; y: number }>();
let lastPinchDistance = 0;
let lastTwistAngle = 0;
const undoStack: string[] = [];
const redoStack: string[] = [];

function parentFor(part: AssemblyPart) {
  if (part.area === 'hull') return hullGroup;
  if (part.area === 'treads') return treadCandidateGroup;
  return turretTraversePivot;
}
function makePart(part: ManifestPart): AssemblyPart {
  return {
    id: part.id,
    label: part.label,
    area: part.area,
    runtimeRole: part.runtime_role,
    position: [...part.default_transform.position],
    rotationDeg: [...part.default_transform.rotationDeg],
    scale: [...part.default_transform.scale],
    visible: part.default_visible,
    locked: false,
    triangles: part.triangles,
    vertices: part.vertices,
    sourceImage: part.source_image,
    sourceGlb: part.source_glb
  };
}
function applyPartTransform(part: AssemblyPart) {
  const object = part.object;
  if (!object) return;
  object.position.set(part.position[0], part.position[1], part.position[2]);
  object.rotation.set(THREE.MathUtils.degToRad(part.rotationDeg[0]), THREE.MathUtils.degToRad(part.rotationDeg[1]), THREE.MathUtils.degToRad(part.rotationDeg[2]));
  object.scale.set(part.scale[0], part.scale[1], part.scale[2]);
  object.visible = part.visible;
}
function tagTunePart(part: AssemblyPart) {
  // Preserve source Meshy materials/textures. Selection is shown with a helper box, not a material override.
  part.object?.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.tunePartId = part.id;
    if (Array.isArray(mesh.material)) for (const material of mesh.material) material.needsUpdate = true;
    else if (mesh.material) mesh.material.needsUpdate = true;
  });
  if (part.object) part.object.userData.tunePartId = part.id;
}
function onOneAssetLoaded() {
  loadedCount += 1;
  if (loadedCount !== expectedLoads) return;
  selectedPart = parts.find((part) => part.id === LOWPOLY_TURRET_ENVELOPE_ID) || parts[0] || null;
  initialSnapshot = serializeTuneParts();
  renderTuneUi();
  statusEl.textContent = 'loaded direct lowpoly PBR envelope editor: ' + lowpolyEnvelopeIdList + ' generated with model_type=lowpoly, preserved UVs/materials/PBR textures, and no local decimation';
  postVisualBeacon('loaded', { parts: parts.length, selected: selectedPart?.id || 'none', editor: isTuneMode ? 1 : 0, envelopes: lowpolyEnvelopeIdList });
}
async function boot() {
  manifest = await fetch(envelopeManifestUrl, { cache: 'no-store' }).then((response) => response.json() as Promise<EnvelopeManifest>);
  const loader = new GLTFLoader();
  const manifestParts = Object.values(manifest.parts).sort((a, b) => a.area.localeCompare(b.area) || a.id.localeCompare(b.id));
  expectedLoads = manifestParts.length + 1;
  loader.load(AUTHORED_SHERMAN_TREADS_GLB_URL, (gltf) => {
    gltf.scene.name = 'authored_sherman_treads_v1_parade_truth';
    applyAuthoredShermanSharedTextures(gltf.scene);
    gltf.scene.position.set(0, -0.04, 0);
    authoredTreadsGroup.add(gltf.scene);
    onOneAssetLoaded();
  }, undefined, (error) => failLoad('authored_treads', error));
  for (const partSpec of manifestParts) {
    const part = makePart(partSpec);
    parts.push(part);
    loader.load(partSpec.runtime_url + '?v=' + manifest.revision, (gltf) => {
      part.object = gltf.scene;
      part.object.name = 'assembly_envelope_' + part.id;
      tagTunePart(part);
      parentFor(part).add(part.object);
      tuneMeshes.push(part.object);
      applyPartTransform(part);
      onOneAssetLoaded();
    }, undefined, (error) => failLoad(part.id, error));
  }
}
function failLoad(asset: string, error: unknown) {
  statusEl.textContent = 'assembly envelope load failed: ' + asset;
  postVisualBeacon('load-failed', { asset, message: error instanceof Error ? error.message : String(error) });
}
function renderTuneUi() {
  if (partsListEl) {
    partsListEl.innerHTML = '';
    for (const part of parts.filter((candidate) => candidate.area === selectedArea)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.partId = part.id;
      button.className = 'tune-part-row' + (part === selectedPart ? ' is-selected' : '') + (!part.visible ? ' is-hidden' : '');
      button.setAttribute('aria-pressed', String(part === selectedPart));
      button.textContent = (part.locked ? '[L] ' : '') + part.label + ' / ' + part.triangles + 't';
      button.addEventListener('click', () => { selectPart(part, true); setPartsOpen(false); });
      partsListEl.appendChild(button);
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-area]').forEach((button) => button.classList.toggle('is-selected', button.dataset.area === selectedArea));
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('is-selected', button.dataset.mode === currentMode));
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => {
    const axis = button.dataset.axis as TuneAxis;
    button.classList.toggle('is-selected', axis === currentAxis);
    button.hidden = currentMode !== 'scale' && axis === 'all';
  });
  if (selectedLabelEl) selectedLabelEl.textContent = selectedPart ? selectedPart.label : 'No envelope';
  if (modeLabelEl) modeLabelEl.textContent = modeLabel();
  const visibleButton = root.querySelector<HTMLButtonElement>('[data-toggle-visible]');
  if (visibleButton) visibleButton.textContent = selectedPart?.visible ? 'Hide' : 'Show';
  const lockButton = root.querySelector<HTMLButtonElement>('[data-toggle-lock]');
  if (lockButton) lockButton.textContent = selectedPart?.locked ? 'Unlock' : 'Lock';
  partsPanel?.classList.toggle('is-collapsed', !partsOpen);
  updateSelectionEmphasis();
}
function bindUi() {
  partsToggle?.addEventListener('click', () => setPartsOpen(!partsOpen));
  root.querySelectorAll<HTMLButtonElement>('[data-area]').forEach((button) => button.addEventListener('click', () => {
    selectedArea = button.dataset.area as AssemblyArea;
    const next = parts.find((part) => part.area === selectedArea && part.visible) || parts.find((part) => part.area === selectedArea) || selectedPart;
    if (next) selectPart(next, true);
    renderTuneUi();
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => { currentMode = button.dataset.mode as TuneMode; currentAxis = currentMode === 'scale' ? 'all' : 'screen'; renderTuneUi(); }));
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => button.addEventListener('click', () => { currentAxis = button.dataset.axis as TuneAxis; renderTuneUi(); }));
  root.querySelector<HTMLButtonElement>('[data-toggle-visible]')?.addEventListener('click', () => { if (!selectedPart) return; pushUndo(); selectedPart.visible = !selectedPart.visible; applyPartTransform(selectedPart); renderTuneUi(); applyTuneToUrl(); });
  root.querySelector<HTMLButtonElement>('[data-toggle-lock]')?.addEventListener('click', () => { if (!selectedPart) return; selectedPart.locked = !selectedPart.locked; lockedSelection = selectedPart.locked ? selectedPart : null; renderTuneUi(); applyTuneToUrl(); });
  root.querySelector<HTMLButtonElement>('[data-reset-part]')?.addEventListener('click', resetSelectedPart);
  root.querySelector<HTMLButtonElement>('[data-reset-all]')?.addEventListener('click', () => { if (!initialSnapshot) return; pushUndo(); restoreTuneParts(initialSnapshot); });
  root.querySelector<HTMLButtonElement>('[data-show-defaults]')?.addEventListener('click', () => { for (const part of parts) { part.visible = part.id !== LOWPOLY_TREADS_ENVELOPE_ID; applyPartTransform(part); } renderTuneUi(); });
  root.querySelector<HTMLButtonElement>('[data-focus-part]')?.addEventListener('click', () => selectedPart && focusPart(selectedPart));
  root.querySelector<HTMLButtonElement>('[data-export-tune]')?.addEventListener('click', exportTune);
  root.querySelector<HTMLButtonElement>('[data-undo]')?.addEventListener('click', undoTune);
  root.querySelector<HTMLButtonElement>('[data-redo]')?.addEventListener('click', redoTune);
  root.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front')));
}
function bindGestures() {
  canvas.addEventListener('pointerdown', (event) => {
    if (!isTuneMode || event.button !== 0) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.size === 2) { lastPinchDistance = getPointerDistance(); lastTwistAngle = getPointerAngle(); if (gestureState) controls.enabled = false; return; }
    const hit = lockedSelection || pickTunePart(event.clientX, event.clientY);
    if (!hit) return;
    const wasSelected = hit === selectedPart;
    selectPart(hit, false);
    controls.enabled = false;
    gestureState = { pointerId: event.pointerId, part: hit, lastX: event.clientX, lastY: event.clientY, moved: false, tapCanCycle: wasSelected };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!isTuneMode) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gestureState && pointerPositions.size >= 2) { handleTwoFingerGesture(); return; }
    if (!gestureState || event.pointerId !== gestureState.pointerId) return;
    const dx = event.clientX - gestureState.lastX;
    const dy = event.clientY - gestureState.lastY;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    pushUndoOncePerGesture();
    transformByGesture(gestureState.part, dx, dy);
    gestureState.lastX = event.clientX;
    gestureState.lastY = event.clientY;
    gestureState.moved = true;
    applyPartTransform(gestureState.part);
    renderTuneUi();
    applyTuneToUrl();
  });
  canvas.addEventListener('pointerup', endGesture);
  canvas.addEventListener('pointercancel', endGesture);
}
function setPartsOpen(open: boolean) { partsOpen = open; renderTuneUi(); }
function pickTunePart(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(tuneMeshes.filter((object) => object.visible), true);
  if (!hits.length) return null;
  let object: THREE.Object3D | null = hits[0].object;
  while (object && !object.userData.tunePartId) object = object.parent;
  const id = object?.userData.tunePartId || hits[0].object.userData.tunePartId;
  return parts.find((part) => part.id === id) || null;
}
function handleTwoFingerGesture() {
  if (!gestureState) return;
  const part = gestureState.part;
  const distance = getPointerDistance();
  const angle = getPointerAngle();
  pushUndoOncePerGesture();
  if (currentMode === 'scale' && lastPinchDistance > 0) scalePart(part, (distance - lastPinchDistance) * 0.006);
  if (currentMode === 'rotate' && Number.isFinite(lastTwistAngle)) rotatePart(part, THREE.MathUtils.radToDeg(angle - lastTwistAngle));
  lastPinchDistance = distance;
  lastTwistAngle = angle;
  gestureState.moved = true;
  applyPartTransform(part);
  renderTuneUi();
  applyTuneToUrl();
}
function endGesture(event: PointerEvent) {
  pointerPositions.delete(event.pointerId);
  if (gestureState && event.pointerId === gestureState.pointerId) {
    if (!gestureState.moved && gestureState.tapCanCycle) cycleMode();
    gestureState = null;
    controls.enabled = true;
  }
  if (pointerPositions.size < 2) { lastPinchDistance = 0; lastTwistAngle = 0; }
}
function transformByGesture(part: AssemblyPart, dx: number, dy: number) { if (currentMode === 'move') movePart(part, dx, dy); if (currentMode === 'rotate') rotatePart(part, (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * 0.28); if (currentMode === 'scale') scalePart(part, (dx - dy) * 0.004); }
function movePart(part: AssemblyPart, dx: number, dy: number) {
  const amount = 0.006;
  if (currentAxis === 'screen') {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const delta = right.multiplyScalar(dx * amount).add(up.multiplyScalar(-dy * amount));
    part.position[0] += delta.x; part.position[1] += delta.y; part.position[2] += delta.z; return;
  }
  const value = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * amount;
  if (currentAxis === 'x') part.position[0] += value;
  if (currentAxis === 'y') part.position[1] += value;
  if (currentAxis === 'z') part.position[2] += value;
}
function rotatePart(part: AssemblyPart, degrees: number) { if (currentAxis === 'screen') { part.rotationDeg[1] += degrees; return; } if (currentAxis === 'x') part.rotationDeg[0] += degrees; if (currentAxis === 'y') part.rotationDeg[1] += degrees; if (currentAxis === 'z') part.rotationDeg[2] += degrees; }
function scalePart(part: AssemblyPart, delta: number) { if (currentAxis === 'all' || currentAxis === 'screen') { part.scale[0] = Math.max(0.03, part.scale[0] + delta); part.scale[1] = Math.max(0.03, part.scale[1] + delta); part.scale[2] = Math.max(0.03, part.scale[2] + delta); } if (currentAxis === 'x') part.scale[0] = Math.max(0.03, part.scale[0] + delta); if (currentAxis === 'y') part.scale[1] = Math.max(0.03, part.scale[1] + delta); if (currentAxis === 'z') part.scale[2] = Math.max(0.03, part.scale[2] + delta); }
function selectPart(part: AssemblyPart, userPicked: boolean) { selectedPart = part; selectedArea = part.area; focusPart(part); renderTuneUi(); if (userPicked) postVisualBeacon('select-part', { part: part.id, area: part.area }); }
function focusPart(part: AssemblyPart) { const world = part.object?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(part.position[0], part.position[1], part.position[2]); controls.target.set(world.x, world.y + 0.08, world.z); controls.update(); }
function updateSelectionEmphasis() {
  if (selectionBox) { reviewGroup.remove(selectionBox); selectionBox.geometry.dispose(); selectionBox = null; }
  if (!selectedPart?.object || !selectedPart.visible) return;
  selectionBox = new THREE.BoxHelper(selectedPart.object, 0xd9bd68);
  selectionBox.name = 'selected_envelope_bbox_helper';
  reviewGroup.add(selectionBox);
}
function cycleMode() { currentMode = currentMode === 'move' ? 'rotate' : currentMode === 'rotate' ? 'scale' : 'move'; currentAxis = currentMode === 'scale' ? 'all' : 'screen'; renderTuneUi(); }
function resetSelectedPart() { if (!selectedPart || !initialSnapshot) return; const initial = JSON.parse(initialSnapshot).parts.find((part: AssemblyPart) => part.id === selectedPart?.id); if (!initial) return; pushUndo(); selectedPart.position = [...initial.position] as [number, number, number]; selectedPart.rotationDeg = [...initial.rotationDeg] as [number, number, number]; selectedPart.scale = [...initial.scale] as [number, number, number]; selectedPart.visible = initial.visible; selectedPart.locked = initial.locked; applyPartTransform(selectedPart); renderTuneUi(); applyTuneToUrl(); }
function getPointerDistance() { const pts = [...pointerPositions.values()]; return pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); }
function getPointerAngle() { const pts = [...pointerPositions.values()]; return pts.length < 2 ? 0 : Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x); }
function axisLabel() { if (currentAxis === 'all') return 'All'; return currentAxis === 'screen' ? 'Screen' : currentAxis.toUpperCase(); }
function modeLabel() { return (currentMode[0].toUpperCase() + currentMode.slice(1)) + ' / ' + axisLabel(); }
function pushUndo() { undoStack.push(serializeTuneParts()); redoStack.length = 0; }
function pushUndoOncePerGesture() { if (!gestureState || gestureState.moved) return; pushUndo(); gestureState.moved = true; }
function undoTune() { if (!undoStack.length) return; redoStack.push(serializeTuneParts()); restoreTuneParts(undoStack.pop()!); }
function redoTune() { if (!redoStack.length) return; undoStack.push(serializeTuneParts()); restoreTuneParts(redoStack.pop()!); }
function serializeTuneParts() {
  return JSON.stringify({
    version: 1,
    build: visualBuild,
    coordinateSpace: 'meshy-envelope-assembly-editor-runtime-root',
    editable: 'meshy_sherman_lowpoly_envelope_v1',
    fixedReference: 'authored_sherman_treads_v1_parade_truth',
    sourcePolicy: manifest?.source_policy || '',
    runtimeContract: manifest?.runtime_contract || {},
    selectedArea,
    lockedPartId: lockedSelection?.id || '',
    parts: parts.map((part) => ({ id: part.id, label: part.label, area: part.area, runtimeRole: part.runtimeRole, position: part.position, rotationDeg: part.rotationDeg, scale: part.scale, visible: part.visible, locked: part.locked, triangles: part.triangles, vertices: part.vertices, sourceImage: part.sourceImage, sourceGlb: part.sourceGlb }))
  }, null, 2);
}
function restoreTuneParts(snapshot: string) {
  const parsed = JSON.parse(snapshot) as { selectedArea?: AssemblyArea; lockedPartId?: string; parts: AssemblyPart[] };
  selectedArea = parsed.selectedArea || selectedArea;
  lockedSelection = null;
  for (const saved of parsed.parts) {
    const part = parts.find((candidate) => candidate.id === saved.id);
    if (!part) continue;
    part.position = [...saved.position] as [number, number, number];
    part.rotationDeg = [...saved.rotationDeg] as [number, number, number];
    part.scale = [...saved.scale] as [number, number, number];
    part.visible = saved.visible;
    part.locked = saved.locked;
    if (part.locked || parsed.lockedPartId === part.id) lockedSelection = part;
    applyPartTransform(part);
  }
  selectedPart = parts.find((part) => part.id === parsed.lockedPartId) || selectedPart;
  renderTuneUi();
  applyTuneToUrl();
}
function exportTune() { const json = serializeTuneParts(); localStorage.setItem('tftm.meshyEnvelopeAssemblyTune.v1', json); if (exportPanel && exportOutput) { exportPanel.hidden = false; exportOutput.value = json; } applyTuneToUrl(); postVisualBeacon('tune-export', { parts: parts.length }); }
function applyTuneToUrl() { if (!isTuneMode || !initialSnapshot) return; const encoded = btoa(unescape(encodeURIComponent(serializeTuneParts()))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); window.history.replaceState(null, '', window.location.pathname + '?tune=envelopes#componentAssemblyTune=' + encoded); }
function snapCamera(view: string) { const focus = selectedPart ? (selectedPart.object?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(selectedPart.position[0], selectedPart.position[1], selectedPart.position[2])) : new THREE.Vector3(0, 0.22, 0); const distance = Math.max(4.2, camera.position.distanceTo(controls.target)); const offsets: Record<string, THREE.Vector3> = { front: new THREE.Vector3(0, 1.15, -distance), back: new THREE.Vector3(0, 1.15, distance), left: new THREE.Vector3(-distance, 1.15, 0), right: new THREE.Vector3(distance, 1.15, 0), top: new THREE.Vector3(0.01, distance, 0.01) }; controls.target.copy(focus); camera.position.copy(focus).add(offsets[view] || offsets.front); controls.update(); postVisualBeacon('camera-snap', { view }); }
function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) { const params = new URLSearchParams({ stage, build: visualBuild, actor: 'meshy_sherman_lowpoly_envelope_v1', clip: isTuneMode ? 'envelope assembly manual editor' : 'envelope assembly review', clipKey: 'assembled-tank-envelope-editor', sourceName: 'tanks-for-the-memories', tuneMode: isTuneMode ? 'envelopes' : '0', ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, String(value)])) }); fetch('/__visual_qa_smoke?' + params.toString(), { method: 'POST', cache: 'no-store' }).catch(() => {}); }
function resize() { const width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight); const pixelRatio = renderer.getPixelRatio(); if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) { renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); } }
function animate() { resize(); controls.update(); if (selectionBox) selectionBox.update(); renderer.render(scene, camera); requestAnimationFrame(animate); }

if (isTuneMode) { bindUi(); bindGestures(); }
postVisualBeacon('boot');
boot().catch((error) => failLoad('manifest', error));
requestAnimationFrame(animate);

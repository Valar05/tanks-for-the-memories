import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_BOXMODEL_GLB_URL } from './sherman-asset-links';
import { applyAuthoredBoxmodelTexturePlates } from './sherman-runtime-materials';

const root = document.querySelector<HTMLDivElement>('#boxmodel-tank-root');
if (!root) throw new Error('missing #boxmodel-tank-root');

const query = new URLSearchParams(window.location.search);
const isTuneMode = query.get('tune') === '1';
const baseVisualBuild = 'tftm-authored-sherman-boxmodel-v1-13-20260705';
const tunerVisualBuild = 'tftm-authored-sherman-boxmodel-tuner-v9-20260704';
const visualBuild = isTuneMode ? tunerVisualBuild : baseVisualBuild;

type TuneMode = 'move' | 'rotate' | 'scale';
type TuneAxis = 'all' | 'screen' | 'x' | 'y' | 'z';

type BoxmodelTunePart = {
  id: string;
  label: string;
  kind: 'box' | 'plate' | 'trackGapPanel';
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  material: number;
  mesh?: THREE.Mesh;
};

const tuneParts: BoxmodelTunePart[] = [
  { id: 'front-right-track-panel', label: 'Front R panel', kind: 'trackGapPanel', position: [1.48, -0.06, -1.82], rotationDeg: [0, 0, 0], scale: [0.08, 1.12, 1.22], visible: true, locked: false, material: 0x56623f },
  { id: 'front-left-track-panel', label: 'Front L panel', kind: 'trackGapPanel', position: [-1.48, -0.06, -1.82], rotationDeg: [0, 0, 0], scale: [0.08, 1.12, 1.22], visible: true, locked: false, material: 0x56623f },
  { id: 'rear-right-track-panel', label: 'Rear R panel', kind: 'trackGapPanel', position: [1.48, -0.06, 1.52], rotationDeg: [0, 0, 0], scale: [0.08, 1.12, 1.22], visible: true, locked: false, material: 0x56623f },
  { id: 'rear-left-track-panel', label: 'Rear L panel', kind: 'trackGapPanel', position: [-1.48, -0.06, 1.52], rotationDeg: [0, 0, 0], scale: [0.08, 1.12, 1.22], visible: true, locked: false, material: 0x56623f }
];

const tuneShell = isTuneMode ? ' is-tuning' : '';
root.innerHTML = '<main class="single-tank-shell' + tuneShell + '">' +
  '<div class="single-tank-stage"><canvas aria-label="Blender Sherman boxmodel scene"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Blender Sherman boxmodel readout">' +
    '<p class="single-tank-kicker">Blender boxmodel asset</p>' +
    '<p class="single-tank-title">Sherman silhouette review</p>' +
    '<p class="single-tank-status" data-status>loading Blender Sherman boxmodel</p>' +
  '</section>' +
  (isTuneMode ? '<section class="tune-parts-panel is-collapsed" aria-label="Boxmodel parts" data-parts-panel>' +
    '<button class="tune-parts-toggle" type="button" data-toggle-parts><span data-selected-label>No part</span><span data-parts-caret>Parts</span></button>' +
    '<div class="tune-parts-list" data-parts-list></div>' +
  '</section>' +
  '<section class="tune-dock" aria-label="Gesture transform controls" data-tune-dock>' +
    '<div class="tune-active"><span data-mode-label>Move / Screen</span><button type="button" data-export-tune>Export</button></div>' +
    '<div class="tune-row tune-mode-row" data-mode-row><button type="button" data-mode="move">Move</button><button type="button" data-mode="rotate">Rotate</button><button type="button" data-mode="scale">Scale</button></div>' +
    '<div class="tune-row tune-axis-row" data-axis-row><button type="button" data-axis="all">All</button><button type="button" data-axis="x">X</button><button type="button" data-axis="y">Y</button><button type="button" data-axis="z">Z</button></div>' +
    '<div class="tune-row tune-action-row"><button type="button" data-undo>Undo</button><button type="button" data-redo>Redo</button><button type="button" data-reset-part>Reset</button><button type="button" data-toggle-visible>Hide</button></div>' +
  '</section>' +
  '<section class="orientation-widget" aria-label="Camera orientation widget" data-orientation-widget>' +
    '<button type="button" data-camera-view="front">Front</button><button type="button" data-camera-view="left">Left</button><button type="button" data-camera-view="top">Top</button><button type="button" data-camera-view="right">Right</button><button type="button" data-camera-view="back">Back</button>' +
  '</section>' +
  '<section class="tune-export" hidden aria-label="Tune export"><textarea data-export-output readonly></textarea></section>' : '') +
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
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171a14);
scene.fog = new THREE.Fog(0x171a14, 12, 32);

const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 100);
camera.position.set(0, 3.5, -6.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.36, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 2.4;
controls.maxDistance = 13;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

const tankRoot = new THREE.Group();
const tuneGroup = new THREE.Group();
tankRoot.add(tuneGroup);
scene.add(tankRoot);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedPart: BoxmodelTunePart | null = isTuneMode ? tuneParts[0] : null;
if (selectedPart) selectedPart.visible = true;
let currentMode: TuneMode = 'move';
let currentAxis: TuneAxis = 'all';
let partsOpen = false;
let gestureState: {
  pointerId: number;
  part: BoxmodelTunePart;
  lastX: number;
  lastY: number;
  moved: boolean;
  tapCanCycle: boolean;
} | null = null;
const pointerPositions = new Map<number, { x: number; y: number }>();
let lastPinchDistance = 0;
let lastTwistAngle = 0;
const undoStack: string[] = [];
const redoStack: string[] = [];
const initialTuneSnapshot = serializeTuneParts();

scene.add(new THREE.HemisphereLight(0xf1ead6, 0x30382c, 2.0));
const key = new THREE.DirectionalLight(0xfff0d2, 3.0);
key.position.set(4, 5, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0xa8bfff, 1.2);
rim.position.set(-4, 2.6, -4);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 8),
  new THREE.MeshStandardMaterial({ color: 0x343124, roughness: 0.94, metalness: 0.0 })
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.52;
scene.add(floor);

if (isTuneMode) {
  createTuneMeshes();
  renderTuneUi();
  bindTuneUi();
  bindGestureControls();
  applyTuneToUrl();
  statusEl.textContent = 'gesture tuner ready: drag armor panels, pinch scale, twist rotate';
}

new GLTFLoader().load(AUTHORED_SHERMAN_BOXMODEL_GLB_URL, (gltf) => {
  const model = gltf.scene;
  model.name = 'authored_sherman_boxmodel_v1';
  applyAuthoredBoxmodelTexturePlates(model);
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  model.position.sub(center);
  model.position.y += size.y * 0.5 - 0.52;
  model.rotation.y = -Math.PI / 2;
  tankRoot.add(model);
  statusEl.textContent = isTuneMode ? 'loaded boxmodel; gesture-only tuner active' : 'loaded Blender boxmodel with box UV plates';
  postVisualBeacon('loaded', isTuneMode ? { tuneParts: tuneParts.length } : {});
}, undefined, (error) => {
  statusEl.textContent = 'Blender boxmodel load failed';
  postVisualBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

function createTuneMeshes() {
  for (const part of tuneParts) {
    const geometry = part.kind === 'trackGapPanel'
      ? createTrackGapPanelGeometry()
      : new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: part.material,
      roughness: 0.82,
      metalness: 0.14,
      transparent: true,
      opacity: 0.88,
      emissive: 0x000000,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'tune-part-' + part.id;
    mesh.userData.tunePartId = part.id;
    part.mesh = mesh;
    tuneGroup.add(mesh);
    applyPartTransform(part);
  }
}

function createTrackGapPanelGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.name = 'flat-track-gap-armor-panel';
  return geometry;
}

function applyPartTransform(part: BoxmodelTunePart) {
  const mesh = part.mesh;
  if (!mesh) return;
  mesh.position.set(part.position[0], part.position[1], part.position[2]);
  mesh.rotation.set(
    THREE.MathUtils.degToRad(part.rotationDeg[0]),
    THREE.MathUtils.degToRad(part.rotationDeg[1]),
    THREE.MathUtils.degToRad(part.rotationDeg[2])
  );
  mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
  mesh.visible = part.visible;
}

function renderTuneUi() {
  if (!partsListEl) return;
  partsListEl.innerHTML = '';
  for (const part of tuneParts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.partId = part.id;
    button.className = 'tune-part-row' + (part === selectedPart ? ' is-selected' : '') + (!part.visible ? ' is-hidden' : '');
    button.setAttribute('aria-pressed', String(part === selectedPart));
    button.textContent = part.label;
    button.addEventListener('click', () => {
      selectPart(part);
      setPartsOpen(false);
    });
    partsListEl.appendChild(button);
  }
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('is-selected', button.dataset.mode === currentMode));
  if (selectedLabelEl) selectedLabelEl.textContent = selectedPart ? selectedPart.label : 'No part';
  if (modeLabelEl) modeLabelEl.textContent = modeLabel();
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => {
    const axis = button.dataset.axis as TuneAxis;
    button.classList.toggle('is-selected', axis === currentAxis);
    button.hidden = currentMode !== 'scale' && axis === 'all';
  });
  updateSelectedMaterial();
  partsPanel?.classList.toggle('is-collapsed', !partsOpen);
}

function bindTuneUi() {
  partsToggle?.addEventListener('click', () => setPartsOpen(!partsOpen));
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      currentMode = button.dataset.mode as TuneMode;
      currentAxis = currentMode === 'scale' ? 'all' : 'screen';
      renderTuneUi();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => {
    button.addEventListener('click', () => {
      currentAxis = button.dataset.axis as TuneAxis;
      renderTuneUi();
    });
  });
  root.querySelector<HTMLButtonElement>('[data-export-tune]')?.addEventListener('click', exportTune);
  root.querySelector<HTMLButtonElement>('[data-toggle-visible]')?.addEventListener('click', () => {
    if (!selectedPart) return;
    pushUndo();
    selectedPart.visible = !selectedPart.visible;
    for (const part of tuneParts) applyPartTransform(part);
    renderTuneUi();
    applyTuneToUrl();
  });
  root.querySelector<HTMLButtonElement>('[data-reset-part]')?.addEventListener('click', () => {
    if (!selectedPart) return;
    const initial = JSON.parse(initialTuneSnapshot).parts.find((part: BoxmodelTunePart) => part.id === selectedPart?.id);
    if (!initial) return;
    pushUndo();
    selectedPart.position = initial.position;
    selectedPart.rotationDeg = initial.rotationDeg;
    selectedPart.scale = initial.scale;
    selectedPart.visible = initial.visible;
    applyPartTransform(selectedPart);
    renderTuneUi();
    applyTuneToUrl();
  });
  root.querySelector<HTMLButtonElement>('[data-undo]')?.addEventListener('click', undoTune);
  root.querySelector<HTMLButtonElement>('[data-redo]')?.addEventListener('click', redoTune);
  root.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => {
    button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front'));
  });
}

function setPartsOpen(open: boolean) {
  partsOpen = open;
  renderTuneUi();
}

function bindGestureControls() {
  canvas.addEventListener('pointerdown', (event) => {
    if (!isTuneMode || event.button !== 0) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.size === 2) {
      lastPinchDistance = getPointerDistance();
      lastTwistAngle = getPointerAngle();
      if (gestureState) controls.enabled = false;
      return;
    }
    const hit = pickTunePart(event.clientX, event.clientY);
    if (!hit) return;
    const wasSelected = hit === selectedPart;
    selectPart(hit);
    controls.enabled = false;
    gestureState = { pointerId: event.pointerId, part: hit, lastX: event.clientX, lastY: event.clientY, moved: false, tapCanCycle: wasSelected };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!isTuneMode) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gestureState && pointerPositions.size >= 2) {
      handleTwoFingerGesture();
      return;
    }
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

function handleTwoFingerGesture() {
  if (!gestureState) return;
  const part = gestureState.part;
  const distance = getPointerDistance();
  const angle = getPointerAngle();
  pushUndoOncePerGesture();
  if (currentMode === 'scale' && lastPinchDistance > 0) {
    scalePart(part, (distance - lastPinchDistance) * 0.006);
  }
  if (currentMode === 'rotate' && Number.isFinite(lastTwistAngle)) {
    rotatePart(part, THREE.MathUtils.radToDeg(angle - lastTwistAngle));
  }
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
  if (pointerPositions.size < 2) {
    lastPinchDistance = 0;
    lastTwistAngle = 0;
  }
}

function pickTunePart(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const meshes = tuneParts.map((part) => part.mesh).filter((mesh): mesh is THREE.Mesh => Boolean(mesh && mesh.visible));
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  const partId = hits[0].object.userData.tunePartId;
  return tuneParts.find((part) => part.id === partId) || null;
}

function transformByGesture(part: BoxmodelTunePart, dx: number, dy: number) {
  if (currentMode === 'move') movePart(part, dx, dy);
  if (currentMode === 'rotate') rotatePart(part, (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * 0.28);
  if (currentMode === 'scale') scalePart(part, (dx - dy) * 0.004);
}

function movePart(part: BoxmodelTunePart, dx: number, dy: number) {
  const amount = 0.006;
  if (currentAxis === 'screen') {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const delta = right.multiplyScalar(dx * amount).add(up.multiplyScalar(-dy * amount));
    part.position[0] += delta.x;
    part.position[1] += delta.y;
    part.position[2] += delta.z;
    return;
  }
  const value = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * amount;
  if (currentAxis === 'x') part.position[0] += value;
  if (currentAxis === 'y') part.position[1] += value;
  if (currentAxis === 'z') part.position[2] += value;
}

function rotatePart(part: BoxmodelTunePart, degrees: number) {
  if (currentAxis === 'screen') {
    part.rotationDeg[1] += degrees;
    return;
  }
  if (currentAxis === 'x') part.rotationDeg[0] += degrees;
  if (currentAxis === 'y') part.rotationDeg[1] += degrees;
  if (currentAxis === 'z') part.rotationDeg[2] += degrees;
}

function scalePart(part: BoxmodelTunePart, delta: number) {
  if (currentAxis === 'all' || currentAxis === 'screen') {
    part.scale[0] = Math.max(0.02, part.scale[0] + delta);
    part.scale[1] = Math.max(0.02, part.scale[1] + delta);
    part.scale[2] = Math.max(0.02, part.scale[2] + delta);
  }
  if (currentAxis === 'x') part.scale[0] = Math.max(0.02, part.scale[0] + delta);
  if (currentAxis === 'y') part.scale[1] = Math.max(0.02, part.scale[1] + delta);
  if (currentAxis === 'z') part.scale[2] = Math.max(0.02, part.scale[2] + delta);
}

function getPointerDistance() {
  const points = [...pointerPositions.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function getPointerAngle() {
  const points = [...pointerPositions.values()];
  if (points.length < 2) return 0;
  return Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
}

function selectPart(part: BoxmodelTunePart) {
  selectedPart = part;
  if (!part.visible) part.visible = true;
  for (const candidate of tuneParts) applyPartTransform(candidate);
  controls.target.set(part.position[0], part.position[1] + 0.1, part.position[2]);
  controls.update();
  renderTuneUi();
  postVisualBeacon('select-part', { part: part.id });
}

function cycleMode() {
  currentMode = currentMode === 'move' ? 'rotate' : currentMode === 'rotate' ? 'scale' : 'move';
  currentAxis = currentMode === 'scale' ? 'all' : 'screen';
  renderTuneUi();
}

function updateSelectedMaterial() {
  const visibleButton = root.querySelector<HTMLButtonElement>('[data-toggle-visible]');
  if (visibleButton) visibleButton.textContent = selectedPart?.visible ? 'Hide' : 'Show';
  for (const part of tuneParts) {
    const material = part.mesh?.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    material.emissive.set(part === selectedPart ? 0x463809 : 0x000000);
    material.opacity = part === selectedPart ? 0.98 : 0.68;
  }
}

function axisLabel() {
  if (currentAxis === 'all') return 'All';
  return currentAxis === 'screen' ? 'Screen' : currentAxis.toUpperCase();
}

function modeLabel() {
  return (currentMode[0].toUpperCase() + currentMode.slice(1)) + ' / ' + axisLabel();
}

function pushUndo() {
  undoStack.push(serializeTuneParts());
  redoStack.length = 0;
}

function pushUndoOncePerGesture() {
  if (!gestureState || gestureState.moved) return;
  pushUndo();
  gestureState.moved = true;
}

function undoTune() {
  if (!undoStack.length) return;
  redoStack.push(serializeTuneParts());
  restoreTuneParts(undoStack.pop()!);
}

function redoTune() {
  if (!redoStack.length) return;
  undoStack.push(serializeTuneParts());
  restoreTuneParts(redoStack.pop()!);
}

function serializeTuneParts() {
  return JSON.stringify({
    version: 1,
    build: tunerVisualBuild,
    coordinateSpace: 'boxmodel-tank-runtime-root',
    parts: tuneParts.map((part) => ({
      id: part.id,
      label: part.label,
      kind: part.kind,
      position: part.position,
      rotationDeg: part.rotationDeg,
      scale: part.scale,
      visible: part.visible,
      locked: part.locked
    }))
  }, null, 2);
}

function restoreTuneParts(snapshot: string) {
  const parsed = JSON.parse(snapshot) as { parts: BoxmodelTunePart[] };
  for (const saved of parsed.parts) {
    const part = tuneParts.find((candidate) => candidate.id === saved.id);
    if (!part) continue;
    part.position = [...saved.position] as [number, number, number];
    part.rotationDeg = [...saved.rotationDeg] as [number, number, number];
    part.scale = [...saved.scale] as [number, number, number];
    part.visible = saved.visible;
    applyPartTransform(part);
  }
  renderTuneUi();
  applyTuneToUrl();
}

function exportTune() {
  const json = serializeTuneParts();
  localStorage.setItem('tftm.boxmodelTune.v1', json);
  if (exportPanel && exportOutput) {
    exportPanel.hidden = false;
    exportOutput.value = json;
  }
  applyTuneToUrl();
  postVisualBeacon('tune-export', { tuneParts: tuneParts.length });
}

function applyTuneToUrl() {
  if (!isTuneMode) return;
  const encoded = btoa(unescape(encodeURIComponent(serializeTuneParts())))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const next = window.location.pathname + '?tune=1#tune=' + encoded;
  window.history.replaceState(null, '', next);
}

function snapCamera(view: string) {
  const focus = selectedPart ? new THREE.Vector3(selectedPart.position[0], selectedPart.position[1] + 0.1, selectedPart.position[2]) : new THREE.Vector3(0, 0.36, 0);
  const distance = Math.max(4.5, camera.position.distanceTo(controls.target));
  const offsets: Record<string, THREE.Vector3> = {
    front: new THREE.Vector3(0, 1.4, -distance),
    back: new THREE.Vector3(0, 1.4, distance),
    left: new THREE.Vector3(-distance, 1.4, 0),
    right: new THREE.Vector3(distance, 1.4, 0),
    top: new THREE.Vector3(0.01, distance, 0.01)
  };
  controls.target.copy(focus);
  camera.position.copy(focus).add(offsets[view] || offsets.front);
  controls.update();
  postVisualBeacon('camera-snap', { view });
}

function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualBuild,
    actor: 'authored_sherman_boxmodel_v1',
    clip: isTuneMode ? 'Gesture-only boxmodel part tuner' : 'Blender boxmodel silhouette and UV plate review',
    clipKey: isTuneMode ? 'boxmodel-tank-tuner' : 'boxmodel-tank',
    sourceName: 'tanks-for-the-memories',
    tuneMode: isTuneMode ? '1' : '0',
    ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, String(value)]))
  });
  fetch('/__visual_qa_smoke?' + params.toString(), { method: 'POST', cache: 'no-store' }).catch(() => {});
}

function resize() {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const pixelRatio = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualBeacon('boot', isTuneMode ? { tuneParts: tuneParts.length } : {});
requestAnimationFrame(animate);

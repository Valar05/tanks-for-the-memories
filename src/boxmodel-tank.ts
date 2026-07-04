import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AUTHORED_SHERMAN_BOXMODEL_GLB_URL } from './sherman-asset-links';
import { applyAuthoredBoxmodelTexturePlates } from './sherman-runtime-materials';

const root = document.querySelector<HTMLDivElement>('#boxmodel-tank-root');
if (!root) throw new Error('missing #boxmodel-tank-root');

const query = new URLSearchParams(window.location.search);
const isTuneMode = query.get('tune') === '1';
const baseVisualBuild = 'tftm-authored-sherman-boxmodel-v1-7-20260704';
const tunerVisualBuild = 'tftm-authored-sherman-boxmodel-tuner-v2-20260704';
const visualBuild = isTuneMode ? tunerVisualBuild : baseVisualBuild;

type TuneMode = 'move' | 'rotate' | 'scale';
type TuneAxis = 'x' | 'y' | 'z' | 'uniform';

type BoxmodelTunePart = {
  id: string;
  label: string;
  kind: 'box' | 'plate';
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  material: number;
  mesh?: THREE.Mesh;
};

const tuneParts: BoxmodelTunePart[] = [
  { id: 'front-hole-plug', label: 'Front plug', kind: 'box', position: [0, -0.05, -1.92], rotationDeg: [-8, 0, 0], scale: [1.28, 0.64, 0.26], visible: true, locked: false, material: 0x8c8b63 },
  { id: 'back-hole-plug', label: 'Back plug', kind: 'box', position: [0, -0.05, 1.72], rotationDeg: [4, 0, 0], scale: [1.18, 0.58, 0.26], visible: true, locked: false, material: 0x8c8b63 },
  { id: 'right-hole-plug', label: 'Right plug', kind: 'box', position: [1.64, -0.08, -0.12], rotationDeg: [0, 0, -3], scale: [0.26, 0.62, 1.12], visible: true, locked: false, material: 0x8c8b63 },
  { id: 'left-hole-plug', label: 'Left plug', kind: 'box', position: [-1.64, -0.08, -0.12], rotationDeg: [0, 0, 3], scale: [0.26, 0.62, 1.12], visible: true, locked: false, material: 0x8c8b63 }
];

const tuneShell = isTuneMode ? ' is-tuning' : '';
root.innerHTML = '<main class="single-tank-shell' + tuneShell + '">' +
  '<div class="single-tank-stage"><canvas aria-label="Blender Sherman boxmodel scene"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Blender Sherman boxmodel readout">' +
    '<p class="single-tank-kicker">Blender boxmodel asset</p>' +
    '<p class="single-tank-title">Sherman silhouette review</p>' +
    '<p class="single-tank-status" data-status>loading Blender Sherman boxmodel</p>' +
  '</section>' +
  (isTuneMode ? '<section class="tune-parts-panel" aria-label="Boxmodel parts"><div class="tune-panel-title">Parts</div><div class="tune-parts-list" data-parts-list></div></section>' +
  '<section class="tune-dock" aria-label="Gesture transform controls" data-tune-dock>' +
    '<div class="tune-active"><span data-selected-label>No part</span><button type="button" data-export-tune>Export</button></div>' +
    '<div class="tune-row" data-mode-row><button type="button" data-mode="move">Move</button><button type="button" data-mode="rotate">Rotate</button><button type="button" data-mode="scale">Scale</button></div>' +
    '<div class="tune-row" data-axis-row><button type="button" data-axis="x">X</button><button type="button" data-axis="y">Y</button><button type="button" data-axis="z">Z</button><button type="button" data-axis="uniform">All</button></div>' +
    '<label class="tune-step">Step <input data-step type="number" value="1" min="0.1" max="10" step="0.1"></label>' +
    '<div class="tune-grid"><label>X<input data-field="position.x" type="number" step="0.01"></label><label>Y<input data-field="position.y" type="number" step="0.01"></label><label>Z<input data-field="position.z" type="number" step="0.01"></label><label>RX<input data-field="rotation.x" type="number" step="1"></label><label>RY<input data-field="rotation.y" type="number" step="1"></label><label>RZ<input data-field="rotation.z" type="number" step="1"></label><label>SX<input data-field="scale.x" type="number" step="0.01" min="0.01"></label><label>SY<input data-field="scale.y" type="number" step="0.01" min="0.01"></label><label>SZ<input data-field="scale.z" type="number" step="0.01" min="0.01"></label></div>' +
    '<div class="tune-row"><button type="button" data-undo>Undo</button><button type="button" data-redo>Redo</button><button type="button" data-reset-part>Reset</button><button type="button" data-toggle-visible>Hide</button></div>' +
  '</section>' +
  '<section class="tune-export" hidden aria-label="Tune export"><textarea data-export-output readonly></textarea></section>' : '') +
  '<div class="camera-zone" data-camera-zone><span>right side: camera</span></div>' +
'</main>';

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
const cameraZone = root.querySelector<HTMLDivElement>('[data-camera-zone]')!;
const statusEl = root.querySelector<HTMLElement>('[data-status]')!;
const partsListEl = root.querySelector<HTMLDivElement>('[data-parts-list]');
const selectedLabelEl = root.querySelector<HTMLElement>('[data-selected-label]');
const exportPanel = root.querySelector<HTMLElement>('.tune-export');
const exportOutput = root.querySelector<HTMLTextAreaElement>('[data-export-output]');
const stepInput = root.querySelector<HTMLInputElement>('[data-step]');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171a14);
scene.fog = new THREE.Fog(0x171a14, 12, 32);

const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 100);
const tankRoot = new THREE.Group();
const tuneGroup = new THREE.Group();
tankRoot.add(tuneGroup);
scene.add(tankRoot);

const target = new THREE.Vector3(0, 0.36, 0);
const cameraState = { yaw: -0.72, pitch: 0.36, distance: 7.4 };
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedPart: BoxmodelTunePart | null = isTuneMode ? tuneParts[0] : null;
if (selectedPart) selectedPart.visible = true;
let currentMode: TuneMode = 'move';
let currentAxis: TuneAxis = 'x';
let dragPointer: number | null = null;
let lastDragX = 0;
let lastDragY = 0;
let dragMoved = false;
const pointerPositions = new Map<number, { x: number; y: number }>();
let lastPinchDistance = 0;
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

let cameraPointer: number | null = null;
let lastCameraX = 0;
let lastCameraY = 0;

cameraZone.addEventListener('pointerdown', (event) => {
  cameraPointer = event.pointerId;
  lastCameraX = event.clientX;
  lastCameraY = event.clientY;
  cameraZone.setPointerCapture(event.pointerId);
});

cameraZone.addEventListener('pointermove', (event) => {
  if (event.pointerId !== cameraPointer) return;
  const dx = event.clientX - lastCameraX;
  const dy = event.clientY - lastCameraY;
  lastCameraX = event.clientX;
  lastCameraY = event.clientY;
  cameraState.yaw -= dx * 0.006;
  cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + dy * 0.0045, 0.14, 0.86);
});

function releaseCamera(event: PointerEvent) {
  if (event.pointerId === cameraPointer) cameraPointer = null;
}

cameraZone.addEventListener('pointerup', releaseCamera);
cameraZone.addEventListener('pointercancel', releaseCamera);

if (isTuneMode) {
  createTuneMeshes();
  renderTuneUi();
  bindTuneUi();
  bindGestureControls();
  applyTuneToUrl();
  statusEl.textContent = 'tuner ready: cloud review required';
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
  model.rotation.y = -Math.PI / 2 - 0.18;
  tankRoot.add(model);
  statusEl.textContent = isTuneMode ? 'loaded boxmodel; gesture tuner active' : 'loaded Blender boxmodel with box UV plates';
  postVisualBeacon('loaded', isTuneMode ? { tuneParts: tuneParts.length } : {});
}, undefined, (error) => {
  statusEl.textContent = 'Blender boxmodel load failed';
  postVisualBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

function createTuneMeshes() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  for (const part of tuneParts) {
    const material = new THREE.MeshStandardMaterial({
      color: part.material,
      roughness: 0.86,
      metalness: 0.08,
      transparent: true,
      opacity: 0.82,
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
    button.addEventListener('click', () => selectPart(part));
    partsListEl.appendChild(button);
  }
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('is-selected', button.dataset.mode === currentMode));
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => button.classList.toggle('is-selected', button.dataset.axis === currentAxis));
  if (selectedLabelEl) selectedLabelEl.textContent = selectedPart ? selectedPart.label : 'No part';
  syncNumericFields();
  updateSelectedMaterial();
}

function bindTuneUi() {
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      currentMode = button.dataset.mode as TuneMode;
      renderTuneUi();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => {
    button.addEventListener('click', () => {
      currentAxis = button.dataset.axis as TuneAxis;
      renderTuneUi();
    });
  });
  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!selectedPart) return;
      pushUndo();
      setPartField(selectedPart, input.dataset.field || '', Number(input.value));
      applyPartTransform(selectedPart);
      renderTuneUi();
      applyTuneToUrl();
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
}

function bindGestureControls() {
  canvas.addEventListener('pointerdown', (event) => {
    if (!isTuneMode || event.button !== 0) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.size === 2) {
      lastPinchDistance = getPointerDistance();
      return;
    }
    dragPointer = event.pointerId;
    lastDragX = event.clientX;
    lastDragY = event.clientY;
    dragMoved = false;
    const hit = pickTunePart(event.clientX, event.clientY);
    if (hit) selectPart(hit);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!isTuneMode) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (selectedPart && currentMode === 'scale' && pointerPositions.size >= 2) {
      const distance = getPointerDistance();
      if (lastPinchDistance > 0) {
        pushUndoOncePerDrag();
        const delta = (distance - lastPinchDistance) * 0.006 * getStep();
        scalePart(selectedPart, delta);
        applyPartTransform(selectedPart);
        renderTuneUi();
        applyTuneToUrl();
      }
      lastPinchDistance = distance;
      return;
    }
    if (event.pointerId !== dragPointer || !selectedPart) return;
    const dx = event.clientX - lastDragX;
    const dy = event.clientY - lastDragY;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    pushUndoOncePerDrag();
    transformByGesture(selectedPart, dx, dy);
    lastDragX = event.clientX;
    lastDragY = event.clientY;
    dragMoved = true;
    applyPartTransform(selectedPart);
    renderTuneUi();
    applyTuneToUrl();
  });
  canvas.addEventListener('pointerup', endGesture);
  canvas.addEventListener('pointercancel', endGesture);
}

function endGesture(event: PointerEvent) {
  pointerPositions.delete(event.pointerId);
  if (event.pointerId === dragPointer) {
    dragPointer = null;
    dragMoved = false;
  }
  if (pointerPositions.size < 2) lastPinchDistance = 0;
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
  const step = getStep();
  if (currentMode === 'move') {
    const amount = step * 0.006;
    if (currentAxis === 'x') part.position[0] += dx * amount;
    if (currentAxis === 'y') part.position[1] -= dy * amount;
    if (currentAxis === 'z') part.position[2] += dy * amount;
    if (currentAxis === 'uniform') {
      part.position[0] += dx * amount;
      part.position[1] -= dy * amount;
    }
  }
  if (currentMode === 'rotate') {
    const amount = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * step * 0.28;
    if (currentAxis === 'x' || currentAxis === 'uniform') part.rotationDeg[0] += amount;
    if (currentAxis === 'y') part.rotationDeg[1] += amount;
    if (currentAxis === 'z') part.rotationDeg[2] += amount;
  }
  if (currentMode === 'scale') {
    scalePart(part, (dx - dy) * step * 0.004);
  }
}

function scalePart(part: BoxmodelTunePart, delta: number) {
  if (currentAxis === 'x') part.scale[0] = Math.max(0.02, part.scale[0] + delta);
  if (currentAxis === 'y') part.scale[1] = Math.max(0.02, part.scale[1] + delta);
  if (currentAxis === 'z') part.scale[2] = Math.max(0.02, part.scale[2] + delta);
  if (currentAxis === 'uniform') {
    part.scale[0] = Math.max(0.02, part.scale[0] + delta);
    part.scale[1] = Math.max(0.02, part.scale[1] + delta);
    part.scale[2] = Math.max(0.02, part.scale[2] + delta);
  }
}

function getPointerDistance() {
  const points = [...pointerPositions.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function selectPart(part: BoxmodelTunePart) {
  selectedPart = part;
  if (!part.visible) part.visible = true;
  for (const candidate of tuneParts) applyPartTransform(candidate);
  renderTuneUi();
  postVisualBeacon('select-part', { part: part.id });
}

function updateSelectedMaterial() {
  root.querySelector<HTMLButtonElement>('[data-toggle-visible]')!.textContent = selectedPart?.visible ? 'Hide' : 'Show';
  for (const part of tuneParts) {
    const material = part.mesh?.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    material.emissive.set(part === selectedPart ? 0x463809 : 0x000000);
    material.opacity = part === selectedPart ? 0.98 : 0.68;
  }
}

function syncNumericFields() {
  if (!selectedPart) return;
  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((input) => {
    const field = input.dataset.field || '';
    let value = 0;
    if (field === 'position.x') value = selectedPart.position[0];
    if (field === 'position.y') value = selectedPart.position[1];
    if (field === 'position.z') value = selectedPart.position[2];
    if (field === 'rotation.x') value = selectedPart.rotationDeg[0];
    if (field === 'rotation.y') value = selectedPart.rotationDeg[1];
    if (field === 'rotation.z') value = selectedPart.rotationDeg[2];
    if (field === 'scale.x') value = selectedPart.scale[0];
    if (field === 'scale.y') value = selectedPart.scale[1];
    if (field === 'scale.z') value = selectedPart.scale[2];
    input.value = String(Math.round(value * 1000) / 1000);
  });
}

function setPartField(part: BoxmodelTunePart, field: string, value: number) {
  if (!Number.isFinite(value)) return;
  if (field === 'position.x') part.position[0] = value;
  if (field === 'position.y') part.position[1] = value;
  if (field === 'position.z') part.position[2] = value;
  if (field === 'rotation.x') part.rotationDeg[0] = value;
  if (field === 'rotation.y') part.rotationDeg[1] = value;
  if (field === 'rotation.z') part.rotationDeg[2] = value;
  if (field === 'scale.x') part.scale[0] = Math.max(0.02, value);
  if (field === 'scale.y') part.scale[1] = Math.max(0.02, value);
  if (field === 'scale.z') part.scale[2] = Math.max(0.02, value);
}

function getStep() {
  const value = Number(stepInput?.value || 1);
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0.1, 10) : 1;
}

function pushUndo() {
  undoStack.push(serializeTuneParts());
  redoStack.length = 0;
}

function pushUndoOncePerDrag() {
  if (dragMoved) return;
  pushUndo();
  dragMoved = true;
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

function updateCamera() {
  const orbit = new THREE.Vector3(
    Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance,
    Math.sin(cameraState.pitch) * cameraState.distance + 0.95,
    Math.cos(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance
  );
  camera.position.copy(target).add(orbit);
  camera.lookAt(target);
}

function animate() {
  resize();
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualBeacon('boot', isTuneMode ? { tuneParts: tuneParts.length } : {});
requestAnimationFrame(animate);

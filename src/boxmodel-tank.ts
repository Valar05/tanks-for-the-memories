import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AUTHORED_SHERMAN_BOXMODEL_GLB_URL } from './sherman-asset-links';
import { applyAuthoredBoxmodelTexturePlates } from './sherman-runtime-materials';

const root = document.querySelector<HTMLDivElement>('#boxmodel-tank-root');
if (!root) throw new Error('missing #boxmodel-tank-root');

const visualBuild = 'tftm-authored-sherman-boxmodel-v1-4-20260704';

root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Blender Sherman boxmodel scene"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Blender Sherman boxmodel readout">' +
    '<p class="single-tank-kicker">Blender boxmodel asset</p>' +
    '<p class="single-tank-title">Sherman silhouette review</p>' +
    '<p class="single-tank-status" data-status>loading Blender Sherman boxmodel</p>' +
  '</section>' +
  '<div class="camera-zone" data-camera-zone><span>right side: camera</span></div>' +
'</main>';

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
const cameraZone = root.querySelector<HTMLDivElement>('[data-camera-zone]')!;
const statusEl = root.querySelector<HTMLElement>('[data-status]')!;

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
scene.add(tankRoot);

const target = new THREE.Vector3(0, 0.36, 0);
const cameraState = { yaw: -0.72, pitch: 0.36, distance: 7.4 };

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
  statusEl.textContent = 'loaded Blender boxmodel with box UV plates';
  postVisualBeacon('loaded');
}, undefined, (error) => {
  statusEl.textContent = 'Blender boxmodel load failed';
  postVisualBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualBuild,
    actor: 'authored_sherman_boxmodel_v1',
    clip: 'Blender boxmodel silhouette and UV plate review',
    clipKey: 'boxmodel-tank',
    sourceName: 'tanks-for-the-memories',
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

postVisualBeacon('boot');
requestAnimationFrame(animate);

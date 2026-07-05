import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AUTHORED_SHERMAN_TREADS_GLB_URL } from './sherman-asset-links';

const root = document.querySelector<HTMLDivElement>('#treadfirst-treads-root');
if (!root) throw new Error('missing #treadfirst-treads-root');

const visualBuild = 'tftm-authored-sherman-treads-v1-0-20260705';

root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Tread-first Sherman running gear review"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Tread-only asset readout">' +
    '<p class="single-tank-kicker">tread-only Blender pass</p>' +
    '<p class="single-tank-title">Sherman tread component</p>' +
    '<p class="single-tank-status" data-status>loading tread assemblies only</p>' +
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
renderer.toneMappingExposure = 1.04;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151711);
scene.fog = new THREE.Fog(0x151711, 9, 24);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
const target = new THREE.Vector3(0, -0.08, 0);
const cameraState = { yaw: -0.84, pitch: 0.36, distance: 5.2 };

scene.add(new THREE.HemisphereLight(0xf2ead6, 0x252a20, 2.0));
const key = new THREE.DirectionalLight(0xffefd1, 3.0);
key.position.set(3.8, 4.8, 3.0);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9bb4ff, 1.1);
rim.position.set(-3.5, 2.4, -4.0);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 5),
  new THREE.MeshStandardMaterial({ color: 0x302d22, roughness: 0.96, metalness: 0.0 })
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.47;
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
  cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + dy * 0.0045, 0.12, 0.86);
});

function releaseCamera(event: PointerEvent) {
  if (event.pointerId === cameraPointer) cameraPointer = null;
}

cameraZone.addEventListener('pointerup', releaseCamera);
cameraZone.addEventListener('pointercancel', releaseCamera);

new GLTFLoader().load(AUTHORED_SHERMAN_TREADS_GLB_URL, (gltf) => {
  const model = gltf.scene;
  model.name = 'authored_sherman_treads_v1';
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  model.position.sub(center);
  model.position.y += size.y * 0.5 - 0.46;
  model.rotation.y = -Math.PI / 2 - 0.12;
  scene.add(model);
  statusEl.textContent = 'loaded tread-only assemblies with connector mounts; no hull or turret in this pass';
  postVisualBeacon('loaded');
}, undefined, (error) => {
  statusEl.textContent = 'tread-only assembly load failed';
  postVisualBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualBuild,
    actor: 'authored_sherman_treads_v1',
    clip: 'tread-only Sherman running gear review',
    clipKey: 'treadfirst-treads',
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
    Math.sin(cameraState.pitch) * cameraState.distance + 0.6,
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

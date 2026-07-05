import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_CHASSIS_GLB_URL, AUTHORED_SHERMAN_TREADS_GLB_URL } from './sherman-asset-links';

const root = document.querySelector<HTMLDivElement>('#chassisfirst-chassis-root');
if (!root) throw new Error('missing #chassisfirst-chassis-root');

const visualBuild = 'tftm-authored-sherman-chassis-v1-1-20260705';

root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Chassis-first Sherman component review"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Chassis-only asset readout">' +
    '<p class="single-tank-kicker">chassis-only Blender pass</p>' +
    '<p class="single-tank-title">Watertight Sherman chassis</p>' +
    '<p class="single-tank-status" data-status>loading chassis shell with golden treads</p>' +
  '</section>' +
  '<section class="orientation-widget" aria-label="Camera orientation widget" data-orientation-widget>' +
    '<button type="button" data-camera-view="front">Front</button><button type="button" data-camera-view="left">Left</button><button type="button" data-camera-view="top">Top</button><button type="button" data-camera-view="right">Right</button><button type="button" data-camera-view="back">Back</button>' +
  '</section>' +
'</main>';

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
const statusEl = root.querySelector<HTMLElement>('[data-status]')!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151711);
scene.fog = new THREE.Fog(0x151711, 9, 24);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
camera.position.set(0, 2.2, -5.4);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 2.0;
controls.maxDistance = 10.0;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

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

const reviewGroup = new THREE.Group();
reviewGroup.name = 'authored_sherman_chassis_v1_with_golden_treads_review';
scene.add(reviewGroup);
let loaded = 0;

root.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => {
  button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front'));
});

function snapCamera(view: string) {
  const focus = new THREE.Vector3(0, 0.05, 0);
  const distance = Math.max(3.8, camera.position.distanceTo(controls.target));
  const offsets: Record<string, THREE.Vector3> = {
    front: new THREE.Vector3(0, 1.05, -distance),
    back: new THREE.Vector3(0, 1.05, distance),
    left: new THREE.Vector3(-distance, 1.05, 0),
    right: new THREE.Vector3(distance, 1.05, 0),
    top: new THREE.Vector3(0.01, distance, 0.01)
  };
  controls.target.copy(focus);
  camera.position.copy(focus).add(offsets[view] || offsets.front);
  controls.update();
  postVisualBeacon('camera-snap', { view });
}

function onLoaded() {
  loaded += 1;
  if (loaded !== 2) return;
  const box = new THREE.Box3().setFromObject(reviewGroup);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  reviewGroup.position.sub(center);
  reviewGroup.position.y += size.y * 0.5 - 0.46;
  reviewGroup.rotation.y = -Math.PI / 2 - 0.12;
  statusEl.textContent = 'loaded v1.1 watertight chassis shell fitted to frozen v1.8c golden treads; no turret, barrel, wheels, or tread edits';
  postVisualBeacon('loaded');
}

const loader = new GLTFLoader();
loader.load(AUTHORED_SHERMAN_TREADS_GLB_URL, (gltf) => {
  gltf.scene.name = 'authored_sherman_treads_v1_golden_reference';
  reviewGroup.add(gltf.scene);
  onLoaded();
}, undefined, (error) => {
  statusEl.textContent = 'golden tread reference load failed';
  postVisualBeacon('load-failed', { asset: 'treads', message: error instanceof Error ? error.message : String(error) });
});
loader.load(AUTHORED_SHERMAN_CHASSIS_GLB_URL, (gltf) => {
  gltf.scene.name = 'authored_sherman_chassis_v1';
  reviewGroup.add(gltf.scene);
  onLoaded();
}, undefined, (error) => {
  statusEl.textContent = 'chassis shell load failed';
  postVisualBeacon('load-failed', { asset: 'chassis', message: error instanceof Error ? error.message : String(error) });
});

function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualBuild,
    actor: 'authored_sherman_chassis_v1',
    clip: 'chassis-first Sherman shell review with golden treads',
    clipKey: 'chassisfirst-chassis',
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

function animate() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualBeacon('boot');
requestAnimationFrame(animate);

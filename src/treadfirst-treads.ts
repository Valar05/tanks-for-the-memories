import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_TREADS_GLB_URL } from './sherman-asset-links';

const root = document.querySelector<HTMLDivElement>('#treadfirst-treads-root');
if (!root) throw new Error('missing #treadfirst-treads-root');

const visualBuild = 'tftm-authored-sherman-treads-v1-2-20260705';

root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Tread-first Sherman running gear review"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Tread-only asset readout">' +
    '<p class="single-tank-kicker">tread-only Blender pass</p>' +
    '<p class="single-tank-title">Sherman tread component</p>' +
    '<p class="single-tank-status" data-status>loading tread assemblies only</p>' +
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
renderer.toneMappingExposure = 1.04;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151711);
scene.fog = new THREE.Fog(0x151711, 9, 24);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
camera.position.set(0, 2.3, -4.9);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, -0.04, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 1.9;
controls.maxDistance = 9.5;
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

root.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => {
  button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front'));
});

function snapCamera(view: string) {
  const focus = new THREE.Vector3(0, -0.04, 0);
  const distance = Math.max(3.6, camera.position.distanceTo(controls.target));
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
  statusEl.textContent = 'loaded v1.2 tread assembly: split belts, exposed wheels, sprockets, idlers, bogies; no hull or turret';
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

function animate() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualBeacon('boot');
requestAnimationFrame(animate);

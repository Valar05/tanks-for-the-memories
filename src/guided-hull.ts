import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_GUIDED_HULL_GLB_URL, AUTHORED_SHERMAN_GUIDED_HULL_MANIFEST_URL, AUTHORED_SHERMAN_TREADS_GLB_URL, MESHY_SHERMAN_LOWPOLY_HULL_ENVELOPE_GLB_URL } from './sherman-asset-links';
import { applyAuthoredShermanSharedTextures } from './authored-sherman-shared-materials';

const root = document.querySelector<HTMLDivElement>('#guided-hull-root');
if (!root) throw new Error('missing #guided-hull-root');
const visualBuild = 'tftm-authored-sherman-guided-hull-v1-20260708';
const query = new URLSearchParams(window.location.search);
const showGhost = query.get('ghost') !== '0';

root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Guided hard-surface hull review"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Guided hull asset readout">' +
    '<p class="single-tank-kicker">guided hard-surface hull</p>' +
    '<p class="single-tank-title">Authored low-poly hull over Meshy reference</p>' +
    '<p class="single-tank-status" data-status>loading guided hull, Meshy ghost, and fixed treads</p>' +
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
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151711);
scene.fog = new THREE.Fog(0x151711, 9, 24);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
camera.position.set(0.2, 2.1, -5.6);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.12, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 2.0;
controls.maxDistance = 10.0;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

scene.add(new THREE.HemisphereLight(0xf2ead6, 0x252a20, 1.85));
const key = new THREE.DirectionalLight(0xffefd1, 2.8);
key.position.set(3.8, 4.8, 3.0);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9bb4ff, 0.9);
rim.position.set(-3.5, 2.4, -4.0);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshStandardMaterial({ color: 0x302d22, roughness: 0.96, metalness: 0.0 }));
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.48;
scene.add(floor);

const reviewGroup = new THREE.Group();
reviewGroup.name = 'authored_sherman_guided_hull_v1_review_root';
scene.add(reviewGroup);
const treadsGroup = new THREE.Group();
treadsGroup.name = 'fixed_authored_sherman_treads_reference';
reviewGroup.add(treadsGroup);
const hullGroup = new THREE.Group();
hullGroup.name = 'guided_authored_hull_group';
reviewGroup.add(hullGroup);
const ghostGroup = new THREE.Group();
ghostGroup.name = 'transparent_meshy_hull_reference_group';
reviewGroup.add(ghostGroup);

let loaded = 0;
let manifestText = '';
function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({ stage, build: visualBuild, actor: 'authored_sherman_guided_hull_v1', clip: 'guided hard-surface hull with fixed treads and Meshy ghost', clipKey: 'guided-hull', sourceName: 'tanks-for-the-memories', ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
  fetch('/__visual_qa_smoke?' + params.toString(), { method: 'POST', cache: 'no-store' }).catch(() => {});
}
function ghostMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x7aa0ff, roughness: 0.72, metalness: 0.02, transparent: true, opacity: 0.23, depthWrite: false });
}
function applyGhostMaterial(object: THREE.Object3D) {
  const mat = ghostMaterial();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = mat;
    mesh.renderOrder = 4;
  });
}
function onLoaded() {
  loaded += 1;
  const expected = showGhost ? 3 : 2;
  if (loaded !== expected) return;
  const box = new THREE.Box3().setFromObject(reviewGroup);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  reviewGroup.position.sub(center);
  reviewGroup.position.y += size.y * 0.5 - 0.46;
  reviewGroup.rotation.y = -Math.PI / 2 - 0.10;
  statusEl.textContent = 'loaded guided hull: simple authored planes, split cap faces, fixed treads visible, Meshy hull ghost reference ' + (showGhost ? 'enabled' : 'hidden') + '; ' + manifestText;
  postVisualBeacon('loaded', { ghost: showGhost ? 1 : 0 });
}
function failLoad(asset: string, error: unknown) {
  statusEl.textContent = 'guided hull review load failed: ' + asset;
  postVisualBeacon('load-failed', { asset, message: error instanceof Error ? error.message : String(error) });
}
function snapCamera(view: string) {
  const focus = new THREE.Vector3(0, 0.12, 0);
  const distance = Math.max(4.0, camera.position.distanceTo(controls.target));
  const offsets: Record<string, THREE.Vector3> = { front: new THREE.Vector3(0, 1.05, -distance), back: new THREE.Vector3(0, 1.05, distance), left: new THREE.Vector3(-distance, 1.05, 0), right: new THREE.Vector3(distance, 1.05, 0), top: new THREE.Vector3(0.01, distance, 0.01) };
  controls.target.copy(focus);
  camera.position.copy(focus).add(offsets[view] || offsets.front);
  controls.update();
  postVisualBeacon('camera-snap', { view });
}
root.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front')));

const loader = new GLTFLoader();
fetch(AUTHORED_SHERMAN_GUIDED_HULL_MANIFEST_URL, { cache: 'no-store' }).then((response) => response.json()).then((manifest) => {
  manifestText = String(manifest.source_policy || '').split('.').slice(0, 2).join('.') + '.';
}).catch(() => { manifestText = 'manifest unavailable.'; });
loader.load(AUTHORED_SHERMAN_TREADS_GLB_URL, (gltf) => {
  gltf.scene.name = 'fixed_authored_sherman_treads_v1_reference';
  applyAuthoredShermanSharedTextures(gltf.scene);
  treadsGroup.add(gltf.scene);
  onLoaded();
}, undefined, (error) => failLoad('authored_treads', error));
loader.load(AUTHORED_SHERMAN_GUIDED_HULL_GLB_URL, (gltf) => {
  gltf.scene.name = 'authored_sherman_guided_hull_v1';
  hullGroup.add(gltf.scene);
  onLoaded();
}, undefined, (error) => failLoad('guided_hull', error));
if (showGhost) {
  loader.load(MESHY_SHERMAN_LOWPOLY_HULL_ENVELOPE_GLB_URL, (gltf) => {
    gltf.scene.name = 'transparent_meshy_lowpoly_hull_reference_not_source_topology';
    applyGhostMaterial(gltf.scene);
    gltf.scene.scale.set(1.55, 1.70, 1.85);
    gltf.scene.position.set(0, 0.18, 0);
    ghostGroup.add(gltf.scene);
    onLoaded();
  }, undefined, (error) => failLoad('meshy_hull_ghost', error));
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

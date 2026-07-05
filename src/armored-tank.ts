import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_ARMORED_GLB_URL } from './sherman-asset-links';
import { applyAuthoredArmoredTexturePlates } from './sherman-runtime-materials';

const root = document.querySelector<HTMLDivElement>('#armored-tank-root');
if (!root) throw new Error('missing #armored-tank-root');
const visualBuild = 'tftm-authored-sherman-armored-v1-20260705';

root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Armored Sherman review scene"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Armored Sherman readout">' +
    '<p class="single-tank-kicker">Armored Sherman asset</p>' +
    '<p class="single-tank-title">Watertight hull / covered tracks</p>' +
    '<p class="single-tank-status" data-status>loading armored Sherman</p>' +
  '</section>' +
'</main>';

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
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
camera.position.set(0, 3.4, -6.3);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.34, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.82;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 2.2;
controls.maxDistance = 13;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

const tankRoot = new THREE.Group();
scene.add(tankRoot);
scene.add(new THREE.HemisphereLight(0xf1ead6, 0x30382c, 2.0));
const key = new THREE.DirectionalLight(0xfff0d2, 3.0);
key.position.set(4, 5, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0xa8bfff, 1.2);
rim.position.set(-4, 2.6, -4);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshStandardMaterial({ color: 0x343124, roughness: 0.94 }));
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.52;
scene.add(floor);

let model: THREE.Object3D | null = null;
let turretPivot: THREE.Object3D | null = null;
let cannonPivot: THREE.Object3D | null = null;

new GLTFLoader().load(AUTHORED_SHERMAN_ARMORED_GLB_URL, (gltf) => {
  model = gltf.scene;
  model.name = 'authored_sherman_armored_v1';
  applyAuthoredArmoredTexturePlates(model);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.position.y += size.y * 0.5 - 0.52;
  model.rotation.y = -Math.PI / 2;
  tankRoot.add(model);
  turretPivot = model.getObjectByName('turret_traverse_pivot') || null;
  cannonPivot = model.getObjectByName('cannon_elevation_pivot') || null;
  statusEl.textContent = visualBuild + ' loaded: armored track wells, animatable turret/gun, coaxial MG';
  root.dataset.visualBuild = visualBuild;
  root.dataset.actor = 'authored_sherman_armored_v1';
  root.dataset.requiredReview = 'cloud Sense Simulation only: compare against boxmodel baseline and rejected hero red build';
}, undefined, (error) => {
  console.error(error);
  statusEl.textContent = 'failed to load armored Sherman asset';
});

function resize() {
  const rect = canvas.parentElement!.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(timeMs: number) {
  resize();
  const t = timeMs / 1000;
  if (turretPivot) turretPivot.rotation.y = Math.sin(t * 0.35) * 0.08;
  if (cannonPivot) cannonPivot.rotation.z = Math.sin(t * 0.55) * 0.018;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('resize', resize);

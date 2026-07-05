import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_HERO_GLB_URL } from './sherman-asset-links';
import { applyAuthoredHeroTexturePlates } from './sherman-runtime-materials';

const root = document.querySelector<HTMLDivElement>('#hero-tank-root');
if (!root) throw new Error('missing #hero-tank-root');

const visualBuild = 'tftm-authored-sherman-hero-v1-20260705';
root.innerHTML = '<main class="single-tank-shell">' +
  '<div class="single-tank-stage"><canvas aria-label="Animatable Sherman hero tank scene"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Animatable Sherman hero tank readout">' +
    '<p class="single-tank-kicker">Animatable Blender hero asset</p>' +
    '<p class="single-tank-title">Sherman hero tank review</p>' +
    '<p class="single-tank-status" data-status>loading animatable hero tank</p>' +
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
camera.position.set(0, 3.3, -6.1);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.32, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.8;
controls.panSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 2.4;
controls.maxDistance = 13;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

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

const tankRoot = new THREE.Group();
scene.add(tankRoot);
let pivotProbe: { turret?: THREE.Object3D; cannon?: THREE.Object3D; leftTrack?: THREE.Object3D; rightTrack?: THREE.Object3D } = {};

new GLTFLoader().load(AUTHORED_SHERMAN_HERO_GLB_URL, (gltf) => {
  const model = gltf.scene;
  model.name = 'authored_sherman_hero_v1';
  applyAuthoredHeroTexturePlates(model);
  pivotProbe = {
    turret: model.getObjectByName('turret_traverse_pivot') || undefined,
    cannon: model.getObjectByName('cannon_elevation_pivot') || undefined,
    leftTrack: model.getObjectByName('left_track_motion') || undefined,
    rightTrack: model.getObjectByName('right_track_motion') || undefined
  };
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  model.position.sub(center);
  model.position.y += size.y * 0.5 - 0.52;
  model.rotation.y = -Math.PI / 2;
  tankRoot.add(model);
  statusEl.textContent = 'loaded animatable hero tank: turret, gun, track, and wheel groups preserved';
  postVisualBeacon('loaded', {
    build: visualBuild,
    turretPivot: Boolean(pivotProbe.turret),
    cannonPivot: Boolean(pivotProbe.cannon),
    trackGroups: Boolean(pivotProbe.leftTrack && pivotProbe.rightTrack)
  });
}, undefined, (error) => {
  statusEl.textContent = 'hero tank load failed';
  postVisualBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

function resize() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function animate(time: number) {
  requestAnimationFrame(animate);
  const t = time * 0.001;
  if (pivotProbe.turret) pivotProbe.turret.rotation.y = Math.sin(t * 0.35) * 0.10;
  if (pivotProbe.cannon) pivotProbe.cannon.rotation.z = Math.sin(t * 0.55) * 0.025;
  controls.update();
  resize();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

function postVisualBeacon(event: string, payload: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('tftm-visual-build', {
    detail: { surface: 'hero-tank', event, visualBuild, ...payload }
  }));
}

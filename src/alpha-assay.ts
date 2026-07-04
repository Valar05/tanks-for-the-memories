import './alpha-assay.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = document.querySelector<HTMLDivElement>('#alpha-assay-root');
if (!root) throw new Error('missing #alpha-assay-root');

const visualQaBuild = 'tftm-alpha-sherman-retexture-v2-20260704a';
const assetUrl = './tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/m4a3_75_vvss_sherman_alpha_retexture_v2.glb';

root.innerHTML = '<main class="alpha-shell">' +
  '<header class="alpha-head">' +
    '<div class="alpha-title">' +
      '<h1>Alpha Sherman Texture Review</h1>' +
      '<p>Player-character Sherman variant. Vanilla baseline remains separate.</p>' +
    '</div>' +
    '<div class="alpha-badge">visual review required</div>' +
  '</header>' +
  '<section class="alpha-stage">' +
    '<canvas id="alpha-stage" aria-label="Alpha Sherman GLB texture review"></canvas>' +
    '<aside class="alpha-readout" aria-label="Alpha Sherman review readout">' +
      '<dl>' +
        '<dt>asset</dt><dd>m4a3_75_vvss_sherman_alpha_retexture_v2.glb</dd>' +
        '<dt>target</dt><dd>olive Sherman, crimson recognition, white A, chalk/dirt</dd>' +
        '<dt>status</dt><dd id="alpha-status">loading retexture candidate</dd>' +
        '<dt>build</dt><dd>' + visualQaBuild + '</dd>' +
      '</dl>' +
    '</aside>' +
  '</section>' +
  '<footer class="alpha-foot">' +
    '<span>Review the visible texture language, not the manifest.</span>' +
    '<span>Cache-bust: ' + new URLSearchParams(window.location.search).get('cacheBust') + '</span>' +
  '</footer>' +
'</main>';

const canvas = document.querySelector<HTMLCanvasElement>('#alpha-stage')!;
const statusEl = document.querySelector<HTMLElement>('#alpha-status')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181a15);

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
camera.position.set(3.55, 1.7, 3.1);

const target = new THREE.Vector3(0.08, 0.32, 0);
const hemi = new THREE.HemisphereLight(0xf3ead7, 0x2f352c, 2.0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff4dd, 3.2);
key.position.set(4, 5, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9bb6ff, 1.4);
rim.position.set(-3, 2, -4);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  new THREE.MeshStandardMaterial({ color: 0x353224, roughness: 0.92, metalness: 0.0 })
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.43;
scene.add(floor);

function postVisualQaBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualQaBuild,
    actor: 'm4a3_75_vvss_sherman_alpha_retexture_v2',
    clip: 'texture review',
    clipKey: 'alpha-assay',
    frameMode: 'cloud-visual-truth',
    sourceName: 'tanks-for-the-memories',
    ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, String(value)]))
  });
  fetch('/__visual_qa_smoke?' + params.toString(), { method: 'POST', cache: 'no-store' }).catch(() => {});
}

function resize() {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

const loader = new GLTFLoader();
let tank: THREE.Object3D | null = null;
loader.load(assetUrl, (gltf) => {
  tank = gltf.scene;
  tank.name = 'alpha_sherman_retexture_v2_review';
  tank.rotation.y = -0.58;
  scene.add(tank);
  const box = new THREE.Box3().setFromObject(tank);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  tank.position.sub(center);
  tank.position.y += size.y * 0.5 - 0.43;
  statusEl.textContent = 'loaded: Meshy retexture on accepted vanilla base; human visual acceptance pending';
  postVisualQaBeacon('loaded', { meshes: gltf.scene.children.length });
}, undefined, (error) => {
  statusEl.textContent = 'failed to load Alpha GLB';
  postVisualQaBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

function animate(now: number) {
  resize();
  if (tank) {
    tank.rotation.y = -0.58 + Math.sin(now * 0.00022) * 0.18;
  }
  camera.lookAt(target);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualQaBeacon('boot');
requestAnimationFrame(animate);

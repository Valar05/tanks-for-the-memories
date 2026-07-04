import './alpha-assay.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = document.querySelector<HTMLDivElement>('#alpha-assay-root');
if (!root) throw new Error('missing #alpha-assay-root');

const visualQaBuild = 'tftm-commander-platoon-alpha-style-v1-20260704a';
const variants = [
  {
    id: 'alpha',
    label: 'Alpha',
    role: 'Player Tank',
    mood: 'reliable / professional',
    url: './tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/m4a3_75_vvss_sherman_alpha_retexture_v2.glb',
    x: -5.1,
    z: 0.35,
    yaw: -0.5
  },
  {
    id: 'bravo',
    label: 'Bravo',
    role: 'Assault',
    mood: 'restless / fast',
    url: './tftm/models/m4a3_75_vvss_sherman_bravo_alpha_style_v1/m4a3_75_vvss_sherman_bravo_alpha_style_v1.glb',
    x: -1.7,
    z: -0.15,
    yaw: -0.28
  },
  {
    id: 'tango',
    label: 'Tango',
    role: 'Human',
    mood: 'warm / lived-in',
    url: './tftm/models/m4a3_75_vvss_sherman_tango_alpha_style_v1/m4a3_75_vvss_sherman_tango_alpha_style_v1.glb',
    x: 1.7,
    z: -0.15,
    yaw: 0.28
  },
  {
    id: 'delta',
    label: 'Delta',
    role: 'Planner',
    mood: 'disciplined / controlled',
    url: './tftm/models/m4a3_75_vvss_sherman_delta_alpha_style_v1/m4a3_75_vvss_sherman_delta_alpha_style_v1.glb',
    x: 5.1,
    z: 0.35,
    yaw: 0.5
  }
] as const;

root.innerHTML = '<main class="alpha-shell">' +
  '<header class="alpha-head">' +
    '<div class="alpha-title">' +
      '<h1>Sherman Commander Platoon Review</h1>' +
      '<p>Four commander texture variants derived from the accepted Alpha graphic language.</p>' +
    '</div>' +
    '<div class="alpha-badge">visual review required</div>' +
  '</header>' +
  '<section class="alpha-stage">' +
    '<canvas id="alpha-stage" aria-label="Four Sherman commander texture variants in platoon parade"></canvas>' +
    '<aside class="alpha-readout" aria-label="Commander platoon review readout">' +
      '<dl>' +
        '<dt>variants</dt><dd>Alpha / Bravo / Tango / Delta</dd>' +
        '<dt>target</dt><dd>same platoon, same base, four different crews</dd>' +
        '<dt>status</dt><dd id="alpha-status">loading platoon</dd>' +
        '<dt>build</dt><dd>' + visualQaBuild + '</dd>' +
      '</dl>' +
    '</aside>' +
  '</section>' +
  '<footer class="alpha-foot">' +
    '<span>Review whether personality reads before labels.</span>' +
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

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
camera.position.set(0, 4.6, 9.8);

const target = new THREE.Vector3(0, 0.25, 0);
const hemi = new THREE.HemisphereLight(0xf3ead7, 0x2f352c, 2.0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff4dd, 3.2);
key.position.set(4, 5, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9bb6ff, 1.4);
rim.position.set(-3, 2, -4);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 8),
  new THREE.MeshStandardMaterial({ color: 0x353224, roughness: 0.92, metalness: 0.0 })
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.43;
scene.add(floor);

function postVisualQaBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualQaBuild,
    actor: 'commander_platoon_retexture_v1',
    clip: 'four commander texture parade',
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
type LoadedTank = {
  object: THREE.Object3D;
  variant: (typeof variants)[number];
  index: number;
};

const tanks: LoadedTank[] = [];
let loadedCount = 0;

function addLabel(text: string, x: number, z: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(12, 14, 10, 0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#efe8d4';
  ctx.font = '700 44px sans-serif';
  ctx.fillText(text, 22, 52);
  ctx.fillStyle = '#c8c0aa';
  ctx.font = '30px sans-serif';
  const variant = variants.find((item) => item.label === text);
  ctx.fillText(variant ? variant.mood : '', 22, 94);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, 0.08, z + 1.85);
  sprite.scale.set(1.55, 0.4, 1);
  scene.add(sprite);
}

for (const [variantIndex, variant] of variants.entries()) {
  loader.load(variant.url, (gltf) => {
    const tank = gltf.scene;
    tank.name = variant.id + '_sherman_commander_variant';
    const box = new THREE.Box3().setFromObject(tank);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    tank.position.sub(center);
    tank.position.x += variant.x;
    tank.position.z += variant.z;
    tank.position.y += size.y * 0.5 - 0.43;
    tank.rotation.y = variant.yaw;
    scene.add(tank);
    tanks.push({ object: tank, variant, index: variantIndex });
    addLabel(variant.label, variant.x, variant.z);
    loadedCount += 1;
    statusEl.textContent = 'loaded ' + loadedCount + ' / ' + variants.length + ': same base mesh, commander texture variants';
    if (loadedCount === variants.length) postVisualQaBeacon('loaded', { variants: loadedCount });
  }, undefined, (error) => {
    statusEl.textContent = 'failed to load ' + variant.label + ' GLB';
    postVisualQaBeacon('load-failed', { variant: variant.id, message: error instanceof Error ? error.message : String(error) });
  });
}

function animate(now: number) {
  resize();
  for (const tank of tanks) {
    tank.object.rotation.y = tank.variant.yaw + Math.sin(now * 0.00016 + tank.index * 0.7) * 0.08;
  }
  camera.lookAt(target);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualQaBeacon('boot');
requestAnimationFrame(animate);

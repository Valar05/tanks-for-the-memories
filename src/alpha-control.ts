import './alpha-control.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = document.querySelector<HTMLDivElement>('#alpha-control-root');
if (!root) throw new Error('missing #alpha-control-root');

const visualQaBuild = 'tftm-alpha-control-simulation-v1-20260704a';
const alphaModelUrl = './tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/m4a3_75_vvss_sherman_alpha_retexture_v2.glb';

root.innerHTML = `
  <main class="control-shell">
    <div class="stage"><canvas aria-label="Alpha Sherman left-stick movement simulation"></canvas></div>
    <div class="hud">
      <section class="readout">
        <p class="kicker">Alpha player character</p>
        <h1>Tank-control input simulation</h1>
        <p>Left stick is camera-relative commander intent. The driver simulation turns that into throttle plus differential steering. Right side drags the camera.</p>
        <div class="meters">
          <div class="meter"><b>left track</b><span data-left-track>0.00</span></div>
          <div class="meter"><b>right track</b><span data-right-track>0.00</span></div>
          <div class="meter"><b>order</b><span data-order>neutral</span></div>
          <div class="meter"><b>heading</b><span data-heading>0 deg</span></div>
          <div class="meter"><b>intent</b><span data-intent>0 deg</span></div>
          <div class="meter"><b>error</b><span data-error>0 deg</span></div>
        </div>
      </section>
      <section class="status">
        <p class="kicker">cloud build</p>
        <h1>${visualQaBuild}</h1>
        <p data-status>loading Alpha</p>
      </section>
    </div>
    <div class="stick-zone" data-stick-zone>
      <div class="stick-base"><div class="stick-knob" data-stick-knob></div></div>
      <span class="zone-label">left stick: driver order</span>
    </div>
    <div class="camera-zone" data-camera-zone>
      <span class="zone-label">right side: camera</span>
    </div>
  </main>
`;

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
const stickZone = root.querySelector<HTMLDivElement>('[data-stick-zone]')!;
const cameraZone = root.querySelector<HTMLDivElement>('[data-camera-zone]')!;
const stickKnob = root.querySelector<HTMLDivElement>('[data-stick-knob]')!;
const leftTrackEl = root.querySelector<HTMLElement>('[data-left-track]')!;
const rightTrackEl = root.querySelector<HTMLElement>('[data-right-track]')!;
const orderEl = root.querySelector<HTMLElement>('[data-order]')!;
const headingEl = root.querySelector<HTMLElement>('[data-heading]')!;
const intentEl = root.querySelector<HTMLElement>('[data-intent]')!;
const errorEl = root.querySelector<HTMLElement>('[data-error]')!;
const statusEl = root.querySelector<HTMLElement>('[data-status]')!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x161912);
scene.fog = new THREE.Fog(0x161912, 12, 34);

const camera = new THREE.PerspectiveCamera(46, 1, 0.08, 80);
const tankRoot = new THREE.Group();
scene.add(tankRoot);

const target = new THREE.Vector3();
const cameraState = { yaw: -0.75, pitch: 0.34, distance: 7.5 };
const drive = {
  x: 0,
  y: 0,
  magnitude: 0,
  desiredYaw: 0,
  headingError: 0,
  targetThrottle: 0,
  targetSteer: 0,
  throttle: 0,
  steer: 0,
  leftTrack: 0,
  rightTrack: 0,
  hullYaw: 0,
  speed: 0,
  loaded: false
};

const hemi = new THREE.HemisphereLight(0xf2ead6, 0x293027, 1.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6bd, 3.5);
sun.position.set(4, 7, 4);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9ebcff, 1.1);
rim.position.set(-5, 3, -4);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80, 28, 28),
  new THREE.MeshStandardMaterial({ color: 0x373624, roughness: 0.95, metalness: 0.0 })
);
ground.rotation.x = -Math.PI * 0.5;
scene.add(ground);

const grid = new THREE.GridHelper(80, 40, 0x6a633f, 0x3e3a29);
grid.position.y = 0.012;
scene.add(grid);

const hullForwardArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1.15, 0), 2.2, 0xb83b37, 0.5, 0.28);
hullForwardArrow.name = 'hull_forward_movement_vector_arrow';
tankRoot.add(hullForwardArrow);

const intentArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.08, 0), 2.8, 0xd5b35d, 0.55, 0.32);
intentArrow.name = 'camera_relative_stick_intent_vector_arrow';
scene.add(intentArrow);

const hedges = new THREE.Group();
for (let i = 0; i < 34; i += 1) {
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(1.8 + Math.random() * 1.4, 1.1 + Math.random() * 0.8, 0.75 + Math.random() * 0.5),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.23 + Math.random() * 0.04, 0.24, 0.18 + Math.random() * 0.08), roughness: 1 })
  );
  const side = i % 2 === 0 ? -1 : 1;
  block.position.set(side * (5.4 + Math.random() * 3.4), block.geometry.parameters.height * 0.5, -24 + i * 1.7);
  block.rotation.y = (Math.random() - 0.5) * 0.45;
  hedges.add(block);
}
scene.add(hedges);

new GLTFLoader().load(alphaModelUrl, (gltf) => {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  model.position.sub(center);
  model.position.y += size.y * 0.5;
  tankRoot.add(model);
  drive.loaded = true;
  statusEl.textContent = 'Alpha loaded';
  postVisualQaBeacon('loaded');
}, undefined, (error) => {
  statusEl.textContent = 'Alpha load failed';
  postVisualQaBeacon('load-failed', { message: error instanceof Error ? error.message : String(error) });
});

let stickPointer: number | null = null;
let cameraPointer: number | null = null;
let lastCameraX = 0;
let lastCameraY = 0;

stickZone.addEventListener('pointerdown', (event) => {
  stickPointer = event.pointerId;
  stickZone.setPointerCapture(event.pointerId);
  updateStick(event);
});

stickZone.addEventListener('pointermove', (event) => {
  if (event.pointerId === stickPointer) updateStick(event);
});

function releaseStick(event: PointerEvent) {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null;
  drive.x = 0;
  drive.y = 0;
  drive.magnitude = 0;
  drive.targetThrottle = 0;
  drive.targetSteer = 0;
  stickKnob.style.transform = 'translate(-50%, -50%)';
}

stickZone.addEventListener('pointerup', releaseStick);
stickZone.addEventListener('pointercancel', releaseStick);

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
  cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + dy * 0.0045, 0.12, 0.82);
});

function releaseCamera(event: PointerEvent) {
  if (event.pointerId === cameraPointer) cameraPointer = null;
}

cameraZone.addEventListener('pointerup', releaseCamera);
cameraZone.addEventListener('pointercancel', releaseCamera);

function updateStick(event: PointerEvent) {
  const base = root.querySelector<HTMLDivElement>('.stick-base')!;
  const rect = base.getBoundingClientRect();
  const radius = rect.width * 0.5;
  const cx = rect.left + radius;
  const cy = rect.top + radius;
  const rawX = (event.clientX - cx) / radius;
  const rawY = (event.clientY - cy) / radius;
  const len = Math.hypot(rawX, rawY);
  const scale = len > 1 ? 1 / len : 1;
  drive.x = rawX * scale;
  drive.y = rawY * scale;
  drive.magnitude = THREE.MathUtils.clamp(len, 0, 1);
  stickKnob.style.transform = `translate(calc(-50% + ${drive.x * radius * 0.56}px), calc(-50% + ${drive.y * radius * 0.56}px))`;
}

function postVisualQaBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualQaBuild,
    actor: 'alpha_player_sherman',
    clip: 'left-stick-real-tank-control-simulation',
    clipKey: 'alpha-control',
    frameMode: 'cloud-visual-truth',
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

function updateDrive(delta: number) {
  const cameraForward = new THREE.Vector3(-Math.sin(cameraState.yaw), 0, -Math.cos(cameraState.yaw));
  const cameraRight = new THREE.Vector3(-cameraForward.z, 0, cameraForward.x);
  const desiredMove = cameraRight.multiplyScalar(drive.x).add(cameraForward.multiplyScalar(-drive.y));
  const desiredMagnitude = Math.min(1, desiredMove.length());
  if (desiredMagnitude > 0.001) {
    desiredMove.normalize();
    drive.desiredYaw = Math.atan2(desiredMove.x, desiredMove.z);
  }
  const headingError = wrapAngle(drive.desiredYaw - drive.hullYaw);
  drive.headingError = headingError;
  const absError = Math.abs(headingError);
  const turnInPlaceBias = THREE.MathUtils.smoothstep(absError, 0.32, 1.35);
  drive.targetThrottle = desiredMagnitude * (1 - turnInPlaceBias * 0.82);
  drive.targetSteer = desiredMagnitude < 0.04 ? 0 : THREE.MathUtils.clamp(headingError / 1.15, -1, 1);

  const smoothing = 1 - Math.exp(-delta * 4.8);
  drive.throttle += (drive.targetThrottle - drive.throttle) * smoothing;
  drive.steer += (drive.targetSteer - drive.steer) * smoothing;

  // Camera-relative commander intent becomes a real tank-style driver order:
  // desired heading -> throttle plus differential left/right track demand.
  // Large heading error produces a pivot before the hull commits forward.
  const steerMix = drive.steer * (0.46 + turnInPlaceBias * 0.42 + Math.abs(drive.throttle) * 0.22);
  drive.leftTrack = THREE.MathUtils.clamp(drive.throttle + steerMix, -1, 1);
  drive.rightTrack = THREE.MathUtils.clamp(drive.throttle - steerMix, -1, 1);

  const forward = (drive.leftTrack + drive.rightTrack) * 0.5;
  const differential = drive.leftTrack - drive.rightTrack;
  drive.speed += ((forward * 3.0) - drive.speed) * (1 - Math.exp(-delta * 2.8));
  drive.hullYaw += differential * delta * 1.15;
  tankRoot.rotation.y = drive.hullYaw;
  tankRoot.position.x += Math.sin(drive.hullYaw) * drive.speed * delta;
  tankRoot.position.z += Math.cos(drive.hullYaw) * drive.speed * delta;

  const limit = 25;
  tankRoot.position.x = THREE.MathUtils.clamp(tankRoot.position.x, -limit, limit);
  tankRoot.position.z = THREE.MathUtils.clamp(tankRoot.position.z, -limit, limit);

  const order =
    desiredMagnitude < 0.06 ? 'neutral' :
    turnInPlaceBias > 0.62 ? 'pivot to camera stick' :
    'advance to camera stick';
  leftTrackEl.textContent = drive.leftTrack.toFixed(2);
  rightTrackEl.textContent = drive.rightTrack.toFixed(2);
  orderEl.textContent = order;
  headingEl.textContent = formatDegrees(drive.hullYaw);
  intentEl.textContent = desiredMagnitude < 0.06 ? '-' : formatDegrees(drive.desiredYaw);
  errorEl.textContent = desiredMagnitude < 0.06 ? '-' : formatDegrees(drive.headingError);
  updateVectorArrows(desiredMove, desiredMagnitude);
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function formatDegrees(radians: number) {
  return String(Math.round(THREE.MathUtils.radToDeg(wrapAngle(radians)))) + ' deg';
}

function updateVectorArrows(desiredMove: THREE.Vector3, desiredMagnitude: number) {
  hullForwardArrow.setDirection(new THREE.Vector3(0, 0, 1));
  intentArrow.position.copy(tankRoot.position);
  intentArrow.position.y = 0.12;
  if (desiredMagnitude > 0.06) {
    intentArrow.visible = true;
    intentArrow.setDirection(desiredMove.clone().normalize());
    intentArrow.setLength(1.4 + desiredMagnitude * 2.2, 0.55, 0.32);
  } else {
    intentArrow.visible = false;
  }
}

function updateCamera() {
  target.copy(tankRoot.position);
  target.y += 0.65;
  const orbit = new THREE.Vector3(
    Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance,
    Math.sin(cameraState.pitch) * cameraState.distance + 1.2,
    Math.cos(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance
  );
  camera.position.copy(target).add(orbit);
  camera.lookAt(target);
}

let lastNow = performance.now();
function animate(now: number) {
  resize();
  const delta = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
  lastNow = now;
  updateDrive(delta);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

postVisualQaBeacon('boot');
requestAnimationFrame(animate);

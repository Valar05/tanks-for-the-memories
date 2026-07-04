import './alpha-control.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyTankDecalProfile } from './tank-decals';

const root = document.querySelector<HTMLDivElement>('#alpha-control-root');
if (!root) throw new Error('missing #alpha-control-root');

const visualQaBuild = 'tftm-alpha-control-parade-clone-20260704q';
const alphaModelUrl = './tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/m4a3_75_vvss_sherman_alpha_retexture_v2.glb';
const params = new URLSearchParams(window.location.search);
const decalDebug = params.get('decalDebug') === '1';

root.innerHTML = '<main class="control-shell">' +
  '<div class="stage"><canvas aria-label="Alpha Sherman parade-source left-stick movement simulation"></canvas></div>' +
  '<div class="hud">' +
    '<section class="readout">' +
      '<p class="kicker">Alpha player character</p>' +
      '<h1>Tank-control input simulation</h1>' +
      '<p>Left stick is camera-relative commander intent. The driver simulation turns that into throttle plus differential steering. Right side drags the camera.</p>' +
      '<div class="meters">' +
        '<div class="meter"><b>left track</b><span data-left-track>0.00</span></div>' +
        '<div class="meter"><b>right track</b><span data-right-track>0.00</span></div>' +
        '<div class="meter"><b>order</b><span data-order>neutral</span></div>' +
        '<div class="meter"><b>heading</b><span data-heading>0 deg</span></div>' +
        '<div class="meter"><b>intent</b><span data-intent>0 deg</span></div>' +
        '<div class="meter"><b>error</b><span data-error>0 deg</span></div>' +
      '</div>' +
    '</section>' +
    '<section class="status">' +
      '<p class="kicker">parade source</p>' +
      '<h1>' + visualQaBuild + '</h1>' +
      '<p data-status>loading accepted Alpha parade tank with runtime decals</p>' +
    '</section>' +
  '</div>' +
  '<div class="stick-zone" data-stick-zone>' +
    '<div class="stick-base"><div class="stick-knob" data-stick-knob></div></div>' +
    '<span class="zone-label">left stick: driver order</span>' +
  '</div>' +
  '<div class="camera-zone" data-camera-zone>' +
    '<span class="zone-label">right side: camera</span>' +
  '</div>' +
'</main>';

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
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181a15);
scene.fog = new THREE.Fog(0x181a15, 14, 36);

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
const tankRoot = new THREE.Group();
scene.add(tankRoot);

const cameraState = { yaw: 0, pitch: 0.42, distance: 9.8 };
const paradeTankYaw = -Math.PI / 2 - 0.18;
const runtimeTreadMaps: THREE.Texture[] = [];
const runtimeWheelObjects: THREE.Object3D[] = [];
let runtimeTurretPivot: THREE.Object3D | null = null;
let runtimeGunPivot: THREE.Object3D | null = null;
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

scene.add(new THREE.HemisphereLight(0xf3ead7, 0x2f352c, 2.0));
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

function bindTankMotionParts(tank: THREE.Object3D) {
  const wheels: THREE.Object3D[] = [];
  const treadMaps: THREE.Texture[] = [];
  tank.traverse((object) => {
    const name = object.name.toLowerCase();
    if (name.includes('mobile_gear_wheel') || name.includes('sprocket') || name.includes('idler') || name.includes('wheel')) {
      wheels.push(object);
    }
    if ((name.includes('turret_traverse_pivot') || name.includes('turret')) && runtimeTurretPivot === null) {
      runtimeTurretPivot = object;
    }
    if ((name.includes('cannon_elevation_pivot') || name.includes('barrel') || name.includes('gun')) && runtimeGunPivot === null) {
      runtimeGunPivot = object;
    }
    const mesh = object as THREE.Mesh;
    if (name.includes('tread_system') && mesh.isMesh) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const map = (material as THREE.MeshStandardMaterial).map;
        if (map) {
          map.wrapS = THREE.RepeatWrapping;
          map.wrapT = THREE.RepeatWrapping;
          treadMaps.push(map);
        }
      }
    }
  });
  return { wheels, treadMaps };
}

new GLTFLoader().load(alphaModelUrl, (gltf) => {
  const model = gltf.scene;
  model.name = 'alpha_parade_source_tank_with_controller';
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  model.position.sub(center);
  model.position.y += size.y * 0.5 - 0.43;
  const decalResult = applyTankDecalProfile(model, 'alpha', { debug: decalDebug });
  model.rotation.y = paradeTankYaw;
  const motionParts = bindTankMotionParts(model);
  runtimeTreadMaps.push(...motionParts.treadMaps);
  runtimeWheelObjects.push(...motionParts.wheels);
  tankRoot.add(model);
  tankRoot.rotation.y = drive.hullYaw;
  drive.loaded = true;
  statusEl.textContent = 'accepted Alpha parade GLB loaded with runtime decals';
  postVisualQaBeacon('loaded', {
    treadMotionBands: runtimeTreadMaps.length,
    wheelMotionObjects: runtimeWheelObjects.length,
    runtimeDecals: decalResult.decalCount,
    visualSource: 'alpha-parade-cloned-scene-retexture-v2-runtime-decals'
  });
}, undefined, (error) => {
  statusEl.textContent = 'Alpha parade source load failed';
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
  cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + dy * 0.0045, 0.18, 0.86);
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
  stickKnob.style.transform = 'translate(calc(-50% + ' + (drive.x * radius * 0.56) + 'px), calc(-50% + ' + (drive.y * radius * 0.56) + 'px))';
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
    drive.desiredYaw = Math.atan2(-desiredMove.z, desiredMove.x);
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
  const steerMix = drive.steer * (0.46 + turnInPlaceBias * 0.42 + Math.abs(drive.throttle) * 0.22);
  drive.leftTrack = THREE.MathUtils.clamp(drive.throttle + steerMix, -1, 1);
  drive.rightTrack = THREE.MathUtils.clamp(drive.throttle - steerMix, -1, 1);

  const forward = (drive.leftTrack + drive.rightTrack) * 0.5;
  const differential = drive.leftTrack - drive.rightTrack;
  drive.speed += ((forward * 3.0) - drive.speed) * (1 - Math.exp(-delta * 2.8));
  drive.hullYaw += differential * delta * 1.15;
  tankRoot.rotation.y = drive.hullYaw;
  tankRoot.position.x += Math.cos(drive.hullYaw) * drive.speed * delta;
  tankRoot.position.z += -Math.sin(drive.hullYaw) * drive.speed * delta;

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
  const motionSign = drive.speed === 0 ? 1 : Math.sign(drive.speed);
  for (const wheel of runtimeWheelObjects) {
    wheel.rotation.z -= delta * 6.2 * motionSign;
  }
  for (const map of runtimeTreadMaps) {
    map.offset.x -= delta * 2.4 * motionSign;
    map.needsUpdate = true;
  }
  if (runtimeTurretPivot && runtimeTurretPivot.parent !== tankRoot) runtimeTurretPivot.rotation.y = Math.sin(performance.now() * 0.00065) * 0.05;
  if (runtimeGunPivot && runtimeGunPivot.parent !== tankRoot) runtimeGunPivot.rotation.z = Math.sin(performance.now() * 0.00105) * 0.035;
  void desiredMove;
  void desiredMagnitude;
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function formatDegrees(radians: number) {
  return String(Math.round(THREE.MathUtils.radToDeg(wrapAngle(radians)))) + ' deg';
}

function updateCamera() {
  const target = tankRoot.position.clone();
  target.y += 0.25;
  const orbit = new THREE.Vector3(
    Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance,
    Math.sin(cameraState.pitch) * cameraState.distance + 0.95,
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

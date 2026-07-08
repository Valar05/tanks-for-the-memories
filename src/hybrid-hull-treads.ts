import './single-tank.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTHORED_SHERMAN_TREADS_GLB_URL, SHERMAN_HYBRID_MESHY_HULL_LOWPOLY_GLB_URL } from './sherman-asset-links';
import { applyAuthoredShermanSharedTextures, applyMeshyShermanSmartMaterial, setAuthoredShermanTreadPhase } from './authored-sherman-shared-materials';
import { createAuthoredShermanInnerBackSidewalls, createAuthoredShermanWheelRuntime, createMovingBeveledTreadLinks, deleteAuthoredShermanStaticTreadBeltMeshes, updateAuthoredShermanWheelRotation, updateMovingBeveledTreadLinks, type MovingTreadLinks, type TreadWheelRuntime } from './authored-sherman-moving-tread-links';

const root = document.querySelector<HTMLDivElement>('#hybrid-hull-treads-root');
if (!root) throw new Error('missing #hybrid-hull-treads-root');

const query = new URLSearchParams(window.location.search);
const tuneParam = query.get('tune');
const tuneKind: 'none' | 'hull' | 'wheels' = tuneParam === 'wheels' ? 'wheels' : tuneParam === '1' || tuneParam === 'hull' ? 'hull' : 'none';
const isTuneMode = tuneKind !== 'none';
const isHullTuneMode = tuneKind === 'hull';
const isWheelTuneMode = tuneKind === 'wheels';
const materialDebugParam = query.get('materialDebug') || 'final';
const rendererMaterialDebugMode = materialDebugParam;
const isNeutralLightingDebug = rendererMaterialDebugMode === 'lightingNeutral';
const hullMaterialDebugModes = new Set(['final', 'albedo', 'normal', 'roughness', 'metalness', 'edge', 'grime', 'dust', 'wear', 'reference']);
const hullMaterialDebugMode = hullMaterialDebugModes.has(materialDebugParam) ? materialDebugParam : 'final';
type TftmDebugWindow = typeof window & { __TFTM_MESHY_HULL_MATERIAL_DEBUG__?: string; __TFTM_MATERIAL_DEBUG__?: string; __TFTM_MATERIAL_DEBUG_REPORT__?: unknown };
const tftmDebugWindow = window as unknown as TftmDebugWindow;
tftmDebugWindow.__TFTM_MESHY_HULL_MATERIAL_DEBUG__ = hullMaterialDebugMode;
tftmDebugWindow.__TFTM_MATERIAL_DEBUG__ = rendererMaterialDebugMode;
const baseVisualBuild = 'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707';
const tunerVisualBuild = isWheelTuneMode ? 'tftm-hybrid-wheel-editor-v2-baked-manual-wheels-20260707' : 'tftm-hybrid-meshy-hull-tuner-v1-20260706';
const visualBuild = isTuneMode ? tunerVisualBuild : baseVisualBuild;
const bakedMeshyHullTransform = {
  position: [-0.04500001668930054, 0.24646830702598294, 0.0034921542366590508] as [number, number, number],
  rotationDeg: [0, 0, 0] as [number, number, number],
  scale: [1.674834354281462, 2.2281003454923995, 2.4233678625822406] as [number, number, number]
};

type TuneMode = 'move' | 'rotate' | 'scale';
type TuneAxis = 'all' | 'screen' | 'x' | 'y' | 'z';
type MeshyHullTunePart = {
  id: string;
  label: string;
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  object?: THREE.Object3D;
};

const tuneParts: MeshyHullTunePart[] = isHullTuneMode ? [
  { id: 'meshy-hull-chassis', label: 'Meshy hull', position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1], visible: true, locked: false }
] : [];
const tuneShell = isTuneMode ? ' is-tuning' : '';
root.innerHTML = '<main class="single-tank-shell' + tuneShell + '">' +
  '<div class="single-tank-stage"><canvas aria-label="Meshy hull socket-fit over authored treads review"></canvas></div>' +
  '<section class="single-tank-readout" aria-label="Hybrid hull and tread readout">' +
    '<p class="single-tank-kicker">hybrid component review</p>' +
    '<p class="single-tank-title">Meshy hull + authored treads</p>' +
    '<p class="single-tank-status" data-status>loading socket-fit Meshy hull with authored tread module</p>' +
  '</section>' +
  (isTuneMode ? '<section class="tune-parts-panel is-collapsed" aria-label="Editable parts" data-parts-panel>' +
    '<button class="tune-parts-toggle" type="button" data-toggle-parts><span data-selected-label>' + (isWheelTuneMode ? 'Wheel editor' : 'Meshy hull') + '</span><span data-parts-caret>Parts</span></button>' +
    '<div class="tune-parts-list" data-parts-list></div>' +
  '</section>' +
  '<section class="tune-dock" aria-label="Gesture transform controls" data-tune-dock>' +
    '<div class="tune-active"><span data-mode-label>Move / Screen</span><button type="button" data-export-tune>Export</button></div>' +
    '<div class="tune-row tune-mode-row" data-mode-row><button type="button" data-mode="move">Move</button><button type="button" data-mode="rotate">Rotate</button><button type="button" data-mode="scale">Scale</button></div>' +
    '<div class="tune-row tune-axis-row" data-axis-row><button type="button" data-axis="all">All</button><button type="button" data-axis="x">X</button><button type="button" data-axis="y">Y</button><button type="button" data-axis="z">Z</button></div>' +
    '<div class="tune-row tune-action-row"><button type="button" data-undo>Undo</button><button type="button" data-redo>Redo</button><button type="button" data-reset-part>Reset</button><button type="button" data-toggle-visible>Hide</button></div>' +
  '</section>' : '') +
  '<section class="orientation-widget" aria-label="Camera orientation widget" data-orientation-widget>' +
    '<button type="button" data-camera-view="front">Front</button><button type="button" data-camera-view="left">Left</button><button type="button" data-camera-view="top">Top</button><button type="button" data-camera-view="right">Right</button><button type="button" data-camera-view="back">Back</button>' +
  '</section>' +
  (isTuneMode ? '<section class="tune-export" hidden aria-label="Tune export"><textarea data-export-output readonly></textarea></section>' : '') +
'</main>';

const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
const statusEl = root.querySelector<HTMLElement>('[data-status]')!;
const partsPanel = root.querySelector<HTMLElement>('[data-parts-panel]');
const partsToggle = root.querySelector<HTMLButtonElement>('[data-toggle-parts]');
const partsListEl = root.querySelector<HTMLDivElement>('[data-parts-list]');
const selectedLabelEl = root.querySelector<HTMLElement>('[data-selected-label]');
const modeLabelEl = root.querySelector<HTMLElement>('[data-mode-label]');
const exportPanel = root.querySelector<HTMLElement>('.tune-export');
const exportOutput = root.querySelector<HTMLTextAreaElement>('[data-export-output]');

const runtimeClock = new THREE.Clock();
let treadPhase = 0;
const treadForwardScrollRate = 1.35;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = isNeutralLightingDebug ? 0.88 : 1.03;

const scene = new THREE.Scene();
scene.background = new THREE.Color(isNeutralLightingDebug ? 0x1b1d1a : 0x141611);
scene.fog = new THREE.Fog(isNeutralLightingDebug ? 0x1b1d1a : 0x141611, 9, 24);
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

scene.add(new THREE.HemisphereLight(isNeutralLightingDebug ? 0xf0f0e8 : 0xf4ead4, isNeutralLightingDebug ? 0x30342d : 0x252a20, isNeutralLightingDebug ? 1.35 : 2.0));
const key = new THREE.DirectionalLight(isNeutralLightingDebug ? 0xf5f1df : 0xffefd1, isNeutralLightingDebug ? 1.45 : 3.0);
key.position.set(3.8, 4.8, 3.0);
scene.add(key);
const rim = new THREE.DirectionalLight(isNeutralLightingDebug ? 0xd1d6c8 : 0x9bb4ff, isNeutralLightingDebug ? 0.35 : 1.1);
rim.position.set(-3.5, 2.4, -4.0);
scene.add(rim);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshStandardMaterial({ color: 0x302d22, roughness: 0.96, metalness: 0.0 }));
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.47;
scene.add(floor);

const reviewGroup = new THREE.Group();
reviewGroup.name = 'sherman_hybrid_meshy_hull_authored_treads_v1_socket_fit_review';
scene.add(reviewGroup);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hullMeshes: THREE.Mesh[] = [];
let loaded = 0;
let treadsScene: THREE.Object3D | null = null;
let movingTreadLinks: MovingTreadLinks | null = null;
let treadWheelRuntime: TreadWheelRuntime | null = null;
let innerBackSidewalls: THREE.Group | null = null;
let hullScene: THREE.Object3D | null = null;
let selectedPart: MeshyHullTunePart | null = isHullTuneMode ? tuneParts[0] : null;
let currentMode: TuneMode = 'move';
let currentAxis: TuneAxis = 'screen';
let partsOpen = false;
let gestureState: { pointerId: number; part: MeshyHullTunePart; lastX: number; lastY: number; moved: boolean; tapCanCycle: boolean } | null = null;
const pointerPositions = new Map<number, { x: number; y: number }>();
let lastPinchDistance = 0;
let lastTwistAngle = 0;
const tuneMeshes: THREE.Object3D[] = [];
const undoStack: string[] = [];
const redoStack: string[] = [];
let initialTuneSnapshot = '';

root.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => {
  button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front'));
});
if (isTuneMode) {
  bindTuneUi();
  bindGestureControls();
  renderTuneUi();
}

function snapCamera(view: string) {
  const focus = selectedPart ? selectedPart.object?.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)) || new THREE.Vector3(selectedPart.position[0], selectedPart.position[1] + 0.1, selectedPart.position[2]) : new THREE.Vector3(0, 0.05, 0);
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

function fitHullToTreads() {
  if (!treadsScene || !hullScene) return;
  hullScene.position.set(bakedMeshyHullTransform.position[0], bakedMeshyHullTransform.position[1], bakedMeshyHullTransform.position[2]);
  hullScene.rotation.set(
    THREE.MathUtils.degToRad(bakedMeshyHullTransform.rotationDeg[0]),
    THREE.MathUtils.degToRad(bakedMeshyHullTransform.rotationDeg[1]),
    THREE.MathUtils.degToRad(bakedMeshyHullTransform.rotationDeg[2])
  );
  hullScene.scale.set(bakedMeshyHullTransform.scale[0], bakedMeshyHullTransform.scale[1], bakedMeshyHullTransform.scale[2]);
  hullScene.name = 'sherman_hybrid_meshy_hull_lowpoly_v1_user_tuned_runtime_fit';
  hullScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) child.name = child.name || 'meshy_lowpoly_hull_surface_socket_inner_sidewall_fit';
  });
}

function syncTunePartFromHull() {
  if (!hullScene || !isHullTuneMode) return;
  const part = tuneParts[0];
  part.object = hullScene;
  part.position = [hullScene.position.x, hullScene.position.y, hullScene.position.z];
  part.rotationDeg = [THREE.MathUtils.radToDeg(hullScene.rotation.x), THREE.MathUtils.radToDeg(hullScene.rotation.y), THREE.MathUtils.radToDeg(hullScene.rotation.z)];
  part.scale = [hullScene.scale.x, hullScene.scale.y, hullScene.scale.z];
  part.visible = hullScene.visible;
  initialTuneSnapshot = serializeTuneParts();
  renderTuneUi();
  applyTuneToUrl();
}

function textureDebugSummary(texture: THREE.Texture | null | undefined) {
  if (!texture) return null;
  return {
    name: texture.name || 'unnamed',
    url: String(texture.userData?.url || ''),
    colorSpace: String(texture.colorSpace || ''),
    wrapS: texture.wrapS,
    wrapT: texture.wrapT,
    repeat: [texture.repeat.x, texture.repeat.y],
    flipY: texture.flipY,
    anisotropy: texture.anisotropy
  };
}
function materialDebugSummary(material: THREE.Material, roleHint: string) {
  const mat = material as THREE.MeshStandardMaterial & THREE.MeshBasicMaterial;
  return {
    name: mat.name || 'unnamed',
    role: String(mat.userData?.tftmMaterialRole || mat.userData?.meshyShermanSmartMaterial?.role || roleHint || 'unknown'),
    type: mat.type,
    roughness: typeof mat.roughness === 'number' ? mat.roughness : null,
    metalness: typeof mat.metalness === 'number' ? mat.metalness : null,
    normalScale: mat.normalScale ? [mat.normalScale.x, mat.normalScale.y] : null,
    envMapIntensity: typeof mat.envMapIntensity === 'number' ? mat.envMapIntensity : null,
    emissiveIntensity: typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : null,
    toneMapped: typeof mat.toneMapped === 'boolean' ? mat.toneMapped : null,
    map: textureDebugSummary(mat.map),
    normalMap: textureDebugSummary(mat.normalMap),
    roughnessMap: textureDebugSummary(mat.roughnessMap),
    metalnessMap: textureDebugSummary(mat.metalnessMap)
  };
}
function buildMaterialDebugReport() {
  const byKey = new Map<string, ReturnType<typeof materialDebugSummary> & { meshCount: number; meshes: string[] }>();
  reviewGroup.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      const summary = materialDebugSummary(material, mesh.name);
      const key = summary.role + '|' + summary.name + '|' + summary.type;
      const existing = byKey.get(key);
      if (existing) {
        existing.meshCount += 1;
        if (existing.meshes.length < 8) existing.meshes.push(mesh.name || 'unnamed-mesh');
      } else {
        byKey.set(key, { ...summary, meshCount: 1, meshes: [mesh.name || 'unnamed-mesh'] });
      }
    }
  });
  const materials = [...byKey.values()].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  return {
    build: visualBuild,
    materialDebug: rendererMaterialDebugMode,
    hullMaterialDebug: hullMaterialDebugMode,
    neutralLighting: isNeutralLightingDebug,
    materialCount: materials.length,
    roles: [...new Set(materials.map((material) => material.role))],
    materials
  };
}

function onLoaded() {
  loaded += 1;
  if (loaded !== 2) return;
  fitHullToTreads();
  const materialDebugReport = buildMaterialDebugReport();
  tftmDebugWindow.__TFTM_MATERIAL_DEBUG_REPORT__ = materialDebugReport;
  const box = new THREE.Box3().setFromObject(reviewGroup);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  reviewGroup.position.sub(center);
  reviewGroup.position.y += size.y * 0.5 - 0.46;
  reviewGroup.rotation.y = -Math.PI / 2 - 0.12;
  if (isHullTuneMode) {
    syncTunePartFromHull();
    statusEl.textContent = 'loaded Meshy hull tuner: drag the Meshy hull, pinch scale, twist rotate; authored treads are fixed reference';
    postVisualBeacon('loaded', { hullTask: '019f3830-6c43-7ffc-b3a1-8013825d622e', tuneParts: tuneParts.length });
  } else if (isWheelTuneMode) {
    initializeWheelTuneParts();
    statusEl.textContent = 'loaded wheel editor v1: select wheel rows, drag to move, Hide deletes a bad wheel, Export saves wheel JSON for one-side edit and later symmetry';
    postVisualBeacon('loaded', { hullTask: '019f3830-6c43-7ffc-b3a1-8013825d622e', tuneParts: tuneParts.length, wheelEditor: 1 });
  } else {
    statusEl.textContent = 'loaded hybrid v1.34: Meshy hull uses baked hull material v1 bound to the Meshy UVs; materialDebug=' + rendererMaterialDebugMode + ' exposes hull and running-gear final/albedo/normal/roughness/metalness maps, plus lightingNeutral; generated paint replaces flat overlay and unwanted diffuse markings; baked transform preserved; track shoes keep accepted albedo but use matte connected-loop segment geometry with outward-wound normals and edge-only painted metalness; replacement wheels use shared albedo plus normal/roughness/metalness PBR maps, all wheel centers sit on the tread lane, accepted manual wheel JSON is baked symmetrically, duplicate/under-floor wheels are deleted, and connected tread segment travel is reversed while wheel spin stays correct, and sealed inboard sidewall backing underlaps the tread profile; static belt remains deleted; wheels spin independently; no bridge planes, no authored chassis, no Meshy treads, no turret';
    postVisualBeacon('loaded', { hullTask: '019f3830-6c43-7ffc-b3a1-8013825d622e', hullFit: 'user-exported-meshy-hull-transform-no-added-geometry', hullMaterial: 'meshy-hybrid-hull-material-v1-baked-reference-masks', hullMaterialTextureSet: 'sherman_hybrid_meshy_hull_material_v1_baked_reference_masks_20260707', materialDebug: rendererMaterialDebugMode, hullMaterialDebug: hullMaterialDebugMode, materialDebugRoles: materialDebugReport.roles.join('|'), materialDebugMaterialCount: materialDebugReport.materialCount, neutralLighting: isNeutralLightingDebug ? 1 : 0, diffusePolicy: 'embedded-meshy-reference-generated-hull-uv-material-v1', treadScroll: 'forward-material-phase-moving-beveled-links', movingLinks: movingTreadLinks ? movingTreadLinks.linkCountPerSide * 2 : 0, movingLinksRuntime: movingTreadLinks ? movingTreadLinks.runtimeId : 'not-created', deletedStaticTreadBeltMeshes: treadsScene?.userData.deletedStaticTreadBeltMeshes || 0, wheelSpinNodes: treadWheelRuntime ? treadWheelRuntime.runtimeWheelMeshes : 0, runtimeWheelMeshes: treadWheelRuntime ? treadWheelRuntime.runtimeWheelMeshes : 0, wheelSpinRuntime: treadWheelRuntime ? treadWheelRuntime.runtimeId : 'not-created', wheelRead: 'shared-wheel-pbr-albedo-normal-roughness-metalness', roadwheelContact: 'reversed-tread-phase-deduped-roadwheel-row-curve-contact', wheelMaterialStyle: 'authored-sherman-runtime-wheel-material-v5-pbr-edge-grime-contact', innerBackSidewalls: innerBackSidewalls ? innerBackSidewalls.children.length : 0, wheelTrackCenter: 'all-wheels-centered-on-moving-tread-lane', sealedSidewall: 'profile-underlap-no-visible-slit', roadwheelRowContact: 'front-and-back-roadwheels-shifted-farther-to-curved-returns-duplicates-pruned-no-top-roller-placement', treadDirection: 'moving-link-phase-reversed-wheel-spin-unchanged', treadShoeTextureSet: 'downloaded-pbr-face-aware-uv', treadMetalness: 'painted-metal-map-edge-only-cap-0.16', contactGrime: 'under-hull-running-gear-band', tunedScaleX: bakedMeshyHullTransform.scale[0], tunedScaleY: bakedMeshyHullTransform.scale[1], tunedScaleZ: bakedMeshyHullTransform.scale[2] });
  }
}

const loader = new GLTFLoader();
loader.load(AUTHORED_SHERMAN_TREADS_GLB_URL, (gltf) => {
  treadsScene = gltf.scene;
  gltf.scene.name = 'authored_sherman_treads_v1_fixed_tuner_reference';
  applyAuthoredShermanSharedTextures(gltf.scene);
  const deletedStaticTreadBeltMeshes = deleteAuthoredShermanStaticTreadBeltMeshes(gltf.scene);
  innerBackSidewalls = createAuthoredShermanInnerBackSidewalls(gltf.scene);
  treadWheelRuntime = createAuthoredShermanWheelRuntime(gltf.scene);
  if (!isHullTuneMode) movingTreadLinks = createMovingBeveledTreadLinks(gltf.scene);
  gltf.scene.userData.deletedStaticTreadBeltMeshes = deletedStaticTreadBeltMeshes;
  reviewGroup.add(gltf.scene);
  onLoaded();
}, undefined, (error) => {
  statusEl.textContent = 'authored tread module load failed';
  postVisualBeacon('load-failed', { asset: 'treads', message: error instanceof Error ? error.message : String(error) });
});
loader.load(SHERMAN_HYBRID_MESHY_HULL_LOWPOLY_GLB_URL, (gltf) => {
  hullScene = gltf.scene;
  gltf.scene.name = 'sherman_hybrid_meshy_hull_lowpoly_v1';
  applyMeshyShermanSmartMaterial(gltf.scene, 'hullArmor');
  if (isHullTuneMode) tuneParts[0].object = gltf.scene;
  gltf.scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (isHullTuneMode) {
        mesh.userData.tunePartId = 'meshy-hull-chassis';
        hullMeshes.push(mesh);
        tuneMeshes.push(mesh);
      }
    }
  });
  reviewGroup.add(gltf.scene);
  onLoaded();
}, undefined, (error) => {
  statusEl.textContent = 'Meshy hull load failed';
  postVisualBeacon('load-failed', { asset: 'meshy-hull', message: error instanceof Error ? error.message : String(error) });
});


function initializeWheelTuneParts() {
  if (!isWheelTuneMode || !treadWheelRuntime) return;
  tuneParts.length = 0;
  tuneMeshes.length = 0;
  treadWheelRuntime.group.updateWorldMatrix(true, true);
  treadWheelRuntime.wheels.forEach((wheel, index) => {
    const object = wheel.object;
    object.userData.tunePartId = 'wheel-' + String(index).padStart(2, '0');
    object.userData.runtimeWheelTuneSideSign = wheel.sideSign;
    const source = String(object.userData.sourceWheelNode || object.name || 'wheel');
    const part: MeshyHullTunePart = {
      id: object.userData.tunePartId,
      label: (wheel.sideSign > 0 ? 'Right ' : 'Left ') + source.replace(/^runtime_centered_/, ''),
      position: [object.position.x, object.position.y, object.position.z],
      rotationDeg: [THREE.MathUtils.radToDeg(object.rotation.x), THREE.MathUtils.radToDeg(object.rotation.y), THREE.MathUtils.radToDeg(object.rotation.z)],
      scale: [object.scale.x, object.scale.y, object.scale.z],
      visible: object.visible,
      locked: false,
      object
    };
    tuneParts.push(part);
    tuneMeshes.push(object);
  });
  selectedPart = tuneParts.find((part) => part.visible) || tuneParts[0] || null;
  initialTuneSnapshot = serializeTuneParts();
  renderTuneUi();
  applyTuneToUrl();
}

function bindTuneUi() {
  partsToggle?.addEventListener('click', () => setPartsOpen(!partsOpen));
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      currentMode = button.dataset.mode as TuneMode;
      currentAxis = currentMode === 'scale' ? 'all' : 'screen';
      renderTuneUi();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => {
    button.addEventListener('click', () => {
      currentAxis = button.dataset.axis as TuneAxis;
      renderTuneUi();
    });
  });
  root.querySelector<HTMLButtonElement>('[data-export-tune]')?.addEventListener('click', exportTune);
  root.querySelector<HTMLButtonElement>('[data-toggle-visible]')?.addEventListener('click', () => {
    if (!selectedPart) return;
    pushUndo();
    selectedPart.visible = !selectedPart.visible;
    applyPartTransform(selectedPart);
    renderTuneUi();
    applyTuneToUrl();
  });
  root.querySelector<HTMLButtonElement>('[data-reset-part]')?.addEventListener('click', () => {
    if (!selectedPart || !initialTuneSnapshot) return;
    const initial = JSON.parse(initialTuneSnapshot).parts.find((part: MeshyHullTunePart) => part.id === selectedPart?.id);
    if (!initial) return;
    pushUndo();
    selectedPart.position = initial.position;
    selectedPart.rotationDeg = initial.rotationDeg;
    selectedPart.scale = initial.scale;
    selectedPart.visible = initial.visible;
    applyPartTransform(selectedPart);
    renderTuneUi();
    applyTuneToUrl();
  });
  root.querySelector<HTMLButtonElement>('[data-undo]')?.addEventListener('click', undoTune);
  root.querySelector<HTMLButtonElement>('[data-redo]')?.addEventListener('click', redoTune);
}

function renderTuneUi() {
  if (!isTuneMode) return;
  if (partsListEl) {
    partsListEl.innerHTML = '';
    for (const part of tuneParts) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.partId = part.id;
      button.className = 'tune-part-row' + (part === selectedPart ? ' is-selected' : '') + (!part.visible ? ' is-hidden' : '');
      button.setAttribute('aria-pressed', String(part === selectedPart));
      button.textContent = part.label;
      button.addEventListener('click', () => {
        selectPart(part);
        setPartsOpen(false);
      });
      partsListEl.appendChild(button);
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('is-selected', button.dataset.mode === currentMode));
  root.querySelectorAll<HTMLButtonElement>('[data-axis]').forEach((button) => {
    const axis = button.dataset.axis as TuneAxis;
    button.classList.toggle('is-selected', axis === currentAxis);
    button.hidden = currentMode !== 'scale' && axis === 'all';
  });
  if (selectedLabelEl) selectedLabelEl.textContent = selectedPart ? selectedPart.label : 'No part';
  if (modeLabelEl) modeLabelEl.textContent = modeLabel();
  const visibleButton = root.querySelector<HTMLButtonElement>('[data-toggle-visible]');
  if (visibleButton) visibleButton.textContent = selectedPart?.visible ? 'Hide' : 'Show';
  partsPanel?.classList.toggle('is-collapsed', !partsOpen);
}
function setPartsOpen(open: boolean) { partsOpen = open; renderTuneUi(); }

function bindGestureControls() {
  canvas.addEventListener('pointerdown', (event) => {
    if (!isTuneMode || event.button !== 0) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.size === 2) {
      lastPinchDistance = getPointerDistance();
      lastTwistAngle = getPointerAngle();
      if (gestureState) controls.enabled = false;
      return;
    }
    const hit = pickTunePart(event.clientX, event.clientY);
    if (!hit) return;
    const wasSelected = hit === selectedPart;
    selectPart(hit);
    controls.enabled = false;
    gestureState = { pointerId: event.pointerId, part: hit, lastX: event.clientX, lastY: event.clientY, moved: false, tapCanCycle: wasSelected };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!isTuneMode) return;
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gestureState && pointerPositions.size >= 2) { handleTwoFingerGesture(); return; }
    if (!gestureState || event.pointerId !== gestureState.pointerId) return;
    const dx = event.clientX - gestureState.lastX;
    const dy = event.clientY - gestureState.lastY;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    pushUndoOncePerGesture();
    transformByGesture(gestureState.part, dx, dy);
    gestureState.lastX = event.clientX;
    gestureState.lastY = event.clientY;
    gestureState.moved = true;
    applyPartTransform(gestureState.part);
    renderTuneUi();
    applyTuneToUrl();
  });
  canvas.addEventListener('pointerup', endGesture);
  canvas.addEventListener('pointercancel', endGesture);
}
function pickTunePart(clientX: number, clientY: number) {
  if (!tuneMeshes.length) return selectedPart;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(tuneMeshes, false);
  if (!hits.length) return null;
  const id = hits[0].object.userData.tunePartId;
  return tuneParts.find((part) => part.id === id) || null;
}
function handleTwoFingerGesture() {
  if (!gestureState) return;
  const part = gestureState.part;
  const distance = getPointerDistance();
  const angle = getPointerAngle();
  pushUndoOncePerGesture();
  if (currentMode === 'scale' && lastPinchDistance > 0) scalePart(part, (distance - lastPinchDistance) * 0.006);
  if (currentMode === 'rotate' && Number.isFinite(lastTwistAngle)) rotatePart(part, THREE.MathUtils.radToDeg(angle - lastTwistAngle));
  lastPinchDistance = distance;
  lastTwistAngle = angle;
  gestureState.moved = true;
  applyPartTransform(part);
  renderTuneUi();
  applyTuneToUrl();
}
function endGesture(event: PointerEvent) {
  pointerPositions.delete(event.pointerId);
  if (gestureState && event.pointerId === gestureState.pointerId) {
    if (!gestureState.moved && gestureState.tapCanCycle) cycleMode();
    gestureState = null;
    controls.enabled = true;
  }
  if (pointerPositions.size < 2) { lastPinchDistance = 0; lastTwistAngle = 0; }
}
function transformByGesture(part: MeshyHullTunePart, dx: number, dy: number) {
  if (currentMode === 'move') movePart(part, dx, dy);
  if (currentMode === 'rotate') rotatePart(part, (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * 0.28);
  if (currentMode === 'scale') scalePart(part, (dx - dy) * 0.004);
}
function movePart(part: MeshyHullTunePart, dx: number, dy: number) {
  const amount = 0.006;
  if (currentAxis === 'screen') {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const delta = right.multiplyScalar(dx * amount).add(up.multiplyScalar(-dy * amount));
    part.position[0] += delta.x; part.position[1] += delta.y; part.position[2] += delta.z;
    return;
  }
  const value = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * amount;
  if (currentAxis === 'x') part.position[0] += value;
  if (currentAxis === 'y') part.position[1] += value;
  if (currentAxis === 'z') part.position[2] += value;
}
function rotatePart(part: MeshyHullTunePart, degrees: number) {
  if (currentAxis === 'screen') { part.rotationDeg[1] += degrees; return; }
  if (currentAxis === 'x') part.rotationDeg[0] += degrees;
  if (currentAxis === 'y') part.rotationDeg[1] += degrees;
  if (currentAxis === 'z') part.rotationDeg[2] += degrees;
}
function scalePart(part: MeshyHullTunePart, delta: number) {
  if (currentAxis === 'all' || currentAxis === 'screen') {
    part.scale[0] = Math.max(0.05, part.scale[0] + delta);
    part.scale[1] = Math.max(0.05, part.scale[1] + delta);
    part.scale[2] = Math.max(0.05, part.scale[2] + delta);
  }
  if (currentAxis === 'x') part.scale[0] = Math.max(0.05, part.scale[0] + delta);
  if (currentAxis === 'y') part.scale[1] = Math.max(0.05, part.scale[1] + delta);
  if (currentAxis === 'z') part.scale[2] = Math.max(0.05, part.scale[2] + delta);
}
function applyPartTransform(part: MeshyHullTunePart) {
  const object = part.object;
  if (!object) return;
  object.position.set(part.position[0], part.position[1], part.position[2]);
  object.rotation.set(THREE.MathUtils.degToRad(part.rotationDeg[0]), THREE.MathUtils.degToRad(part.rotationDeg[1]), THREE.MathUtils.degToRad(part.rotationDeg[2]));
  object.scale.set(part.scale[0], part.scale[1], part.scale[2]);
  object.visible = part.visible;
}
function selectPart(part: MeshyHullTunePart) {
  selectedPart = part;
  applyPartTransform(part);
  const world = part.object?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(part.position[0], part.position[1], part.position[2]);
  controls.target.set(world.x, world.y + 0.1, world.z);
  controls.update();
  renderTuneUi();
  postVisualBeacon('select-part', { part: part.id });
}
function cycleMode() {
  currentMode = currentMode === 'move' ? 'rotate' : currentMode === 'rotate' ? 'scale' : 'move';
  currentAxis = currentMode === 'scale' ? 'all' : 'screen';
  renderTuneUi();
}
function getPointerDistance() { const points = [...pointerPositions.values()]; return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); }
function getPointerAngle() { const points = [...pointerPositions.values()]; return points.length < 2 ? 0 : Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x); }
function axisLabel() { if (currentAxis === 'all') return 'All'; return currentAxis === 'screen' ? 'Screen' : currentAxis.toUpperCase(); }
function modeLabel() { return (currentMode[0].toUpperCase() + currentMode.slice(1)) + ' / ' + axisLabel(); }
function pushUndo() { undoStack.push(serializeTuneParts()); redoStack.length = 0; }
function pushUndoOncePerGesture() { if (!gestureState || gestureState.moved) return; pushUndo(); gestureState.moved = true; }
function undoTune() { if (!undoStack.length) return; redoStack.push(serializeTuneParts()); restoreTuneParts(undoStack.pop()!); }
function redoTune() { if (!redoStack.length) return; undoStack.push(serializeTuneParts()); restoreTuneParts(redoStack.pop()!); }
function serializeTuneParts() {
  return JSON.stringify({
    version: 1,
    build: tunerVisualBuild,
    coordinateSpace: 'hybrid-hull-treads-runtime-review-group',
    editable: isWheelTuneMode ? 'authored_sherman_runtime_wheels' : 'sherman_hybrid_meshy_hull_lowpoly_v1',
    fixedReference: isWheelTuneMode ? 'authored_sherman_treads_v1_and_meshy_hull' : 'authored_sherman_treads_v1',
    symmetryPolicy: isWheelTuneMode ? 'edit one side manually; Codex mirrors accepted wheel positions by sideSign later' : 'not-applicable',
    parts: tuneParts.map((part) => ({ id: part.id, label: part.label, position: part.position, rotationDeg: part.rotationDeg, scale: part.scale, visible: part.visible, locked: part.locked, sourceWheelNode: part.object?.userData.sourceWheelNode || '', sideSign: part.object?.userData.runtimeWheelTuneSideSign || 0 }))
  }, null, 2);
}
function restoreTuneParts(snapshot: string) {
  const parsed = JSON.parse(snapshot) as { parts: MeshyHullTunePart[] };
  for (const saved of parsed.parts) {
    const part = tuneParts.find((candidate) => candidate.id === saved.id);
    if (!part) continue;
    part.position = [...saved.position] as [number, number, number];
    part.rotationDeg = [...saved.rotationDeg] as [number, number, number];
    part.scale = [...saved.scale] as [number, number, number];
    part.visible = saved.visible;
    applyPartTransform(part);
  }
  renderTuneUi(); applyTuneToUrl();
}
function exportTune() {
  const json = serializeTuneParts();
  localStorage.setItem(isWheelTuneMode ? 'tftm.hybridWheelTune.v1' : 'tftm.meshyHullTune.v1', json);
  if (exportPanel && exportOutput) { exportPanel.hidden = false; exportOutput.value = json; }
  applyTuneToUrl();
  postVisualBeacon('tune-export', { tuneParts: tuneParts.length });
}
function applyTuneToUrl() {
  if (!isTuneMode || !initialTuneSnapshot) return;
  const encoded = btoa(unescape(encodeURIComponent(serializeTuneParts()))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const tuneQuery = isWheelTuneMode ? '?tune=wheels#hybridWheelTune=' : '?tune=1#meshyHullTune=';
  window.history.replaceState(null, '', window.location.pathname + tuneQuery + encoded);
}
function postVisualBeacon(stage: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    stage,
    build: visualBuild,
    actor: 'sherman_hybrid_meshy_hull_authored_treads_v1',
    clip: isWheelTuneMode ? 'Gesture-only runtime wheel editor' : isHullTuneMode ? 'Gesture-only Meshy hull transform tuner' : 'Meshy hull socket-fit over authored tread module review',
    clipKey: isWheelTuneMode ? 'hybrid-hull-treads-wheel-editor' : isHullTuneMode ? 'hybrid-hull-treads-meshy-hull-tuner' : 'hybrid-hull-treads',
    sourceName: 'tanks-for-the-memories',
    tuneMode: isTuneMode ? '1' : '0',
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
  const delta = runtimeClock.getDelta();
  if (treadsScene && !isTuneMode) {
    treadPhase += delta * treadForwardScrollRate;
    setAuthoredShermanTreadPhase(treadsScene, treadPhase);
    updateMovingBeveledTreadLinks(movingTreadLinks, -treadPhase);
    updateAuthoredShermanWheelRotation(treadWheelRuntime, treadPhase);
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
postVisualBeacon('boot', isTuneMode ? { tuneParts: tuneParts.length } : {});
requestAnimationFrame(animate);

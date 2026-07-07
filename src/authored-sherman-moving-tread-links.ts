import * as THREE from 'three';
import {
  AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ALBEDO_URL,
  AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_NORMAL_URL,
  AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ROUGHNESS_URL,
  AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_METALNESS_URL,
  AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID,
  AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL,
  AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL,
  AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL,
  AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL,
  AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID
} from './sherman-asset-links';

export const MOVING_TREAD_LINKS_RUNTIME_ID = 'authored-sherman-connected-loop-tread-segments-v1-matte';
export const STATIC_TREAD_BELT_DELETE_RUNTIME_ID = 'authored-sherman-static-tread-belt-deleted-v2';
export const RUNTIME_WHEEL_SPIN_RUNTIME_ID = 'authored-sherman-runtime-manual-wheel-tune-v1-symmetrized-no-underfloor-dupes';
export const RUNTIME_WHEEL_MATERIAL_STYLE_ID = 'authored-sherman-runtime-wheel-material-v5-pbr-edge-grime-contact';
export const RUNTIME_INNER_BACK_SIDEWALL_ID = 'authored-sherman-runtime-inner-back-sidewall-v2-sealed';
export const RUNTIME_RUNNING_GEAR_TEXTURE_STYLE_ID = 'authored-sherman-runtime-running-gear-texture-v4-pbr-edge-grime-metal';
export const MOVING_TREAD_LINKS_PER_SIDE = 60;

const OUTER_PROFILE: Array<[number, number]> = [
  [-1.62, -0.04],
  [-1.60, 0.055],
  [-1.52, 0.125],
  [-0.96, 0.150],
  [0.68, 0.150],
  [1.16, 0.118],
  [1.42, 0.035],
  [1.56, -0.075],
  [1.51, -0.205],
  [1.34, -0.330],
  [1.08, -0.405],
  [0.18, -0.438],
  [-1.16, -0.438],
  [-1.43, -0.350],
  [-1.58, -0.215],
  [-1.65, -0.108]
];

const LINK_THICKNESS = 0.034;
const LINK_WIDTH = 0.235;
const OUTER_SIDE_Z = 1.162;
const PROFILE_OUTSET = 0.018;
const PHASE_TO_PATH = 0.075;
const TREAD_LINK_PAINTED_METALNESS_MAX = 0.16;
const TREAD_LINK_NORMAL_SCALE = 0.82;
const TREAD_LINK_MATTE_ROUGHNESS = 0.98;
const CONNECTED_TREAD_SEGMENT_VERTEX_COUNT = 36;
const CONNECTED_TREAD_LOOP_GEOMETRY_POLICY = 'rear edge of segment i uses the same path sample as front edge of segment i+1; pair-of-parallel-loops visual continuity without hinge physics; outward-wound broad tread plate normals';
const ROADWHEEL_CONTACT_BOTTOM_Y = -0.438;
const ROADWHEEL_CONTACT_OVERLAP = 0.006;
const ROADWHEEL_CONTACT_RADIUS_SCALE = 1.10;
const SPROCKET_IDLER_CONTACT_RADIUS_SCALE = 1.08;
const FRONT_REAR_ROADWHEEL_EXTRA_CONTACT_DROP = 0.006;
const FRONT_ROADWHEEL_CURVE_CONTACT_X = -1.39;
const REAR_ROADWHEEL_CURVE_CONTACT_X = 1.24;
const ROADWHEEL_DUPLICATE_X_EPSILON = 0.18;
const RUNTIME_WHEEL_TRACK_CENTER_Z = OUTER_SIDE_Z;
const INNER_BACK_SIDEWALL_Z = 0.835;
const INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET = 0.036;

const MANUAL_WHEEL_TUNE_RUNTIME_ID = 'manual-wheel-json-20260707-symmetrized-delete-underfloor-dupes';
type ManualWheelTune = {
  position: [number, number, number];
  rotationDeg?: [number, number, number];
  scale?: [number, number, number];
};

const MANUAL_DELETED_WHEEL_SOURCE_NODES = new Set([
  'left_return_roller_1_mesh_1',
  'left_return_roller_2_mesh_1',
  'left_return_roller_3_mesh_1',
  'left_roadwheel_2_mesh',
  'left_roadwheel_3_mesh',
  'left_roadwheel_4_mesh',
  'left_roadwheel_5_mesh'
]);

const MANUAL_WHEEL_TUNE_BY_SOURCE_NODE: Record<string, ManualWheelTune> = {
  left_front_sprocket_mesh: { position: [1.3834060530662537, -0.13000000175088644, 1.162] },
  left_front_sprocket_mesh_1: { position: [1.0756660933494577, -0.02172726242989336, 1.162] },
  left_rear_idler_mesh: { position: [-1.25, -0.11799999885261059, 0.7169782714843745], rotationDeg: [0, 0, -135.47501953125007] },
  left_rear_idler_mesh_1: { position: [-1.449577178955078, -0.08653854907304058, 1.162] },
  left_return_roller_1_mesh: { position: [-0.8400000035762787, 0.11255334331095217, 1.162] },
  left_return_roller_2_mesh: { position: [-0.11999999731779099, 0.1066436143070459, 1.162] },
  left_return_roller_3_mesh: { position: [0.5600000023841858, 0.09856699229776843, 1.162] },
  left_roadwheel_1_mesh: { position: [-1.1200168457031252, 0.0038857038021088523, 1.1841593322753903] },
  left_roadwheel_1_mesh_1: { position: [-1.0399999618530273, -0.2954999981969595, 1.162] },
  left_roadwheel_2_mesh_1: { position: [-0.6299999952316284, -0.2954999981969595, 1.162] },
  left_roadwheel_3_mesh_1: { position: [-0.2199999950826168, -0.2954999981969595, 1.162] },
  left_roadwheel_4_mesh_1: { position: [0.1899999938905239, -0.2954999981969595, 1.162] },
  left_roadwheel_5_mesh_1: { position: [0.6000000089406967, -0.2954999940991402, 1.162] },
  left_roadwheel_6_mesh: { position: [0.9600000083446503, -0.304410001501441, 1.162] },
  left_roadwheel_6_mesh_1: { position: [0.9030987593092328, 0.010931978891465997, 0.8917762948580665], rotationDeg: [0, 8.428176879882812, 0], scale: [0.9065256347656253, 1.0328718872070315, 0.9065256347656253] }
};

const runtimeTextureLoader = new THREE.TextureLoader();
const scratchWheelSpin = new THREE.Quaternion();
const localWheelSpinAxis = new THREE.Vector3(0, 0, 1);
const scratchBox = new THREE.Box3();
const scratchCenter = new THREE.Vector3();
const scratchSize = new THREE.Vector3();
const profileCenter = new THREE.Vector2(
  OUTER_PROFILE.reduce((sum, point) => sum + point[0], 0) / OUTER_PROFILE.length,
  OUTER_PROFILE.reduce((sum, point) => sum + point[1], 0) / OUTER_PROFILE.length
);

let cachedTreadShoeTexture: THREE.Texture | null = null;
let cachedTreadShoeNormalTexture: THREE.Texture | null = null;
let cachedTreadShoeRoughnessTexture: THREE.Texture | null = null;
let cachedTreadShoeMetalnessTexture: THREE.Texture | null = null;
let cachedWheelFaceTexture: THREE.Texture | null = null;
let cachedWheelNormalTexture: THREE.Texture | null = null;
let cachedWheelRoughnessTexture: THREE.Texture | null = null;
let cachedWheelMetalnessTexture: THREE.Texture | null = null;
let cachedTreadShoeMaterial: THREE.MeshStandardMaterial | null = null;
const cachedWheelMaterials = new Map<string, THREE.MeshStandardMaterial>();

type SegmentSample = {
  point: THREE.Vector2;
  tangent: THREE.Vector2;
  normal: THREE.Vector2;
};

export type MovingTreadLinks = {
  group: THREE.Group;
  left: THREE.Mesh;
  right: THREE.Mesh;
  linkCountPerSide: number;
  runtimeId: string;
  update: (phase: number) => void;
};

export type TreadWheelRuntime = {
  group: THREE.Group;
  wheels: Array<{ object: THREE.Object3D; baseQuaternion: THREE.Quaternion; sideSign: 1 | -1; spinScale: number }>;
  hiddenOriginalWheelMeshes: number;
  runtimeWheelMeshes: number;
  runtimeId: string;
};

function profileLength() {
  let length = 0;
  for (let index = 0; index < OUTER_PROFILE.length; index += 1) {
    const current = OUTER_PROFILE[index];
    const next = OUTER_PROFILE[(index + 1) % OUTER_PROFILE.length];
    length += Math.hypot(next[0] - current[0], next[1] - current[1]);
  }
  return length;
}

const PROFILE_LENGTH = profileLength();

function sampleOuterProfile(t: number): SegmentSample {
  let target = THREE.MathUtils.euclideanModulo(t, 1) * PROFILE_LENGTH;
  for (let index = 0; index < OUTER_PROFILE.length; index += 1) {
    const current = OUTER_PROFILE[index];
    const next = OUTER_PROFILE[(index + 1) % OUTER_PROFILE.length];
    const dx = next[0] - current[0];
    const dy = next[1] - current[1];
    const segmentLength = Math.hypot(dx, dy);
    if (target <= segmentLength || index === OUTER_PROFILE.length - 1) {
      const ratio = segmentLength > 0 ? target / segmentLength : 0;
      const point = new THREE.Vector2(current[0] + dx * ratio, current[1] + dy * ratio);
      const tangent = new THREE.Vector2(dx, dy).normalize();
      const normal = new THREE.Vector2(-tangent.y, tangent.x).normalize();
      const away = point.clone().sub(profileCenter);
      if (normal.dot(away) < 0) normal.multiplyScalar(-1);
      return { point, tangent, normal };
    }
    target -= segmentLength;
  }
  const fallback = OUTER_PROFILE[0];
  return { point: new THREE.Vector2(fallback[0], fallback[1]), tangent: new THREE.Vector2(1, 0), normal: new THREE.Vector2(0, 1) };
}

function writeConnectedTreadSegments(mesh: THREE.Mesh, sideSign: 1 | -1, phase: number) {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const positions = position.array as Float32Array;
  let cursor = 0;
  const zMin = OUTER_SIDE_Z * sideSign - LINK_WIDTH * 0.5;
  const zMax = OUTER_SIDE_Z * sideSign + LINK_WIDTH * 0.5;
  const pushVertex = (x: number, y: number, z: number) => {
    positions[cursor++] = x;
    positions[cursor++] = y;
    positions[cursor++] = z;
  };
  const pushQuad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    pushVertex(a.x, a.y, a.z); pushVertex(b.x, b.y, b.z); pushVertex(c.x, c.y, c.z);
    pushVertex(a.x, a.y, a.z); pushVertex(c.x, c.y, c.z); pushVertex(d.x, d.y, d.z);
  };
  for (let index = 0; index < MOVING_TREAD_LINKS_PER_SIDE; index += 1) {
    const start = sampleOuterProfile(index / MOVING_TREAD_LINKS_PER_SIDE + phase * PHASE_TO_PATH);
    const end = sampleOuterProfile((index + 1) / MOVING_TREAD_LINKS_PER_SIDE + phase * PHASE_TO_PATH);
    const startOuter = new THREE.Vector2(
      start.point.x + start.normal.x * PROFILE_OUTSET,
      start.point.y + start.normal.y * PROFILE_OUTSET
    );
    const endOuter = new THREE.Vector2(
      end.point.x + end.normal.x * PROFILE_OUTSET,
      end.point.y + end.normal.y * PROFILE_OUTSET
    );
    const startInner = new THREE.Vector2(
      start.point.x + start.normal.x * (PROFILE_OUTSET - LINK_THICKNESS),
      start.point.y + start.normal.y * (PROFILE_OUTSET - LINK_THICKNESS)
    );
    const endInner = new THREE.Vector2(
      end.point.x + end.normal.x * (PROFILE_OUTSET - LINK_THICKNESS),
      end.point.y + end.normal.y * (PROFILE_OUTSET - LINK_THICKNESS)
    );
    const so0 = new THREE.Vector3(startOuter.x, startOuter.y, zMin);
    const so1 = new THREE.Vector3(startOuter.x, startOuter.y, zMax);
    const eo0 = new THREE.Vector3(endOuter.x, endOuter.y, zMin);
    const eo1 = new THREE.Vector3(endOuter.x, endOuter.y, zMax);
    const si0 = new THREE.Vector3(startInner.x, startInner.y, zMin);
    const si1 = new THREE.Vector3(startInner.x, startInner.y, zMax);
    const ei0 = new THREE.Vector3(endInner.x, endInner.y, zMin);
    const ei1 = new THREE.Vector3(endInner.x, endInner.y, zMax);
    // Wound for outward lighting: broad tread plate normals point away from the belt loop.
    pushQuad(so0, so1, eo1, eo0);
    pushQuad(si0, ei0, ei1, si1);
    pushQuad(so1, si1, ei1, eo1);
    pushQuad(so0, eo0, ei0, si0);
    pushQuad(so0, si0, si1, so1);
    pushQuad(eo0, eo1, ei1, ei0);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function runtimeLoadedTexture(url: string, name: string, colorSpace: unknown) {
  const texture = runtimeTextureLoader.load(url);
  texture.name = name;
  texture.userData.url = url;
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 6;
  texture.needsUpdate = true;
  return texture;
}

function treadShoeTexture() {
  if (cachedTreadShoeTexture) return cachedTreadShoeTexture;
  cachedTreadShoeTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ALBEDO_URL,
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID + '-albedo',
    THREE.SRGBColorSpace
  );
  return cachedTreadShoeTexture;
}

function treadShoeNormalTexture() {
  if (cachedTreadShoeNormalTexture) return cachedTreadShoeNormalTexture;
  cachedTreadShoeNormalTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_NORMAL_URL,
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID + '-normal',
    THREE.NoColorSpace
  );
  return cachedTreadShoeNormalTexture;
}

function treadShoeRoughnessTexture() {
  if (cachedTreadShoeRoughnessTexture) return cachedTreadShoeRoughnessTexture;
  cachedTreadShoeRoughnessTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ROUGHNESS_URL,
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID + '-roughness',
    THREE.NoColorSpace
  );
  return cachedTreadShoeRoughnessTexture;
}

function treadShoeMetalnessTexture() {
  if (cachedTreadShoeMetalnessTexture) return cachedTreadShoeMetalnessTexture;
  cachedTreadShoeMetalnessTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_METALNESS_URL,
    AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID + '-painted-metalness',
    THREE.NoColorSpace
  );
  return cachedTreadShoeMetalnessTexture;
}

function wheelFaceTexture() {
  if (cachedWheelFaceTexture) return cachedWheelFaceTexture;
  cachedWheelFaceTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL,
    AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID + '-albedo',
    THREE.SRGBColorSpace
  );
  return cachedWheelFaceTexture;
}

function wheelNormalTexture() {
  if (cachedWheelNormalTexture) return cachedWheelNormalTexture;
  cachedWheelNormalTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL,
    AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID + '-normal',
    THREE.NoColorSpace
  );
  return cachedWheelNormalTexture;
}

function wheelRoughnessTexture() {
  if (cachedWheelRoughnessTexture) return cachedWheelRoughnessTexture;
  cachedWheelRoughnessTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL,
    AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID + '-roughness',
    THREE.NoColorSpace
  );
  return cachedWheelRoughnessTexture;
}

function wheelMetalnessTexture() {
  if (cachedWheelMetalnessTexture) return cachedWheelMetalnessTexture;
  cachedWheelMetalnessTexture = runtimeLoadedTexture(
    AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL,
    AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID + '-metalness',
    THREE.NoColorSpace
  );
  return cachedWheelMetalnessTexture;
}

type RunningGearDebugChannel = 'albedo' | 'normal' | 'roughness' | 'metalness';
const runningGearDebugMaterialCache = new Map<string, THREE.MeshBasicMaterial>();
function currentRunningGearMaterialDebugMode() {
  if (typeof window === 'undefined') return 'final';
  return String((window as unknown as { __TFTM_MATERIAL_DEBUG__?: string }).__TFTM_MATERIAL_DEBUG__ || 'final');
}
function treadDebugChannel(mode: string): RunningGearDebugChannel | null {
  if (mode === 'albedo' || mode === 'treadAlbedo') return 'albedo';
  if (mode === 'normal' || mode === 'treadNormal') return 'normal';
  if (mode === 'roughness' || mode === 'treadRoughness') return 'roughness';
  if (mode === 'metalness' || mode === 'treadMetalness') return 'metalness';
  return null;
}
function wheelDebugChannel(mode: string): RunningGearDebugChannel | null {
  if (mode === 'albedo' || mode === 'wheelAlbedo') return 'albedo';
  if (mode === 'normal' || mode === 'wheelNormal') return 'normal';
  if (mode === 'roughness' || mode === 'wheelRoughness') return 'roughness';
  if (mode === 'metalness' || mode === 'wheelMetalness') return 'metalness';
  return null;
}
function runningGearDebugMaterial(role: string, channel: RunningGearDebugChannel, texture: THREE.Texture, textureSet: string) {
  const key = role + '-' + channel;
  const cached = runningGearDebugMaterialCache.get(key);
  if (cached) return cached;
  const material = new THREE.MeshBasicMaterial({
    name: 'tftm-debug-' + role + '-' + channel,
    color: 0xffffff,
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  material.userData.tftmMaterialRole = role;
  material.userData.tftmMaterialDebugChannel = channel;
  material.userData.tftmTextureSet = textureSet;
  material.userData.tftmRendererDebugPolicy = 'unlit actual bound texture map for cloud PBR-channel proof';
  runningGearDebugMaterialCache.set(key, material);
  return material;
}
function treadDebugMaterial() {
  const channel = treadDebugChannel(currentRunningGearMaterialDebugMode());
  if (!channel) return null;
  if (channel === 'albedo') return runningGearDebugMaterial('treadShoe', channel, treadShoeTexture(), AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID);
  if (channel === 'normal') return runningGearDebugMaterial('treadShoe', channel, treadShoeNormalTexture(), AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID);
  if (channel === 'roughness') return runningGearDebugMaterial('treadShoe', channel, treadShoeRoughnessTexture(), AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID);
  return runningGearDebugMaterial('treadShoe', channel, treadShoeMetalnessTexture(), AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID);
}
function wheelDebugMaterial(role: string) {
  const channel = wheelDebugChannel(currentRunningGearMaterialDebugMode());
  if (!channel) return null;
  if (channel === 'albedo') return runningGearDebugMaterial(role, channel, wheelFaceTexture(), AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID);
  if (channel === 'normal') return runningGearDebugMaterial(role, channel, wheelNormalTexture(), AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID);
  if (channel === 'roughness') return runningGearDebugMaterial(role, channel, wheelRoughnessTexture(), AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID);
  return runningGearDebugMaterial(role, channel, wheelMetalnessTexture(), AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID);
}

function linkMaterial() {
  const debugMaterial = treadDebugMaterial();
  if (debugMaterial) return debugMaterial;
  if (cachedTreadShoeMaterial) return cachedTreadShoeMaterial;
  cachedTreadShoeMaterial = new THREE.MeshStandardMaterial({
    name: 'authored-sherman-runtime-pbr-tread-shoe-material',
    color: 0xffffff,
    map: treadShoeTexture(),
    normalMap: treadShoeNormalTexture(),
    normalScale: new THREE.Vector2(TREAD_LINK_NORMAL_SCALE, TREAD_LINK_NORMAL_SCALE),
    roughnessMap: treadShoeRoughnessTexture(),
    metalnessMap: treadShoeMetalnessTexture(),
    emissive: 0x000000,
    emissiveIntensity: 0.0,
    roughness: TREAD_LINK_MATTE_ROUGHNESS,
    metalness: TREAD_LINK_PAINTED_METALNESS_MAX,
    envMapIntensity: 0.12
  });
  cachedTreadShoeMaterial.userData.tftmMaterialRole = 'treadShoe';
  cachedTreadShoeMaterial.userData.runtimeRunningGearTextureStyle = RUNTIME_RUNNING_GEAR_TEXTURE_STYLE_ID;
  cachedTreadShoeMaterial.userData.runtimeTreadShoeTextureSet = AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID;
  cachedTreadShoeMaterial.userData.metalnessPolicy = 'painted-metal tread shoe material: mostly black metalness map keeps paint dull; bright worn edges capped at tank-average metalness 0.16';
  cachedTreadShoeMaterial.userData.highlightPolicy = 'painted steel, not chrome: roughness stays high while metalness is edge-only and capped';
  return cachedTreadShoeMaterial;
}

function makeConnectedTreadMesh(name: string, material: THREE.Material) {
  const vertexCount = MOVING_TREAD_LINKS_PER_SIDE * CONNECTED_TREAD_SEGMENT_VERTEX_COUNT;
  const geometry = new THREE.BufferGeometry();
  geometry.name = 'connected_tread_loop_segment_geometry';
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  const uvs = new Float32Array(vertexCount * 2);
  for (let index = 0; index < vertexCount; index += 6) {
    const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    uvs.set(uv, index * 2);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.userData.treadShoeUvPolicy = 'connected loop segments: each segment face keeps full 0-1 tread plate UVs while adjacent segment ends share path samples';
  geometry.userData.connectedTreadSegmentPolicy = CONNECTED_TREAD_LOOP_GEOMETRY_POLICY;
  geometry.userData.treadNormalWindingPolicy = 'outward broad faces use so0-so1-eo1-eo0 winding; do not restore inward rounded-box winding';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.userData.movingTreadLinksRuntimeId = MOVING_TREAD_LINKS_RUNTIME_ID;
  mesh.userData.linkCountPerSide = MOVING_TREAD_LINKS_PER_SIDE;
  mesh.userData.connectedTreadSegmentPolicy = geometry.userData.connectedTreadSegmentPolicy;
  return mesh;
}

export function createMovingBeveledTreadLinks(parent: THREE.Object3D) {
  const material = linkMaterial();
  const group = new THREE.Group();
  group.name = 'runtime_connected_loop_tread_segments';
  group.userData.movingTreadLinksRuntimeId = MOVING_TREAD_LINKS_RUNTIME_ID;
  group.userData.linkCountPerSide = MOVING_TREAD_LINKS_PER_SIDE;
  group.userData.profilePointCount = OUTER_PROFILE.length;
  group.userData.profileLength = PROFILE_LENGTH;
  group.userData.connectedTreadSegmentPolicy = CONNECTED_TREAD_LOOP_GEOMETRY_POLICY;
  const left = makeConnectedTreadMesh('left_runtime_connected_loop_tread_segments', material);
  const right = makeConnectedTreadMesh('right_runtime_connected_loop_tread_segments', material);
  group.add(left, right);
  parent.add(group);
  const controller: MovingTreadLinks = {
    group,
    left,
    right,
    linkCountPerSide: MOVING_TREAD_LINKS_PER_SIDE,
    runtimeId: MOVING_TREAD_LINKS_RUNTIME_ID,
    update: (phase: number) => {
      writeConnectedTreadSegments(left, 1, phase);
      writeConnectedTreadSegments(right, -1, phase);
    }
  };
  controller.update(0);
  return controller;
}

export function updateMovingBeveledTreadLinks(controller: MovingTreadLinks | null, phase: number) {
  if (!controller) return;
  controller.update(phase);
}


function normalizedRuntimeLabel(object: THREE.Object3D) {
  return object.name.toLowerCase().replace(/[^a-z0-9_+-]+/g, '_');
}

function materialLabel(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.map((material) => material?.name || '').join('_').toLowerCase();
}

function isStaticTreadBeltMesh(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh) return false;
  const label = normalizedRuntimeLabel(mesh);
  const material = materialLabel(mesh);
  return label.includes('continuous_tread_belt_surface')
    || label.includes('tread_belt')
    || label.includes('tread_ribbon')
    || label.includes('track_ribbon')
    || label.includes('belt_surface')
    || material.includes('track_outer')
    || material.includes('track_inner');
}

function isWheelMotionNode(object: THREE.Object3D) {
  const label = normalizedRuntimeLabel(object);
  return label.includes('roadwheel') || label.includes('sprocket') || label.includes('idler') || label.includes('return_roller');
}

export function deleteAuthoredShermanStaticTreadBeltMeshes(root: THREE.Object3D) {
  const targets: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (isStaticTreadBeltMesh(object)) targets.push(object);
  });
  for (const object of targets) {
    object.userData.staticTreadBeltDeleteRuntimeId = STATIC_TREAD_BELT_DELETE_RUNTIME_ID;
    object.parent?.remove(object);
  }
  root.userData.staticTreadBeltDeleteRuntimeId = STATIC_TREAD_BELT_DELETE_RUNTIME_ID;
  root.userData.deletedStaticTreadBeltMeshes = targets.length;
  return targets.length;
}

function wheelMaterial(label: string) {
  const isRubber = label.includes('return_roller') || label.includes('roadwheel');
  const key = isRubber ? 'rubber' : 'steel';
  const role = isRubber ? 'wheelRubber' : 'wheelMetal';
  const debugMaterial = wheelDebugMaterial(role);
  if (debugMaterial) return debugMaterial;
  const cached = cachedWheelMaterials.get(key);
  if (cached) return cached;
  const material = new THREE.MeshStandardMaterial({
    name: 'authored-sherman-runtime-lut-wheel-material-' + key,
    color: 0xffffff,
    map: wheelFaceTexture(),
    normalMap: wheelNormalTexture(),
    normalScale: new THREE.Vector2(isRubber ? 0.28 : 0.36, isRubber ? 0.28 : 0.36),
    roughnessMap: wheelRoughnessTexture(),
    metalnessMap: wheelMetalnessTexture(),
    emissive: 0x060604,
    emissiveIntensity: 0.02,
    roughness: isRubber ? 0.94 : 0.88,
    metalness: isRubber ? 0.01 : 0.06,
    envMapIntensity: isRubber ? 0.08 : 0.14
  });
  material.userData.tftmMaterialRole = role;
  material.userData.runtimeRunningGearTextureStyle = RUNTIME_RUNNING_GEAR_TEXTURE_STYLE_ID;
  material.userData.runtimeWheelMaterialStyle = RUNTIME_WHEEL_MATERIAL_STYLE_ID;
  material.userData.runtimeWheelTextureSet = AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID;
  material.userData.materialPolicy = 'offline wheel LUT plus deterministic normal/roughness/metalness maps drive visible rim lip, hub grime, rubber pitting, high roughness, and low painted-metal response; no black-crushed wheel discs';
  material.userData.pbrMapPolicy = 'wheel albedo is sRGB; wheel normal/roughness/metalness are linear data maps shared by every replacement wheel';
  cachedWheelMaterials.set(key, material);
  return material;
}

function createRuntimeWheelFromMeasuredMesh(root: THREE.Object3D, source: THREE.Mesh) {
  scratchBox.setFromObject(source);
  scratchBox.getCenter(scratchCenter);
  scratchBox.getSize(scratchSize);
  const rootPosition = root.worldToLocal(scratchCenter.clone());
  const label = normalizedRuntimeLabel(source);
  const isRoadwheel = label.includes('roadwheel');
  const isReturnRoller = label.includes('return_roller');
  const isSprocketOrIdler = label.includes('sprocket') || label.includes('idler');
  const radiusScale = isRoadwheel ? ROADWHEEL_CONTACT_RADIUS_SCALE : isSprocketOrIdler ? SPROCKET_IDLER_CONTACT_RADIUS_SCALE : 1.0;
  const radius = Math.max(scratchSize.x, scratchSize.y) * 0.5 * radiusScale;
  const width = Math.max(0.045, scratchSize.z);
  const segments = isReturnRoller ? 16 : 24;
  const geometry = new THREE.CylinderGeometry(radius, radius, width, segments, 1, false);
  geometry.rotateX(Math.PI * 0.5);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const wheel = new THREE.Mesh(geometry, wheelMaterial(label));
  wheel.name = 'runtime_centered_' + source.name;
  wheel.position.copy(rootPosition);
  const trackSideSign = rootPosition.z >= 0 ? 1 : -1;
  wheel.position.z = RUNTIME_WHEEL_TRACK_CENTER_Z * trackSideSign;
  wheel.userData.runtimeWheelTrackCenterPolicy = 'all replacement wheels are centered on the moving tread shoe lane instead of inheriting inboard source-wheel Z';
  wheel.userData.runtimeWheelTrackCenterZ = wheel.position.z;
  if (isRoadwheel) {
    wheel.position.y = ROADWHEEL_CONTACT_BOTTOM_Y + radius - ROADWHEEL_CONTACT_OVERLAP;
    wheel.userData.runtimeRoadwheelContactPolicy = 'roadwheel lightly overlaps tread run by 0.006 world units; first/last roadwheels shift along X to the curved returns';
    wheel.userData.runtimeRoadwheelContactBottomY = ROADWHEEL_CONTACT_BOTTOM_Y;
    wheel.userData.runtimeRoadwheelContactOverlap = ROADWHEEL_CONTACT_OVERLAP;
    wheel.userData.runtimeRoadwheelRadiusScale = ROADWHEEL_CONTACT_RADIUS_SCALE;
  } else if (isSprocketOrIdler) {
    wheel.userData.runtimeWheelRadiusScale = SPROCKET_IDLER_CONTACT_RADIUS_SCALE;
  }
  wheel.castShadow = true;
  wheel.receiveShadow = true;
  wheel.userData.sourceWheelNode = source.name;
  wheel.userData.runtimeCenteredWheelSpinId = RUNTIME_WHEEL_SPIN_RUNTIME_ID;
  return wheel;
}


function applyManualAcceptedWheelTune(wheel: THREE.Object3D, source: THREE.Object3D, sideSign: 1 | -1) {
  const sourceName = source.name;
  if (MANUAL_DELETED_WHEEL_SOURCE_NODES.has(sourceName)) {
    wheel.userData.runtimeManualWheelTuneDeleted = true;
    wheel.userData.runtimeManualWheelTuneId = MANUAL_WHEEL_TUNE_RUNTIME_ID;
    return false;
  }
  const tune = MANUAL_WHEEL_TUNE_BY_SOURCE_NODE[sourceName];
  if (!tune) return true;
  const [x, y, absZ] = tune.position;
  wheel.position.set(x, y, absZ * -sideSign);
  const rotation = tune.rotationDeg || [0, 0, 0];
  wheel.rotation.set(
    THREE.MathUtils.degToRad(rotation[0]),
    THREE.MathUtils.degToRad(rotation[1] * -sideSign),
    THREE.MathUtils.degToRad(rotation[2])
  );
  const scale = tune.scale || [1, 1, 1];
  wheel.scale.set(scale[0], scale[1], scale[2]);
  wheel.userData.runtimeManualWheelTuneId = MANUAL_WHEEL_TUNE_RUNTIME_ID;
  wheel.userData.runtimeManualWheelTunePolicy = 'accepted user wheel editor JSON baked symmetrically by sideSign; under-floor duplicate workaround source nodes are deleted, not hidden below the floor';
  wheel.userData.runtimeManualWheelSourceSide = 'sideSign -1 accepted; sideSign +1 mirrored across runtime Z';
  wheel.userData.runtimeManualWheelAbsZ = absZ;
  return true;
}

function applyRoadwheelEndContact(wheels: TreadWheelRuntime['wheels']) {
  const roadwheels = wheels.filter((wheel) => String(wheel.object.userData.runtimeRoadwheelContactPolicy || '').includes('roadwheel'));
  for (const sideSign of [-1, 1] as const) {
    const sideWheels = roadwheels.filter((wheel) => wheel.sideSign === sideSign).sort((a, b) => a.object.position.x - b.object.position.x);
    if (sideWheels.length < 2) continue;
    const frontRoadwheel = sideWheels[0];
    const rearRoadwheel = sideWheels[sideWheels.length - 1];
    const placements = [
      { wheel: frontRoadwheel, x: FRONT_ROADWHEEL_CURVE_CONTACT_X, label: 'front-roadwheel' },
      { wheel: rearRoadwheel, x: REAR_ROADWHEEL_CURVE_CONTACT_X, label: 'rear-roadwheel' }
    ];
    for (const placement of placements) {
      placement.wheel.object.position.x = placement.x;
      placement.wheel.object.position.y -= FRONT_REAR_ROADWHEEL_EXTRA_CONTACT_DROP;
      placement.wheel.object.userData.runtimeEndRoadwheelContactPolicy = placement.label + ' shifted along the roadwheel row toward the curved tread return; no top roller placement';
      placement.wheel.object.userData.runtimeEndRoadwheelExtraContactDrop = FRONT_REAR_ROADWHEEL_EXTRA_CONTACT_DROP;
      placement.wheel.object.userData.runtimeEndRoadwheelCurveContactX = placement.x;
    }
  }
}

function pruneOccludedDuplicateRoadwheels(wheels: TreadWheelRuntime['wheels']) {
  let removed = 0;
  const roadwheels = wheels.filter((wheel) => String(wheel.object.userData.runtimeRoadwheelContactPolicy || '').includes('roadwheel'));
  for (const sideSign of [-1, 1] as const) {
    const sideWheels = roadwheels.filter((wheel) => wheel.sideSign === sideSign).sort((a, b) => a.object.position.x - b.object.position.x);
    for (let index = 1; index < sideWheels.length; index += 1) {
      const previous = sideWheels[index - 1];
      const current = sideWheels[index];
      if (!previous.object.visible || !current.object.visible) continue;
      if (Math.abs(current.object.position.x - previous.object.position.x) > ROADWHEEL_DUPLICATE_X_EPSILON) continue;
      const remove = current.object.position.y > previous.object.position.y ? previous : current;
      remove.object.visible = false;
      remove.object.userData.runtimeOccludedDuplicateRoadwheelPruned = true;
      remove.object.userData.runtimeRoadwheelDuplicatePrunePolicy = 'remove mostly occluded duplicate roadwheel discs after track-centered placement; do not add top rollers';
      removed += 1;
    }
  }
  return removed;
}

function createInnerBackSidewallMesh(name: string, sideSign: 1 | -1) {
  const vertices: number[] = [profileCenter.x, profileCenter.y, INNER_BACK_SIDEWALL_Z * sideSign];
  for (const point of OUTER_PROFILE) {
    const toCenterX = profileCenter.x - point[0];
    const toCenterY = profileCenter.y - point[1];
    const length = Math.max(0.0001, Math.hypot(toCenterX, toCenterY));
    vertices.push(
      point[0] - (toCenterX / length) * INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET,
      point[1] - (toCenterY / length) * INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET,
      INNER_BACK_SIDEWALL_Z * sideSign
    );
  }
  const indices: number[] = [];
  for (let index = 1; index <= OUTER_PROFILE.length; index += 1) {
    const next = index === OUTER_PROFILE.length ? 1 : index + 1;
    if (sideSign > 0) indices.push(0, index, next);
    else indices.push(0, next, index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({
    name: 'authored-sherman-runtime-inner-back-sidewall-material',
    color: 0x383827,
    emissive: 0x070704,
    emissiveIntensity: 0.06,
    roughness: 0.92,
    metalness: 0.08,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.userData.runtimeInnerBackSidewallId = RUNTIME_INNER_BACK_SIDEWALL_ID;
  mesh.userData.runtimeInnerBackSidewallPolicy = 'inboard/back sidewall behind wheel assembly, expanded to underlap the moving tread profile and seal the visible slit; not an outer tread slab';
  mesh.userData.runtimeInnerBackSidewallZ = INNER_BACK_SIDEWALL_Z * sideSign;
  mesh.userData.runtimeInnerBackSidewallSealOutset = INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET;
  return mesh;
}

export function createAuthoredShermanInnerBackSidewalls(root: THREE.Object3D) {
  const group = new THREE.Group();
  group.name = 'runtime_inner_back_tread_sidewalls';
  group.userData.runtimeInnerBackSidewallId = RUNTIME_INNER_BACK_SIDEWALL_ID;
  group.add(
    createInnerBackSidewallMesh('left_runtime_inner_back_tread_sidewall', 1),
    createInnerBackSidewallMesh('right_runtime_inner_back_tread_sidewall', -1)
  );
  root.add(group);
  root.userData.runtimeInnerBackSidewallId = RUNTIME_INNER_BACK_SIDEWALL_ID;
  root.userData.runtimeInnerBackSidewallCount = group.children.length;
  return group;
}

export function createAuthoredShermanWheelRuntime(root: THREE.Object3D): TreadWheelRuntime {
  root.updateWorldMatrix(true, true);
  const sourceWheels: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && isWheelMotionNode(mesh)) sourceWheels.push(mesh);
  });
  const group = new THREE.Group();
  group.name = 'runtime_centered_independent_wheels';
  group.userData.runtimeCenteredWheelSpinId = RUNTIME_WHEEL_SPIN_RUNTIME_ID;
  const wheels: TreadWheelRuntime['wheels'] = [];
  let hiddenOriginalWheelMeshes = 0;
  let manuallyDeletedRuntimeWheels = 0;
  for (const source of sourceWheels) {
    const runtimeWheel = createRuntimeWheelFromMeasuredMesh(root, source);
    const label = normalizedRuntimeLabel(source);
    const sideSign: 1 | -1 = runtimeWheel.position.z > 0 ? -1 : 1;
    const spinScale = label.includes('sprocket') || label.includes('idler') ? 7.4 : label.includes('return_roller') ? 10.8 : 8.9;
    source.visible = false;
    source.userData.hiddenOriginalWheelForRuntimeSpin = true;
    source.userData.runtimeCenteredWheelSpinId = RUNTIME_WHEEL_SPIN_RUNTIME_ID;
    hiddenOriginalWheelMeshes += 1;
    if (!applyManualAcceptedWheelTune(runtimeWheel, source, sideSign)) {
      source.userData.runtimeManualWheelTuneDeleted = true;
      source.userData.runtimeManualWheelTuneId = MANUAL_WHEEL_TUNE_RUNTIME_ID;
      manuallyDeletedRuntimeWheels += 1;
      continue;
    }
    group.add(runtimeWheel);
    runtimeWheel.updateMatrixWorld(true);
    wheels.push({ object: runtimeWheel, baseQuaternion: runtimeWheel.quaternion.clone(), sideSign, spinScale });
  }
  const prunedDuplicateRoadwheels = 0;
  root.add(group);
  root.userData.runtimeCenteredWheelSpinId = RUNTIME_WHEEL_SPIN_RUNTIME_ID;
  root.userData.runtimeEndRoadwheelContactDrop = FRONT_REAR_ROADWHEEL_EXTRA_CONTACT_DROP;
  root.userData.runtimeEndRoadwheelCurveContactX = [FRONT_ROADWHEEL_CURVE_CONTACT_X, REAR_ROADWHEEL_CURVE_CONTACT_X];
  root.userData.runtimeWheelTrackCenterZ = RUNTIME_WHEEL_TRACK_CENTER_Z;
  root.userData.runtimePrunedDuplicateRoadwheels = prunedDuplicateRoadwheels;
  root.userData.runtimeManualWheelTuneDeletedRuntimeWheels = manuallyDeletedRuntimeWheels;
  root.userData.runtimeManualWheelTuneId = MANUAL_WHEEL_TUNE_RUNTIME_ID;
  root.userData.runtimeRoadwheelDuplicatePrunePolicy = 'accepted manual wheel editor JSON deletes duplicate roadwheel and under-floor return-roller source nodes before runtime spin registration';
  root.userData.hiddenOriginalWheelMeshes = hiddenOriginalWheelMeshes;
  root.userData.runtimeWheelMeshCount = wheels.length;
  return { group, wheels, hiddenOriginalWheelMeshes, runtimeWheelMeshes: wheels.length, runtimeId: RUNTIME_WHEEL_SPIN_RUNTIME_ID };
}

export function updateAuthoredShermanWheelRotation(runtime: TreadWheelRuntime | null, phase: number) {
  if (!runtime) return;
  for (const wheel of runtime.wheels) {
    scratchWheelSpin.setFromAxisAngle(localWheelSpinAxis, -phase * wheel.spinScale * wheel.sideSign);
    wheel.object.quaternion.copy(wheel.baseQuaternion).multiply(scratchWheelSpin);
  }
}


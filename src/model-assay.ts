import './model-assay.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type KitPart = {
  label: string;
  role: string;
  default_runtime_use: boolean | string;
  glb: string;
  approximate_triangles: number;
  classification: string;
};

type KitManifest = {
  asset_id: string;
  visual_target: string;
  gate_status: string;
  generation_spend: { openai_image_calls: number; meshy_successes: number; meshy_failed_no_credit: number; runtime_default_meshy_parts: number };
  phone_budget: { default_runtime_triangles_before_wheel_duplication: number; gear_mobile_triangles_each: number; warning: string };
  parts: Record<string, KitPart>;
  red_build?: { geometry_failure?: { observed_by_user: string; required_recovery: string } };
};

type RuntimePart = {
  object: THREE.Object3D;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  triangles: number;
};

type TreadMaterialSet = {
  material: THREE.MeshStandardMaterial;
  maps: THREE.CanvasTexture[];
};

type TreadInstancedMesh = THREE.InstancedMesh & {
  treadPhaseAttribute: THREE.InstancedBufferAttribute;
};

type TankAnimationState = {
  baseX: number;
  z: number;
  lane: number;
  drivePhase: number;
  driveSpeed: number;
  wheelPhase: number;
  wheelRate: number;
  treadPhase: number;
  treadRate: number;
  turretPhase: number;
  turretRate: number;
  turretAmplitude: number;
  barrelPhase: number;
  barrelRate: number;
  barrelAmplitude: number;
};

const spawnTarget = 24;
const wheelsPerTank = 10;
const treadTrianglesPerTank = 520;
const root = document.querySelector<HTMLDivElement>('#assay-root');
if (!root) throw new Error('missing #assay-root');

const compositionSlots = [
  { id: 'hull', label: 'Hull Upper' },
  { id: 'turret', label: 'Turret Shell' },
  { id: 'barrel_only', label: 'Barrel Only' },
  { id: 'gear_mobile', label: 'Mobile Gear / Wheel' }
];
const glbSrc = (glbPath: string) => './model-assay/sherman_part_meshy_kit_v1/' + glbPath.split('/').pop();

root.innerHTML = '<main class="drive-proof-shell">' +
  '<header class="drive-proof-header">' +
    '<p class="eyebrow blocked">RED BUILD / 24-tank animated runtime proof</p>' +
    '<h1>sherman_part_meshy_kit_v1</h1>' +
    '<p class="summary">Hero proof plus 24 independently animated tanks. Meshy geometry is shared for phone performance, but drive, wheel, tread, turret, and barrel state are seeded per tank.</p>' +
  '</header>' +
  '<section class="drive-stage-wrap">' +
    '<canvas id="drive-stage" aria-label="Composed animated Meshy tank proof with 24 instanced tanks"></canvas>' +
  '</section>' +
  '<aside class="gate-panel drive-panel" aria-label="Animated composition proof readout">' +
    '<dl class="metrics">' +
      '<div><dt>gate</dt><dd id="gate" class="blocked">loading</dd></div>' +
      '<div><dt>target</dt><dd id="target">24 tanks</dd></div>' +
      '<div><dt>hero</dt><dd id="hero-budget">loading</dd></div>' +
      '<div><dt>spawn</dt><dd id="spawn-budget">loading</dd></div>' +
      '<div><dt>draws</dt><dd id="draws">loading</dd></div>' +
      '<div><dt>seeds</dt><dd id="seeds">loading</dd></div>' +
      '<div><dt>fps</dt><dd id="fps">warming</dd></div>' +
    '</dl>' +
    '<section>' +
      '<h2>Visible Contract</h2>' +
      '<ul id="contract"></ul>' +
    '</section>' +
    '<section>' +
      '<h2>Status</h2>' +
      '<p id="verdict">Loading GLBs.</p>' +
    '</section>' +
  '</aside>' +
'</main>';

const canvas = document.querySelector<HTMLCanvasElement>('#drive-stage')!;
const gateEl = document.querySelector<HTMLElement>('#gate')!;
const heroBudgetEl = document.querySelector<HTMLElement>('#hero-budget')!;
const spawnBudgetEl = document.querySelector<HTMLElement>('#spawn-budget')!;
const drawsEl = document.querySelector<HTMLElement>('#draws')!;
const seedsEl = document.querySelector<HTMLElement>('#seeds')!;
const fpsEl = document.querySelector<HTMLElement>('#fps')!;
const contractEl = document.querySelector<HTMLUListElement>('#contract')!;
const verdictEl = document.querySelector<HTMLElement>('#verdict')!;

function makeMap(kind: 'albedo' | 'roughness' | 'metalness' | 'normal') {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 96;
  const ctx = textureCanvas.getContext('2d')!;
  if (kind === 'albedo') {
    ctx.fillStyle = '#242620';
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#11130f';
    ctx.fillRect(0, 0, 512, 10);
    ctx.fillRect(0, 86, 512, 10);
    for (let x = 0; x < 512; x += 28) {
      ctx.fillStyle = '#4f4c3f';
      ctx.fillRect(x + 2, 12, 20, 72);
      ctx.fillStyle = '#79715d';
      ctx.fillRect(x + 3, 13, 2, 70);
      ctx.fillRect(x + 18, 13, 2, 70);
      ctx.fillStyle = '#171813';
      ctx.fillRect(x + 23, 10, 4, 76);
      ctx.fillStyle = 'rgba(158, 142, 101, 0.42)';
      ctx.fillRect(x + 7, 18, 10, 12);
      ctx.fillStyle = 'rgba(37, 31, 22, 0.48)';
      ctx.fillRect(x + 6, 64, 13, 16);
    }
    ctx.fillStyle = 'rgba(176, 164, 123, 0.24)';
    for (let y = 18; y < 86; y += 18) ctx.fillRect(0, y, 512, 1);
  } else if (kind === 'roughness') {
    ctx.fillStyle = '#d4d4d4';
    ctx.fillRect(0, 0, 512, 96);
    for (let x = 0; x < 512; x += 28) {
      ctx.fillStyle = '#a8a8a8';
      ctx.fillRect(x + 2, 12, 20, 72);
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(x + 7, 62, 12, 14);
    }
  } else if (kind === 'metalness') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#666666';
    for (let x = 0; x < 512; x += 28) {
      ctx.fillRect(x + 23, 12, 4, 72);
      ctx.fillRect(x + 2, 12, 2, 72);
    }
  } else {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 512, 96);
    for (let x = 0; x < 512; x += 28) {
      ctx.fillStyle = '#9b9bff';
      ctx.fillRect(x + 2, 12, 4, 72);
      ctx.fillStyle = '#6767e0';
      ctx.fillRect(x + 23, 12, 4, 72);
      ctx.fillStyle = '#8888ff';
      ctx.fillRect(x + 7, 16, 12, 56);
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 1);
  texture.colorSpace = kind === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

function makeTreadMaterialSet() {
  const albedo = makeMap('albedo');
  const roughnessMap = makeMap('roughness');
  const metalnessMap = makeMap('metalness');
  const normalMap = makeMap('normal');
  const material = new THREE.MeshStandardMaterial({
    map: albedo,
    roughnessMap,
    metalnessMap,
    normalMap,
    color: 0xbbb18e,
    roughness: 0.78,
    metalness: 0.28
  });
  return { material, maps: [albedo, roughnessMap, metalnessMap, normalMap] };
}

function makeInstancedTreadMaterialSet() {
  const set = makeTreadMaterialSet();
  set.material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float instanceTreadPhase;'
      )
      .replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv.x += instanceTreadPhase;\n#endif\n#ifdef USE_ROUGHNESSMAP\n  vRoughnessMapUv.x += instanceTreadPhase;\n#endif\n#ifdef USE_METALNESSMAP\n  vMetalnessMapUv.x += instanceTreadPhase;\n#endif\n#ifdef USE_NORMALMAP\n  vNormalMapUv.x += instanceTreadPhase;\n#endif'
      );
  };
  set.material.customProgramCacheKey = () => 'instanced-tread-phase-v1';
  return set;
}

function createTreadGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const zOuter = 0.085;
  const zInner = -0.085;
  const zShoe = 0.12;
  const yTop = 0.14;
  const yBottom = -0.38;
  const centerY = -0.12;
  const radiusY = 0.26;
  const xFront = 1.48;
  const xRear = -1.48;
  const halfStraight = 1.2;
  const shoeWidth = 0.12;

  function addVertex(x: number, y: number, z: number, u: number, v: number) {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  }

  function addQuad(a: [number, number, number, number, number], b: [number, number, number, number, number], c: [number, number, number, number, number], d: [number, number, number, number, number]) {
    const start = positions.length / 3;
    addVertex(...a);
    addVertex(...b);
    addVertex(...c);
    addVertex(...d);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  function beltPoint(progress: number) {
    const p = ((progress % 1) + 1) % 1;
    if (p < 0.34) {
      const k = p / 0.34;
      return { x: xRear + k * (xFront - xRear), y: yTop, u: k * 4.2, tangent: 0 };
    }
    if (p < 0.5) {
      const k = (p - 0.34) / 0.16;
      const angle = Math.PI * 0.5 - k * Math.PI;
      return { x: halfStraight + Math.cos(angle) * (xFront - halfStraight), y: centerY + Math.sin(angle) * radiusY, u: 4.2 + k * 0.85, tangent: -k * Math.PI };
    }
    if (p < 0.84) {
      const k = (p - 0.5) / 0.34;
      return { x: xFront - k * (xFront - xRear), y: yBottom, u: 5.05 + k * 4.2, tangent: Math.PI };
    }
    const k = (p - 0.84) / 0.16;
    const angle = -Math.PI * 0.5 - k * Math.PI;
    return { x: -halfStraight + Math.cos(angle) * (Math.abs(xRear) - halfStraight), y: centerY + Math.sin(angle) * radiusY, u: 9.25 + k * 0.85, tangent: Math.PI + k * Math.PI };
  }

  const profile = Array.from({ length: 65 }, (_, index) => beltPoint(index / 64));
  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = profile[i];
    const b = profile[i + 1];
    addQuad([a.x, a.y, zOuter, a.u, 0.02], [b.x, b.y, zOuter, b.u, 0.02], [b.x, b.y, zInner, b.u, 0.2], [a.x, a.y, zInner, a.u, 0.2]);
  }

  for (let x = -1.18; x <= 1.181; x += 0.18) {
    addQuad([x - shoeWidth * 0.5, yTop + 0.012, zShoe, x * 1.35, 0.16], [x + shoeWidth * 0.5, yTop + 0.012, zShoe, x * 1.35 + 0.25, 0.16], [x + shoeWidth * 0.44, yTop - 0.13, zShoe, x * 1.35 + 0.25, 0.82], [x - shoeWidth * 0.44, yTop - 0.13, zShoe, x * 1.35, 0.82]);
    addQuad([x + shoeWidth * 0.5, yBottom - 0.012, zShoe, x * 1.35, 0.16], [x - shoeWidth * 0.5, yBottom - 0.012, zShoe, x * 1.35 + 0.25, 0.16], [x - shoeWidth * 0.44, yBottom + 0.13, zShoe, x * 1.35 + 0.25, 0.82], [x + shoeWidth * 0.44, yBottom + 0.13, zShoe, x * 1.35, 0.82]);
  }

  for (let i = 0; i < 10; i += 1) {
    const k = i / 9;
    const y = yBottom + k * (yTop - yBottom);
    const inset = Math.sin(k * Math.PI) * 0.045;
    addQuad([xFront - inset, y - 0.035, zShoe, 0.3 + k, 0.18], [xFront + 0.11 - inset, y - 0.015, zShoe, 0.48 + k, 0.18], [xFront + 0.09 - inset, y + 0.055, zShoe, 0.48 + k, 0.78], [xFront - 0.025 - inset, y + 0.035, zShoe, 0.3 + k, 0.78]);
    addQuad([xRear + inset, y - 0.035, zShoe, 0.3 + k, 0.18], [xRear - 0.11 + inset, y - 0.015, zShoe, 0.48 + k, 0.18], [xRear - 0.09 + inset, y + 0.055, zShoe, 0.48 + k, 0.78], [xRear + 0.025 + inset, y + 0.035, zShoe, 0.3 + k, 0.78]);
  }

  for (const railY of [yTop - 0.03, yBottom + 0.03]) {
    addQuad([xRear + 0.06, railY - 0.018, zShoe + 0.012, 0, 0.28], [xFront - 0.06, railY - 0.018, zShoe + 0.012, 7.5, 0.28], [xFront - 0.06, railY + 0.018, zShoe + 0.012, 7.5, 0.72], [xRear + 0.06, railY + 0.018, zShoe + 0.012, 0, 0.72]);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function findFirstMesh(object: THREE.Object3D) {
  let found: any = null;
  object.traverse((child) => {
    const mesh = child as any;
    if (!found && mesh.isMesh && mesh.geometry) found = mesh;
  });
  if (!found) throw new Error('GLB part has no mesh');
  return found as { geometry: THREE.BufferGeometry; material: any; matrixWorld: any };
}

function normalizeObject(object: THREE.Object3D, targetMaxAxis: number) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  object.position.sub(center);
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  object.scale.multiplyScalar(targetMaxAxis / maxAxis);
  return object;
}

function alignLongestAxisToX(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const halfTurn = Math.PI * 0.5;
  if (size.y > size.x && size.y >= size.z) object.rotation.z = -halfTurn;
  if (size.z > size.x && size.z > size.y) object.rotation.y = halfTurn;
  return object;
}

function alignWheelFaceToTankSide(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const halfTurn = Math.PI * 0.5;
  if (size.x <= size.y && size.x <= size.z) object.rotation.y = halfTurn;
  if (size.y < size.x && size.y <= size.z) object.rotation.x = halfTurn;
  return object;
}

function bakeGeometryFromObject(object: THREE.Object3D) {
  object.updateWorldMatrix(true, true);
  const mesh = findFirstMesh(object);
  const geometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.center();
  const material = Array.isArray(mesh.material) ? mesh.material.map((item: any) => item.clone()) : mesh.material.clone();
  return { geometry, material };
}

function loadRuntimePart(loader: GLTFLoader, url: string, targetMaxAxis: number, align?: (object: THREE.Object3D) => THREE.Object3D) {
  return new Promise<RuntimePart>((resolve, reject) => {
    loader.load(url, (gltf) => {
      const object = normalizeObject(gltf.scene, targetMaxAxis);
      if (align) align(object);
      const baked = bakeGeometryFromObject(object);
      const mesh = findFirstMesh(object);
      const primitive = mesh.geometry.getIndex()?.count || mesh.geometry.getAttribute('position').count;
      resolve({ object, geometry: baked.geometry, material: baked.material, triangles: Math.floor(primitive / 3) });
    }, undefined, reject);
  });
}

function setInstance(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, yaw: number, pitch: number, roll: number, scale: number) {
  const dummy = new THREE.Object3D();
  dummy.position.set(x, y, z);
  dummy.rotation.set(pitch, yaw, roll);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function makeInstancedMesh(part: RuntimePart, count: number) {
  const mesh = new THREE.InstancedMesh(part.geometry, part.material, count);
  mesh.frustumCulled = false;
  return mesh;
}

function makeTreadInstancedMesh(materialSet: TreadMaterialSet, count: number) {
  const mesh = new THREE.InstancedMesh(createTreadGeometry(), materialSet.material, count);
  const treadPhaseAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  mesh.geometry.setAttribute('instanceTreadPhase', treadPhaseAttribute);
  (mesh as TreadInstancedMesh).treadPhaseAttribute = treadPhaseAttribute;
  mesh.frustumCulled = false;
  return mesh as TreadInstancedMesh;
}

function seedUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function smoothRandomCycle(time: number, rate: number, phase: number, amplitude: number) {
  return Math.sin(time * rate + phase) * amplitude;
}

function seedTankState(index: number): TankAnimationState {
  const row = Math.floor(index / 6);
  const col = index % 6;
  return {
    baseX: -4.8 + col * 1.9,
    z: 2.3 + row * 1.3,
    lane: row,
    drivePhase: seedUnit(index + 1) * 1.9,
    driveSpeed: 0.32 + seedUnit(index + 11) * 0.28,
    wheelPhase: seedUnit(index + 23) * Math.PI * 2,
    wheelRate: 4.6 + seedUnit(index + 31) * 2.2,
    treadPhase: seedUnit(index + 43) * 5,
    treadRate: 0.92 + seedUnit(index + 47) * 1.25,
    turretPhase: seedUnit(index + 53) * Math.PI * 2,
    turretRate: 0.18 + seedUnit(index + 59) * 0.42,
    turretAmplitude: 0.1 + seedUnit(index + 61) * 0.16,
    barrelPhase: seedUnit(index + 67) * Math.PI * 2,
    barrelRate: 0.28 + seedUnit(index + 71) * 0.52,
    barrelAmplitude: 0.04 + seedUnit(index + 73) * 0.045
  };
}

function updateTreadPhase(mesh: TreadInstancedMesh, index: number, value: number) {
  mesh.treadPhaseAttribute.setX(index, value);
  mesh.treadPhaseAttribute.needsUpdate = true;
}

async function boot() {
  const manifest = await fetch('./model-assay/sherman_part_meshy_kit_v1/assembly_manifest.json', { cache: 'no-store' }).then((r) => r.json() as Promise<KitManifest>);
  const loader = new GLTFLoader();
  const [hull, turret, barrel, gear] = await Promise.all([
    loadRuntimePart(loader, glbSrc(manifest.parts.hull.glb), 2.9),
    loadRuntimePart(loader, glbSrc(manifest.parts.turret.glb), 1.25),
    loadRuntimePart(loader, glbSrc(manifest.parts.barrel_only.glb), 1.18, alignLongestAxisToX),
    loadRuntimePart(loader, glbSrc(manifest.parts.gear_mobile.glb), 0.34, alignWheelFaceToTankSide)
  ]);

  const heroTriangles = manifest.parts.hull.approximate_triangles + manifest.parts.turret.approximate_triangles + manifest.parts.barrel_only.approximate_triangles + wheelsPerTank * manifest.parts.gear_mobile.approximate_triangles + treadTrianglesPerTank;
  const spawnTriangles = heroTriangles * spawnTarget;
  gateEl.textContent = manifest.gate_status;
  heroBudgetEl.textContent = String(heroTriangles) + ' tris';
  spawnBudgetEl.textContent = String(spawnTarget) + ' tanks / ' + String(spawnTriangles) + ' submitted tris';
  drawsEl.textContent = 'draw-call estimate: hero plus 6 instanced draw groups; shared GLB geometry/textures';
  seedsEl.textContent = String(spawnTarget) + '/' + String(spawnTarget) + ' independent animation seeds';
  contractEl.innerHTML = [
    'Hero tank validates visible part relationship up close',
    'Spawn proof renders exactly 24 independently animated tanks',
    'Treads use MeshStandardMaterial with albedo, roughness, metalness, and normal maps',
    'Authored tread belt uses sidewall thickness, curved returns, raised shoes, rails, and PBR UV motion',
    'Spawn treads use InstancedBufferAttribute tread phase instead of a shared material-wide texture offset',
    'Drive, wheel, turret, barrel, and tread motion are seeded per tank with smoothed random cycles',
    'Every turret traverses horizontally on its own yaw cycle',
    'Every barrel elevates vertically on its own pitch cycle',
    'Wheels face tank sides and spin around the axle',
    'Barrel aligns forward from the turret instead of standing perpendicular',
    '24-tank target uses InstancedMesh; no deep-cloned GLB object trees'
  ].map((item) => '<li>' + item + '</li>').join('');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101315);
  scene.fog = new THREE.Fog(0x101315, 9, 24);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 90);
  camera.position.set(6.3, 4.2, 9.2);
  camera.lookAt(0.6, 0.3, 0);

  scene.add(new THREE.HemisphereLight(0xf5eed7, 0x1d2222, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb7c7ff, 0.85);
  rim.position.set(-5, 2, -6);
  scene.add(rim);
  const grid = new THREE.GridHelper(34, 34, 0x57605d, 0x252b2a);
  grid.position.y = -0.38;
  scene.add(grid);

  const treadHeroLeft = makeTreadMaterialSet();
  const treadHeroRight = makeTreadMaterialSet();
  const treadSpawnLeft = makeInstancedTreadMaterialSet();
  const treadSpawnRight = makeInstancedTreadMaterialSet();
  const animatedTextureSets = [treadHeroLeft, treadHeroRight];

  const hero = new THREE.Group();
  hero.position.set(-4.4, 0, -1.7);
  hero.rotation.y = -0.1;
  scene.add(hero);
  const heroHull = hull.object.clone(true);
  heroHull.position.set(0, 0.22, 0);
  hero.add(heroHull);
  const heroTurretPivot = new THREE.Group();
  heroTurretPivot.position.set(0.05, 0.74, 0);
  hero.add(heroTurretPivot);
  const heroTurret = turret.object.clone(true);
  heroTurretPivot.add(heroTurret);
  const heroBarrelPivot = new THREE.Group();
  heroBarrelPivot.position.set(0.66, 0.08, 0);
  heroTurretPivot.add(heroBarrelPivot);
  const heroBarrel = barrel.object.clone(true);
  heroBarrel.position.set(0.72, 0, 0);
  heroBarrelPivot.add(heroBarrel);
  const heroLeftTread = new THREE.Mesh(createTreadGeometry(), treadHeroLeft.material);
  heroLeftTread.position.z = -0.72;
  const heroRightTread = new THREE.Mesh(createTreadGeometry(), treadHeroRight.material);
  heroRightTread.position.z = 0.72;
  hero.add(heroLeftTread, heroRightTread);
  const heroWheels: THREE.Object3D[] = [];
  for (const z of [-0.76, 0.76]) {
    for (const x of [-1.18, -0.58, 0.02, 0.62, 1.22]) {
      const wheel = gear.object.clone(true);
      wheel.position.set(x, -0.16, z);
      hero.add(wheel);
      heroWheels.push(wheel);
    }
  }

  const hullInstances = makeInstancedMesh(hull, spawnTarget);
  const turretInstances = makeInstancedMesh(turret, spawnTarget);
  const barrelInstances = makeInstancedMesh(barrel, spawnTarget);
  const gearInstances = makeInstancedMesh(gear, spawnTarget * wheelsPerTank);
  const leftTreadInstances = makeTreadInstancedMesh(treadSpawnLeft, spawnTarget);
  const rightTreadInstances = makeTreadInstancedMesh(treadSpawnRight, spawnTarget);
  scene.add(hullInstances, turretInstances, barrelInstances, gearInstances, leftTreadInstances, rightTreadInstances);

  const tankStates: TankAnimationState[] = [];
  for (let i = 0; i < spawnTarget; i += 1) {
    tankStates.push(seedTankState(i));
  }

  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsLast = performance.now();
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(360, Math.floor(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now * 0.001;

    hero.position.x = -5.1 + ((t * 0.48 + 1.6) % 3.2);
    heroWheels.forEach((wheel) => { wheel.rotation.z -= dt * 5.8; });
    heroTurretPivot.rotation.y = Math.sin(t * 0.65) * 0.14;
    heroBarrelPivot.rotation.z = Math.sin(t * 1.05) * 0.03;

    let gearIndex = 0;
    for (let i = 0; i < spawnTarget; i += 1) {
      const state = tankStates[i];
      const x = state.baseX + ((t * state.driveSpeed + state.drivePhase) % 1.9);
      const z = state.z;
      const yaw = -0.04 + (state.lane - 1.5) * 0.006;
      const wheelSpin = -(t * state.wheelRate + state.wheelPhase);
      const treadPhase = (state.treadPhase - t * state.treadRate) % 5;
      const turretYaw = smoothRandomCycle(t, state.turretRate, state.turretPhase, state.turretAmplitude);
      const barrelPitch = smoothRandomCycle(t, state.barrelRate, state.barrelPhase, state.barrelAmplitude);
      setInstance(hullInstances, i, x, 0.22, z, yaw, 0, 0, 0.72);
      setInstance(turretInstances, i, x + 0.04, 0.76, z, yaw + turretYaw, 0, 0, 0.72);
      setInstance(barrelInstances, i, x + 0.62, 0.82, z, yaw + turretYaw, 0, barrelPitch, 0.72);
      setInstance(leftTreadInstances, i, x, 0, z - 0.52, yaw, 0, 0, 0.72);
      setInstance(rightTreadInstances, i, x, 0, z + 0.52, yaw, 0, 0, 0.72);
      updateTreadPhase(leftTreadInstances, i, treadPhase);
      updateTreadPhase(rightTreadInstances, i, treadPhase + 0.37);
      for (const side of [-0.55, 0.55]) {
        for (const wheelX of [-0.86, -0.42, 0.02, 0.46, 0.9]) {
          setInstance(gearInstances, gearIndex, x + wheelX, -0.12, z + side, yaw, 0, wheelSpin, 0.72);
          gearIndex += 1;
        }
      }
    }
    hullInstances.instanceMatrix.needsUpdate = true;
    turretInstances.instanceMatrix.needsUpdate = true;
    barrelInstances.instanceMatrix.needsUpdate = true;
    gearInstances.instanceMatrix.needsUpdate = true;
    leftTreadInstances.instanceMatrix.needsUpdate = true;
    rightTreadInstances.instanceMatrix.needsUpdate = true;

    for (const set of animatedTextureSets) {
      for (const map of set.maps) map.offset.x -= dt * 1.45;
    }

    resize();
    renderer.render(scene, camera);
    fpsAccum += 1 / Math.max(dt, 0.001);
    fpsFrames += 1;
    if (now - fpsLast > 1000) {
      fpsEl.textContent = Math.round(fpsAccum / fpsFrames) + ' fps local sample';
      fpsAccum = 0;
      fpsFrames = 0;
      fpsLast = now;
    }
    requestAnimationFrame(render);
  }
  verdictEl.textContent = 'Loaded hero proof plus 24 independently animated instanced tanks. Still red until tread readability, wheel orientation, barrel orientation, independent motion, and phone performance are accepted from this cloud page.';
  requestAnimationFrame(render);
}

boot().catch((error) => {
  verdictEl.textContent = 'Animated runtime proof failed: ' + String(error);
});

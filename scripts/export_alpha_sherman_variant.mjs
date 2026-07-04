import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

globalThis.self = globalThis;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(buffer).toString('base64');
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
};

const root = process.cwd();
const outputDir = path.join(root, 'public', 'tftm', 'models', 'alpha_sherman_combined');
const outputGlb = path.join(outputDir, 'alpha_sherman.glb');
const outputManifest = path.join(outputDir, 'model_manifest.json');
const loader = new GLTFLoader();
const olive = new THREE.MeshStandardMaterial({ color: 0x5f5a34, roughness: 0.86, metalness: 0.18 });
const crimson = new THREE.MeshStandardMaterial({ color: 0x7d2018, roughness: 0.9, metalness: 0.08, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const chalk = new THREE.MeshStandardMaterial({ color: 0xd8d2b8, roughness: 0.92, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const dust = new THREE.MeshStandardMaterial({ color: 0x8a7653, roughness: 1.0, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const darkGun = new THREE.MeshStandardMaterial({ color: 0x4a4b3b, roughness: 0.72, metalness: 0.34 });
const simplifyModifier = new SimplifyModifier();
const trackMat = new THREE.MeshStandardMaterial({ color: 0x3a3021, roughness: 0.86, metalness: 0.16, side: THREE.DoubleSide });
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x514632, roughness: 0.82, metalness: 0.2 });

function arrayBufferFromFile(file) {
  const buffer = readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function loadGlb(file) {
  return new Promise((resolve, reject) => {
    loader.parse(arrayBufferFromFile(file), '', (gltf) => resolve(gltf.scene), reject);
  });
}


function simplifyMeshes(object, keepRatio) {
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry?.getAttribute('position')) return;
    const geometry = child.geometry;
    const positions = geometry.getAttribute('position').count;
    const removeCount = Math.max(0, Math.floor(positions * (1 - keepRatio)));
    if (removeCount <= 0 || positions < 120) return;
    const simplified = simplifyModifier.modify(geometry, removeCount);
    simplified.computeVertexNormals();
    simplified.computeBoundingSphere();
    child.geometry = simplified;
  });
  return object;
}

function applyMaterial(object, material) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.geometry) child.geometry.computeVertexNormals();
    }
  });
  return object;
}

function normalizeObject(object, targetMaxAxis) {
  object.updateWorldMatrix(true, true);
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

function alignLongestAxisToX(object) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const halfTurn = Math.PI * 0.5;
  if (size.y > size.x && size.y >= size.z) object.rotation.z = -halfTurn;
  if (size.z > size.x && size.z > size.y) object.rotation.y = halfTurn;
  return object;
}

function alignWheelFaceToTankSide(object) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const halfTurn = Math.PI * 0.5;
  if (size.x <= size.y && size.x <= size.z) object.rotation.y = halfTurn;
  if (size.y < size.x && size.y <= size.z) object.rotation.x = halfTurn;
  return object;
}

function findFirstMesh(object) {
  let found = null;
  object.traverse((child) => {
    if (!found && child.isMesh && child.geometry) found = child;
  });
  if (!found) throw new Error('GLB part has no mesh');
  return found;
}

function bakeBarrelGeometryWithRearPivot(object) {
  object.updateWorldMatrix(true, true);
  const mesh = findFirstMesh(object);
  const geometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  const box = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position'));
  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-box.min.x, -center.y, -center.z);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeMeshFromGeometry(name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createTreadGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];
  const outerSide = 0.18;
  const innerSide = -0.18;
  const outerProfile = [
    { x: -1.58, y: 0.12, u: 0 }, { x: 1.18, y: 0.12, u: 4.15 },
    { x: 1.55, y: -0.03, u: 4.75 }, { x: 1.5, y: -0.24, u: 5.25 },
    { x: 1.27, y: -0.41, u: 5.75 }, { x: -1.34, y: -0.41, u: 9.75 },
    { x: -1.55, y: -0.25, u: 10.2 }, { x: -1.62, y: -0.05, u: 10.65 }
  ];
  const innerProfile = [
    { x: -1.34, y: 0.025, u: 0 }, { x: 1.02, y: 0.025, u: 4.15 },
    { x: 1.33, y: -0.055, u: 4.75 }, { x: 1.3, y: -0.19, u: 5.25 },
    { x: 1.12, y: -0.285, u: 5.75 }, { x: -1.16, y: -0.285, u: 9.75 },
    { x: -1.35, y: -0.19, u: 10.2 }, { x: -1.39, y: -0.06, u: 10.65 }
  ];
  function addVertex(x, y, z, u, v) {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  }
  function addQuad(a, b, c, d) {
    const start = positions.length / 3;
    addVertex(...a); addVertex(...b); addVertex(...c); addVertex(...d);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  function point(profile, index, z, v) {
    const item = profile[index % profile.length];
    return [item.x, item.y, z, item.u, v];
  }
  for (let i = 0; i < outerProfile.length; i += 1) {
    const next = (i + 1) % outerProfile.length;
    addQuad(point(outerProfile, i, outerSide, 0.05), point(outerProfile, next, outerSide, 0.05), point(innerProfile, next, outerSide, 0.95), point(innerProfile, i, outerSide, 0.95));
    addQuad(point(outerProfile, next, innerSide, 0.05), point(outerProfile, i, innerSide, 0.05), point(innerProfile, i, innerSide, 0.95), point(innerProfile, next, innerSide, 0.95));
    addQuad(point(outerProfile, i, outerSide, 0.04), point(outerProfile, i, innerSide, 0.96), point(outerProfile, next, innerSide, 0.96), point(outerProfile, next, outerSide, 0.04));
    addQuad(point(innerProfile, next, outerSide, 0.2), point(innerProfile, next, innerSide, 0.8), point(innerProfile, i, innerSide, 0.8), point(innerProfile, i, outerSide, 0.2));
  }
  function addOuterBand(x0, y0, x1, y1, band, u0, u1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const z = outerSide + 0.006;
    addQuad([x0 + nx * band, y0 + ny * band, z, u0, 0.22], [x1 + nx * band, y1 + ny * band, z, u1, 0.22], [x1 - nx * band, y1 - ny * band, z, u1, 0.34], [x0 - nx * band, y0 - ny * band, z, u0, 0.34]);
  }
  addOuterBand(-1.32, 0.085, 1.02, 0.085, 0.022, 0.45, 4.05);
  addOuterBand(-1.18, -0.37, 1.1, -0.37, 0.024, 6.05, 9.35);
  addOuterBand(1.27, -0.33, 1.45, -0.08, 0.02, 5.35, 5.85);
  addOuterBand(-1.5, -0.08, -1.28, -0.34, 0.02, 9.65, 10.25);
  function addUpperSidewall(z, v0, v1) {
    addQuad([-1.52, 0.13, z, 0.2, v0], [1.38, 0.13, z, 4.5, v0], [1.46, -0.12, z, 4.85, v1], [-1.58, -0.12, z, 0.05, v1]);
    addQuad([1.38, 0.13, z, 4.5, v0], [1.57, -0.02, z, 5.0, v0], [1.42, -0.2, z, 5.28, v1], [1.46, -0.12, z, 4.85, v1]);
    addQuad([-1.58, -0.12, z, 0.05, v1], [-1.52, 0.13, z, 0.2, v0], [-1.68, -0.03, z, 10.55, v0], [-1.48, -0.22, z, 10.2, v1]);
  }
  addUpperSidewall(outerSide + 0.012, 0.18, 0.88);
  addUpperSidewall(innerSide - 0.012, 0.88, 0.18);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}


function addBox(parent, name, material, position, scale, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addLetterA(parent, prefix, material, center, scale = 1, rotation = [0, 0, 0]) {
  const group = new THREE.Group();
  group.name = prefix + '_white_A_marking';
  group.position.set(...center);
  group.rotation.set(...rotation);
  parent.add(group);
  addBox(group, prefix + '_A_left_stroke', material, [-0.055 * scale, 0.015 * scale, 0], [0.018 * scale, 0.095 * scale, 0.008 * scale], [0, 0, -0.28]);
  addBox(group, prefix + '_A_right_stroke', material, [0.055 * scale, 0.015 * scale, 0], [0.018 * scale, 0.095 * scale, 0.008 * scale], [0, 0, 0.28]);
  addBox(group, prefix + '_A_crossbar', material, [0, 0.0, 0], [0.095 * scale, 0.018 * scale, 0.008 * scale]);
  return group;
}

function addAlphaCharacterMarks(model, turretPivot) {
  addBox(model, 'alpha_crimson_glacis_recognition_stripe', crimson, [0.43, 0.66, 0], [0.72, 0.018, 0.22], [0, 0, -0.14]);
  addBox(model, 'alpha_crimson_hull_roof_stripe', crimson, [-0.45, 0.78, 0], [0.9, 0.016, 0.2]);
  addBox(model, 'alpha_front_chalk_A17_plate', chalk, [1.18, 0.38, 0.01], [0.12, 0.018, 0.018], [0, 0, -0.18]);
  addBox(turretPivot, 'alpha_crimson_turret_side_panel_right', crimson, [0.05, 0.06, 0.63], [0.38, 0.24, 0.018]);
  addBox(turretPivot, 'alpha_crimson_turret_side_panel_left', crimson, [0.05, 0.06, -0.63], [0.38, 0.24, 0.018]);
  addBox(turretPivot, 'alpha_crimson_turret_roof_panel', crimson, [-0.14, 0.42, 0], [0.34, 0.018, 0.32]);
  addLetterA(turretPivot, 'alpha_turret_right', chalk, [0.08, 0.08, 0.654], 1.55);
  addLetterA(turretPivot, 'alpha_turret_left', chalk, [0.08, 0.08, -0.654], 1.55);
  addBox(model, 'alpha_left_fender_chalk_mark', chalk, [0.86, 0.44, -0.82], [0.16, 0.018, 0.026], [0, 0.12, -0.08]);
  addBox(model, 'alpha_right_fender_chalk_mark', chalk, [0.86, 0.44, 0.82], [0.16, 0.018, 0.026], [0, -0.12, -0.08]);
  for (const [index, x] of [-1.28, -0.72, -0.16, 0.42, 0.98].entries()) {
    addBox(model, 'alpha_dust_scratch_' + index, dust, [x, 0.86 + (index % 2) * 0.035, -0.24 + index * 0.1], [0.11, 0.008, 0.018], [0, 0, 0.25 - index * 0.08]);
  }
}

function countTriangles(object) {
  let triangles = 0;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry;
    const primitive = geometry.getIndex()?.count || geometry.getAttribute('position')?.count || 0;
    triangles += Math.floor(primitive / 3);
  });
  return triangles;
}

const kitDir = path.join(root, 'assets', 'generated', 'meshy', 'sherman_part_meshy_kit_v1');
const sourceFiles = {
  hull: path.join(kitDir, 'hull.glb'),
  turret: path.join(kitDir, 'turret.glb'),
  barrel: path.join(kitDir, 'barrel_only.glb'),
  gear: path.join(kitDir, 'gear_mobile.glb'),
  mantletSocket: path.join(root, 'assets', 'generated', 'meshy', 'sherman_mantlet_socket_v1', 'glb.glb'),
  machineGun: path.join(root, 'assets', 'generated', 'meshy', 'sherman_coaxial_mg_v1', 'glb.glb')
};

const [hullSource, turretSource, mantletSource, barrelSource, gearSource, mgSource] = await Promise.all([
  loadGlb(sourceFiles.hull), loadGlb(sourceFiles.turret), loadGlb(sourceFiles.mantletSocket),
  loadGlb(sourceFiles.barrel), loadGlb(sourceFiles.gear), loadGlb(sourceFiles.machineGun)
]);

const model = new THREE.Group();
model.name = 'alpha_sherman_combined';
const hull = applyMaterial(simplifyMeshes(normalizeObject(hullSource, 2.9), 0.62), olive);
hull.name = 'hull_upper_meshy';
hull.position.set(0, 0.22, 0);
model.add(hull);

const turretPivot = new THREE.Group();
turretPivot.name = 'turret_traverse_pivot';
turretPivot.position.set(0.05, 0.74, 0);
model.add(turretPivot);
const turret = applyMaterial(simplifyMeshes(normalizeObject(turretSource, 1.25), 0.62), olive);
turret.name = 'turret_shell_meshy';
turretPivot.add(turret);

const gunPivot = new THREE.Group();
gunPivot.name = 'cannon_elevation_pivot';
gunPivot.position.set(0.38, 0.09, 0);
turretPivot.add(gunPivot);
const mantlet = applyMaterial(simplifyMeshes(normalizeObject(mantletSource, 0.58), 0.5), olive);
mantlet.rotation.y = Math.PI * 0.5;
mantlet.name = 'mantlet_socket_meshy';
gunPivot.add(mantlet);
const barrelObject = alignLongestAxisToX(normalizeObject(barrelSource, 1.25));
const barrel = makeMeshFromGeometry('barrel_only_meshy', bakeBarrelGeometryWithRearPivot(barrelObject), olive);
barrel.position.set(-0.08, 0, 0);
gunPivot.add(barrel);
const coaxialMgObject = alignLongestAxisToX(normalizeObject(mgSource.clone(true), 0.95));
coaxialMgObject.rotation.y += Math.PI;
const coaxialMg = makeMeshFromGeometry('coaxial_mg_meshy', bakeBarrelGeometryWithRearPivot(coaxialMgObject), darkGun);
coaxialMg.position.set(0.26, -0.08, 0.34);
gunPivot.add(coaxialMg);
const bowMgObject = alignLongestAxisToX(normalizeObject(mgSource.clone(true), 0.72));
bowMgObject.rotation.y += Math.PI;
const bowMg = makeMeshFromGeometry('bow_mg_meshy', bakeBarrelGeometryWithRearPivot(bowMgObject), darkGun);
bowMg.position.set(1.14, 0.18, 0.36);
model.add(bowMg);
addAlphaCharacterMarks(model, turretPivot);

for (const z of [-0.72, 0.72]) {
  const tread = new THREE.Mesh(createTreadGeometry(), trackMat);
  tread.name = z < 0 ? 'left_tread_system_authored_trapezoid_ribbon' : 'right_tread_system_authored_trapezoid_ribbon';
  tread.position.z = z;
  model.add(tread);
}
for (const z of [-0.76, 0.76]) {
  for (const x of [-1.18, 0.02, 1.22]) {
    const wheel = applyMaterial(simplifyMeshes(alignWheelFaceToTankSide(normalizeObject(gearSource.clone(true), 0.34)), 0.65), wheelMat);
    wheel.name = z < 0 ? 'left_mobile_gear_wheel_meshy' : 'right_mobile_gear_wheel_meshy';
    wheel.position.set(x, -0.16, z);
    model.add(wheel);
  }
}

const scene = new THREE.Scene();
scene.name = 'vanilla_sherman_scene';
scene.add(model);
scene.updateWorldMatrix(true, true);
mkdirSync(outputDir, { recursive: true });

const exporter = new GLTFExporter();
const exported = await new Promise((resolve, reject) => {
  exporter.parse(scene, resolve, reject, { binary: true, trs: false, onlyVisible: true, maxTextureSize: 1024 });
});
writeFileSync(outputGlb, Buffer.from(exported));
const manifest = {
  asset_id: 'alpha_sherman_combined',
  display_name: 'Alpha Sherman Combined',
  generated_at: new Date().toISOString(),
  generator: 'scripts/export_alpha_sherman_variant.mjs',
  output_glb: 'public/tftm/models/alpha_sherman_combined/alpha_sherman.glb',
  source_components: sourceFiles,
  composition: [
    'Meshy hull upper', 'Meshy turret shell', 'Meshy mantlet socket', 'Meshy barrel only',
    'Meshy coaxial MG module follows cannon elevation and is pulled forward/outboard for default-camera readability',
    'Alpha player-character markings based on newest Downloads reference image', 'Meshy bow MG module stays fixed on hull front for anti-personnel read', 'Meshy mobile gear wheels',
    'authored closed Sherman-like trapezoid tread ribbons with sidewall blockers'
  ],
  runtime_contract: {
    static_combined_asset: true,
    phone_gate_target_triangles: 20000,
    export_decimation: 'SimplifyModifier applied to combined static GLB only; source Meshy component GLBs are unchanged and included in component zip.',
    animation_source: 'Use separated source components for turret traverse, barrel elevation, wheel spin, and tread material animation.',
    vanilla_identity: false,
    character_identity: 'alpha_player_sherman',
    reference_image: '/storage/emulated/0/Download/file_00000000544c720ca6775c5f5fb2a678 (1).png',
    visual_motifs: ['crimson recognition stripe', 'white A turret mark', 'chalk crew marks', 'field dirt'],
    barrel_rear_pivot_bake: true,
    anti_personnel_weapons: ['coaxial_mg_meshy', 'bow_mg_meshy'],
    anti_personnel_visibility_tune: 'parade-style coaxial plus bow MG restored; coaxial is forward/outboard for default alpha-control camera readability'
  },
  approximate_triangles: countTriangles(scene)
};
writeFileSync(outputManifest, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ outputGlb, outputManifest, bytes: Buffer.from(exported).byteLength, approximateTriangles: manifest.approximate_triangles }, null, 2));

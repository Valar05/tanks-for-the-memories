#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/inspect_glb_contract.mjs MODEL.glb');
  process.exit(2);
}

const modelPath = path.resolve(file);
if (!existsSync(modelPath)) {
  console.error('missing GLB: ' + file);
  process.exit(1);
}

const data = readFileSync(modelPath);
if (data.length < 20 || data.toString('utf8', 0, 4) !== 'glTF') {
  console.error('not a GLB file: ' + file);
  process.exit(1);
}

const version = data.readUInt32LE(4);
const length = data.readUInt32LE(8);
if (version !== 2 || length > data.length) {
  console.error('unsupported or corrupt GLB header');
  process.exit(1);
}

let offset = 12;
let json = null;
while (offset + 8 <= length) {
  const chunkLength = data.readUInt32LE(offset);
  const chunkType = data.toString('utf8', offset + 4, offset + 8);
  const start = offset + 8;
  const end = start + chunkLength;
  if (end > data.length) {
    console.error('corrupt GLB chunk length');
    process.exit(1);
  }
  if (chunkType === 'JSON') {
    json = JSON.parse(data.toString('utf8', start, end).trim());
    break;
  }
  offset = end;
}

if (!json) {
  console.error('GLB has no JSON chunk');
  process.exit(1);
}

const nodes = json.nodes || [];
const meshes = json.meshes || [];
const materials = json.materials || [];
const images = json.images || [];
const textures = json.textures || [];
const accessors = json.accessors || [];
const bufferViews = json.bufferViews || [];

const nodeNames = nodes.map((node, index) => node.name || `node_${index}`);
const meshNames = meshes.map((mesh, index) => mesh.name || `mesh_${index}`);
const materialNames = materials.map((material, index) => material.name || `material_${index}`);
const haystack = [...nodeNames, ...meshNames, ...materialNames].join(' ').toLowerCase();

const terms = {
  hull: ['hull', 'body', 'chassis', 'glacis'],
  turret: ['turret', 'cupola'],
  cannon: ['cannon', 'barrel', 'gun', 'mantlet'],
  track: ['track', 'tread', 'belt'],
  wheel: ['wheel', 'bogie', 'sprocket', 'idler', 'roller', 'vvss'],
  hatch: ['hatch', 'commander'],
  trackPod: ['track_pod', 'track pod', 'left_front_track', 'left_rear_track', 'right_front_track', 'right_rear_track'],
  beltRegion: ['belt_region', 'belt material', 'track_belt', 'tread_material'],
  coaxialWeapon: ['coaxial', 'machine_gun', 'mg'],
  mantletPivot: ['cannon_elevation', 'gun_mount', 'mantlet_pivot']
};

const requiredSystems = {
  hull: ['hull', 'hull_root', 'body', 'chassis'],
  turret: ['turret', 'turret_shell', 'turret_ring', 'turret_traverse_pivot'],
  mantlet: ['mantlet', 'gun_mount'],
  barrel: ['barrel', 'main_barrel', 'cannon', 'gun'],
  left_tread_system: ['left_tread', 'left_track', 'left tread', 'left track', 'track_l'],
  right_tread_system: ['right_tread', 'right_track', 'right tread', 'right track', 'track_r']
};

function findTerms(list) {
  return list.filter((term) => haystack.includes(term));
}

const found = Object.fromEntries(Object.entries(terms).map(([key, list]) => [key, findTerms(list)]));
const systemBindings = Object.fromEntries(Object.entries(requiredSystems).map(([key, list]) => [key, findTerms(list)]));
const missingSystems = Object.entries(systemBindings).filter(([, matches]) => matches.length === 0).map(([key]) => key);

let triangleCount = 0;
let primitiveCount = 0;
for (const mesh of meshes) {
  for (const primitive of mesh.primitives || []) {
    primitiveCount += 1;
    if (typeof primitive.indices === 'number' && accessors[primitive.indices]) {
      triangleCount += Math.floor((accessors[primitive.indices].count || 0) / 3);
    } else if (primitive.attributes && typeof primitive.attributes.POSITION === 'number' && accessors[primitive.attributes.POSITION]) {
      triangleCount += Math.floor((accessors[primitive.attributes.POSITION].count || 0) / 3);
    }
  }
}

const imageReports = images.map((image, index) => {
  const view = typeof image.bufferView === 'number' ? bufferViews[image.bufferView] : null;
  return {
    index,
    name: image.name || `image_${index}`,
    mimeType: image.mimeType || null,
    uri: image.uri || null,
    byteLength: view ? view.byteLength || 0 : 0
  };
});

const missingCritical = ['hull', 'turret', 'cannon', 'track', 'wheel'].filter((key) => found[key].length === 0);
let classification = 'accept';
const reasons = [];
if (triangleCount > 20000) {
  classification = 'reject';
  reasons.push('triangle count exceeds 20000 phone runtime rejection gate');
} else if (triangleCount > 12000) {
  classification = 'hybrid_accept';
  reasons.push('triangle count exceeds 12000 preferred phone runtime budget');
}
if (missingCritical.length > 0 && classification !== 'reject') {
  classification = 'hybrid_accept';
  reasons.push('animation regions need runtime supplemental binding: ' + missingCritical.join(', '));
}
if (primitiveCount <= 2 && classification !== 'reject') {
  classification = 'hybrid_accept';
  reasons.push('very low primitive count suggests fused static sculpture; usable only as body/display base');
}
if (missingSystems.length > 0 && classification !== 'reject') {
  classification = 'hybrid_accept';
  reasons.push('minimal moving systems are unbound: ' + missingSystems.join(', '));
}
if (reasons.length === 0) {
  reasons.push('all critical regions are named or inferable and preview budget is within gate');
}

const report = {
  file: path.relative(process.cwd(), modelPath),
  glbVersion: version,
  byteLength: data.length,
  nodeCount: nodes.length,
  meshCount: meshes.length,
  primitiveCount,
  materialCount: materials.length,
  textureCount: textures.length,
  imageCount: images.length,
  approximateTriangles: triangleCount,
  foundTerms: found,
  systemBindings,
  missingSystems,
  nodeNames,
  meshNames,
  materialNames,
  images: imageReports,
  classification,
  reasons
};

console.log(JSON.stringify(report, null, 2));
if (classification === 'reject') {
  process.exit(1);
}

#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'tftm', 'models', 'meshy_sherman_envelope_assembly_v1');
const sourceImages = {
  hull: '/storage/emulated/0/Pictures/file_00000000e68871f89b503a6afb63782f.png',
  turret: '/storage/emulated/0/Pictures/file_00000000407c71fd8087828e55eb7cc0.png',
  treads: '/storage/emulated/0/Pictures/file_00000000cd0471fdafbe2cfc4e794220.png'
};
const envelopes = [
  {
    id: 'hull_envelope',
    label: 'Meshy hull envelope',
    area: 'hull',
    runtimeRole: 'textured_hull_envelope',
    source: 'hull',
    sourceGlb: '/storage/emulated/0/Download/Meshy_AI_Iron_Sentinel_0708005243_texture.glb',
    runtimeFile: 'meshy_hull_envelope.glb',
    defaultVisible: true,
    defaultTransform: { position: [-0.04, 0.20, 0.00], rotationDeg: [0, 0, 0], scale: [1.65, 1.82, 2.18] }
  },
  {
    id: 'turret_kit_envelope',
    label: 'Meshy turret kit envelope',
    area: 'turret',
    runtimeRole: 'textured_turret_kit_envelope',
    source: 'turret',
    sourceGlb: '/storage/emulated/0/Download/Meshy_AI_Disassembled_Tank_Tur_0708005235_texture.glb',
    runtimeFile: 'meshy_turret_kit_envelope.glb',
    defaultVisible: true,
    defaultTransform: { position: [0.08, 0.92, 0.00], rotationDeg: [0, 0, 0], scale: [0.62, 0.62, 0.62] }
  },
  {
    id: 'meshy_treads_envelope',
    label: 'Meshy treads envelope reference',
    area: 'treads',
    runtimeRole: 'textured_treads_reference_envelope',
    source: 'treads',
    sourceGlb: '/storage/emulated/0/Download/Meshy_AI_Exploded_View_of_a_Tr_0708005253_texture.glb',
    runtimeFile: 'meshy_treads_envelope.glb',
    defaultVisible: false,
    defaultTransform: { position: [0.0, -0.08, 0.0], rotationDeg: [0, 0, 0], scale: [1.05, 1.05, 1.05] }
  }
];
function accessorTypeSize(type) { return ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 })[type] || 1; }
function componentBytes(componentType) { return ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 })[componentType] || 0; }
function componentReader(componentType) {
  if (componentType === 5120) return (data, offset) => data.readInt8(offset);
  if (componentType === 5121) return (data, offset) => data.readUInt8(offset);
  if (componentType === 5122) return (data, offset) => data.readInt16LE(offset);
  if (componentType === 5123) return (data, offset) => data.readUInt16LE(offset);
  if (componentType === 5125) return (data, offset) => data.readUInt32LE(offset);
  if (componentType === 5126) return (data, offset) => data.readFloatLE(offset);
  throw new Error('unsupported accessor componentType ' + componentType);
}
function readGlb(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB: ' + file);
  let offset = 12;
  let json = null;
  let binStart = 0;
  while (offset + 8 <= data.length) {
    const chunkLength = data.readUInt32LE(offset);
    const chunkType = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    if (chunkType === 'JSON') json = JSON.parse(data.toString('utf8', start, end).trim());
    if (chunkType === 'BIN\0') binStart = start;
    offset = end;
  }
  if (!json || !binStart) throw new Error('GLB missing JSON or BIN: ' + file);
  return { data, json, binStart };
}
function readAccessorValues(data, binStart, json, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  const view = json.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view) throw new Error('missing accessor ' + accessorIndex);
  const components = accessorTypeSize(accessor.type);
  const bytes = componentBytes(accessor.componentType);
  const stride = view.byteStride || components * bytes;
  const base = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const read = componentReader(accessor.componentType);
  const values = [];
  for (let i = 0; i < (accessor.count || 0); i += 1) {
    if (components === 1) values.push(read(data, base + i * stride));
    else {
      const tuple = [];
      for (let c = 0; c < components; c += 1) tuple.push(read(data, base + i * stride + c * bytes));
      values.push(tuple);
    }
  }
  return values;
}
function primitiveIndices(glb, primitive) {
  if (typeof primitive.indices === 'number') return readAccessorValues(glb.data, glb.binStart, glb.json, primitive.indices);
  const count = glb.json.accessors?.[primitive.attributes?.POSITION]?.count || 0;
  return Array.from({ length: count }, (_, index) => index);
}
function inspectEnvelope(file) {
  const glb = readGlb(file);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let vertices = 0;
  for (const mesh of glb.json.meshes || []) for (const primitive of mesh.primitives || []) {
    if (typeof primitive.attributes?.POSITION !== 'number') continue;
    const positions = readAccessorValues(glb.data, glb.binStart, glb.json, primitive.attributes.POSITION);
    vertices += positions.length;
    triangles += Math.floor(primitiveIndices(glb, primitive).length / 3);
    for (const position of positions) for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], position[axis]);
      max[axis] = Math.max(max[axis], position[axis]);
    }
  }
  const materials = glb.json.materials || [];
  const hasBaseColorTexture = materials.some((material) => material.pbrMetallicRoughness?.baseColorTexture);
  const hasPbrTextures = hasBaseColorTexture && (glb.json.images?.length || 0) > 0 && (glb.json.textures?.length || 0) > 0;
  return {
    triangles,
    vertices,
    byteLength: statSync(file).size,
    materialCount: materials.length,
    imageCount: glb.json.images?.length || 0,
    textureCount: glb.json.textures?.length || 0,
    has_base_color_texture: hasBaseColorTexture,
    has_pbr_texture_payload: hasPbrTextures,
    bbox: {
      min,
      max,
      size: max.map((value, axis) => Number((value - min[axis]).toFixed(5))),
      center: max.map((value, axis) => Number(((value + min[axis]) / 2).toFixed(5)))
    }
  };
}
function main() {
  mkdirSync(outDir, { recursive: true });
  const imageOutDir = path.join(outDir, 'source_images');
  mkdirSync(imageOutDir, { recursive: true });
  const sourceImageManifest = {};
  for (const [key, file] of Object.entries(sourceImages)) {
    const out = path.join(imageOutDir, path.basename(file));
    if (existsSync(file)) copyFileSync(file, out);
    sourceImageManifest[key] = { source: file, runtime: path.relative(root, out).split(path.sep).join('/') };
  }
  const parts = {};
  for (const envelope of envelopes) {
    if (!existsSync(envelope.sourceGlb)) throw new Error('missing envelope source GLB ' + envelope.sourceGlb);
    const runtimePath = path.join(outDir, envelope.runtimeFile);
    copyFileSync(envelope.sourceGlb, runtimePath);
    const stats = inspectEnvelope(runtimePath);
    if (!stats.has_pbr_texture_payload) throw new Error('envelope lacks embedded texture payload: ' + envelope.id);
    parts[envelope.id] = {
      id: envelope.id,
      label: envelope.label,
      area: envelope.area,
      runtime_role: envelope.runtimeRole,
      source_model: envelope.source,
      source_image: sourceImages[envelope.source],
      source_glb: envelope.sourceGlb,
      runtime_glb: 'public/tftm/models/meshy_sherman_envelope_assembly_v1/' + envelope.runtimeFile,
      runtime_url: './tftm/models/meshy_sherman_envelope_assembly_v1/' + envelope.runtimeFile,
      default_visible: envelope.defaultVisible,
      default_transform: envelope.defaultTransform,
      envelope_policy: 'whole source GLB envelope copied intact; no internal component extraction, no recentering, no material replacement',
      ...stats
    };
  }
  const manifest = {
    asset_id: 'meshy_sherman_envelope_assembly_v1',
    revision: 'v1-textured-envelope-assembly-20260708',
    generated_at: new Date().toISOString(),
    generator: 'scripts/build_meshy_envelope_assembly.mjs',
    source_policy: 'Whole Meshy source envelopes copied intact. Compose envelope transforms only; do not compose or recenter internal pieces. Preserve embedded Meshy textures/materials/UVs.',
    source_images: sourceImageManifest,
    areas: ['hull', 'treads', 'turret'],
    runtime_contract: {
      hull: 'load the full textured Meshy hull source GLB as one envelope',
      turret: 'load the full textured Meshy turret-kit source GLB as one envelope; barrel/coax/hatches stay in the source grouping instead of being separately composed',
      treads: 'authored animated treads remain visible by default; full textured Meshy tread envelope is optional reference/model-swap candidate',
      parade: 'future 24-tank parade must instance envelope geometry/material sets instead of deep-cloning object trees'
    },
    parts
  };
  writeFileSync(path.join(outDir, 'envelope_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, outDir: path.relative(root, outDir), envelopes: Object.keys(parts).length }, null, 2));
}
main();

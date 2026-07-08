#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'assets', 'generated', 'meshy');
const outDir = path.join(root, 'public', 'tftm', 'models', 'meshy_sherman_lowpoly_envelope_v1');
const sourceImages = {
  hull: '/storage/emulated/0/Pictures/file_00000000e68871f89b503a6afb63782f.png',
  turret: '/storage/emulated/0/Pictures/file_00000000407c71fd8087828e55eb7cc0.png',
  treads: '/storage/emulated/0/Pictures/file_00000000cd0471fdafbe2cfc4e794220.png'
};
const selected = [
  {
    id: 'lowpoly_hull_envelope',
    label: 'Meshy strict lowpoly hull envelope',
    area: 'hull',
    runtimeRole: 'strict_lowpoly_hull_pbr_envelope',
    selectedSlug: 'sherman_lowpoly_hull_envelope_v2',
    rejectedSlug: 'sherman_lowpoly_hull_envelope_v1',
    selectedReason: 'v2 reduced unique-position count from 7423 to 6791 without local decimation',
    source: 'hull',
    runtimeFile: 'lowpoly_hull_envelope.glb',
    defaultVisible: true,
    defaultTransform: { position: [-0.04, 0.20, 0.00], rotationDeg: [0, 0, 0], scale: [1.65, 1.82, 2.18] },
    maxUniquePositions: 8000,
    maxTriangles: 16000
  },
  {
    id: 'lowpoly_turret_envelope',
    label: 'Meshy strict lowpoly turret envelope',
    area: 'turret',
    runtimeRole: 'strict_lowpoly_turret_pbr_envelope',
    selectedSlug: 'sherman_lowpoly_turret_envelope_v1',
    rejectedSlug: 'sherman_lowpoly_turret_envelope_v2',
    selectedReason: 'v1 had lower unique-position and triangle counts than stricter v2; both were generated as lowpoly, no decimation',
    source: 'turret',
    runtimeFile: 'lowpoly_turret_envelope.glb',
    defaultVisible: true,
    defaultTransform: { position: [0.08, 0.92, 0.00], rotationDeg: [0, 0, 0], scale: [0.62, 0.62, 0.62] },
    maxUniquePositions: 7500,
    maxTriangles: 15000
  },
  {
    id: 'lowpoly_treads_envelope',
    label: 'Meshy strict lowpoly tread/running gear envelope',
    area: 'treads',
    runtimeRole: 'strict_lowpoly_treads_pbr_reference_envelope',
    selectedSlug: 'sherman_lowpoly_treads_envelope_v1',
    rejectedSlug: 'sherman_lowpoly_treads_envelope_v2',
    selectedReason: 'v1 had lower unique-position and triangle counts than stricter v2; both were generated as lowpoly, no decimation',
    source: 'treads',
    runtimeFile: 'lowpoly_treads_envelope.glb',
    defaultVisible: false,
    defaultTransform: { position: [0, -0.08, 0], rotationDeg: [0, 0, 0], scale: [1.05, 1.05, 1.05] },
    maxUniquePositions: 10000,
    maxTriangles: 20000
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
    if (chunkType === 'JSON') json = JSON.parse(data.toString('utf8', start, start + chunkLength).trim());
    if (chunkType === 'BIN\0') binStart = start;
    offset = start + chunkLength;
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
function inspectGlb(file) {
  const glb = readGlb(file);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const unique = new Set();
  let triangles = 0;
  let vertices = 0;
  let primitives = 0;
  for (const mesh of glb.json.meshes || []) for (const primitive of mesh.primitives || []) {
    if (typeof primitive.attributes?.POSITION !== 'number') continue;
    primitives += 1;
    const positions = readAccessorValues(glb.data, glb.binStart, glb.json, primitive.attributes.POSITION);
    vertices += positions.length;
    triangles += Math.floor(primitiveIndices(glb, primitive).length / 3);
    for (const position of positions) {
      unique.add(position.map((v) => Math.round(v * 10000)).join(','));
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], position[axis]);
        max[axis] = Math.max(max[axis], position[axis]);
      }
    }
  }
  const materials = glb.json.materials || [];
  return {
    triangles,
    vertices,
    unique_positions: unique.size,
    primitiveCount: primitives,
    byteLength: statSync(file).size,
    materialCount: materials.length,
    imageCount: glb.json.images?.length || 0,
    textureCount: glb.json.textures?.length || 0,
    has_base_color_texture: materials.some((material) => material.pbrMetallicRoughness?.baseColorTexture),
    has_normal_texture: materials.some((material) => material.normalTexture),
    has_pbr_texture_payload: (glb.json.images?.length || 0) > 0 && (glb.json.textures?.length || 0) > 0 && materials.some((material) => material.pbrMetallicRoughness?.baseColorTexture),
    bbox: { min, max, size: max.map((value, axis) => Number((value - min[axis]).toFixed(5))), center: max.map((value, axis) => Number(((value + min[axis]) / 2).toFixed(5))) }
  };
}
function payloadFromManifest(manifest) {
  return manifest.provenance?.find((entry) => entry.step === 'image_to_3d')?.payload || manifest.dry_run_payload || {};
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
  const comparison = {};
  for (const part of selected) {
    const selectedDir = path.join(sourceRoot, part.selectedSlug);
    const sourceGlb = path.join(selectedDir, 'glb.glb');
    const sourceFbx = path.join(selectedDir, 'fbx.fbx');
    const sourceManifestPath = path.join(selectedDir, 'manifest.json');
    if (!existsSync(sourceGlb) || !existsSync(sourceManifestPath)) throw new Error('missing selected Meshy output for ' + part.id);
    const selectedManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
    const selectedPayload = payloadFromManifest(selectedManifest);
    if (selectedPayload.model_type !== 'lowpoly') throw new Error(part.id + ' was not generated with model_type lowpoly');
    if (selectedPayload.target_polycount == null) throw new Error(part.id + ' missing target_polycount in provenance payload');
    const runtimePath = path.join(outDir, part.runtimeFile);
    copyFileSync(sourceGlb, runtimePath);
    const stats = inspectGlb(runtimePath);
    if (!stats.has_pbr_texture_payload) throw new Error(part.id + ' lacks embedded PBR texture payload');
    if (stats.unique_positions > part.maxUniquePositions) throw new Error(part.id + ' exceeds unique-position budget ' + stats.unique_positions + ' > ' + part.maxUniquePositions);
    if (stats.triangles > part.maxTriangles) throw new Error(part.id + ' exceeds triangle budget ' + stats.triangles + ' > ' + part.maxTriangles);
    const rejectedPath = path.join(sourceRoot, part.rejectedSlug, 'glb.glb');
    comparison[part.id] = { selected_slug: part.selectedSlug, rejected_slug: part.rejectedSlug, selected_reason: part.selectedReason, selected_stats: stats, rejected_stats: existsSync(rejectedPath) ? inspectGlb(rejectedPath) : null };
    parts[part.id] = {
      id: part.id,
      label: part.label,
      area: part.area,
      runtime_role: part.runtimeRole,
      source_model: part.source,
      source_image: sourceImages[part.source],
      source_asset_slug: part.selectedSlug,
      rejected_asset_slug: part.rejectedSlug,
      selected_reason: part.selectedReason,
      task_id: selectedManifest.tasks?.image_to_3d || '',
      source_glb: path.relative(root, sourceGlb).split(path.sep).join('/'),
      source_fbx: existsSync(sourceFbx) ? path.relative(root, sourceFbx).split(path.sep).join('/') : '',
      source_manifest: path.relative(root, sourceManifestPath).split(path.sep).join('/'),
      runtime_glb: 'public/tftm/models/meshy_sherman_lowpoly_envelope_v1/' + part.runtimeFile,
      runtime_url: './tftm/models/meshy_sherman_lowpoly_envelope_v1/' + part.runtimeFile,
      default_visible: part.defaultVisible,
      default_transform: part.defaultTransform,
      generation_policy: 'Meshy image-to-3D generated directly with model_type=lowpoly and target_polycount; no high-to-low bake, no Blender decimation, no component extraction',
      requested: {
        model_type: selectedPayload.model_type,
        target_polycount: selectedPayload.target_polycount,
        enable_pbr: selectedPayload.enable_pbr,
        hd_texture: selectedPayload.hd_texture,
        should_remesh: selectedPayload.should_remesh,
        topology: selectedPayload.topology,
        target_formats: selectedPayload.target_formats
      },
      budget: { max_unique_positions: part.maxUniquePositions, max_triangles: part.maxTriangles },
      ...stats
    };
  }
  const manifest = {
    asset_id: 'meshy_sherman_lowpoly_envelope_v1',
    revision: 'v1-direct-lowpoly-pbr-20260708',
    generated_at: new Date().toISOString(),
    generator: 'scripts/build_meshy_lowpoly_envelope_assembly.mjs',
    source_policy: 'Direct Meshy lowpoly image-to-3D outputs from concept images. No high-to-low pipeline, no local decimation, no component extraction. Runtime GLBs preserve Meshy UVs/materials/PBR textures.',
    source_images: sourceImageManifest,
    areas: ['hull', 'treads', 'turret'],
    runtime_contract: {
      hull: 'full lowpoly PBR hull envelope generated directly by Meshy',
      turret: 'full lowpoly PBR turret envelope generated directly by Meshy; internal kit pieces remain source grouping',
      treads: 'full lowpoly PBR tread/running-gear envelope generated directly by Meshy; authored treads may remain animation reference until accepted',
      parade: '24-tank runtime must use instanced/shared geometry and preserve imported PBR maps; no cloned high-poly object trees'
    },
    comparison,
    parts
  };
  writeFileSync(path.join(outDir, 'lowpoly_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, outDir: path.relative(root, outDir), parts: Object.keys(parts).length }, null, 2));
}
main();

#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'tftm', 'models', 'meshy_sherman_component_assembly_v1');
const sourceImages = {
  hull: '/storage/emulated/0/Pictures/file_00000000e68871f89b503a6afb63782f.png',
  turret: '/storage/emulated/0/Pictures/file_00000000407c71fd8087828e55eb7cc0.png',
  treads: '/storage/emulated/0/Pictures/file_00000000cd0471fdafbe2cfc4e794220.png'
};
const sourceModels = {
  hull: '/storage/emulated/0/Download/Meshy_AI_Iron_Sentinel_0708005243_texture.glb',
  turret: '/storage/emulated/0/Download/Meshy_AI_Disassembled_Tank_Tur_0708005235_texture.glb',
  treads: '/storage/emulated/0/Download/Meshy_AI_Exploded_View_of_a_Tr_0708005253_texture.glb'
};
const selected = [
  { id: 'hull_shell', area: 'hull', source: 'hull', rank: 0, label: 'Whole Meshy hull shell', runtimeRole: 'hull_shell', defaultVisible: true, defaultTransform: { position: [0, 0.25, 0], rotationDeg: [0, 0, 0], scale: [1.67, 2.23, 2.42] } },
  { id: 'turret_shell', area: 'turret', source: 'turret', rank: 0, label: 'Turret shell with fused mantlet and two holes', runtimeRole: 'turret_shell', defaultVisible: true, defaultTransform: { position: [0.04, 0.86, 0], rotationDeg: [0, 0, 0], scale: [0.72, 0.72, 0.72] } },
  { id: 'commander_hatch', area: 'turret', source: 'turret', rank: 1, label: 'Commander hatch candidate', runtimeRole: 'commander_hatch', defaultVisible: true, defaultTransform: { position: [-0.18, 1.08, -0.24], rotationDeg: [0, 0, 0], scale: [0.58, 0.58, 0.58] } },
  { id: 'loader_hatch', area: 'turret', source: 'turret', rank: 2, label: 'Loader hatch candidate', runtimeRole: 'loader_hatch', defaultVisible: true, defaultTransform: { position: [0.34, 1.08, 0.20], rotationDeg: [0, 0, 0], scale: [0.58, 0.58, 0.58] } },
  { id: 'main_barrel', area: 'turret', source: 'turret', rank: 4, label: 'Main barrel candidate', runtimeRole: 'main_barrel', defaultVisible: true, defaultTransform: { position: [0.44, 0.86, 0], rotationDeg: [0, 0, 0], scale: [0.72, 0.72, 0.72] } },
  { id: 'coax_mg', area: 'turret', source: 'turret', rank: 5, label: 'Coax / MG candidate', runtimeRole: 'coax_mg', defaultVisible: true, defaultTransform: { position: [0.45, 0.82, 0.18], rotationDeg: [0, 0, 0], scale: [0.72, 0.72, 0.72] } },
  { id: 'roof_cap', area: 'turret', source: 'turret', rank: 6, label: 'Small roof cap optional', runtimeRole: 'roof_cap', defaultVisible: false, defaultTransform: { position: [0.10, 1.10, 0.02], rotationDeg: [0, 0, 0], scale: [0.72, 0.72, 0.72] } },
  { id: 'tread_foot', area: 'treads', source: 'treads', rank: 1, label: 'Meshy tread foot reference', runtimeRole: 'tread_foot_reference', defaultVisible: false, defaultTransform: { position: [-1.10, -0.18, -0.82], rotationDeg: [0, 0, 0], scale: [0.55, 0.55, 0.55] } },
  { id: 'road_wheel', area: 'treads', source: 'treads', rank: 2, label: 'Meshy road wheel reference', runtimeRole: 'road_wheel_reference', defaultVisible: false, defaultTransform: { position: [-0.48, -0.25, -0.82], rotationDeg: [0, 0, 0], scale: [0.62, 0.62, 0.62] } },
  { id: 'small_runner', area: 'treads', source: 'treads', rank: 7, label: 'Small runner reference', runtimeRole: 'small_runner_reference', defaultVisible: false, defaultTransform: { position: [0.18, -0.19, -0.82], rotationDeg: [0, 0, 0], scale: [0.62, 0.62, 0.62] } },
  { id: 'running_gear_rail', area: 'treads', source: 'treads', rank: 0, label: 'Meshy rail reference', runtimeRole: 'rail_reference', defaultVisible: false, defaultTransform: { position: [0.10, -0.04, -0.82], rotationDeg: [0, 0, 0], scale: [0.55, 0.55, 0.55] } },
  { id: 'sprocket_like', area: 'treads', source: 'treads', rank: 3, label: 'Sprocket-like reference', runtimeRole: 'sprocket_reference', defaultVisible: false, defaultTransform: { position: [1.05, -0.18, -0.82], rotationDeg: [0, 0, 0], scale: [0.62, 0.62, 0.62] } }
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
  const length = data.readUInt32LE(8);
  let offset = 12;
  let json = null;
  let binStart = 0;
  let binLength = 0;
  while (offset + 8 <= Math.min(length, data.length)) {
    const chunkLength = data.readUInt32LE(offset);
    const chunkType = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    if (chunkType === 'JSON') json = JSON.parse(data.toString('utf8', start, end).trim());
    if (chunkType === 'BIN\0') { binStart = start; binLength = chunkLength; }
    offset = end;
  }
  if (!json || !binStart) throw new Error('GLB missing JSON or BIN: ' + file);
  return { data, json, binStart, binLength };
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
function makeTriangleIndices(data, binStart, json, primitive) {
  const mode = primitive.mode ?? 4;
  const posAccessor = primitive.attributes?.POSITION;
  if (typeof posAccessor !== 'number') return [];
  let elements = [];
  if (typeof primitive.indices === 'number') elements = readAccessorValues(data, binStart, json, primitive.indices);
  else elements = Array.from({ length: json.accessors[posAccessor].count || 0 }, (_, i) => i);
  const triangles = [];
  if (mode === 4) for (let i = 0; i + 2 < elements.length; i += 3) triangles.push([elements[i], elements[i + 1], elements[i + 2]]);
  else if (mode === 5) for (let i = 0; i + 2 < elements.length; i += 1) triangles.push(i % 2 === 0 ? [elements[i], elements[i + 1], elements[i + 2]] : [elements[i + 1], elements[i], elements[i + 2]]);
  else if (mode === 6) for (let i = 1; i + 1 < elements.length; i += 1) triangles.push([elements[0], elements[i], elements[i + 1]]);
  return triangles.filter((tri) => tri[0] !== tri[1] && tri[0] !== tri[2] && tri[1] !== tri[2]);
}
function positionKey(p, tolerance = 1e-7) { return `${Math.round(p[0] / tolerance)},${Math.round(p[1] / tolerance)},${Math.round(p[2] / tolerance)}`; }
class Dsu {
  constructor(count) { this.parent = Array.from({ length: count }, (_, i) => i); }
  find(a) { while (this.parent[a] !== a) { this.parent[a] = this.parent[this.parent[a]]; a = this.parent[a]; } return a; }
  union(a, b) { const ra = this.find(a); const rb = this.find(b); if (ra !== rb) this.parent[rb] = ra; }
}
function primitiveData(source) {
  const mesh = source.json.meshes?.[0];
  const primitive = mesh?.primitives?.[0];
  if (!primitive || typeof primitive.attributes?.POSITION !== 'number') throw new Error('expected one mesh primitive with positions');
  return {
    primitive,
    positions: readAccessorValues(source.data, source.binStart, source.json, primitive.attributes.POSITION),
    normals: typeof primitive.attributes.NORMAL === 'number' ? readAccessorValues(source.data, source.binStart, source.json, primitive.attributes.NORMAL) : null,
    uvs: typeof primitive.attributes.TEXCOORD_0 === 'number' ? readAccessorValues(source.data, source.binStart, source.json, primitive.attributes.TEXCOORD_0) : null,
    triangles: makeTriangleIndices(source.data, source.binStart, source.json, primitive)
  };
}
function connectedIslands(pd) {
  const parent = new Map();
  const used = new Set();
  const find = (v) => {
    let p = parent.get(v);
    if (p === undefined) { parent.set(v, v); return v; }
    while (p !== parent.get(p)) p = parent.get(p);
    let cur = v;
    while (parent.get(cur) !== p) { const next = parent.get(cur); parent.set(cur, p); cur = next; }
    return p;
  };
  const unite = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const tri of pd.triangles) { used.add(tri[0]); used.add(tri[1]); used.add(tri[2]); unite(tri[0], tri[1]); unite(tri[1], tri[2]); }
  const groups = new Map();
  for (const index of used) {
    const rootIndex = find(index);
    if (!groups.has(rootIndex)) groups.set(rootIndex, { vertexSet: new Set(), triangles: [] });
    groups.get(rootIndex).vertexSet.add(index);
  }
  for (const tri of pd.triangles) groups.get(find(tri[0]))?.triangles.push(tri);
  return [...groups.values()].map((group) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const index of group.vertexSet) for (let axis = 0; axis < 3; axis += 1) { min[axis] = Math.min(min[axis], pd.positions[index][axis]); max[axis] = Math.max(max[axis], pd.positions[index][axis]); }
    return { vertexSet: group.vertexSet, triangles: group.triangles, min, max };
  });
}
function weldedComponents(pd) {
  const islands = connectedIslands(pd);
  const dsu = new Dsu(islands.length);
  const buckets = new Map();
  islands.forEach((island, islandIndex) => {
    const seen = new Set();
    for (const vertexIndex of island.vertexSet) {
      const key = positionKey(pd.positions[vertexIndex]);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(islandIndex);
    }
  });
  for (const arrRaw of buckets.values()) {
    const arr = [...new Set(arrRaw)];
    for (let i = 1; i < arr.length; i += 1) dsu.union(arr[0], arr[i]);
  }
  const components = new Map();
  islands.forEach((island, islandIndex) => {
    const root = dsu.find(islandIndex);
    if (!components.has(root)) components.set(root, { islandIndices: [], vertexSet: new Set(), triangles: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    const component = components.get(root);
    component.islandIndices.push(islandIndex);
    for (const v of island.vertexSet) component.vertexSet.add(v);
    component.triangles.push(...island.triangles);
    for (let axis = 0; axis < 3; axis += 1) { component.min[axis] = Math.min(component.min[axis], island.min[axis]); component.max[axis] = Math.max(component.max[axis], island.max[axis]); }
  });
  return [...components.values()].map((component) => ({
    ...component,
    size: component.max.map((v, axis) => Number((v - component.min[axis]).toFixed(5))),
    center: component.max.map((v, axis) => Number(((v + component.min[axis]) / 2).toFixed(5))),
    trianglesCount: component.triangles.length,
    verticesCount: component.vertexSet.size
  })).sort((a, b) => b.trianglesCount - a.trianglesCount);
}
function align4(value) { return (value + 3) & ~3; }
function pushPadded(chunks, buffer) { const offset = chunks.reduce((sum, chunk) => sum + chunk.length, 0); chunks.push(buffer); const padded = align4(buffer.length) - buffer.length; if (padded) chunks.push(Buffer.alloc(padded)); return offset; }
function floatBuffer(values, tupleSize) { const buffer = Buffer.alloc(values.length * tupleSize * 4); let o = 0; for (const tuple of values) for (let i = 0; i < tupleSize; i += 1) { buffer.writeFloatLE(tuple[i] || 0, o); o += 4; } return buffer; }
function indexBuffer(indices, componentType) { const bytes = componentType === 5123 ? 2 : 4; const buffer = Buffer.alloc(indices.length * bytes); for (let i = 0; i < indices.length; i += 1) { if (componentType === 5123) buffer.writeUInt16LE(indices[i], i * 2); else buffer.writeUInt32LE(indices[i], i * 4); } return buffer; }
function writeComponentGlb(source, pd, component, outputFile, name) {
  const remap = new Map();
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const addVertex = (sourceIndex) => {
    if (remap.has(sourceIndex)) return remap.get(sourceIndex);
    const next = remap.size;
    remap.set(sourceIndex, next);
    positions.push(pd.positions[sourceIndex] || [0, 0, 0]);
    if (pd.normals) normals.push(pd.normals[sourceIndex] || [0, 1, 0]);
    if (pd.uvs) uvs.push(pd.uvs[sourceIndex] || [0, 0]);
    return next;
  };
  for (const tri of component.triangles) indices.push(addVertex(tri[0]), addVertex(tri[1]), addVertex(tri[2]));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of positions) for (let axis = 0; axis < 3; axis += 1) { min[axis] = Math.min(min[axis], p[axis]); max[axis] = Math.max(max[axis], p[axis]); }
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  const addBufferView = (buffer, target) => { const byteOffset = pushPadded(chunks, buffer); const view = { buffer: 0, byteOffset, byteLength: buffer.length }; if (target) view.target = target; bufferViews.push(view); return bufferViews.length - 1; };
  const posView = addBufferView(floatBuffer(positions, 3), 34962);
  accessors.push({ bufferView: posView, componentType: 5126, count: positions.length, type: 'VEC3', min, max });
  const attributes = { POSITION: 0 };
  if (pd.normals) { const normalView = addBufferView(floatBuffer(normals, 3), 34962); accessors.push({ bufferView: normalView, componentType: 5126, count: normals.length, type: 'VEC3' }); attributes.NORMAL = accessors.length - 1; }
  if (pd.uvs) { const uvView = addBufferView(floatBuffer(uvs, 2), 34962); accessors.push({ bufferView: uvView, componentType: 5126, count: uvs.length, type: 'VEC2' }); attributes.TEXCOORD_0 = accessors.length - 1; }
  const indexComponentType = positions.length <= 65535 ? 5123 : 5125;
  const idxView = addBufferView(indexBuffer(indices, indexComponentType), 34963);
  accessors.push({ bufferView: idxView, componentType: indexComponentType, count: indices.length, type: 'SCALAR', min: [0], max: [positions.length - 1] });
  const binary = Buffer.concat(chunks);
  const json = {
    asset: { version: '2.0', generator: 'tftm welded Meshy component extractor v1' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [{ attributes, indices: accessors.length - 1, material: 0, mode: 4 }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews,
    accessors,
    materials: [{ name: name + '_runtime_shared_material', pbrMetallicRoughness: { baseColorFactor: [0.36, 0.39, 0.25, 1], metallicFactor: 0.08, roughnessFactor: 0.86 } }],
    extras: { componentName: name, triangleCount: indices.length / 3, vertexCount: positions.length }
  };
  const jsonRaw = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonBuffer = Buffer.concat([jsonRaw, Buffer.alloc(align4(jsonRaw.length) - jsonRaw.length, 0x20)]);
  const binBuffer = Buffer.concat([binary, Buffer.alloc(align4(binary.length) - binary.length)]);
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12); header.write('glTF', 0, 'ascii'); header.writeUInt32LE(2, 4); header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonBuffer.length, 0); jsonHeader.write('JSON', 4, 'ascii');
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binBuffer.length, 0); binHeader.write('BIN\0', 4, 'ascii');
  writeFileSync(outputFile, Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer]));
  return { triangles: indices.length / 3, vertices: positions.length, byteLength: statSync(outputFile).size, bbox: { min, max, size: max.map((v, axis) => Number((v - min[axis]).toFixed(5))), center: max.map((v, axis) => Number(((v + min[axis]) / 2).toFixed(5))) } };
}
function main() {
  mkdirSync(outDir, { recursive: true });
  const sourceCache = {};
  for (const [key, file] of Object.entries(sourceModels)) {
    if (!existsSync(file)) throw new Error('missing source model ' + file);
    const source = readGlb(file);
    const pd = primitiveData(source);
    const components = weldedComponents(pd);
    sourceCache[key] = { source, pd, components, file };
  }
  const imageOutDir = path.join(outDir, 'source_images');
  mkdirSync(imageOutDir, { recursive: true });
  const imageManifest = {};
  for (const [key, file] of Object.entries(sourceImages)) {
    const out = path.join(imageOutDir, path.basename(file));
    if (existsSync(file)) copyFileSync(file, out);
    imageManifest[key] = { source: file, runtime: path.relative(root, out).split(path.sep).join('/') };
  }
  const parts = {};
  for (const spec of selected) {
    const cache = sourceCache[spec.source];
    const component = cache.components[spec.rank];
    if (!component) throw new Error(`missing ${spec.source} welded component rank ${spec.rank}`);
    const fileName = spec.id + '.glb';
    const out = path.join(outDir, fileName);
    const stats = writeComponentGlb(cache.source, cache.pd, component, out, spec.id);
    parts[spec.id] = {
      id: spec.id,
      label: spec.label,
      area: spec.area,
      runtime_role: spec.runtimeRole,
      source_model: spec.source,
      source_component_rank: spec.rank,
      source_image: sourceImages[spec.source],
      source_glb: sourceModels[spec.source],
      runtime_glb: 'public/tftm/models/meshy_sherman_component_assembly_v1/' + fileName,
      runtime_url: './tftm/models/meshy_sherman_component_assembly_v1/' + fileName,
      default_visible: spec.defaultVisible,
      default_transform: spec.defaultTransform,
      welded_source_islands: component.islandIndices.length,
      source_triangles: component.trianglesCount,
      source_vertices: component.verticesCount,
      ...stats
    };
  }
  const manifest = {
    asset_id: 'meshy_sherman_component_assembly_v1',
    revision: 'v1-welded-component-editor-kit-20260708',
    generated_at: new Date().toISOString(),
    generator: 'scripts/extract_meshy_component_assembly.mjs',
    source_policy: 'Exact-position welded components extracted from newest Downloads GLBs; no retopo, no decimation, no chaff deletion except selecting named useful components for manual assembly.',
    source_images: imageManifest,
    source_models: sourceModels,
    areas: ['hull', 'treads', 'turret'],
    runtime_contract: {
      hull: 'model swap whole welded Meshy hull shell',
      treads: 'authored animated tread/wheel system remains parade truth; Meshy tread parts are optional reference/model-swap candidates only',
      turret: 'manual editor selects shell, two hatch covers, barrel, coax/MG, optional cap; no separate mantlet because shell already has fused mantlet/socket',
      parade: 'use shared geometry/instancing for 24 tanks, not cloned GLB object trees'
    },
    parts
  };
  writeFileSync(path.join(outDir, 'component_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, outDir: path.relative(root, outDir), parts: Object.keys(parts).length }, null, 2));
}
main();

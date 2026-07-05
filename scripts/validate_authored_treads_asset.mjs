import { existsSync, readFileSync } from 'node:fs';

const assetId = 'authored_sherman_treads_v1';
const glbPath = 'public/tftm/models/authored_sherman_treads_v1/authored_sherman_treads_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_treads_v1/authored_sherman_treads_v1.blend';
const v11RedVerdictPath = 'docs/visual-verdicts/treads-v1-1-red.json';
const v12RedVerdictPath = 'docs/visual-verdicts/treads-v1-2-red.json';
const v14RedVerdictPath = 'docs/visual-verdicts/treads-v1-4-red.json';
const v15RedVerdictPath = 'docs/visual-verdicts/treads-v1-5-red.json';
const v17RedVerdictPath = 'docs/visual-verdicts/treads-v1-7-red.json';
const diagnosticPath = 'generated/diagnostics/authored_sherman_treads_v1/profile-opening-diagnostic.json';
const exporterPath = 'scripts/export_authored_sherman_treads.py';
const failures = [];
let diagnostic = null;
function fail(message) { failures.push(message); }
function parseGlb(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'JSON') json = JSON.parse(data.toString('utf8', start, start + length).trim());
    if (type === 'BIN\0') bin = data.subarray(start, start + length);
    offset = start + length;
  }
  if (!json) throw new Error('missing GLB JSON');
  if (!bin) throw new Error('missing GLB BIN chunk');
  return { json, bin };
}
function accessorInfo(parsed, accessorIndex) {
  const accessor = parsed.json.accessors?.[accessorIndex];
  const view = parsed.json.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view) throw new Error('missing accessor or bufferView ' + accessorIndex);
  return { accessor, view, byteOffset: (view.byteOffset || 0) + (accessor.byteOffset || 0), stride: view.byteStride || null };
}
function componentByteSize(componentType) {
  if (componentType === 5126 || componentType === 5125) return 4;
  if (componentType === 5123) return 2;
  if (componentType === 5121) return 1;
  throw new Error('unsupported component type ' + componentType);
}
function typeCount(type) {
  if (type === 'SCALAR') return 1;
  if (type === 'VEC2') return 2;
  if (type === 'VEC3') return 3;
  if (type === 'VEC4') return 4;
  throw new Error('unsupported accessor type ' + type);
}
function readAccessor(parsed, accessorIndex) {
  const { accessor, byteOffset, stride } = accessorInfo(parsed, accessorIndex);
  const components = typeCount(accessor.type);
  const componentSize = componentByteSize(accessor.componentType);
  const rowStride = stride || components * componentSize;
  const out = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const base = byteOffset + i * rowStride;
    if (accessor.componentType === 5126) {
      const row = [];
      for (let c = 0; c < components; c += 1) row.push(parsed.bin.readFloatLE(base + c * 4));
      out.push(components === 1 ? row[0] : row);
    } else if (accessor.componentType === 5125) {
      out.push(parsed.bin.readUInt32LE(base));
    } else if (accessor.componentType === 5123) {
      out.push(parsed.bin.readUInt16LE(base));
    } else if (accessor.componentType === 5121) {
      out.push(parsed.bin.readUInt8(base));
    }
  }
  return out;
}
function primitiveVertexRecords(parsed, nodeName) {
  const node = (parsed.json.nodes || []).find((entry) => entry.name === nodeName);
  const mesh = node?.mesh != null ? parsed.json.meshes?.[node.mesh] : null;
  if (!mesh) return [];
  const records = [];
  for (const primitive of mesh.primitives || []) {
    const positions = readAccessor(parsed, primitive.attributes.POSITION);
    const normals = readAccessor(parsed, primitive.attributes.NORMAL);
    const material = materialName(parsed.json, primitive.material);
    for (let i = 0; i < positions.length; i += 1) records.push({ position: positions[i], normal: normals[i], material });
  }
  return records;
}
function q(value) { return Math.round(value * 100000) / 100000; }
function keyFor(position) { return position.map(q).join(','); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function angleBetween(a, b) { return Math.acos(clamp(dot(a, b), -1, 1)); }
function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function wheelNormalDiagnostic(parsed, nodeName) {
  const records = primitiveVertexRecords(parsed, nodeName);
  const bounds = nodeMeshBounds(parsed.json, nodeName);
  if (!records.length || !bounds) return null;
  const cx = (bounds.min[0] + bounds.max[0]) * 0.5;
  const cy = (bounds.min[1] + bounds.max[1]) * 0.5;
  const cz = (bounds.min[2] + bounds.max[2]) * 0.5;
  const radius = Math.max(bounds.size[0], bounds.size[1]) * 0.5;
  const outerRadiusMin = radius * 0.88;
  const byPosition = new Map();
  for (const record of records) {
    const key = keyFor(record.position);
    if (!byPosition.has(key)) byPosition.set(key, []);
    byPosition.get(key).push(record);
  }
  let hardRimSplitGroups = 0;
  let rubberDuplicateGroups = 0;
  let rubberBadSplitGroups = 0;
  let rubberRadialSamples = 0;
  let rubberRadialGood = 0;
  for (const group of byPosition.values()) {
    const p = group[0].position;
    const radial = Math.hypot(p[0] - cx, p[1] - cy);
    const materials = new Set(group.map((entry) => entry.material));
    let maxAngle = 0;
    for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) maxAngle = Math.max(maxAngle, angleBetween(group[i].normal, group[j].normal));
    if (materials.has('wheel_metal') && materials.has('wheel_rubber') && radial >= radius * 0.72 && maxAngle > 0.45) hardRimSplitGroups += 1;
    const rubberNormals = group.filter((entry) => entry.material === 'wheel_rubber').map((entry) => entry.normal);
    if (rubberNormals.length > 1 && radial >= outerRadiusMin) {
      rubberDuplicateGroups += 1;
      let rubberMaxAngle = 0;
      for (let i = 0; i < rubberNormals.length; i += 1) for (let j = i + 1; j < rubberNormals.length; j += 1) rubberMaxAngle = Math.max(rubberMaxAngle, angleBetween(rubberNormals[i], rubberNormals[j]));
      if (rubberMaxAngle > 0.22) rubberBadSplitGroups += 1;
    }
  }
  for (const record of records) {
    if (record.material !== 'wheel_rubber') continue;
    const [x, y, z] = record.position;
    const radial = Math.hypot(x - cx, y - cy);
    if (radial < outerRadiusMin) continue;
    const expected = normalize([x - cx, y - cy, 0]);
    const actual = normalize([record.normal[0], record.normal[1], 0]);
    if (!Number.isFinite(actual[0])) continue;
    rubberRadialSamples += 1;
    if (angleBetween(expected, actual) < 0.30) rubberRadialGood += 1;
  }
  return {
    node: nodeName,
    hard_rim_split_groups: hardRimSplitGroups,
    rubber_duplicate_groups: rubberDuplicateGroups,
    rubber_bad_split_groups: rubberBadSplitGroups,
    rubber_radial_samples: rubberRadialSamples,
    rubber_radial_good_ratio: rubberRadialSamples ? rubberRadialGood / rubberRadialSamples : 0,
  };
}
function triangles(json) {
  let total = 0;
  for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) total += Math.floor((json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION]?.count || 0) / 3);
  return total;
}
function allBounds(json) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], accessor.min[axis]);
      max[axis] = Math.max(max[axis], accessor.max[axis]);
    }
  }
  return { min, max, size: max.map((v, i) => v - min[i]) };
}
function nodeMeshBounds(json, name) {
  const node = (json.nodes || []).find((entry) => entry.name === name);
  if (!node || node.mesh == null) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const mesh = json.meshes?.[node.mesh];
  for (const primitive of mesh?.primitives || []) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], accessor.min[axis]);
      max[axis] = Math.max(max[axis], accessor.max[axis]);
    }
  }
  if (!Number.isFinite(min[0])) return null;
  return { min, max, size: max.map((v, i) => v - min[i]) };
}

function childMap(json) {
  const map = new Map();
  (json.nodes || []).forEach((node, index) => map.set(index, node.children || []));
  return map;
}
function nodeIndex(json, name) { return (json.nodes || []).findIndex((node) => node.name === name); }
function descendantBounds(json, name) {
  const root = nodeIndex(json, name);
  if (root < 0) return null;
  const cmap = childMap(json);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (index) => {
    const node = json.nodes[index];
    if (node?.mesh != null) {
      const mesh = json.meshes?.[node.mesh];
      for (const primitive of mesh?.primitives || []) {
        const accessor = json.accessors?.[primitive.attributes?.POSITION];
        if (!accessor?.min || !accessor?.max) continue;
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], accessor.min[axis]);
          max[axis] = Math.max(max[axis], accessor.max[axis]);
        }
      }
    }
    for (const child of cmap.get(index) || []) visit(child);
  };
  visit(root);
  if (!Number.isFinite(min[0])) return null;
  return { min, max, size: max.map((v, i) => v - min[i]) };
}
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function circleMostlyInside(center, radius, polygon) {
  const samples = 16;
  let inside = 0;
  for (let i = 0; i < samples; i += 1) {
    const angle = Math.PI * 2 * i / samples;
    const point = [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
    if (pointInPolygon(point, polygon)) inside += 1;
  }
  return inside / samples;
}
function wheelProfile(json, name) {
  const bounds = nodeMeshBounds(json, name);
  if (!bounds) return null;
  const center = [(bounds.min[0] + bounds.max[0]) * 0.5, (bounds.min[1] + bounds.max[1]) * 0.5];
  const radius = Math.max(bounds.size[0], bounds.size[1]) * 0.5;
  return { name, center, radius, bounds };
}

function materialName(json, materialIndex) { return json.materials?.[materialIndex]?.name || ''; }
function meshPrimitiveSummary(json, nodeName) {
  const node = (json.nodes || []).find((entry) => entry.name === nodeName);
  const mesh = node?.mesh != null ? json.meshes?.[node.mesh] : null;
  if (!mesh) return null;
  return (mesh.primitives || []).map((primitive) => ({
    material: materialName(json, primitive.material),
    positions: json.accessors?.[primitive.attributes?.POSITION]?.count || 0,
    normals: json.accessors?.[primitive.attributes?.NORMAL]?.count || 0,
  }));
}

function primitiveTriangles(parsed, nodeName) {
  const node = (parsed.json.nodes || []).find((entry) => entry.name === nodeName);
  const mesh = node?.mesh != null ? parsed.json.meshes?.[node.mesh] : null;
  if (!mesh) return [];
  const out = [];
  for (const primitive of mesh.primitives || []) {
    const positions = readAccessor(parsed, primitive.attributes.POSITION);
    const normals = readAccessor(parsed, primitive.attributes.NORMAL);
    const material = materialName(parsed.json, primitive.material);
    const indices = primitive.indices != null ? readAccessor(parsed, primitive.indices) : positions.map((_entry, index) => index);
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const triIndices = [indices[i], indices[i + 1], indices[i + 2]];
      out.push({
        material,
        corners: triIndices.map((index) => ({ index, position: positions[index], normal: normalize(normals[index]) })),
      });
    }
  }
  return out;
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function faceNormal(tri) { return normalize(cross(sub(tri.corners[1].position, tri.corners[0].position), sub(tri.corners[2].position, tri.corners[0].position))); }
function edgeKey(a, b) { return [a, b].sort().join('|'); }
function normalContinuityDiagnostic(parsed, nodeName) {
  const trianglesForNode = primitiveTriangles(parsed, nodeName).map((tri, index) => ({ ...tri, index, face_normal: faceNormal(tri) }));
  const edges = new Map();
  for (const tri of trianglesForNode) {
    const keys = tri.corners.map((corner) => keyFor(corner.position));
    for (const pair of [[0, 1], [1, 2], [2, 0]]) {
      const key = edgeKey(keys[pair[0]], keys[pair[1]]);
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push({ tri, keys: [keys[pair[0]], keys[pair[1]]] });
    }
  }
  let sharedEdgeCount = 0;
  let curvedSharedEdgeCount = 0;
  let badSharedEdgeNormals = 0;
  let maxSharedNormalAngle = 0;
  let faceLikeCurvedCorners = 0;
  let curvedCornerSamples = 0;
  for (const entries of edges.values()) {
    if (entries.length !== 2) continue;
    const [a, b] = entries;
    if (a.tri.material !== b.tri.material) continue;
    sharedEdgeCount += 1;
    const faceAngle = angleBetween(a.tri.face_normal, b.tri.face_normal);
    if (faceAngle <= 0.08) continue;
    curvedSharedEdgeCount += 1;
    const sharedKeys = new Set(a.keys);
    for (const key of b.keys) sharedKeys.add(key);
    for (const key of sharedKeys) {
      const aCorner = a.tri.corners.find((corner) => keyFor(corner.position) === key);
      const bCorner = b.tri.corners.find((corner) => keyFor(corner.position) === key);
      if (!aCorner || !bCorner) continue;
      const sharedNormalAngle = angleBetween(aCorner.normal, bCorner.normal);
      maxSharedNormalAngle = Math.max(maxSharedNormalAngle, sharedNormalAngle);
      if (sharedNormalAngle > 0.12) badSharedEdgeNormals += 1;
      curvedCornerSamples += 2;
      if (angleBetween(aCorner.normal, a.tri.face_normal) < 0.035) faceLikeCurvedCorners += 1;
      if (angleBetween(bCorner.normal, b.tri.face_normal) < 0.035) faceLikeCurvedCorners += 1;
    }
  }
  return {
    node: nodeName,
    triangle_count: trianglesForNode.length,
    shared_edge_count: sharedEdgeCount,
    curved_shared_edge_count: curvedSharedEdgeCount,
    bad_shared_edge_normals: badSharedEdgeNormals,
    max_shared_normal_angle: maxSharedNormalAngle,
    curved_corner_samples: curvedCornerSamples,
    face_like_curved_corner_ratio: curvedCornerSamples ? faceLikeCurvedCorners / curvedCornerSamples : 1,
  };
}

function descendants(json, nodeName) {
  const root = (json.nodes || []).findIndex((node) => node.name === nodeName);
  const out = [];
  const visit = (index) => { out.push(json.nodes[index]?.name || ''); for (const child of json.nodes[index]?.children || []) visit(child); };
  if (root >= 0) visit(root);
  return out;
}

for (const file of [glbPath, manifestPath, blendPath, exporterPath, v11RedVerdictPath, v12RedVerdictPath, v14RedVerdictPath, v15RedVerdictPath, v17RedVerdictPath, 'treadfirst-treads.html', 'src/treadfirst-treads.ts', 'src/sherman-asset-links.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);

if (failures.length === 0) {
  const parsed = parseGlb(glbPath);
  const json = parsed.json;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const exporter = readFileSync(exporterPath, 'utf8');
  const runtime = readFileSync('src/treadfirst-treads.ts', 'utf8') + readFileSync('src/sherman-asset-links.ts', 'utf8');
  const build = readFileSync('scripts/build.mjs', 'utf8');
  if (manifest.asset_id !== assetId) fail('manifest asset_id mismatch');
  if (manifest.silhouette_revision !== 'v1-8c-linked-mirror-tread-assembly') fail('unexpected revision ' + manifest.silhouette_revision);
  const v11Verdict = JSON.parse(readFileSync(v11RedVerdictPath, 'utf8'));
  const v12Verdict = JSON.parse(readFileSync(v12RedVerdictPath, 'utf8'));
  const v14Verdict = JSON.parse(readFileSync(v14RedVerdictPath, 'utf8'));
  const v15Verdict = JSON.parse(readFileSync(v15RedVerdictPath, 'utf8'));
  const v17Verdict = JSON.parse(readFileSync(v17RedVerdictPath, 'utf8'));
  if (v11Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.1 red verdict must remain explicit before accepting v1.3 diagnostics');
  if (v12Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.2 red verdict must remain explicit before accepting v1.3 diagnostics');
  if (v14Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.4 red verdict must remain explicit before accepting v1.5 diagnostics');
  if (v15Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.5 red verdict must remain explicit before accepting v1.6 diagnostics');
  if (v17Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.7 red verdict must remain explicit before accepting v1.8 diagnostics');
  if (manifest.profile?.old_reference_point_count !== 8) fail('manifest must record old subdivision-0 profile point count');
  if ((manifest.profile?.outer_profile_point_count || 0) < 16) fail('outer profile must add one silhouette subdivision layer beyond the old 8-point profile');
  if (!String(manifest.shading_contract || '').includes('linked mirror nodes')) fail('manifest must declare linked mirror tread geometry reuse');
  if (!String(manifest.geometry_reuse_contract || '').includes('sharing the left-side mesh data')) fail('manifest must declare left/right shared mesh data');
  for (const sourceMarker of ['bake_mesh_modifiers_for_export', 'modifier_apply', 'mark_circular_crease_edges', 'continuous_tread_belt_surface', 'nonrendered_segment_marker_for_review', 'Do not bevel or weighted-normal the tire ring', 'normals_split_custom_set', 'profile_normals', 'linked mirrored instance', 'no duplicate right-side geometry']) if (!exporter.includes(sourceMarker)) fail('exporter missing linked-mirror marker ' + sourceMarker);
  for (const node of ['treads_root','left_tread_belt','right_tread_belt','left_tread_top_run','right_tread_top_run','left_tread_bottom_run','right_tread_bottom_run','left_tread_front_return','right_tread_front_return','left_tread_rear_return','right_tread_rear_return','left_continuous_tread_belt_surface','right_continuous_tread_belt_surface','left_tread_connector_mounts','right_tread_connector_mounts','left_wheel_group','right_wheel_group','left_bogie_connectors','right_bogie_connectors','left_front_sprocket','right_front_sprocket','left_rear_idler','right_rear_idler']) if (!(json.nodes || []).some((entry) => entry.name === node)) fail('missing required node ' + node);
  for (const forbidden of ['hull','turret','barrel','coax','mantlet','cannon','tank_root']) {
    const hit = (json.nodes || []).find((node) => String(node.name || '').toLowerCase().includes(forbidden));
    if (hit) fail('tread-only asset contains forbidden full-tank node ' + hit.name);
  }
  for (const forbidden of ['export_authored_sherman_boxmodel', 'export_authored_sherman_textureable', 'authored_sherman_boxmodel_v1', 'authored_sherman_textureable_v1']) {
    if (exporter.includes(forbidden)) fail('tread exporter must not copy failed exporter marker ' + forbidden);
  }
  const tri = triangles(json);
  if (tri < 9000 || tri > 22000) fail('unexpected unique-geometry tread assembly triangle count ' + tri);
  const sharedPairs = [
    ['left_continuous_tread_belt_surface', 'right_continuous_tread_belt_surface'],
    ['left_front_sprocket', 'right_front_sprocket'],
    ['left_rear_idler', 'right_rear_idler'],
    ['left_return_roller_1', 'right_return_roller_1'],
    ['left_roadwheel_1', 'right_roadwheel_1'],
    ['left_roadwheel_3', 'right_roadwheel_3'],
    ['left_roadwheel_6', 'right_roadwheel_6'],
    ['left_tread_connector_mount_+0.24', 'right_tread_connector_mount_+0.24'],
    ['left_upper_return_connector_rail', 'right_upper_return_connector_rail'],
    ['left_lower_bogie_tie_beam', 'right_lower_bogie_tie_beam'],
    ['left_vvss_bogie_arm_-0.02', 'right_vvss_bogie_arm_-0.02'],
  ];
  const nodeByName = new Map((json.nodes || []).map((node) => [node.name, node]));
  for (const [leftName, rightName] of sharedPairs) {
    const leftNode = nodeByName.get(leftName);
    const rightNode = nodeByName.get(rightName);
    if (!leftNode || !rightNode) fail('missing linked mirror pair ' + leftName + ' / ' + rightName);
    else {
      if (leftNode.mesh == null || rightNode.mesh == null) fail('linked mirror pair lacks mesh indices ' + leftName + ' / ' + rightName);
      else if (leftNode.mesh !== rightNode.mesh) fail('left/right pair must share one mesh index: ' + leftName + ' / ' + rightName);
      const scale = rightNode.scale || [1, 1, 1];
      if (!(scale.some((value) => value < -0.99))) fail('right linked mirror node must use a negative mirror scale: ' + rightName);
    }
  }
  const uniqueMeshIndices = new Set((json.nodes || []).filter((node) => node.mesh != null).map((node) => node.mesh));
  const meshNodeRefs = (json.nodes || []).filter((node) => node.mesh != null).length;
  if (!(meshNodeRefs > uniqueMeshIndices.size)) fail('GLB must reuse mesh data through multiple node references, not duplicate every side');
  const linkedMirrorDiagnostic = { checked_pairs: sharedPairs, unique_mesh_indices: uniqueMeshIndices.size, mesh_node_refs: meshNodeRefs };
  const innerProfile = manifest.profile?.inner_profile_xy;
  if (!Array.isArray(innerProfile) || innerProfile.length < 8) fail('manifest must expose inner_profile_xy for profile-opening validation');
  diagnostic = { asset_id: assetId, revision: manifest.silhouette_revision, profile_opening: innerProfile, sides: {}, normal_shading: [], linked_mirror: linkedMirrorDiagnostic };
  const bounds = allBounds(json);
  if (!(bounds.size[0] > 3.0 && bounds.size[2] > 0.35 && bounds.size[1] < 0.9)) fail('unique linked tread source bounds should be long/low/one-side-thick, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  for (const side of ['left', 'right']) {
    const belt = descendantBounds(json, `${side}_tread_belt`);
    if (!belt) fail(`missing ${side} belt bounds`);
    else {
      if (!(belt.size[0] > 3.0 && belt.size[1] > 0.55 && belt.size[2] > 0.35)) fail(`${side} belt is not a closed 3D tread volume: ` + belt.size.map((n) => n.toFixed(3)).join(' x '));
      if (!nodeMeshBounds(json, `${side}_continuous_tread_belt_surface`)) fail(`${side} must expose one visible continuous tread belt surface`);
      for (const segment of ['top_run','bottom_run','front_return','rear_return']) {
        const segmentNode = (json.nodes || []).find((entry) => entry.name === `${side}_tread_${segment}`);
        if (!segmentNode) fail(`${side} tread belt must expose nonrendered segment marker ${segment}`);
        if (segmentNode?.mesh != null) fail(`${side}_tread_${segment} must be a nonrendered marker, not a visible faceted tread panel mesh`);
      }
      const beltContinuity = normalContinuityDiagnostic(parsed, `${side}_continuous_tread_belt_surface`);
      diagnostic.normal_shading.push(beltContinuity);
      if (beltContinuity.shared_edge_count < 40) fail(`${side} continuous tread belt lacks enough shared GLB triangle edges for smooth validation: ${beltContinuity.shared_edge_count}`);
      if (beltContinuity.curved_shared_edge_count < 12) fail(`${side} continuous tread belt lacks curved shared edges for smooth validation: ${beltContinuity.curved_shared_edge_count}`);
      if (beltContinuity.bad_shared_edge_normals < 48 || beltContinuity.bad_shared_edge_normals > 96) fail(`${side} continuous tread belt must have bounded lip normal splits for readable corners, saw ${beltContinuity.bad_shared_edge_normals}`);
      if (beltContinuity.face_like_curved_corner_ratio > 0.48) fail(`${side} continuous tread belt exports too many face-like normals away from the intentional lip breaks: ${(beltContinuity.face_like_curved_corner_ratio * 100).toFixed(0)}%`);
    }
    const names = descendants(json, `${side}_tread_connector_mounts`).join('\n');
    if ((names.match(/connector_mount_/g) || []).length < 4) fail(`${side} connector mounts must expose four subordinate mount blocks`);
    const wheelNames = descendants(json, `${side}_wheel_group`).join('\n');
    if ((wheelNames.match(/roadwheel_/g) || []).length < 6) fail(`${side} wheel group must expose six side-facing road wheels`);
    if (innerProfile) {
      const checked = [];
      for (const wheelName of [`${side}_roadwheel_1`, `${side}_roadwheel_3`, `${side}_roadwheel_6`, `${side}_front_sprocket`, `${side}_rear_idler`, `${side}_return_roller_1`]) {
        const wheel = wheelProfile(json, wheelName);
        const primitiveSummary = meshPrimitiveSummary(json, wheelName);
        if (!primitiveSummary) fail(`${side} missing material primitive summary for ${wheelName}`);
        else {
          const materialNames = new Set(primitiveSummary.map((entry) => entry.material));
          const totalPositions = primitiveSummary.reduce((sum, entry) => sum + entry.positions, 0);
          if (!materialNames.has('wheel_metal') || !materialNames.has('wheel_rubber')) fail(`${wheelName} must export both wheel_metal rim and wheel_rubber tire primitives`);
          if (totalPositions < 480) fail(`${wheelName} does not have enough ring samples to avoid faceted tire read: ${totalPositions} positions`);
        }
        const normalDiagnostic = wheelNormalDiagnostic(parsed, wheelName);
        if (!normalDiagnostic) fail(`${wheelName} missing exported normal diagnostic`);
        else {
          diagnostic.normal_shading.push(normalDiagnostic);
          if (normalDiagnostic.hard_rim_split_groups < 12) fail(`${wheelName} lacks exported hard rim-loop normal splits: ${normalDiagnostic.hard_rim_split_groups}`);
          if (normalDiagnostic.rubber_bad_split_groups > 0) fail(`${wheelName} has sharp normal splits on rounded rubber tire faces: ${normalDiagnostic.rubber_bad_split_groups}`);
        }
        if (!wheel) fail(`${side} missing profile-opening bounds for ${wheelName}`);
        else {
          const centerInside = pointInPolygon(wheel.center, innerProfile);
          const insideRatio = circleMostlyInside(wheel.center, wheel.radius * 0.72, innerProfile);
          checked.push({ name: wheelName, center: wheel.center, radius: wheel.radius, center_inside: centerInside, useful_disc_inside_ratio: insideRatio });
          if (!centerInside) fail(`${wheelName} center is outside the inner tread profile opening; v1.2 no-op repeated`);
          if (insideRatio < 0.58) fail(`${wheelName} useful disc area is not in the tread opening: ${(insideRatio * 100).toFixed(0)}% inside`);
        }
      }
      diagnostic.sides[side] = checked;
    }
    if (!wheelNames.includes(`${side}_front_sprocket`) || !wheelNames.includes(`${side}_rear_idler`)) fail(`${side} wheel group must expose front sprocket and rear idler`);
    if ((wheelNames.match(/return_roller_/g) || []).length < 3) fail(`${side} wheel group must expose return rollers`);
    const bogieNames = descendants(json, `${side}_bogie_connectors`).join('\n');
    if ((bogieNames.match(/vvss_bogie_arm_/g) || []).length < 3) fail(`${side} bogie connectors must expose three bogie arm blocks`);
  }
  for (const marker of ['AUTHORED_SHERMAN_TREADS_GLB_URL', 'tftm-authored-sherman-treads-v1-8c-20260705', 'OrbitControls', 'orientation-widget', 'profile opening']) if (!runtime.includes(marker)) fail('runtime missing marker ' + marker);
  if (!build.includes("buildEntry('treadfirst-treads.ts', 'treadfirst-treads')")) fail('build must bundle treadfirst-treads.ts');
  if (!build.includes("writeBundledHtml('treadfirst-treads.html', 'treadfirst-treads.html', 'treadfirst-treads')")) fail('build must write treadfirst-treads.html');
}

if (failures.length) {
  console.error('Authored tread-only asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
await import('node:fs').then(({ mkdirSync, writeFileSync }) => { mkdirSync('generated/diagnostics/authored_sherman_treads_v1', { recursive: true }); writeFileSync(diagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n'); });
console.log('Authored tread assembly validation passed: v1.8c keeps one linked mirrored tread geometry set while preserving visible wheels and lip corners; cloud/Sense visual acceptance is still required.');

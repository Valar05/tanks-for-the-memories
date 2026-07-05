import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const assetId = 'authored_sherman_chassis_v1';
const revision = 'v1-2-silhouette-fit-chassis-shell';
const buildToken = 'tftm-authored-sherman-chassis-v1-2-20260705';
const glbPath = 'public/tftm/models/authored_sherman_chassis_v1/authored_sherman_chassis_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_chassis_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_chassis_v1/authored_sherman_chassis_v1.blend';
const treadManifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const diagnosticPath = 'generated/diagnostics/authored_sherman_chassis_v1/chassis-fit-diagnostic.json';
const failures = [];
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
  if (!json || !bin) throw new Error('missing GLB JSON or BIN');
  return { json, bin };
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
  const accessor = parsed.json.accessors?.[accessorIndex];
  const view = parsed.json.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view) throw new Error('missing accessor ' + accessorIndex);
  const components = typeCount(accessor.type);
  const componentSize = componentByteSize(accessor.componentType);
  const stride = view.byteStride || components * componentSize;
  const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const out = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const base = offset + i * stride;
    if (accessor.componentType === 5126) {
      const row = [];
      for (let c = 0; c < components; c += 1) row.push(parsed.bin.readFloatLE(base + c * 4));
      out.push(components === 1 ? row[0] : row);
    } else if (accessor.componentType === 5125) out.push(parsed.bin.readUInt32LE(base));
    else if (accessor.componentType === 5123) out.push(parsed.bin.readUInt16LE(base));
    else if (accessor.componentType === 5121) out.push(parsed.bin.readUInt8(base));
  }
  return out;
}
function q(v) { return Math.round(v * 10000) / 10000; }
function pkey(p) { return p.map(q).join(','); }
function edgeKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function triangles(parsed, nodeName) {
  const node = (parsed.json.nodes || []).find((entry) => entry.name === nodeName);
  const mesh = node?.mesh != null ? parsed.json.meshes?.[node.mesh] : null;
  const tris = [];
  if (!mesh) return tris;
  for (const primitive of mesh.primitives || []) {
    const positions = readAccessor(parsed, primitive.attributes.POSITION);
    const indices = primitive.indices != null ? readAccessor(parsed, primitive.indices) : positions.map((_, i) => i);
    for (let i = 0; i + 2 < indices.length; i += 3) tris.push([positions[indices[i]], positions[indices[i + 1]], positions[indices[i + 2]]]);
  }
  return tris;
}
function boundsFromTriangles(tris) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const tri of tris) for (const p of tri) for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  return { min, max, size: max.map((v, i) => v - min[i]), center: max.map((v, i) => (v + min[i]) * 0.5) };
}
function boundaryEdges(tris) {
  const counts = new Map();
  for (const tri of tris) {
    const keys = tri.map(pkey);
    for (const [a, b] of [[keys[0], keys[1]], [keys[1], keys[2]], [keys[2], keys[0]]]) {
      const key = edgeKey(a, b);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, count]) => count !== 2);
}
function rayHit(origin, direction, tri) {
  const eps = 1e-7;
  const e1 = sub(tri[1], tri[0]);
  const e2 = sub(tri[2], tri[0]);
  const h = cross(direction, e2);
  const a = dot(e1, h);
  if (Math.abs(a) < eps) return null;
  const f = 1 / a;
  const s = sub(origin, tri[0]);
  const u = f * dot(s, h);
  if (u < -eps || u > 1 + eps) return null;
  const qv = cross(s, e1);
  const v = f * dot(direction, qv);
  if (v < -eps || u + v > 1 + eps) return null;
  const t = f * dot(e2, qv);
  return t > eps ? t : null;
}
function nearestRayHit(tris, origin, direction) {
  let nearest = Infinity;
  for (const tri of tris) {
    const t = rayHit(origin, direction, tri);
    if (t != null && t < nearest) nearest = t;
  }
  return Number.isFinite(nearest) ? nearest : null;
}
for (const file of [glbPath, manifestPath, blendPath, treadManifestPath, 'src/chassisfirst-chassis.ts', 'chassisfirst-chassis.html', 'src/sherman-asset-links.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);
let diagnostic = { asset_id: assetId, revision, checks: [] };
if (failures.length === 0) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const treadManifest = JSON.parse(readFileSync(treadManifestPath, 'utf8'));
  const runtime = readFileSync('src/chassisfirst-chassis.ts', 'utf8') + readFileSync('src/sherman-asset-links.ts', 'utf8');
  const build = readFileSync('scripts/build.mjs', 'utf8');
  const exporter = readFileSync('scripts/export_authored_sherman_chassis.py', 'utf8');
  if (manifest.asset_id !== assetId) fail('manifest asset_id mismatch');
  if (manifest.silhouette_revision !== revision) fail('unexpected chassis revision ' + manifest.silhouette_revision);
  if (manifest.golden_tread_reference?.silhouette_revision !== 'v1-8c-linked-mirror-tread-assembly') fail('manifest must reference frozen v1.8c tread revision');
  if (treadManifest.silhouette_revision !== 'v1-8c-linked-mirror-tread-assembly') fail('golden tread manifest is not v1.8c');
  if (!String(manifest.mesh_contract || '').includes('exactly one exported visible mesh')) fail('manifest must declare one visible chassis mesh');
  if (!String(manifest.source_policy || '').includes('No Meshy chassis topology is exported')) fail('manifest must reject Meshy topology export');
  if (!String(manifest.fit_contract || '').includes('rays')) fail('manifest must declare raycast fit contract');
  for (const marker of ['chassis_watertight_shell', 'hidden_meshy_reference_not_exported', 'not_exported', 'golden_tread_reference']) if (!exporter.includes(marker)) fail('exporter missing chassis marker ' + marker);
  for (const marker of ['AUTHORED_SHERMAN_CHASSIS_GLB_URL', 'AUTHORED_SHERMAN_TREADS_GLB_URL', buildToken, 'OrbitControls', 'orientation-widget']) if (!runtime.includes(marker)) fail('runtime missing marker ' + marker);
  if (!build.includes("buildEntry('chassisfirst-chassis.ts', 'chassisfirst-chassis')")) fail('build must bundle chassisfirst-chassis.ts');
  if (!build.includes("writeBundledHtml('chassisfirst-chassis.html', 'chassisfirst-chassis.html', 'chassisfirst-chassis')")) fail('build must write chassisfirst-chassis.html');
  const parsed = parseGlb(glbPath);
  const meshNodes = (parsed.json.nodes || []).filter((node) => node.mesh != null);
  if (meshNodes.length !== 1) fail('chassis GLB must export exactly one mesh node, saw ' + meshNodes.map((node) => node.name).join(', '));
  if (meshNodes[0]?.name !== 'chassis_watertight_shell') fail('exported mesh node must be chassis_watertight_shell');
  const forbidden = ['tread', 'wheel', 'bogie', 'turret', 'mantlet', 'barrel', 'coax', 'cannon', 'sprocket', 'idler'];
  for (const node of parsed.json.nodes || []) for (const word of forbidden) if (String(node.name || '').toLowerCase().includes(word)) fail('forbidden chassis GLB node contains ' + word + ': ' + node.name);
  const materialNames = new Set((parsed.json.materials || []).map((mat) => mat.name));
  for (const plate of manifest.face_plate_ids || []) if (!materialNames.has(plate)) fail('missing chassis material ' + plate);
  const tris = triangles(parsed, 'chassis_watertight_shell');
  if (tris.length < 40 || tris.length > 900) fail('unexpected chassis triangle count ' + tris.length);
  const bounds = boundsFromTriangles(tris);
  diagnostic.bounds = bounds;
  if (!(bounds.size[0] > 3.2 && bounds.size[2] > 2.25 && bounds.size[1] > 1.15)) fail('chassis bounds must cover tread length/width and armor height, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  if (!(bounds.min[2] <= -1.16 && bounds.max[2] >= 1.16)) fail('chassis side armor must span past frozen tread width ±1.14, saw z ' + bounds.min[2].toFixed(3) + '..' + bounds.max[2].toFixed(3));
  if (!(bounds.min[1] <= -0.38 && bounds.max[1] >= 0.88)) fail('chassis must be a closed body from belly to upper hull, saw y ' + bounds.min[1].toFixed(3) + '..' + bounds.max[1].toFixed(3));
  const boundary = boundaryEdges(tris);
  diagnostic.boundary_edge_failures = boundary.slice(0, 12);
  if (boundary.length) fail('chassis mesh is not watertight: ' + boundary.length + ' non-two-use quantized edges');
  const raySamples = [];
  for (const side of [-1, 1]) for (const x of [-1.62, -1.28, 1.28, 1.62]) for (const y of [-0.24, 0.04, 0.26]) {
    const origin = [x, y, side * 1.46];
    const direction = [0, 0, -side];
    const hit = nearestRayHit(tris, origin, direction);
    raySamples.push({ origin, direction, hit });
    if (hit == null || hit > 0.70) fail('outside chassis/tread-interface ray can enter too far before exterior hit at x=' + x + ' y=' + y + ' sideZ=' + side + ' hit=' + hit);
  }
  diagnostic.ray_samples = raySamples;
}
if (failures.length) {
  console.error('Authored chassis validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
mkdirSync('generated/diagnostics/authored_sherman_chassis_v1', { recursive: true });
writeFileSync(diagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n');
console.log('Authored chassis validation passed: one watertight chassis mesh fits the frozen v1.8c tread reference diagnostically; cloud/Sense visual acceptance is still required.');

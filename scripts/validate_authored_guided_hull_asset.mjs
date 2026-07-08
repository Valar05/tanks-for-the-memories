import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const assetId = 'authored_sherman_guided_hull_v1';
const revision = 'v1-1-guided-hard-surface-hull-only';
const glbPath = 'public/tftm/models/authored_sherman_guided_hull_v1/authored_sherman_guided_hull_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_guided_hull_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_guided_hull_v1/authored_sherman_guided_hull_v1.blend';
const treadManifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const diagnosticPath = 'generated/diagnostics/authored_sherman_guided_hull_v1/guided-hull-diagnostic.json';
const failures = [];
function fail(message) { failures.push(message); }
function parseGlb(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not GLB: ' + file);
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
  if (!json || !bin) throw new Error('missing GLB chunks');
  return { json, bin };
}
function componentSize(type) { return ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 })[type]; }
function typeCount(type) { return ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 })[type]; }
function readAccessor(parsed, index) {
  const accessor = parsed.json.accessors?.[index];
  const view = parsed.json.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view) throw new Error('missing accessor ' + index);
  const comps = typeCount(accessor.type);
  const size = componentSize(accessor.componentType);
  const stride = view.byteStride || comps * size;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const out = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const base = start + i * stride;
    const row = [];
    for (let c = 0; c < comps; c += 1) {
      const p = base + c * size;
      if (accessor.componentType === 5126) row.push(parsed.bin.readFloatLE(p));
      else if (accessor.componentType === 5125) row.push(parsed.bin.readUInt32LE(p));
      else if (accessor.componentType === 5123) row.push(parsed.bin.readUInt16LE(p));
      else if (accessor.componentType === 5121) row.push(parsed.bin.readUInt8(p));
      else if (accessor.componentType === 5122) row.push(parsed.bin.readInt16LE(p));
      else if (accessor.componentType === 5120) row.push(parsed.bin.readInt8(p));
    }
    out.push(comps === 1 ? row[0] : row);
  }
  return out;
}
function q(n) { return Math.round(n * 10000) / 10000; }
function nodeMesh(parsed, nodeName) {
  const node = (parsed.json.nodes || []).find((candidate) => candidate.name === nodeName);
  return node?.mesh != null ? parsed.json.meshes?.[node.mesh] : null;
}
function collectStats(parsed, nodeName = null) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let vertices = 0;
  const meshes = nodeName ? [nodeMesh(parsed, nodeName)].filter(Boolean) : (parsed.json.meshes || []);
  for (const mesh of meshes) for (const primitive of mesh.primitives || []) {
    const positions = readAccessor(parsed, primitive.attributes.POSITION);
    const indices = primitive.indices != null ? readAccessor(parsed, primitive.indices) : positions.map((_, i) => i);
    triangles += Math.floor(indices.length / 3);
    vertices += positions.length;
    for (const p of positions) for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  }
  return { triangles, vertices, bbox: { min: min.map(q), max: max.map(q), size: max.map((v, i) => q(v - min[i])), center: max.map((v, i) => q((v + min[i]) * 0.5)) } };
}
for (const file of [glbPath, manifestPath, blendPath, treadManifestPath, 'src/sherman-asset-links.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);
let diagnostic = { asset_id: assetId, revision };
if (failures.length === 0) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const treads = JSON.parse(readFileSync(treadManifestPath, 'utf8'));
  const parsed = parseGlb(glbPath);
  const source = readFileSync('scripts/export_authored_sherman_guided_hull.py', 'utf8');
  const links = readFileSync('src/sherman-asset-links.ts', 'utf8');
  const build = readFileSync('scripts/build.mjs', 'utf8');
  if (manifest.asset_id !== assetId) fail('manifest asset_id mismatch');
  if (manifest.silhouette_revision !== revision) fail('manifest revision mismatch');
  if (!String(manifest.source_policy || '').includes('No Meshy topology')) fail('manifest must forbid Meshy topology');
  if (!String(manifest.source_policy || '').includes('no shrinkwrap')) fail('manifest must forbid shrinkwrap');
  if (!String(manifest.source_policy || '').includes('no high-to-low decimation')) fail('manifest must forbid decimation');
  if (manifest.source_face_policy?.max_source_face_vertices > 4) fail('source faces must be triangles/quads only');
  if (manifest.source_face_policy?.front_rear_caps_split !== true) fail('front/rear cap split policy missing');
  if (manifest.geometry_budget?.hard_cap_triangles !== 2500) fail('hard cap must be 2500 triangles');
  if (treads.asset_id !== 'authored_sherman_treads_v1') fail('tread reference asset mismatch');
  if (!String(treads.silhouette_revision || '').includes('v1-9')) fail('guided hull must fit accepted v1-9 treads');
  for (const token of ['sections = [', 'profile(', 'hidden_meshy_lowpoly_hull_reference_not_exported', 'front_rear_caps_split', 'No Meshy topology']) if (!source.includes(token)) fail('exporter missing guided retopo token ' + token);
  for (const token of ['AUTHORED_SHERMAN_GUIDED_HULL_GLB_URL', 'MESHY_SHERMAN_LOWPOLY_HULL_ENVELOPE_GLB_URL']) if (!links.includes(token)) fail('asset links missing ' + token);
  for (const token of ["buildEntry('guided-hull.ts', 'guided-hull')", "writeBundledHtml('guided-hull.html', 'guided-hull.html', 'guided-hull')"]) if (!build.includes(token)) fail('build missing guided hull route token ' + token);
  const nodeNames = (parsed.json.nodes || []).map((node) => node.name || '');
  if (!nodeNames.includes('guided_hull_single_authored_shell')) fail('missing guided shell node');
  for (const forbidden of ['hidden_meshy_lowpoly_hull_reference_not_exported', 'lowpoly_hull_envelope']) if (nodeNames.includes(forbidden)) fail('forbidden reference node exported: ' + forbidden);
  for (const name of nodeNames) if (/meshy/i.test(name)) fail('exported node includes Meshy name: ' + name);
  for (const required of manifest.required_nodes || []) if (!nodeNames.includes(required)) fail('missing required node ' + required);
  const materials = new Set((parsed.json.materials || []).map((mat) => mat.name));
  for (const plate of manifest.face_plate_ids || []) if (!materials.has(plate)) fail('missing surface material ' + plate);
  const stats = collectStats(parsed);
  const shellStats = collectStats(parsed, 'guided_hull_single_authored_shell');
  diagnostic.stats = stats;
  diagnostic.shell_stats = shellStats;
  if (stats.triangles < manifest.geometry_budget.target_triangles_min || stats.triangles > manifest.geometry_budget.target_triangles_max) fail('triangle count must be in target band, saw ' + stats.triangles);
  if (stats.triangles > manifest.geometry_budget.hard_cap_triangles) fail('triangle count exceeds hard cap ' + stats.triangles);
  if (!(shellStats.triangles >= 110 && shellStats.triangles <= 420)) fail('guided shell should stay simple, saw shell tris ' + shellStats.triangles);
  const s = stats.bbox.size;
  if (!(s[0] > 3.25 && s[0] < 3.65)) fail('hull length out of expected range ' + s[0]);
  if (!(s[1] > 1.05 && s[1] < 1.45)) fail('hull height out of expected range ' + s[1]);
  if (!(s[2] > 1.70 && s[2] < 2.04)) fail('hull width out of expected range ' + s[2]);
  if (!(stats.bbox.min[2] >= -1.04 && stats.bbox.max[2] <= 1.04)) fail('hull must remain inside tread exterior sidewalls with margin, z=' + stats.bbox.min[2] + '..' + stats.bbox.max[2]);
  if (!(stats.bbox.min[1] <= -0.42 && stats.bbox.max[1] >= 0.84)) fail('hull must include belly-to-deck body, y=' + stats.bbox.min[1] + '..' + stats.bbox.max[1]);
}
if (failures.length) {
  console.error('Authored guided hull validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
mkdirSync('generated/diagnostics/authored_sherman_guided_hull_v1', { recursive: true });
writeFileSync(diagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, asset: assetId, diagnostic: diagnosticPath, triangles: diagnostic.stats.triangles, bbox: diagnostic.stats.bbox }, null, 2));

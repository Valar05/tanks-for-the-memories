import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const glbPath = 'public/tftm/models/authored_sherman_chassis_v1/authored_sherman_chassis_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_chassis_v1/model_manifest.json';
const diagnosticPath = 'generated/diagnostics/authored_sherman_chassis_v1/silhouette-diagnostic.json';
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
  if (!json || !bin) throw new Error('missing GLB JSON/BIN');
  return { json, bin };
}
function componentByteSize(componentType) { if (componentType === 5126 || componentType === 5125) return 4; if (componentType === 5123) return 2; if (componentType === 5121) return 1; throw new Error('unsupported component type ' + componentType); }
function typeCount(type) { if (type === 'SCALAR') return 1; if (type === 'VEC2') return 2; if (type === 'VEC3') return 3; if (type === 'VEC4') return 4; throw new Error('unsupported accessor type ' + type); }
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
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function len(v) { return Math.hypot(v[0], v[1], v[2]); }
function norm(v) { const l = len(v) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }
function area(a, b, c) { return len(cross(sub(b, a), sub(c, a))) * 0.5; }
function materialName(json, index) { return json.materials?.[index]?.name || ''; }
function bounds(points) { const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity]; for (const p of points) for (let i=0;i<3;i+=1){min[i]=Math.min(min[i],p[i]); max[i]=Math.max(max[i],p[i]);} return {min,max,size:max.map((v,i)=>v-min[i])}; }
function addSummary(summary, material, tri, triArea) {
  if (!summary[material]) summary[material] = { area: 0, normal: [0,0,0], points: [] };
  const n = norm(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])));
  summary[material].area += triArea;
  for (let i=0;i<3;i+=1) summary[material].normal[i] += n[i] * triArea;
  summary[material].points.push(...tri);
}
if (!existsSync(glbPath)) fail('missing ' + glbPath);
if (!existsSync(manifestPath)) fail('missing ' + manifestPath);
let diagnostic = {};
if (failures.length === 0) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const parsed = parseGlb(glbPath);
  const node = (parsed.json.nodes || []).find((entry) => entry.name === 'chassis_watertight_shell');
  const mesh = node?.mesh != null ? parsed.json.meshes?.[node.mesh] : null;
  if (!mesh) fail('missing chassis_watertight_shell mesh');
  const summary = {};
  const allPoints = [];
  if (mesh) for (const primitive of mesh.primitives || []) {
    const positions = readAccessor(parsed, primitive.attributes.POSITION);
    const indices = primitive.indices != null ? readAccessor(parsed, primitive.indices) : positions.map((_, i) => i);
    const material = materialName(parsed.json, primitive.material);
    for (let i=0; i+2<indices.length; i+=3) {
      const tri = [positions[indices[i]], positions[indices[i+1]], positions[indices[i+2]]];
      const triArea = area(tri[0], tri[1], tri[2]);
      addSummary(summary, material, tri, triArea);
      allPoints.push(...tri);
    }
  }
  for (const entry of Object.values(summary)) entry.normal = norm(entry.normal);
  const shellBounds = bounds(allPoints);
  const topBand = allPoints.filter((point) => point[1] >= shellBounds.max[1] - 0.035);
  const topBandBounds = bounds(topBand);
  const deckPoints = [...(summary.engine_deck?.points || []), ...(summary.turret_ring_cap?.points || [])];
  const deckBounds = bounds(deckPoints);
  const sideLeft = summary.hull_left;
  const sideRight = summary.hull_right;
  const sponsonLeft = summary.sponson_left;
  const sponsonRight = summary.sponson_right;
  diagnostic = { asset_id: manifest.asset_id, revision: manifest.silhouette_revision, shell_bounds: shellBounds, top_band_bounds: topBandBounds, deck_bounds: deckBounds, material_summary: Object.fromEntries(Object.entries(summary).map(([k,v]) => [k, { area: Number(v.area.toFixed(4)), normal: v.normal.map((n)=>Number(n.toFixed(4))), bounds: bounds(v.points) }])) };
  if (manifest.silhouette_revision === 'v1-1-watertight-chassis-shell') fail('v1.1 tent/canopy chassis is quarantined; silhouette smoke must fail it before v1.2 export');
  if (!topBand.length || topBandBounds.size[2] < 1.35) fail('top silhouette collapses to a narrow center ridge/tent peak; top band width is ' + (topBandBounds.size?.[2] || 0).toFixed(3));
  if (!deckPoints.length || deckBounds.size[2] < 1.55) fail('deck/ring silhouette is too narrow for a Sherman-like flat deck; deck width is ' + (deckBounds.size?.[2] || 0).toFixed(3));
  if (sideLeft && Math.abs(sideLeft.normal[2]) < 0.82) fail('left hull side normal is not side-armor-like; normal=' + sideLeft.normal.map((n)=>n.toFixed(3)).join(','));
  if (sideRight && Math.abs(sideRight.normal[2]) < 0.82) fail('right hull side normal is not side-armor-like; normal=' + sideRight.normal.map((n)=>n.toFixed(3)).join(','));
  if (sideLeft && Math.abs(sideLeft.normal[1]) > 0.46) fail('left hull side reads as sloped roof/canopy; vertical component=' + sideLeft.normal[1].toFixed(3));
  if (sideRight && Math.abs(sideRight.normal[1]) > 0.46) fail('right hull side reads as sloped roof/canopy; vertical component=' + sideRight.normal[1].toFixed(3));
  if (sponsonLeft && sponsonLeft.area < 1.15) fail('left sponson shoulder does not have enough silhouette area: ' + sponsonLeft.area.toFixed(3));
  if (sponsonRight && sponsonRight.area < 1.15) fail('right sponson shoulder does not have enough silhouette area: ' + sponsonRight.area.toFixed(3));
  const sideArmorArea = (sideLeft?.area || 0) + (sideRight?.area || 0) + (sponsonLeft?.area || 0) + (sponsonRight?.area || 0);
  const topArea = (summary.engine_deck?.area || 0) + (summary.turret_ring_cap?.area || 0);
  if (topArea > sideArmorArea * 0.62) fail('top canopy surfaces dominate side armor silhouette; top area ' + topArea.toFixed(3) + ' side/sponson area ' + sideArmorArea.toFixed(3));
}
mkdirSync('generated/diagnostics/authored_sherman_chassis_v1', { recursive: true });
writeFileSync(diagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n');
if (failures.length) {
  console.error('Authored chassis silhouette validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored chassis silhouette validation passed: broad deck, vertical side armor, sponson shoulders, and anti-tent profile are diagnostically present; cloud/Sense visual acceptance is still required.');

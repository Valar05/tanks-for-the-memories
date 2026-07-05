import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const glbPath = 'public/tftm/models/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_boxmodel_v1/model_manifest.json';
const baselinePath = 'docs/visual-failure-packets/boxmodel-v1-15-dominant-shape-baseline.json';
const failures = [];
function fail(message) { failures.push(message); }
function parseGlbJson(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'JSON') return JSON.parse(data.toString('utf8', start, start + length).trim());
    offset = start + length;
  }
  throw new Error('missing GLB JSON');
}
function quatTransformVector(q, v) {
  const [x, y, z, w] = q || [0, 0, 0, 1];
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
function quatMultiply(a, b) {
  return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
function transforms(json) {
  const map = new Map();
  const children = new Set((json.nodes || []).flatMap((node) => node.children || []));
  const visit = (index, parent) => {
    const node = json.nodes[index];
    const t = node.translation || [0, 0, 0];
    const r = node.rotation || [0, 0, 0, 1];
    const s = node.scale || [1, 1, 1];
    const scaledT = [t[0] * parent.scale[0], t[1] * parent.scale[1], t[2] * parent.scale[2]];
    const rotatedT = quatTransformVector(parent.rotation, scaledT);
    const own = { translation: [parent.translation[0] + rotatedT[0], parent.translation[1] + rotatedT[1], parent.translation[2] + rotatedT[2]], rotation: quatMultiply(parent.rotation, r), scale: [parent.scale[0] * s[0], parent.scale[1] * s[1], parent.scale[2] * s[2]] };
    map.set(index, own);
    for (const child of node.children || []) visit(child, own);
  };
  for (let index = 0; index < (json.nodes || []).length; index += 1) if (!children.has(index)) visit(index, { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
  return map;
}
function transformPoint(transform, point) {
  const scaled = [point[0] * transform.scale[0], point[1] * transform.scale[1], point[2] * transform.scale[2]];
  const rotated = quatTransformVector(transform.rotation, scaled);
  return [rotated[0] + transform.translation[0], rotated[1] + transform.translation[1], rotated[2] + transform.translation[2]];
}
function nodeBounds(json, nodeName) {
  const nodeIndex = (json.nodes || []).findIndex((node) => node.name === nodeName);
  if (nodeIndex < 0) return null;
  const node = json.nodes[nodeIndex];
  const mesh = json.meshes?.[node.mesh];
  if (!mesh) return null;
  const transform = transforms(json).get(nodeIndex);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const primitive of mesh.primitives || []) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) {
      const p = transformPoint(transform, [x, y, z]);
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], p[axis]);
        max[axis] = Math.max(max[axis], p[axis]);
      }
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}
function bboxDelta(a, b) {
  const values = [];
  for (let i = 0; i < 3; i += 1) values.push(Math.abs(a.min[i] - b.min[i]), Math.abs(a.max[i] - b.max[i]), Math.abs(a.size[i] - b.size[i]));
  return Math.max(...values);
}
const dominantNodes = ['hull_lower_tub__hull_left', 'left_sloped_sponson__hull_left', 'right_sloped_sponson__hull_right', 'left_track_motion', 'right_track_motion', 'turret_cast_oval_shell__turret_left'];

if (!existsSync(glbPath)) fail('missing GLB ' + glbPath);
if (!existsSync(manifestPath)) fail('missing model manifest ' + manifestPath);
if (failures.length === 0) {
  const json = parseGlbJson(glbPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const current = {
    artifact_type: 'boxmodel_dominant_shape_baseline',
    model_revision: manifest.silhouette_revision,
    nodes: Object.fromEntries(dominantNodes.map((node) => [node, nodeBounds(json, node)]))
  };
  for (const [node, bounds] of Object.entries(current.nodes)) if (!bounds) fail('missing dominant node ' + node);
  if (process.argv.includes('--print-current')) {
    console.log(JSON.stringify(current, null, 2));
    process.exit(failures.length ? 1 : 0);
  }
  if (process.argv.includes('--write-baseline')) {
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
    console.log('wrote dominant shape baseline ' + baselinePath);
    process.exit(failures.length ? 1 : 0);
  }
  if (!existsSync(baselinePath)) fail('missing dominant shape baseline ' + baselinePath + '; run with --print-current only when intentionally creating a quarantine baseline');
  if (failures.length === 0) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    if (baseline.artifact_type !== 'boxmodel_dominant_shape_baseline') fail('baseline artifact_type must be boxmodel_dominant_shape_baseline');
    if (baseline.model_revision !== 'v1-15-cast-turret-readable-wheels') fail('baseline must quarantine v1-15, saw ' + baseline.model_revision);
    const deltas = dominantNodes.map((node) => ({ node, delta: bboxDelta(current.nodes[node], baseline.nodes[node]) }));
    for (const item of deltas) console.log(`${item.node}: dominant bbox delta ${item.delta.toFixed(4)}`);
    const changed = deltas.filter((item) => item.delta >= 0.12);
    if (current.model_revision !== baseline.model_revision && changed.length === 0) fail('dominant-shape no-op: model revision changed but hull/sponson/track/turret dominant bboxes stayed within 0.12 of v1-15 baseline');
    if (current.model_revision === baseline.model_revision) console.log('dominant shape baseline matches current red v1-15 quarantine; future revisions must materially change dominant bboxes or remain red.');
  }
}
if (failures.length) {
  console.error('Boxmodel dominant-shape delta validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

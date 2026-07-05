import { existsSync, readFileSync } from 'node:fs';

const assetId = 'authored_sherman_textureable_v1';
const glbPath = 'public/tftm/models/authored_sherman_textureable_v1/authored_sherman_textureable_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_textureable_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_textureable_v1/authored_sherman_textureable_v1.blend';
const plateDir = 'public/tftm/models/authored_sherman_textureable_v1/texture_plates';
const failures = [];
function fail(message) { failures.push(message); }
const facePlateIds = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side'];
const requiredNodes = ['tank_root','hull_root','left_track_pod','right_track_pod','left_tread_motion','right_tread_motion','left_track_pod_top_run__track_inner_top_bottom','right_track_pod_top_run__track_inner_top_bottom','left_track_pod_ground_run__track_inner_top_bottom','right_track_pod_ground_run__track_inner_top_bottom','left_track_pod_inner_wall__track_inner_top_bottom','right_track_pod_inner_wall__track_inner_top_bottom','left_track_pod_outer_upper_skirt__track_outer','right_track_pod_outer_upper_skirt__track_outer','left_track_pod_outer_lower_belt__track_outer','right_track_pod_outer_lower_belt__track_outer','left_track_pod_front_return__track_outer','right_track_pod_front_return__track_outer','left_track_pod_rear_return__track_outer','right_track_pod_rear_return__track_outer','left_roadwheel_group','right_roadwheel_group','turret_traverse_pivot','turret_shell','turret_cast_oval_shell__turret_left','turret_lower_ring_overlap__turret_front','turret_ring_socket__turret_top','turret_ring_shadow_blocker__turret_top','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','commander_hatch_base__turret_top','commander_hatch__turret_top','loader_hatch_base__turret_top','loader_hatch__turret_top'];

function parseGlb(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  let json = null;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'JSON') json = JSON.parse(data.toString('utf8', start, start + length).trim());
    offset = start + length;
  }
  if (!json) throw new Error('missing GLB JSON');
  return json;
}
function quatMultiply(a, b) {
  return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
function quatTransformVector(q, v) {
  const [x, y, z, w] = q || [0, 0, 0, 1];
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
function compose(parent, node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  const scaledT = [t[0] * parent.scale[0], t[1] * parent.scale[1], t[2] * parent.scale[2]];
  const rotatedT = quatTransformVector(parent.rotation, scaledT);
  return { translation: [parent.translation[0] + rotatedT[0], parent.translation[1] + rotatedT[1], parent.translation[2] + rotatedT[2]], rotation: quatMultiply(parent.rotation, r), scale: [parent.scale[0] * s[0], parent.scale[1] * s[1], parent.scale[2] * s[2]] };
}
function transforms(json) {
  const map = new Map();
  const childSet = new Set((json.nodes || []).flatMap((node) => node.children || []));
  const visit = (index, parent) => {
    const transform = compose(parent, json.nodes[index]);
    map.set(index, transform);
    for (const child of json.nodes[index].children || []) visit(child, transform);
  };
  for (let i = 0; i < (json.nodes || []).length; i += 1) if (!childSet.has(i)) visit(i, { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
  return map;
}
function transformPoint(transform, p) {
  const scaled = [p[0] * transform.scale[0], p[1] * transform.scale[1], p[2] * transform.scale[2]];
  const rotated = quatTransformVector(transform.rotation, scaled);
  return [rotated[0] + transform.translation[0], rotated[1] + transform.translation[1], rotated[2] + transform.translation[2]];
}
function emptyBounds() { return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; }
function include(bounds, p) { for (let a = 0; a < 3; a += 1) { bounds.min[a] = Math.min(bounds.min[a], p[a]); bounds.max[a] = Math.max(bounds.max[a], p[a]); } }
function finish(bounds) { return { min: bounds.min, max: bounds.max, size: bounds.max.map((v, i) => v - bounds.min[i]), center: bounds.max.map((v, i) => (v + bounds.min[i]) * 0.5) }; }
function descendants(json, rootIndex) {
  const out = [];
  const visit = (index) => { out.push(index); for (const child of json.nodes[index]?.children || []) visit(child); };
  visit(rootIndex);
  return out;
}
function boundsForNode(json, nodeName, recursive = false) {
  const rootIndex = (json.nodes || []).findIndex((node) => node.name === nodeName);
  if (rootIndex < 0) return null;
  const xforms = transforms(json);
  const bounds = emptyBounds();
  const nodeIndices = recursive ? descendants(json, rootIndex) : [rootIndex];
  for (const nodeIndex of nodeIndices) {
    const node = json.nodes[nodeIndex];
    if (node.mesh == null) continue;
    const mesh = json.meshes?.[node.mesh];
    const transform = xforms.get(nodeIndex);
    for (const primitive of mesh?.primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) include(bounds, transformPoint(transform, [x, y, z]));
    }
  }
  if (!Number.isFinite(bounds.min[0])) return null;
  return finish(bounds);
}

function boundsForMatching(json, matcher) {
  const xforms = transforms(json);
  const bounds = emptyBounds();
  for (let nodeIndex = 0; nodeIndex < (json.nodes || []).length; nodeIndex += 1) {
    const node = json.nodes[nodeIndex];
    if (!matcher(node.name || '') || node.mesh == null) continue;
    const mesh = json.meshes?.[node.mesh];
    const transform = xforms.get(nodeIndex);
    for (const primitive of mesh?.primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) include(bounds, transformPoint(transform, [x, y, z]));
    }
  }
  if (!Number.isFinite(bounds.min[0])) return null;
  return finish(bounds);
}

function allBounds(json) {
  const bounds = emptyBounds();
  const xforms = transforms(json);
  for (let nodeIndex = 0; nodeIndex < (json.nodes || []).length; nodeIndex += 1) {
    const node = json.nodes[nodeIndex];
    if (node.mesh == null) continue;
    const mesh = json.meshes?.[node.mesh];
    const transform = xforms.get(nodeIndex);
    for (const primitive of mesh?.primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) include(bounds, transformPoint(transform, [x, y, z]));
    }
  }
  return finish(bounds);
}
function triangles(json) {
  let total = 0;
  for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) total += Math.floor((json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION]?.count || 0) / 3);
  return total;
}
function parentChainIncludes(json, nodeName, ancestorName) {
  const index = (json.nodes || []).findIndex((node) => node.name === nodeName);
  const parent = new Map();
  (json.nodes || []).forEach((node, i) => (node.children || []).forEach((child) => parent.set(child, i)));
  let cursor = index;
  while (cursor != null && cursor >= 0) {
    if (json.nodes[cursor]?.name === ancestorName) return true;
    cursor = parent.get(cursor);
  }
  return false;
}

if (!existsSync(glbPath)) fail('missing GLB ' + glbPath);
if (!existsSync(manifestPath)) fail('missing manifest ' + manifestPath);
if (!existsSync(blendPath)) fail('missing source blend ' + blendPath);
for (const plate of facePlateIds) if (!existsSync(`${plateDir}/${plate}.png`)) fail('missing runtime texture plate ' + plate);

if (failures.length === 0) {
  const json = parseGlb(glbPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.asset_id !== assetId) fail('manifest asset_id mismatch');
  if (manifest.silhouette_revision !== 'v1-1-contained-running-gear-textureable') fail('unexpected silhouette revision ' + manifest.silhouette_revision);
  if (!String(manifest.uv_policy || '').includes('box') || !String(manifest.uv_policy || '').includes('plate')) fail('manifest must preserve box/plate UV policy');
  for (const node of requiredNodes) if (!(json.nodes || []).some((entry) => entry.name === node)) fail('missing node ' + node);
  const materialNames = new Set((json.materials || []).map((mat) => mat.name));
  for (const plate of facePlateIds) if (!materialNames.has(plate)) fail('missing material/surface plate ' + plate);
  const totalTriangles = triangles(json);
  if (totalTriangles < 3200 || totalTriangles > 7000) fail('unexpected triangle count ' + totalTriangles + '; textureable base should remain low-poly but complete');
  const sceneBounds = allBounds(json);
  if (!(sceneBounds.size[0] > sceneBounds.size[2] && sceneBounds.size[2] > sceneBounds.size[1])) fail('axis bounds wrong; expected X length > Z width > Y height, saw ' + sceneBounds.size.map((n) => n.toFixed(3)).join(' x '));

  for (const side of ['left', 'right']) {
    const sideSign = side === 'left' ? 1 : -1;
    const pod = boundsForNode(json, `${side}_track_pod`, true);
    const wheels = boundsForNode(json, `${side}_roadwheel_group`, true);
    const mainWheels = boundsForMatching(json, (name) => name.startsWith(`${side}_roadwheel_`) || name === `${side}_front_sprocket__bogie_side` || name === `${side}_rear_idler__bogie_side`);
    const upper = boundsForNode(json, `${side}_track_pod_outer_upper_skirt__track_outer`);
    const lower = boundsForNode(json, `${side}_track_pod_outer_lower_belt__track_outer`);
    const inner = boundsForNode(json, `${side}_track_pod_inner_wall__track_inner_top_bottom`);
    const top = boundsForNode(json, `${side}_track_pod_top_run__track_inner_top_bottom`);
    const ground = boundsForNode(json, `${side}_track_pod_ground_run__track_inner_top_bottom`);
    const front = boundsForNode(json, `${side}_track_pod_front_return__track_outer`);
    const rear = boundsForNode(json, `${side}_track_pod_rear_return__track_outer`);
    for (const [name, value] of Object.entries({ pod, wheels, mainWheels, upper, lower, inner, top, ground, front, rear })) if (!value) fail(`${side} missing ${name} bounds`);
    if (pod && !(pod.size[0] > 3.1 && pod.size[1] > 0.55 && pod.size[2] > 0.40)) fail(`${side} track pod is not a full 3D volume: ${pod.size.map((n) => n.toFixed(3)).join(' x ')}`);
    if (wheels && mainWheels && upper && lower) {
      if (sideSign < 0) {
        const exterior = Math.min(upper.min[2], lower.min[2]);
        if (wheels.min[2] <= exterior + 0.018) fail(`${side} wheels protrude outside track pod exterior plane: wheels minZ ${wheels.min[2].toFixed(3)} exterior ${exterior.toFixed(3)}`);
      } else {
        const exterior = Math.max(upper.max[2], lower.max[2]);
        if (wheels.max[2] >= exterior - 0.018) fail(`${side} wheels protrude outside track pod exterior plane: wheels maxZ ${wheels.max[2].toFixed(3)} exterior ${exterior.toFixed(3)}`);
      }
      if (upper.min[1] <= mainWheels.max[1] + 0.015) fail(`${side} upper skirt cuts through main wheel tops: skirt minY ${upper.min[1].toFixed(3)} wheel maxY ${mainWheels.max[1].toFixed(3)}`);
      if (lower.max[1] >= mainWheels.min[1] - 0.010) fail(`${side} lower belt cuts through main wheel bottoms: belt maxY ${lower.max[1].toFixed(3)} wheel minY ${mainWheels.min[1].toFixed(3)}`);
    }
    if (inner && upper && lower) {
      const exteriorSpan = sideSign < 0 ? inner.max[2] - Math.min(upper.min[2], lower.min[2]) : Math.max(upper.max[2], lower.max[2]) - inner.min[2];
      if (exteriorSpan < 0.32) fail(`${side} track pod lacks side thickness between inner wall and outer bands: ${exteriorSpan.toFixed(3)}`);
    }
  }

  const turretCast = boundsForNode(json, 'turret_cast_oval_shell__turret_left');
  const ringBlocker = boundsForNode(json, 'turret_ring_shadow_blocker__turret_top');
  const ringOverlap = boundsForNode(json, 'turret_lower_ring_overlap__turret_front');
  if (turretCast && ringBlocker && ringOverlap) {
    if (ringOverlap.min[1] > ringBlocker.max[1] + 0.025) fail('turret lower overlap sits above ring blocker, leaving ring gap visible');
    if (ringOverlap.size[2] < ringBlocker.size[2] * 0.88) fail('turret lower overlap too narrow to hide ring shadow');
  }
  for (const pair of [['commander_hatch_base__turret_top', 'commander_hatch__turret_top'], ['loader_hatch_base__turret_top', 'loader_hatch__turret_top']]) {
    const base = boundsForNode(json, pair[0]);
    const hatch = boundsForNode(json, pair[1]);
    if (base && hatch) {
      if (hatch.min[1] > base.max[1] + 0.030) fail(pair[1] + ' floats above its integrated base');
      if (!parentChainIncludes(json, pair[1], 'turret_shell')) fail(pair[1] + ' must be parented under turret_shell');
    }
  }
  for (const gunPart of ['mantlet', 'barrel', 'coaxial_mg']) if (!parentChainIncludes(json, gunPart, 'cannon_elevation_pivot')) fail(gunPart + ' must belong to cannon_elevation_pivot');
}

if (failures.length) {
  console.error('Authored textureable Sherman validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored textureable Sherman validation passed: contained wheels, closed track pods, turret ring overlap, integrated hatches, gun/coax pivot ownership, and split UV plates are diagnostically present. Cloud/Sense visual acceptance is still required.');

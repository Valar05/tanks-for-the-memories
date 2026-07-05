import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const glbPath = 'public/tftm/models/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_boxmodel_v1/model_manifest.json';
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
function axisString(bounds) { return bounds ? bounds.size.map((n) => n.toFixed(3)).join(' x ') : 'missing'; }
if (!existsSync(glbPath)) fail('missing current GLB ' + glbPath);
if (!existsSync(manifestPath)) fail('missing manifest ' + manifestPath);
if (failures.length === 0) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const revision = String(manifest.silhouette_revision || '');
  if (revision.includes('v1-11-raycast-closed-sponson-shells')) fail('v1-11 is explicitly visual-red/unaccepted; targeted slot-wall repair revision required');
  if (revision.includes('v1-12-watertight-visible-sponson-shells')) fail('v1-12 is visual-red wing deformation; must not pass no-op guard');
  if (!revision.includes('v1-15-cast-turret-readable-wheels')) fail('manifest must identify v1-15 cast-turret/readable-wheel repair');
  const json = parseGlbJson(glbPath);

  for (const forbiddenNode of ['turret_front_cheek__turret_front', 'turret_left_side_skin__turret_left', 'turret_right_side_skin__turret_right', 'turret_roof_flat_panel__turret_top']) {
    if ((json.nodes || []).some((node) => node.name === forbiddenNode)) fail('pasted turret panel regression: forbidden node still exported: ' + forbiddenNode);
  }
  const turretCast = nodeBounds(json, 'turret_cast_oval_shell__turret_left');
  if (!turretCast || !(turretCast.size[0] > 1.20 && turretCast.size[1] > 0.48 && turretCast.size[2] > 0.90)) fail('connected cast turret shell is missing or too small; saw ' + axisString(turretCast));
  for (const [label, wheelNode, trackNode, side] of [
    ['left wheel band', 'left_roadwheel_0.00__wheel_disc', 'left_track_motion', 'left'],
    ['right wheel band', 'right_roadwheel_0.00__wheel_disc', 'right_track_motion', 'right']
  ]) {
    const wheel = nodeBounds(json, wheelNode);
    const track = nodeBounds(json, trackNode);
    if (!wheel || !track) fail(label + ' missing wheel or track bbox');
    else {
      const exposure = side === 'left' ? wheel.max[2] - track.max[2] : track.min[2] - wheel.min[2];
      const faceDiameter = Math.max(wheel.size[0], wheel.size[1]);
      console.log(`${label}: exposure ${exposure.toFixed(3)}, face diameter ${faceDiameter.toFixed(3)}`);
      if (exposure < 0.14) fail(label + ' visually buried in track slab; exposure ' + exposure.toFixed(3));
      if (faceDiameter < 0.34) fail(label + ' too small to read; diameter ' + faceDiameter.toFixed(3));
    }
  }

  const checks = [
    ['left sponson shell', 'left_sloped_sponson__hull_left', 'left_outer_track_skirt__track_outer', 'left'],
    ['right sponson shell', 'right_sloped_sponson__hull_right', 'right_outer_track_skirt__track_outer', 'right']
  ];
  for (const [label, node, skirtNode, side] of checks) {
    const shell = nodeBounds(json, node);
    const skirt = nodeBounds(json, skirtNode);
    if (!shell || !skirt) {
      fail(label + ' or matching skirt missing; cannot check no-wing relationship');
      continue;
    }
    const overhang = side === 'left' ? shell.max[2] - skirt.max[2] : skirt.min[2] - shell.min[2];
    console.log(`${label}: exterior overhang ${overhang.toFixed(3)}, shell ${axisString(shell)}, skirt ${axisString(skirt)}`);
    if (overhang > 0.06) fail(label + ' wing regression: exterior overhang ' + overhang.toFixed(3) + ' > 0.060; this repeats the v1-12 side-wing failure');
    if (overhang < -0.08) fail(label + ' stops too far inboard of skirt plane: overhang ' + overhang.toFixed(3));
  }
  const slotWalls = [
    ['left front slot wall', 'left_front_track_well_slot_wall__hull_left'],
    ['right front slot wall', 'right_front_track_well_slot_wall__hull_right'],
    ['left rear slot wall', 'left_rear_track_well_slot_wall__hull_left'],
    ['right rear slot wall', 'right_rear_track_well_slot_wall__hull_right']
  ];
  for (const [label, node] of slotWalls) {
    const bounds = nodeBounds(json, node);
    console.log(`${label}: ${axisString(bounds)}`);
    if (!bounds) fail(label + ' missing; current build would be visual no-op at the reported crack');
    else if (!(bounds.size[0] > 0.52 && bounds.size[0] < 1.05 && bounds.size[1] > 0.34 && bounds.size[1] < 0.62 && bounds.size[2] < 0.12)) fail(label + ' is not a smaller vertical crack-cover wall; saw ' + axisString(bounds));
  }
}
if (failures.length) {
  console.error('Boxmodel targeted no-op/wing validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Boxmodel targeted no-op/wing validation passed: v1-15 keeps four smaller slot walls, removes pasted turret panels, without repeating v1-12 side-wing deformation.');

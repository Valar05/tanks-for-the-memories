import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const failures = [];
const assetId = 'authored_sherman_armored_v1';
const glbPath = 'public/tftm/models/authored_sherman_armored_v1/authored_sherman_armored_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_armored_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_armored_v1/authored_sherman_armored_v1.blend';
const facePlateIds = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side'];
const requiredNodes = ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','left_continuous_outer_skirt__track_outer','right_continuous_outer_skirt__track_outer','left_under_sponson_backing__hull_left','right_under_sponson_backing__hull_right','left_front_armored_return__hull_left','right_front_armored_return__hull_right','left_rear_armored_return__hull_left','right_rear_armored_return__hull_right'];
function fail(message) { failures.push(message); }
function read(file) { return readFileSync(file, 'utf8'); }
function parseGlbJson(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    if (type === 'JSON') return JSON.parse(data.toString('utf8', offset + 8, offset + 8 + length).trim());
    offset += 8 + length;
  }
  throw new Error('GLB JSON chunk missing');
}
function glbTriangles(json) {
  let triangles = 0;
  for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) {
    const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
    if (accessor?.count) triangles += Math.floor(accessor.count / 3);
  }
  return triangles;
}
function glbPositionBounds(json) {
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
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}
function quatTransformVector(q, v) {
  const [x, y, z, w] = q || [0, 0, 0, 1];
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
function composeTransform(parent, node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const parentRotatedT = quatTransformVector(parent.rotation, t);
  return {
    translation: [parent.translation[0] + parentRotatedT[0], parent.translation[1] + parentRotatedT[1], parent.translation[2] + parentRotatedT[2]],
    rotation: [
      parent.rotation[3] * r[0] + parent.rotation[0] * r[3] + parent.rotation[1] * r[2] - parent.rotation[2] * r[1],
      parent.rotation[3] * r[1] - parent.rotation[0] * r[2] + parent.rotation[1] * r[3] + parent.rotation[2] * r[0],
      parent.rotation[3] * r[2] + parent.rotation[0] * r[1] - parent.rotation[1] * r[0] + parent.rotation[2] * r[3],
      parent.rotation[3] * r[3] - parent.rotation[0] * r[0] - parent.rotation[1] * r[1] - parent.rotation[2] * r[2]
    ]
  };
}
function nodeWorldTransforms(json) {
  const transforms = new Map();
  const visit = (index, parent) => {
    const node = json.nodes[index];
    const transform = composeTransform(parent, node);
    transforms.set(index, transform);
    for (const child of node.children || []) visit(child, transform);
  };
  const childSet = new Set((json.nodes || []).flatMap((node) => node.children || []));
  for (let index = 0; index < (json.nodes || []).length; index += 1) if (!childSet.has(index)) visit(index, { translation: [0, 0, 0], rotation: [0, 0, 0, 1] });
  return transforms;
}
function nodeWorldBoundsByName(json, nodeName) {
  const nodeIndex = (json.nodes || []).findIndex((node) => node.name === nodeName);
  if (nodeIndex < 0) return null;
  const node = json.nodes[nodeIndex];
  const mesh = json.meshes?.[node.mesh];
  if (!mesh) return null;
  const transform = nodeWorldTransforms(json).get(nodeIndex);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const primitive of mesh.primitives || []) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) {
      const rotated = quatTransformVector(transform.rotation, [x, y, z]);
      const world = [rotated[0] + transform.translation[0], rotated[1] + transform.translation[1], rotated[2] + transform.translation[2]];
      for (let axis = 0; axis < 3; axis += 1) { min[axis] = Math.min(min[axis], world[axis]); max[axis] = Math.max(max[axis], world[axis]); }
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}
function boundsString(bounds) { return bounds ? 'min ' + bounds.min.map((n) => n.toFixed(3)).join(',') + ' max ' + bounds.max.map((n) => n.toFixed(3)).join(',') + ' size ' + bounds.size.map((n) => n.toFixed(3)).join(',') : 'missing'; }
function childNames(json, parentName) {
  const parentIndex = (json.nodes || []).findIndex((node) => node.name === parentName);
  if (parentIndex < 0) return [];
  return (json.nodes[parentIndex].children || []).map((i) => json.nodes[i]?.name || '');
}
function assertBehindSkirt(label, detail, skirt) {
  if (!detail) return fail(label + ' detail is missing');
  if (!skirt) return fail(label + ' skirt is missing');
  const center = (skirt.min[2] + skirt.max[2]) / 2;
  if (center > 0) {
    if (!(detail.max[2] < skirt.min[2] - 0.015)) fail(label + ' protrudes outside visible skirt plane; detail ' + boundsString(detail) + '; skirt ' + boundsString(skirt));
  } else if (!(detail.min[2] > skirt.max[2] + 0.015)) fail(label + ' protrudes outside visible skirt plane; detail ' + boundsString(detail) + '; skirt ' + boundsString(skirt));
}
function assertReturnCovers(label, ret, backing, skirt) {
  if (!ret) return fail(label + ' armored return is missing');
  if (!backing) return fail(label + ' backing is missing');
  if (!skirt) return fail(label + ' skirt is missing');
  if (!(ret.size[0] > 0.45 && ret.size[1] > 0.30)) fail(label + ' return must be large enough to cover the corner air gap, saw ' + boundsString(ret));
  const center = (skirt.min[2] + skirt.max[2]) / 2;
  if (center > 0) {
    if (!(ret.max[2] < skirt.min[2] - 0.01 && ret.max[2] > backing.min[2])) fail(label + ' must sit behind skirt but overlap backing depth; return ' + boundsString(ret) + '; skirt ' + boundsString(skirt) + '; backing ' + boundsString(backing));
  } else if (!(ret.min[2] > skirt.max[2] + 0.01 && ret.min[2] < backing.max[2])) fail(label + ' must sit behind skirt but overlap backing depth; return ' + boundsString(ret) + '; skirt ' + boundsString(skirt) + '; backing ' + boundsString(backing));
}

for (const file of [glbPath, manifestPath, blendPath, 'scripts/export_authored_sherman_armored.py', 'scripts/export_authored_sherman_armored.mjs', 'armored-tank.html', 'src/armored-tank.ts', 'src/sherman-asset-links.ts', 'src/sherman-runtime-materials.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);
for (const id of facePlateIds) for (const file of ['assets/authored/' + assetId + '/texture_templates/' + id + '.png', 'public/tftm/models/' + assetId + '/texture_plates/' + id + '.png']) if (!existsSync(file)) fail('missing paintable PNG plate ' + file);
const blender = spawnSync('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python-expr', 'import bpy; print("BLENDER_ARMORED_SMOKE", bpy.app.version_string, hasattr(bpy.ops.export_scene, "gltf"))'], { encoding: 'utf8' });
if ((blender.status ?? 1) !== 0) fail('Debian proot Blender smoke failed: ' + (blender.stderr || blender.stdout));
if (!String(blender.stdout || '').includes('BLENDER_ARMORED_SMOKE')) fail('Debian proot Blender smoke did not print expected marker');

if (failures.length === 0) {
  const manifest = JSON.parse(read(manifestPath));
  const json = parseGlbJson(glbPath);
  const nodeNames = new Set((json.nodes || []).map((node, index) => node.name || 'node_' + index));
  const materialNames = new Set((json.materials || []).map((material, index) => material.name || 'material_' + index));
  const triangleCount = glbTriangles(json);
  const bounds = glbPositionBounds(json);
  const runtime = read('src/armored-tank.ts') + read('src/sherman-asset-links.ts') + read('src/sherman-runtime-materials.ts');
  const build = read('scripts/build.mjs');
  if (manifest.asset_id !== assetId) fail('manifest asset_id must be ' + assetId);
  if (!String(manifest.silhouette_revision || '').includes('watertight-armored')) fail('manifest must record watertight armored revision');
  if (!String(manifest.red_build_context?.baseline || '').includes('boxmodel')) fail('manifest must record old boxmodel baseline');
  if (!String(manifest.red_build_context?.rejected || '').includes('hero')) fail('manifest must record rejected hero red evidence');
  if (triangleCount > 8000) fail('armored GLB must stay below 8000 triangles, saw ' + triangleCount);
  if (triangleCount < 2600) fail('armored GLB triangle count is suspiciously low for a covered Sherman: ' + triangleCount);
  if (!(bounds.size[0] > bounds.size[2] && bounds.size[2] > bounds.size[1])) fail('GLB axis bounds must be X length > Z width > Y height, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  for (const id of facePlateIds) { if (!manifest.face_plate_ids?.includes(id)) fail('manifest missing face plate id ' + id); if (!materialNames.has(id)) fail('GLB missing material slot ' + id); }
  for (const nodeName of requiredNodes) if (!nodeNames.has(nodeName)) fail('GLB missing required node ' + nodeName);
  const turretChildren = childNames(json, 'turret_traverse_pivot').join(' ');
  const gunChildren = childNames(json, 'cannon_elevation_pivot').join(' ');
  if (!turretChildren.includes('turret_shell') || !turretChildren.includes('cannon_elevation_pivot')) fail('turret traverse pivot must own turret shell and cannon elevation pivot, saw ' + turretChildren);
  if (!gunChildren.includes('mantlet') || !gunChildren.includes('barrel') || !gunChildren.includes('coaxial_mg')) fail('cannon elevation pivot must own mantlet/barrel/coaxial MG, saw ' + gunChildren);
  const leftSkirt = nodeWorldBoundsByName(json, 'left_continuous_outer_skirt__track_outer');
  const rightSkirt = nodeWorldBoundsByName(json, 'right_continuous_outer_skirt__track_outer');
  const leftBacking = nodeWorldBoundsByName(json, 'left_under_sponson_backing__hull_left');
  const rightBacking = nodeWorldBoundsByName(json, 'right_under_sponson_backing__hull_right');
  for (const x of ['-1.48','-0.08','0.97','1.32']) {
    assertBehindSkirt('left recessed track cleat ' + x, nodeWorldBoundsByName(json, 'left_recessed_track_cleat_' + x + '__track_outer'), leftSkirt);
    assertBehindSkirt('right recessed track cleat ' + x, nodeWorldBoundsByName(json, 'right_recessed_track_cleat_' + x + '__track_outer'), rightSkirt);
  }
  assertReturnCovers('left front', nodeWorldBoundsByName(json, 'left_front_armored_return__hull_left'), leftBacking, leftSkirt);
  assertReturnCovers('right front', nodeWorldBoundsByName(json, 'right_front_armored_return__hull_right'), rightBacking, rightSkirt);
  assertReturnCovers('left rear', nodeWorldBoundsByName(json, 'left_rear_armored_return__hull_left'), leftBacking, leftSkirt);
  assertReturnCovers('right rear', nodeWorldBoundsByName(json, 'right_rear_armored_return__hull_right'), rightBacking, rightSkirt);
  const barrel = nodeWorldBoundsByName(json, 'barrel');
  const mantlet = nodeWorldBoundsByName(json, 'mantlet');
  const coax = nodeWorldBoundsByName(json, 'coaxial_mg');
  if (!barrel || !(barrel.size[0] > 1.0 && barrel.size[0] > barrel.size[1] * 6 && barrel.size[0] > barrel.size[2] * 6)) fail('barrel must be long on X and animatable with gun pivot; saw ' + boundsString(barrel));
  if (!coax || !(coax.size[0] > 0.45 && coax.size[0] > coax.size[1] * 6 && coax.size[0] > coax.size[2] * 6)) fail('coaxial MG must be visible, long on X, and remembered; saw ' + boundsString(coax));
  if (!(mantlet && barrel && mantlet.max[0] > barrel.min[0] - 0.12)) fail('mantlet must occlude barrel base; mantlet ' + boundsString(mantlet) + '; barrel ' + boundsString(barrel));
  if (!(mantlet && coax && mantlet.max[0] > coax.min[0] - 0.12)) fail('mantlet must occlude coaxial MG base; mantlet ' + boundsString(mantlet) + '; coax ' + boundsString(coax));
  for (const marker of ['AUTHORED_SHERMAN_ARMORED_GLB_URL', 'AUTHORED_SHERMAN_ARMORED_FACE_PLATES', 'applyAuthoredArmoredTexturePlates', 'tftm-authored-sherman-armored-v1-20260705']) if (!runtime.includes(marker)) fail('armored runtime missing marker ' + marker);
  if (!build.includes("buildEntry('armored-tank.ts', 'armored-tank')")) fail('build must bundle armored-tank.ts');
  if (!build.includes("writeBundledHtml('armored-tank.html', 'armored-tank.html', 'armored-tank')")) fail('build must write armored-tank.html');
}
if (failures.length) {
  console.error('Authored armored asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored armored validation passed: covered track wells, armored returns, animatable pivots, coaxial MG, texture plates, and runtime route are wired.');

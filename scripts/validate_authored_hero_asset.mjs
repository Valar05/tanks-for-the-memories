import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const failures = [];
const assetId = 'authored_sherman_hero_v1';
const glbPath = 'public/tftm/models/authored_sherman_hero_v1/authored_sherman_hero_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_hero_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_hero_v1/authored_sherman_hero_v1.blend';
const facePlateIds = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side'];
const requiredNodes = ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','left_integrated_sponson_wall__hull_left','right_integrated_sponson_wall__hull_right','left_outer_track_belt__track_outer','right_outer_track_belt__track_outer'];
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
function boundsString(bounds) { return bounds ? 'min ' + bounds.min.map((n) => n.toFixed(3)).join(',') + ' max ' + bounds.max.map((n) => n.toFixed(3)).join(',') : 'missing'; }
function childNames(json, parentName) {
  const parentIndex = (json.nodes || []).findIndex((node) => node.name === parentName);
  if (parentIndex < 0) return [];
  return (json.nodes[parentIndex].children || []).map((i) => json.nodes[i]?.name || '');
}

for (const file of [glbPath, manifestPath, blendPath, 'scripts/export_authored_sherman_hero.py', 'scripts/export_authored_sherman_hero.mjs', 'hero-tank.html', 'src/hero-tank.ts', 'src/sherman-asset-links.ts', 'src/sherman-runtime-materials.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);
for (const id of facePlateIds) for (const file of ['assets/authored/' + assetId + '/texture_templates/' + id + '.png', 'public/tftm/models/' + assetId + '/texture_plates/' + id + '.png']) if (!existsSync(file)) fail('missing paintable PNG plate ' + file);
const blender = spawnSync('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python-expr', 'import bpy; print("BLENDER_HERO_SMOKE", bpy.app.version_string, hasattr(bpy.ops.export_scene, "gltf"))'], { encoding: 'utf8' });
if ((blender.status ?? 1) !== 0) fail('Debian proot Blender smoke failed: ' + (blender.stderr || blender.stdout));
if (!String(blender.stdout || '').includes('BLENDER_HERO_SMOKE')) fail('Debian proot Blender smoke did not print expected marker');

if (failures.length === 0) {
  const manifest = JSON.parse(read(manifestPath));
  const json = parseGlbJson(glbPath);
  const nodeNames = new Set((json.nodes || []).map((node, index) => node.name || 'node_' + index));
  const materialNames = new Set((json.materials || []).map((material, index) => material.name || 'material_' + index));
  const triangleCount = glbTriangles(json);
  const bounds = glbPositionBounds(json);
  const runtime = read('src/hero-tank.ts') + read('src/sherman-asset-links.ts') + read('src/sherman-runtime-materials.ts');
  const build = read('scripts/build.mjs');
  if (manifest.asset_id !== assetId) fail('manifest asset_id must be ' + assetId);
  if (!String(manifest.silhouette_revision || '').includes('v1-1-animatable-static-hero')) fail('manifest must record hero revision');
  if (!String(manifest.source_policy || '').includes('animatable static hero')) fail('manifest must identify animatable static hero geometry');
  if (!String(manifest.red_build_context?.replaces || '').includes('boxmodel')) fail('manifest must record boxmodel red/no-op replacement context');
  if (triangleCount > 7000) fail('hero GLB must stay below 7000 triangles, saw ' + triangleCount);
  if (triangleCount < 1800) fail('hero GLB triangle count is suspiciously low for an animatable Sherman hero: ' + triangleCount);
  if (!(bounds.size[0] > bounds.size[2] && bounds.size[2] > bounds.size[1])) fail('GLB axis bounds must be X length > Z width > Y height, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  for (const id of facePlateIds) { if (!manifest.face_plate_ids?.includes(id)) fail('manifest missing face plate id ' + id); if (!materialNames.has(id)) fail('GLB missing material slot ' + id); }
  for (const nodeName of requiredNodes) if (!nodeNames.has(nodeName)) fail('GLB missing required node ' + nodeName);
  const turretChildren = childNames(json, 'turret_traverse_pivot').join(' ');
  const gunChildren = childNames(json, 'cannon_elevation_pivot').join(' ');
  if (!turretChildren.includes('turret_shell') || !turretChildren.includes('cannon_elevation_pivot')) fail('turret traverse pivot must own turret shell and cannon elevation pivot, saw ' + turretChildren);
  if (!gunChildren.includes('mantlet') || !gunChildren.includes('barrel') || !gunChildren.includes('coaxial_mg')) fail('cannon elevation pivot must own mantlet/barrel/coaxial MG, saw ' + gunChildren);
  const leftSponson = nodeWorldBoundsByName(json, 'left_integrated_sponson_wall__hull_left');
  const rightSponson = nodeWorldBoundsByName(json, 'right_integrated_sponson_wall__hull_right');
  const leftTrack = nodeWorldBoundsByName(json, 'left_outer_track_belt__track_outer');
  const rightTrack = nodeWorldBoundsByName(json, 'right_outer_track_belt__track_outer');
  const overlapsZ = (a, b) => a && b && a.min[2] < b.max[2] && a.max[2] > b.min[2];
  const tucksVertically = (a, b) => a && b && a.min[1] < b.max[1] && a.max[1] > b.min[1];
  if (!(overlapsZ(leftSponson, leftTrack) && tucksVertically(leftSponson, leftTrack))) fail('left sponson must overlap/tuck into left track volume; sponson ' + boundsString(leftSponson) + '; track ' + boundsString(leftTrack));
  if (!(overlapsZ(rightSponson, rightTrack) && tucksVertically(rightSponson, rightTrack))) fail('right sponson must overlap/tuck into right track volume; sponson ' + boundsString(rightSponson) + '; track ' + boundsString(rightTrack));
  const barrel = nodeWorldBoundsByName(json, 'barrel');
  const mantlet = nodeWorldBoundsByName(json, 'mantlet');
  const coax = nodeWorldBoundsByName(json, 'coaxial_mg');
  if (!barrel || !(barrel.size[0] > 1.0 && barrel.size[0] > barrel.size[1] * 6 && barrel.size[0] > barrel.size[2] * 6)) fail('barrel must be long on X and animatable with gun pivot');
  if (!coax || !(coax.size[0] > 0.45 && coax.size[0] > coax.size[1] * 6 && coax.size[0] > coax.size[2] * 6)) fail('coaxial MG must be visible and long on X');
  if (!(mantlet && barrel && mantlet.max[0] > barrel.min[0] - 0.15)) fail('mantlet must visually own/occlude barrel base; mantlet ' + boundsString(mantlet) + '; barrel ' + boundsString(barrel));
  for (const marker of ['AUTHORED_SHERMAN_HERO_GLB_URL', 'AUTHORED_SHERMAN_HERO_FACE_PLATES', 'applyAuthoredHeroTexturePlates', 'tftm-authored-sherman-hero-v1-20260705']) if (!runtime.includes(marker)) fail('hero runtime missing marker ' + marker);
  if (!build.includes("buildEntry('hero-tank.ts', 'hero-tank')")) fail('build must bundle hero-tank.ts');
  if (!build.includes("writeBundledHtml('hero-tank.html', 'hero-tank.html', 'hero-tank')")) fail('build must write hero-tank.html');
}
if (failures.length) {
  console.error('Authored hero asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored hero validation passed: animatable hierarchy, GLB contract, texture plates, and runtime route are wired.');

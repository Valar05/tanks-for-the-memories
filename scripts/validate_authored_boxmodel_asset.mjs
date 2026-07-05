import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const failures = [];
const assetId = 'authored_sherman_boxmodel_v1';
const glbPath = 'public/tftm/models/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_boxmodel_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.blend';
const blenderScriptPath = 'scripts/export_authored_sherman_boxmodel.py';
const wrapperPath = 'scripts/export_authored_sherman_boxmodel.mjs';
const facePlateIds = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side'];
const requiredNodes = ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','commander_hatch__turret_top','left_flush_glacis_shoulder__hull_left','right_flush_glacis_shoulder__hull_right','left_low_front_track_cheek__hull_left','right_low_front_track_cheek__hull_right','left_vertical_shoulder_gap_web__hull_left','right_vertical_shoulder_gap_web__hull_right','left_visible_glacis_slot_wall__hull_left','right_visible_glacis_slot_wall__hull_right','left_sloped_sponson__hull_left','right_sloped_sponson__hull_right'];
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
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
      if (accessor?.count) triangles += Math.floor(accessor.count / 3);
    }
  }
  return triangles;
}
function glbPositionBounds(json) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], accessor.min[axis]);
        max[axis] = Math.max(max[axis], accessor.max[axis]);
      }
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
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx)
  ];
}
function composeTransform(parent, node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const parentRotatedT = quatTransformVector(parent.rotation, t);
  return {
    translation: [
      parent.translation[0] + parentRotatedT[0],
      parent.translation[1] + parentRotatedT[1],
      parent.translation[2] + parentRotatedT[2]
    ],
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
  for (let index = 0; index < (json.nodes || []).length; index += 1) {
    if (!childSet.has(index)) visit(index, { translation: [0, 0, 0], rotation: [0, 0, 0, 1] });
  }
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
    for (const x of [accessor.min[0], accessor.max[0]]) {
      for (const y of [accessor.min[1], accessor.max[1]]) {
        for (const z of [accessor.min[2], accessor.max[2]]) {
          const rotated = quatTransformVector(transform.rotation, [x, y, z]);
          const world = [rotated[0] + transform.translation[0], rotated[1] + transform.translation[1], rotated[2] + transform.translation[2]];
          for (let axis = 0; axis < 3; axis += 1) {
            min[axis] = Math.min(min[axis], world[axis]);
            max[axis] = Math.max(max[axis], world[axis]);
          }
        }
      }
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}

function axisString(bounds) {
  return bounds ? bounds.size.map((n) => n.toFixed(3)).join(' x ') : 'missing';
}

for (const file of [glbPath, manifestPath, blendPath, blenderScriptPath, wrapperPath, 'boxmodel-tank.html', 'src/boxmodel-tank.ts', 'src/sherman-asset-links.ts', 'src/sherman-runtime-materials.ts', 'scripts/build.mjs']) {
  if (!existsSync(file)) fail('missing ' + file);
}
for (const id of facePlateIds) {
  for (const file of ['assets/authored/' + assetId + '/texture_templates/' + id + '.png', 'public/tftm/models/' + assetId + '/texture_plates/' + id + '.png']) {
    if (!existsSync(file)) fail('missing paintable PNG plate ' + file);
  }
}
const blender = spawnSync('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python-expr', 'import bpy; print("BLENDER_BOXMODEL_SMOKE", bpy.app.version_string, hasattr(bpy.ops.export_scene, "gltf"))'], { encoding: 'utf8' });
if ((blender.status ?? 1) !== 0) fail('Debian proot Blender smoke failed: ' + (blender.stderr || blender.stdout));
if (!String(blender.stdout || '').includes('BLENDER_BOXMODEL_SMOKE')) fail('Debian proot Blender smoke did not print expected marker');

if (failures.length === 0) {
  const manifest = JSON.parse(read(manifestPath));
  const json = parseGlbJson(glbPath);
  const nodeNames = new Set((json.nodes || []).map((node, index) => node.name || 'node_' + index));
  const materialNames = new Set((json.materials || []).map((material, index) => material.name || 'material_' + index));
  const triangleCount = glbTriangles(json);
  const bounds = glbPositionBounds(json);
  const barrelBounds = nodeWorldBoundsByName(json, 'barrel');
  const coaxBounds = nodeWorldBoundsByName(json, 'coaxial_mg');
  const roadwheelBounds = nodeWorldBoundsByName(json, 'left_roadwheel_0.00__wheel_disc');
  const blenderScript = read(blenderScriptPath);
  const wrapper = read(wrapperPath);
  const runtime = read('src/boxmodel-tank.ts') + read('src/sherman-asset-links.ts') + read('src/sherman-runtime-materials.ts');
  const build = read('scripts/build.mjs');

  if (manifest.asset_id !== assetId) fail('manifest asset_id must be ' + assetId);
  if (!String(manifest.generator || '').includes('export_authored_sherman_boxmodel.py')) fail('manifest must name Blender generator');
  if (!String(manifest.source_blend || '').includes('.blend')) fail('manifest must name source .blend');
  if (!String(manifest.source_policy || '').includes('fully authored Blender box-model')) fail('manifest must identify authored Blender box-model geometry');
  if (!String(manifest.source_policy || '').includes('solidified overlapping armor plates')) fail('manifest must identify solidified overlapping armor plates');
  if (!String(manifest.source_policy || '').includes('coaxial MG')) fail('manifest must identify coaxial MG');
  if (!String(manifest.source_policy || '').includes('Blender Z-up basis conversion')) fail('manifest must identify Blender Z-up basis conversion');
  if (!manifest.orientation_contract || !String(manifest.orientation_contract.visual_regression_prevented || '').includes('wheels must sit inside side skirts')) fail('manifest must preserve upright/gun/skirt orientation contract');
  if (!manifest.runtime_contract?.side_skirt_occlusion) fail('manifest must preserve side skirt occlusion contract');
  if (!String(manifest.silhouette_revision || '').includes('v1-10-integrated-sponson-skirt-skins')) fail('manifest must record integrated sponson/skirt skin revision');
  if (!String(manifest.runtime_contract?.integrated_sponson_skirt_armor || '').includes('sloped sponson skins reshape the hull side')) fail('manifest must describe integrated sponson/skirt hull-side armor, not cover panels');
  if (!String(manifest.source_policy || '').includes('no Meshy chassis or turret')) fail('manifest must reject Meshy chassis/turret imports');
  if (!String(manifest.uv_policy || '').includes('box and planar UV plates')) fail('manifest must use box/planar UV plate policy');
  if (triangleCount > 6000) fail('GLB must stay below 6000 triangles, saw ' + triangleCount);
  if (manifest.approximate_triangles > 6000) fail('manifest triangle count must stay below 6000');
  if (triangleCount < 1500) fail('GLB triangle count is suspiciously low for Sherman boxmodel: ' + triangleCount);
  if (!(bounds.size[0] > bounds.size[2] && bounds.size[2] > bounds.size[1])) fail('GLB axis bounds must be X length > Z width > Y height for upright Three.js tank, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  if (!barrelBounds || !(barrelBounds.size[0] > 1.0 && barrelBounds.size[0] > barrelBounds.size[1] * 6 && barrelBounds.size[0] > barrelBounds.size[2] * 6)) fail('barrel mesh must be long on X, not vertical/perpendicular; saw ' + axisString(barrelBounds));
  if (!coaxBounds || !(coaxBounds.size[0] > 0.45 && coaxBounds.size[0] > coaxBounds.size[1] * 6 && coaxBounds.size[0] > coaxBounds.size[2] * 6)) fail('coaxial MG mesh must be visible and long on X; saw ' + axisString(coaxBounds));
  if (!roadwheelBounds || !(roadwheelBounds.size[2] < roadwheelBounds.size[0] * 0.45 && roadwheelBounds.size[2] < roadwheelBounds.size[1] * 0.45)) fail('roadwheel disc must be thin on Z so it faces the hull side; saw ' + axisString(roadwheelBounds));

  const sideSkinSpecs = [
    { label: 'left integrated sponson/skirt skin', node: 'left_sloped_sponson__hull_left', skirt: 'left_outer_track_skirt__track_outer', side: 'left' },
    { label: 'right integrated sponson/skirt skin', node: 'right_sloped_sponson__hull_right', skirt: 'right_outer_track_skirt__track_outer', side: 'right' }
  ];
  for (const spec of sideSkinSpecs) {
    const skin = nodeWorldBoundsByName(json, spec.node);
    const skirt = nodeWorldBoundsByName(json, spec.skirt);
    if (!skin) fail(spec.label + ' is missing; hull side must own the front/rear hull-to-track surface');
    if (!skirt) fail(spec.label + ' cannot be checked because the outer track skirt is missing');
    if (skin && !(skin.size[0] > 3.0 && skin.size[1] > 0.85)) fail(spec.label + ' must span the hull side from front glacis corner to rear armor/idler corner and down to the skirt; saw ' + axisString(skin));
    if (skin && skirt && spec.side === 'left' && !(skin.max[2] > skirt.max[2] - 0.04 && skin.min[2] < 0.66)) fail(spec.label + ' must bridge upper hull side into the positive-Z skirt plane, not stop inboard; skin ' + axisString(skin) + '; skirt ' + axisString(skirt));
    if (skin && skirt && spec.side === 'right' && !(skin.min[2] < skirt.min[2] + 0.04 && skin.max[2] > -0.66)) fail(spec.label + ' must bridge upper hull side into the negative-Z skirt plane, not stop inboard; skin ' + axisString(skin) + '; skirt ' + axisString(skirt));
  }
  for (const id of facePlateIds) {
    if (!manifest.face_plate_ids?.includes(id)) fail('manifest missing face plate id ' + id);
    if (!materialNames.has(id)) fail('GLB missing material slot ' + id);
  }
  for (const nodeName of requiredNodes) {
    if (!nodeNames.has(nodeName)) fail('GLB missing required node ' + nodeName);
  }
  for (const forbiddenNode of ['left_front_shoulder_armor_filler__hull_left', 'right_front_shoulder_armor_filler__hull_right', 'left_front_track_to_glacis_cover__hull_left', 'right_front_track_to_glacis_cover__hull_right', 'left_exterior_front_gap_cover__hull_left', 'right_exterior_front_gap_cover__hull_right']) {
    if (nodeNames.has(forbiddenNode)) fail('front wing filler regression: remove old raised gap filler node ' + forbiddenNode);
  }
  for (const forbidden of ['sherman_part_meshy_kit_v1', 'hull.glb', 'turret.glb', 'SimplifyModifier', 'RoundedBoxGeometry']) {
    if (blenderScript.includes(forbidden) || wrapper.includes(forbidden)) fail('boxmodel exporter must not use rejected/import marker ' + forbidden);
  }
  if (!blenderScript.includes('def P(') || !blenderScript.includes('Blender is Z-up')) fail('boxmodel exporter must declare Blender basis conversion helpers');
  for (const marker of ['AUTHORED_SHERMAN_BOXMODEL_GLB_URL', 'AUTHORED_SHERMAN_BOXMODEL_FACE_PLATES', 'applyAuthoredBoxmodelTexturePlates', 'tftm-authored-sherman-boxmodel-v1-10-20260705']) {
    if (!runtime.includes(marker)) fail('boxmodel runtime missing marker ' + marker);
  }
  if (!build.includes("buildEntry('boxmodel-tank.ts', 'boxmodel-tank')")) fail('build must bundle boxmodel-tank.ts');
  if (!runtime.includes('authored_sherman_boxmodel_v1.glb?v=v1-10-integrated-sponson-skirt-skins')) fail('runtime must version the authored boxmodel GLB URL so asset caching cannot hide geometry changes');
  if (!build.includes("writeBundledHtml('boxmodel-tank.html', 'boxmodel-tank.html', 'boxmodel-tank')")) fail('build must write boxmodel-tank.html');
}

if (failures.length) {
  console.error('Authored boxmodel asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored boxmodel validation passed: Blender proot export, source .blend, GLB contract, box UV plates, and runtime route are wired.');

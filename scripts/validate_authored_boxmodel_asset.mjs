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
const requiredNodes = ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','commander_hatch__turret_top'];
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
  if (!String(manifest.source_policy || '').includes('no Meshy chassis or turret')) fail('manifest must reject Meshy chassis/turret imports');
  if (!String(manifest.uv_policy || '').includes('box and planar UV plates')) fail('manifest must use box/planar UV plate policy');
  if (triangleCount > 6000) fail('GLB must stay below 6000 triangles, saw ' + triangleCount);
  if (manifest.approximate_triangles > 6000) fail('manifest triangle count must stay below 6000');
  if (triangleCount < 1500) fail('GLB triangle count is suspiciously low for Sherman boxmodel: ' + triangleCount);
  for (const id of facePlateIds) {
    if (!manifest.face_plate_ids?.includes(id)) fail('manifest missing face plate id ' + id);
    if (!materialNames.has(id)) fail('GLB missing material slot ' + id);
  }
  for (const nodeName of requiredNodes) {
    if (!nodeNames.has(nodeName)) fail('GLB missing required node ' + nodeName);
  }
  for (const forbidden of ['sherman_part_meshy_kit_v1', 'hull.glb', 'turret.glb', 'SimplifyModifier', 'RoundedBoxGeometry']) {
    if (blenderScript.includes(forbidden) || wrapper.includes(forbidden)) fail('boxmodel exporter must not use rejected/import marker ' + forbidden);
  }
  for (const marker of ['AUTHORED_SHERMAN_BOXMODEL_GLB_URL', 'AUTHORED_SHERMAN_BOXMODEL_FACE_PLATES', 'applyAuthoredBoxmodelTexturePlates', 'tftm-authored-sherman-boxmodel-v1-1-20260704']) {
    if (!runtime.includes(marker)) fail('boxmodel runtime missing marker ' + marker);
  }
  if (!build.includes("buildEntry('boxmodel-tank.ts', 'boxmodel-tank')")) fail('build must bundle boxmodel-tank.ts');
  if (!build.includes("writeBundledHtml('boxmodel-tank.html', 'boxmodel-tank.html', 'boxmodel-tank')")) fail('build must write boxmodel-tank.html');
}

if (failures.length) {
  console.error('Authored boxmodel asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored boxmodel validation passed: Blender proot export, source .blend, GLB contract, box UV plates, and runtime route are wired.');

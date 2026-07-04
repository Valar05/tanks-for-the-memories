import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const assetId = 'authored_sherman_retopo_v1';
const glbPath = 'public/tftm/models/authored_sherman_retopo_v1/authored_sherman_retopo_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_retopo_v1/model_manifest.json';
const exporterPath = 'scripts/export_authored_sherman_retopo.mjs';
const sourcePath = 'src/retopo-tank.ts';
const linksPath = 'src/sherman-asset-links.ts';
const materialsPath = 'src/sherman-runtime-materials.ts';
const buildPath = 'scripts/build.mjs';
const facePlateIds = [
  'hull_glacis', 'hull_left', 'hull_right', 'hull_rear', 'engine_deck',
  'turret_front', 'turret_left', 'turret_right', 'turret_top',
  'mantlet', 'barrel_strip', 'track_outer', 'track_inner_top_bottom',
  'wheel_disc', 'bogie_side'
];
const requiredNodes = [
  'tank_root', 'hull_root', 'turret_traverse_pivot', 'turret_shell', 'cannon_elevation_pivot',
  'mantlet_block__mantlet', 'barrel__barrel_strip', 'left_track_motion', 'right_track_motion',
  'left_roadwheel_group', 'right_roadwheel_group', 'commander_hatch__turret_top'
];
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

for (const file of [glbPath, manifestPath, exporterPath, sourcePath, linksPath, materialsPath, buildPath, 'retopo-tank.html']) {
  if (!existsSync(file)) fail('missing ' + file);
}
for (const id of facePlateIds) {
  for (const file of [
    'assets/authored/' + assetId + '/texture_templates/' + id + '.png',
    'public/tftm/models/' + assetId + '/texture_plates/' + id + '.png'
  ]) {
    if (!existsSync(file)) fail('missing paintable PNG plate ' + file);
  }
}

if (failures.length === 0) {
  const manifest = JSON.parse(read(manifestPath));
  const exporter = read(exporterPath);
  const source = read(sourcePath);
  const links = read(linksPath);
  const materials = read(materialsPath);
  const build = read(buildPath);
  const json = parseGlbJson(glbPath);
  const nodeNames = new Set((json.nodes || []).map((node, index) => node.name || 'node_' + index));
  const materialNames = new Set((json.materials || []).map((material, index) => material.name || 'material_' + index));

  if (manifest.asset_id !== assetId) fail('manifest asset_id must be ' + assetId);
  if (!String(manifest.source_policy || '').includes('fully authored')) fail('manifest must identify fully authored geometry');
  if (!String(manifest.source_policy || '').includes('no Meshy chassis or turret')) fail('manifest must reject Meshy chassis/turret imports');
  if (!String(manifest.uv_policy || '').includes('split face texture plates')) fail('manifest must use split face texture plate UV policy');
  if (manifest.approximate_triangles > 12000) fail('authored retopo must stay below 12000 triangles for first phone review');
  for (const id of facePlateIds) {
    if (!manifest.face_plate_ids?.includes(id)) fail('manifest missing face plate id ' + id);
    if (!materialNames.has(id)) fail('GLB missing material slot ' + id);
  }
  for (const nodeName of requiredNodes) {
    if (!nodeNames.has(nodeName)) fail('GLB missing required node ' + nodeName);
  }
  for (const forbidden of ['loadGlb(', 'sherman_part_meshy_kit_v1', 'hull.glb', 'turret.glb', 'SimplifyModifier']) {
    if (exporter.includes(forbidden)) fail('authored exporter must not import or simplify Meshy chassis/turret marker ' + forbidden);
  }
  for (const marker of ['AUTHORED_SHERMAN_RETOPO_GLB_URL', 'AUTHORED_SHERMAN_RETOPO_FACE_PLATES', 'applyAuthoredRetopoTexturePlates', 'tftm-authored-sherman-retopo-v1-1-20260704']) {
    if (!source.includes(marker) && !links.includes(marker) && !materials.includes(marker)) fail('retopo runtime missing marker ' + marker);
  }
  if (!build.includes("buildEntry('retopo-tank.ts', 'retopo-tank')")) fail('build must bundle retopo-tank.ts');
  if (!build.includes("writeBundledHtml('retopo-tank.html', 'retopo-tank.html', 'retopo-tank')")) fail('build must write retopo-tank.html');
}

if (failures.length) {
  console.error('Authored retopo asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored retopo asset validation passed: authored GLB, required pivots, paintable PNG plates, and retopo route are wired.');

import { existsSync, readFileSync } from 'node:fs';

const assetId = 'authored_sherman_treads_v1';
const glbPath = 'public/tftm/models/authored_sherman_treads_v1/authored_sherman_treads_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_treads_v1/authored_sherman_treads_v1.blend';
const exporterPath = 'scripts/export_authored_sherman_treads.py';
const failures = [];
function fail(message) { failures.push(message); }
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
function triangles(json) {
  let total = 0;
  for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) total += Math.floor((json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION]?.count || 0) / 3);
  return total;
}
function allBounds(json) {
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
  return { min, max, size: max.map((v, i) => v - min[i]) };
}
function nodeMeshBounds(json, name) {
  const node = (json.nodes || []).find((entry) => entry.name === name);
  if (!node || node.mesh == null) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const mesh = json.meshes?.[node.mesh];
  for (const primitive of mesh?.primitives || []) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], accessor.min[axis]);
      max[axis] = Math.max(max[axis], accessor.max[axis]);
    }
  }
  if (!Number.isFinite(min[0])) return null;
  return { min, max, size: max.map((v, i) => v - min[i]) };
}
function descendants(json, nodeName) {
  const root = (json.nodes || []).findIndex((node) => node.name === nodeName);
  const out = [];
  const visit = (index) => { out.push(json.nodes[index]?.name || ''); for (const child of json.nodes[index]?.children || []) visit(child); };
  if (root >= 0) visit(root);
  return out;
}

for (const file of [glbPath, manifestPath, blendPath, exporterPath, 'treadfirst-treads.html', 'src/treadfirst-treads.ts', 'src/sherman-asset-links.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);

if (failures.length === 0) {
  const json = parseGlb(glbPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const exporter = readFileSync(exporterPath, 'utf8');
  const runtime = readFileSync('src/treadfirst-treads.ts', 'utf8') + readFileSync('src/sherman-asset-links.ts', 'utf8');
  const build = readFileSync('scripts/build.mjs', 'utf8');
  if (manifest.asset_id !== assetId) fail('manifest asset_id mismatch');
  if (manifest.silhouette_revision !== 'v1-1-full-tread-assembly') fail('unexpected revision ' + manifest.silhouette_revision);
  if (manifest.profile?.old_reference_point_count !== 8) fail('manifest must record old subdivision-0 profile point count');
  if ((manifest.profile?.outer_profile_point_count || 0) < 16) fail('outer profile must add one silhouette subdivision layer beyond the old 8-point profile');
  for (const node of ['treads_root','left_tread_belt','right_tread_belt','left_tread_connector_mounts','right_tread_connector_mounts','left_wheel_group','right_wheel_group','left_bogie_connectors','right_bogie_connectors','left_front_sprocket','right_front_sprocket','left_rear_idler','right_rear_idler']) if (!(json.nodes || []).some((entry) => entry.name === node)) fail('missing required node ' + node);
  for (const forbidden of ['hull','turret','barrel','coax','mantlet','cannon','tank_root']) {
    const hit = (json.nodes || []).find((node) => String(node.name || '').toLowerCase().includes(forbidden));
    if (hit) fail('tread-only asset contains forbidden full-tank node ' + hit.name);
  }
  for (const forbidden of ['export_authored_sherman_boxmodel', 'export_authored_sherman_textureable', 'authored_sherman_boxmodel_v1', 'authored_sherman_textureable_v1']) {
    if (exporter.includes(forbidden)) fail('tread exporter must not copy failed exporter marker ' + forbidden);
  }
  const tri = triangles(json);
  if (tri < 1800 || tri > 7000) fail('unexpected full tread assembly triangle count ' + tri);
  const bounds = allBounds(json);
  if (!(bounds.size[0] > 3.0 && bounds.size[2] > 1.8 && bounds.size[1] < 0.9)) fail('tread assembly bounds should be long/wide/low, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  for (const side of ['left', 'right']) {
    const belt = nodeMeshBounds(json, `${side}_tread_belt`);
    if (!belt) fail(`missing ${side} belt bounds`);
    else {
      if (!(belt.size[0] > 3.0 && belt.size[1] > 0.55 && belt.size[2] > 0.35)) fail(`${side} belt is not a closed 3D tread volume: ` + belt.size.map((n) => n.toFixed(3)).join(' x '));
    }
    const names = descendants(json, `${side}_tread_connector_mounts`).join('\n');
    if ((names.match(/connector_mount_/g) || []).length < 4) fail(`${side} connector mounts must expose four subordinate mount blocks`);
    const wheelNames = descendants(json, `${side}_wheel_group`).join('\n');
    if ((wheelNames.match(/roadwheel_/g) || []).length < 6) fail(`${side} wheel group must expose six side-facing road wheels`);
    if (!wheelNames.includes(`${side}_front_sprocket`) || !wheelNames.includes(`${side}_rear_idler`)) fail(`${side} wheel group must expose front sprocket and rear idler`);
    if ((wheelNames.match(/return_roller_/g) || []).length < 3) fail(`${side} wheel group must expose return rollers`);
    const bogieNames = descendants(json, `${side}_bogie_connectors`).join('\n');
    if ((bogieNames.match(/vvss_bogie_arm_/g) || []).length < 3) fail(`${side} bogie connectors must expose three bogie arm blocks`);
  }
  for (const marker of ['AUTHORED_SHERMAN_TREADS_GLB_URL', 'tftm-authored-sherman-treads-v1-1-20260705', 'OrbitControls', 'orientation-widget', 'full tread assembly']) if (!runtime.includes(marker)) fail('runtime missing marker ' + marker);
  if (!build.includes("buildEntry('treadfirst-treads.ts', 'treadfirst-treads')")) fail('build must bundle treadfirst-treads.ts');
  if (!build.includes("writeBundledHtml('treadfirst-treads.html', 'treadfirst-treads.html', 'treadfirst-treads')")) fail('build must write treadfirst-treads.html');
}

if (failures.length) {
  console.error('Authored tread-only asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored tread assembly validation passed: subdivided closed belts, side-facing wheels, sprockets, idlers, return rollers, bogie connectors, subordinate mounts, no full tank geometry. Cloud/Sense visual acceptance is still required.');

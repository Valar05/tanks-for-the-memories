import { existsSync, readFileSync } from 'node:fs';

const assetId = 'authored_sherman_treads_v1';
const glbPath = 'public/tftm/models/authored_sherman_treads_v1/authored_sherman_treads_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_treads_v1/authored_sherman_treads_v1.blend';
const v11RedVerdictPath = 'docs/visual-verdicts/treads-v1-1-red.json';
const v12RedVerdictPath = 'docs/visual-verdicts/treads-v1-2-red.json';
const v14RedVerdictPath = 'docs/visual-verdicts/treads-v1-4-red.json';
const diagnosticPath = 'generated/diagnostics/authored_sherman_treads_v1/profile-opening-diagnostic.json';
const exporterPath = 'scripts/export_authored_sherman_treads.py';
const failures = [];
let diagnostic = null;
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

function childMap(json) {
  const map = new Map();
  (json.nodes || []).forEach((node, index) => map.set(index, node.children || []));
  return map;
}
function nodeIndex(json, name) { return (json.nodes || []).findIndex((node) => node.name === name); }
function descendantBounds(json, name) {
  const root = nodeIndex(json, name);
  if (root < 0) return null;
  const cmap = childMap(json);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (index) => {
    const node = json.nodes[index];
    if (node?.mesh != null) {
      const mesh = json.meshes?.[node.mesh];
      for (const primitive of mesh?.primitives || []) {
        const accessor = json.accessors?.[primitive.attributes?.POSITION];
        if (!accessor?.min || !accessor?.max) continue;
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], accessor.min[axis]);
          max[axis] = Math.max(max[axis], accessor.max[axis]);
        }
      }
    }
    for (const child of cmap.get(index) || []) visit(child);
  };
  visit(root);
  if (!Number.isFinite(min[0])) return null;
  return { min, max, size: max.map((v, i) => v - min[i]) };
}
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function circleMostlyInside(center, radius, polygon) {
  const samples = 16;
  let inside = 0;
  for (let i = 0; i < samples; i += 1) {
    const angle = Math.PI * 2 * i / samples;
    const point = [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
    if (pointInPolygon(point, polygon)) inside += 1;
  }
  return inside / samples;
}
function wheelProfile(json, name) {
  const bounds = nodeMeshBounds(json, name);
  if (!bounds) return null;
  const center = [(bounds.min[0] + bounds.max[0]) * 0.5, (bounds.min[1] + bounds.max[1]) * 0.5];
  const radius = Math.max(bounds.size[0], bounds.size[1]) * 0.5;
  return { name, center, radius, bounds };
}

function materialName(json, materialIndex) { return json.materials?.[materialIndex]?.name || ''; }
function meshPrimitiveSummary(json, nodeName) {
  const node = (json.nodes || []).find((entry) => entry.name === nodeName);
  const mesh = node?.mesh != null ? json.meshes?.[node.mesh] : null;
  if (!mesh) return null;
  return (mesh.primitives || []).map((primitive) => ({
    material: materialName(json, primitive.material),
    positions: json.accessors?.[primitive.attributes?.POSITION]?.count || 0,
    normals: json.accessors?.[primitive.attributes?.NORMAL]?.count || 0,
  }));
}

function descendants(json, nodeName) {
  const root = (json.nodes || []).findIndex((node) => node.name === nodeName);
  const out = [];
  const visit = (index) => { out.push(json.nodes[index]?.name || ''); for (const child of json.nodes[index]?.children || []) visit(child); };
  if (root >= 0) visit(root);
  return out;
}

for (const file of [glbPath, manifestPath, blendPath, exporterPath, v11RedVerdictPath, v12RedVerdictPath, v14RedVerdictPath, 'treadfirst-treads.html', 'src/treadfirst-treads.ts', 'src/sherman-asset-links.ts', 'scripts/build.mjs']) if (!existsSync(file)) fail('missing ' + file);

if (failures.length === 0) {
  const json = parseGlb(glbPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const exporter = readFileSync(exporterPath, 'utf8');
  const runtime = readFileSync('src/treadfirst-treads.ts', 'utf8') + readFileSync('src/sherman-asset-links.ts', 'utf8');
  const build = readFileSync('scripts/build.mjs', 'utf8');
  if (manifest.asset_id !== assetId) fail('manifest asset_id mismatch');
  if (manifest.silhouette_revision !== 'v1-5-smooth-shade-creased-rims') fail('unexpected revision ' + manifest.silhouette_revision);
  const v11Verdict = JSON.parse(readFileSync(v11RedVerdictPath, 'utf8'));
  const v12Verdict = JSON.parse(readFileSync(v12RedVerdictPath, 'utf8'));
  const v14Verdict = JSON.parse(readFileSync(v14RedVerdictPath, 'utf8'));
  if (v11Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.1 red verdict must remain explicit before accepting v1.3 diagnostics');
  if (v12Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.2 red verdict must remain explicit before accepting v1.3 diagnostics');
  if (v14Verdict.status !== 'red_unaccepted_no_op_churn') fail('v1.4 red verdict must remain explicit before accepting v1.5 diagnostics');
  if (manifest.profile?.old_reference_point_count !== 8) fail('manifest must record old subdivision-0 profile point count');
  if ((manifest.profile?.outer_profile_point_count || 0) < 16) fail('outer profile must add one silhouette subdivision layer beyond the old 8-point profile');
  if (!String(manifest.shading_contract || '').includes('mark only desired circular rim/corner loops sharp')) fail('manifest must declare smooth shade first and creased rim/corner loops');
  for (const sourceMarker of ['smooth_all_faces', 'mark_circular_crease_edges', 'edge.use_edge_sharp = True', 'marked_rim_crease_edges', 'marked_wheel_rim_edge_split', 'weighted_wheel_crease_normals']) if (!exporter.includes(sourceMarker)) fail('exporter missing shading marker ' + sourceMarker);
  for (const node of ['treads_root','left_tread_belt','right_tread_belt','left_tread_top_run','right_tread_top_run','left_tread_bottom_run','right_tread_bottom_run','left_tread_front_return','right_tread_front_return','left_tread_rear_return','right_tread_rear_return','left_tread_connector_mounts','right_tread_connector_mounts','left_wheel_group','right_wheel_group','left_bogie_connectors','right_bogie_connectors','left_front_sprocket','right_front_sprocket','left_rear_idler','right_rear_idler']) if (!(json.nodes || []).some((entry) => entry.name === node)) fail('missing required node ' + node);
  for (const forbidden of ['hull','turret','barrel','coax','mantlet','cannon','tank_root']) {
    const hit = (json.nodes || []).find((node) => String(node.name || '').toLowerCase().includes(forbidden));
    if (hit) fail('tread-only asset contains forbidden full-tank node ' + hit.name);
  }
  for (const forbidden of ['export_authored_sherman_boxmodel', 'export_authored_sherman_textureable', 'authored_sherman_boxmodel_v1', 'authored_sherman_textureable_v1']) {
    if (exporter.includes(forbidden)) fail('tread exporter must not copy failed exporter marker ' + forbidden);
  }
  const tri = triangles(json);
  if (tri < 18000 || tri > 38000) fail('unexpected full tread assembly triangle count ' + tri);
  const innerProfile = manifest.profile?.inner_profile_xy;
  if (!Array.isArray(innerProfile) || innerProfile.length < 8) fail('manifest must expose inner_profile_xy for profile-opening validation');
  diagnostic = { asset_id: assetId, revision: manifest.silhouette_revision, profile_opening: innerProfile, sides: {} };
  const bounds = allBounds(json);
  if (!(bounds.size[0] > 3.0 && bounds.size[2] > 1.8 && bounds.size[1] < 0.9)) fail('tread assembly bounds should be long/wide/low, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  for (const side of ['left', 'right']) {
    const belt = descendantBounds(json, `${side}_tread_belt`);
    if (!belt) fail(`missing ${side} belt bounds`);
    else {
      if (!(belt.size[0] > 3.0 && belt.size[1] > 0.55 && belt.size[2] > 0.35)) fail(`${side} belt is not a closed 3D tread volume: ` + belt.size.map((n) => n.toFixed(3)).join(' x '));
      for (const segment of ['top_run','bottom_run','front_return','rear_return']) {
        if (!nodeMeshBounds(json, `${side}_tread_${segment}`)) fail(`${side} tread belt must expose split segment ${segment}`);
      }
    }
    const names = descendants(json, `${side}_tread_connector_mounts`).join('\n');
    if ((names.match(/connector_mount_/g) || []).length < 4) fail(`${side} connector mounts must expose four subordinate mount blocks`);
    const wheelNames = descendants(json, `${side}_wheel_group`).join('\n');
    if ((wheelNames.match(/roadwheel_/g) || []).length < 6) fail(`${side} wheel group must expose six side-facing road wheels`);
    if (innerProfile) {
      const checked = [];
      for (const wheelName of [`${side}_roadwheel_1`, `${side}_roadwheel_3`, `${side}_roadwheel_6`, `${side}_front_sprocket`, `${side}_rear_idler`, `${side}_return_roller_1`]) {
        const wheel = wheelProfile(json, wheelName);
        const primitiveSummary = meshPrimitiveSummary(json, wheelName);
        if (!primitiveSummary) fail(`${side} missing material primitive summary for ${wheelName}`);
        else {
          const materialNames = new Set(primitiveSummary.map((entry) => entry.material));
          const totalPositions = primitiveSummary.reduce((sum, entry) => sum + entry.positions, 0);
          if (!materialNames.has('wheel_metal') || !materialNames.has('wheel_rubber')) fail(`${wheelName} must export both wheel_metal rim and wheel_rubber tire primitives`);
          if (totalPositions < 480) fail(`${wheelName} does not have enough ring samples to avoid faceted tire read: ${totalPositions} positions`);
        }
        if (!wheel) fail(`${side} missing profile-opening bounds for ${wheelName}`);
        else {
          const centerInside = pointInPolygon(wheel.center, innerProfile);
          const insideRatio = circleMostlyInside(wheel.center, wheel.radius * 0.72, innerProfile);
          checked.push({ name: wheelName, center: wheel.center, radius: wheel.radius, center_inside: centerInside, useful_disc_inside_ratio: insideRatio });
          if (!centerInside) fail(`${wheelName} center is outside the inner tread profile opening; v1.2 no-op repeated`);
          if (insideRatio < 0.58) fail(`${wheelName} useful disc area is not in the tread opening: ${(insideRatio * 100).toFixed(0)}% inside`);
        }
      }
      diagnostic.sides[side] = checked;
    }
    if (!wheelNames.includes(`${side}_front_sprocket`) || !wheelNames.includes(`${side}_rear_idler`)) fail(`${side} wheel group must expose front sprocket and rear idler`);
    if ((wheelNames.match(/return_roller_/g) || []).length < 3) fail(`${side} wheel group must expose return rollers`);
    const bogieNames = descendants(json, `${side}_bogie_connectors`).join('\n');
    if ((bogieNames.match(/vvss_bogie_arm_/g) || []).length < 3) fail(`${side} bogie connectors must expose three bogie arm blocks`);
  }
  for (const marker of ['AUTHORED_SHERMAN_TREADS_GLB_URL', 'tftm-authored-sherman-treads-v1-5-20260705', 'OrbitControls', 'orientation-widget', 'profile opening']) if (!runtime.includes(marker)) fail('runtime missing marker ' + marker);
  if (!build.includes("buildEntry('treadfirst-treads.ts', 'treadfirst-treads')")) fail('build must bundle treadfirst-treads.ts');
  if (!build.includes("writeBundledHtml('treadfirst-treads.html', 'treadfirst-treads.html', 'treadfirst-treads')")) fail('build must write treadfirst-treads.html');
}

if (failures.length) {
  console.error('Authored tread-only asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
await import('node:fs').then(({ mkdirSync, writeFileSync }) => { mkdirSync('generated/diagnostics/authored_sherman_treads_v1', { recursive: true }); writeFileSync(diagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n'); });
console.log('Authored tread assembly validation passed: v1.5 keeps wheels in the profile opening with smooth shading and creased rim loops; cloud/Sense visual acceptance is still required.');

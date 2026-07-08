import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function fail(message) { failures.push(message); }
function pngSize(path) {
  const data = readFileSync(path);
  if (data.toString('ascii', 1, 4) !== 'PNG') fail(path + ' is not a PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

const helperPath = 'src/authored-sherman-moving-tread-links.ts';
const hybridPath = 'src/hybrid-hull-treads.ts';
const treadPath = 'src/treadfirst-treads.ts';
const packagePath = 'package.json';
const treadTextureManifestPath = 'public/tftm/textures/authored_sherman_runtime_tread_shoe_v1/manifest.json';
const wheelTextureManifestPath = 'public/tftm/textures/authored_sherman_runtime_wheel_v1/manifest.json';
const treadTextureFiles = [
  'public/tftm/textures/authored_sherman_runtime_tread_shoe_v1/tread_shoe_albedo.png',
  'public/tftm/textures/authored_sherman_runtime_tread_shoe_v1/tread_shoe_normal.png',
  'public/tftm/textures/authored_sherman_runtime_tread_shoe_v1/tread_shoe_roughness.png',
  'public/tftm/textures/authored_sherman_runtime_tread_shoe_v1/tread_shoe_metalness.png'
];
const wheelTextureFiles = [
  'public/tftm/textures/authored_sherman_runtime_wheel_v1/wheel_contact_albedo.png'
];
for (const path of [helperPath, hybridPath, treadPath, packagePath, 'scripts/build_cloud_visual_release.mjs', 'scripts/validate_hybrid_hull_treads_cloud_gate.mjs', 'scripts/validate_treadfirst_treads_cloud_gate.mjs', treadTextureManifestPath, wheelTextureManifestPath, ...treadTextureFiles, ...wheelTextureFiles]) {
  if (!existsSync(path)) fail('missing ' + path);
}
if (!failures.length) {
  const helper = readFileSync(helperPath, 'utf8');
  const hybrid = readFileSync(hybridPath, 'utf8');
  const tread = readFileSync(treadPath, 'utf8');
  const release = readFileSync('scripts/build_cloud_visual_release.mjs', 'utf8');
  const hybridGate = readFileSync('scripts/validate_hybrid_hull_treads_cloud_gate.mjs', 'utf8');
  const treadGate = readFileSync('scripts/validate_treadfirst_treads_cloud_gate.mjs', 'utf8');
  const treadManifest = JSON.parse(readFileSync(treadTextureManifestPath, 'utf8'));
  const wheelManifest = JSON.parse(readFileSync(wheelTextureManifestPath, 'utf8'));
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (treadManifest.asset_id !== 'authored_sherman_runtime_tread_shoe_v1') fail('runtime tread shoe manifest asset_id mismatch');
  if (!String(treadManifest.uv_policy || '').includes('main outward shoe face samples full 0-1 image')) fail('tread manifest missing face-aware UV policy');
  if (!String(treadManifest.metalness_policy || '').includes('painted-metal metalness map')) fail('tread manifest missing painted-metal metalness policy');
  if (!String(treadManifest.metalness_policy || '').includes('runtime metalness 0.16')) fail('tread manifest must cap metalness at tank-average 0.16');
  if (treadManifest.texture_set_id !== 'authored_sherman_runtime_tread_shoe_v3_matte_detail_roughness_20260707') fail('runtime tread shoe texture_set_id mismatch');
  if (!String(treadManifest.roughness_policy || '').includes('high matte painted-steel roughness map')) fail('tread manifest must document high matte roughness policy');
  if (!String(treadManifest.normal_policy || '').includes('stronger than the downloaded source normal')) fail('tread manifest must document stronger regenerated normal policy');
  if (wheelManifest.asset_id !== 'authored_sherman_runtime_wheel_v1') fail('runtime wheel manifest asset_id mismatch');
  if (wheelManifest.texture_set_id !== 'authored_sherman_runtime_wheel_v2_pbr_edge_grime_contact_20260707') fail('runtime wheel texture_set_id mismatch');
  if (!String(wheelManifest.source_policy || '').includes('offline LUT/color-corrected runtime wheel texture')) fail('wheel manifest must document offline LUT adjustment');
  if (!String(wheelManifest.color_policy || '').includes('avoids pure black crushed wheel discs')) fail('wheel manifest must forbid black crushed discs');
  for (const file of [...treadTextureFiles, ...wheelTextureFiles]) {
    const size = pngSize(file);
    if (size.width !== 1024 || size.height !== 1024) fail(file + ' must be normalized to 1024x1024, saw ' + size.width + 'x' + size.height);
  }
  const treadRoughnessStats = treadManifest.stats?.roughness || {};
  const treadNormalStats = treadManifest.stats?.normal || {};
  const treadMetalnessStats = treadManifest.stats?.metalness || {};
  if ((treadRoughnessStats.mean_luma || 0) < 185 || (treadRoughnessStats.stddev_luma || 0) < 6) fail('tread roughness must be high and visibly varied');
  if ((treadNormalStats.stddev_luma || 0) < 10) fail('tread normal map lacks enough variation');
  if ((treadMetalnessStats.mean_luma || 0) > 35 || (treadMetalnessStats.max_luma || 0) > 90) fail('tread metalness must stay low and edge-only');
  for (const marker of [
    'authored-sherman-connected-loop-tread-segments-v1-matte',
    'connected_tread_loop_segment_geometry',
    'CONNECTED_TREAD_SEGMENT_VERTEX_COUNT = 36',
    'MOVING_TREAD_LINKS_PER_SIDE = 60',
    'OUTER_PROFILE',
    'sampleOuterProfile',
    'CONNECTED_TREAD_LOOP_GEOMETRY_POLICY',
    'writeConnectedTreadSegments',
    'pair-of-parallel-loops',
    'rear edge of segment i uses the same path sample as front edge of segment i+1',
    'computeVertexNormals',
    'TREAD_LINK_MATTE_ROUGHNESS = 0.98',
    'TREAD_LINK_NORMAL_SCALE = 0.82',
    'highlightPolicy',
    'painted steel, not chrome',
    'outward-wound broad tread plate normals',
    'treadNormalWindingPolicy',
    'pushQuad(so0, so1, eo1, eo0)',
    'deleteAuthoredShermanStaticTreadBeltMeshes',
    'createAuthoredShermanWheelRuntime',
    'updateAuthoredShermanWheelRotation',
    'RUNTIME_RUNNING_GEAR_TEXTURE_STYLE_ID',
    'authored-sherman-runtime-running-gear-texture-v4-pbr-edge-grime-metal',
    'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ALBEDO_URL',
    'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_NORMAL_URL',
    'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ROUGHNESS_URL',
    'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_METALNESS_URL',
    'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_TEXTURE_SET_ID',
    'treadShoeMetalnessTexture',
    'metalnessMap: treadShoeMetalnessTexture()',
    'TREAD_LINK_PAINTED_METALNESS_MAX = 0.16',
    'painted-metal tread shoe material',
    'AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL',
    'AUTHORED_SHERMAN_RUNTIME_WHEEL_TEXTURE_SET_ID',
    'runtimeLoadedTexture',
    'wheelFaceTexture', 'wheelNormalTexture', 'wheelRoughnessTexture', 'wheelMetalnessTexture',
    'authored-sherman-runtime-lut-wheel-material',
    'deterministic normal/roughness/metalness maps drive visible rim lip',
    'authored-sherman-runtime-wheel-material-v5-pbr-edge-grime-contact',
    'authored-sherman-runtime-manual-wheel-tune-v1-symmetrized-no-underfloor-dupes',
    'ROADWHEEL_CONTACT_BOTTOM_Y = -0.438',
    'ROADWHEEL_CONTACT_OVERLAP = 0.006',
    'ROADWHEEL_CONTACT_RADIUS_SCALE = 1.10',
    'SPROCKET_IDLER_CONTACT_RADIUS_SCALE = 1.08',
    'FRONT_REAR_ROADWHEEL_EXTRA_CONTACT_DROP = 0.006',
    'applyRoadwheelEndContact',
    'runtimeEndRoadwheelContactPolicy',
    'underlap the moving tread profile and seal the visible slit',
    'INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET = 0.036',
    'FRONT_ROADWHEEL_CURVE_CONTACT_X = -1.39',
    'REAR_ROADWHEEL_CURVE_CONTACT_X = 1.24',
    'runtimeEndRoadwheelCurveContactX',
    'ROADWHEEL_DUPLICATE_X_EPSILON = 0.18',
    'runtimePrunedDuplicateRoadwheels',
    'runtimeOccludedDuplicateRoadwheelPruned',
    'pruneOccludedDuplicateRoadwheels',
    'no top roller placement',
    'runtimeWheelTrackCenterPolicy',
    'RUNTIME_WHEEL_TRACK_CENTER_Z = OUTER_SIDE_Z',
    'RUNTIME_INNER_BACK_SIDEWALL_ID',
    'INNER_BACK_SIDEWALL_Z = 0.835',
    'INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET = 0.036',
    'createAuthoredShermanInnerBackSidewalls',
    'runtime_inner_back_tread_sidewalls',
    'left_runtime_inner_back_tread_sidewall',
    'right_runtime_inner_back_tread_sidewall',
    'not an outer tread slab',
    'runtimeWheelMaterialStyle', 'pbrMapPolicy'
  ]) if (!helper.includes(marker)) fail('moving tread helper missing marker ' + marker);
  for (const forbidden of ['applyTopEndWheelPlacement', 'runtimeTopEndWheelPlacementPolicy', 'TOP_END_WHEEL_PROFILE_CONTACT_LIFT', 'runtime wheel texture', 'CanvasTexture', 'authored-sherman-runtime-contact-wheel-material', 'authored-sherman-runtime-wheel-material-v3-muted-contact-match', "gradient.addColorStop(0, '#7a704b')", 'legacyForbiddenMetalnessMap:']) {
    if (helper.includes(forbidden)) fail('moving tread helper still contains stale/forbidden marker ' + forbidden);
  }
  for (const marker of [
    'createAuthoredShermanInnerBackSidewalls(gltf.scene)',
    'createMovingBeveledTreadLinks(gltf.scene)',
    'updateMovingBeveledTreadLinks(movingTreadLinks, -treadPhase)',
    'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707',
    'shared albedo plus normal/roughness/metalness PBR maps',
    'all wheel centers sit on the tread lane',
    'accepted manual wheel JSON is baked symmetrically',
    'sealed inboard sidewall backing underlaps the tread profile',
    'innerBackSidewalls',
    'authored-sherman-runtime-wheel-material-v5-pbr-edge-grime-contact',
    'deletedStaticTreadBeltMeshes',
    'runtimeWheelMeshes',
    'wheelSpinRuntime'
  ]) if (!hybrid.includes(marker)) fail('hybrid route missing current marker ' + marker);
  for (const marker of [
    'createAuthoredShermanInnerBackSidewalls(model)',
    'createMovingBeveledTreadLinks(model)',
    'updateMovingBeveledTreadLinks(movingTreadLinks, -treadPhase)',
    'tftm-authored-sherman-treads-v1-25-painted-metalness-map-20260707',
    'shared albedo plus normal/roughness/metalness PBR maps',
    'all wheel centers sit on the tread lane',
    'accepted manual wheel JSON is baked symmetrically',
    'sealed inboard sidewall backing underlaps the tread profile',
    'innerBackSidewalls',
    'authored-sherman-runtime-wheel-material-v5-pbr-edge-grime-contact',
    'deletedStaticTreadBeltMeshes',
    'runtimeWheelMeshes',
    'wheelSpinRuntime'
  ]) if (!tread.includes(marker)) fail('treadfirst route missing current marker ' + marker);
  for (const marker of ['offline LUT wheel texture', 'tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored', 'sealed inboard/back sidewall behind the wheel assembly', 'not an outer tread slab', 'not black crushed wheel discs']) if (!release.includes(marker)) fail('cloud release missing current review marker ' + marker);
  for (const marker of ['tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707', 'manual-wheel-json-20260707-symmetrized-delete-underfloor-dupes', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL', 'createAuthoredShermanInnerBackSidewalls', 'applyRoadwheelEndContact', 'RUNTIME_INNER_BACK_SIDEWALL_ID']) if (!hybridGate.includes(marker)) fail('hybrid gate missing current marker ' + marker);
  for (const marker of ['AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL', 'createAuthoredShermanInnerBackSidewalls', 'applyRoadwheelEndContact', 'RUNTIME_INNER_BACK_SIDEWALL_ID']) if (!treadGate.includes(marker)) fail('tread gate missing current marker ' + marker);
  if (pkg.scripts?.['moving-tread-links-smoke'] !== 'node scripts/validate_moving_tread_links.mjs') fail('package missing moving-tread-links-smoke script');
}
if (failures.length) {
  console.error('Moving tread links validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Moving tread links validation passed: downloaded PBR tread shoes remain untouched, wheel color uses an offline LUT texture, end roadwheels get contact adjustment, and inboard/back sidewalls are wired; cloud/Sense visual acceptance is still required.');

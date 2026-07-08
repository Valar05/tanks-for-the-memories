import { existsSync, readFileSync } from 'node:fs';

const expectedBuild = 'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707';
const expectedTreadRevision = 'v1-9-inner-sidewall-socket-fit';
const releaseManifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const files = [
  'public/tftm/models/sherman_hybrid_meshy_hull_lowpoly_v1/model_manifest.json',
  'public/tftm/models/sherman_hybrid_meshy_hull_lowpoly_v1/sherman_hybrid_meshy_hull_lowpoly_v1.glb',
  'public/tftm/models/authored_sherman_treads_v1/model_manifest.json',
  'public/tftm/models/authored_sherman_treads_v1/authored_sherman_treads_v1.glb',
  releaseManifestPath,
  'generated/cloud-visual-truth/tftm-release/dist/hybrid-hull-treads.html',
  'src/hybrid-hull-treads.ts',
  'src/sherman-asset-links.ts',
  'src/authored-sherman-shared-materials.ts',
  'src/authored-sherman-moving-tread-links.ts',
  'public/tftm/textures/authored_sherman_smart_material_v1/manifest.json',
  'public/tftm/textures/sherman_hybrid_meshy_hull_material_v1/manifest.json'
];
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
function multiplyMatrix(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) for (let k = 0; k < 4; k += 1) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return out;
}
function nodeMatrix(node) {
  let matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  if (node.matrix) return node.matrix.slice();
  if (node.translation) { matrix[12] = node.translation[0]; matrix[13] = node.translation[1]; matrix[14] = node.translation[2]; }
  if (node.scale) { matrix[0] *= node.scale[0]; matrix[5] *= node.scale[1]; matrix[10] *= node.scale[2]; }
  return matrix;
}
function transformPoint(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14]
  ];
}
function sceneBounds(json) {
  const out = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  function add(point) { for (let i = 0; i < 3; i += 1) { out.min[i] = Math.min(out.min[i], point[i]); out.max[i] = Math.max(out.max[i], point[i]); } }
  function walk(nodeIndex, parentMatrix) {
    const node = json.nodes[nodeIndex];
    const matrix = multiplyMatrix(parentMatrix, nodeMatrix(node));
    if (node.mesh != null) for (const primitive of json.meshes[node.mesh].primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (const x of [accessor.min[0], accessor.max[0]]) for (const y of [accessor.min[1], accessor.max[1]]) for (const z of [accessor.min[2], accessor.max[2]]) add(transformPoint(matrix, [x, y, z]));
    }
    for (const child of node.children || []) walk(child, matrix);
  }
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const nodeIndex of json.scenes?.[json.scene || 0]?.nodes || []) walk(nodeIndex, identity);
  return { min: out.min, max: out.max, size: out.max.map((value, index) => value - out.min[index]) };
}
for (const file of files) if (!existsSync(file)) fail('missing ' + file);
if (!failures.length) {
  const hull = JSON.parse(readFileSync(files[0], 'utf8'));
  const treads = JSON.parse(readFileSync(files[2], 'utf8'));
  const release = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  const routeSource = readFileSync('src/hybrid-hull-treads.ts', 'utf8');
  const links = readFileSync('src/sherman-asset-links.ts', 'utf8');
  const materialsSource = readFileSync('src/authored-sherman-shared-materials.ts', 'utf8');
  const movingLinksSource = readFileSync('src/authored-sherman-moving-tread-links.ts', 'utf8');
  const smartMaterials = JSON.parse(readFileSync('public/tftm/textures/authored_sherman_smart_material_v1/manifest.json', 'utf8'));
  const hullMaterialManifest = JSON.parse(readFileSync('public/tftm/textures/sherman_hybrid_meshy_hull_material_v1/manifest.json', 'utf8'));
  const hullBounds = sceneBounds(parseGlb(files[1]));
  const treadBounds = sceneBounds(parseGlb(files[3]));
  if (hull.asset_id !== 'sherman_hybrid_meshy_hull_lowpoly_v1') fail('hull asset id mismatch');
  if (hull.source_task_id !== '019f3830-6c43-7ffc-b3a1-8013825d622e') fail('hull task id mismatch');
  if (hull.model_type !== 'lowpoly') fail('hull must be Meshy lowpoly model');
  if (!String(hull.scope || '').includes('excludes treads')) fail('hull scope must exclude treads');
  if (treads.asset_id !== 'authored_sherman_treads_v1') fail('treads asset id mismatch');
  if (treads.silhouette_revision !== expectedTreadRevision) fail('tread revision mismatch: ' + treads.silhouette_revision);
  if (treadBounds.size[1] > 0.89) fail('tread height increased unexpectedly: ' + treadBounds.size[1].toFixed(3));
  if (!links.includes('SHERMAN_HYBRID_MESHY_HULL_LOWPOLY_GLB_URL') || !links.includes('AUTHORED_SHERMAN_TREADS_GLB_URL')) fail('asset links must expose original hull and tread URLs');
  if (!links.includes(expectedTreadRevision)) fail('asset link must cache-bust to current tread revision');
  for (const marker of ['authored_sherman_smart_material_v1_armored_tread_plate_mapping_20260706', 'armored-tread-plates-pbr-edge-grime-v8-20260707']) if (!links.includes(marker)) fail('asset links missing running-gear material cache marker ' + marker);
  for (const marker of ['authored-sherman-material-slot-resolver-v8-armored-tread-plates', 'one shared wheel texture', 'sideRubber = vec3(0.104, 0.098, 0.073)', 'paintedMetal = vec3(0.300, 0.355, 0.210)', 'diffuseColor = vec4(max(trackColor, vec3(0.070, 0.064, 0.046)), diffuseColor.a)', 'armoredPlateColor = mix(outerPad, treadPlate * vec3(0.78, 0.73, 0.54), 0.74)', 'uAuthoredTreadPhaseOffset', 'setAuthoredShermanTreadPhase', 'contactGrime = smoothstep(-0.02, 0.34, vAuthoredRegionPosition.y)', 'sideFace = 1.0 - topBottom', 'material.map = smartTexture(projectedTextureUrls(role).base)', 'vMapUv', 'beltUv = fract(vMapUv + vec2(0.524, 0.881))', 'armoredShoeTravel', 'armoredShoeCells = 12.0', 'armoredShoeSeam', 'armoredPlateUv', 'authored-sherman-armored-tread-plate-material-v5', 'contactGrime = smoothstep(-0.02, 0.28, vAuthoredRegionPosition.y)']) if (!materialsSource.includes(marker)) fail('shared material source missing OpenAI running-gear marker ' + marker);
  if (!String(smartMaterials.source_policy || '').includes('one reusable wheel')) fail('smart material manifest must require one reusable wheel texture');
  if (smartMaterials.base_sources?.wheel_wear !== 'assets/generated/openai/authored_sherman_smart_material_v1/source_plates/wheel_painted_metal_rubber_source.png') fail('hybrid review must use OpenAI wheel source plate');
  if (!routeSource.includes('SHERMAN_HYBRID_MESHY_HULL_LOWPOLY_GLB_URL') || !routeSource.includes('AUTHORED_SHERMAN_TREADS_GLB_URL')) fail('hybrid route must load original Meshy hull and authored tread assets');
  for (const marker of ["applyMeshyShermanSmartMaterial(gltf.scene, 'hullArmor')", 'meshy-hybrid-hull-material-v1-baked-reference-masks', 'sherman_hybrid_meshy_hull_material_v1_baked_reference_masks_20260707', 'materialDebugParam']) if (!routeSource.includes(marker) && !materialsSource.includes(marker)) fail('hybrid hull material marker missing: ' + marker);
  if (hullMaterialManifest.texture_set_id !== 'sherman_hybrid_meshy_hull_material_v1_baked_reference_masks_20260707') fail('hybrid hull material manifest texture_set_id mismatch');
  for (const marker of ['createMovingBeveledTreadLinks(gltf.scene)', 'updateMovingBeveledTreadLinks(movingTreadLinks, -treadPhase)', 'movingLinksRuntime', 'forward-material-phase-moving-beveled-links', 'deleteAuthoredShermanStaticTreadBeltMeshes(gltf.scene)', 'createAuthoredShermanWheelRuntime(gltf.scene)', 'updateAuthoredShermanWheelRotation(treadWheelRuntime, treadPhase)', 'wheelSpinRuntime', 'deletedStaticTreadBeltMeshes', 'runtimeWheelMeshes']) if (!routeSource.includes(marker)) fail('hybrid route missing moving tread link marker: ' + marker);

  for (const staleTop of ['applyTopEndWheelPlacement', 'runtimeTopEndWheelPlacementPolicy', 'TOP_END_WHEEL_PROFILE_CONTACT_LIFT']) {
    if (movingLinksSource.includes(staleTop)) fail('moving tread helper must not contain stale top-wheel placement marker: ' + staleTop);
  }
  for (const marker of ['authored-sherman-connected-loop-tread-segments-v1-matte', 'connected_tread_loop_segment_geometry', 'CONNECTED_TREAD_SEGMENT_VERTEX_COUNT = 36', 'CONNECTED_TREAD_LOOP_GEOMETRY_POLICY', 'pair-of-parallel-loops', 'rear edge of segment i uses the same path sample as front edge of segment i+1', 'MOVING_TREAD_LINKS_PER_SIDE = 60', 'writeConnectedTreadSegments', 'sampleOuterProfile', 'computeVertexNormals', 'TREAD_LINK_MATTE_ROUGHNESS = 0.98', 'TREAD_LINK_NORMAL_SCALE = 0.82', 'highlightPolicy', 'painted steel, not chrome',
    'outward-wound broad tread plate normals',
    'treadNormalWindingPolicy',
    'pushQuad(so0, so1, eo1, eo0)', 'deleteAuthoredShermanStaticTreadBeltMeshes', 'object.parent?.remove(object)', 'createRuntimeWheelFromMeasuredMesh', 'runtimeWheelMeshes', 'RUNTIME_RUNNING_GEAR_TEXTURE_STYLE_ID', 'authored-sherman-runtime-running-gear-texture-v4-pbr-edge-grime-metal', 'treadShoeTexture', 'treadShoeNormalTexture', 'treadShoeRoughnessTexture', 'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ALBEDO_URL', 'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_NORMAL_URL', 'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_ROUGHNESS_URL', 'AUTHORED_SHERMAN_RUNTIME_TREAD_SHOE_METALNESS_URL', 'treadShoeUvPolicy', 'connected loop segments: each segment face keeps full 0-1 tread plate UVs', 'roughnessMap: treadShoeRoughnessTexture()', 'normalMap: treadShoeNormalTexture()', 'metalnessMap: treadShoeMetalnessTexture()', 'metalness: TREAD_LINK_PAINTED_METALNESS_MAX', 'painted-metal tread shoe material', 'wheelFaceTexture', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_ALBEDO_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_NORMAL_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_ROUGHNESS_URL', 'AUTHORED_SHERMAN_RUNTIME_WHEEL_METALNESS_URL', 'authored-sherman-runtime-pbr-tread-shoe-material', 'authored-sherman-runtime-lut-wheel-material', 'createAuthoredShermanInnerBackSidewalls', 'RUNTIME_WHEEL_TRACK_CENTER_Z', 'INNER_BACK_SIDEWALL_PROFILE_SEAL_OUTSET', 'FRONT_ROADWHEEL_CURVE_CONTACT_X = -1.39', 'REAR_ROADWHEEL_CURVE_CONTACT_X = 1.24', 'runtimeEndRoadwheelCurveContactX', 'ROADWHEEL_DUPLICATE_X_EPSILON = 0.18', 'runtimePrunedDuplicateRoadwheels', 'runtimeOccludedDuplicateRoadwheelPruned', 'pruneOccludedDuplicateRoadwheels', 'applyRoadwheelEndContact', 'RUNTIME_INNER_BACK_SIDEWALL_ID', 'createAuthoredShermanWheelRuntime', 'updateAuthoredShermanWheelRotation', 'STATIC_TREAD_BELT_DELETE_RUNTIME_ID', 'RUNTIME_WHEEL_SPIN_RUNTIME_ID', 'authored-sherman-runtime-manual-wheel-tune-v1-symmetrized-no-underfloor-dupes', 'manual-wheel-json-20260707-symmetrized-delete-underfloor-dupes', 'RUNTIME_WHEEL_MATERIAL_STYLE_ID', 'ROADWHEEL_CONTACT_BOTTOM_Y = -0.438', 'ROADWHEEL_CONTACT_OVERLAP = 0.006', 'ROADWHEEL_CONTACT_RADIUS_SCALE = 1.10', 'SPROCKET_IDLER_CONTACT_RADIUS_SCALE = 1.08', 'runtimeRoadwheelContactPolicy', 'runtimeWheelMaterialStyle', 'authored-sherman-runtime-wheel-material-v5-pbr-edge-grime-contact']) if (!movingLinksSource.includes(marker)) fail('moving tread helper missing marker: ' + marker);
  for (const marker of [
    'tuneParam',
    "tuneParam === 'wheels'",
    "tuneParam === '1'",
    'tftm-hybrid-meshy-hull-tuner-v1-20260706',
    'tftm-hybrid-wheel-editor-v2-baked-manual-wheels-20260707',
    'bakedMeshyHullTransform',
    '-0.04500001668930054',
    '0.24646830702598294',
    '0.0034921542366590508',
    '1.674834354281462',
    '2.2281003454923995',
    '2.4233678625822406',
    'user-exported-meshy-hull-transform-no-added-geometry',
    'meshy-hull-chassis',
    'Gesture-only Meshy hull transform tuner',
    'tftm.meshyHullTune.v1',
    'meshyHullTune=',
    'tftm.hybridWheelTune.v1',
    'hybridWheelTune=',
    'initializeWheelTuneParts',
    'runtimeWheelTuneSideSign',
    'sourceWheelNode',
    'symmetryPolicy',
    "editable: isWheelTuneMode ? 'authored_sherman_runtime_wheels'",
    'raycaster.intersectObjects(tuneMeshes',
    'pointermove',
    'data-axis="all"',
    'data-axis="x"',
    'data-axis="y"',
    'data-axis="z"'
  ]) if (!routeSource.includes(marker)) fail('hybrid route missing baked Meshy hull tuner marker: ' + marker);
  for (const shaderForbidden of ['sideMottle = authoredRegionHash', 'sideWear = smoothstep', 'horizontalRub = smoothstep', 'vAuthoredRegionPosition.y * 1.75 + vAuthoredRegionPosition.z * 0.34']) if (materialsSource.includes(shaderForbidden)) fail('shared material source still contains plaid/crosshatch sidewall path: ' + shaderForbidden);
  for (const forbidden of ['authored-chassis-shell', 'Gesture-only chassis transform tuner', 'tftm.chassisTune.v1', 'const hullWidthTarget = 0.96', 'const hullSeatOverlap = 0.18', 'treadSize.z * hullWidthTarget', 'hullSocketWidthTarget / Math.max', 'hullScene.scale.setScalar', 'SHERMAN_HYBRID_HULL_TREADS_FIT_GLB_URL', 'sherman_hybrid_hull_treads_fit_v1', 'addSidewallArmorBridges', 'left_exported_hull_to_tread_sidewall_sponson', 'right_exported_hull_to_tread_sidewall_sponson', 'sidewall_sponson', 'sidewallContactWidth', 'Math.min(lengthScale']) {
    if (routeSource.toLowerCase().includes(forbidden.toLowerCase())) fail('hybrid route must not contain stale/wrong path: ' + forbidden);
  }
  const review = release.hybrid_hull_treads_review;
  if (!review) fail('cloud manifest must include hybrid_hull_treads_review');
  else {
    if (review.route !== 'hybrid-hull-treads.html') fail('hybrid route mismatch');
    if (review.expected_build !== expectedBuild) fail('hybrid build token mismatch');
    if (review.asset_id !== 'sherman_hybrid_meshy_hull_authored_treads_v1') fail('hybrid review must target runtime two-asset hybrid id');
    if (review.tuner_route !== 'hybrid-hull-treads.html?tune=1') fail('hybrid review must expose Meshy hull tuner route');
    if (review.tuner_expected_build !== 'tftm-hybrid-meshy-hull-tuner-v1-20260706') fail('hybrid tuner build token mismatch');
    if (review.wheel_tuner_route !== 'hybrid-hull-treads.html?tune=wheels') fail('hybrid review must expose runtime wheel editor route');
    if (review.wheel_tuner_expected_build !== 'tftm-hybrid-wheel-editor-v2-baked-manual-wheels-20260707') fail('hybrid wheel editor build token mismatch');
    const acceptance = String(review.acceptance || '');
    for (const phrase of ['user-exported Meshy hull transform', 'non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406', 'no authored boxmodel chassis', 'no bridge planes', 'no exported sidewall geometry', 'Meshy low-poly hull-only task 019f3830', expectedTreadRevision, 'local capture', 'one reusable offline LUT wheel texture', 'downloaded tread shoe PBR maps drive the connected loop tread segments', 'downloaded PBR armored tread shoe faces', 'not pure black rubber tread', 'forward material-phase tread scroll', 'color-matched to Meshy hull', 'UV-bound hull material v1 generated from embedded Meshy reference textures', 'materialDebug mask routes', 'face-aware UVs', 'albedo/normal/roughness maps', 'painted-metal metalness map', 'edge-only exposed metal', 'capped at tank-average metalness', 'connected loop tread segments', 'not texture-only tread proof', 'ordered armored track plates', 'not plaid', 'not flannel', 'not a diagonal crosshatch sidewall', 'not a flat grey sidewall slab', 'downloaded armored steel tread shoe albedo and normal detail', 'offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run', 'under-hull contact grime', 'static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments', 'original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration']) if (!acceptance.includes(phrase)) fail('hybrid acceptance must mention ' + phrase);
  }
  const captures = (release.required_cloud_captures || []).join('\n');
  if (!captures.includes('hybrid-hull-treads')) fail('required cloud captures must include hybrid-hull-treads');
  if (!captures.includes('hybrid-hull-treads.html?tune=1')) fail('required cloud captures must include Meshy hull tuner route');
  if (!captures.includes('hybrid-hull-treads.html?tune=wheels')) fail('required cloud captures must include runtime wheel editor route');
  if (!captures.includes('tftm-hybrid-wheel-editor-v2-baked-manual-wheels-20260707')) fail('required cloud captures must include wheel editor build token');
  if (!captures.includes('sideSign/sourceWheelNode metadata')) fail('required cloud captures must mention wheel symmetry metadata');
  if (!captures.includes('Hide behaving as manual delete')) fail('required cloud captures must mention Hide/delete behavior');
  if (!captures.includes('gesture-only Meshy hull transform tuner')) fail('required cloud captures must name Meshy hull tuner');
  if (!captures.includes(expectedBuild)) fail('required cloud captures must include hybrid build token');
  if (!captures.includes('user-exported Meshy hull transform')) fail('required cloud captures must name user-exported transform');
  if (!captures.includes('non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406')) fail('required cloud captures must name tuned non-uniform scale');
  if (!captures.includes('one reusable offline LUT wheel texture')) fail('required cloud captures must name shared muted wheel texture');
  if (!captures.includes('downloaded PBR armored tread shoe faces')) fail('required cloud captures must name downloaded PBR armored tread shoe faces');
  if (!captures.includes('not pure black rubber tread')) fail('required cloud captures must reject pure black rubber tread');
  if (!captures.includes('forward material-phase tread scroll')) fail('required cloud captures must name forward tread scroll');
  if (!captures.includes('color-matched to Meshy hull')) fail('required cloud captures must name hull-matched running gear');
  if (!captures.includes('UV-bound hull material v1 generated from embedded Meshy reference textures')) fail('required cloud captures must name Meshy hull material v1');
  for (const marker of ['materialDebug=edge', 'materialDebug=normal', 'materialDebug=roughness']) if (!captures.includes(marker)) fail('required cloud captures must include hull material debug route ' + marker);
  for (const marker of ['face-aware UVs', 'albedo/normal/roughness maps', 'painted-metal metalness map', 'edge-only exposed metal', 'capped at tank-average metalness']) if (!captures.includes(marker)) fail('required cloud captures must name downloaded PBR tread marker ' + marker);
  if (!captures.includes('connected loop tread segments')) fail('required cloud captures must name connected loop tread segments');
  if (!captures.includes('not texture-only tread proof')) fail('required cloud captures must reject texture-only tread proof');
  if (!captures.includes('wheels and profile opening remain visible with road wheels kissing the lower tread run')) fail('required cloud captures must preserve wheel/profile contact visibility');
  if (!captures.includes('ordered armored track plates')) fail('required cloud captures must name ordered armored track plates');
  if (!captures.includes('not plaid')) fail('required cloud captures must reject plaid tread sidewall');
  if (!captures.includes('not flannel')) fail('required cloud captures must reject flannel tread sidewall');
  if (!captures.includes('not a diagonal crosshatch sidewall')) fail('required cloud captures must reject diagonal crosshatch sidewall');
  if (!captures.includes('not a flat grey sidewall slab')) fail('required cloud captures must reject flat grey tread sidewall slab');
  if (!captures.includes('downloaded armored steel tread shoe albedo and normal detail')) fail('required cloud captures must name darker warm tread plates');
  if (!captures.includes('offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run')) fail('required cloud captures must name subdued wheels');
  if (!captures.includes('under-hull contact grime')) fail('required cloud captures must name under-hull contact grime');
  if (!captures.includes('static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments')) fail('required cloud captures must name static tread belt deletion');
  if (!captures.includes('original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration')) fail('required cloud captures must name baked manual replacement wheel spin');
  if (!captures.includes('no bridge planes')) fail('required cloud captures must reject bridge planes');
  const questions = (release.sense_simulation_questions || []).join('\n');
  if (!questions.includes('hybrid-hull-treads.html')) fail('Sense questions must mention hybrid-hull-treads.html');
  if (!questions.includes('hybrid-hull-treads.html?tune=1')) fail('Sense questions must mention Meshy hull tuner route');
  if (!questions.includes('hybrid-hull-treads.html?tune=wheels')) fail('Sense questions must mention runtime wheel editor route');
  if (!questions.includes('individual wheel rows')) fail('Sense question must ask about individual wheel rows');
  if (!questions.includes('exportable hybridWheelTune URL/JSON')) fail('Sense question must ask about wheel editor export');
  if (!questions.includes('sideSign/sourceWheelNode metadata')) fail('Sense question must ask about wheel symmetry metadata');
  if (!questions.includes('selected meshy-hull-chassis')) fail('Sense question must ask about selected Meshy hull tuner object');
  if (!questions.includes('user-exported Meshy hull transform')) fail('Sense question must ask about the user-exported transform');
  if (!questions.includes('one reusable offline LUT wheel texture')) fail('Sense question must ask about shared muted wheel texture');
  if (!questions.includes('not pure black rubber tread')) fail('Sense question must ask about not pure black rubber tread');
  if (!questions.includes('forward material-phase tread scroll')) fail('Sense question must ask about forward tread scroll');
  if (!questions.includes('color-matched to Meshy hull')) fail('Sense question must ask about hull-matched running gear');
  if (!questions.includes('UV-bound hull material v1 generated from embedded Meshy reference textures')) fail('Sense question must ask about Meshy hull material v1');
  for (const marker of ['materialDebug=edge', 'materialDebug=normal', 'materialDebug=roughness']) if (!questions.includes(marker)) fail('Sense question must ask about hull material debug route ' + marker);
  for (const marker of ['face-aware UVs', 'albedo/normal/roughness maps', 'painted-metal metalness map', 'edge-only exposed metal', 'capped at tank-average metalness']) if (!questions.includes(marker)) fail('Sense question must ask about downloaded PBR tread marker ' + marker);
  if (!questions.includes('connected loop tread segments')) fail('Sense question must ask about connected loop tread segments');
  if (!questions.includes('not texture-only tread proof')) fail('Sense question must reject texture-only tread proof');
  if (!questions.includes('wheels and profile opening remain visible with road wheels kissing the lower tread run')) fail('Sense question must ask about wheel/profile contact visibility');
  if (!questions.includes('ordered armored track plates')) fail('Sense question must ask about ordered armored track plates');
  if (!questions.includes('not plaid')) fail('Sense question must reject plaid tread sidewall');
  if (!questions.includes('not flannel')) fail('Sense question must reject flannel tread sidewall');
  if (!questions.includes('not a diagonal crosshatch sidewall')) fail('Sense question must reject diagonal crosshatch sidewall');
  if (!questions.includes('not a flat grey sidewall slab')) fail('Sense question must reject flat grey tread sidewall slab');
  if (!questions.includes('offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run')) fail('Sense question must ask about subdued wheels');
  if (!questions.includes('under-hull contact grime')) fail('Sense question must ask about contact grime');
  if (!questions.includes('static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments')) fail('Sense question must ask about suppressed sidewall');
  if (!questions.includes('original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration')) fail('Sense question must ask about baked manual replacement wheel spin');
}
if (failures.length) {
  console.error('Hybrid hull+treads cloud gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Hybrid hull+treads cloud gate passed: Meshy hull route bakes the user-exported transform and keeps authored treads fixed; cloud/Sense visual acceptance is still required.');

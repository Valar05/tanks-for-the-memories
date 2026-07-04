import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'index.html',
  'alpha-assay.html',
  'model-assay.html',
  'README.md',
  'ARCHITECTURE.md',
  'package.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'docs/doctrine/vehicle-animation-workflow-contract.md',
  'docs/doctrine/cloud-visual-truth.md',
  'docs/doctrine/scorpion-informed-heavy-tank-systems-contract.md',
  'docs/doctrine/original-heavy-tank-model-request.md',
  'docs/doctrine/minimal-animatable-tank-model-request.md',
  'docs/doctrine/tank-generation-red-build-credit-gate.md',
  'assets/generated/meshy/original_heavy_tank_systems_v1/request_packet.json',
  'assets/generated/meshy/minimal_animatable_tank_v1/request_packet.json',
  'assets/authored/tank_mechanical_seed_v1/manifest.json',
  'assets/generated/meshy/tank_meshy_part_assembly_v1/assembly_manifest.json',
  'assets/generated/meshy/tank_meshy_part_assembly_v1/style_atlas.png',
  'assets/generated/meshy/tank_meshy_part_assembly_v1/part_sheet.png',
  'assets/generated/meshy/tank_meshy_part_assembly_v1/red_build_notes.md',
  'assets/generated/meshy/sherman_part_generation_v1/assembly_manifest.json',
  'assets/generated/meshy/sherman_part_generation_v1/hull_a.png',
  'assets/generated/meshy/sherman_part_generation_v1/hull_b.png',
  'assets/generated/meshy/sherman_part_generation_v1/turret_a.png',
  'assets/generated/meshy/sherman_part_generation_v1/turret_b.png',
  'assets/generated/meshy/sherman_part_generation_v1/mantlet_barrel.png',
  'assets/generated/meshy/sherman_part_generation_v1/gear_wheel.png',
  'assets/generated/meshy/sherman_part_generation_v1/material_atlas.png',
  'assets/generated/meshy/sherman_part_generation_v2/hull_upper_a.png',
  'assets/generated/meshy/sherman_part_generation_v2/hull_upper_b.png',
  'assets/generated/meshy/sherman_part_generation_v2/hull_upper_c.png',
  'assets/generated/meshy/sherman_part_generation_v2/turret_shell_c.png',
  'assets/generated/meshy/sherman_part_generation_v2/material_tiles_b.png',
  'assets/generated/meshy/sherman_part_selected_source_v1/assembly_manifest.json',
  'assets/generated/meshy/sherman_part_selected_source_v1/hull.png',
  'assets/generated/meshy/sherman_part_selected_source_v1/turret.png',
  'assets/generated/meshy/sherman_part_selected_source_v1/mantlet_barrel.png',
  'assets/generated/meshy/sherman_part_selected_source_v1/gear_wheel.png',
  'assets/generated/meshy/sherman_part_selected_source_v1/material_tiles.png',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/assembly_manifest.json',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/hull.glb',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/turret.glb',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/mantlet_barrel.glb',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/gear_mobile.glb',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/hull_glb_contract_report.json',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/turret_glb_contract_report.json',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/mantlet_barrel_glb_contract_report.json',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/gear_mobile_glb_contract_report.json',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/barrel_only.glb',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/barrel_only.fbx',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/barrel_only_glb_contract_report.json',
  'assets/generated/meshy/sherman_part_meshy_kit_v1/barrel_only_meshy_manifest.json',
  'assets/generated/meshy/sherman_mantlet_socket_v1/sherman_mantlet_socket_v1_concept.png',
  'assets/generated/meshy/sherman_mantlet_socket_v1/glb.glb',
  'assets/generated/meshy/sherman_mantlet_socket_v1/fbx.fbx',
  'assets/generated/meshy/sherman_mantlet_socket_v1/manifest.json',
  'assets/generated/meshy/sherman_coaxial_mg_v1/sherman_coaxial_mg_v1_concept.png',
  'assets/generated/meshy/sherman_coaxial_mg_v1/glb.glb',
  'assets/generated/meshy/sherman_coaxial_mg_v1/fbx.fbx',
  'assets/generated/meshy/sherman_coaxial_mg_v1/manifest.json',
  'public/tftm/models/vanilla_sherman_combined/vanilla_sherman.glb',
  'public/tftm/models/vanilla_sherman_combined/model_manifest.json',
  'public/tftm/models/vanilla_sherman_packed/vanilla_sherman_packed.glb',
  'public/tftm/models/vanilla_sherman_packed/model_manifest.json',
  'public/tftm/models/vanilla_sherman_meshy_single_file/vanilla_sherman_meshy_single_file.glb',
  'public/tftm/models/vanilla_sherman_meshy_single_file/model_manifest.json',
  'public/tftm/models/alpha_sherman_combined/alpha_sherman.glb',
  'public/tftm/models/alpha_sherman_combined/model_manifest.json',
  'public/tftm/models/alpha_sherman_meshy_single_file/alpha_sherman_meshy_single_file.glb',
  'public/tftm/models/alpha_sherman_meshy_single_file/model_manifest.json',
  'assets/generated/meshy/alpha_sherman_player_character_from_reference_v1/glb.glb',
  'assets/generated/meshy/alpha_sherman_player_character_from_reference_v1/fbx.fbx',
  'assets/generated/meshy/alpha_sherman_player_character_from_reference_v1/manifest.json',
  'public/tftm/models/alpha_sherman_player_character_from_reference_v1/alpha_sherman_player_character_from_reference_v1.glb',
  'public/tftm/models/alpha_sherman_player_character_from_reference_v1/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_alpha_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_alpha_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_alpha_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/m4a3_75_vvss_sherman_alpha_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v1/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v1/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v1/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_retexture_v2/m4a3_75_vvss_sherman_bravo_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_retexture_v1/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v1/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v1/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v1/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_retexture_v2/m4a3_75_vvss_sherman_tango_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_retexture_v1/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v1/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v1/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v1/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v2/m4a3_75_vvss_sherman_delta_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v1/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_bravo_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_retexture_v2/m4a3_75_vvss_sherman_bravo_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_retexture_v2/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_tango_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_retexture_v2/m4a3_75_vvss_sherman_tango_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_retexture_v2/model_manifest.json',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v2/glb.glb',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v2/fbx.fbx',
  'assets/generated/meshy/m4a3_75_vvss_sherman_delta_retexture_v2/manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v2/m4a3_75_vvss_sherman_delta_retexture_v2.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_retexture_v2/model_manifest.json',
  'assets/generated/derived/commander_alpha_style_texture_v1/manifest.json',
  'assets/generated/derived/commander_alpha_style_texture_v1/m4a3_75_vvss_sherman_bravo_alpha_style_v1.glb',
  'assets/generated/derived/commander_alpha_style_texture_v1/m4a3_75_vvss_sherman_tango_alpha_style_v1.glb',
  'assets/generated/derived/commander_alpha_style_texture_v1/m4a3_75_vvss_sherman_delta_alpha_style_v1.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_alpha_style_v1/m4a3_75_vvss_sherman_bravo_alpha_style_v1.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_bravo_alpha_style_v1/model_manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_alpha_style_v1/m4a3_75_vvss_sherman_tango_alpha_style_v1.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_tango_alpha_style_v1/model_manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_alpha_style_v1/m4a3_75_vvss_sherman_delta_alpha_style_v1.glb',
  'public/tftm/models/m4a3_75_vvss_sherman_delta_alpha_style_v1/model_manifest.json',
  'public/tftm/models/commander_platoon_retexture_v1/model_manifest.json',
  'scripts/pack_vanilla_sherman_for_meshy.mjs',
  'scripts/pack_vanilla_sherman_textures.mjs',
  'scripts/export_vanilla_sherman_glb.mjs',
  'scripts/export_alpha_sherman_variant.mjs',
  'scripts/pack_alpha_sherman_for_meshy.mjs',
  'assets/generated/meshy/sherman_runtime_tread_pbr_v1/sherman_runtime_tread_pbr_v1_concept.png',
  'assets/generated/meshy/sherman_runtime_tread_pbr_v1/manifest.json',
  'assets/generated/openai/sherman_runtime_pbr_v1/manifest.json',
  'assets/generated/openai/sherman_runtime_pbr_v1/tread_albedo.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/tread_roughness.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/tread_metalness.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/tread_normal.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/olive_albedo.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/olive_roughness.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/olive_metalness.png',
  'assets/generated/openai/sherman_runtime_pbr_v1/olive_normal.png',
  'assets/generated/meshy/sherman_barrel_only_v1/assembly_manifest.json',
  'assets/generated/meshy/sherman_barrel_only_v1/source_barrel.png',
  'scripts/inspect_glb_contract.mjs',
  'scripts/build_cloud_visual_release.mjs',
  'public/tftm/models/m4a3_75_vvss_sherman_alpha/model_manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_vanilla_mobile/model_manifest.json',
  'public/tftm/models/m4a3_75_vvss_sherman_vanilla_mobile/m4a3_75_vvss_sherman_vanilla_mobile.glb',
  'src/main.ts',
  'src/model-assay.ts',
  'src/model-assay.css',
  'src/styles.css',
  '.npmrc',
  'public/tftm/evidence/manifest.json',
  'public/tftm/audio/manifest.json',
  'public/tftm/audio/cartesia_voice_index.json',
  'public/tftm/tanks/alpha/texture_manifest.json'
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push('missing ' + file);
  }
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (packageJson.name !== 'tftm') {
  failures.push('package name should be tftm');
}
for (const scriptName of ['build', 'dev', 'smoke', 'bootstrap', 'cloud-visual-release', 'visual-qa:model-assay']) {
  if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
    failures.push('missing npm script ' + scriptName);
  }
}

const deps = [
  'node_modules/typescript/bin/tsc',
  'node_modules/esbuild-wasm/lib/main.js'
];
for (const dep of deps) {
  if (!existsSync(dep)) {
    failures.push('missing repo-local dependency ' + dep);
  }
}

const assaySource = readFileSync('src/model-assay.ts', 'utf8');
const cloudVisualDoctrine = readFileSync('docs/doctrine/cloud-visual-truth.md', 'utf8');
for (const marker of ['sherman_part_meshy_kit_v1', 'sherman_mantlet_socket_v1', 'sherman_coaxial_mg_v1', 'sherman_runtime_pbr_v1', 'RED BUILD / 24-tank animated runtime proof', 'Hero proof plus 24 independently animated tanks', 'drive-stage', 'spawnTarget = 24', 'InstancedMesh', 'InstancedBufferAttribute', 'instanceTreadPhase', 'onBeforeCompile', 'MeshStandardMaterial', 'roughnessMap', 'metalnessMap', 'normalMap', 'makeTreadMaterialSet', 'makeInstancedTreadMaterialSet', 'createTreadGeometry', 'TankAnimationState', 'seedTankState', 'smoothRandomCycle', 'tankStates', 'GLTFLoader', 'WebGLRenderer', 'Hull Upper', 'Turret Shell', 'Mantlet Socket', 'Barrel Only', 'Coaxial MG', 'Mobile Gear / Wheel', 'loadMantletSocketRuntimePart', 'loadCoaxialMgRuntimePart', 'composeGunSocketMatrix', 'composeCoaxialMgMatrix', 'composeBowMgMatrix', 'Meshy mantlet socket owns the gun pivot', 'Meshy coaxial machine gun gives anti-personnel read', 'Meshy bow machine gun stays visible', 'makePbrTexture', 'makeOlivePbrMaterial', 'THREE.DoubleSide', 'tread_albedo.png', 'olive_albedo.png']) {
  if (!assaySource.includes(marker)) {
    failures.push('model assay missing Meshy kit viewer marker ' + marker);
  }
}
for (const visualQaMarker of ['visualQaBuild', 'visualQaConfig', 'postVisualQaBeacon', 'postVisualQaFrame', '/__visual_qa_smoke', '/__visual_qa_capture', 'visualQaExpectedBuild']) {
  if (!assaySource.includes(visualQaMarker)) {
    failures.push('model assay missing visual QA capture marker ' + visualQaMarker);
  }
}

for (const forbidden of ['BoxGeometry', 'CylinderGeometry', 'MeshBasicMaterial', 'createMechanicalSeed', 'hull_lower_slab']) {
  if (assaySource.includes(forbidden)) {
    failures.push('model assay must not render primitive/mesh seed in Meshy kit gate: ' + forbidden);
  }
}
for (const motionMarker of ['hero.position.x', 'wheel.rotation.z', 'map.offset.x', 'heroTurretPivot.rotation.y', 'heroGunPivot.rotation.z', 'setMatrixAt', 'spawnTarget', 'state.driveSpeed', 'state.drivePhase', 'state.wheelRate', 'state.wheelPhase', 'state.treadRate', 'state.treadPhase', 'state.turretRate', 'state.turretPhase', 'state.barrelRate', 'state.barrelPhase', 'updateTreadPhase(leftTreadInstances', 'updateTreadPhase(rightTreadInstances', 'composeGunSocketMatrix(mantletSocketInstances', 'composeBarrelMatrix(barrelInstances', 'composeCoaxialMgMatrix(coaxialMgInstances', 'composeBowMgMatrix(bowMgInstances']) {
  if (!assaySource.includes(motionMarker)) {
    failures.push('animated 24-tank proof missing motion marker ' + motionMarker);
  }
}
for (const budgetMarker of ['24 tanks', '24 independently animated tanks', 'independent animation seeds', 'smoothed random cycles', 'Every turret traverses horizontally', 'Every barrel and coaxial MG elevates visibly', 'draw-call', 'fps local sample', 'shared GLB geometry/textures']) {
  if (!assaySource.includes(budgetMarker)) {
    failures.push('animated 24-tank proof missing budget/readout marker ' + budgetMarker);
  }
}
for (const treadQualityMarker of ['outerBeltSurface', 'innerBeltSurface', 'outerSidewall', 'innerSidewall', 'addUpperSidewall', 'topRun', 'bottomRun', 'frontReturn', 'rearReturn', 'shermanTrapezoidProfile', 'upperRunUnderSponson', 'longGroundedBottomRun', 'angledFrontReturn', 'angledRearReturn', 'animatedMaterialLane', 'staticRaisedLinksRejected']) {
  if (!assaySource.includes(treadQualityMarker)) {
    failures.push('authored tread belt missing quality marker ' + treadQualityMarker);
  }
}
for (const forbiddenTreadProof of ['addRaisedShoeGeometry', 'curved returns, raised shoes', 'raised shoes/grousers across belt width']) {
  if (assaySource.includes(forbiddenTreadProof)) {
    failures.push('authored tread belt must not use static raised-link geometry as animation proof: ' + forbiddenTreadProof);
  }
}
for (const barrelQualityMarker of ['bakeBarrelGeometryWithRearPivot', 'makeBarrelMaterial', 'gunPivotSocket', 'barrelRearOffset', 'coaxialMgOffset', 'bowMgOffset', 'composeBarrelMatrix', 'composeCoaxialMgMatrix', 'olive gunmetal PBR']) {
  if (!assaySource.includes(barrelQualityMarker)) {
    failures.push('barrel proof missing quality marker ' + barrelQualityMarker);
  }
}
if (assaySource.includes('setInstance(barrelInstances, i, x + 0.62')) {
  failures.push('spawned barrels must not use old fixed centered placement');
}
if (/const\s+drive\s*=/.test(assaySource)) {
  failures.push('animated 24-tank proof must not use one global drive phase for spawned tanks');
}
if (assaySource.includes('animatedTextureSets = [treadHeroLeft, treadHeroRight, treadSpawnLeft, treadSpawnRight]')) {
  failures.push('spawn treads must not use a shared material-wide texture offset');
}
if (!assaySource.includes('const animatedTextureSets = [treadHeroLeft, treadHeroRight]')) {
  failures.push('only hero treads may use material-wide map.offset.x animation');
}
for (const doctrineMarker of ['False-Change Penalty', 'materially unchanged', 'code churn to masquerade as visual progress', 'visible change from the prior rejected screenshot']) {
  if (!cloudVisualDoctrine.includes(doctrineMarker)) {
    failures.push('cloud visual doctrine missing false-change penalty marker ' + doctrineMarker);
  }
}
for (const conquerMarker of ['Conquer Failure Loop', 'The mission is not to report failure. The mission is to conquer failure.', 'A captured red build is a work order', 'Use the cloud brain', 'Wake for acceptance only after visual QA and sense simulation pass']) {
  if (!cloudVisualDoctrine.includes(conquerMarker)) {
    failures.push('cloud visual doctrine missing conquer-failure marker ' + conquerMarker);
  }
}
for (const reviewWakeMarker of ['Post-deploy review rule', 'wake the browser to the exact cloud URL with a fresh cache-bust token first', 'inspect the freshest available Android screenshot or visual QA capture before final reporting', 'Do not confuse review wake with acceptance wake', 'Do not skip review wake merely because visual QA is blocked']) {
  if (!cloudVisualDoctrine.includes(reviewWakeMarker)) {
    failures.push('cloud visual doctrine missing post-deploy review wake marker ' + reviewWakeMarker);
  }
}

const kitManifest = JSON.parse(readFileSync('assets/generated/meshy/sherman_part_meshy_kit_v1/assembly_manifest.json', 'utf8'));
if (!String(kitManifest.visual_target || '').includes('non-toy Sherman hard-surface')) {
  failures.push('Meshy kit manifest must preserve non-toy Sherman hard-surface target');
}
if (kitManifest.gate_status !== 'red_turret_socket_incompatible_barrel_only_salvaged') {
  failures.push('Meshy kit manifest must mark turret socket red with barrel-only salvage');
}
if (kitManifest.next_runtime_use_allowed !== false) {
  failures.push('red Meshy kit must block runtime use until human visual acceptance');
}
if (!kitManifest.red_build || !String(kitManifest.red_build.reason || '').includes('user visually reviewed')) {
  failures.push('red Meshy kit must preserve human attention failure reason');
}
if (kitManifest.generation_spend?.meshy_successes !== 6) {
  failures.push('Meshy kit manifest must record 6 successful Meshy generations after barrel-only correction');
}
if (kitManifest.generation_spend?.runtime_default_meshy_parts !== 4) {
  failures.push('Meshy kit manifest must use 4 default runtime Meshy parts');
}
if (!kitManifest.authored_meshes_allowed || kitManifest.authored_meshes_allowed.join(',') !== 'tread_ribbon_only') {
  failures.push('Meshy kit manifest must allow only authored tread ribbon mesh');
}
if (kitManifest.phone_budget?.default_runtime_triangles_before_wheel_duplication > 20000) {
  failures.push('Meshy kit default runtime triangles exceed 20k before wheel duplication');
}
if (kitManifest.phone_budget?.gear_mobile_triangles_each > 1000) {
  failures.push('mobile gear must stay under 1k triangles');
}
if (!kitManifest.parts?.barrel_only || kitManifest.parts.barrel_only.approximate_triangles > 1200) {
  failures.push('barrel-only Meshy candidate must exist and stay near low-poly target');
}
if (kitManifest.parts?.mantlet_barrel?.default_runtime_use !== false) {
  failures.push('overmodeled mantlet/barrel block must remain rejected');
}
for (const partId of ['hull', 'turret', 'barrel_only', 'gear_mobile']) {
  const part = kitManifest.parts?.[partId];
  if (!part) {
    failures.push('Meshy kit manifest missing part ' + partId);
    continue;
  }
  if (!part.glb || !existsSync(part.glb)) failures.push('Meshy kit missing GLB for ' + partId);
  if (!part.fbx || !existsSync(part.fbx)) failures.push('Meshy kit missing FBX for ' + partId);
  if (!part.contract_report || !existsSync(part.contract_report)) failures.push('Meshy kit missing contract report for ' + partId);
  if (partId === 'turret') {
    if (part.default_runtime_use !== false) failures.push('incompatible turret must be rejected: ' + partId);
  } else if (!['blocked_until_human_visual_acceptance', 'candidate_pending_socket_solution_and_human_visual_acceptance'].includes(part.default_runtime_use)) {
    failures.push('Meshy kit part must be blocked/candidate until human visual acceptance: ' + partId);
  }
}
if (kitManifest.parts?.gear_hero_reference?.default_runtime_use !== false) {
  failures.push('hero gear must not be default runtime use');
}
for (const rule of ['hull', 'turret', 'barrel_only', 'mantlet_barrel', 'gear_mobile', 'tread_ribbon']) {
  if (!kitManifest.assembly_plan || !kitManifest.assembly_plan[rule]) {
    failures.push('Meshy kit assembly plan missing ' + rule);
  }
}
if (!kitManifest.animation_proof || kitManifest.animation_proof.status !== 'cloud_viewer_pending_human_visual_acceptance') {
  failures.push('Meshy kit manifest must preserve pending visual acceptance animation proof status');
}
if (kitManifest.animation_proof?.independent_animation_target !== 24) {
  failures.push('Meshy kit animation proof must require 24 independently animated tanks');
}
if (kitManifest.animation_proof?.tread_phase_mode !== 'instanced_shader_attribute') {
  failures.push('Meshy kit animation proof must use instanced shader tread phase');
}
if (kitManifest.animation_proof?.cycle_policy !== 'smoothed_random_per_tank_rates_and_phases_not_synchronized') {
  failures.push('Meshy kit animation proof must require smoothed unsynchronized per-tank cycles');
}
if (!String(kitManifest.animation_proof?.authored_tread_quality_gate || '').includes('rejected_flat_ribbon')) {
  failures.push('Meshy kit animation proof must remember flat tread ribbon rejection');
}
if (!kitManifest.animation_proof?.composition?.includes('authored_closed_3d_tread_belt_volume')) {
  failures.push('Meshy kit animation proof must require authored closed 3D tread belt volume');
}
if (!String(kitManifest.animation_proof?.authored_tread_quality_gate || '').includes('rejected_side_facade_tread')) {
  failures.push('Meshy kit animation proof must remember side-facade tread rejection');
}
if (!String(kitManifest.animation_proof?.authored_tread_quality_gate || '').includes('rejected_generic_rounded_belt')) {
  failures.push('Meshy kit animation proof must remember generic rounded belt rejection');
}
if (!String(kitManifest.animation_proof?.authored_tread_quality_gate || '').includes('rejected_static_raised_link_motion')) {
  failures.push('Meshy kit animation proof must remember static raised link motion rejection');
}
if (!String(kitManifest.animation_proof?.authored_tread_quality_gate || '').includes('sherman_trapezoid_track_volume')) {
  failures.push('Meshy kit animation proof must require Sherman trapezoid track volume');
}
if (kitManifest.animation_proof?.barrel_pivot_mode !== 'rear_socket_pivot_geometry') {
  failures.push('Meshy kit animation proof must require rear socket barrel pivot geometry');
}
if (!String(kitManifest.animation_proof?.barrel_quality_gate || '').includes('rejected_black_center_pivot_barrel')) {
  failures.push('Meshy kit animation proof must remember black centered barrel rejection');
}

const main = readFileSync('src/main.ts', 'utf8');
const alphaAssaySource = readFileSync('src/alpha-assay.ts', 'utf8');
const buildScript = readFileSync('scripts/build.mjs', 'utf8');
for (const buildMarker of ['assetVersion', 'TFTM_ASSET_VERSION', '.css?v=${assetVersion}', '.js?v=${assetVersion}']) {
  if (!buildScript.includes(buildMarker)) {
    failures.push('build script must cache-bust generated JS/CSS asset URLs: ' + buildMarker);
  }
}
for (const alphaAssayMarker of ['tftm-commander-platoon-alpha-style-v1-20260704a', 'm4a3_75_vvss_sherman_alpha_retexture_v2.glb', 'm4a3_75_vvss_sherman_bravo_alpha_style_v1.glb', 'm4a3_75_vvss_sherman_tango_alpha_style_v1.glb', 'm4a3_75_vvss_sherman_delta_alpha_style_v1.glb', 'Sherman Commander Platoon Review', 'same base mesh', 'four different crews']) {
  if (!alphaAssaySource.includes(alphaAssayMarker)) {
    failures.push('Alpha assay missing texture review marker ' + alphaAssayMarker);
  }
}
if (alphaAssaySource.includes('alpha_sherman_meshy_single_file.glb')) {
  failures.push('Alpha assay must not load the rejected decal single-file GLB');
}
if (alphaAssaySource.includes('alpha_sherman_player_character_from_reference_v1.glb')) {
  failures.push('Alpha assay must not load the rejected character-sheet image-to-3D GLB');
}
for (const alphaBuildMarker of ['alpha-assay.ts', 'alpha-assay.html']) {
  if (!buildScript.includes(alphaBuildMarker)) {
    failures.push('build script must include Alpha assay marker ' + alphaBuildMarker);
  }
}
const requiredSnippets = [
  'Inside a tank',
  'Sherman commander station',
  'Hatch and optics',
  'Procedural Three.js tank preview',
  'M4 Sherman silhouette',
  'Radio / intercom',
  'A / B / C / D change the commander’s posture.',
  'Observation -> Interpretation -> Commitment -> Revelation -> Memory',
  'hatch view',
  'optics',
  'buttoned up',
  'No live AI or LLM calls are used at runtime.',
  'GLTFLoader',
  'loadRuntimeTankModel(runtimeModelGroup, runtimePivots, rootGroup)',
  'createDebugKitbashAnimatableTank'
];
for (const snippet of requiredSnippets) {
  if (!main.includes(snippet)) {
    failures.push('missing source marker ' + snippet);
  }
}

if (main.includes('const kitbashRig = createKitbashAnimatableTank(') || main.includes('animateKitbashTankRig(kitbashRig')) {
  failures.push('visible tank must not be active toy kitbash rig');
}
if (main.includes('runtimeModelGroup.visible = false;\n\n  const armor')) {
  failures.push('visible tank must load Meshy body before procedural fallback');
}


const minimalTankRequest = JSON.parse(readFileSync('assets/generated/meshy/minimal_animatable_tank_v1/request_packet.json', 'utf8'));
const requiredParts = ['hull', 'turret', 'mantlet', 'barrel', 'left_tread_system', 'right_tread_system'];
for (const part of requiredParts) {
  if (!minimalTankRequest.required_parts || !minimalTankRequest.required_parts.includes(part)) {
    failures.push('minimal tank request missing required part ' + part);
  }
}
for (const forbidden of ['Halo copy', 'War Thunder copy', 'single fused sculpture', 'cartoon toy style']) {
  if (!minimalTankRequest.negative_prompt || !minimalTankRequest.negative_prompt.includes(forbidden)) {
    failures.push('minimal tank request negative prompt missing ' + forbidden);
  }
}

const vanillaCombinedManifest = JSON.parse(readFileSync('public/tftm/models/vanilla_sherman_combined/model_manifest.json', 'utf8'));
if (vanillaCombinedManifest.asset_id !== 'vanilla_sherman_combined') {
  failures.push('vanilla combined Sherman manifest missing asset_id');
}
if (vanillaCombinedManifest.runtime_contract?.static_combined_asset !== true) {
  failures.push('vanilla combined Sherman must declare static_combined_asset');
}
if (!String(vanillaCombinedManifest.runtime_contract?.animation_source || '').includes('separated source components')) {
  failures.push('vanilla combined Sherman must point animation back to separated components');
}


const vanillaMeshyManifest = JSON.parse(readFileSync('public/tftm/models/vanilla_sherman_meshy_single_file/model_manifest.json', 'utf8'));
if (vanillaMeshyManifest.asset_id !== 'vanilla_sherman_meshy_single_file') {
  failures.push('vanilla Meshy single-file manifest missing asset_id');
}
if (!String(vanillaMeshyManifest.texture_pack_mode || '').includes('data-uri')) {
  failures.push('vanilla Meshy single-file GLB must declare data-uri texture mode');
}
const vanillaMeshyPacker = readFileSync('scripts/pack_vanilla_sherman_for_meshy.mjs', 'utf8');
for (const meshyPackMarker of ['vanilla_sherman_meshy_single_file', 'data:${source.mimeType};base64', 'baseColorFactor', 'meshyCompatibility']) {
  if (!vanillaMeshyPacker.includes(meshyPackMarker)) {
    failures.push('vanilla Meshy packer missing marker ' + meshyPackMarker);
  }
}

const alphaCombinedManifest = JSON.parse(readFileSync('public/tftm/models/alpha_sherman_combined/model_manifest.json', 'utf8'));
if (alphaCombinedManifest.asset_id !== 'alpha_sherman_combined') {
  failures.push('Alpha combined Sherman manifest missing asset_id');
}
if (alphaCombinedManifest.runtime_contract?.vanilla_identity !== false) {
  failures.push('Alpha combined Sherman must not claim vanilla identity');
}
if (alphaCombinedManifest.runtime_contract?.character_identity !== 'alpha_player_sherman') {
  failures.push('Alpha combined Sherman must declare alpha_player_sherman identity');
}
for (const motif of ['crimson recognition stripe', 'white A turret mark', 'chalk crew marks', 'field dirt']) {
  if (!alphaCombinedManifest.runtime_contract?.visual_motifs?.includes(motif)) {
    failures.push('Alpha combined Sherman missing visual motif ' + motif);
  }
}
if (!String(alphaCombinedManifest.runtime_contract?.reference_image || '').includes('/storage/emulated/0/Download/file_00000000544c720ca6775c5f5fb2a678 (1).png')) {
  failures.push('Alpha combined Sherman must preserve newest Downloads reference image path');
}
if (alphaCombinedManifest.approximate_triangles > 20000) {
  failures.push('Alpha combined Sherman exceeds phone gate target triangles');
}

const alphaMeshyManifest = JSON.parse(readFileSync('public/tftm/models/alpha_sherman_meshy_single_file/model_manifest.json', 'utf8'));
if (alphaMeshyManifest.asset_id !== 'alpha_sherman_meshy_single_file') {
  failures.push('Alpha Meshy single-file manifest missing asset_id');
}
if (alphaMeshyManifest.status !== 'red_rejected_visual_build') {
  failures.push('Alpha Meshy single-file GLB must remain marked red_rejected_visual_build');
}
if (!String(alphaMeshyManifest.red_build?.evidence || '').includes('Screenshot_20260704-003950.png')) {
  failures.push('Alpha Meshy single-file red build must cite the failing screenshot evidence');
}
if (!String(alphaMeshyManifest.texture_pack_mode || '').includes('data-uri')) {
  failures.push('Alpha Meshy single-file GLB must declare data-uri texture mode');
}
if (!String(alphaMeshyManifest.note || '').includes('geometry decals preserve identity')) {
  failures.push('Alpha Meshy single-file manifest must preserve geometry-decal fallback note');
}
const alphaReferenceManifest = JSON.parse(readFileSync('public/tftm/models/alpha_sherman_player_character_from_reference_v1/model_manifest.json', 'utf8'));
if (alphaReferenceManifest.asset_id !== 'alpha_sherman_player_character_from_reference_v1') {
  failures.push('Alpha reference Meshy candidate manifest missing asset_id');
}
if (alphaReferenceManifest.status !== 'red_rejected_visual_build') {
  failures.push('Alpha reference Meshy candidate must remain marked red_rejected_visual_build');
}
if (alphaReferenceManifest.runtime_contract?.gameplay_animation_ready !== false) {
  failures.push('Alpha reference Meshy candidate must not claim gameplay animation readiness');
}
if (!String(alphaReferenceManifest.red_build?.evidence || '').includes('Screenshot_20260704-005201.png')) {
  failures.push('Alpha reference Meshy candidate must cite red-highlighter screenshot evidence');
}
if (!String(alphaReferenceManifest.red_build?.observed || '').includes('red highlighter')) {
  failures.push('Alpha reference Meshy candidate must preserve red-highlighter rejection read');
}
if (!String(alphaReferenceManifest.runtime_contract?.acceptance_gate || '').includes('Rejected by human visual review')) {
  failures.push('Alpha reference Meshy candidate must preserve rejection gate');
}
if (alphaReferenceManifest.inspection?.approximate_triangles > 20000) {
  failures.push('Alpha reference Meshy candidate exceeds static visual phone triangle budget');
}
const alphaRetextureManifest = JSON.parse(readFileSync('public/tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/model_manifest.json', 'utf8'));
if (alphaRetextureManifest.asset_id !== 'm4a3_75_vvss_sherman_alpha_retexture_v2') {
  failures.push('Alpha retexture v2 manifest missing asset_id');
}
if (alphaRetextureManifest.endpoint !== '/openapi/v1/retexture') {
  failures.push('Alpha retexture v2 must come from Meshy retexture endpoint');
}
if (alphaRetextureManifest.source_vanilla_task_id !== '019f2a16-c82b-7b52-b541-c707b58c5d00') {
  failures.push('Alpha retexture v2 must target accepted vanilla base task');
}
if (alphaRetextureManifest.status !== 'accepted_enough_for_alpha_current_baseline') {
  failures.push('Alpha retexture v2 must remain the accepted-enough Alpha current baseline');
}
if (alphaRetextureManifest.runtime_contract?.identity_from_texture_only !== true) {
  failures.push('Alpha retexture v2 must preserve identity_from_texture_only');
}
if (alphaRetextureManifest.runtime_contract?.gameplay_animation_ready !== false) {
  failures.push('Alpha retexture v2 must not claim gameplay animation readiness');
}
if (!String(alphaRetextureManifest.runtime_contract?.acceptance_gate || '').includes('four distinct commander personalities')) {
  failures.push('Alpha retexture v2 must preserve commander-platoon acceptance gate');
}
if (alphaRetextureManifest.inspection?.approximate_triangles > 12000) {
  failures.push('Alpha retexture v2 must preserve vanilla-base phone triangle budget');
}
const alphaRetextureSourceManifest = JSON.parse(readFileSync('assets/generated/meshy/m4a3_75_vvss_sherman_alpha_retexture_v2/manifest.json', 'utf8'));
if (alphaRetextureSourceManifest.endpoint !== '/openapi/v1/retexture') {
  failures.push('Alpha retexture source manifest must record /openapi/v1/retexture endpoint');
}
if (alphaRetextureSourceManifest.dry_run_payload?.enable_original_uv !== true) {
  failures.push('Alpha retexture dry-run must preserve original UVs');
}
if (alphaRetextureSourceManifest.dry_run_payload?.input_task_id !== '019f2a16-c82b-7b52-b541-c707b58c5d00') {
  failures.push('Alpha retexture dry-run must target accepted vanilla task id');
}
const platoonManifest = JSON.parse(readFileSync('public/tftm/models/commander_platoon_retexture_v1/model_manifest.json', 'utf8'));
if (platoonManifest.asset_id !== 'm4a3_75_vvss_sherman_commander_platoon_retexture_v1') {
  failures.push('Commander platoon manifest missing asset_id');
}
if (!String(platoonManifest.common_language?.geometry_policy || '').includes('identical accepted vanilla base mesh')) {
  failures.push('Commander platoon manifest must preserve identical base mesh policy');
}
for (const variantId of ['alpha', 'bravo', 'tango', 'delta']) {
  if (!platoonManifest.variants?.some((variant) => variant.id === variantId)) {
    failures.push('Commander platoon manifest missing variant ' + variantId);
  }
}
for (const [variantId, expectedColor, expectedStatus] of [
  ['alpha', 'crimson', 'accepted_enough_for_alpha_current_baseline'],
  ['bravo', 'blue', 'human_cloud_visual_review_pending'],
  ['tango', 'green', 'human_cloud_visual_review_pending'],
  ['delta', 'yellow', 'human_cloud_visual_review_pending']
]) {
  const manifestPath = `public/tftm/models/m4a3_75_vvss_sherman_${variantId === 'alpha' ? 'alpha_retexture_v2' : variantId + '_alpha_style_v1'}/model_manifest.json`;
  const commanderManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (commanderManifest.commander_variant !== variantId) {
    failures.push('Commander manifest variant mismatch for ' + variantId);
  }
  if (commanderManifest.recognition_color !== expectedColor) {
    failures.push('Commander manifest recognition color mismatch for ' + variantId);
  }
  if (commanderManifest.status !== expectedStatus) {
    failures.push('Commander manifest status mismatch for ' + variantId);
  }
  if (commanderManifest.source_vanilla_task_id !== '019f2a16-c82b-7b52-b541-c707b58c5d00') {
    failures.push('Commander manifest must target accepted vanilla base for ' + variantId);
  }
  if (variantId !== 'alpha' && commanderManifest.asset_class !== 'deterministic_texture_derivative_from_alpha') {
    failures.push('Commander manifest must use Alpha-style deterministic derivative route for ' + variantId);
  }
  if (variantId !== 'alpha' && commanderManifest.runtime_contract?.alpha_graphic_language_preserved !== true) {
    failures.push('Commander manifest must preserve Alpha graphic language for ' + variantId);
  }
  if (commanderManifest.inspection?.approximate_triangles !== 10216) {
    failures.push('Commander manifest must preserve base triangle count for ' + variantId);
  }
}
const alphaExporter = readFileSync('scripts/export_alpha_sherman_variant.mjs', 'utf8');
for (const marker of ['alpha_sherman_combined', 'addAlphaCharacterMarks', 'alpha_crimson_glacis_recognition_stripe', "'_A_crossbar'", 'alpha_front_chalk_A17_plate', 'alpha_dust_scratch_']) {
  if (!alphaExporter.includes(marker)) {
    failures.push('Alpha exporter missing character marker ' + marker);
  }
}
const alphaMeshyPacker = readFileSync('scripts/pack_alpha_sherman_for_meshy.mjs', 'utf8');
for (const marker of ['alpha_sherman_meshy_single_file', 'data:${source.mimeType};base64', 'alphaCrimsonRecognitionPaint', 'alphaChalkMarking', 'alphaDustScratches', 'baseColorFactor', 'meshyCompatibility']) {
  if (!alphaMeshyPacker.includes(marker)) {
    failures.push('Alpha Meshy packer missing marker ' + marker);
  }
}

const vanillaPackedManifest = JSON.parse(readFileSync('public/tftm/models/vanilla_sherman_packed/model_manifest.json', 'utf8'));
if (vanillaPackedManifest.asset_id !== 'vanilla_sherman_packed') {
  failures.push('vanilla packed Sherman manifest missing asset_id');
}
if (!Array.isArray(vanillaPackedManifest.embedded_textures) || vanillaPackedManifest.embedded_textures.length < 5) {
  failures.push('vanilla packed Sherman must record embedded textures');
}
const vanillaPackedExporter = readFileSync('scripts/pack_vanilla_sherman_textures.mjs', 'utf8');
for (const packMarker of ['vanilla_sherman_packed', 'textures', 'olive_albedo.png', 'tread_albedo.png', 'bufferView']) {
  if (!vanillaPackedExporter.includes(packMarker)) {
    failures.push('vanilla texture packer missing marker ' + packMarker);
  }
}

const vanillaExporter = readFileSync('scripts/export_vanilla_sherman_glb.mjs', 'utf8');
for (const exporterMarker of ['vanilla_sherman_combined', 'SimplifyModifier', 'left_tread_system_authored_trapezoid_ribbon', 'right_tread_system_authored_trapezoid_ribbon', 'bow_mg_meshy']) {
  if (!vanillaExporter.includes(exporterMarker)) {
    failures.push('vanilla combined exporter missing marker ' + exporterMarker);
  }
}

const inspectorSource = readFileSync('scripts/inspect_glb_contract.mjs', 'utf8');
for (const marker of ['requiredSystems', 'systemBindings', 'missingSystems', 'left_tread_system', 'right_tread_system']) {
  if (!inspectorSource.includes(marker)) {
    failures.push('GLB inspector missing minimal systems marker ' + marker);
  }
}

const manifest = JSON.parse(readFileSync('public/tftm/audio/manifest.json', 'utf8'));
if (manifest.provider !== 'Cartesia' || !Array.isArray(manifest.clips) || manifest.clips.length < 8) {
  failures.push('audio manifest missing Cartesia clips');
}

const tankModelManifest = JSON.parse(readFileSync('public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json', 'utf8'));
if (tankModelManifest.asset_id !== 'm4a3_75_vvss_sherman_alpha_mobile') {
  failures.push('tank model manifest missing expected asset_id');
}
if (!tankModelManifest.runtime || tankModelManifest.runtime.loader !== 'GLTFLoader') {
  failures.push('tank model manifest must declare GLTFLoader runtime');
}
if (!tankModelManifest.runtime || tankModelManifest.runtime.fallback !== 'procedural_threejs_sherman_preview') {
  failures.push('tank model manifest must preserve procedural fallback');
}
if (tankModelManifest.runtime?.active_runtime_role !== 'visible_static_body_reference') {
  failures.push('tank model manifest must mark Meshy GLB as visible static body reference');
}
if (tankModelManifest.runtime?.systems_contract !== 'docs/doctrine/scorpion-informed-heavy-tank-systems-contract.md') {
  failures.push('tank model manifest must link the Scorpion-informed systems contract');
}
const requiredTankPivots = ['hull_root', 'turret_traverse_pivot', 'cannon_elevation_pivot', 'commander_hatch'];
for (const pivot of requiredTankPivots) {
  if (!tankModelManifest.required_pivots || !tankModelManifest.required_pivots.includes(pivot)) {
    failures.push('tank model manifest missing required pivot ' + pivot);
  }
}
const disabledTankPivots = new Set(tankModelManifest.runtime?.disabled_pivots || []);
for (const pivot of ['left_track_motion', 'right_track_motion', 'roadwheel_groups']) {
  if (!disabledTankPivots.has(pivot)) {
    failures.push('fused mobile tank must explicitly disable false tread pivot ' + pivot);
  }
}
if (tankModelManifest.runtime?.tread_motion !== 'static_fused_mesh') {
  failures.push('fused mobile tank must declare static_fused_mesh tread motion');
}
if (tankModelManifest.runtime?.animation_policy !== 'hybrid_static_treads') {
  failures.push('fused mobile tank must use hybrid_static_treads animation policy');
}
if (tankModelManifest.runtime.glb) {
  const glbPath = tankModelManifest.runtime.glb.replace(/^\/+/, 'public/');
  if (!existsSync(glbPath)) {
    failures.push('tank model manifest references missing GLB ' + glbPath);
  }
}
const vanillaTankManifest = JSON.parse(readFileSync('public/tftm/models/m4a3_75_vvss_sherman_vanilla_mobile/model_manifest.json', 'utf8'));
if (vanillaTankManifest.identity_id !== 'vanilla') {
  failures.push('vanilla tank baseline must preserve vanilla identity_id');
}
if (vanillaTankManifest.runtime?.identity_overlay !== 'none') {
  failures.push('vanilla tank baseline must not use identity overlays');
}
if (!vanillaTankManifest.runtime?.glb || !existsSync(vanillaTankManifest.runtime.glb.replace(/^\/+/, 'public/'))) {
  failures.push('vanilla tank baseline must reference an existing GLB');
}

if (failures.length > 0) {
  console.error('Smoke check failed:');
  for (const failure of failures) {
    console.error('- ' + failure);
  }
  process.exit(1);
}

const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

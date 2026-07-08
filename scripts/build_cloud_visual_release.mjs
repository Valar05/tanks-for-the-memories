import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { requirePromptContract } from './prompt_contract_guard.mjs';
requirePromptContract({ action: 'cloud_visual_release' });
const releaseRoot = join('generated', 'cloud-visual-truth', 'tftm-release');
const distRoot = join(releaseRoot, 'dist');
const tankManifestPath = 'public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json';
const shermanSourceManifestPath = 'assets/generated/meshy/sherman_part_meshy_kit_v1/assembly_manifest.json';
const authoredRetopoManifestPath = 'public/tftm/models/authored_sherman_retopo_v1/model_manifest.json';
const authoredBoxmodelManifestPath = 'public/tftm/models/authored_sherman_boxmodel_v1/model_manifest.json';
const authoredBoxmodelVisualVerdictPath = 'docs/visual-verdicts/boxmodel-v1-15-red.json';
const authoredBoxmodelRepairIntakePath = 'docs/visual-repair-intakes/boxmodel-after-v1-15-no-op.json';
const authoredBoxmodelFailurePacketPath = 'docs/visual-failure-packets/boxmodel-v1-15-identical-mesh-read.json';
const authoredTextureableManifestPath = 'public/tftm/models/authored_sherman_textureable_v1/model_manifest.json';
const authoredTreadsManifestPath = 'public/tftm/models/authored_sherman_treads_v1/model_manifest.json';
const authoredChassisManifestPath = 'public/tftm/models/authored_sherman_chassis_v1/model_manifest.json';
const guidedHullManifestPath = 'public/tftm/models/authored_sherman_guided_hull_v1/model_manifest.json';
const authoredTurretManifestPath = 'public/tftm/models/authored_sherman_turret_v1/model_manifest.json';
const authoredSharedTextureManifestPath = 'public/tftm/textures/authored_sherman_smart_material_v1/manifest.json';
const runtimeWheelTextureManifestPath = 'public/tftm/textures/authored_sherman_runtime_wheel_v1/manifest.json';
const authoredSmartSourceManifestPath = 'assets/generated/openai/authored_sherman_smart_material_v1/manifest.json';
const hybridHullManifestPath = 'public/tftm/models/sherman_hybrid_meshy_hull_lowpoly_v1/model_manifest.json';
const meshyTurretKitManifestPath = 'public/tftm/models/meshy_sherman_turret_kit_v2/model_manifest.json';
const lowpolyEnvelopeManifestPath = 'public/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_manifest.json';

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if ((build.status ?? 1) !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync('dist')) {
  console.error('missing dist after build');
  process.exit(1);
}
if (!existsSync(tankManifestPath)) {
  console.error('missing tank model manifest ' + tankManifestPath);
  process.exit(1);
}
if (!existsSync(shermanSourceManifestPath)) {
  console.error('missing Sherman source manifest ' + shermanSourceManifestPath);
  process.exit(1);
}
if (!existsSync(authoredRetopoManifestPath)) {
  console.error('missing authored retopo manifest ' + authoredRetopoManifestPath);
  process.exit(1);
}
if (!existsSync(authoredBoxmodelManifestPath)) {
  console.error('missing authored boxmodel manifest ' + authoredBoxmodelManifestPath);
  process.exit(1);
}
if (!existsSync(authoredBoxmodelVisualVerdictPath)) {
  console.error('missing authored boxmodel visual verdict ' + authoredBoxmodelVisualVerdictPath);
  process.exit(1);
}
if (!existsSync(authoredBoxmodelRepairIntakePath)) {
  console.error('missing authored boxmodel visual repair intake ' + authoredBoxmodelRepairIntakePath);
  process.exit(1);
}
if (!existsSync(authoredBoxmodelFailurePacketPath)) {
  console.error('missing authored boxmodel visible failure packet ' + authoredBoxmodelFailurePacketPath);
  process.exit(1);
}
if (!existsSync(authoredTextureableManifestPath)) {
  console.error('missing authored textureable manifest ' + authoredTextureableManifestPath);
  process.exit(1);
}
if (!existsSync(authoredTreadsManifestPath)) {
  console.error('missing authored tread-only manifest ' + authoredTreadsManifestPath);
  process.exit(1);
}
if (!existsSync(authoredChassisManifestPath)) {
  console.error('missing authored chassis-only manifest ' + authoredChassisManifestPath);
  process.exit(1);
}
if (!existsSync(guidedHullManifestPath)) {
  console.error('missing guided hard-surface hull manifest ' + guidedHullManifestPath);
  process.exit(1);
}
if (!existsSync(authoredTurretManifestPath)) {
  console.error('missing authored turret-only manifest ' + authoredTurretManifestPath);
  process.exit(1);
}
if (!existsSync(authoredSharedTextureManifestPath)) {
  console.error('missing authored smart material manifest ' + authoredSharedTextureManifestPath);
  process.exit(1);
}
if (!existsSync(runtimeWheelTextureManifestPath)) {
  console.error('missing runtime wheel texture manifest ' + runtimeWheelTextureManifestPath);
  process.exit(1);
}
if (!existsSync(authoredSmartSourceManifestPath)) {
  console.error('missing authored smart material source manifest ' + authoredSmartSourceManifestPath);
  process.exit(1);
}
if (!existsSync(hybridHullManifestPath)) {
  console.error('missing hybrid Meshy hull manifest ' + hybridHullManifestPath);
  process.exit(1);
}
if (!existsSync(meshyTurretKitManifestPath)) {
  console.error('missing Meshy turret kit manifest ' + meshyTurretKitManifestPath);
  process.exit(1);
}
if (!existsSync(lowpolyEnvelopeManifestPath)) {
  console.error('missing direct lowpoly envelope manifest ' + lowpolyEnvelopeManifestPath);
  process.exit(1);
}

const tankManifest = JSON.parse(readFileSync(tankManifestPath, 'utf8'));
const shermanSourceManifest = JSON.parse(readFileSync(shermanSourceManifestPath, 'utf8'));
const authoredRetopoManifest = JSON.parse(readFileSync(authoredRetopoManifestPath, 'utf8'));
const authoredBoxmodelManifest = JSON.parse(readFileSync(authoredBoxmodelManifestPath, 'utf8'));
const authoredBoxmodelVisualVerdict = JSON.parse(readFileSync(authoredBoxmodelVisualVerdictPath, 'utf8'));
const authoredBoxmodelRepairIntake = JSON.parse(readFileSync(authoredBoxmodelRepairIntakePath, 'utf8'));
const authoredBoxmodelFailurePacket = JSON.parse(readFileSync(authoredBoxmodelFailurePacketPath, 'utf8'));
const authoredTextureableManifest = JSON.parse(readFileSync(authoredTextureableManifestPath, 'utf8'));
const authoredTreadsManifest = JSON.parse(readFileSync(authoredTreadsManifestPath, 'utf8'));
const authoredChassisManifest = JSON.parse(readFileSync(authoredChassisManifestPath, 'utf8'));
const guidedHullManifest = JSON.parse(readFileSync(guidedHullManifestPath, 'utf8'));
const authoredTurretManifest = JSON.parse(readFileSync(authoredTurretManifestPath, 'utf8'));
const authoredSharedTextureManifest = JSON.parse(readFileSync(authoredSharedTextureManifestPath, 'utf8'));
const runtimeWheelTextureManifest = JSON.parse(readFileSync(runtimeWheelTextureManifestPath, 'utf8'));
const authoredSmartSourceManifest = JSON.parse(readFileSync(authoredSmartSourceManifestPath, 'utf8'));
const hybridHullManifest = JSON.parse(readFileSync(hybridHullManifestPath, 'utf8'));
const meshyTurretKitManifest = JSON.parse(readFileSync(meshyTurretKitManifestPath, 'utf8'));
const lowpolyEnvelopeManifest = JSON.parse(readFileSync(lowpolyEnvelopeManifestPath, 'utf8'));
const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', timeout: 5000 });
const gitStatus = spawnSync('git', ['status', '--short'], { encoding: 'utf8', timeout: 5000 });

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(releaseRoot, { recursive: true });
cpSync('dist', distRoot, { recursive: true });

const releaseManifest = {
  artifact: 'tftm-sherman-24-tank-runtime-proof-red-review',
  visual_evidence_rule: 'local capture forbidden; acceptance requires cloud-hosted build plus Sense Simulation review',
  single_tank_review: {
    route: 'single-tank.html',
    expected_build: 'tftm-single-linked-sherman-textured-v1-20260704',
    asset_policy: 'one linked vanilla Sherman GLB; existing constrained albedo texture set linked at runtime; no copied model or texture variant',
    acceptance: 'Sense Simulation must confirm one Sherman with visible olive armor albedo, visible tread albedo, no fused/parade/assay scene, and right-side camera interaction.'
  },
  authored_boxmodel_review: {
    route: 'boxmodel-tank.html',
    expected_build: 'tftm-authored-sherman-boxmodel-v1-15-20260705',
    tuner_route: 'boxmodel-tank.html?tune=1',
    tuner_expected_build: 'tftm-authored-sherman-boxmodel-tuner-v9-20260704',
    asset_id: authoredBoxmodelManifest.asset_id,
    output_glb: authoredBoxmodelManifest.output_glb,
    source_blend: authoredBoxmodelManifest.source_blend,
    approximate_triangles: authoredBoxmodelManifest.approximate_triangles,
    glb_hard_cap_triangles: authoredBoxmodelManifest.budget?.hard_cap_triangles,
    uv_policy: authoredBoxmodelManifest.uv_policy,
    face_plate_ids: authoredBoxmodelManifest.face_plate_ids,
    asset_policy: 'fully authored Blender box-model chassis with solidified overlapping armor plates, connected multi-material cast turret shell with no pasted turret panels, and coaxial MG; no Meshy chassis or turret imports; box UV PNG plates for DALL-E paintability',
    visual_verdict_path: authoredBoxmodelVisualVerdictPath,
    visual_verdict: authoredBoxmodelVisualVerdict,
    visual_repair_intake_path: authoredBoxmodelRepairIntakePath,
    visual_repair_intake: authoredBoxmodelRepairIntake,
    visible_failure_packet_path: authoredBoxmodelFailurePacketPath,
    visible_failure_packet: authoredBoxmodelFailurePacket,
    acceptance: 'Sense Simulation must confirm Sherman silhouette, connected cast turret massing with no cheek/side/roof pasted panels, smaller integrated track-well slot walls plus joined sponson shells close the front-left, front-right, rear-left, and rear-right lower hull/track cracks as joined metal, pass targeted no-wing slot-wall, no-pasted-turret-panel, and readable wheel/hub/bogie checks, and crack rays from outside those visible gaps hit exterior armor before entering the tank interior, with no pasted panels, blockers, floating boxes, or runtime overlays, armor reads as joined metal rather than separated cardboard planes, barrel and coaxial MG belong to the mantlet, box UV texture plates map sanely, and local capture was not used.',
    tuner_acceptance: 'Sense Simulation must review boxmodel-tank.html?tune=1 as a preserved future-use gesture-only boxmodel part tuner: collapsed parts drawer is usable, four hull-colored flat armor panels are available for front-right, front-left, rear-right, and rear-left track-line holes, one selected panel is highlighted for editing, already enabled panels remain visible, Move/Rotate/Scale are one active mode at a time, Scale exposes explicit All/X/Y/Z axis buttons, drag/pinch/twist gestures visibly change the selected panel, OrbitControls camera orbit/dolly/pan works, the camera orientation widget snaps square front/back/left/right/top views, tank and panels share the same unskewed model frame, no object transform handles appear, and local capture was not used.'
  },


  authored_treads_review: {
    route: 'treadfirst-treads.html',
    expected_build: 'tftm-authored-sherman-treads-v1-25-painted-metalness-map-20260707',
    asset_id: authoredTreadsManifest.asset_id,
    silhouette_revision: authoredTreadsManifest.silhouette_revision,
    output_glb: authoredTreadsManifest.output_glb,
    source_blend: authoredTreadsManifest.source_blend,
    approximate_triangles: authoredTreadsManifest.approximate_triangles,
    component_scope: authoredTreadsManifest.component_scope,
    runtime_wheel_texture_set: runtimeWheelTextureManifest.texture_set_id,
    runtime_wheel_texture_manifest: runtimeWheelTextureManifestPath,
    profile: authoredTreadsManifest.profile,
    asset_policy: 'new isolated Blender tread component plus runtime connected loop tread segments plus runtime side tread wall deletion and centered wheel spin; frozen authored_sherman_treads_v1 v1-9 GLB remains unchanged, failed boxmodel and textureable full-tank exporters are red evidence only, and this pass is not texture-only tread proof',
    acceptance: 'Sense Simulation must confirm full tread assembly only: open perimeter sidewall frame with wheels inside the inner profile opening with road wheels contacting the lower tread run, sprockets, idlers, return rollers, bogie connectors, one silhouette subdivision layer beyond the old 8-point profile, connector mounts subordinate to belt mass, left/right tread nodes share mesh data as mirrored instances, runtime connected loop tread segments travel around the belt with one reusable downloaded PBR tread shoe texture set; adjacent tread segments share path endpoints so disconnected ends are hidden through curves, and broad shoe faces are outward-wound so they do not read as inverted normals, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, not texture-only tread proof, baked wheel rim loops, smooth rounded rubber faces without radial tire facets, preserve OrbitControls camera and orientation widget, no rail/cage/box-pod read, no hull, turret, barrel, coaxial MG, or full tank scene, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and local capture was not used.'
  },

  authored_turret_review: {
    route: 'turretfirst-turret.html',
    expected_build: meshyTurretKitManifest.runtime_build,
    asset_id: meshyTurretKitManifest.asset_id,
    revision: meshyTurretKitManifest.revision,
    component_scope: meshyTurretKitManifest.component_scope,
    runtime_hierarchy: meshyTurretKitManifest.runtime_hierarchy,
    parts: Object.fromEntries(Object.entries(meshyTurretKitManifest.parts).map(([id, part]) => [id, {
      runtime_glb: part.runtime_glb,
      source_slug: part.source_slug,
      task_id: part.task_id,
      triangles: part.triangles,
      vertices: part.vertices
    }])),
    source_policy: meshyTurretKitManifest.source_policy,
    known_risk: meshyTurretKitManifest.known_risk,
    asset_policy: 'separate Meshy-generated Sherman turret kit review: turret shell, mantlet/socket, main barrel, coaxial MG, reusable hatch, and black interior inset are loaded as separate parts; barrel/coax are parented under cannon_elevation_pivot, hatches are reused under commander_hatch_pivot and loader_hatch_pivot; runtime material style meshy-sherman-runtime-smart-material-v3-pbr-edge-grime-metal replaces imported solid-fill plastic materials with PBR edge/grime smart materials preserving Meshy PBR maps, matte olive painted steel, edge wear, grime, dust, darker worn painted gun steel, and matte black interior; no hull, chassis, treads, wheels, suspension, full tank, or fused non-animatable single Meshy model',
    acceptance: meshyTurretKitManifest.acceptance
  },
  authored_chassis_review: {
    route: 'chassisfirst-chassis.html',
    tuner_route: 'chassisfirst-chassis.html?tune=1',
    tuner_expected_build: 'tftm-authored-sherman-chassis-tuner-v1-20260706',
    expected_build: 'tftm-authored-sherman-chassis-v1-4-20260706',
    asset_id: authoredChassisManifest.asset_id,
    silhouette_revision: authoredChassisManifest.silhouette_revision,
    output_glb: authoredChassisManifest.output_glb,
    source_blend: authoredChassisManifest.source_blend,
    approximate_triangles: authoredChassisManifest.approximate_triangles,
    component_scope: authoredChassisManifest.component_scope,
    golden_tread_revision: authoredTreadsManifest.silhouette_revision,
    mesh_contract: authoredChassisManifest.mesh_contract,
    fit_contract: authoredChassisManifest.fit_contract,
    asset_policy: 'recovered original-style ngon/smooth Blender chassis component; existing Meshy and failed scratch/subdiv/hardsurface branches are red evidence only; frozen authored_sherman_treads_v1 v1-9 is loaded beside it only for fit review and is not modified; chassisfirst-chassis.html?tune=1 provides the old static-prop style gesture controls for moving, rotating, scaling, resetting, hiding, and exporting the chassis transform against fixed treads; current pass hides rejected fence-like raised chassis detail in runtime and relies on projected smart-material texture maps for armor paint, edge wear, grime, and dust',
    acceptance: 'Sense Simulation must confirm the recovered original-style chassis shell with projected armor paint, edge wear, grime, dust, and no fence-like hood geometry is one watertight mesh fitted to frozen authored_sherman_treads_v1 v1-9 without swallowing or overflowing the tread side; treads remain visibly outside the chassis side envelope, no pasted panels or blockers, no turret, barrel, coaxial MG, wheels, or tread edits, preserved OrbitControls camera and orientation widget, and local capture was not used.'
  },
  guided_hull_review: {
    route: 'guided-hull.html',
    expected_build: guidedHullManifest.runtime_build,
    asset_id: guidedHullManifest.asset_id,
    silhouette_revision: guidedHullManifest.silhouette_revision,
    output_glb: guidedHullManifest.output_glb,
    source_blend: guidedHullManifest.source_blend,
    source_policy: guidedHullManifest.source_policy,
    geometry_budget: guidedHullManifest.geometry_budget,
    source_face_policy: guidedHullManifest.source_face_policy,
    face_plate_ids: guidedHullManifest.face_plate_ids,
    asset_policy: 'Hull-only guided hard-surface reconstruction: Meshy lowpoly hull is visible reference/ghost only, authored_sherman_treads_v1 is fixed fit reference, and exported hull geometry is simple authored armor planes with split front/rear cap facets. No Meshy topology, shrinkwrap, decimation, arbitrary wrapping, treads, wheels, turret, mantlet, barrel, coax, or hatch articulation in this asset.',
    acceptance: 'Sense Simulation must confirm guided-hull.html shows the authored guided hull as clean simple hard-surface armor planes that broadly match the transparent Meshy hull reference silhouette while improving readability: fixed authored_sherman_treads_v1 remain visible and separate, hull does not swallow the treads, front/rear caps do not read as giant ngons, the hull is not a decimated or shrinkwrapped Meshy blob, the Meshy ghost remains only a transparent reference, OrbitControls and orientation widget are preserved, and local capture was not used.'
  },

  authored_parade_review: {
    route: 'authored-parade.html',
    expected_build: 'tftm-authored-sherman-parade-v1-20260706',
    texture_set_id: authoredSharedTextureManifest.texture_set_id,
    texture_manifest: authoredSharedTextureManifestPath,
    source_material_manifest: authoredSmartSourceManifestPath,
    source_material_status: authoredSmartSourceManifest.source_status,
    source_components: {
      treads: authoredTreadsManifest.silhouette_revision,
      chassis: authoredChassisManifest.silhouette_revision,
      turret: authoredTurretManifest.silhouette_revision
    },
    asset_policy: '24-tank authored parade uses component GLB primitives as dynamic BufferGeometry draw groups with projected authored_sherman_smart_material_v1 texture plates with armor_base, edge_wear, cavity_grime, dust_mud, tread_wear, wheel_wear, and gun_finish maps; no per-tank texture copies, projected paint, metal wear, grime, dust, tread, wheel, and gun finish read as texture detail while rejected fence-like hood geometry is hidden, no 24 cloned GLB object trees, no boxmodel fallback, and no Meshy source topology',
    acceptance: 'Sense Simulation must confirm authored-parade.html shows 24 independently animated authored Sherman tanks using projected authored_sherman_smart_material_v1 texture plates with armor_base, edge_wear, cavity_grime, dust_mud, tread_wear, wheel_wear, and gun_finish maps with visible track_outer, track_inner, wheel_metal, wheel_rubber, connector_mount, armor, hatch, shadow, dark gun, armor_plate_lip, bolt_head_dark, weld_shadow, and bare_metal_edge separation: no per-tank texture copies, projected paint, metal wear, grime, dust, tread, wheel, and gun finish read as texture detail while rejected fence-like hood geometry is hidden, no 24 cloned GLB object trees, per-instance color variation, independent tread phase, drive motion, turret yaw, and barrel pitch remain visible across separate tanks; frozen treads, recovered chassis, and v1.13 turret remain the source components; local capture was not used.'
  },

  hybrid_hull_treads_review: {
    route: 'hybrid-hull-treads.html',
    tuner_route: 'hybrid-hull-treads.html?tune=1',
    tuner_expected_build: 'tftm-hybrid-meshy-hull-tuner-v1-20260706',
    wheel_tuner_route: 'hybrid-hull-treads.html?tune=wheels',
    wheel_tuner_expected_build: 'tftm-hybrid-wheel-editor-v2-baked-manual-wheels-20260707',
    expected_build: 'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707',
    asset_id: 'sherman_hybrid_meshy_hull_authored_treads_v1',
    meshy_hull: {
      asset_id: hybridHullManifest.asset_id,
      source_task_id: hybridHullManifest.source_task_id,
      output_glb: hybridHullManifest.output_glb,
      target_polycount: hybridHullManifest.target_polycount,
      observed_mesh_stats: hybridHullManifest.observed_mesh_stats,
      scope: hybridHullManifest.scope
    },
    authored_treads: {
      asset_id: authoredTreadsManifest.asset_id,
      silhouette_revision: authoredTreadsManifest.silhouette_revision,
      output_glb: authoredTreadsManifest.output_glb
    },
    fit_policy: {
      hull_transform: 'user-exported Meshy hull transform: position [-0.04500001668930054, 0.24646830702598294, 0.0034921542366590508], rotationDeg [0, 0, 0], non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406',
      forbidden: ['bridge planes', 'exported sidewall geometry', 'sponson slabs', 'runtime filler rails', 'sherman_hybrid_hull_treads_fit_v1']
    },
    asset_policy: 'hybrid experiment: runtime review loads original Meshy hull-only GLB and authored_sherman_treads_v1 only; Meshy hull body itself uses the user-exported Meshy hull transform with non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406; hybrid-hull-treads.html?tune=1 provides the old static-prop style gesture controls for moving, rotating, scaling, resetting, hiding, and exporting the Meshy hull transform against fixed authored treads; hybrid-hull-treads.html?tune=wheels exposes the runtime wheel editor so individual wheel-like replacement meshes can be selected, moved, hidden/deleted, exported as JSON, and later mirrored by sideSign/sourceWheelNode; no authored boxmodel chassis, no bridge planes, no exported sidewall geometry, no Meshy treads, no retexture path, no turret in this review; authored running gear uses OpenAI tread_wear and wheel_wear source plates with one reusable OpenAI wheel texture shared across wheels, sprockets, idlers, rollers, bogies, and connector mounts; runtime connected loop tread segments travel around the belt with one reusable downloaded PBR tread shoe texture set; adjacent tread segments share path endpoints so disconnected ends are hidden through curves, and broad shoe faces are outward-wound so they do not read as inverted normals over the frozen authored tread GLB; static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments and the wheel/sprocket/idler/return-roller nodes spin with tread phase; the material remains a dark underlay, but the tread proof is not texture-only tread proof: connected loop tread segments, downloaded armored steel tread shoe albedo and normal detail, not plaid, not flannel, not a diagonal crosshatch sidewall, wheels and profile opening remain visible with road wheels kissing the lower tread run, Meshy hull uses UV-bound hull material v1 generated from embedded Meshy reference textures and removing unwanted diffuse markings, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run, and under-hull contact grime instead of a flat grey sidewall slab or grey/green placeholder color',
    acceptance: 'Sense Simulation must confirm hybrid-hull-treads.html shows Meshy low-poly hull-only task 019f3830 paired with authored_sherman_treads_v1 v1-9-inner-sidewall-socket-fit using the user-exported Meshy hull transform: position [-0.04500001668930054, 0.24646830702598294, 0.0034921542366590508], rotationDeg [0, 0, 0], non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406, no authored boxmodel chassis; Meshy hull uses UV-bound hull material v1 generated from embedded Meshy reference textures and removing unwanted diffuse markings; treads remain visible enough to read as running gear; materialDebug mask routes are available for edge/normal/roughness inspection; no bridge planes, no exported sidewall geometry, no pale rails/slabs/fake sponsons, no Meshy-generated treads/wheels/suspension, no turret/cannon, downloaded tread shoe PBR maps drive the connected loop tread segments while OpenAI wheel_wear keeps the wheels/tires readable; painted-metal tread material uses a mostly black metalness map capped at 0.16, stronger normal response, high roughness, and outward-wound broad faces to prevent chrome shine, white reflection planes, or inside-out belt lighting, downloaded PBR armored tread shoe faces are visible, and downloaded armored steel tread shoe albedo and normal detail reads on the shoes, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, and original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, ordered armored track plates, downloaded PBR armored tread shoe albedo/normal/roughness/metalness detail, not texture-only tread proof, not pure black rubber tread, not plaid, not flannel, not a diagonal crosshatch sidewall, not a flat grey sidewall slab, hybrid route uses forward material-phase tread scroll, runtime downloaded PBR tread-shoe pass uses face-aware UVs, accepted albedo/normal/roughness maps plus a mostly black painted-metal metalness map with edge-only exposed metal capped at tank-average metalness 0.16, high roughness, stronger normal response, and no emissive so the tread shoes are not shinier than the hull while running gear remains color-matched to Meshy hull with offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run and under-hull contact grime, one reusable offline LUT wheel texture is shared across all wheel-like parts, OrbitControls and orientation widget are preserved, and local capture was not used.'
  },
  lowpoly_assembled_review: {
    route: 'assembled-tank.html',
    tuner_route: 'assembled-tank.html?tune=envelopes',
    expected_build: 'tftm-meshy-direct-lowpoly-pbr-envelope-editor-v1-20260708',
    asset_id: lowpolyEnvelopeManifest.asset_id,
    revision: lowpolyEnvelopeManifest.revision,
    source_policy: lowpolyEnvelopeManifest.source_policy,
    parts: {
      hull: lowpolyEnvelopeManifest.parts.lowpoly_hull_envelope,
      turret: lowpolyEnvelopeManifest.parts.lowpoly_turret_envelope,
      treads: lowpolyEnvelopeManifest.parts.lowpoly_treads_envelope
    },
    asset_policy: 'Direct Meshy image-to-3D lowpoly envelope package generated from concept images with model_type=lowpoly, PBR and HD texture enabled. No high-to-low pipeline, no local decimation, no component chaff filtering, and no material stripping. Runtime loads the Meshy hull/turret/tread envelope GLBs with embedded PBR maps and preserves source UV/material payloads; authored_sherman_treads_v1 remains a visible animation reference until the lowpoly tread envelope is visually accepted.',
    acceptance: 'Sense Simulation must confirm assembled-tank.html shows direct Meshy lowpoly PBR envelopes using build token tftm-meshy-direct-lowpoly-pbr-envelope-editor-v1-20260708: lowpoly_hull_envelope, lowpoly_turret_envelope, and lowpoly_treads_envelope are available in the envelope editor; the default view shows the lowpoly hull and turret with authored_sherman_treads_v1 as the fixed running-gear reference; source Meshy UVs/materials/PBR textures are preserved; no high-to-low decimation artifacts, no stripped solid-fill plastic materials, no component-chaff filtered kit masquerading as the accepted result, no old authored chassis/turret assembly claim, preserved OrbitControls camera/orientation widget, and local capture was not used.'
  },
  authored_textureable_review: {
    route: 'textureable-tank.html',
    expected_build: 'tftm-authored-sherman-textureable-v1-1-20260705',
    asset_id: authoredTextureableManifest.asset_id,
    silhouette_revision: authoredTextureableManifest.silhouette_revision,
    output_glb: authoredTextureableManifest.output_glb,
    source_blend: authoredTextureableManifest.source_blend,
    approximate_triangles: authoredTextureableManifest.approximate_triangles,
    uv_policy: authoredTextureableManifest.uv_policy,
    face_plate_ids: authoredTextureableManifest.face_plate_ids,
    decal_anchors: authoredTextureableManifest.decal_anchors || {},
    asset_policy: 'new authored textureable base; failed boxmodel remains red evidence only; no Meshy chassis or turret imports; split UV plates and decal anchors prepare commander identity without geometry variants',
    acceptance: 'Sense Simulation must confirm a usable textureable Sherman base: closed 3D track pods with top, bottom, front, rear, inner, and outer band thickness; wheels contained inside the track/skirt volume rather than pasted outside; upper skirt does not cut through wheel tops; side profile is not the failed distorted slab; turret ring gap hidden by turret lower overlap; integrated hatches sit in the turret roof rather than floating coins; barrel and coaxial MG belong to the mantlet/elevation pivot; split UV plates map sanely for paint/decal work; local capture was not used.'
  },
  authored_retopo_review: {
    route: 'retopo-tank.html',
    expected_build: 'tftm-authored-sherman-retopo-v1-1-20260704',
    asset_id: authoredRetopoManifest.asset_id,
    output_glb: authoredRetopoManifest.output_glb,
    approximate_triangles: authoredRetopoManifest.approximate_triangles,
    uv_policy: authoredRetopoManifest.uv_policy,
    face_plate_ids: authoredRetopoManifest.face_plate_ids,
    asset_policy: 'fully authored hard-surface chassis and turret; no Meshy chassis or turret imports; split face PNG plates for DALL-E paintability',
    acceptance: 'Sense Simulation must confirm close-up chassis and turret read as usable hard-surface armor, barrel belongs to mantlet, split face texture plates map sanely, and local capture was not used.'
  },
  generated_at: new Date().toISOString(),
  source_commit: gitHead.status === 0 ? gitHead.stdout.trim() : null,
  dirty_status: gitStatus.status === 0 ? gitStatus.stdout.trim().split('\n').filter(Boolean) : [],
  dist: distRoot,
  tank_asset: tankManifest.asset_id,
  tank_runtime: tankManifest.runtime,
  tank_budget: tankManifest.budget,
  sherman_meshy_kit: {
    asset_id: shermanSourceManifest.asset_id,
    visual_target: shermanSourceManifest.visual_target,
    gate_status: shermanSourceManifest.gate_status,
    generation_spend: shermanSourceManifest.generation_spend,
    authored_meshes_allowed: shermanSourceManifest.authored_meshes_allowed,
    phone_budget: shermanSourceManifest.phone_budget,
    red_build: shermanSourceManifest.red_build,
    next_runtime_use_allowed: shermanSourceManifest.next_runtime_use_allowed,
    animation_proof: shermanSourceManifest.animation_proof,
    parts: Object.fromEntries(Object.entries(shermanSourceManifest.parts).map(([id, part]) => [id, {
      glb: part.glb,
      approximate_triangles: part.approximate_triangles,
      default_runtime_use: part.default_runtime_use,
      role: part.role
    }]))
  },
  required_cloud_captures: [
    'treadfirst-treads phone portrait showing authored_sherman_treads_v1 and build token tftm-authored-sherman-treads-v1-25-painted-metalness-map-20260707, with runtime connected loop tread segments traveling around the belt over frozen authored_sherman_treads_v1 v1-9, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, wheels/sprockets/idlers/rollers/bogie connectors occupying the inner profile opening with baked wheel rim loops and smooth tire bands and linked mirrored tread nodes sharing mesh data, readable lip corners, no black sidewall crush, not texture-only tread proof, and no hull/turret/full tank geometry',
    'treadfirst-treads phone landscape showing full tread assembly showing an open perimeter sidewall frame, wheels/sprockets/idlers/return rollers/bogie arms occupying the inner profile opening, left/right tread nodes share mesh data as mirrored instances, runtime connected loop tread segments travel around the belt with one reusable downloaded PBR tread shoe texture set; adjacent tread segments share path endpoints so disconnected ends are hidden through curves, and broad shoe faces are outward-wound so they do not read as inverted normals, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, baked wheel rim loops, smooth tire bands, connector mounts subordinate, one silhouette subdivision layer beyond the old 8-point tread, preserved OrbitControls camera/orientation widget, no rail/cage/box-pod read, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'turretfirst-turret phone portrait showing Meshy turret kit build token tftm-meshy-sherman-turret-kit-v2-pbr-edge-grime-metal-20260707, separate Meshy turret shell, mantlet/socket, main barrel, coaxial MG, reusable hatch, and black interior inset assembled as one Sherman turret kit; barrel and coax parented to cannon_elevation_pivot; commander_hatch_pivot and loader_hatch_pivot articulate two hatch instances without clipping and reveal the black interior inset; turret_traverse_pivot moves the kit; no hull/chassis/treads/wheels/suspension/full tank; no fused non-animatable single Meshy model; runtime material style meshy-sherman-runtime-smart-material-v3-pbr-edge-grime-metal uses PBR edge/grime smart materials preserving Meshy PBR maps, matte olive painted steel, edge wear, grime, dust, darker worn painted gun steel, and matte black interior; no local capture',
    'turretfirst-turret phone landscape showing Meshy kit, not authored turret: six separate Meshy part files load from meshy_sherman_turret_kit_v2 as turret_shell.glb, mantlet_socket.glb, barrel.glb, coax.glb, hatch.glb, and black_interior.glb; the barrel is separate/in-place/animatable under cannon_elevation_pivot; coax moves with the gun; two reused hatch instances open on commander_hatch_pivot and loader_hatch_pivot over a black interior inset; no hull/chassis/treads/wheels/suspension/full tank and no fused single Meshy turret model; preserved OrbitControls camera/orientation widget; no local capture',
    'chassisfirst-chassis phone portrait showing authored_sherman_chassis_v1 build token tftm-authored-sherman-chassis-v1-4-20260706 fitted inside frozen authored_sherman_treads_v1 v1-9-inner-sidewall-socket-fit, recovered original-style chassis shell with projected armor paint, edge wear, grime, dust, and no fence-like hood geometry, no turret/barrel/wheel/tread edits, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'chassisfirst-chassis phone landscape showing one recovered original-style chassis shell that does not overflow or swallow the treads; golden tread side remains visible outside the chassis side envelope, golden treads unchanged, preserved OrbitControls camera/orientation widget, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'chassisfirst-chassis.html?tune=1 phone portrait showing the gesture-only chassis transform tuner with authored-chassis-shell selected, Move/Rotate/Scale controls, explicit All/X/Y/Z scale axis buttons, undo/redo/reset/hide, exportable URL/JSON state, fixed authored_sherman_treads_v1 reference, camera orientation widget, no 3D transform gizmo, and build token tftm-authored-sherman-chassis-tuner-v1-20260706',
    'chassisfirst-chassis.html?tune=1 cloud interaction evidence showing the chassis itself can be dragged, pinched to scale, and twisted to rotate while the golden treads remain fixed reference geometry and OrbitControls camera orbit/dolly/pan remains usable; no local capture',
    'hybrid-hull-treads phone portrait showing Meshy low-poly hull-only task 019f3830 plus authored_sherman_treads_v1 v1-9-inner-sidewall-socket-fit with build token tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707, hull body itself uses the user-exported Meshy hull transform with non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406, treads do not get higher, no bridge planes, no exported sidewall geometry, no pale rails/slabs/fake sponsons, no Meshy treads/wheels/suspension, no turret/cannon, one reusable offline LUT wheel texture shared across all wheel-like parts, runtime connected loop tread segments visible and traveling around the belt, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, downloaded tread shoe PBR maps drive the connected segments, downloaded PBR armored tread shoe faces visible, not texture-only tread proof, not pure black rubber tread, forward material-phase tread scroll visible over time, runtime downloaded PBR tread-shoe pass uses face-aware UVs, accepted albedo/normal/roughness maps plus a mostly black painted-metal metalness map with edge-only exposed metal capped at tank-average metalness 0.16, high roughness, stronger normal response, and no emissive so the tread shoes are not shinier than the hull while running gear remains color-matched to Meshy hull, downloaded armored steel tread shoe albedo and normal detail as ordered armored track plates, not plaid, not flannel, not a diagonal crosshatch sidewall, not a flat grey sidewall slab, and wheels and profile opening remain visible with road wheels kissing the lower tread run, Meshy hull uses UV-bound hull material v1 generated from embedded Meshy reference textures and removing unwanted diffuse markings, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run, under-hull contact grime, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'hybrid-hull-treads.html?materialDebug=edge, hybrid-hull-treads.html?materialDebug=normal, and hybrid-hull-treads.html?materialDebug=roughness cloud captures proving the hull material masks render on the actual Meshy hull mesh; hybrid-hull-treads phone landscape/oblique review showing user-exported Meshy hull transform: the scaled Meshy hull body uses non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406, with authored treads still visible as running gear, Meshy hull uses UV-bound hull material v1 generated from embedded Meshy reference textures and removing unwanted diffuse markings, tread top height unchanged, and no bridge planes, exported sidewall geometry, pale rails, slabs, or fake sponsons; OpenAI wheel_wear keeps wheels/tires readable while runtime connected loop tread segments use downloaded PBR armored tread shoe albedo/normal/roughness/metalness detail, not texture-only tread proof, not pure black rubber tread, not plaid, not flannel, not a diagonal crosshatch sidewall, not a flat grey sidewall slab; forward material-phase tread scroll reads over time and wheels and profile opening remain visible with road wheels kissing the lower tread run; runtime downloaded PBR tread-shoe pass uses face-aware UVs, accepted albedo/normal/roughness maps plus a mostly black painted-metal metalness map with edge-only exposed metal capped at tank-average metalness 0.16, high roughness, stronger normal response, and no emissive so the tread shoes are not shinier than the hull while running gear remains color-matched to Meshy hull with offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run and under-hull contact grime; one reusable OpenAI wheel texture is shared across wheels/sprockets/idlers/rollers/bogies/connectors; preserved OrbitControls/orientation widget; offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'hybrid-hull-treads.html?tune=1 phone portrait showing the gesture-only Meshy hull transform tuner with selected meshy-hull-chassis, Move/Rotate/Scale controls, explicit All/X/Y/Z scale axis buttons, undo/redo/reset/hide, exportable URL/JSON state, fixed authored_sherman_treads_v1 reference, camera orientation widget, no authored boxmodel chassis, no 3D transform gizmo, and build token tftm-hybrid-meshy-hull-tuner-v1-20260706',
    'hybrid-hull-treads.html?tune=1 cloud interaction evidence showing the Meshy hull itself can be dragged, pinched to scale, and twisted to rotate while the authored treads remain fixed reference geometry and OrbitControls camera orbit/dolly/pan remains usable; no local capture',
    'hybrid-hull-treads.html?tune=wheels phone portrait showing the gesture-only runtime wheel editor with Wheel editor selected, per-wheel rows, Move/Rotate/Scale controls, explicit All/X/Y/Z scale axis buttons, undo/redo/reset/hide, Hide behaving as manual delete without resurrecting hidden wheels on row selection, exportable URL/JSON state under hybridWheelTune, fixed Meshy hull plus authored tread reference, sideSign/sourceWheelNode metadata for later symmetry, camera orientation widget, no 3D transform gizmo, and build token tftm-hybrid-wheel-editor-v2-baked-manual-wheels-20260707',
    'hybrid-hull-treads.html?tune=wheels cloud interaction evidence showing an individual runtime wheel can be selected and dragged while the treads and Meshy hull remain fixed reference geometry, hidden/deleted wheel rows stay hidden until Show is pressed, and OrbitControls camera orbit/dolly/pan remains usable; no local capture',
    'guided-hull phone portrait showing authored_sherman_guided_hull_v1 build token tftm-authored-sherman-guided-hull-v1-20260708: clean hull-only hard-surface reconstruction made from simple authored armor planes, transparent Meshy lowpoly hull reference ghost visible, fixed authored_sherman_treads_v1 visible and separate, no Meshy topology, no shrinkwrap, no decimation, no arbitrary mesh wrapping, no turret, no wheels/tread edits, and no local capture',
    'assembled-tank phone portrait showing direct Meshy lowpoly PBR envelope assembly and build token tftm-meshy-direct-lowpoly-pbr-envelope-editor-v1-20260708, with lowpoly_hull_envelope, lowpoly_turret_envelope, and lowpoly_treads_envelope generated directly by Meshy model_type=lowpoly from concept images, source Meshy UVs/materials/PBR textures preserved, authored_sherman_treads_v1 visible as fixed running-gear reference, no high-to-low pipeline, no local decimation, no stripped solid-fill plastic materials, no component-chaff filtered accepted result, and no local capture',
    'assembled-tank phone landscape/oblique review showing the direct Meshy lowpoly envelope editor at assembled-tank.html?tune=envelopes with selectable hull, turret, and treads areas, lowpoly_turret_envelope selected by default, lowpoly_hull_envelope and lowpoly_turret_envelope visible against authored_sherman_treads_v1 reference, lowpoly_treads_envelope available but hidden by defaults until reviewed, direct lowpoly Meshy provenance and embedded PBR textures intact, no decimated high-poly mesh, no old authored chassis/turret assembly claim, preserved OrbitControls camera/orientation widget, and no local capture',
    'authored-parade phone portrait showing authored_sherman_parade_v1 build token tftm-authored-sherman-parade-v1-20260706 with 24 independently animated authored Sherman tanks using projected authored_sherman_smart_material_v1 texture plates with armor_base, edge_wear, cavity_grime, dust_mud, tread_wear, wheel_wear, and gun_finish maps, per-instance color/dirt variation, no per-tank texture copies, projected paint, metal wear, grime, dust, tread, wheel, and gun finish read as texture detail while rejected fence-like hood geometry is hidden, no 24 cloned GLB object trees, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'authored-parade time-separated cloud capture showing separate tanks keep independent drive motion, turret yaw, barrel pitch, and independent tread phase while retaining shared textures and authored component source tokens, with no boxmodel fallback offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'boxmodel-tank phone portrait showing authored_sherman_boxmodel_v1 and build token tftm-authored-sherman-boxmodel-v1-15-20260705',
    'boxmodel-tank phone landscape showing Sherman silhouette, joined armor mass, non-cube turret, smaller integrated track-well slot-wall coverage at front-left, front-right, rear-left, and rear-right lower hull/track cracks, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'boxmodel-tank close-up review showing smaller integrated track-well slot-wall coverage at front-left, front-right, rear-left, and rear-right as attached armor, no raycast-accessible interior through those cracks, no side-wing silhouette deformation, solidified armor plates, barrel/mantlet/coaxial MG ownership, and box UV plate paintability',
    'boxmodel-tank.html?tune=1 phone portrait showing gesture-only part tuner with collapsed parts drawer, front-right/front-left/rear-right/rear-left hull-colored flat armor panel parts aligned parallel to the tracks, flush to the side plane, and not protruding like blocks, selected panel highlight, camera orientation widget, explicit All/X/Y/Z scale axis buttons, square unskewed tank frame, and build token tftm-authored-sherman-boxmodel-tuner-v9-20260704',
    'boxmodel-tank.html?tune=1 cloud interaction evidence showing one selected flat armor panel visibly move/rotate/scale through drag/pinch/twist while other enabled panels remain placed, OrbitControls camera orbit/dolly/pan preserved from an unskewed model frame, and no object transform handles',
    'textureable-tank phone portrait showing authored_sherman_textureable_v1 and build token tftm-authored-sherman-textureable-v1-1-20260705',
    'textureable-tank phone landscape showing closed 3D track pods, wheels contained inside the track/skirt volume, no skirt-through-wheel collision, side profile not reading as the failed slab, offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'textureable-tank close-up review showing turret ring gap hidden, hatches integrated into turret roof, barrel and coaxial MG owned by mantlet/elevation pivot, and split UV plate paintability',
    'retopo-tank phone portrait showing authored_sherman_retopo_v1 and build token tftm-authored-sherman-retopo-v1-1-20260704',
    'retopo-tank phone landscape showing split face texture plates with sane UV mapping offline LUT wheel texture prevents black crushed wheel discs, tread link phase is reversed while manually baked wheel spin remains correct, wheel Z follows accepted manual mirrored placement, no top rollers are added, duplicate/under-floor workaround wheels are deleted, and accepted sprocket/idler/roadwheel placements are mirrored, sealed inboard/back sidewall behind the wheel assembly fills the hollow between tank side and wheel backs, not an outer tread slab, and no local capture',
    'retopo-tank close-up chassis and turret review showing hard-surface authored form, usable turret ring, and barrel/mantlet ownership',
    'single-tank phone portrait showing one linked textured Sherman and build token tftm-single-linked-sherman-textured-v1-20260704',
    'single-tank phone landscape showing olive armor albedo and tread albedo on the linked Sherman',
    'single-tank cloud interaction evidence showing right-side camera rotation without local capture',
    'model-assay phone portrait showing hero proof plus 24 independently animated tanks',
    'model-assay phone landscape showing canonical body, cannon-chain MG, readable closed 3D tread belt volume, wheel orientation, and non-black barrel material',
    'model-assay time-separated capture showing unsynchronized horizontal turret traverse, vertical barrel elevation, cannon-chain MG, and no fixed bow MG across the 24 tanks',
    'model-assay three-quarter capture showing top/bottom/front/rear tread volume rather than side-facade tread',
    'model-assay desktop medium viewport showing FPS, draw-call estimate, and 24-tank budget readout'
  ],
  false_change_penalty: {
    status: 'active',
    reason: 'Fresh cloud screenshots showed no visible delta after v1-8 front-gap coverage. v1-15 is also red by user report: source and GLB changed, but the visible relationship was no-op churn. Root causes include weak evidence gates that accepted source/token changes and stale diagnostic renders as progress.',
    current_boxmodel_verdict: authoredBoxmodelVisualVerdict.status,
    required_next_evidence: 'Next tank visual pass must show cloud/Sense evidence that v1-15 cast-turret/readable-wheel armor visibly closes the front and rear lower hull/track cracks on all four corners without side-wing deformation and with visible enlarged roadwheel/hub/bogie band.'
  },
  sense_simulation_questions: [
    'Do the scratch chassis UVs read as per-plane/facet mapping rather than the worse single global projection seen on the rejected hardsurface pass?',
    'Does turretfirst-turret.html show Meshy turret kit v2 with separate Meshy turret shell, mantlet/socket, main barrel, coaxial MG, reusable hatch, and black interior inset assembled as one Sherman turret kit, with PBR edge/grime smart materials preserving Meshy PBR maps, matte olive painted steel on shell/mantlet/hatches, darker worn painted gun steel on barrel/coax, barrel/coax under cannon_elevation_pivot, commander_hatch_pivot and loader_hatch_pivot opening two hatch instances without clipping, and no hull/chassis/treads/wheels/suspension/full tank or fused non-animatable single Meshy model?',
    'Does turretfirst-turret.html preserve the Meshy kit hierarchy: turret_traverse_pivot for the turret kit, cannon_elevation_pivot for mantlet/socket plus separate main barrel and coaxial MG, commander_hatch_pivot and loader_hatch_pivot for reused hatch meshes, and a black interior inset visible beneath the articulated hatches?',
    'Does authored_sherman_chassis_v1 show the recovered original-style chassis shell with projected armor paint, edge wear, grime, dust, and no fence-like hood geometry fitted to frozen authored_sherman_treads_v1 v1-9 without overflowing or swallowing the tread side, with the treads still visibly outside the chassis side envelope and no turret, barrel, coaxial MG, wheels, or tread edits?',
    'On chassisfirst-chassis.html?tune=1, does the route provide the old static-prop style gesture controls for the chassis itself: selected authored-chassis-shell, Move/Rotate/Scale, explicit All/X/Y/Z scale axes, undo/redo/reset/hide, exportable URL/JSON state, fixed golden tread reference, preserved OrbitControls camera and orientation widget, and no 3D transform gizmo?',
    'Do hybrid-hull-treads.html?materialDebug=edge, hybrid-hull-treads.html?materialDebug=normal, and hybrid-hull-treads.html?materialDebug=roughness show the generated hull material masks on the actual Meshy hull mesh, not flat swatches? Does hybrid-hull-treads.html show the user-exported Meshy hull transform with UV-bound hull material v1 generated from embedded Meshy reference textures and removing unwanted diffuse markings and non-uniform scale 1.674834354281462 / 2.2281003454923995 / 2.4233678625822406, the treads do not get higher, the hull is not the oversized v1.5 chassis, no bridge planes, no exported sidewall geometry, no pale rails/slabs/fake sponsons, no Meshy-generated treads/wheels/suspension, no turret/cannon, and preserved OrbitControls/orientation widget?',
    'Does hybrid-hull-treads.html use UV-bound hull material v1 generated from embedded Meshy reference textures on the Meshy hull, plus one reusable offline LUT wheel texture for wheels/sprockets/idlers/rollers/bogies/connectors, plus downloaded tread shoe albedo/normal/roughness maps for armored steel tread shoe faces, so the running gear matches the Meshy hull, the tread belt is not pure black rubber tread, connected loop tread segments travel around the belt so the tread is not texture-only tread proof, the side-facing tread reads as ordered armored track plates, not plaid, not flannel, not a diagonal crosshatch sidewall, not a flat grey sidewall slab, and wheels and profile opening remain visible with road wheels kissing the lower tread run, the forward material-phase tread scroll reads over time, the runtime downloaded PBR tread-shoe pass uses face-aware UVs, accepted albedo/normal/roughness maps plus a mostly black painted-metal metalness map with edge-only exposed metal capped at tank-average metalness 0.16, high roughness, stronger normal response, and no emissive so the tread shoes are not shinier than the hull while running gear remains color-matched to Meshy hull, the tread shoes use downloaded PBR albedo/normal/roughness plus painted-metal metalness with edge-only exposed metal capped at tank-average metalness, the wheels are offline LUT wheels that are not black crushed wheel discs and visibly contact the lower run, and under-hull contact grime helps the pieces mesh?',
    'On hybrid-hull-treads.html?tune=1, does the route provide the old static-prop style gesture controls for the Meshy hull itself: selected meshy-hull-chassis, Move/Rotate/Scale, explicit All/X/Y/Z scale axes, undo/redo/reset/hide, exportable URL/JSON state, fixed authored tread reference, preserved OrbitControls camera and orientation widget, no authored boxmodel chassis, and no 3D transform gizmo?',
    'On hybrid-hull-treads.html?tune=wheels, does the route provide the manual runtime wheel editor: Wheel editor selected, individual wheel rows, direct drag Move/Rotate/Scale controls, Hide as delete, exportable hybridWheelTune URL/JSON, sideSign/sourceWheelNode metadata for later mirroring, fixed Meshy hull and authored tread reference, preserved OrbitControls camera and orientation widget, and no 3D transform gizmo?',
    'Does guided-hull.html show authored_sherman_guided_hull_v1 as a hull-only guided hard-surface reconstruction: simple readable armor planes matching the transparent Meshy hull ghost reference broadly, fixed authored_sherman_treads_v1 visible and separate, no tread swallowing, no giant front/rear ngon read, no Meshy topology, no shrinkwrap, no decimation, no arbitrary mesh wrapping, and preserved OrbitControls camera/orientation widget?',
    'Does assembled-tank.html show the direct Meshy lowpoly PBR envelope package with build token tftm-meshy-direct-lowpoly-pbr-envelope-editor-v1-20260708, lowpoly_hull_envelope, lowpoly_turret_envelope, and lowpoly_treads_envelope generated directly with model_type=lowpoly, source Meshy UVs/materials/PBR textures preserved, authored_sherman_treads_v1 visible as fixed running-gear reference, no high-to-low decimation artifacts, no stripped solid-fill plastic material read, no component-chaff filtered kit as the accepted result, and preserved OrbitControls camera/orientation widget?',
    'Does authored-parade.html show 24 independently animated authored Sherman tanks with projected authored_sherman_smart_material_v1 texture plates with armor_base, edge_wear, cavity_grime, dust_mud, tread_wear, wheel_wear, and gun_finish maps, no per-tank texture copies, projected paint, metal wear, grime, dust, tread, wheel, and gun finish read as texture detail while rejected fence-like hood geometry is hidden, per-instance color variation, independent tread phase, visible turret yaw and barrel pitch, and no 24 cloned GLB object trees?',
    'Does the chassis sponson/track-interface armor read as joined metal wrapping the golden tread assembly from front, rear, side, and oblique views while preserving the accepted tread geometry?',
    'Does authored_sherman_treads_v1 show a full tread assembly only: open perimeter sidewall frame, runtime connected loop tread segments traveling around the belt with adjacent segment endpoints shared through the curves and outward-wound tread shoe normals, static tread belt deleted and one reusable downloaded PBR tread shoe texture set styles connected segments, original wheels are hidden and offline-LUT replacement runtime wheels use the accepted manual wheel editor JSON symmetrized by sideSign; duplicate and under-floor workaround wheels are deleted before runtime spin registration, wheels inside the inner profile opening with road wheels contacting the lower tread run, sprockets, idlers, return rollers, bogie connectors, and connector mounts, not texture-only tread proof, with no hull, turret, barrel, coaxial MG, or full tank scene?',
    'Do the wheels occupy the empty inner tread profile opening in side view, with baked wheel rim loops and smooth rounded rubber faces rather than faceted tire rings or exterior-plane decoration?',
    'Does the extra silhouette subdivision layer improve the old subdivision-0 tread profile without creating fused garbage or cardboard planes, and does the route preserve the established OrbitControls camera plus orientation widget?',
    'Does authored_sherman_textureable_v1 build v1-1 show wheels contained inside closed track pods, with no skirt-through-wheel collision and no pasted coin wheels?',
    'Does authored_sherman_textureable_v1 hide the turret ring gap, integrate the hatches into the turret roof, and preserve barrel/coaxial MG ownership by the mantlet/elevation pivot?',
    'Do authored_sherman_textureable_v1 split UV plates map sanely enough to become the paint/decal base for Alpha and later commander identities?',
    'Does authored_sherman_boxmodel_v1 build v1-15 preserve the Sherman silhouette while using smaller integrated slot walls across all four lower hull/track cracks?',
    'On boxmodel-tank.html?tune=1, does the gesture-only parts workflow provide four hull-colored front-right/front-left/rear-right/rear-left flat armor panels aligned parallel to the tracks and reading like armor skin, not blocks while using a collapsed drawer, one active transform mode, explicit All/X/Y/Z scale axes, direct gestures, OrbitControls camera, and a camera orientation widget without object transform handles?',
    'Does the turret read as one connected cast turret shell with cheek mass, roof flattening, rear bustle, and no pasted side/roof/front panels?',
    'Do the smaller integrated slot walls and joined sponson shells bridge the hull side into the outer track skirt at front-left, front-right, rear-left, and rear-right lower cracks, visibly differ from the rejected screenshot, and do outside crack raycasts hit exterior armor before entering the tank interior, without pasted panels, blockers, or side wings?',
    'Do the armor plates read as joined metal mass rather than separated cardboard planes?',
    'Is the coaxial MG visible and owned by the mantlet/gun assembly?' ,
    'Do the box UV plates stay paintable without obvious runtime guide seams or DALL-E-unpaintable UV spaghetti?',
    'Does authored_sherman_retopo_v1 read as a usable hard-surface chassis and turret at close-up distance?',
    'Do the split face texture plates map sanely without stretching, seams across the wrong surfaces, or DALL-E-unpaintable UV spaghetti?',
    'Does each candidate read as Sherman hard-surface rather than toy, pillow, primitive assembly, or soft sculpture?',
    'Are hull candidates actually hull shells without tracks, wheels, turret, barrel, or complete running gear?',
    'Are turret candidates separate turret shells without hull, tracks, wheels, chassis, or long barrel?',
    'Is the mantlet/barrel candidate isolated from turret body and hull?',
    'Is the gear/wheel candidate a reusable wheel or sprocket module, not a belt or whole suspension?',
    'Is the material atlas free of text, labels, logos, and complete vehicle objects?'
  ],
  acceptance: 'RED BUILD: Animated 24-tank runtime proof is deployed for human visual review. It passes only if this canonical body/tread system reads as the tank, has cannon-chain MG with no fixed bow MG, treads read as closed 3D tread belt volumes rather than side facades, wheels face the hull sides, barrels use non-black Sherman-compatible PBR material and visibly elevate from a rear/socket pivot, every turret traverses horizontally on unsynchronized smooth cycles, every tank has independent motion state, and 24 tanks are plausible on phone.'
};

const releaseManifestJson = JSON.stringify(releaseManifest, null, 2) + '\n';
writeFileSync(join(releaseRoot, 'cloud_visual_truth_manifest.json'), releaseManifestJson);
writeFileSync(join(distRoot, 'cloud_visual_truth_manifest.json'), releaseManifestJson);
writeFileSync(join(releaseRoot, 'firebase.json'), JSON.stringify({
  hosting: {
    site: 'pose-lab-visual-truth',
    public: 'dist',
    ignore: [
      'firebase.json',
      '**/.*',
      '**/node_modules/**'
    ],
    headers: ['**/*.html', '**/*.js', '**/*.css', '**/*.glb', '**/*.json'].map((source) => ({
      source,
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' }
      ]
    })),
    rewrites: [
      {
        source: '**',
        destination: '/index.html'
      }
    ]
  }
}, null, 2) + '\n');
writeFileSync(join(releaseRoot, 'README.md'), `# TFTM Cloud Visual Truth Release

Upload or host the \`dist/\` folder from this directory, then review the cloud/Sense views listed in \`cloud_visual_truth_manifest.json\`.

This packet exists because local capture is forbidden for the current tank visual pass. Do not use local screenshots, Android screencap, localhost browser capture, or local visual harness frames as acceptance evidence; deploy this packet and use Sense Simulation review on the cloud-hosted artifact.
`);
console.log('Cloud visual truth packet written to ' + releaseRoot);

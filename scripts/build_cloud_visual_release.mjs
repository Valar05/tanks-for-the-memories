import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const releaseRoot = join('generated', 'cloud-visual-truth', 'tftm-release');
const distRoot = join(releaseRoot, 'dist');
const tankManifestPath = 'public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json';
const shermanSourceManifestPath = 'assets/generated/meshy/sherman_part_meshy_kit_v1/assembly_manifest.json';
const authoredRetopoManifestPath = 'public/tftm/models/authored_sherman_retopo_v1/model_manifest.json';
const authoredBoxmodelManifestPath = 'public/tftm/models/authored_sherman_boxmodel_v1/model_manifest.json';

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

const tankManifest = JSON.parse(readFileSync(tankManifestPath, 'utf8'));
const shermanSourceManifest = JSON.parse(readFileSync(shermanSourceManifestPath, 'utf8'));
const authoredRetopoManifest = JSON.parse(readFileSync(authoredRetopoManifestPath, 'utf8'));
const authoredBoxmodelManifest = JSON.parse(readFileSync(authoredBoxmodelManifestPath, 'utf8'));
const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
const gitStatus = spawnSync('git', ['status', '--short'], { encoding: 'utf8' });

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
    expected_build: 'tftm-authored-sherman-boxmodel-v1-11-20260705',
    tuner_route: 'boxmodel-tank.html?tune=1',
    tuner_expected_build: 'tftm-authored-sherman-boxmodel-tuner-v9-20260704',
    asset_id: authoredBoxmodelManifest.asset_id,
    output_glb: authoredBoxmodelManifest.output_glb,
    source_blend: authoredBoxmodelManifest.source_blend,
    approximate_triangles: authoredBoxmodelManifest.approximate_triangles,
    glb_hard_cap_triangles: authoredBoxmodelManifest.budget?.hard_cap_triangles,
    uv_policy: authoredBoxmodelManifest.uv_policy,
    face_plate_ids: authoredBoxmodelManifest.face_plate_ids,
    asset_policy: 'fully authored Blender box-model chassis with solidified overlapping armor plates, non-cube cast turret silhouette, and coaxial MG; no Meshy chassis or turret imports; box UV PNG plates for DALL-E paintability',
    acceptance: 'Sense Simulation must confirm Sherman silhouette, non-cube turret massing, joined multi-face sponson/skirt shells cover the front-left, front-right, rear-left, and rear-right hull/track corners as joined metal, raycasts from outside those visible gaps hit exterior armor before entering the tank interior, with no pasted panels, blockers, floating boxes, or runtime overlays, armor reads as joined metal rather than separated cardboard planes, barrel and coaxial MG belong to the mantlet, box UV texture plates map sanely, and local capture was not used.',
    tuner_acceptance: 'Sense Simulation must review boxmodel-tank.html?tune=1 as a preserved future-use gesture-only boxmodel part tuner: collapsed parts drawer is usable, four hull-colored flat armor panels are available for front-right, front-left, rear-right, and rear-left track-line holes, one selected panel is highlighted for editing, already enabled panels remain visible, Move/Rotate/Scale are one active mode at a time, Scale exposes explicit All/X/Y/Z axis buttons, drag/pinch/twist gestures visibly change the selected panel, OrbitControls camera orbit/dolly/pan works, the camera orientation widget snaps square front/back/left/right/top views, tank and panels share the same unskewed model frame, no object transform handles appear, and local capture was not used.'
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
    'boxmodel-tank phone portrait showing authored_sherman_boxmodel_v1 and build token tftm-authored-sherman-boxmodel-v1-11-20260705',
    'boxmodel-tank phone landscape showing Sherman silhouette, joined armor mass, non-cube turret, joined multi-face sponson/skirt shell coverage at front-left, front-right, rear-left, and rear-right hull/track corners, and no local capture',
    'boxmodel-tank close-up review showing joined multi-face sponson/skirt shell coverage at front-left, front-right, rear-left, and rear-right as attached armor, no raycast-accessible interior through those gaps, solidified armor plates, barrel/mantlet/coaxial MG ownership, and box UV plate paintability',
    'boxmodel-tank.html?tune=1 phone portrait showing gesture-only part tuner with collapsed parts drawer, front-right/front-left/rear-right/rear-left hull-colored flat armor panel parts aligned parallel to the tracks, flush to the side plane, and not protruding like blocks, selected panel highlight, camera orientation widget, explicit All/X/Y/Z scale axis buttons, square unskewed tank frame, and build token tftm-authored-sherman-boxmodel-tuner-v9-20260704',
    'boxmodel-tank.html?tune=1 cloud interaction evidence showing one selected flat armor panel visibly move/rotate/scale through drag/pinch/twist while other enabled panels remain placed, OrbitControls camera orbit/dolly/pan preserved from an unskewed model frame, and no object transform handles',
    'retopo-tank phone portrait showing authored_sherman_retopo_v1 and build token tftm-authored-sherman-retopo-v1-1-20260704',
    'retopo-tank phone landscape showing split face texture plates with sane UV mapping and no local capture',
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
    reason: 'Fresh cloud screenshots showed no visible delta after v1-8 front-gap coverage. Root cause: coverage nodes existed but were placed inboard of the visible exterior side plane, and the GLB used a stable asset URL vulnerable to browser cache.',
    required_next_evidence: 'Next tank visual pass must show cloud/Sense evidence that v1-11 raycast-closed sponson shell armor visibly closes the front and rear hull/track corner gaps on all four corners.'
  },
  sense_simulation_questions: [
    'Does authored_sherman_boxmodel_v1 build v1-11 preserve the Sherman silhouette while using joined multi-face sponson shells across all four hull/track corners?',
    'On boxmodel-tank.html?tune=1, does the gesture-only parts workflow provide four hull-colored front-right/front-left/rear-right/rear-left flat armor panels aligned parallel to the tracks and reading like armor skin, not blocks while using a collapsed drawer, one active transform mode, explicit All/X/Y/Z scale axes, direct gestures, OrbitControls camera, and a camera orientation widget without object transform handles?',
    'Does the turret read as a non-cube cast turret form with cheek mass, roof flattening, and rear bustle?',
    'Do the joined multi-face sponson shells bridge the hull side into the outer track skirt at front-left, front-right, rear-left, and rear-right corners, and do outside gap raycasts hit exterior armor before entering the tank interior, without pasted panels or blockers?',
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

writeFileSync(join(releaseRoot, 'cloud_visual_truth_manifest.json'), JSON.stringify(releaseManifest, null, 2) + '\n');
writeFileSync(join(releaseRoot, 'firebase.json'), JSON.stringify({
  hosting: {
    site: 'pose-lab-visual-truth',
    public: 'dist',
    ignore: [
      'firebase.json',
      '**/.*',
      '**/node_modules/**'
    ],
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

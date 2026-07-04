import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const releaseRoot = join('generated', 'cloud-visual-truth', 'tftm-release');
const distRoot = join(releaseRoot, 'dist');
const tankManifestPath = 'public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json';
const shermanSourceManifestPath = 'assets/generated/meshy/sherman_part_meshy_kit_v1/assembly_manifest.json';
const authoredRetopoManifestPath = 'public/tftm/models/authored_sherman_retopo_v1/model_manifest.json';

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

const tankManifest = JSON.parse(readFileSync(tankManifestPath, 'utf8'));
const shermanSourceManifest = JSON.parse(readFileSync(shermanSourceManifestPath, 'utf8'));
const authoredRetopoManifest = JSON.parse(readFileSync(authoredRetopoManifestPath, 'utf8'));
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
    reason: 'Fresh cloud screenshots showed no material visual delta after source-level tread/barrel changes. Root cause includes stable bundled JS/CSS asset URLs; page-level cacheBust alone did not force the phone browser to load changed render code.',
    required_next_evidence: 'Next tank visual pass must show a fresh cloud screenshot or time-separated cloud capture with visible delta for tread volume, barrel material, and barrel verticality.'
  },
  sense_simulation_questions: [
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

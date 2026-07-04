import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const releaseRoot = join('generated', 'cloud-visual-truth', 'tftm-release');
const distRoot = join(releaseRoot, 'dist');
const tankManifestPath = 'public/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json';
const shermanSourceManifestPath = 'assets/generated/meshy/sherman_part_meshy_kit_v1/assembly_manifest.json';

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

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(releaseRoot, { recursive: true });
cpSync('dist', distRoot, { recursive: true });

const tankManifest = JSON.parse(readFileSync(tankManifestPath, 'utf8'));
const shermanSourceManifest = JSON.parse(readFileSync(shermanSourceManifestPath, 'utf8'));
const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
const gitStatus = spawnSync('git', ['status', '--short'], { encoding: 'utf8' });

const releaseManifest = {
  artifact: 'tftm-sherman-24-tank-runtime-proof-red-review',
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
    'model-assay phone portrait showing hero proof plus 24 independently animated tanks',
    'model-assay phone landscape showing readable closed 3D tread belt volume, wheel orientation, and non-black barrel material',
    'model-assay time-separated capture showing unsynchronized horizontal turret traverse and vertical barrel elevation across the 24 tanks',
    'model-assay three-quarter capture showing top/bottom/front/rear tread volume rather than side-facade tread',
    'model-assay desktop medium viewport showing FPS, draw-call estimate, and 24-tank budget readout'
  ],
  false_change_penalty: {
    status: 'active',
    reason: 'Fresh cloud screenshots showed no material visual delta after source-level tread/barrel changes.',
    required_next_evidence: 'Next tank visual pass must show a fresh cloud screenshot or time-separated cloud capture with visible delta for tread volume, barrel material, and barrel verticality.'
  },
  sense_simulation_questions: [
    'Does each candidate read as Sherman hard-surface rather than toy, pillow, primitive assembly, or soft sculpture?',
    'Are hull candidates actually hull shells without tracks, wheels, turret, barrel, or complete running gear?',
    'Are turret candidates separate turret shells without hull, tracks, wheels, chassis, or long barrel?',
    'Is the mantlet/barrel candidate isolated from turret body and hull?',
    'Is the gear/wheel candidate a reusable wheel or sprocket module, not a belt or whole suspension?',
    'Is the material atlas free of text, labels, logos, and complete vehicle objects?'
  ],
  acceptance: 'RED BUILD: Animated 24-tank runtime proof is deployed for human visual review. It passes only if treads read as closed 3D tread belt volumes rather than side facades, wheels face the hull sides, barrels use non-black Sherman-compatible PBR material and visibly elevate from a rear/socket pivot, every turret traverses horizontally on unsynchronized smooth cycles, every tank has independent motion state, and 24 tanks are plausible on phone.'
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

Upload or host the \`dist/\` folder from this directory, then capture the views listed in \`cloud_visual_truth_manifest.json\`.

This packet exists because local screenshot/browser capture is not authoritative for the current tank visual pass.
`);
console.log('Cloud visual truth packet written to ' + releaseRoot);

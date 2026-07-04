import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const modelUrl = './tftm/models/vanilla_sherman_combined/vanilla_sherman.glb';
const textureBase = './model-assay/sherman_default_texture_set_v1/';

function fail(message) {
  failures.push(message);
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function literalCount(source, literal) {
  return source.split(literal).length - 1;
}

for (const file of [
  'single-tank.html',
  'src/single-tank.ts',
  'src/single-tank.css',
  'src/sherman-asset-links.ts',
  'src/sherman-runtime-materials.ts',
  'scripts/build.mjs',
  'scripts/validate_single_tank_cloud_gate.mjs',
  'package.json'
]) {
  if (!existsSync(file)) fail('missing ' + file);
}

if (failures.length === 0) {
  const html = read('single-tank.html');
  const source = read('src/single-tank.ts');
  const build = read('scripts/build.mjs');
  const links = read('src/sherman-asset-links.ts');
  const materials = read('src/sherman-runtime-materials.ts');
  const pkg = JSON.parse(read('package.json'));

  if (literalCount(source, modelUrl) !== 0) fail('single-tank source must import the existing Sherman GLB link, not hardcode the URL');
  if (literalCount(links, modelUrl) !== 1) fail('Sherman asset links must reference the existing Sherman GLB exactly once');
  if (!source.includes('VANILLA_SHERMAN_GLB_URL')) fail('single-tank source must load the shared Sherman GLB link');
  if (!source.includes('applyDefaultShermanTextureSet(model)')) fail('single-tank source must apply the default Sherman texture set');
  if (!links.includes(textureBase)) fail('Sherman asset links must own the default texture base URL');
  if (!links.includes('olive_albedo.png')) fail('Sherman asset links must expose olive_albedo.png');
  if (!links.includes('tread_albedo.png')) fail('Sherman asset links must expose tread_albedo.png');
  if (!materials.includes('SHERMAN_DEFAULT_OLIVE_ALBEDO_URL') || !materials.includes('SHERMAN_DEFAULT_TREAD_ALBEDO_URL')) fail('runtime materials must use shared olive and tread albedo URLs');
  if (!materials.includes('makeAlbedoTexture')) fail('runtime materials must create albedo textures through a named helper');
  if (!materials.includes('classifyMaterialTarget')) fail('runtime materials must classify tread versus body material targets');

  for (const marker of ['single-tank-root', 'camera-zone', 'pointermove', 'cameraState.yaw', 'cameraState.pitch', 'GLTFLoader', 'tftm-single-linked-sherman-textured-v1-20260704']) {
    if (!source.includes(marker)) fail('single-tank source missing marker ' + marker);
  }
  if (!html.includes('/src/single-tank.ts')) fail('single-tank HTML must load src/single-tank.ts');
  if (!build.includes("buildEntry('single-tank.ts', 'single-tank')")) fail('build script must bundle single-tank.ts');
  if (!build.includes("writeBundledHtml('single-tank.html', 'single-tank.html', 'single-tank')")) fail('build script must write single-tank.html');
  if (build.includes('single-tank_sherman') || build.includes('single_tank_sherman')) fail('build script must not add a copied single-tank Sherman asset');
  if (build.includes("path.join(distDir, 'single-tank'") || build.includes("path.join(distDir, \"single-tank\"")) fail('build script must not create a single-tank asset copy directory');
  if (!pkg.scripts?.['single-tank-smoke']) fail('package missing single-tank-smoke');
  if (!pkg.scripts?.['visual-qa:single-tank']) fail('package missing cloud review gate script for single-tank');
  if (pkg.scripts?.['visual-qa:single-tank'].includes('../tools/visual_qa.mjs')) fail('single-tank visual QA script must not invoke the localhost visual capture harness');
  if (!pkg.scripts?.['visual-qa:single-tank'].includes('validate_single_tank_cloud_gate.mjs')) fail('single-tank visual QA must be a cloud/Sense gate, not local capture');

  for (const forbidden of [
    'alpha-assay',
    'commander_platoon',
    'm4a3_75_vvss_sherman_alpha_retexture_v2',
    'sherman_alpha_constrained_albedo_v1',
    'm4a3_75_vvss_sherman_alpha_constrained_albedo_v1',
    'applyTankDecalProfile'
  ]) {
    if (source.includes(forbidden)) fail('single-tank scene must not reference rejected/variant path ' + forbidden);
  }
}

if (failures.length) {
  console.error('Single tank scene smoke failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('Single tank scene smoke passed: shared Sherman links, constrained albedo material pass, right-side camera orbit, no copied tank asset.');

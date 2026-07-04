import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(file) {
  return readFileSync(file, 'utf8');
}

for (const file of ['src/tank-decals.ts', 'src/alpha-control.ts', 'scripts/build.mjs', 'package.json']) {
  if (!existsSync(file)) fail('missing ' + file);
}

if (failures.length === 0) {
  const decals = read('src/tank-decals.ts');
  const control = read('src/alpha-control.ts');
  const build = read('scripts/build.mjs');
  const pkg = JSON.parse(read('package.json'));

  for (const marker of ['DecalGeometry', 'applyTankDecalProfile', "'alpha'", 'alpha_crimson_glacis_field_paint', 'alpha_hand_painted_a', 'runtime_decal_profile_alpha']) {
    if (!decals.includes(marker)) fail('runtime decal module missing marker ' + marker);
  }
  for (const marker of ["applyTankDecalProfile(model, 'alpha'", 'decalDebug', 'alpha-parade-cloned-scene-retexture-v2-runtime-decals', 'm4a3_75_vvss_sherman_alpha_retexture_v2.glb']) {
    if (!control.includes(marker)) fail('Alpha control missing runtime decal marker ' + marker);
  }
  if (!build.includes('DecalGeometry.js')) fail('build resolver must include DecalGeometry');
  if (!pkg.scripts?.['alpha-decal-smoke']) fail('package missing alpha-decal-smoke');

  for (const [label, source] of [['alpha control', control], ['build', build], ['package scripts', JSON.stringify(pkg.scripts)]]) {
    for (const forbidden of ['alphaTextureCandidate', 'alpha-constrained', 'alpha_constrained_albedo', 'sherman_alpha_constrained_albedo_v1', 'm4a3_75_vvss_sherman_alpha_constrained_albedo_v1']) {
      if (source.includes(forbidden)) fail(label + ' must not retain constrained texture candidate marker ' + forbidden);
    }
  }
  for (const [label, source] of [['build', build], ['package scripts', JSON.stringify(pkg.scripts)]]) {
    if (source.includes('alpha-assay')) fail(label + ' must not retain deleted alpha-assay scene');
  }
}

if (failures.length > 0) {
  console.error('Alpha runtime decal smoke failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('Alpha runtime decal smoke passed: accepted Alpha baseline plus projected runtime decal layer, no constrained texture candidate route.');

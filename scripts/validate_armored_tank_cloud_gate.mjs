import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function fail(message) { failures.push(message); }
function read(file) { return readFileSync(file, 'utf8'); }
const manifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const bundlePath = 'generated/cloud-visual-truth/tftm-release/dist/assets/armored-tank.js';
const routePath = 'generated/cloud-visual-truth/tftm-release/dist/armored-tank.html';
for (const file of [manifestPath, bundlePath, routePath]) if (!existsSync(file)) fail('cloud release missing ' + file);
if (failures.length === 0) {
  const manifest = JSON.parse(read(manifestPath));
  const bundle = read(bundlePath);
  const route = read(routePath);
  const rules = JSON.stringify(manifest);
  for (const marker of ['authored_sherman_armored_v1', 'tftm-authored-sherman-armored-v1-20260705', 'watertight', 'armor-covered', 'coaxial MG', 'boxmodel', 'hero', 'Sense Simulation']) {
    if (!rules.includes(marker)) fail('cloud manifest must include armored review marker: ' + marker);
  }
  if (!bundle.includes('authored_sherman_armored_v1')) fail('armored bundle must load authored_sherman_armored_v1');
  if (!bundle.includes('coaxial MG')) fail('armored bundle must preserve coaxial MG review text');
  if (!route.includes('armored-tank')) fail('armored route must be bundled route HTML');
}
if (failures.length) {
  console.error('Armored tank cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Armored tank cloud review gate passed: release packet is ready for cloud/Sense comparison; no local capture was used.');

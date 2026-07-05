import { existsSync, readFileSync } from 'node:fs';
const failures = [];
function fail(message) { failures.push(message); }
if (!existsSync('generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json')) fail('missing cloud visual truth manifest; run npm run cloud-visual-release before cloud/Sense review');
if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/hero-tank.html')) fail('cloud release missing dist/hero-tank.html');
if (failures.length === 0) {
  const manifest = readFileSync('generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json', 'utf8');
  const html = readFileSync('generated/cloud-visual-truth/tftm-release/dist/hero-tank.html', 'utf8');
  const bundle = existsSync('generated/cloud-visual-truth/tftm-release/dist/assets/hero-tank.js') ? readFileSync('generated/cloud-visual-truth/tftm-release/dist/assets/hero-tank.js', 'utf8') : '';
  const rules = manifest.toLowerCase();
  if (!manifest.includes('tftm-authored-sherman-hero-v1-20260705')) fail('cloud manifest must require the hero build token');
  if (!rules.includes('hero-tank.html')) fail('cloud manifest must name hero-tank.html');
  if (!rules.includes('animatable static hero')) fail('cloud manifest must require animatable static hero review');
  if (!rules.includes('not fused')) fail('cloud manifest must reject fused tank geometry');
  if (!rules.includes('sense simulation')) fail('cloud manifest must require Sense Simulation');
  if (!html.includes('hero-tank.js')) fail('cloud release hero HTML must load hero bundle');
  if (!bundle.includes('authored_sherman_hero_v1')) fail('hero bundle must load authored_sherman_hero_v1');
}
if (failures.length) {
  console.error('Hero tank cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Hero tank cloud review gate passed: release packet is ready for cloud deploy and Sense Simulation; no local capture was used.');

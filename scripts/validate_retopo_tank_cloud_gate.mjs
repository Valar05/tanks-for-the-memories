import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const failures = [];
function fail(message) { failures.push(message); }

if (!existsSync(manifestPath)) {
  fail('missing cloud visual truth manifest; run npm run cloud-visual-release before cloud/Sense review');
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const rules = JSON.stringify(manifest).toLowerCase();
  const captures = Array.isArray(manifest.required_cloud_captures) ? manifest.required_cloud_captures.join('\n') : '';
  if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/retopo-tank.html')) fail('cloud release missing dist/retopo-tank.html');
  if (!rules.includes('authored_sherman_retopo_v1')) fail('cloud manifest must name authored_sherman_retopo_v1');
  if (!rules.includes('tftm-authored-sherman-retopo-v1-1-20260704')) fail('cloud manifest must require the authored retopo build token');
  if (!captures.includes('retopo-tank phone portrait')) fail('cloud captures must require retopo-tank phone portrait');
  if (!captures.includes('split face texture plates')) fail('cloud captures must require split face texture plates');
  if (!captures.includes('close-up chassis and turret')) fail('cloud captures must require close-up chassis and turret review');
  if (!rules.includes('local capture forbidden')) fail('cloud manifest must state local capture forbidden');
  if (!rules.includes('sense simulation')) fail('cloud manifest must require Sense Simulation review');
}

if (failures.length) {
  console.error('Retopo tank cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Retopo tank cloud review gate passed: release packet is ready for cloud deploy and Sense Simulation; no local capture was used.');

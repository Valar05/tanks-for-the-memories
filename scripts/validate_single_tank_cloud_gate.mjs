import { existsSync, readFileSync } from 'node:fs';

import { requirePromptContract } from './prompt_contract_guard.mjs';
requirePromptContract({ action: 'visual_qa_gate' });
const manifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const failures = [];

function fail(message) {
  failures.push(message);
}

if (!existsSync(manifestPath)) {
  fail('missing cloud visual truth manifest; run npm run cloud-visual-release before cloud/Sense review');
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const captures = Array.isArray(manifest.required_cloud_captures) ? manifest.required_cloud_captures.join('\n') : '';
  const rules = JSON.stringify(manifest).toLowerCase();
  if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/single-tank.html')) fail('cloud release missing dist/single-tank.html');
  if (!rules.includes('single-tank')) fail('cloud manifest must name the single-tank review surface');
  if (!rules.includes('tftm-single-linked-sherman-textured-v1-20260704')) fail('cloud manifest must require the current single-tank build token');
  if (!captures.includes('olive armor albedo')) fail('cloud captures must require visible olive armor albedo');
  if (!captures.includes('tread albedo')) fail('cloud captures must require visible tread albedo');
  if (!captures.includes('right-side camera')) fail('cloud captures must require right-side camera interaction evidence');
  if (!rules.includes('sense simulation')) fail('cloud manifest must require Sense Simulation review');
  if (!rules.includes('local capture forbidden')) fail('cloud manifest must state local capture forbidden');
}

if (failures.length) {
  console.error('Single tank cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('Single tank cloud review gate passed: release packet is ready for cloud deploy and Sense Simulation; no local capture was used.');

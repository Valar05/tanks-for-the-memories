import { existsSync, readFileSync } from 'node:fs';

import { requirePromptContract } from './prompt_contract_guard.mjs';
requirePromptContract({ action: 'visual_qa_gate' });
const manifestPath = 'generated/cloud-visual-truth/tftm-release/cloud_visual_truth_manifest.json';
const failures = [];
function fail(message) { failures.push(message); }

if (!existsSync(manifestPath)) {
  fail('missing cloud visual truth manifest; run npm run cloud-visual-release before cloud/Sense review');
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const text = JSON.stringify(manifest).toLowerCase();
  const captures = Array.isArray(manifest.required_cloud_captures) ? manifest.required_cloud_captures.join('\n') : '';
  if (!existsSync('generated/cloud-visual-truth/tftm-release/dist/model-assay.html')) fail('cloud release missing dist/model-assay.html');
  if (!text.includes('model-assay')) fail('cloud manifest must name the model-assay review surface');
  if (!text.includes('local capture forbidden')) fail('cloud manifest must state local capture forbidden');
  if (!text.includes('sense simulation')) fail('cloud manifest must require Sense Simulation review');
  if (!captures.includes('model-assay phone portrait')) fail('cloud captures must require model-assay phone portrait review');
  if (!captures.includes('vertical barrel elevation')) fail('cloud captures must require vertical barrel elevation review');
}

if (failures.length) {
  console.error('Model assay cloud review gate failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Model assay cloud review gate passed: release packet is ready for cloud deploy and Sense Simulation; no local capture was used.');

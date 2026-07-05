import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_CONTRACT_PATH = 'docs/current_prompt_contract.md';
const REQUIRED_FIELDS = [
  'latest_user_command',
  'controlling_user_correction',
  'forbidden_stale_premise',
  'allowed_mutation_type',
  'allowed_target_artifact',
  'required_evidence_lane',
  'updated_at'
];

export function parsePromptContract(text) {
  const fields = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_ -]+):\s*(.*)$/);
    if (!match) continue;
    fields.set(match[1].trim().toLowerCase().replaceAll(' ', '_'), match[2].trim());
  }
  return fields;
}

export function evaluatePromptContractText(text, action) {
  const fields = parsePromptContract(text);
  const failures = [];
  for (const field of REQUIRED_FIELDS) {
    if (!fields.get(field)) failures.push('missing required prompt contract field: ' + field);
  }
  const stalePremise = fields.get('forbidden_stale_premise') || '';
  if (stalePremise.length < 40) failures.push('forbidden_stale_premise must name the canceled premise in concrete terms');
  const latest = fields.get('latest_user_command') || '';
  if (latest.length < 5) failures.push('latest_user_command is too vague to authorize mutation');
  const correction = fields.get('controlling_user_correction') || '';
  if (correction.length < 10) failures.push('controlling_user_correction must preserve the correction that changed the premise');
  const allowed = String(fields.get('allowed_mutation_type') || '')
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (action && !allowed.includes(action)) {
    failures.push('prompt contract allows [' + allowed.join(', ') + '] but attempted action is [' + action + ']');
  }
  return { ok: failures.length === 0, failures, fields: Object.fromEntries(fields) };
}

export function requirePromptContract({ action, contractPath = DEFAULT_CONTRACT_PATH } = {}) {
  const absolute = path.resolve(process.cwd(), contractPath);
  if (!existsSync(absolute)) {
    console.error('Current prompt contract failed: missing ' + contractPath);
    console.error('Create docs/current_prompt_contract.md before high-risk model/export/deploy/visual-QA mutations.');
    process.exit(1);
  }
  const verdict = evaluatePromptContractText(readFileSync(absolute, 'utf8'), action);
  if (!verdict.ok) {
    console.error('Current prompt contract failed for action ' + (action || '(unspecified)') + ':');
    for (const failure of verdict.failures) console.error('- ' + failure);
    process.exit(1);
  }
  return verdict;
}

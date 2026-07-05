import { evaluatePromptContractText } from './prompt_contract_guard.mjs';

const validDoctrineContract = `# Current Prompt Contract
latest_user_command: Implement the plan.
controlling_user_correction: make disobedience impossible.
forbidden_stale_premise: Any stale asset modeling, deploy, wake, or validation work that continues a rejected premise.
allowed_mutation_type: doctrine_workflow_guard
allowed_target_artifact: doctrine files and prompt contract guard scripts
required_evidence_lane: readback, guard smoke tests, syntax checks, and diff scope
updated_at: 2026-07-05
`;

const missing = evaluatePromptContractText('', 'doctrine_workflow_guard');
if (missing.ok || missing.failures.length < 6) throw new Error('empty contract must fail closed with required-field failures');

const pass = evaluatePromptContractText(validDoctrineContract, 'doctrine_workflow_guard');
if (!pass.ok) throw new Error('valid doctrine workflow contract should pass: ' + pass.failures.join('; '));

const mismatch = evaluatePromptContractText(validDoctrineContract, 'asset_export');
if (mismatch.ok) throw new Error('asset_export must fail when only doctrine_workflow_guard is allowed');
if (!mismatch.failures.some((failure) => failure.includes('attempted action is [asset_export]'))) throw new Error('mismatch failure must name attempted action');

console.log('Prompt contract guard validation passed: missing contracts fail closed, matching action passes, mismatched high-risk action fails.');

#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_REPO = 'Valar05/tanks-for-the-memories';
const DEFAULT_WORKFLOW = 'cloud-pixels.yml';
const DEFAULT_REF = 'codex/crew-simulation';
const DEFAULT_URL = 'https://pose-lab-visual-truth--tftm-boxmodel-v1-13-ncn1csrf.web.app/hybrid-hull-treads.html?cacheBust=hull-material-v1-20260707';
const DEFAULT_TMP_ROOT = '/data/data/com.termux/files/usr/tmp/tftm-cloud-pixels';

function parseArgs(argv) {
  const args = {
    repo: DEFAULT_REPO,
    workflow: DEFAULT_WORKFLOW,
    ref: DEFAULT_REF,
    url: DEFAULT_URL,
    label: 'hybrid-hull-treads',
    waitMs: '6000',
    variants: 'final,treadAlbedo,treadNormal,treadRoughness,treadMetalness,wheelRoughness,lightingNeutral',
    runId: '',
    out: '',
    noWatch: false,
    downloadOnly: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const key = raw.includes('=') ? raw.slice(0, raw.indexOf('=')) : raw;
    const value = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : argv[index + 1];
    if (!raw.startsWith('--')) throw new Error('unknown positional argument: ' + raw);
    if (!raw.includes('=') && argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
    if (key === '--repo') args.repo = value;
    else if (key === '--workflow') args.workflow = value;
    else if (key === '--ref') args.ref = value;
    else if (key === '--url') args.url = value;
    else if (key === '--label') args.label = value;
    else if (key === '--wait-ms') args.waitMs = String(value);
    else if (key === '--variants') args.variants = value;
    else if (key === '--run-id') args.runId = String(value);
    else if (key === '--out') args.out = value;
    else if (key === '--no-watch') args.noWatch = true;
    else if (key === '--download-only') args.downloadOnly = true;
    else if (key === '--help' || key === '-h') {
      printHelp();
      process.exit(0);
    } else throw new Error('unknown argument: ' + key);
  }
  if (!/^[-_.a-zA-Z0-9]+\/[-_.a-zA-Z0-9]+$/.test(args.repo)) throw new Error('--repo must be owner/name');
  if (!args.runId && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(args.url)) throw new Error('--url must be absolute when starting a run');
  if (!args.label || !/^[a-zA-Z0-9._-]+$/.test(args.label)) throw new Error('--label must use letters, numbers, dot, underscore, or dash');
  if (!/^[0-9]+$/.test(args.waitMs)) throw new Error('--wait-ms must be an integer string');
  if (args.downloadOnly && !args.runId) throw new Error('--download-only requires --run-id');
  return args;
}

function printHelp() {
  console.log([
    'usage: node scripts/run_cloud_pixels.mjs [options]',
    '',
    'Starts the GitHub Actions cloud-pixel workflow, waits for it, and downloads artifacts.',
    '',
    'Options:',
    '  --url URL                 cloud URL to capture',
    '  --label NAME              artifact prefix, default hybrid-hull-treads',
    '  --variants LIST           default final,treadAlbedo,treadNormal,treadRoughness,treadMetalness,wheelRoughness,lightingNeutral',
    '  --wait-ms N               settle wait in GitHub runner, default 6000',
    '  --ref BRANCH              workflow ref, default codex/crew-simulation',
    '  --repo OWNER/REPO         default Valar05/tanks-for-the-memories',
    '  --run-id ID               reuse an existing workflow run',
    '  --download-only           only download artifacts for --run-id',
    '  --no-watch                do not wait before downloading',
    '  --out DIR                 output dir, default Termux tmp by run id'
  ].join('\n'));
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: options.timeout ?? 600000
  });
  if ((result.status ?? 1) !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error([command, ...commandArgs].join(' ') + ' failed' + (output ? '\n' + output : ''));
  }
  return result;
}

function gh(commandArgs, options = {}) {
  return run('gh', commandArgs, options);
}

function parseRunIdFromText(text) {
  const value = String(text || '');
  const urlMatch = new RegExp('/actions/runs/([0-9]+)').exec(value);
  const idMatch = new RegExp('\\b([0-9]{8,})\\b').exec(value);
  const match = urlMatch || idMatch;
  return match ? match[1] : '';
}

function startRun(args) {
  const result = gh([
    'workflow', 'run', args.workflow,
    '--repo', args.repo,
    '--ref', args.ref,
    '-f', 'url=' + args.url,
    '-f', 'label=' + args.label,
    '-f', 'wait_ms=' + args.waitMs,
    '-f', 'variants=' + args.variants
  ], { capture: true, timeout: 120000 });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  const runId = parseRunIdFromText(output);
  if (runId) return { runId, dispatchOutput: output.trim() };
  const list = gh([
    'run', 'list',
    '--repo', args.repo,
    '--workflow', args.workflow,
    '--branch', args.ref,
    '--event', 'workflow_dispatch',
    '--limit', '1',
    '--json', 'databaseId,url,status,createdAt'
  ], { capture: true, timeout: 120000 });
  const runs = JSON.parse(list.stdout || '[]');
  if (!runs[0]?.databaseId) throw new Error('could not discover run id after dispatch');
  return { runId: String(runs[0].databaseId), dispatchOutput: output.trim() };
}

function runView(args, runId) {
  const result = gh([
    'run', 'view', runId,
    '--repo', args.repo,
    '--json', 'databaseId,status,conclusion,url,headBranch,headSha,workflowName,createdAt,updatedAt'
  ], { capture: true, timeout: 120000 });
  return JSON.parse(result.stdout);
}

function listArtifacts(args, runId) {
  const result = gh([
    'api', 'repos/' + args.repo + '/actions/runs/' + runId + '/artifacts',
    '--jq', '.artifacts[] | [.name, .size_in_bytes, .archive_download_url] | @tsv'
  ], { capture: true, timeout: 120000 });
  return String(result.stdout || '').trim().split('\n').filter(Boolean).map((line) => {
    const [name, sizeBytes, archiveUrl] = line.split('	');
    return { name, sizeBytes: Number(sizeBytes), archiveUrl };
  });
}

function downloadArtifacts(args, runId, artifacts, outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const artifact of artifacts) {
    gh(['run', 'download', runId, '--repo', args.repo, '--name', artifact.name, '--dir', outDir], { timeout: 600000 });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let runId = args.runId;
  let dispatchOutput = '';
  if (!runId) {
    const started = startRun(args);
    runId = started.runId;
    dispatchOutput = started.dispatchOutput;
    console.log('started cloud pixel run: ' + runId);
    if (dispatchOutput) console.log(dispatchOutput);
  } else {
    console.log('using existing cloud pixel run: ' + runId);
  }

  if (!args.noWatch && !args.downloadOnly) {
    gh(['run', 'watch', runId, '--repo', args.repo, '--exit-status'], { timeout: 1200000 });
  }

  const view = runView(args, runId);
  if (view.status !== 'completed') throw new Error('run is not completed: ' + view.status + ' ' + view.url);
  if (view.conclusion !== 'success') throw new Error('run did not succeed: ' + view.conclusion + ' ' + view.url);
  const artifacts = listArtifacts(args, runId);
  if (!artifacts.length) throw new Error('run has no artifacts: ' + view.url);
  const outDir = resolve(args.out || DEFAULT_TMP_ROOT + '/' + runId);
  downloadArtifacts(args, runId, artifacts, outDir);
  const report = { generatedAt: new Date().toISOString(), repo: args.repo, workflow: args.workflow, ref: args.ref, runId, run: view, artifacts, outDir };
  writeFileSync(resolve(outDir, 'operator_report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('downloaded cloud pixel artifacts to ' + outDir);
  console.log('run: ' + view.url);
  for (const artifact of artifacts) console.log('artifact: ' + artifact.name + ' (' + artifact.sizeBytes + ' bytes)');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { get } from 'node:https';

import { requirePromptContract } from './prompt_contract_guard.mjs';
if (!process.argv.includes('--dry-run') && !process.argv.includes('--verify-only')) requirePromptContract({ action: 'cloud_review_deploy' });
const project = 'home-center-dclar';
const channel = 'tftm-boxmodel-v1-13';
const reviewBaseUrl = 'https://pose-lab-visual-truth--tftm-boxmodel-v1-13-ncn1csrf.web.app';
const route = 'boxmodel-tank.html';
const releaseRoot = 'generated/cloud-visual-truth/tftm-release';
const releaseManifestPath = releaseRoot + '/cloud_visual_truth_manifest.json';
const assetLinksPath = 'src/sherman-asset-links.ts';
const dryRun = process.argv.includes('--dry-run');
const verifyOnly = process.argv.includes('--verify-only');

function fail(message) {
  console.error('Boxmodel cloud review workflow failed: ' + message);
  process.exit(1);
}
function run(label, command, args, options = {}) {
  console.log('\n## ' + label);
  console.log([command, ...args].join(' '));
  if (dryRun) return { status: 0, stdout: '', stderr: '' };
  const result = spawnSync(command, args, { stdio: options.capture ? 'pipe' : 'inherit', encoding: 'utf8', timeout: options.timeout ?? 120000, cwd: options.cwd });
  if ((result.status ?? 1) !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    fail(label + ' exited ' + (result.status ?? 'unknown') + (output ? '\n' + output : ''));
  }
  return result;
}
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: { 'User-Agent': 'tftm-boxmodel-cloud-review/1.0' } }, (res) => {
      if ((res.statusCode || 500) >= 300 && (res.statusCode || 500) < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        fetchText(next).then(resolve, reject);
        return;
      }
      if ((res.statusCode || 500) >= 400) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.setTimeout(20000, () => req.destroy(new Error('timeout fetching ' + url)));
    req.on('error', reject);
  });
}
function expectedGlbToken() {
  const source = readFileSync(assetLinksPath, 'utf8');
  const match = source.match(/authored_sherman_boxmodel_v1\.glb\?v=([^']+)/);
  if (!match) fail('cannot find authored boxmodel GLB cache token in ' + assetLinksPath);
  return match[1];
}
async function verifyCloudBundle() {
  const manifest = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  const expectedBuild = manifest.authored_boxmodel_review?.expected_build;
  const visualVerdict = manifest.authored_boxmodel_review?.visual_verdict;
  if (!expectedBuild) fail('release manifest missing authored_boxmodel_review.expected_build');
  if (!visualVerdict?.status) fail('release manifest missing authored_boxmodel_review.visual_verdict.status');
  const glbToken = expectedGlbToken();
  const pageUrl = reviewBaseUrl + '/' + route;
  console.log('\n## cloud token verification');
  console.log('page: ' + pageUrl);
  const html = await fetchText(pageUrl);
  const jsMatch = html.match(/<script[^>]+src="([^"]*boxmodel-tank\.js\?v=[^"]+)"/);
  if (!jsMatch) fail('hosted boxmodel page did not reference a cache-busted boxmodel-tank.js bundle');
  const jsUrl = new URL(jsMatch[1], pageUrl).toString();
  console.log('bundle: ' + jsUrl);
  const js = await fetchText(jsUrl);
  if (!js.includes(expectedBuild)) fail('hosted JS missing expected build token ' + expectedBuild);
  if (!js.includes(glbToken)) fail('hosted JS missing GLB cache token ' + glbToken);
  if (js.includes('v1-12-watertight-visible-sponson-shells')) fail('hosted JS still contains rejected v1-12 token');
  console.log('verified build token: ' + expectedBuild);
  console.log('verified GLB token: ' + glbToken);
  console.log('visual verdict: ' + visualVerdict.status);
  if (visualVerdict.status === 'red_unaccepted_no_op_churn') {
    console.log('hosted-current-unaccepted: token checks passed, but visual verdict is red/no-op; do not claim fixed or wake for acceptance.');
  } else {
    console.log('hosted-current-visual-verdict: ' + visualVerdict.status);
  }
  console.log('review URL: ' + pageUrl);
}

if (dryRun) {
  console.log('dry run: would build release, run cloud gate, deploy existing channel, verify hosted bundle tokens, and report explicit visual verdict status');
  console.log('project: ' + project);
  console.log('channel: ' + channel);
  console.log('review URL: ' + reviewBaseUrl + '/' + route);
  process.exit(0);
}

if (!verifyOnly) {
  run('build cloud visual truth release packet', 'npm', ['run', 'cloud-visual-release']);
  run('validate boxmodel cloud gate', 'npm', ['run', 'visual-qa:boxmodel-tank']);
  run('deploy existing Firebase review channel', 'firebase', ['hosting:channel:deploy', channel, '--project', project], { timeout: 180000, cwd: releaseRoot });
}

verifyCloudBundle().catch((error) => fail(error.message));

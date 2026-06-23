import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'index.html',
  'README.md',
  'ARCHITECTURE.md',
  'package.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'src/main.ts',
  'src/styles.css',
  '.npmrc'
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push('missing ' + file);
  }
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (packageJson.name !== 'tftm') {
  failures.push('package name should be tftm');
}
for (const scriptName of ['build', 'dev', 'smoke', 'bootstrap']) {
  if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
    failures.push('missing npm script ' + scriptName);
  }
}

const deps = [
  'node_modules/typescript/bin/tsc',
  'node_modules/esbuild-wasm/lib/main.js'
];
for (const dep of deps) {
  if (!existsSync(dep)) {
    failures.push('missing repo-local dependency ' + dep);
  }
}

const main = readFileSync('src/main.ts', 'utf8');
const requiredSnippets = [
  'The Feed Is The Battlefield',
  'Scout report',
  'Radio report',
  'Visual observation',
  'HQ message',
  'A / B / C / D resolve the selected report.',
  'WWDD validation required',
  'Attention is the resource.',
  'No live AI or LLM calls are used at runtime.'
];
for (const snippet of requiredSnippets) {
  if (!main.includes(snippet)) {
    failures.push('missing source marker ' + snippet);
  }
}

if (failures.length > 0) {
  console.error('Smoke check failed:');
  for (const failure of failures) {
    console.error('- ' + failure);
  }
  process.exit(1);
}

const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

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
  'src/styles.css'
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

const main = readFileSync('src/main.ts', 'utf8');
const requiredSnippets = [
  'Information -> Order -> Consequence -> Memory',
  'attack contact',
  'hatch open',
  'button up',
  'gunner scope',
  'report',
  'Information Ledger',
  'After-action report',
  'hidden enemy',
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

const localTsc = existsSync('node_modules/.bin/tsc');
const localVite = existsSync('node_modules/.bin/vite');
if (localTsc && localVite) {
  const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

const awarenessResult = spawnSync('npm', ['run', 'awareness-smoke'], { stdio: 'inherit' });
if ((awarenessResult.status ?? 1) !== 0) {
  process.exit(awarenessResult.status ?? 1);
}

console.log('Smoke check passed without local build tools. Run npm install, then npm run build.');

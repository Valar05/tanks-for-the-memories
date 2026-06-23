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
  '.npmrc',
  'public/tftm/evidence/manifest.json',
  'public/tftm/audio/manifest.json',
  'public/tftm/audio/cartesia_voice_index.json'
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
  'Wake radio net',
  'Scout report',
  'Radio report',
  'Visual observation',
  'HQ message',
  'Cartesia',
  'A / B / C / D resolve the selected report.',
  'No live AI or LLM calls are used at runtime.'
];
for (const snippet of requiredSnippets) {
  if (!main.includes(snippet)) {
    failures.push('missing source marker ' + snippet);
  }
}

const manifest = JSON.parse(readFileSync('public/tftm/audio/manifest.json', 'utf8'));
if (manifest.provider !== 'Cartesia' || !Array.isArray(manifest.clips) || manifest.clips.length < 8) {
  failures.push('audio manifest missing Cartesia clips');
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

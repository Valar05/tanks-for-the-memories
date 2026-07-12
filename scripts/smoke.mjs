import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const failures = [];

function run(command, args) {
  const result = spawnSync(command, args, {stdio: 'inherit', shell: false});
  if (result.status !== 0) failures.push(`${command} ${args.join(' ')} failed`);
}

function requireFile(file) {
  if (!existsSync(file)) failures.push(`Missing ${file}`);
}

function requireIncludes(file, marker, message) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(marker)) failures.push(message);
}

run('node', ['--import', 'tsx', 'scripts/test-command-compiler.mts']);
run('npm', ['run', 'build']);

for (const file of [
  'src/command-compiler.ts',
  'public/audio/script.json',
  'scripts/generate-cartesia-audio.mjs',
  'docs/doctrine/avre-radio-command-organ.md',
  '.github/workflows/pages.yml',
]) requireFile(file);

requireIncludes('src/command-compiler.ts', 'return null', 'Compiler must be able to return radio silence');
requireIncludes('src/main.ts', 'SpeechRecognition', 'Runtime must support browser speech recognition');
requireIncludes('src/main.ts', 'audio/script.json', 'Runtime must load static audio script');
requireIncludes('docs/doctrine/avre-radio-command-organ.md', 'The browser never receives a Cartesia key', 'Doctrine must preserve Cartesia key boundary');

const script = JSON.parse(readFileSync('public/audio/script.json', 'utf8'));
if (!Array.isArray(script) || script.length < 12) failures.push('Audio script must contain at least 12 authored lines');
for (const line of script) {
  if (!line.id || !line.file || !line.text || !line.file.endsWith('.wav')) failures.push(`Invalid audio script line: ${JSON.stringify(line)}`);
  if (!existsSync(path.join('public/audio', line.file))) failures.push(`Missing generated WAV: ${line.file}`);
}

const distFiles = [];
function collect(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else distFiles.push(full);
  }
}
collect('dist');
const bundleText = distFiles.filter((file) => /\.(js|html|css)$/.test(file)).map((file) => readFileSync(file, 'utf8')).join('\n');
for (const forbidden of ['CARTESIA_API_KEY', 'api.cartesia.ai', 'three.module', 'GLTFLoader', 'THREE.']) {
  if (bundleText.includes(forbidden)) failures.push(`Browser bundle contains forbidden marker: ${forbidden}`);
}

if (failures.length) {
  console.error('Smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('AVRE smoke: OK');

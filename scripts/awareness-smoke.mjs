import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const tsc = 'node_modules/typescript/bin/tsc';
const workDir = mkdtempSync(join(tmpdir(), 'tftm-awareness-'));
const compile = spawnSync('node', [tsc, '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--outDir', workDir, 'src/awareness.ts'], { stdio: 'inherit' });
if ((compile.status ?? 1) !== 0) {
  process.exit(compile.status ?? 1);
}

const url = new URL('file://' + join(workDir, 'awareness.js'));
const mod = await import(url.href);
const state = mod.createAwarenessState();
const first = mod.recordEnemyTankContact(state, {
  observer: 'Smoker',
  sourceUnit: 'Wingman Sherman',
  time: 12,
  label: 'right hedgerow, about 41m ahead',
  confidence: 0.41
});
if (!first.created || !first.shouldReveal || first.contact.status !== 'suspected-armor') {
  throw new Error('first contact did not create a suspected armor reveal');
}
if (!first.revealText.includes('suspected armor')) {
  throw new Error('first reveal exposed too much certainty');
}
const second = mod.recordEnemyTankContact(state, {
  observer: 'Commander Mercer',
  sourceUnit: 'Player Sherman',
  time: 18,
  label: 'right hedgerow, about 41m ahead',
  confidence: 0.91,
  confirmed: true
});
if (second.created || second.shouldReveal || second.contact.status !== 'confirmed-armor') {
  throw new Error('second contact did not confirm without repeating the reveal');
}
if (mod.getPrimaryContact(state)?.status !== 'confirmed-armor') {
  throw new Error('primary contact did not persist as confirmed armor');
}

const resolution = mod.resolveEnemyPicture(state, {
  observer: 'Player Sherman',
  sourceUnit: 'Enemy AT gun',
  time: 24,
  kind: 'underestimation',
  realityLabel: 'concealed anti-tank gun',
  consequence: ['Original Report: Wingman Sherman reported suspected armor.', 'Reality: Concealed anti-tank gun.', 'Consequence: Platoon advanced before confirmation.', 'Lesson: Observation quality matters.'].join('\n')
});
if (resolution.contact.realityLabel !== 'concealed anti-tank gun' || resolution.contact.resolutionKind !== 'underestimation') {
  throw new Error('resolution did not preserve the false picture and final reality');
}
if (!resolution.chipText.includes('concealed anti-tank gun') || !resolution.revealText.includes('picture wrong')) {
  throw new Error('resolution did not produce a readable correction');
}
console.log('Awareness smoke passed: first contact reveals once, later confirmation updates without spamming.');
rmSync(workDir, { recursive: true, force: true });

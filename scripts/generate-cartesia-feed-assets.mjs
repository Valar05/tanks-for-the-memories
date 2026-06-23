import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'public', 'tftm', 'audio');
const manifestPath = path.join(outDir, 'manifest.json');
const voiceIndexPath = path.join(outDir, 'cartesia_voice_index.json');
const apiKey = process.env.CARTESIA_API_KEY;

if (!apiKey) {
  throw new Error('CARTESIA_API_KEY is required');
}

mkdirSync(outDir, { recursive: true });

const version = '2026-03-01';
const voiceIndex = JSON.parse(readFileSync(voiceIndexPath, 'utf8'));
const roles = Object.fromEntries(voiceIndex.selection.map((item) => [item.role, item]));

const clips = [
  {
    key: 'scout-movement-right-hedgerow',
    file: 'scout-movement-right-hedgerow.mp3',
    transcript: 'Scout reports movement, right hedgerow.',
    role: 'scout',
    speed: 1.02,
    volume: 1
  },
  {
    key: 'scout-possible-armor-orchard-fence',
    file: 'scout-possible-armor-orchard-fence.mp3',
    transcript: 'Possible armor near orchard fence.',
    role: 'scout',
    speed: 1.0,
    volume: 1
  },
  {
    key: 'radio-contact-lost',
    file: 'radio-contact-lost.mp3',
    transcript: 'Radio contact lost.',
    role: 'radio',
    speed: 1.08,
    volume: 0.98
  },
  {
    key: 'radio-friendly-tank-missing',
    file: 'radio-friendly-tank-missing.mp3',
    transcript: 'Friendly tank missing.',
    role: 'radio',
    speed: 1.06,
    volume: 0.98
  },
  {
    key: 'visual-movement-observed',
    file: 'visual-movement-observed.mp3',
    transcript: 'Movement observed.',
    role: 'visual',
    speed: 1.0,
    volume: 1
  },
  {
    key: 'visual-maybe-muzzle-flash',
    file: 'visual-maybe-muzzle-flash.mp3',
    transcript: 'Maybe muzzle flash.',
    role: 'visual',
    speed: 1.0,
    volume: 1
  },
  {
    key: 'hq-advance-immediately',
    file: 'hq-advance-immediately.mp3',
    transcript: 'HQ requests immediate advance.',
    role: 'hq',
    speed: 0.98,
    volume: 1
  },
  {
    key: 'hq-hold-until-clear',
    file: 'hq-hold-until-clear.mp3',
    transcript: 'Hold until the picture clears.',
    role: 'hq',
    speed: 0.95,
    volume: 1
  },
  {
    key: 'memory-original-report',
    file: 'memory-original-report.mp3',
    transcript: 'Original report. Reality. Consequence. Lesson.',
    role: 'memory',
    speed: 0.92,
    volume: 0.9
  },
  {
    key: 'memory-the-feed-was-wrong',
    file: 'memory-the-feed-was-wrong.mp3',
    transcript: 'The feed was wrong.',
    role: 'memory',
    speed: 0.9,
    volume: 0.9
  }
];

const manifest = {
  provider: 'Cartesia',
  version,
  model_id: 'sonic-3.5',
  generated_at: new Date().toISOString(),
  selection: voiceIndex.selection,
  clips: clips.map((clip) => ({
    key: clip.key,
    file: `/tftm/audio/${clip.file}`,
    transcript: clip.transcript,
    voice_role: clip.role,
    voice_id: roles[clip.role].id,
    voice_name: roles[clip.role].name,
    generation_config: { speed: clip.speed, volume: clip.volume },
    sample_rate: 24000,
    container: 'mp3'
  }))
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

for (const clip of clips) {
  const output = path.join(outDir, clip.file);
  if (existsSync(output) && statSync(output).size > 0) {
    continue;
  }
  const body = {
    model_id: 'sonic-3.5',
    transcript: clip.transcript,
    voice: { mode: 'id', id: roles[clip.role].id },
    output_format: { container: 'mp3', sample_rate: 24000 },
    generation_config: { speed: clip.speed, volume: clip.volume }
  };
  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Cartesia-Version': version,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cartesia TTS failed for ${clip.key}: ${response.status} ${text}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(output, buffer);
}

console.log('Cartesia feed assets generated at', outDir);

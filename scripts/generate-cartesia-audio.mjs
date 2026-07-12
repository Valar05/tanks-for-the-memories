import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scriptPath = path.join(root, 'public/audio/script.json');
const outDir = path.join(root, 'public/audio');
const apiKey = process.env.CARTESIA_API_KEY;
const defaultVoiceId = 'ef191366-f52f-447a-a398-ed8c0f2943a1';
const voiceId = process.env.CARTESIA_VOICE_ID || defaultVoiceId;

if (!apiKey) {
  console.error('CARTESIA_API_KEY is required.');
  process.exit(1);
}

mkdirSync(outDir, {recursive: true});
const lines = JSON.parse(readFileSync(scriptPath, 'utf8'));

for (const line of lines) {
  const target = path.join(outDir, line.file);
  if (existsSync(target) && process.env.CARTESIA_OVERWRITE !== '1') {
    console.log(`skip ${line.file}`);
    continue;
  }
  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2026-03-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-3.5',
      transcript: line.text,
      voice: {mode: 'id', id: voiceId},
      output_format: {container: 'wav', encoding: 'pcm_s16le', sample_rate: 44100},
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cartesia failed for ${line.id}: ${response.status} ${text.slice(0, 500)}`);
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  console.log(`wrote ${line.file}`);
}

console.log(`Cartesia WAV generation complete: ${lines.length} lines`);

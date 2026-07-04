import { readFileSync } from 'node:fs';

const failures = [];
function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { failures.push(`cannot read ${path}: ${error.message}`); return null; }
}
function readPngSize(path) {
  try {
    const bytes = readFileSync(path);
    const signature = bytes.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') throw new Error('not a PNG');
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
  } catch (error) {
    failures.push(`cannot inspect ${path}: ${error.message}`);
    return null;
  }
}
function expect(condition, message) {
  if (!condition) failures.push(message);
}

const manifestPath = 'assets/generated/openai/sherman_default_texture_set_v1/manifest.json';
const manifest = readJson(manifestPath);
if (manifest) {
  expect(manifest.asset_id === 'sherman_default_texture_set_v1', 'manifest asset_id must be sherman_default_texture_set_v1');
  expect(manifest.asset_class === 'canonical_sherman_default_painted_realism_albedo_set', 'manifest asset_class must be canonical default painted realism');
  const outputKeys = Object.keys(manifest.outputs || {}).sort();
  expect(JSON.stringify(outputKeys) === JSON.stringify(['olive_albedo', 'tread_albedo']), 'manifest outputs must list only olive_albedo and tread_albedo');
  const serializedOutputs = JSON.stringify(manifest.outputs || {});
  for (const forbidden of ['normal', 'roughness', 'metalness']) {
    expect(!serializedOutputs.includes(forbidden), `manifest outputs must not include ${forbidden}`);
  }
  expect(String(manifest.visual_doctrine?.primary_rule || '').includes('albedo must carry the tank'), 'manifest must preserve standalone albedo doctrine');
}

const expected = [
  ['assets/generated/openai/sherman_default_texture_set_v1/olive_albedo.png', 1024, 1024],
  ['assets/generated/openai/sherman_default_texture_set_v1/tread_albedo.png', 1024, 256]
];
for (const [path, width, height] of expected) {
  const size = readPngSize(path);
  if (!size) continue;
  expect(size.width === width && size.height === height, `${path} must be ${width}x${height}`);
  expect(size.colorType === 2, `${path} must be RGB truecolor PNG`);
}

const activeSources = [
  ['src/model-assay.ts', readFileSync('src/model-assay.ts', 'utf8')]
];
for (const [path, source] of activeSources) {
  expect(source.includes('sherman_default_texture_set_v1'), `${path} must use sherman_default_texture_set_v1`);
  for (const forbidden of ['roughnessMap', 'metalnessMap', 'normalMap', 'tread_roughness.png', 'tread_metalness.png', 'tread_normal.png', 'olive_roughness.png', 'olive_metalness.png', 'olive_normal.png']) {
    expect(!source.includes(forbidden), `${path} active material path must not include ${forbidden}`);
  }
}

if (failures.length) {
  console.error('Sherman albedo manifest validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Sherman default texture validation passed: canonical painted-realism albedo set is active.');

import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const root = process.cwd();
const sourceGlb = path.join(root, 'public', 'tftm', 'models', 'alpha_sherman_combined', 'alpha_sherman.glb');
const outputDir = path.join(root, 'public', 'tftm', 'models', 'alpha_sherman_meshy_single_file');
const outputGlb = path.join(outputDir, 'alpha_sherman_meshy_single_file.glb');
const outputManifest = path.join(outputDir, 'model_manifest.json');
const textureDir = path.join(root, 'assets', 'generated', 'openai', 'sherman_runtime_pbr_v1');
const textureSources = [
  { name: 'olive_albedo', file: 'olive_albedo.png', mimeType: 'image/png' },
  { name: 'olive_normal', file: 'olive_normal.png', mimeType: 'image/png' },
  { name: 'tread_albedo', file: 'tread_albedo.png', mimeType: 'image/png' },
  { name: 'tread_normal', file: 'tread_normal.png', mimeType: 'image/png' },
  { name: 'tread_roughness', file: 'tread_roughness.png', mimeType: 'image/png' }
];
function align4(value) { return (value + 3) & ~3; }
function padBuffer(buffer, padByte = 0x00) {
  const padded = Buffer.alloc(align4(buffer.length), padByte);
  buffer.copy(padded);
  return padded;
}
function readGlb(file) {
  const glb = readFileSync(file);
  if (glb.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB');
  let offset = 12;
  let json = null;
  let bin = Buffer.alloc(0);
  while (offset < glb.length) {
    const length = glb.readUInt32LE(offset);
    const type = glb.readUInt32LE(offset + 4);
    const data = glb.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8').trim());
    if (type === BIN_CHUNK) bin = Buffer.from(data);
    offset += 8 + length;
  }
  if (!json) throw new Error('GLB missing JSON chunk');
  return { json, bin };
}
function writeGlb(file, json, bin) {
  const jsonBytes = padBuffer(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binBytes = padBuffer(bin, 0x00);
  const totalLength = 12 + 8 + jsonBytes.length + 8 + binBytes.length;
  const out = Buffer.alloc(totalLength);
  let offset = 0;
  out.writeUInt32LE(GLB_MAGIC, offset); offset += 4;
  out.writeUInt32LE(2, offset); offset += 4;
  out.writeUInt32LE(totalLength, offset); offset += 4;
  out.writeUInt32LE(jsonBytes.length, offset); offset += 4;
  out.writeUInt32LE(JSON_CHUNK, offset); offset += 4;
  jsonBytes.copy(out, offset); offset += jsonBytes.length;
  out.writeUInt32LE(binBytes.length, offset); offset += 4;
  out.writeUInt32LE(BIN_CHUNK, offset); offset += 4;
  binBytes.copy(out, offset);
  writeFileSync(file, out);
}
function ensureArray(json, key) {
  if (!Array.isArray(json[key])) json[key] = [];
  return json[key];
}
const { json, bin } = readGlb(sourceGlb);
const images = json.images = [];
const textures = json.textures = [];
const materials = ensureArray(json, 'materials');
const textureIndexByName = {};
const fallbackColors = [
  [0.36, 0.34, 0.20, 1],
  [0.08, 0.08, 0.07, 1],
  [0.20, 0.15, 0.10, 1],
  [0.17, 0.15, 0.12, 1],
  [0.49, 0.13, 0.09, 1],
  [0.85, 0.82, 0.72, 1],
  [0.54, 0.46, 0.32, 1]
];
for (const source of textureSources) {
  const bytes = readFileSync(path.join(textureDir, source.file));
  const image = images.length;
  images.push({
    name: source.name,
    mimeType: source.mimeType,
    uri: `data:${source.mimeType};base64,${bytes.toString('base64')}`
  });
  const texture = textures.length;
  textures.push({ name: source.name, source: image });
  textureIndexByName[source.name] = texture;
}
function setMaterialTexture(index, colorTexture, normalTexture) {
  const material = materials[index];
  if (!material) return;
  material.name = material.name || ['oliveArmor', 'darkGunmetal', 'treadBelt', 'roadwheelRubber'][index] || `material_${index}`;
  material.pbrMetallicRoughness = material.pbrMetallicRoughness || {};
  material.pbrMetallicRoughness.baseColorTexture = { index: textureIndexByName[colorTexture], texCoord: 0 };
  material.pbrMetallicRoughness.baseColorFactor = fallbackColors[index] || [1, 1, 1, 1];
  material.pbrMetallicRoughness.metallicFactor = index === 1 ? 0.48 : 0.18;
  material.pbrMetallicRoughness.roughnessFactor = index === 1 ? 0.7 : 0.86;
  if (normalTexture) material.normalTexture = { index: textureIndexByName[normalTexture], texCoord: 0, scale: 0.65 };
  material.extras = { ...(material.extras || {}), meshyCompatibility: 'image.uri data texture embedded in single GLB JSON' };
}
setMaterialTexture(0, 'olive_albedo', 'olive_normal');
setMaterialTexture(1, 'olive_albedo', 'olive_normal');
setMaterialTexture(2, 'tread_albedo', 'tread_normal');
setMaterialTexture(3, 'tread_albedo', 'tread_normal');
for (const index of [4, 5, 6]) {
  const material = materials[index];
  if (!material) continue;
  material.name = ['alphaCrimsonRecognitionPaint', 'alphaChalkMarking', 'alphaDustScratches'][index - 4];
  material.pbrMetallicRoughness = material.pbrMetallicRoughness || {};
  material.pbrMetallicRoughness.baseColorFactor = fallbackColors[index];
  material.pbrMetallicRoughness.metallicFactor = 0.02;
  material.pbrMetallicRoughness.roughnessFactor = 0.92;
  material.extras = { ...(material.extras || {}), alphaCharacterMaterial: true, sourceReference: 'newest Downloads alpha tank image' };
}
json.asset = json.asset || { version: '2.0' };
json.asset.generator = 'scripts/pack_alpha_sherman_for_meshy.mjs';
json.extras = {
  ...(json.extras || {}),
  packed_for: 'Meshy single-file GLB upload / Alpha player Sherman',
  texture_pack_mode: 'image.uri data URLs inside GLB JSON',
  embedded_texture_count: textureSources.length,
  source_glb: 'public/tftm/models/alpha_sherman_combined/alpha_sherman.glb',
  alpha_reference_image: '/storage/emulated/0/Download/file_00000000544c720ca6775c5f5fb2a678 (1).png'
};
mkdirSync(outputDir, { recursive: true });
writeGlb(outputGlb, json, bin);
writeFileSync(outputManifest, JSON.stringify({
  asset_id: 'alpha_sherman_meshy_single_file',
  display_name: 'Alpha Sherman Meshy Single File GLB',
  generated_at: new Date().toISOString(),
  generator: 'scripts/pack_alpha_sherman_for_meshy.mjs',
  source_glb: 'public/tftm/models/alpha_sherman_combined/alpha_sherman.glb',
  alpha_reference_image: '/storage/emulated/0/Download/file_00000000544c720ca6775c5f5fb2a678 (1).png',
  output_glb: 'public/tftm/models/alpha_sherman_meshy_single_file/alpha_sherman_meshy_single_file.glb',
  texture_pack_mode: 'data-uri images embedded in GLB JSON for Meshy importer compatibility',
  embedded_textures: textureSources.map((item) => 'assets/generated/openai/sherman_runtime_pbr_v1/' + item.file),
  note: 'Player-character Alpha Sherman. Use this file for Meshy upload; data-uri textures plus geometry decals preserve identity if importer drops PBR.'
}, null, 2) + '\n');
console.log(JSON.stringify({ outputGlb, bytes: readFileSync(outputGlb).length, embeddedTextures: textureSources.length }, null, 2));

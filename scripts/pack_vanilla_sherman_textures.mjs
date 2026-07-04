import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const root = process.cwd();
const sourceGlb = path.join(root, 'public', 'tftm', 'models', 'vanilla_sherman_combined', 'vanilla_sherman.glb');
const outputDir = path.join(root, 'public', 'tftm', 'models', 'vanilla_sherman_packed');
const outputGlb = path.join(outputDir, 'vanilla_sherman_packed.glb');
const outputManifest = path.join(outputDir, 'model_manifest.json');
const textureDir = path.join(root, 'assets', 'generated', 'openai', 'sherman_runtime_pbr_v1');
const textureSources = [
  { name: 'olive_albedo', file: 'olive_albedo.png', mimeType: 'image/png' },
  { name: 'olive_normal', file: 'olive_normal.png', mimeType: 'image/png' },
  { name: 'tread_albedo', file: 'tread_albedo.png', mimeType: 'image/png' },
  { name: 'tread_normal', file: 'tread_normal.png', mimeType: 'image/png' },
  { name: 'tread_roughness', file: 'tread_roughness.png', mimeType: 'image/png' }
];

function align4(value) {
  return (value + 3) & ~3;
}

function readGlb(file) {
  const glb = readFileSync(file);
  if (glb.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB');
  const version = glb.readUInt32LE(4);
  if (version !== 2) throw new Error('unsupported GLB version ' + version);
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

function padBuffer(buffer, padByte = 0x00) {
  const padded = Buffer.alloc(align4(buffer.length), padByte);
  buffer.copy(padded);
  return padded;
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

const { json, bin: originalBin } = readGlb(sourceGlb);
const buffers = ensureArray(json, 'buffers');
const bufferViews = ensureArray(json, 'bufferViews');
const images = ensureArray(json, 'images');
const textures = ensureArray(json, 'textures');
const materials = ensureArray(json, 'materials');
if (buffers.length !== 1) throw new Error('expected one GLB buffer');
let bin = Buffer.from(originalBin);
const textureIndexByName = {};
for (const source of textureSources) {
  const bytes = readFileSync(path.join(textureDir, source.file));
  const byteOffset = align4(bin.length);
  if (byteOffset > bin.length) bin = Buffer.concat([bin, Buffer.alloc(byteOffset - bin.length)]);
  const byteLength = bytes.length;
  bin = Buffer.concat([bin, bytes]);
  const bufferView = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset, byteLength, name: source.name + '_bufferView' });
  const image = images.length;
  images.push({ name: source.name, mimeType: source.mimeType, bufferView });
  const texture = textures.length;
  textures.push({ name: source.name, source: image });
  textureIndexByName[source.name] = texture;
}
buffers[0].byteLength = align4(bin.length);

function setMaterialTexture(index, colorTexture, normalTexture, roughnessTexture) {
  const material = materials[index];
  if (!material) return;
  material.pbrMetallicRoughness = material.pbrMetallicRoughness || {};
  material.pbrMetallicRoughness.baseColorTexture = { index: textureIndexByName[colorTexture] };
  material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
  material.pbrMetallicRoughness.metallicFactor = index === 1 ? 0.55 : 0.24;
  material.pbrMetallicRoughness.roughnessFactor = index === 1 ? 0.72 : 0.82;
  if (roughnessTexture) {
    // Kept as an extra texture reference for consumers that inspect packed texture inventory.
    material.extras = { ...(material.extras || {}), roughnessTextureName: roughnessTexture, packedTextureSource: 'openai_sherman_runtime_pbr_v1' };
  }
  if (normalTexture) material.normalTexture = { index: textureIndexByName[normalTexture], scale: 0.65 };
}

setMaterialTexture(0, 'olive_albedo', 'olive_normal');
setMaterialTexture(1, 'olive_albedo', 'olive_normal');
setMaterialTexture(2, 'tread_albedo', 'tread_normal', 'tread_roughness');
setMaterialTexture(3, 'tread_albedo', 'tread_normal', 'tread_roughness');
json.asset = json.asset || { version: '2.0' };
json.asset.generator = 'scripts/pack_vanilla_sherman_textures.mjs';
json.extras = {
  ...(json.extras || {}),
  packed_for: 'single-file Meshy upload / interchange',
  source_glb: 'public/tftm/models/vanilla_sherman_combined/vanilla_sherman.glb',
  embedded_texture_count: textureSources.length
};
mkdirSync(outputDir, { recursive: true });
writeGlb(outputGlb, json, bin);
writeFileSync(outputManifest, JSON.stringify({
  asset_id: 'vanilla_sherman_packed',
  display_name: 'Vanilla Sherman Packed GLB',
  generated_at: new Date().toISOString(),
  generator: 'scripts/pack_vanilla_sherman_textures.mjs',
  source_glb: 'public/tftm/models/vanilla_sherman_combined/vanilla_sherman.glb',
  output_glb: 'public/tftm/models/vanilla_sherman_packed/vanilla_sherman_packed.glb',
  embedded_textures: textureSources.map((item) => 'assets/generated/openai/sherman_runtime_pbr_v1/' + item.file),
  note: 'Single GLB with embedded PNG texture images. Source component GLBs remain separate for animation/runtime work.'
}, null, 2) + '\n');
console.log(JSON.stringify({ outputGlb, bytes: readFileSync(outputGlb).length, embeddedTextures: textureSources.length }, null, 2));

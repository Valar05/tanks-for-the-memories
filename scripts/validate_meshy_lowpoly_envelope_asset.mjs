#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'tftm', 'models', 'meshy_sherman_lowpoly_envelope_v1');
const manifestFile = path.join(dir, 'lowpoly_manifest.json');
const required = ['lowpoly_hull_envelope', 'lowpoly_turret_envelope', 'lowpoly_treads_envelope'];
function fail(message) { console.error('[meshy-lowpoly-envelope-smoke] ' + message); process.exit(1); }
function text(rel) { return readFileSync(path.join(root, rel), 'utf8'); }
function expect(source, token, label) { if (!source.includes(token)) fail((label || 'source') + ' missing ' + token); }
function reject(source, token, label) { if (source.includes(token)) fail((label || 'source') + ' must not include stale token ' + token); }
function glbJson(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') fail('invalid GLB header: ' + path.relative(root, file));
  let offset = 12;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    if (type === 'JSON') return JSON.parse(data.toString('utf8', offset + 8, offset + 8 + length).trim());
    offset += 8 + length;
  }
  fail('missing GLB JSON: ' + path.relative(root, file));
}
if (!existsSync(manifestFile)) fail('missing lowpoly_manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
if (manifest.asset_id !== 'meshy_sherman_lowpoly_envelope_v1') fail('asset id mismatch');
for (const phrase of ['Direct Meshy lowpoly image-to-3D', 'No high-to-low pipeline', 'no local decimation']) if (!String(manifest.source_policy || '').includes(phrase)) fail('source policy missing ' + phrase);
for (const id of required) {
  const part = manifest.parts?.[id];
  if (!part) fail('missing part ' + id);
  if (part.requested?.model_type !== 'lowpoly') fail(id + ' must be generated with model_type lowpoly');
  if (!(part.requested?.target_polycount > 0)) fail(id + ' missing target_polycount');
  if (part.requested?.enable_pbr !== true || part.requested?.hd_texture !== true) fail(id + ' must request PBR and HD texture');
  if (!String(part.generation_policy || '').includes('no Blender decimation')) fail(id + ' missing no-decimation policy');
  if (part.unique_positions > part.budget.max_unique_positions) fail(id + ' unique positions exceed budget');
  if (part.triangles > part.budget.max_triangles) fail(id + ' triangles exceed budget');
  const sourceManifest = JSON.parse(text(part.source_manifest));
  const payload = sourceManifest.provenance?.find((entry) => entry.step === 'image_to_3d')?.payload || {};
  if (payload.model_type !== 'lowpoly') fail(id + ' source provenance does not prove lowpoly generation');
  const json = glbJson(path.join(root, part.runtime_glb));
  if (!(json.images?.length > 0) || !(json.textures?.length > 0)) fail(id + ' runtime GLB lacks embedded texture payload');
  if (!json.materials?.some((material) => material.pbrMetallicRoughness?.baseColorTexture)) fail(id + ' runtime GLB lacks baseColorTexture');
  if (!json.materials?.some((material) => material.normalTexture)) fail(id + ' runtime GLB lacks normalTexture');
}
const links = text('src/sherman-asset-links.ts');
expect(links, 'MESHY_SHERMAN_LOWPOLY_ENVELOPE_MANIFEST_URL', 'asset links');
const editor = text('src/assembled-tank.ts');
for (const token of ['MESHY_SHERMAN_LOWPOLY_ENVELOPE_MANIFEST_URL', 'lowpoly_hull_envelope', 'lowpoly_turret_envelope', 'lowpoly_treads_envelope', 'Preserve source Meshy materials']) expect(editor, token, 'assembled-tank editor');
for (const stale of ['MESHY_SHERMAN_COMPONENT_ASSEMBLY_MANIFEST_URL', 'normalizeObjectToBboxCenter', 'applySharedPartMaterial']) reject(editor, stale, 'assembled-tank editor');
console.log(JSON.stringify({ ok: true, manifest: path.relative(root, manifestFile), parts: required.length }, null, 2));

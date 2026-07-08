#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kitDir = path.join(root, 'public', 'tftm', 'models', 'meshy_sherman_envelope_assembly_v1');
const manifestFile = path.join(kitDir, 'envelope_manifest.json');
const required = ['hull_envelope', 'turret_kit_envelope', 'meshy_treads_envelope'];
function fail(message) { console.error('[meshy-envelope-assembly-smoke] ' + message); process.exit(1); }
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
  fail('missing GLB JSON chunk: ' + path.relative(root, file));
}
if (!existsSync(manifestFile)) fail('missing envelope_manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
if (manifest.asset_id !== 'meshy_sherman_envelope_assembly_v1') fail('manifest asset_id mismatch');
if (!String(manifest.source_policy || '').includes('Whole Meshy source envelopes copied intact')) fail('manifest must encode whole-envelope policy');
if (!String(manifest.runtime_contract?.turret || '').includes('source grouping')) fail('turret contract must preserve source grouping');
for (const id of required) {
  const part = manifest.parts?.[id];
  if (!part) fail('missing envelope part ' + id);
  if (!String(part.envelope_policy || '').includes('no internal component extraction')) fail(id + ' missing envelope policy');
  const file = path.join(root, part.runtime_glb);
  if (!existsSync(file)) fail('missing runtime GLB for ' + id);
  const json = glbJson(file);
  if (!(json.images?.length > 0) || !(json.textures?.length > 0)) fail(id + ' runtime GLB lacks embedded textures');
  if (!json.materials?.some((material) => material.pbrMetallicRoughness?.baseColorTexture)) fail(id + ' runtime GLB lacks baseColorTexture material');
  if (!(part.triangles > 0) || !(part.vertices > 0)) fail(id + ' must have positive geometry counts');
}
const editor = text('src/assembled-tank.ts');
for (const token of [
  'MESHY_SHERMAN_ENVELOPE_ASSEMBLY_MANIFEST_URL',
  'hull_envelope',
  'turret_kit_envelope',
  'meshy_treads_envelope',
  'selectionBox',
  'tagTunePart',
  'Preserve source Meshy materials',
  'AUTHORED_SHERMAN_TREADS_GLB_URL',
  'data-toggle-lock',
  'componentAssemblyTune'
]) expect(editor, token, 'assembled-tank editor');
for (const stale of ['normalizeObjectToBboxCenter', 'applySharedPartMaterial', 'hull_shell', 'turret_shell', 'commander_hatch', 'loader_hatch', 'main_barrel', 'coax_mg', 'roof_cap']) reject(editor, stale, 'assembled-tank editor');
const links = text('src/sherman-asset-links.ts');
expect(links, 'MESHY_SHERMAN_ENVELOPE_ASSEMBLY_MANIFEST_URL', 'asset links');
const parade = text('src/authored-parade.ts');
for (const token of ['const spawnTarget = 24', 'new THREE.InstancedMesh']) expect(parade, token, 'authored parade runtime');
console.log(JSON.stringify({ ok: true, manifest: path.relative(root, manifestFile), envelopes: required.length }, null, 2));

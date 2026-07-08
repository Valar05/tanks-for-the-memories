#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kitDir = path.join(root, 'public', 'tftm', 'models', 'meshy_sherman_component_assembly_v1');
const manifestFile = path.join(kitDir, 'component_manifest.json');
const requiredParts = [
  'hull_shell',
  'turret_shell',
  'commander_hatch',
  'loader_hatch',
  'main_barrel',
  'coax_mg',
  'roof_cap',
  'tread_foot',
  'road_wheel',
  'small_runner',
  'running_gear_rail',
  'sprocket_like'
];
function fail(message) {
  console.error('[meshy-component-assembly-smoke] ' + message);
  process.exit(1);
}
function readText(rel) { return readFileSync(path.join(root, rel), 'utf8'); }
function assertIncludes(source, token, label) { if (!source.includes(token)) fail((label || 'source') + ' missing ' + token); }
function assertNoIncludes(source, token, label) { if (source.includes(token)) fail((label || 'source') + ' must not include stale token ' + token); }
function assertGlb(file) {
  const data = readFileSync(file);
  if (data.length < 20) fail('GLB too small: ' + path.relative(root, file));
  if (data.toString('utf8', 0, 4) !== 'glTF') fail('invalid GLB header: ' + path.relative(root, file));
  if (data.readUInt32LE(4) !== 2) fail('unsupported GLB version: ' + path.relative(root, file));
}
if (!existsSync(manifestFile)) fail('missing component_manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
if (manifest.asset_id !== 'meshy_sherman_component_assembly_v1') fail('manifest asset_id mismatch');
if (!String(manifest.source_policy || '').includes('no retopo, no decimation')) fail('manifest must preserve no-retopo/no-decimation policy');
if (!String(manifest.runtime_contract?.turret || '').includes('no separate mantlet')) fail('manifest must encode fused mantlet turret contract');
if (!String(manifest.runtime_contract?.parade || '').includes('24 tanks')) fail('manifest must encode 24-tank instancing contract');
for (const id of requiredParts) {
  const part = manifest.parts?.[id];
  if (!part) fail('manifest missing part ' + id);
  for (const key of ['runtime_url', 'source_image', 'source_glb', 'default_transform', 'area', 'runtime_role']) if (part[key] === undefined) fail(id + ' missing ' + key);
  const file = path.join(root, part.runtime_glb || ('public/tftm/models/meshy_sherman_component_assembly_v1/' + id + '.glb'));
  if (!existsSync(file)) fail('missing runtime GLB for ' + id + ': ' + path.relative(root, file));
  assertGlb(file);
  if (!(part.triangles > 0) || !(part.vertices > 0)) fail(id + ' must have positive geometry counts');
}
if (manifest.parts.mantlet_socket) fail('component kit must not revive stale separate mantlet_socket');
const editor = readText('src/assembled-tank.ts');
for (const token of [
  'MESHY_SHERMAN_COMPONENT_ASSEMBLY_MANIFEST_URL',
  'data-area="hull"',
  'data-area="treads"',
  'data-area="turret"',
  'data-toggle-lock',
  'lockedSelection || pickTunePart',
  'turretTraversePivot',
  'cannonElevationPivot',
  'main_barrel',
  'coax_mg',
  'commander_hatch',
  'loader_hatch',
  'AUTHORED_SHERMAN_TREADS_GLB_URL',
  "localStorage.setItem('tftm.meshyComponentAssemblyTune.v1'",
  'componentAssemblyTune',
  'normalizeObjectToBboxCenter',
  'clone()'
]) assertIncludes(editor, token, 'assembled-tank editor');
assertNoIncludes(editor, 'MESHY_SHERMAN_MANTLET_SOCKET_GLB_URL', 'assembled-tank editor');
assertNoIncludes(editor, 'mantlet_socket', 'assembled-tank editor');
const links = readText('src/sherman-asset-links.ts');
for (const token of ['MESHY_SHERMAN_COMPONENT_ASSEMBLY_BASE_URL', 'MESHY_SHERMAN_COMPONENT_ASSEMBLY_MANIFEST_URL']) assertIncludes(links, token, 'asset links');
const parade = readText('src/authored-parade.ts');
for (const token of ['const spawnTarget = 24', 'new THREE.InstancedMesh', 'AUTHORED_SHERMAN_TREADS_GLB_URL']) assertIncludes(parade, token, 'authored parade runtime');
console.log(JSON.stringify({ ok: true, manifest: path.relative(root, manifestFile), parts: requiredParts.length }, null, 2));

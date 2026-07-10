#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assetId = 'real_sherman_upper_hull_manufactured_scratch_v07';
const base = path.join(root, 'archive/scratch/20260708-real-sherman-chassis-scratch/models', assetId);
const requiredFiles = ['model_manifest.json', 'measurement_report.json', 'authored_solids.json', 'topology_report.json', 'per_region_error_report.json', 'template_report.json'];
const forbiddenFiles = ['interface_report.json'];
const requiredMeasurements = ['centerline', 'hull_width', 'hull_length', 'glacis_plane_angle_degrees', 'front_height', 'left_shoulder_station', 'right_shoulder_station', 'turret_ring_center', 'turret_ring_radius', 'deck_height', 'side_return_depth'];
const requiredSolids = ['lower_front', 'upper_glacis', 'left_cheek', 'right_cheek', 'left_side', 'right_side', 'rear_deck', 'turret_ring_support'];

function fail(message) {
  console.error(`upper-hull-v07 template contract failed: ${message}`);
  process.exit(1);
}
function readJson(rel) {
  const file = path.join(base, rel);
  if (!fs.existsSync(file)) fail(`missing ${path.relative(root, file)}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
if (!fs.existsSync(base)) fail(`missing asset directory ${path.relative(root, base)}`);
for (const f of requiredFiles) readJson(f);
for (const f of forbiddenFiles) {
  if (fs.existsSync(path.join(base, f))) fail(`forbidden stale recovery artifact exists: ${f}`);
}
const manifest = readJson('model_manifest.json');
const measurement = readJson('measurement_report.json');
const solids = readJson('authored_solids.json');
const topology = readJson('topology_report.json');
const perRegion = readJson('per_region_error_report.json');
const template = readJson('template_report.json');

if (manifest.asset_id !== assetId) fail(`manifest asset_id mismatch: ${manifest.asset_id}`);
if (manifest.construction_strategy !== 'parametric_sherman_template') fail(`unexpected construction strategy ${manifest.construction_strategy}`);
if (!manifest.contract_assertions?.template_owned_topology) fail('missing template-owned topology assertion');
if (!manifest.contract_assertions?.source_vertex_influence_dimensions_only) fail('missing dimensions-only assertion');
if (!manifest.contract_assertions?.turret_ring_authored_opening) fail('missing authored ring opening assertion');
if (!manifest.contract_assertions?.source_topology_discarded) fail('missing source topology discarded assertion');
if (manifest.construction_strategy.match(/interface|recovery|surface/i)) fail('manifest strategy still references old architecture');

for (const name of requiredMeasurements) {
  const m = measurement.measurements?.[name];
  if (!m) fail(`missing measurement ${name}`);
  if (m.raw_value === undefined || m.final_constrained_value === undefined) fail(`measurement ${name} missing raw/final values`);
}
if (measurement.policy !== 'measure numbers only; source topology is discarded') fail('measurement policy does not discard source topology');

if (solids.final_boundary_source !== 'template_topology') fail(`final boundary source is ${solids.final_boundary_source}`);
if (solids.source_vertex_influence !== 'dimensions_only') fail('solids do not declare dimensions-only source influence');
const regionNames = new Set((solids.regions || []).map(r => r.name));
for (const name of requiredSolids) if (!regionNames.has(name)) fail(`missing template solid ${name}`);
for (const r of solids.regions || []) {
  if (r.final_boundary_source !== 'template_topology') fail(`region ${r.name} boundary source is not template_topology`);
  if (r.source_vertex_influence !== 'dimensions_only') fail(`region ${r.name} source influence is not dimensions_only`);
}
const ring = (solids.regions || []).find(r => r.name === 'turret_ring_support');
if (!ring?.authored_opening) fail('turret ring support does not declare authored opening');

if (template.topology_owner !== 'generator') fail('template topology owner is not generator');
if (template.source_vertex_influence !== 'dimensions_only') fail('template source influence is not dimensions_only');
for (const name of requiredSolids) if (!template.template_solids?.includes(name)) fail(`template report missing ${name}`);

if (topology.topology_status !== 'pass') fail(`topology is ${topology.topology_status}`);
if (topology.boundary_edges_total !== 0) fail(`boundary edges ${topology.boundary_edges_total}`);
if (topology.nonmanifold_edges_total !== 0) fail(`nonmanifold edges ${topology.nonmanifold_edges_total}`);
if ((topology.duplicate_coincident_faces || 0) !== 0) fail(`duplicate coincident faces ${topology.duplicate_coincident_faces}`);
for (const r of topology.object_reports || []) {
  if (r.template_owned_topology !== true) fail(`object ${r.object} is not template-owned topology`);
}
for (const metric of ['aggregate', 'left_silhouette', 'right_silhouette', 'front_silhouette', 'deck_region']) {
  if (!perRegion.metrics?.[metric]) fail(`missing diagnostic metric ${metric}`);
}
if (perRegion.seam_metrics?.maximum_seam_gap === undefined) fail('missing maximum seam gap');
if (perRegion.seam_metrics?.maximum_unintended_overlap === undefined) fail('missing maximum unintended overlap');
console.log(`upper-hull-v07 template contract passed for ${assetId}`);

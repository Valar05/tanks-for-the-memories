#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assetId = 'real_sherman_upper_hull_manufactured_scratch_v07';
const base = path.join(root, 'archive/scratch/20260708-real-sherman-chassis-scratch/models', assetId);
const requiredFiles = [
  'model_manifest.json',
  'measurement_report.json',
  'authored_solids.json',
  'topology_report.json',
  'per_region_error_report.json',
  'interface_report.json',
];
const requiredInterfaces = [
  'front_lower_edge',
  'left_outer_silhouette',
  'right_outer_silhouette',
  'left_shoulder_break',
  'right_shoulder_break',
  'deck_break',
  'socket_front_tangent',
  'socket_rear_tangent',
];

function fail(message) {
  console.error(`upper-hull-v07 contract failed: ${message}`);
  process.exit(1);
}
function readJson(rel) {
  const file = path.join(base, rel);
  if (!fs.existsSync(file)) fail(`missing ${path.relative(root, file)}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
if (!fs.existsSync(base)) fail(`missing asset directory ${path.relative(root, base)}`);
for (const f of requiredFiles) readJson(f);
const manifest = readJson('model_manifest.json');
const measurement = readJson('measurement_report.json');
const solids = readJson('authored_solids.json');
const topology = readJson('topology_report.json');
const perRegion = readJson('per_region_error_report.json');
const iface = readJson('interface_report.json');

if (manifest.asset_id !== assetId) fail(`manifest asset_id mismatch: ${manifest.asset_id}`);
if (!manifest.contract_assertions?.canonical_shared_interface_ownership) fail('missing canonical shared interface assertion');
if (!manifest.contract_assertions?.no_cluster_hull_final_boundary) fail('missing no cluster hull assertion');
if (!manifest.contract_assertions?.left_right_mirrored_structural_baseline) fail('missing mirrored baseline assertion');
if (!manifest.contract_assertions?.per_region_metrics_present) fail('missing per-region metrics assertion');
if (manifest.construction_strategy !== 'manufactured_interface_model') fail(`unexpected construction strategy ${manifest.construction_strategy}`);

const interfaces = iface.interfaces || {};
for (const name of requiredInterfaces) {
  const entry = interfaces[name];
  if (!entry) fail(`missing interface ${name}`);
  if (!entry.owner) fail(`interface ${name} has no owner`);
  if (!entry.canonical_representation) fail(`interface ${name} has no canonical representation`);
  if (!Array.isArray(entry.consumers) || entry.consumers.length < 1) fail(`interface ${name} has no consumers`);
}
const ownerKeys = Object.entries(interfaces).map(([name, entry]) => `${name}:${entry.owner}`);
if (new Set(ownerKeys).size !== ownerKeys.length) fail('duplicate interface ownership records');

if (solids.final_boundary_source === 'cluster_convex_hull') fail('cluster convex hull marked as final boundary source');
if (solids.no_cluster_hull_as_final_boundary !== true) fail('no_cluster_hull_as_final_boundary not true');
const major = solids.regions?.filter(r => r.kind === 'major_hull_solid') || [];
if (major.length < 6 || major.length > 8) fail(`expected 6-8 major hull solids, found ${major.length}`);
for (const region of major) {
  if (!Array.isArray(region.interfaces) || region.interfaces.length === 0) fail(`region ${region.name} does not consume canonical interfaces`);
}

if (measurement.mirror_policy?.baseline !== 'cleaner_side_mirrored') fail('missing cleaner-side mirrored baseline policy');
for (const name of requiredInterfaces) {
  const station = measurement.measured_stations?.[name];
  if (!station) fail(`missing measured station ${name}`);
  if (station.raw_value === undefined || station.final_constrained_value === undefined) fail(`station ${name} missing raw/final value`);
}

if (topology.topology_status !== 'pass') fail(`topology is ${topology.topology_status}`);
if (topology.boundary_edges_total !== 0) fail(`boundary edges ${topology.boundary_edges_total}`);
if (topology.nonmanifold_edges_total !== 0) fail(`nonmanifold edges ${topology.nonmanifold_edges_total}`);
if ((topology.duplicate_coincident_faces || 0) !== 0) fail(`duplicate coincident faces ${topology.duplicate_coincident_faces}`);

for (const metric of ['aggregate', 'left_silhouette', 'right_silhouette', 'front_silhouette', 'deck_region']) {
  if (!perRegion.metrics?.[metric]) fail(`missing per-region metric ${metric}`);
}
for (const region of major.map(r => r.name)) {
  const m = perRegion.region_depth_errors?.[region];
  if (!m || m.mean_abs_depth_error === undefined || m.p95_abs_depth_error === undefined) fail(`missing depth metrics for ${region}`);
}
if (perRegion.seam_metrics?.maximum_seam_gap === undefined) fail('missing maximum seam gap');
if (perRegion.seam_metrics?.maximum_unintended_overlap === undefined) fail('missing maximum unintended overlap');

console.log(`upper-hull-v07 contract passed for ${assetId}`);

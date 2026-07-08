#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const reportPath = process.argv[2] || 'generated/asset-intake/latest/report.json';
if (!existsSync(reportPath)) {
  console.error('missing asset intake report: ' + reportPath);
  process.exit(1);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const failures = [];
if (report.schema !== 'tftm.asset-intake-report.v1') failures.push('unexpected schema ' + report.schema);
if (!Array.isArray(report.pairs) || report.pairs.length === 0) failures.push('report has no pairs');
if (!report.sourcePolicy || !report.sourcePolicy.includes('diagnostic intake only')) failures.push('source policy does not preserve diagnostic-only status');
for (const pair of report.pairs || []) {
  if (!pair.id) failures.push('pair missing id');
  if (!pair.label) failures.push((pair.id || 'pair') + ' missing label');
  if (!['usable_lowpoly', 'usable_reference_only', 'needs_retopo', 'reject'].includes(pair.verdict)) failures.push((pair.id || 'pair') + ' invalid verdict ' + pair.verdict);
  if (!Array.isArray(pair.reasons) || pair.reasons.length < 2) failures.push((pair.id || 'pair') + ' needs practical verdict reasons');
  if (!pair.image?.stagedUrl) failures.push((pair.id || 'pair') + ' missing staged image URL');
  if (!pair.model?.stagedUrl) failures.push((pair.id || 'pair') + ' missing staged model URL');
  if (!Number.isFinite(pair.model?.triangles) || pair.model.triangles <= 0) failures.push((pair.id || 'pair') + ' missing triangle count');
  if (!Number.isFinite(pair.model?.vertices) || pair.model.vertices <= 0) failures.push((pair.id || 'pair') + ' missing vertex count');
  if (!Number.isFinite(pair.model?.meshCount) || pair.model.meshCount <= 0) failures.push((pair.id || 'pair') + ' missing mesh count');
  if (!pair.model?.bbox?.size || pair.model.bbox.size.length !== 3) failures.push((pair.id || 'pair') + ' missing bbox size');
  if (!Number.isFinite(pair.model?.geometryIslands?.islandCount) || pair.model.geometryIslands.islandCount <= 0) failures.push((pair.id || 'pair') + ' missing geometry island count');
  if (!Array.isArray(pair.model?.geometryIslands?.topIslands) || pair.model.geometryIslands.topIslands.length === 0) failures.push((pair.id || 'pair') + ' missing top geometry islands');
}
const labels = new Set((report.pairs || []).map((pair) => pair.label));
for (const expected of ['hull', 'turret', 'treads']) {
  if (!labels.has(expected)) failures.push('missing expected label ' + expected);
}
if (!report.summary || Object.values(report.summary).reduce((a, b) => a + Number(b || 0), 0) !== report.pairs.length) failures.push('summary counts do not match pair count');
if (failures.length) {
  console.error('asset intake report failed validation:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, report: reportPath, pairs: report.pairs.length, summary: report.summary }, null, 2));

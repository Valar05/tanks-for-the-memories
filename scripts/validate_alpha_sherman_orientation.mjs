import { readFileSync } from 'node:fs';

const file = 'public/tftm/models/alpha_sherman_combined/alpha_sherman.glb';
const failures = [];
function fail(message) { failures.push(message); }
function readGlbJson(path) {
  const data = readFileSync(path);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'JSON') return JSON.parse(data.toString('utf8', start, start + length).trim());
    offset = start + length;
  }
  throw new Error('GLB JSON chunk missing');
}
function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function translation(x, y, z) {
  const m = identity();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
function quatToMatrix(q) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1
  ];
}
function scaleMatrix(x, y, z) {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      for (let k = 0; k < 4; k += 1) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
    }
  }
  return out;
}
function localMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  let m = identity();
  if (node.translation) m = multiply(m, translation(...node.translation));
  if (node.rotation) m = multiply(m, quatToMatrix(node.rotation));
  if (node.scale) m = multiply(m, scaleMatrix(...node.scale));
  return m;
}
function transformPoint(m, p) {
  const [x, y, z] = p;
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}
function worldMatrices(json) {
  const nodes = json.nodes || [];
  const worlds = new Map();
  function visit(index, parent) {
    const world = multiply(parent, localMatrix(nodes[index] || {}));
    worlds.set(index, world);
    for (const child of nodes[index]?.children || []) visit(child, world);
  }
  for (const sceneIndex of json.scenes?.[json.scene || 0]?.nodes || []) visit(sceneIndex, identity());
  return worlds;
}
function findNode(json, name) {
  return (json.nodes || []).findIndex((node) => node.name === name);
}

const json = readGlbJson(file);
const worlds = worldMatrices(json);
const turretIndex = findNode(json, 'turret_traverse_pivot');
const gunIndex = findNode(json, 'cannon_elevation_pivot');
const barrelIndex = findNode(json, 'barrel_only_meshy');
const coaxialIndex = findNode(json, 'coaxial_mg_meshy');
const bowIndex = findNode(json, 'bow_mg_meshy');
for (const [label, index] of [['turret', turretIndex], ['gun pivot', gunIndex], ['barrel', barrelIndex], ['coaxial mg', coaxialIndex], ['bow mg', bowIndex]]) {
  if (index < 0) fail(`missing ${label} node`);
}
if (!failures.length) {
  const turret = transformPoint(worlds.get(turretIndex), [0, 0, 0]);
  const gun = transformPoint(worlds.get(gunIndex), [0, 0, 0]);
  const barrelWorld = worlds.get(barrelIndex);
  const coaxialWorld = worlds.get(coaxialIndex);
  const barrelRear = transformPoint(barrelWorld, [-0.55, 0, 0]);
  const barrelMuzzle = transformPoint(barrelWorld, [0.55, 0, 0]);
  const coaxialRear = transformPoint(coaxialWorld, [-0.36, 0, 0]);
  const coaxialMuzzle = transformPoint(coaxialWorld, [0.36, 0, 0]);
  const coaxialCenter = transformPoint(coaxialWorld, [0, 0, 0]);
  const bowWorld = worlds.get(bowIndex);
  const bowRear = transformPoint(bowWorld, [-0.36, 0, 0]);
  const bowMuzzle = transformPoint(bowWorld, [0.36, 0, 0]);
  const bowCenter = transformPoint(bowWorld, [0, 0, 0]);
  if (!(gun[0] > turret[0])) fail('cannon pivot must sit forward of turret pivot on +X');
  if (!(barrelMuzzle[0] > barrelRear[0])) fail('barrel muzzle must point forward on +X, not backward through turret');
  if (!(barrelRear[0] <= gun[0] + 0.18 && barrelMuzzle[0] > gun[0] + 0.35)) fail('barrel must be seated near gun pivot and extend forward visibly');
  if (!(coaxialMuzzle[0] > coaxialRear[0])) fail('coaxial MG must point +X with the cannon');
  if (!(coaxialMuzzle[0] - coaxialRear[0] > 0.58)) fail('coaxial MG must be long enough to read at phone distance');
  if (!(coaxialCenter[0] > gun[0] + 0.18)) fail('coaxial MG must be pulled forward of the mantlet mass so it is not buried');
  if (!(coaxialCenter[2] > gun[2] + 0.22)) fail('coaxial MG must keep visible side offset from the cannon line');
  if (Math.abs(coaxialCenter[1] - gun[1]) > 0.22) fail('coaxial MG must remain seated at cannon height, not roof-mounted');
  if (!(bowMuzzle[0] > bowRear[0])) fail('bow MG must point +X with the hull front');
  if (!(bowCenter[0] > 0.95 && bowCenter[1] > 0.12 && bowCenter[2] > 0.22)) fail('bow MG must sit visibly on front hull, not inside the body');
}
const source = readFileSync('scripts/export_alpha_sherman_variant.mjs', 'utf8');
if (!source.includes('coaxial_mg_meshy')) fail('alpha exporter must include parade-style visible coaxial MG');
if (!source.includes('bow_mg_meshy')) fail('alpha exporter must include visible fixed bow MG');
if (!source.includes('bakeBarrelGeometryWithRearPivot')) fail('alpha exporter must bake barrel geometry to rear pivot');
if (!source.includes("barrel.position.set(-0.08, 0, 0)")) fail('alpha exporter must seat barrel rear at gun pivot offset');
if (!source.includes('anti_personnel_visibility_tune')) fail('alpha exporter must record MG visibility tuning');
if (failures.length) {
  console.error('Alpha Sherman orientation validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Alpha Sherman orientation validation passed: hull front +X, cannon pivot forward, barrel, parade-style coaxial MG, and bow MG extend forward.');

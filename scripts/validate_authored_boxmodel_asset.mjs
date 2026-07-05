import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const failures = [];
const assetId = 'authored_sherman_boxmodel_v1';
const glbPath = 'public/tftm/models/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.glb';
const manifestPath = 'public/tftm/models/authored_sherman_boxmodel_v1/model_manifest.json';
const blendPath = 'assets/authored/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.blend';
const blenderScriptPath = 'scripts/export_authored_sherman_boxmodel.py';
const wrapperPath = 'scripts/export_authored_sherman_boxmodel.mjs';
const facePlateIds = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side'];
const requiredNodes = ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','commander_hatch__turret_top','left_flush_glacis_shoulder__hull_left','right_flush_glacis_shoulder__hull_right','left_low_front_track_cheek__hull_left','right_low_front_track_cheek__hull_right','left_vertical_shoulder_gap_web__hull_left','right_vertical_shoulder_gap_web__hull_right','left_visible_glacis_slot_wall__hull_left','right_visible_glacis_slot_wall__hull_right','left_sloped_sponson__hull_left','right_sloped_sponson__hull_right','left_front_track_well_slot_wall__hull_left','right_front_track_well_slot_wall__hull_right','left_rear_track_well_slot_wall__hull_left','right_rear_track_well_slot_wall__hull_right'];
function fail(message) { failures.push(message); }
function read(file) { return readFileSync(file, 'utf8'); }
function parseGlbChunks(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  let json = null;
  let binary = null;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'JSON') json = JSON.parse(data.toString('utf8', start, start + length).trim());
    if (type === 'BIN\0') binary = data.subarray(start, start + length);
    offset += 8 + length;
  }
  if (!json) throw new Error('GLB JSON chunk missing');
  return { json, binary };
}
function parseGlbJson(file) {
  return parseGlbChunks(file).json;
}
function glbTriangles(json) {
  let triangles = 0;
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
      if (accessor?.count) triangles += Math.floor(accessor.count / 3);
    }
  }
  return triangles;
}
function glbPositionBounds(json) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], accessor.min[axis]);
        max[axis] = Math.max(max[axis], accessor.max[axis]);
      }
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}
function quatTransformVector(q, v) {
  const [x, y, z, w] = q || [0, 0, 0, 1];
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx)
  ];
}
function composeTransform(parent, node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const parentRotatedT = quatTransformVector(parent.rotation, t);
  return {
    translation: [
      parent.translation[0] + parentRotatedT[0],
      parent.translation[1] + parentRotatedT[1],
      parent.translation[2] + parentRotatedT[2]
    ],
    rotation: [
      parent.rotation[3] * r[0] + parent.rotation[0] * r[3] + parent.rotation[1] * r[2] - parent.rotation[2] * r[1],
      parent.rotation[3] * r[1] - parent.rotation[0] * r[2] + parent.rotation[1] * r[3] + parent.rotation[2] * r[0],
      parent.rotation[3] * r[2] + parent.rotation[0] * r[1] - parent.rotation[1] * r[0] + parent.rotation[2] * r[3],
      parent.rotation[3] * r[3] - parent.rotation[0] * r[0] - parent.rotation[1] * r[1] - parent.rotation[2] * r[2]
    ]
  };
}
function nodeWorldTransforms(json) {
  const transforms = new Map();
  const visit = (index, parent) => {
    const node = json.nodes[index];
    const transform = composeTransform(parent, node);
    transforms.set(index, transform);
    for (const child of node.children || []) visit(child, transform);
  };
  const childSet = new Set((json.nodes || []).flatMap((node) => node.children || []));
  for (let index = 0; index < (json.nodes || []).length; index += 1) {
    if (!childSet.has(index)) visit(index, { translation: [0, 0, 0], rotation: [0, 0, 0, 1] });
  }
  return transforms;
}
function nodeWorldBoundsByName(json, nodeName) {
  const nodeIndex = (json.nodes || []).findIndex((node) => node.name === nodeName);
  if (nodeIndex < 0) return null;
  const node = json.nodes[nodeIndex];
  const mesh = json.meshes?.[node.mesh];
  if (!mesh) return null;
  const transform = nodeWorldTransforms(json).get(nodeIndex);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const primitive of mesh.primitives || []) {
    const accessor = json.accessors?.[primitive.attributes?.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (const x of [accessor.min[0], accessor.max[0]]) {
      for (const y of [accessor.min[1], accessor.max[1]]) {
        for (const z of [accessor.min[2], accessor.max[2]]) {
          const rotated = quatTransformVector(transform.rotation, [x, y, z]);
          const world = [rotated[0] + transform.translation[0], rotated[1] + transform.translation[1], rotated[2] + transform.translation[2]];
          for (let axis = 0; axis < 3; axis += 1) {
            min[axis] = Math.min(min[axis], world[axis]);
            max[axis] = Math.max(max[axis], world[axis]);
          }
        }
      }
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) };
}

const componentByteSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const accessorComponents = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function readComponent(buffer, offset, componentType) {
  if (componentType === 5126) return buffer.readFloatLE(offset);
  if (componentType === 5125) return buffer.readUInt32LE(offset);
  if (componentType === 5123) return buffer.readUInt16LE(offset);
  if (componentType === 5122) return buffer.readInt16LE(offset);
  if (componentType === 5121) return buffer.readUInt8(offset);
  if (componentType === 5120) return buffer.readInt8(offset);
  throw new Error('unsupported accessor component type ' + componentType);
}
function accessorValues(json, binary, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  const view = json.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view || !binary) return [];
  const componentSize = componentByteSize[accessor.componentType];
  const componentCount = accessorComponents[accessor.type];
  const stride = view.byteStride || componentSize * componentCount;
  const base = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const values = [];
  for (let row = 0; row < accessor.count; row += 1) {
    const tuple = [];
    for (let component = 0; component < componentCount; component += 1) {
      tuple.push(readComponent(binary, base + row * stride + component * componentSize, accessor.componentType));
    }
    values.push(componentCount === 1 ? tuple[0] : tuple);
  }
  return values;
}
function quatMultiply(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];
}
function composeFullTransform(parent, node) {
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  const scaledT = [t[0] * parent.scale[0], t[1] * parent.scale[1], t[2] * parent.scale[2]];
  const rotatedT = quatTransformVector(parent.rotation, scaledT);
  return {
    translation: [parent.translation[0] + rotatedT[0], parent.translation[1] + rotatedT[1], parent.translation[2] + rotatedT[2]],
    rotation: quatMultiply(parent.rotation, r),
    scale: [parent.scale[0] * s[0], parent.scale[1] * s[1], parent.scale[2] * s[2]]
  };
}
function nodeFullWorldTransforms(json) {
  const transforms = new Map();
  const visit = (index, parent) => {
    const transform = composeFullTransform(parent, json.nodes[index]);
    transforms.set(index, transform);
    for (const child of json.nodes[index].children || []) visit(child, transform);
  };
  const childSet = new Set((json.nodes || []).flatMap((node) => node.children || []));
  for (let index = 0; index < (json.nodes || []).length; index += 1) {
    if (!childSet.has(index)) visit(index, { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
  }
  return transforms;
}
function transformPoint(transform, value) {
  const scaled = [value[0] * transform.scale[0], value[1] * transform.scale[1], value[2] * transform.scale[2]];
  const rotated = quatTransformVector(transform.rotation, scaled);
  return [rotated[0] + transform.translation[0], rotated[1] + transform.translation[1], rotated[2] + transform.translation[2]];
}
function vectorSub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vectorCross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vectorDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function rayTriangleDistance(origin, direction, a, b, c) {
  const edge1 = vectorSub(b, a);
  const edge2 = vectorSub(c, a);
  const p = vectorCross(direction, edge2);
  const determinant = vectorDot(edge1, p);
  if (Math.abs(determinant) < 1e-7) return null;
  const inverse = 1 / determinant;
  const t = vectorSub(origin, a);
  const u = vectorDot(t, p) * inverse;
  if (u < 0 || u > 1) return null;
  const q = vectorCross(t, edge1);
  const v = vectorDot(direction, q) * inverse;
  if (v < 0 || u + v > 1) return null;
  const distance = vectorDot(edge2, q) * inverse;
  return distance > 1e-7 ? distance : null;
}
function glbWorldTriangles(json, binary) {
  const transforms = nodeFullWorldTransforms(json);
  const triangles = [];
  for (let nodeIndex = 0; nodeIndex < (json.nodes || []).length; nodeIndex += 1) {
    const node = json.nodes[nodeIndex];
    if (node.mesh == null) continue;
    const mesh = json.meshes?.[node.mesh];
    const transform = transforms.get(nodeIndex);
    for (const primitive of mesh?.primitives || []) {
      const positions = accessorValues(json, binary, primitive.attributes?.POSITION).map((value) => transformPoint(transform, value));
      const indices = primitive.indices != null ? accessorValues(json, binary, primitive.indices) : positions.map((_, index) => index);
      const material = json.materials?.[primitive.material]?.name || '';
      for (let index = 0; index + 2 < indices.length; index += 3) {
        triangles.push({ nodeName: node.name || '', material, a: positions[indices[index]], b: positions[indices[index + 1]], c: positions[indices[index + 2]] });
      }
    }
  }
  return triangles;
}
function isQualifyingExteriorArmor(hit) {
  return /(sloped_sponson|track_well_slot_wall|outer_track_skirt|hull_lower_tub|hull_glacis|flush_glacis|visible_glacis|vertical_shoulder|rear_armor|engine_deck|rounded_transmission|front_fender|rear_fender)/.test(hit.nodeName);
}
function formatRayPoint(point) { return point.map((n) => n.toFixed(3)).join(','); }
function raycastClosureFailures(json, binary) {
  const triangles = glbWorldTriangles(json, binary);
  const failures = [];
  const raySpecs = [];
  const sideZones = [
    { side: 'left', sideSign: 1, xValues: [1.42, 1.58], yValues: [-0.34, -0.18, 0.02, 0.16], zone: 'front' },
    { side: 'left', sideSign: 1, xValues: [-1.42, -1.62], yValues: [-0.34, -0.18, 0.02, 0.16], zone: 'rear' },
    { side: 'right', sideSign: -1, xValues: [1.42, 1.58], yValues: [-0.34, -0.18, 0.02, 0.16], zone: 'front' },
    { side: 'right', sideSign: -1, xValues: [-1.42, -1.62], yValues: [-0.34, -0.18, 0.02, 0.16], zone: 'rear' }
  ];
  for (const spec of sideZones) {
    for (const x of spec.xValues) for (const y of spec.yValues) {
      raySpecs.push({ label: spec.side + ' ' + spec.zone + ' side ray', origin: [x, y, spec.sideSign * 1.28], direction: [0, 0, -spec.sideSign], limit: 0.82 });
    }
    for (const y of [-0.18, 0.02, 0.16]) {
      const frontOrigin = [2.16, y, spec.sideSign * 1.26];
      const rearOrigin = [-2.16, y, spec.sideSign * 1.26];
      raySpecs.push({ label: spec.side + ' front oblique ray', origin: frontOrigin, direction: [-0.58, 0, -0.82 * spec.sideSign], limit: 1.20 });
      raySpecs.push({ label: spec.side + ' rear oblique ray', origin: rearOrigin, direction: [0.58, 0, -0.82 * spec.sideSign], limit: 1.20 });
    }
  }
  for (const spec of raySpecs) {
    let firstHit = null;
    let firstQualifying = null;
    for (const triangle of triangles) {
      const distance = rayTriangleDistance(spec.origin, spec.direction, triangle.a, triangle.b, triangle.c);
      if (distance == null || distance > spec.limit) continue;
      const hit = { ...triangle, distance };
      if (!firstHit || distance < firstHit.distance) firstHit = hit;
      if (isQualifyingExteriorArmor(hit) && (!firstQualifying || distance < firstQualifying.distance)) firstQualifying = hit;
    }
    if (!firstQualifying) {
      failures.push(spec.label + ' entered interior before exterior armor; origin ' + formatRayPoint(spec.origin) + '; direction ' + formatRayPoint(spec.direction) + '; first hit ' + (firstHit ? firstHit.nodeName + '/' + firstHit.material + '@' + firstHit.distance.toFixed(3) : 'none') + '; limit ' + spec.limit.toFixed(3));
    }
  }
  return failures;
}

function visibleCrackRayFailures(json, binary) {
  const triangles = glbWorldTriangles(json, binary);
  const failures = [];
  const specs = [];
  const sides = [
    { side: 'left', z: -0.82, dz: 0.34 },
    { side: 'right', z: 0.82, dz: -0.34 }
  ];
  for (const side of sides) {
    for (const y of [-0.34, -0.18, 0.02, 0.16]) {
      specs.push({ label: side.side + ' front visible crack oblique ray', origin: [2.05, y, side.z], direction: [-0.94, 0, side.dz], limit: 1.55, required: /front_track_well_slot_wall|hull_lower_tub|visible_glacis|vertical_shoulder|outer_track_skirt|sloped_sponson/ });
      specs.push({ label: side.side + ' rear visible crack oblique ray', origin: [-2.05, y, side.z], direction: [0.94, 0, side.dz], limit: 1.55, required: /rear_track_well_slot_wall|hull_lower_tub|rear_armor|outer_track_skirt|sloped_sponson/ });
    }
  }
  for (const spec of specs) {
    let firstHit = null;
    let firstRequired = null;
    for (const triangle of triangles) {
      const distance = rayTriangleDistance(spec.origin, spec.direction, triangle.a, triangle.b, triangle.c);
      if (distance == null || distance > spec.limit) continue;
      const hit = { ...triangle, distance };
      if (!firstHit || distance < firstHit.distance) firstHit = hit;
      if (spec.required.test(hit.nodeName) && (!firstRequired || distance < firstRequired.distance)) firstRequired = hit;
    }
    if (!firstRequired) {
      failures.push(spec.label + ' did not hit the intended exterior slot-wall/armor before interior; origin ' + formatRayPoint(spec.origin) + '; direction ' + formatRayPoint(spec.direction) + '; first hit ' + (firstHit ? firstHit.nodeName + '/' + firstHit.material + '@' + firstHit.distance.toFixed(3) : 'none'));
    }
  }
  return failures;
}

function axisString(bounds) {
  return bounds ? bounds.size.map((n) => n.toFixed(3)).join(' x ') : 'missing';
}

for (const file of [glbPath, manifestPath, blendPath, blenderScriptPath, wrapperPath, 'boxmodel-tank.html', 'src/boxmodel-tank.ts', 'src/sherman-asset-links.ts', 'src/sherman-runtime-materials.ts', 'scripts/build.mjs']) {
  if (!existsSync(file)) fail('missing ' + file);
}
for (const id of facePlateIds) {
  for (const file of ['assets/authored/' + assetId + '/texture_templates/' + id + '.png', 'public/tftm/models/' + assetId + '/texture_plates/' + id + '.png']) {
    if (!existsSync(file)) fail('missing paintable PNG plate ' + file);
  }
}
const blender = spawnSync('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python-expr', 'import bpy; print("BLENDER_BOXMODEL_SMOKE", bpy.app.version_string, hasattr(bpy.ops.export_scene, "gltf"))'], { encoding: 'utf8' });
if ((blender.status ?? 1) !== 0) fail('Debian proot Blender smoke failed: ' + (blender.stderr || blender.stdout));
if (!String(blender.stdout || '').includes('BLENDER_BOXMODEL_SMOKE')) fail('Debian proot Blender smoke did not print expected marker');

if (failures.length === 0) {
  const manifest = JSON.parse(read(manifestPath));
  const { json, binary } = parseGlbChunks(glbPath);
  const nodeNames = new Set((json.nodes || []).map((node, index) => node.name || 'node_' + index));
  const materialNames = new Set((json.materials || []).map((material, index) => material.name || 'material_' + index));
  const triangleCount = glbTriangles(json);
  const bounds = glbPositionBounds(json);
  const barrelBounds = nodeWorldBoundsByName(json, 'barrel');
  const coaxBounds = nodeWorldBoundsByName(json, 'coaxial_mg');
  const roadwheelBounds = nodeWorldBoundsByName(json, 'left_roadwheel_0.00__wheel_disc');
  const blenderScript = read(blenderScriptPath);
  const wrapper = read(wrapperPath);
  const runtime = read('src/boxmodel-tank.ts') + read('src/sherman-asset-links.ts') + read('src/sherman-runtime-materials.ts');
  const build = read('scripts/build.mjs');

  if (manifest.asset_id !== assetId) fail('manifest asset_id must be ' + assetId);
  if (!String(manifest.generator || '').includes('export_authored_sherman_boxmodel.py')) fail('manifest must name Blender generator');
  if (!String(manifest.source_blend || '').includes('.blend')) fail('manifest must name source .blend');
  if (!String(manifest.source_policy || '').includes('fully authored Blender box-model')) fail('manifest must identify authored Blender box-model geometry');
  if (!String(manifest.source_policy || '').includes('solidified overlapping armor plates')) fail('manifest must identify solidified overlapping armor plates');
  if (!String(manifest.source_policy || '').includes('coaxial MG')) fail('manifest must identify coaxial MG');
  if (!String(manifest.source_policy || '').includes('Blender Z-up basis conversion')) fail('manifest must identify Blender Z-up basis conversion');
  if (!manifest.orientation_contract || !String(manifest.orientation_contract.visual_regression_prevented || '').includes('wheels must sit inside side skirts')) fail('manifest must preserve upright/gun/skirt orientation contract');
  if (!manifest.runtime_contract?.side_skirt_occlusion) fail('manifest must preserve side skirt occlusion contract');
  if (!String(manifest.silhouette_revision || '').includes('v1-14-readable-wheel-band-smaller-slot-walls')) fail('manifest must record v1-14 smaller slot-wall/readable-wheel-band revision');
  if (!String(manifest.runtime_contract?.integrated_sponson_skirt_armor || '').includes('smaller integrated track-well slot walls')) fail('manifest must describe smaller integrated slot walls, not expanded side wings');
  if (!String(manifest.runtime_contract?.raycast_exterior_closure || '').includes('outside gap rays hit exterior armor before interior')) fail('raycast closure rule missing: outside gap rays must hit exterior armor before they can enter the tank interior');
  for (const rayFailure of raycastClosureFailures(json, binary)) fail(rayFailure);
  for (const rayFailure of visibleCrackRayFailures(json, binary)) fail(rayFailure);
  if (!String(manifest.source_policy || '').includes('no Meshy chassis or turret')) fail('manifest must reject Meshy chassis/turret imports');
  if (!String(manifest.uv_policy || '').includes('box and planar UV plates')) fail('manifest must use box/planar UV plate policy');
  if (triangleCount > 6000) fail('GLB must stay below 6000 triangles, saw ' + triangleCount);
  if (manifest.approximate_triangles > 6000) fail('manifest triangle count must stay below 6000');
  if (triangleCount < 1500) fail('GLB triangle count is suspiciously low for Sherman boxmodel: ' + triangleCount);
  if (!(bounds.size[0] > bounds.size[2] && bounds.size[2] > bounds.size[1])) fail('GLB axis bounds must be X length > Z width > Y height for upright Three.js tank, saw ' + bounds.size.map((n) => n.toFixed(3)).join(' x '));
  if (!barrelBounds || !(barrelBounds.size[0] > 1.0 && barrelBounds.size[0] > barrelBounds.size[1] * 6 && barrelBounds.size[0] > barrelBounds.size[2] * 6)) fail('barrel mesh must be long on X, not vertical/perpendicular; saw ' + axisString(barrelBounds));
  if (!coaxBounds || !(coaxBounds.size[0] > 0.45 && coaxBounds.size[0] > coaxBounds.size[1] * 6 && coaxBounds.size[0] > coaxBounds.size[2] * 6)) fail('coaxial MG mesh must be visible and long on X; saw ' + axisString(coaxBounds));
  if (!roadwheelBounds || !(roadwheelBounds.size[2] < roadwheelBounds.size[0] * 0.45 && roadwheelBounds.size[2] < roadwheelBounds.size[1] * 0.45)) fail('roadwheel disc must be thin on Z so it faces the hull side; saw ' + axisString(roadwheelBounds));

  const sideSkinSpecs = [
    { label: 'left integrated sponson/skirt skin', node: 'left_sloped_sponson__hull_left', skirt: 'left_outer_track_skirt__track_outer', side: 'left' },
    { label: 'right integrated sponson/skirt skin', node: 'right_sloped_sponson__hull_right', skirt: 'right_outer_track_skirt__track_outer', side: 'right' }
  ];
  for (const spec of sideSkinSpecs) {
    const skin = nodeWorldBoundsByName(json, spec.node);
    const skirt = nodeWorldBoundsByName(json, spec.skirt);
    if (!skin) fail(spec.label + ' is missing; hull side must own the front/rear hull-to-track surface');
    if (!skirt) fail(spec.label + ' cannot be checked because the outer track skirt is missing');
    if (skin && !(skin.size[0] > 3.0 && skin.size[1] > 0.85)) fail(spec.label + ' must span the hull side from front glacis corner to rear armor/idler corner and down to the skirt; saw ' + axisString(skin));
    if (skin && skirt && spec.side === 'left') {
      const overhang = skin.max[2] - skirt.max[2];
      if (!(skin.max[2] > skirt.max[2] - 0.04 && skin.min[2] < 0.66)) fail(spec.label + ' must bridge upper hull side into the positive-Z skirt plane, not stop inboard; skin ' + axisString(skin) + '; skirt ' + axisString(skirt));
      if (overhang > 0.06) fail(spec.label + ' wing regression: exterior overhang beyond skirt is ' + overhang.toFixed(3) + ', expected <= 0.060');
    }
    if (skin && skirt && spec.side === 'right') {
      const overhang = skirt.min[2] - skin.min[2];
      if (!(skin.min[2] < skirt.min[2] + 0.04 && skin.max[2] > -0.66)) fail(spec.label + ' must bridge upper hull side into the negative-Z skirt plane, not stop inboard; skin ' + axisString(skin) + '; skirt ' + axisString(skirt));
      if (overhang > 0.06) fail(spec.label + ' wing regression: exterior overhang beyond skirt is ' + overhang.toFixed(3) + ', expected <= 0.060');
    }
  }
  const slotWallSpecs = [
    ['left front track-well slot wall', 'left_front_track_well_slot_wall__hull_left'],
    ['right front track-well slot wall', 'right_front_track_well_slot_wall__hull_right'],
    ['left rear track-well slot wall', 'left_rear_track_well_slot_wall__hull_left'],
    ['right rear track-well slot wall', 'right_rear_track_well_slot_wall__hull_right']
  ];
  for (const [label, node] of slotWallSpecs) {
    const bounds = nodeWorldBoundsByName(json, node);
    if (!bounds) fail(label + ' missing; visible crack must be closed by an integrated hull-owned slot wall');
    else if (!(bounds.size[0] > 0.52 && bounds.size[0] < 1.05 && bounds.size[1] > 0.34 && bounds.size[1] < 0.62 && bounds.size[2] < 0.12)) fail(label + ' must be a smaller vertical track-well wall spanning only the crack band, saw ' + axisString(bounds));
  }

  const visibleWheelSpecs = [
    ['left visible roadwheel band', 'left_roadwheel_0.00__wheel_disc', 'left_track_motion', 'left'],
    ['right visible roadwheel band', 'right_roadwheel_0.00__wheel_disc', 'right_track_motion', 'right']
  ];
  for (const [label, wheelNode, trackNode, side] of visibleWheelSpecs) {
    const wheel = nodeWorldBoundsByName(json, wheelNode);
    const track = nodeWorldBoundsByName(json, trackNode);
    if (!wheel || !track) fail(label + ' cannot be checked because wheel or track volume is missing');
    else {
      const exposure = side === 'left' ? wheel.max[2] - track.max[2] : track.min[2] - wheel.min[2];
      if (exposure < 0.025) fail(label + ' is buried inside the track slab; wheel must protrude at least 0.025 beyond track side, saw ' + exposure.toFixed(3));
    }
  }

  for (const id of facePlateIds) {
    if (!manifest.face_plate_ids?.includes(id)) fail('manifest missing face plate id ' + id);
    if (!materialNames.has(id)) fail('GLB missing material slot ' + id);
  }
  for (const nodeName of requiredNodes) {
    if (!nodeNames.has(nodeName)) fail('GLB missing required node ' + nodeName);
  }
  for (const forbiddenNode of ['left_front_shoulder_armor_filler__hull_left', 'right_front_shoulder_armor_filler__hull_right', 'left_front_track_to_glacis_cover__hull_left', 'right_front_track_to_glacis_cover__hull_right', 'left_exterior_front_gap_cover__hull_left', 'right_exterior_front_gap_cover__hull_right']) {
    if (nodeNames.has(forbiddenNode)) fail('front wing filler regression: remove old raised gap filler node ' + forbiddenNode);
  }
  for (const forbidden of ['sherman_part_meshy_kit_v1', 'hull.glb', 'turret.glb', 'SimplifyModifier', 'RoundedBoxGeometry']) {
    if (blenderScript.includes(forbidden) || wrapper.includes(forbidden)) fail('boxmodel exporter must not use rejected/import marker ' + forbidden);
  }
  if (!blenderScript.includes('def P(') || !blenderScript.includes('Blender is Z-up')) fail('boxmodel exporter must declare Blender basis conversion helpers');
  for (const marker of ['AUTHORED_SHERMAN_BOXMODEL_GLB_URL', 'AUTHORED_SHERMAN_BOXMODEL_FACE_PLATES', 'applyAuthoredBoxmodelTexturePlates', 'tftm-authored-sherman-boxmodel-v1-14-20260705']) {
    if (!runtime.includes(marker)) fail('boxmodel runtime missing marker ' + marker);
  }
  if (!build.includes("buildEntry('boxmodel-tank.ts', 'boxmodel-tank')")) fail('build must bundle boxmodel-tank.ts');
  if (!runtime.includes('authored_sherman_boxmodel_v1.glb?v=v1-14-readable-wheel-band-smaller-slot-walls')) fail('runtime must version the authored boxmodel GLB URL so asset caching cannot hide geometry changes');
  if (!build.includes("writeBundledHtml('boxmodel-tank.html', 'boxmodel-tank.html', 'boxmodel-tank')")) fail('build must write boxmodel-tank.html');
}

if (failures.length) {
  console.error('Authored boxmodel asset validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Authored boxmodel validation passed: Blender proot export, source .blend, GLB contract, box UV plates, and runtime route are wired.');

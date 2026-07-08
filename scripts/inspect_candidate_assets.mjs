#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultPicturesDir = '/storage/emulated/0/Pictures';
const defaultDownloadDirs = ['/storage/emulated/0/Download', '/storage/emulated/0/Downloads'];
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const modelExts = new Set(['.glb', '.gltf', '.fbx', '.obj', '.blend', '.zip']);
const roleOrder = ['treads', 'turret', 'hull'];
const defaultModelHints = [
  { role: 'treads', terms: ['exploded', '_tr_', 'track', 'tread'] },
  { role: 'turret', terms: ['turret', '_tur_', 'disassembled'] },
  { role: 'hull', terms: ['iron', 'sentinel', 'hull', 'chassis'] }
];

function usage() {
  console.log('usage:\n  node scripts/inspect_candidate_assets.mjs --pictures-newest 3 --downloads-newest 3\n  node scripts/inspect_candidate_assets.mjs --image IMG --model MODEL --label hull|turret|treads [--image IMG --model MODEL --label ...]\n\noptions:\n  --out DIR                output directory, default generated/asset-intake/<timestamp>\n  --pictures-dir DIR       default /storage/emulated/0/Pictures\n  --downloads-dir DIR      may be repeated, default Android Download/Downloads\n  --pictures-newest N      choose newest non-thumbnail images\n  --downloads-newest N     choose newest GLB/asset files\n  --no-stage               do not copy selected images/models into the report folder');
}

function parseArgs(argv) {
  const args = { images: [], models: [], labels: [], picturesNewest: 0, downloadsNewest: 0, picturesDir: defaultPicturesDir, downloadsDirs: [], out: '', stage: true, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error('missing value for ' + a);
      return argv[i];
    };
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--image') args.images.push(next());
    else if (a === '--model') args.models.push(next());
    else if (a === '--label') args.labels.push(next());
    else if (a === '--pictures-newest') args.picturesNewest = Number(next());
    else if (a === '--downloads-newest') args.downloadsNewest = Number(next());
    else if (a === '--pictures-dir') args.picturesDir = next();
    else if (a === '--downloads-dir') args.downloadsDirs.push(next());
    else if (a === '--out') args.out = next();
    else if (a === '--no-stage') args.stage = false;
    else throw new Error('unknown arg ' + a);
  }
  if (args.downloadsDirs.length === 0) args.downloadsDirs = defaultDownloadDirs;
  return args;
}

function walkFiles(dir, exts, maxDepth = 3, skip = () => false) {
  const found = [];
  function walk(current, depth) {
    if (depth > maxDepth || !existsSync(current)) return;
    let entries = [];
    try { entries = readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (skip(p, entry)) continue;
      if (entry.isDirectory()) walk(p, depth + 1);
      else if (entry.isFile() && exts.has(path.extname(entry.name).toLowerCase())) {
        const s = statSync(p);
        found.push({ path: p, bytes: s.size, mtimeMs: s.mtimeMs });
      }
    }
  }
  walk(dir, 0);
  return found;
}

function newestImages(dir, n) {
  return walkFiles(dir, imageExts, 3, (p) => p.includes('/.thumbnails/') || p.includes('/Screenshots/')).sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, n);
}

function newestModels(dirs, n) {
  const all = [];
  for (const dir of dirs) all.push(...walkFiles(dir, modelExts, 3));
  const seen = new Set();
  return all.sort((a, b) => b.mtimeMs - a.mtimeMs).filter((entry) => {
    if (seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  }).slice(0, n);
}

function readPngDimensions(data) {
  if (data.length >= 24 && data[0] === 0x89 && data.toString('ascii', 1, 4) === 'PNG') return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), format: 'png' };
  return null;
}

function readJpegDimensions(data) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > data.length) break;
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) break;
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof && length >= 7) return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5), format: 'jpeg' };
    offset += length;
  }
  return null;
}

function readWebpDimensions(data) {
  if (data.length < 30 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = data.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3), format: 'webp' };
  if (chunk === 'VP8 ') return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff, format: 'webp' };
  return { width: null, height: null, format: 'webp' };
}

function inspectImage(file) {
  const data = readFileSync(file);
  const s = statSync(file);
  const dims = readPngDimensions(data) || readJpegDimensions(data) || readWebpDimensions(data) || { width: null, height: null, format: path.extname(file).slice(1).toLowerCase() || 'unknown' };
  return { path: file, fileName: path.basename(file), bytes: s.size, mtime: new Date(s.mtimeMs).toISOString(), width: dims.width, height: dims.height, format: dims.format };
}

function accessorTypeSize(type) {
  return ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 })[type] || 1;
}

function componentBytes(componentType) {
  return ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 })[componentType] || 0;
}


function componentReader(componentType) {
  if (componentType === 5120) return (data, offset) => data.readInt8(offset);
  if (componentType === 5121) return (data, offset) => data.readUInt8(offset);
  if (componentType === 5122) return (data, offset) => data.readInt16LE(offset);
  if (componentType === 5123) return (data, offset) => data.readUInt16LE(offset);
  if (componentType === 5125) return (data, offset) => data.readUInt32LE(offset);
  if (componentType === 5126) return (data, offset) => data.readFloatLE(offset);
  throw new Error('unsupported accessor componentType ' + componentType);
}

function readAccessorValues(data, binStart, json, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor) throw new Error('missing accessor ' + accessorIndex);
  const view = json.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error('missing bufferView for accessor ' + accessorIndex);
  const components = accessorTypeSize(accessor.type);
  const bytes = componentBytes(accessor.componentType);
  const stride = view.byteStride || components * bytes;
  const base = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const read = componentReader(accessor.componentType);
  const values = [];
  for (let i = 0; i < (accessor.count || 0); i += 1) {
    if (components === 1) values.push(read(data, base + i * stride));
    else {
      const tuple = [];
      for (let c = 0; c < components; c += 1) tuple.push(read(data, base + i * stride + c * bytes));
      values.push(tuple);
    }
  }
  return values;
}

function makeTriangleIndices(data, binStart, json, primitive) {
  const mode = primitive.mode ?? 4;
  const posAccessor = primitive.attributes?.POSITION;
  if (typeof posAccessor !== 'number') return [];
  let elements = [];
  if (typeof primitive.indices === 'number') elements = readAccessorValues(data, binStart, json, primitive.indices);
  else elements = Array.from({ length: json.accessors[posAccessor].count || 0 }, (_, i) => i);
  const triangles = [];
  if (mode === 4) {
    for (let i = 0; i + 2 < elements.length; i += 3) triangles.push([elements[i], elements[i + 1], elements[i + 2]]);
  } else if (mode === 5) {
    for (let i = 0; i + 2 < elements.length; i += 1) {
      const tri = i % 2 === 0 ? [elements[i], elements[i + 1], elements[i + 2]] : [elements[i + 1], elements[i], elements[i + 2]];
      triangles.push(tri);
    }
  } else if (mode === 6) {
    for (let i = 1; i + 1 < elements.length; i += 1) triangles.push([elements[0], elements[i], elements[i + 1]]);
  }
  return triangles.filter((tri) => tri[0] !== tri[1] && tri[0] !== tri[2] && tri[1] !== tri[2]);
}

function classifyIsland(size) {
  const [x, y, z] = size;
  const maxDim = Math.max(x, y, z) || 1;
  const sorted = [...size].sort((a, b) => b - a);
  const thinness = sorted[2] / maxDim;
  if (x > y * 2.4 && x > z * 2.4 && thinness < 0.28) return 'barrel_or_long_pin';
  if (y > x * 1.8 && y > z * 1.8) return 'vertical_detail_or_handle';
  if (Math.abs(x - z) / maxDim < 0.25 && y < maxDim * 0.45) return 'wheel_hatch_or_round_plate';
  if (maxDim > 1.4 && thinness < 0.35) return 'large_shell_or_plate';
  if (thinness < 0.18) return 'thin_plate_or_panel';
  return 'compact_detail';
}


function islandMaxSize(island) {
  return Math.max(...island.bbox.size);
}

function isMajorIsland(island, totalTriangles) {
  const maxSize = islandMaxSize(island);
  return island.triangles >= 50 || island.triangles / Math.max(1, totalTriangles) >= 0.006 || maxSize >= 0.55;
}

function sortByTrianglesThenSize(a, b) {
  return (b.triangles - a.triangles) || (islandMaxSize(b) - islandMaxSize(a));
}

function findIslandCandidates(islands, predicate, limit = 6) {
  return islands.filter(predicate).sort(sortByTrianglesThenSize).slice(0, limit).map((island) => ({
    index: island.index,
    triangles: island.triangles,
    vertices: island.vertices,
    roleHint: island.roleHint,
    bbox: island.bbox
  }));
}

function islandPoolForRole(role, all, major) {
  if (role === 'treads') {
    return all.filter((island) => isMajorIsland(island, all.reduce((sum, x) => sum + x.triangles, 0)) || (island.roleHint === 'wheel_hatch_or_round_plate' && island.triangles >= 20) || (island.roleHint === 'thin_plate_or_panel' && island.triangles >= 30));
  }
  if (role === 'turret') {
    return all.filter((island) => isMajorIsland(island, all.reduce((sum, x) => sum + x.triangles, 0)) || (island.roleHint === 'wheel_hatch_or_round_plate' && island.triangles >= 25) || (island.roleHint === 'barrel_or_long_pin' && island.triangles >= 25));
  }
  return major;
}

function buildPartSelection(role, geometryIslands) {
  const totalTriangles = geometryIslands.totalIslandTriangles || 0;
  const all = geometryIslands.allIslands || geometryIslands.topIslands || [];
  const major = all.filter((island) => isMajorIsland(island, totalTriangles));
  const pool = islandPoolForRole(role, all, major);
  const long = (island) => island.roleHint === 'barrel_or_long_pin';
  const round = (island) => island.roleHint === 'wheel_hatch_or_round_plate';
  const shell = (island) => island.roleHint === 'large_shell_or_plate' || (island.roleHint === 'compact_detail' && islandMaxSize(island) >= 0.75);
  const thin = (island) => island.roleHint === 'thin_plate_or_panel';
  const selection = {
    policy: 'all real mesh islands retained; role-aware picks are advisory only',
    majorIslandCount: major.length,
    candidateIslandCount: pool.length,
    majorTriangles: major.reduce((sum, island) => sum + island.triangles, 0),
    candidateTriangles: pool.reduce((sum, island) => sum + island.triangles, 0),
    majorTriangleShare: Number((major.reduce((sum, island) => sum + island.triangles, 0) / Math.max(1, totalTriangles)).toFixed(4)),
    candidateTriangleShare: Number((pool.reduce((sum, island) => sum + island.triangles, 0) / Math.max(1, totalTriangles)).toFixed(4)),
    picks: []
  };
  const add = (target, candidates, note) => selection.picks.push({ target, note, candidates });
  if (role === 'hull') {
    add('one_hull_shell', findIslandCandidates(pool, shell, 5), 'Prefer the largest shell/plate islands as the real hull mesh candidate, not every disconnected detail.');
    add('large_hull_panels_or_sponsons', findIslandCandidates(pool, (island) => shell(island) || thin(island), 8), 'Secondary broad armor planes only.');
  } else if (role === 'turret') {
    add('combined_turret_mantlet', findIslandCandidates(pool, (island) => shell(island) || round(island), 6), 'Use the real combined turret/mantlet islands if they read as one assembly.');
    add('barrel', findIslandCandidates(pool, (island) => long(island) && islandMaxSize(island) >= 0.55, 6), 'Long islands are barrel candidates; choose the cleanest visible gun barrel.');
    add('two_hatches', findIslandCandidates(pool, round, 8), 'Round flat islands are hatch candidates; choose two readable ones, ignore extra disks.');
    add('coax', findIslandCandidates(pool, (island) => long(island) && islandMaxSize(island) < 0.9, 6), 'Small long-pin islands are coax candidates; visual review decides ownership.');
  } else if (role === 'treads') {
    add('one_tread_foot', findIslandCandidates(pool, (island) => thin(island) || island.roleHint === 'barrel_or_long_pin', 8), 'Pick one clean shoe/foot island as tread-foot mesh.');
    add('one_road_wheel', findIslandCandidates(pool, round, 8), 'Pick one readable round wheel island; ignore duplicate small washers.');
    add('four_supporting_running_gear_pieces', findIslandCandidates(pool, (island) => !round(island), 12), 'Choose up to four additional sprocket/idler/bogie/pin shapes by visual read.');
  } else {
    add('major_shapes', findIslandCandidates(pool, () => true, 12), 'Generic major island picks.');
  }
  return selection;
}

function expandedBbox(bbox, margin) {
  return {
    min: bbox.min.map((v) => v - margin),
    max: bbox.max.map((v) => v + margin)
  };
}

function bboxIntersects(a, b) {
  return a.min.every((v, axis) => v <= b.max[axis] && a.max[axis] >= b.min[axis]);
}

function centerDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function mergeEnvelopeBBox(group, island) {
  for (let axis = 0; axis < 3; axis += 1) {
    group.min[axis] = Math.min(group.min[axis], island.bbox.min[axis]);
    group.max[axis] = Math.max(group.max[axis], island.bbox.max[axis]);
  }
  group.size = group.max.map((v, axis) => Number((v - group.min[axis]).toFixed(5)));
  group.center = group.max.map((v, axis) => Number(((v + group.min[axis]) / 2).toFixed(5)));
}

function labelEnvelope(role, group) {
  const hints = group.roleHintCounts || {};
  const maxDim = Math.max(...group.size);
  const [x, y, z] = group.size;
  if (role === 'treads') {
    if ((hints.wheel_hatch_or_round_plate || 0) >= Math.max(1, group.islandCount * 0.35)) return 'road_wheel_candidate_envelope';
    if ((hints.thin_plate_or_panel || 0) >= 1 && (x > z * 1.4 || z > x * 1.4)) return 'tread_shoe_or_track_plate_envelope';
    if ((hints.barrel_or_long_pin || 0) >= 1) return 'pin_bogie_or_connector_envelope';
    return maxDim > 0.6 ? 'running_gear_mass_envelope' : 'small_tread_detail_envelope';
  }
  if (role === 'turret') {
    if ((hints.barrel_or_long_pin || 0) >= 1 && maxDim > 0.45) return x >= Math.max(y, z) ? 'barrel_candidate_envelope' : 'coax_or_pin_candidate_envelope';
    if ((hints.wheel_hatch_or_round_plate || 0) >= 1 && maxDim < 0.7) return 'hatch_or_round_detail_envelope';
    if ((hints.large_shell_or_plate || 0) >= 1 || maxDim > 0.8) return 'turret_mantlet_body_candidate_envelope';
    return 'small_turret_detail_envelope';
  }
  if (role === 'hull') {
    if ((hints.large_shell_or_plate || 0) >= 1 || maxDim > 1.0) return 'hull_shell_candidate_envelope';
    if ((hints.thin_plate_or_panel || 0) >= 1) return 'armor_panel_candidate_envelope';
    return 'surface_detail_envelope';
  }
  if ((hints.large_shell_or_plate || 0) >= 1 || maxDim > 1.0) return 'major_shape_envelope';
  if ((hints.thin_plate_or_panel || 0) >= 1) return 'panel_envelope';
  return 'detail_envelope';
}

function buildEnvelopeGroups(role, islands) {
  const sorted = [...islands].sort((a, b) => (b.triangles - a.triangles) || (islandMaxSize(b) - islandMaxSize(a)));
  const groups = [];
  for (const island of sorted) {
    const islandMax = islandMaxSize(island);
    let best = null;
    let bestDistance = Infinity;
    for (const group of groups) {
      if (group.primaryRoleHint !== island.roleHint) continue;
      const groupMax = Math.max(...group.size) || 1;
      const margin = Math.max(0.015, Math.min(0.09, islandMax * 0.42, groupMax * 0.08));
      const expanded = expandedBbox({ min: group.min, max: group.max }, margin);
      const intersects = bboxIntersects(expanded, island.bbox);
      const distance = centerDistance(group.center, island.bbox.center);
      const baseThreshold = role === 'treads' ? 0.24 : role === 'turret' ? 0.22 : 0.2;
      const threshold = Math.max(baseThreshold, Math.min(0.42, groupMax * 0.28 + islandMax * 0.72));
      const tinyDetail = islandMax < 0.07 && distance < Math.max(0.16, threshold * 0.75);
      if ((intersects || distance <= threshold || tinyDetail) && distance < bestDistance) {
        best = group;
        bestDistance = distance;
      }
    }
    if (!best) {
      best = {
        id: '',
        label: '',
        primaryRoleHint: island.roleHint,
        islandIndices: [],
        islandCount: 0,
        triangles: 0,
        vertices: 0,
        roleHintCounts: {},
        min: [...island.bbox.min],
        max: [...island.bbox.max],
        size: [...island.bbox.size],
        center: [...island.bbox.center],
        topIslands: []
      };
      groups.push(best);
    } else {
      mergeEnvelopeBBox(best, island);
    }
    best.islandIndices.push(island.index);
    best.islandCount += 1;
    best.triangles += island.triangles;
    best.vertices += island.vertices;
    best.roleHintCounts[island.roleHint] = (best.roleHintCounts[island.roleHint] || 0) + 1;
    best.topIslands.push({
      index: island.index,
      triangles: island.triangles,
      vertices: island.vertices,
      roleHint: island.roleHint,
      bbox: island.bbox
    });
    best.topIslands.sort(sortByTrianglesThenSize);
    best.topIslands = best.topIslands.slice(0, 8);
  }
  return groups
    .sort((a, b) => (b.triangles - a.triangles) || (Math.max(...b.size) - Math.max(...a.size)))
    .map((group, index) => {
      const label = labelEnvelope(role, group);
      return {
        id: `${label.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()}_${String(index + 1).padStart(2, '0')}`,
        label,
        islandCount: group.islandCount,
        triangles: group.triangles,
        vertices: group.vertices,
        bbox: {
          min: group.min.map((v) => Number(v.toFixed(5))),
          max: group.max.map((v) => Number(v.toFixed(5))),
          size: group.size.map((v) => Number(v.toFixed(5))),
          center: group.center.map((v) => Number(v.toFixed(5)))
        },
        roleHintCounts: group.roleHintCounts,
        islandIndices: group.islandIndices.sort((a, b) => a - b),
        topIslands: group.topIslands
      };
    });
}

function buildEnvelopeSummary(envelopeGroups) {
  const totalEnvelopeTriangles = envelopeGroups.reduce((sum, group) => sum + group.triangles, 0);
  return {
    policy: 'all connected islands retained; envelopes are bbox/proximity identification groups only and do not delete geometry',
    envelopeCount: envelopeGroups.length,
    totalEnvelopeTriangles,
    topGroups: envelopeGroups.slice(0, 18).map((group) => ({
      id: group.id,
      label: group.label,
      islandCount: group.islandCount,
      triangles: group.triangles,
      bbox: group.bbox,
      roleHintCounts: group.roleHintCounts,
      topIslandIndices: group.topIslands.map((island) => island.index)
    }))
  };
}

function inspectGeometryIslands(data, binStart, json, role = "") {
  const islands = [];
  for (let meshIndex = 0; meshIndex < (json.meshes || []).length; meshIndex += 1) {
    const mesh = json.meshes[meshIndex];
    for (let primitiveIndex = 0; primitiveIndex < (mesh.primitives || []).length; primitiveIndex += 1) {
      const primitive = mesh.primitives[primitiveIndex];
      const posAccessor = primitive.attributes?.POSITION;
      if (typeof posAccessor !== 'number') continue;
      const positions = readAccessorValues(data, binStart, json, posAccessor);
      const triangles = makeTriangleIndices(data, binStart, json, primitive);
      const parent = new Map();
      const used = new Set();
      const find = (v) => {
        let p = parent.get(v);
        if (p === undefined) { parent.set(v, v); return v; }
        while (p !== parent.get(p)) p = parent.get(p);
        let cur = v;
        while (parent.get(cur) !== p) { const next = parent.get(cur); parent.set(cur, p); cur = next; }
        return p;
      };
      const unite = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
      };
      for (const tri of triangles) {
        used.add(tri[0]); used.add(tri[1]); used.add(tri[2]);
        unite(tri[0], tri[1]); unite(tri[1], tri[2]);
      }
      const groups = new Map();
      for (const index of used) {
        const rootIndex = find(index);
        let group = groups.get(rootIndex);
        if (!group) {
          group = { vertexSet: new Set(), triangles: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
          groups.set(rootIndex, group);
        }
        group.vertexSet.add(index);
      }
      for (const tri of triangles) {
        const group = groups.get(find(tri[0]));
        if (group) group.triangles += 1;
      }
      for (const group of groups.values()) {
        for (const index of group.vertexSet) {
          const pos = positions[index];
          if (!Array.isArray(pos)) continue;
          for (let axis = 0; axis < 3; axis += 1) {
            group.min[axis] = Math.min(group.min[axis], pos[axis]);
            group.max[axis] = Math.max(group.max[axis], pos[axis]);
          }
        }
        const size = group.max.map((v, axis) => Number((v - group.min[axis]).toFixed(5)));
        const center = group.max.map((v, axis) => Number(((v + group.min[axis]) / 2).toFixed(5)));
        islands.push({
          meshIndex,
          meshName: mesh.name || `mesh_${meshIndex}`,
          primitiveIndex,
          vertices: group.vertexSet.size,
          triangles: group.triangles,
          bbox: {
            min: group.min.map((v) => Number(v.toFixed(5))),
            max: group.max.map((v) => Number(v.toFixed(5))),
            size,
            center
          },
          roleHint: classifyIsland(size)
        });
      }
    }
  }
  islands.sort((a, b) => b.triangles - a.triangles);
  const indexed = islands.map((island, index) => ({ index, ...island }));
  const totalIslandTriangles = indexed.reduce((sum, island) => sum + island.triangles, 0);
  const majorIslands = indexed.filter((island) => isMajorIsland(island, totalIslandTriangles));
  const summary = {
    islandCount: indexed.length,
    totalIslandTriangles,
    largestIslandTriangles: indexed[0]?.triangles || 0,
    largestIslandTriangleShare: indexed.length && indexed[0]?.triangles ? Number((indexed[0].triangles / Math.max(1, totalIslandTriangles)).toFixed(4)) : 0,
    majorIslandPolicy: 'major islands are reported for orientation only; no islands are removed by the active intake path',
    majorIslandCount: majorIslands.length,
    majorTriangleShare: Number((majorIslands.reduce((sum, island) => sum + island.triangles, 0) / Math.max(1, totalIslandTriangles)).toFixed(4)),
    roleHintCounts: indexed.reduce((acc, island) => { acc[island.roleHint] = (acc[island.roleHint] || 0) + 1; return acc; }, {}),
    majorRoleHintCounts: majorIslands.reduce((acc, island) => { acc[island.roleHint] = (acc[island.roleHint] || 0) + 1; return acc; }, {}),
    topIslands: indexed.slice(0, 80),
    majorIslands: majorIslands.slice(0, 80),
    allIslands: indexed
  };
  const envelopeGroups = buildEnvelopeGroups(role, indexed);
  return {
    ...summary,
    envelopeGroups,
    envelopeSummary: buildEnvelopeSummary(envelopeGroups)
  };
}

function inspectGlb(file) {
  const data = readFileSync(file);
  if (data.length < 20 || data.toString('utf8', 0, 4) !== 'glTF') return { path: file, fileName: path.basename(file), supported: false, reason: 'not a GLB file', bytes: data.length };
  const version = data.readUInt32LE(4);
  const length = data.readUInt32LE(8);
  let offset = 12;
  let json = null;
  let binaryBytes = 0;
  let binStart = 0;
  while (offset + 8 <= Math.min(length, data.length)) {
    const chunkLength = data.readUInt32LE(offset);
    const chunkType = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > data.length) break;
    if (chunkType === 'JSON') json = JSON.parse(data.toString('utf8', start, end).trim());
    if (chunkType === 'BIN\u0000') { binaryBytes += chunkLength; binStart = start; }
    offset = end;
  }
  if (!json) return { path: file, fileName: path.basename(file), supported: false, reason: 'GLB has no JSON chunk', bytes: data.length };
  const accessors = json.accessors || [];
  const meshes = json.meshes || [];
  const nodes = json.nodes || [];
  const materials = json.materials || [];
  const images = json.images || [];
  const textures = json.textures || [];
  const bufferViews = json.bufferViews || [];
  let triangles = 0;
  let vertices = 0;
  let primitiveCount = 0;
  const meshReports = [];
  const primitiveModes = {};
  const attributes = new Set();
  const indexComponentTypes = {};
  for (let mi = 0; mi < meshes.length; mi += 1) {
    const mesh = meshes[mi];
    let meshTriangles = 0;
    let meshVertices = 0;
    for (const primitive of mesh.primitives || []) {
      primitiveCount += 1;
      const mode = primitive.mode ?? 4;
      primitiveModes[mode] = (primitiveModes[mode] || 0) + 1;
      for (const key of Object.keys(primitive.attributes || {})) attributes.add(key);
      const pos = primitive.attributes?.POSITION;
      if (typeof pos === 'number' && accessors[pos]) meshVertices += accessors[pos].count || 0;
      let elements = 0;
      if (typeof primitive.indices === 'number' && accessors[primitive.indices]) {
        elements = accessors[primitive.indices].count || 0;
        const ct = accessors[primitive.indices].componentType;
        indexComponentTypes[ct] = (indexComponentTypes[ct] || 0) + 1;
      } else if (typeof pos === 'number' && accessors[pos]) elements = accessors[pos].count || 0;
      let tris = 0;
      if (mode === 4) tris = Math.floor(elements / 3);
      else if (mode === 5 || mode === 6) tris = Math.max(0, elements - 2);
      meshTriangles += tris;
    }
    triangles += meshTriangles;
    vertices += meshVertices;
    meshReports.push({ index: mi, name: mesh.name || `mesh_${mi}`, primitives: (mesh.primitives || []).length, vertices: meshVertices, triangles: meshTriangles });
  }
  const bbox = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], valid: false };
  for (const accessor of accessors) {
    if (accessor.type === 'VEC3' && Array.isArray(accessor.min) && Array.isArray(accessor.max)) {
      bbox.valid = true;
      for (let i = 0; i < 3; i += 1) {
        bbox.min[i] = Math.min(bbox.min[i], accessor.min[i]);
        bbox.max[i] = Math.max(bbox.max[i], accessor.max[i]);
      }
    }
  }
  const imageReports = images.map((image, index) => {
    const view = typeof image.bufferView === 'number' ? bufferViews[image.bufferView] : null;
    const byteOffset = view ? view.byteOffset || 0 : 0;
    const byteLength = view ? view.byteLength || 0 : 0;
    let dimensions = null;
    if (byteLength > 0 && binStart > 0) {
      const bytes = data.subarray(binStart + byteOffset, binStart + byteOffset + byteLength);
      dimensions = readPngDimensions(bytes) || readJpegDimensions(bytes) || readWebpDimensions(bytes);
    }
    return { index, name: image.name || `image_${index}`, mimeType: image.mimeType || null, uri: image.uri || null, byteLength, width: dimensions?.width ?? null, height: dimensions?.height ?? null, format: dimensions?.format ?? null };
  });
  const bufferViewBytes = bufferViews.reduce((sum, view) => sum + (view.byteLength || 0), 0);
  const estimatedAccessorBytes = accessors.reduce((sum, accessor) => sum + ((accessor.count || 0) * accessorTypeSize(accessor.type) * componentBytes(accessor.componentType)), 0);
  const geometryIslands = inspectGeometryIslands(data, binStart, json, inferRoleFromModel(file));
  return {
    path: file,
    fileName: path.basename(file),
    supported: true,
    glbVersion: version,
    bytes: data.length,
    jsonAsset: json.asset || null,
    nodeCount: nodes.length,
    meshCount: meshes.length,
    primitiveCount,
    materialCount: materials.length,
    textureCount: textures.length,
    imageCount: images.length,
    vertices,
    triangles,
    bbox: bbox.valid ? { min: bbox.min.map((v) => Number(v.toFixed(5))), max: bbox.max.map((v) => Number(v.toFixed(5))), size: bbox.max.map((v, i) => Number((v - bbox.min[i]).toFixed(5))) } : null,
    primitiveModes,
    indexComponentTypes,
    attributes: Array.from(attributes).sort(),
    binaryBytes,
    bufferViewBytes,
    estimatedAccessorBytes,
    meshes: meshReports.sort((a, b) => b.triangles - a.triangles),
    geometryIslands,
    nodes: nodes.slice(0, 80).map((node, index) => ({ index, name: node.name || `node_${index}`, mesh: node.mesh ?? null, childCount: (node.children || []).length })),
    materials: materials.map((material, index) => ({ index, name: material.name || `material_${index}`, hasPbr: Boolean(material.pbrMetallicRoughness), doubleSided: Boolean(material.doubleSided) })),
    images: imageReports,
    extensionsUsed: json.extensionsUsed || [],
    extensionsRequired: json.extensionsRequired || []
  };
}

function inferRoleFromModel(file) {
  const low = path.basename(file).toLowerCase();
  for (const hint of defaultModelHints) if (hint.terms.some((term) => low.includes(term))) return hint.role;
  return '';
}

function inferRoleFromImage(file, index) {
  const low = path.basename(file).toLowerCase();
  if (low.includes('tread') || low.includes('track')) return 'treads';
  if (low.includes('tur')) return 'turret';
  if (low.includes('hull') || low.includes('sentinel')) return 'hull';
  return roleOrder[index] || `candidate_${index + 1}`;
}

function chooseVerdict(role, modelReport) {
  const reasons = [];
  if (!modelReport.supported) return { verdict: 'reject', reasons: [modelReport.reason || 'unsupported model format'] };
  const islandCount = modelReport.geometryIslands?.islandCount || 0;
  if (modelReport.meshCount <= 1 && islandCount <= 1) reasons.push('single fused mesh with one connected geometry island; no separable runtime parts');
  else if (modelReport.meshCount <= 1) reasons.push(`single GLB mesh, but ${islandCount} disconnected geometry islands were found; ${modelReport.geometryIslands?.envelopeSummary?.envelopeCount || 0} bbox envelopes identify likely part clusters while retaining every island`);
  if (modelReport.materialCount <= 1) reasons.push('single material; material-region editing will need UV or texture work');
  if (modelReport.imageCount >= 3) reasons.push('embedded PBR-ish texture payload present');
  if (modelReport.triangles > 25000) reasons.push('triangle count above phone-friendly intake budget');
  else if (modelReport.triangles > 15000) reasons.push('triangle count is usable only if this replaces a major static shell');
  else reasons.push('triangle count is within choosy low-poly candidate range');
  if (role === 'treads') {
    if (islandCount > 1) return { verdict: 'usable_real_mesh_grouped', reasons: [...reasons, 'all Meshy islands are retained; bbox envelopes identify tread-foot, wheel, and running-gear clusters for manual selection'] };
    if (modelReport.meshCount <= 1) return { verdict: 'usable_reference_only', reasons: [...reasons, 'tread and wheel systems must animate separately; fused Meshy sculpture is not animation-ready'] };
    if (modelReport.triangles > 15000) return { verdict: 'needs_retopo', reasons: [...reasons, 'tread assembly exceeds preferred animated-running-gear budget'] };
  }
  if (role === 'turret' && modelReport.meshCount <= 1) {
    if (islandCount >= 4) return { verdict: 'usable_real_mesh_grouped', reasons: [...reasons, 'all Meshy islands are retained; bbox envelopes identify combined turret/mantlet, barrel, hatch, and coax candidates for visual choice'] };
    return { verdict: 'usable_real_mesh_grouped', reasons: [...reasons, 'use real mesh if envelopes visually identify turret shell, hatch, mantlet, barrel, and coax'] };
  }
  if (role === 'hull') {
    if (modelReport.triangles > 25000) return { verdict: 'needs_retopo', reasons };
    if (modelReport.meshCount <= 1) return { verdict: islandCount > 1 ? 'usable_real_mesh_grouped' : 'usable_reference_only', reasons: [...reasons, islandCount > 1 ? 'all Meshy hull islands are retained; bbox envelopes identify hull shell, armor panel, and surface-detail clusters' : 'could be judged as a static hull reference, but cannot expose hatches/sockets without cutting'] };
  }
  if (modelReport.triangles <= 15000 && modelReport.meshCount > 1) return { verdict: 'usable_lowpoly', reasons };
  return { verdict: 'needs_retopo', reasons };
}


function align4(value) {
  return (value + 3) & ~3;
}

function pushPadded(chunks, buffer) {
  const offset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  chunks.push(buffer);
  const padded = align4(buffer.length) - buffer.length;
  if (padded > 0) chunks.push(Buffer.alloc(padded));
  return offset;
}

function floatBuffer(values, tupleSize) {
  const buffer = Buffer.alloc(values.length * tupleSize * 4);
  let o = 0;
  for (const tuple of values) {
    for (let i = 0; i < tupleSize; i += 1) {
      buffer.writeFloatLE(tuple[i] || 0, o);
      o += 4;
    }
  }
  return buffer;
}

function indexBuffer(indices, componentType) {
  const bytes = componentType === 5123 ? 2 : 4;
  const buffer = Buffer.alloc(indices.length * bytes);
  for (let i = 0; i < indices.length; i += 1) {
    if (componentType === 5123) buffer.writeUInt16LE(indices[i], i * 2);
    else buffer.writeUInt32LE(indices[i], i * 4);
  }
  return buffer;
}

function collectMajorIslandTriangles(data, binStart, json, role = "") {
  const selected = [];
  for (let meshIndex = 0; meshIndex < (json.meshes || []).length; meshIndex += 1) {
    const mesh = json.meshes[meshIndex];
    for (let primitiveIndex = 0; primitiveIndex < (mesh.primitives || []).length; primitiveIndex += 1) {
      const primitive = mesh.primitives[primitiveIndex];
      const posAccessor = primitive.attributes?.POSITION;
      if (typeof posAccessor !== 'number') continue;
      const positions = readAccessorValues(data, binStart, json, posAccessor);
      const triangles = makeTriangleIndices(data, binStart, json, primitive);
      const parent = new Map();
      const used = new Set();
      const find = (v) => {
        let p = parent.get(v);
        if (p === undefined) { parent.set(v, v); return v; }
        while (p !== parent.get(p)) p = parent.get(p);
        let cur = v;
        while (parent.get(cur) !== p) { const next = parent.get(cur); parent.set(cur, p); cur = next; }
        return p;
      };
      const unite = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
      };
      for (const tri of triangles) {
        used.add(tri[0]); used.add(tri[1]); used.add(tri[2]);
        unite(tri[0], tri[1]); unite(tri[1], tri[2]);
      }
      const groups = new Map();
      for (const index of used) {
        const rootIndex = find(index);
        let group = groups.get(rootIndex);
        if (!group) {
          group = { vertexSet: new Set(), triangles: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
          groups.set(rootIndex, group);
        }
        group.vertexSet.add(index);
      }
      for (const tri of triangles) {
        const group = groups.get(find(tri[0]));
        if (group) group.triangles.push(tri);
      }
      const totalTriangles = triangles.length;
      for (const group of groups.values()) {
        for (const index of group.vertexSet) {
          const pos = positions[index];
          if (!Array.isArray(pos)) continue;
          for (let axis = 0; axis < 3; axis += 1) {
            group.min[axis] = Math.min(group.min[axis], pos[axis]);
            group.max[axis] = Math.max(group.max[axis], pos[axis]);
          }
        }
        const size = group.max.map((v, axis) => Number((v - group.min[axis]).toFixed(5)));
        const island = {
          meshIndex,
          primitiveIndex,
          material: primitive.material ?? 0,
          vertices: group.vertexSet.size,
          triangles: group.triangles.length,
          triangleIndices: group.triangles,
          bbox: { size },
          roleHint: classifyIsland(size)
        };
        const keep = isMajorIsland(island, totalTriangles) || (role === 'treads' && ((island.roleHint === 'wheel_hatch_or_round_plate' && island.triangles >= 20) || (island.roleHint === 'thin_plate_or_panel' && island.triangles >= 30))) || (role === 'turret' && ((island.roleHint === 'wheel_hatch_or_round_plate' && island.triangles >= 25) || (island.roleHint === 'barrel_or_long_pin' && island.triangles >= 25)));
        if (keep) selected.push({ primitive, island });
      }
    }
  }
  return selected;
}

function createMajorIslandGlb(sourceFile, outputFile, role = "") {
  const data = readFileSync(sourceFile);
  if (data.length < 20 || data.toString('utf8', 0, 4) !== 'glTF') return null;
  const length = data.readUInt32LE(8);
  let offset = 12;
  let json = null;
  let binStart = 0;
  while (offset + 8 <= Math.min(length, data.length)) {
    const chunkLength = data.readUInt32LE(offset);
    const chunkType = data.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > data.length) break;
    if (chunkType === 'JSON') json = JSON.parse(data.toString('utf8', start, end).trim());
    if (chunkType === 'BIN\u0000') binStart = start;
    offset = end;
  }
  if (!json || !binStart) return null;
  const selected = collectMajorIslandTriangles(data, binStart, json, role);
  if (!selected.length) return null;
  const firstPrimitive = selected[0].primitive;
  const positionAccessor = firstPrimitive.attributes?.POSITION;
  if (typeof positionAccessor !== 'number') return null;
  const sourcePositions = readAccessorValues(data, binStart, json, positionAccessor);
  const sourceNormals = typeof firstPrimitive.attributes?.NORMAL === 'number' ? readAccessorValues(data, binStart, json, firstPrimitive.attributes.NORMAL) : null;
  const sourceUvs = typeof firstPrimitive.attributes?.TEXCOORD_0 === 'number' ? readAccessorValues(data, binStart, json, firstPrimitive.attributes.TEXCOORD_0) : null;
  const remap = new Map();
  const outPositions = [];
  const outNormals = [];
  const outUvs = [];
  const outIndices = [];
  const addVertex = (sourceIndex) => {
    if (remap.has(sourceIndex)) return remap.get(sourceIndex);
    const next = remap.size;
    remap.set(sourceIndex, next);
    outPositions.push(sourcePositions[sourceIndex] || [0, 0, 0]);
    if (sourceNormals) outNormals.push(sourceNormals[sourceIndex] || [0, 1, 0]);
    if (sourceUvs) outUvs.push(sourceUvs[sourceIndex] || [0, 0]);
    return next;
  };
  for (const entry of selected) {
    for (const tri of entry.island.triangleIndices) {
      outIndices.push(addVertex(tri[0]), addVertex(tri[1]), addVertex(tri[2]));
    }
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const pos of outPositions) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], pos[axis]);
      max[axis] = Math.max(max[axis], pos[axis]);
    }
  }
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  const addBufferView = (buffer, target) => {
    const byteOffset = pushPadded(chunks, buffer);
    const view = { buffer: 0, byteOffset, byteLength: buffer.length };
    if (target) view.target = target;
    bufferViews.push(view);
    return bufferViews.length - 1;
  };
  const posView = addBufferView(floatBuffer(outPositions, 3), 34962);
  accessors.push({ bufferView: posView, componentType: 5126, count: outPositions.length, type: 'VEC3', min, max });
  const attributes = { POSITION: 0 };
  if (sourceNormals) {
    const normalView = addBufferView(floatBuffer(outNormals, 3), 34962);
    accessors.push({ bufferView: normalView, componentType: 5126, count: outNormals.length, type: 'VEC3' });
    attributes.NORMAL = accessors.length - 1;
  }
  if (sourceUvs) {
    const uvView = addBufferView(floatBuffer(outUvs, 2), 34962);
    accessors.push({ bufferView: uvView, componentType: 5126, count: outUvs.length, type: 'VEC2' });
    attributes.TEXCOORD_0 = accessors.length - 1;
  }
  const indexComponentType = outPositions.length <= 65535 ? 5123 : 5125;
  const idxView = addBufferView(indexBuffer(outIndices, indexComponentType), 34963);
  accessors.push({ bufferView: idxView, componentType: indexComponentType, count: outIndices.length, type: 'SCALAR', min: [0], max: [outPositions.length - 1] });
  const indexAccessor = accessors.length - 1;
  const images = [];
  for (const image of json.images || []) {
    if (typeof image.bufferView === 'number') {
      const sourceView = json.bufferViews[image.bufferView];
      const imageBytes = data.subarray(binStart + (sourceView.byteOffset || 0), binStart + (sourceView.byteOffset || 0) + sourceView.byteLength);
      const viewIndex = addBufferView(Buffer.from(imageBytes));
      images.push({ ...image, bufferView: viewIndex });
    } else {
      images.push({ ...image });
    }
  }
  const binary = Buffer.concat(chunks);
  const outJson = {
    asset: { version: '2.0', generator: 'tftm asset intake major-island filter; source ' + path.basename(sourceFile) },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'major_islands_real_mesh_no_chaff', mesh: 0 }],
    meshes: [{ name: 'major_islands_real_mesh_no_chaff', primitives: [{ attributes, indices: indexAccessor, material: firstPrimitive.material ?? 0, mode: 4 }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews,
    accessors,
    materials: JSON.parse(JSON.stringify(json.materials || [{}])),
    textures: JSON.parse(JSON.stringify(json.textures || [])),
    images,
    samplers: JSON.parse(JSON.stringify(json.samplers || [])),
    extras: {
      sourceFile: path.basename(sourceFile),
      policy: 'legacy disabled helper; active envelope workflow retains all Meshy islands',
      selectedIslandCount: selected.length,
      selectedTriangles: outIndices.length / 3,
      selectedVertices: outPositions.length
    }
  };
  const jsonBufferRaw = Buffer.from(JSON.stringify(outJson), 'utf8');
  const jsonBuffer = Buffer.concat([jsonBufferRaw, Buffer.alloc(align4(jsonBufferRaw.length) - jsonBufferRaw.length, 0x20)]);
  const binBuffer = Buffer.concat([binary, Buffer.alloc(align4(binary.length) - binary.length)]);
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonHeader.write('JSON', 4, 'ascii');
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.write('BIN\u0000', 4, 'ascii');
  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer]));
  return { path: outputFile, fileName: path.basename(outputFile), bytes: statSync(outputFile).size, selectedIslandCount: selected.length, triangles: outIndices.length / 3, vertices: outPositions.length };
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'asset';
}
function slashRelative(fromDir, target) {
  return path.relative(fromDir, target).split(path.sep).join('/');
}

function pairCandidates(images, models, labels) {
  if (labels.length || images.length !== models.length) {
    const count = Math.max(images.length, models.length, labels.length);
    return Array.from({ length: count }, (_, index) => ({
      label: labels[index] || inferRoleFromModel(models[index]?.path || '') || inferRoleFromImage(images[index]?.path || '', index),
      image: images[index],
      model: models[index]
    })).filter((p) => p.image || p.model);
  }
  const remainingModels = [...models];
  return images.map((image, index) => {
    const label = inferRoleFromImage(image.path, index);
    let modelIndex = remainingModels.findIndex((model) => inferRoleFromModel(model.path) === label);
    if (modelIndex < 0) modelIndex = 0;
    const [model] = remainingModels.splice(modelIndex, 1);
    return { label, image, model };
  });
}

function copyRecursive(src, dst) {
  const st = statSync(src);
  if (st.isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src)) copyRecursive(path.join(src, entry), path.join(dst, entry));
  } else {
    mkdirSync(path.dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }
  let images = args.images.map((p) => ({ path: path.resolve(p), bytes: statSync(path.resolve(p)).size, mtimeMs: statSync(path.resolve(p)).mtimeMs }));
  let models = args.models.map((p) => ({ path: path.resolve(p), bytes: statSync(path.resolve(p)).size, mtimeMs: statSync(path.resolve(p)).mtimeMs }));
  if (args.picturesNewest) images = newestImages(args.picturesDir, args.picturesNewest);
  if (args.downloadsNewest) models = newestModels(args.downloadsDirs, args.downloadsNewest);
  if (!images.length && !models.length) throw new Error('no candidate images or models found');
  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const outDir = path.resolve(root, args.out || path.join('generated', 'asset-intake', runId));
  mkdirSync(outDir, { recursive: true });
  const stagedDir = path.join(outDir, 'staged');
  if (args.stage) mkdirSync(stagedDir, { recursive: true });
  const pairs = pairCandidates(images, models, args.labels);
  const reportPairs = pairs.map((pair, index) => {
    const imageReport = pair.image ? inspectImage(pair.image.path) : null;
    const modelReport = pair.model ? inspectGlb(pair.model.path) : null;
    const label = pair.label || `candidate_${index + 1}`;
    const pairDir = path.join(stagedDir, `${String(index + 1).padStart(2, '0')}-${safeName(label)}`);
    let stagedImage = null;
    let stagedModel = null;
    if (args.stage) {
      mkdirSync(pairDir, { recursive: true });
      if (pair.image) {
        stagedImage = path.join(pairDir, safeName(path.basename(pair.image.path)));
        copyFileSync(pair.image.path, stagedImage);
      }
      if (pair.model) {
        stagedModel = path.join(pairDir, safeName(path.basename(pair.model.path)));
        copyFileSync(pair.model.path, stagedModel);
      }
    }
    const verdict = modelReport ? chooseVerdict(label, modelReport) : { verdict: 'reject', reasons: ['missing model'] };
    return {
      id: `${String(index + 1).padStart(2, '0')}-${safeName(label)}`,
      label,
      image: imageReport ? { ...imageReport, stagedUrl: stagedImage ? slashRelative(outDir, stagedImage) : null } : null,
      model: modelReport ? { ...modelReport, stagedUrl: stagedModel ? slashRelative(outDir, stagedModel) : null } : null,
      envelopeReview: modelReport?.supported ? modelReport.geometryIslands.envelopeSummary : null,
      verdict: verdict.verdict,
      reasons: verdict.reasons
    };
  });
  const summary = {
    usable_lowpoly: reportPairs.filter((p) => p.verdict === 'usable_lowpoly').length,
    usable_real_mesh_grouped: reportPairs.filter((p) => p.verdict === 'usable_real_mesh_grouped').length,
    usable_reference_only: reportPairs.filter((p) => p.verdict === 'usable_reference_only').length,
    needs_retopo: reportPairs.filter((p) => p.verdict === 'needs_retopo').length,
    reject: reportPairs.filter((p) => p.verdict === 'reject').length
  };
  const report = {
    schema: 'tftm.asset-intake-report.v1',
    generatedAt: new Date().toISOString(),
    runId: path.basename(outDir),
    sourcePolicy: 'diagnostic intake only; staged original GLBs retain all Meshy geometry; envelope groups identify clusters but do not delete islands or create accepted production imports',
    lowPolyPolicy: {
      lowPolyCandidateMaxTriangles: 15000,
      phoneFriendlyMajorStaticShellMaxTriangles: 25000,
      fusedMovingPartsPolicy: 'single GLB mesh may contain many disconnected real mesh islands; group by bbox envelopes first, then let the user choose pieces without deleting geometry'
    },
    outputDir: slashRelative(root, outDir),
    reviewPage: 'asset-intake.html?report=asset-intake/' + path.basename(outDir) + '/report.json',
    latestReviewPage: 'asset-intake.html?report=asset-intake/latest/report.json',
    summary,
    pairs: reportPairs
  };
  writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(path.join(outDir, 'README.md'), `# Asset Intake ${report.runId}\n\nDiagnostic output for Meshy candidate inspection. Staged copies are for review only and are not accepted production imports.\n\nOpen after build: \`${report.reviewPage}\`\n`);
  const latestDir = path.resolve(root, 'generated', 'asset-intake', 'latest');
  rmSync(latestDir, { recursive: true, force: true });
  copyRecursive(outDir, latestDir);
  console.log(JSON.stringify({ ok: true, report: path.join(outDir, 'report.json'), reviewPage: report.reviewPage, latestReviewPage: report.latestReviewPage, summary }, null, 2));
}

main();

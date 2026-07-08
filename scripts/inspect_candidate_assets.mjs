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
  if (modelReport.meshCount <= 1) reasons.push('single fused mesh; no separable runtime parts');
  if (modelReport.materialCount <= 1) reasons.push('single material; material-region editing will need UV or texture work');
  if (modelReport.imageCount >= 3) reasons.push('embedded PBR-ish texture payload present');
  if (modelReport.triangles > 25000) reasons.push('triangle count above phone-friendly intake budget');
  else if (modelReport.triangles > 15000) reasons.push('triangle count is usable only if this replaces a major static shell');
  else reasons.push('triangle count is within choosy low-poly candidate range');
  if (role === 'treads') {
    if (modelReport.meshCount <= 1) return { verdict: 'usable_reference_only', reasons: [...reasons, 'tread and wheel systems must animate separately; fused Meshy sculpture is not animation-ready'] };
    if (modelReport.triangles > 15000) return { verdict: 'needs_retopo', reasons: [...reasons, 'tread assembly exceeds preferred animated-running-gear budget'] };
  }
  if (role === 'turret' && modelReport.meshCount <= 1) return { verdict: 'needs_retopo', reasons: [...reasons, 'turret shell, hatch, mantlet, barrel, and coax need separate pivots/nodes'] };
  if (role === 'hull') {
    if (modelReport.triangles > 25000) return { verdict: 'needs_retopo', reasons };
    if (modelReport.meshCount <= 1) return { verdict: 'usable_reference_only', reasons: [...reasons, 'could be judged as a static hull reference, but cannot expose hatches/sockets without cutting'] };
  }
  if (modelReport.triangles <= 15000 && modelReport.meshCount > 1) return { verdict: 'usable_lowpoly', reasons };
  return { verdict: 'needs_retopo', reasons };
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
      verdict: verdict.verdict,
      reasons: verdict.reasons
    };
  });
  const summary = {
    usable_lowpoly: reportPairs.filter((p) => p.verdict === 'usable_lowpoly').length,
    usable_reference_only: reportPairs.filter((p) => p.verdict === 'usable_reference_only').length,
    needs_retopo: reportPairs.filter((p) => p.verdict === 'needs_retopo').length,
    reject: reportPairs.filter((p) => p.verdict === 'reject').length
  };
  const report = {
    schema: 'tftm.asset-intake-report.v1',
    generatedAt: new Date().toISOString(),
    runId: path.basename(outDir),
    sourcePolicy: 'diagnostic intake only; staged copies are not production imports and do not imply visual acceptance',
    lowPolyPolicy: {
      lowPolyCandidateMaxTriangles: 15000,
      phoneFriendlyMajorStaticShellMaxTriangles: 25000,
      fusedMovingPartsPolicy: 'single fused tread/turret meshes are reference or retopo candidates, not animation-ready runtime parts'
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

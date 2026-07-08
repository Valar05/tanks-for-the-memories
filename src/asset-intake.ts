import './asset-intake.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type IntakePair = {
  id: string;
  label: string;
  verdict: string;
  reasons: string[];
  image?: { fileName: string; stagedUrl?: string; width?: number; height?: number; bytes?: number } | null;
  model?: { fileName: string; stagedUrl?: string; triangles?: number; vertices?: number; meshCount?: number; primitiveCount?: number; materialCount?: number; imageCount?: number; bbox?: { size: number[] }; geometryIslands?: { islandCount: number; majorIslandCount: number; majorTriangleShare: number; largestIslandTriangleShare: number; roleHintCounts: Record<string, number>; majorRoleHintCounts: Record<string, number>; topIslands: Array<{ index: number; triangles: number; vertices: number; roleHint: string; bbox: { size: number[]; center: number[] } }>; majorIslands: Array<{ index: number; triangles: number; vertices: number; roleHint: string; bbox: { size: number[]; center: number[] } }> }; images?: Array<{ width?: number; height?: number; byteLength?: number; mimeType?: string | null }> } | null;
  filteredModel?: { fileName: string; stagedUrl?: string; triangles?: number; vertices?: number; selectedIslandCount?: number; bytes?: number } | null;
  partSelection?: { majorIslandCount: number; majorTriangleShare: number; picks: Array<{ target: string; note: string; candidates: Array<{ index: number; triangles: number; vertices: number; roleHint: string; bbox: { size: number[]; center: number[] } }> }> } | null;
};

type IntakeReport = {
  schema: string;
  generatedAt: string;
  runId: string;
  sourcePolicy: string;
  summary: Record<string, number>;
  pairs: IntakePair[];
};

const root = document.querySelector<HTMLDivElement>('#asset-intake-root');
if (!root) throw new Error('missing #asset-intake-root');

const params = new URLSearchParams(window.location.search);
const reportUrl = params.get('report') || './asset-intake/latest/report.json';
const loader = new GLTFLoader();

function fmtBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return 'unknown';
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes > 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return String(bytes) + ' B';
}

function resolveUrl(base: string, maybeRelative?: string | null) {
  if (!maybeRelative) return '';
  return new URL(maybeRelative, base).toString();
}

function setPressed(button: HTMLButtonElement, value: boolean) {
  button.setAttribute('aria-pressed', value ? 'true' : 'false');
}

function setupViewer(canvas: HTMLCanvasElement, url: string, pair: IntakePair) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d0e);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  camera.position.set(2.2, 1.3, 2.4);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xd8ddcf, 0x1e211c, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaeb7ff, 0.85);
  fill.position.set(-3, 1, -2);
  scene.add(fill);
  const grid = new THREE.GridHelper(2.4, 12, 0x37413d, 0x242c29);
  grid.position.y = -1;
  scene.add(grid);
  let model: THREE.Object3D | null = null;
  let wireframe = false;
  let textured = true;
  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const clayMaterial = new THREE.MeshStandardMaterial({ color: 0x8b896f, roughness: 0.82, metalness: 0.08 });
  const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xd9c46b, wireframe: true });

  function applyMaterialMode() {
    if (!model) return;
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material);
      mesh.material = wireframe ? wireMaterial : textured ? originalMaterials.get(mesh)! : clayMaterial;
    });
  }

  loader.load(url, (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.position.sub(center);
    model.scale.multiplyScalar(1.85 / maxDim);
    scene.add(model);
    controls.target.set(0, 0, 0);
    controls.update();
    applyMaterialMode();
    window.dispatchEvent(new CustomEvent('tftm-asset-intake-model-loaded', { detail: { id: pair.id, fileName: pair.model?.fileName || '' } }));
  }, undefined, (error) => {
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#171b1e';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ff9688';
      context.font = '14px sans-serif';
      context.fillText('model load failed', 18, 28);
    }
    console.error(error);
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    resize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  return {
    toggleWire(button: HTMLButtonElement) {
      wireframe = !wireframe;
      setPressed(button, wireframe);
      applyMaterialMode();
    },
    toggleTexture(button: HTMLButtonElement) {
      textured = !textured;
      setPressed(button, textured);
      applyMaterialMode();
    }
  };
}

function renderReport(report: IntakeReport, baseUrl: string) {
  root.innerHTML = '<main class="asset-shell">' +
    '<header class="asset-header"><h1>Meshy asset intake</h1><p id="asset-summary"></p></header>' +
    '<div class="asset-main"><section class="asset-grid" id="asset-grid"></section><aside class="side-panel" id="side-panel"></aside></div>' +
    '</main>';
  const summary = document.querySelector<HTMLElement>('#asset-summary')!;
  summary.textContent = `${report.runId} / ${report.generatedAt} / ${report.sourcePolicy}`;
  const grid = document.querySelector<HTMLElement>('#asset-grid')!;
  const side = document.querySelector<HTMLElement>('#side-panel')!;
  side.innerHTML = '<section><h2>Summary</h2><dl>' +
    Object.entries(report.summary || {}).map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('') +
    '</dl></section><section><h2>Policy</h2><ul><li>Cloud/Sense review is still required for visual acceptance.</li><li>Generated staged files are diagnostic copies only.</li><li>The viewer loads filtered real Meshy triangles with tiny chaff islands removed.</li></ul></section>';

  for (const pair of report.pairs) {
    const imageUrl = resolveUrl(baseUrl, pair.image?.stagedUrl);
    const modelUrl = resolveUrl(baseUrl, pair.filteredModel?.stagedUrl || pair.model?.stagedUrl);
    const card = document.createElement('article');
    card.className = 'asset-card';
    card.innerHTML = '<div class="image-pane"></div><div class="model-pane"><canvas></canvas><div class="card-footer"></div></div>';
    const imagePane = card.querySelector<HTMLElement>('.image-pane')!;
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `${pair.label} concept image`;
      imagePane.appendChild(img);
    } else {
      imagePane.textContent = 'No image';
    }
    const footer = card.querySelector<HTMLElement>('.card-footer')!;
    const mapBytes = pair.model?.images?.reduce((s, i) => s + (i.byteLength || 0), 0);
    footer.innerHTML = `<h2>${pair.label} <span class="${pair.verdict}">${pair.verdict}</span></h2>` +
      '<div class="meta">' +
      `<span class="badge">${pair.filteredModel?.triangles ?? pair.model?.triangles ?? 0} shown tris</span>` +
      `<span class="badge">${pair.filteredModel?.vertices ?? pair.model?.vertices ?? 0} shown verts</span>` +
      `<span class="badge">${pair.model?.meshCount ?? 0} meshes</span>` +
      `<span class="badge">${pair.model?.geometryIslands?.islandCount ?? 0} islands</span>` +
      `<span class="badge">${pair.filteredModel?.selectedIslandCount ?? pair.model?.geometryIslands?.majorIslandCount ?? 0} kept</span>` +
      `<span class="badge">${pair.model?.imageCount ?? 0} maps</span>` +
      `<span class="badge">${fmtBytes(mapBytes)} maps</span>` +
      '</div>' +
      '<ul>' + pair.reasons.map((reason) => `<li>${reason}</li>`).join('') + '</ul>' +
      '<ul>' + (pair.partSelection?.picks || []).flatMap((pick) => pick.candidates.slice(0, 4).map((island) => `<li>${pick.target}: island ${island.index}, ${island.triangles} tris, ${island.roleHint}, size ${island.bbox.size.map((v) => v.toFixed ? v.toFixed(2) : v).join(' x ')}</li>`)).join('') + '</ul>' +
      '<div class="controls"><button type="button" class="wire">Wire</button><button type="button" class="texture" aria-pressed="true">Texture</button></div>';
    const canvas = card.querySelector<HTMLCanvasElement>('canvas')!;
    if (modelUrl) {
      const viewer = setupViewer(canvas, modelUrl, pair);
      footer.querySelector<HTMLButtonElement>('.wire')!.addEventListener('click', (event) => viewer.toggleWire(event.currentTarget as HTMLButtonElement));
      footer.querySelector<HTMLButtonElement>('.texture')!.addEventListener('click', (event) => viewer.toggleTexture(event.currentTarget as HTMLButtonElement));
    }
    grid.appendChild(card);
  }
  window.dispatchEvent(new CustomEvent('tftm-asset-intake-report-loaded', { detail: { runId: report.runId, pairs: report.pairs.length } }));
}

fetch(reportUrl, { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error(`failed to load ${reportUrl}: ${response.status}`);
    return response.json() as Promise<IntakeReport>;
  })
  .then((report) => renderReport(report, new URL(reportUrl, window.location.href).toString()))
  .catch((error) => {
    root.innerHTML = `<div class="error">${String(error.message || error)}</div>`;
  });

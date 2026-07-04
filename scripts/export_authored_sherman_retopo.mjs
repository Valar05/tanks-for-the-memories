import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self = globalThis;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(buffer).toString('base64');
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
};

const root = process.cwd();
const assetId = 'authored_sherman_retopo_v1';
const outputDir = path.join(root, 'public', 'tftm', 'models', assetId);
const templateDir = path.join(root, 'assets', 'authored', assetId, 'texture_templates');
const runtimePlateDir = path.join(outputDir, 'texture_plates');
const outputGlb = path.join(outputDir, assetId + '.glb');
const outputManifest = path.join(outputDir, 'model_manifest.json');

const facePlateIds = [
  'hull_glacis', 'hull_left', 'hull_right', 'hull_rear', 'engine_deck',
  'turret_front', 'turret_left', 'turret_right', 'turret_top',
  'mantlet', 'barrel_strip', 'track_outer', 'track_inner_top_bottom',
  'wheel_disc', 'bogie_side'
];

const plateColors = {
  hull_glacis: '#5f6b43', hull_left: '#59643f', hull_right: '#59643f', hull_rear: '#4d5737', engine_deck: '#56623f',
  turret_front: '#626d45', turret_left: '#5c6742', turret_right: '#5c6742', turret_top: '#657049',
  mantlet: '#4b4e3b', barrel_strip: '#414438', track_outer: '#2e2c24', track_inner_top_bottom: '#373329',
  wheel_disc: '#4c4635', bogie_side: '#514a38'
};

const materials = new Map(facePlateIds.map((id) => [id, new THREE.MeshStandardMaterial({
  name: id,
  color: new THREE.Color(plateColors[id] || '#667044'),
  roughness: id.includes('track') ? 0.88 : 0.82,
  metalness: id.includes('barrel') || id.includes('mantlet') ? 0.18 : 0.06
})]));

function material(id) {
  const found = materials.get(id);
  if (!found) throw new Error('missing material ' + id);
  return found;
}

function makeMesh(name, geometry, materialId) {
  const mesh = new THREE.Mesh(geometry, material(materialId));
  mesh.name = name;
  mesh.userData.surface_id = materialId;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function quadGeometry(vertices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function boxPlate(name, materialId, width, height, depth, position, rotation = [0, 0, 0]) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = makeMesh(name, geometry, materialId);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

function cylinderPlate(name, materialId, radiusTop, radiusBottom, height, radialSegments, position, rotation = [0, 0, 0]) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1, false);
  const mesh = makeMesh(name, geometry, materialId);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

function addHull(rootGroup) {
  const hull = new THREE.Group();
  hull.name = 'hull_root';
  hull.userData.authored_retopo = true;
  rootGroup.add(hull);

  hull.add(boxPlate('hull_lower_box__hull_left', 'hull_left', 3.2, 0.54, 1.28, [0, 0.0, 0]));
  hull.add(quadPlate('hull_glacis_plate__hull_glacis', 'hull_glacis', [
    [1.6, 0.06, -0.64], [0.78, 0.62, -0.54], [0.78, 0.62, 0.54], [1.6, 0.06, 0.64]
  ]));
  hull.add(quadPlate('engine_deck_plate__engine_deck', 'engine_deck', [
    [0.74, 0.62, -0.55], [-1.52, 0.62, -0.58], [-1.52, 0.62, 0.58], [0.74, 0.62, 0.55]
  ]));
  hull.add(quadPlate('hull_left_sponson__hull_left', 'hull_left', [
    [1.46, 0.08, -0.72], [-1.5, 0.1, -0.72], [-1.36, 0.58, -0.58], [0.8, 0.58, -0.55]
  ]));
  hull.add(quadPlate('hull_right_sponson__hull_right', 'hull_right', [
    [-1.5, 0.1, 0.72], [1.46, 0.08, 0.72], [0.8, 0.58, 0.55], [-1.36, 0.58, 0.58]
  ]));
  hull.add(quadPlate('hull_rear_plate__hull_rear', 'hull_rear', [
    [-1.6, -0.24, 0.62], [-1.6, -0.24, -0.62], [-1.48, 0.56, -0.56], [-1.48, 0.56, 0.56]
  ]));
  hull.add(boxPlate('driver_hatch_left__engine_deck', 'engine_deck', 0.34, 0.035, 0.26, [0.72, 0.66, -0.24], [0, 0, -0.05]));
  hull.add(boxPlate('driver_hatch_right__engine_deck', 'engine_deck', 0.34, 0.035, 0.26, [0.72, 0.66, 0.24], [0, 0, -0.05]));
  hull.add(boxPlate('engine_vent_left__engine_deck', 'engine_deck', 0.58, 0.032, 0.12, [-0.92, 0.66, -0.2]));
  hull.add(boxPlate('engine_vent_right__engine_deck', 'engine_deck', 0.58, 0.032, 0.12, [-0.92, 0.66, 0.2]));
  hull.add(cylinderPlate('turret_ring_socket__turret_top', 'turret_top', 0.48, 0.48, 0.055, 32, [0.05, 0.67, 0], [Math.PI * 0.5, 0, 0]));

  for (const z of [-0.82, 0.82]) {
    const side = z < 0 ? 'left' : 'right';
    const track = boxPlate(side + '_track_motion__track_outer', 'track_outer', 3.28, 0.46, 0.28, [-0.02, -0.23, z]);
    track.name = side + '_track_motion';
    track.userData.surface_id = 'track_outer';
    hull.add(track);
    const top = boxPlate(side + '_track_top_inner__track_inner_top_bottom', 'track_inner_top_bottom', 2.85, 0.12, 0.24, [-0.05, 0.08, z]);
    hull.add(top);
    const bottom = boxPlate(side + '_track_ground_run__track_inner_top_bottom', 'track_inner_top_bottom', 2.95, 0.12, 0.24, [-0.05, -0.48, z]);
    hull.add(bottom);
    const roadwheelGroup = new THREE.Group();
    roadwheelGroup.name = side + '_roadwheel_group';
    roadwheelGroup.userData.surface_id = 'wheel_disc';
    hull.add(roadwheelGroup);
    for (const x of [-1.12, -0.36, 0.4, 1.16]) {
      roadwheelGroup.add(cylinderPlate(side + '_roadwheel_' + x.toFixed(2) + '__wheel_disc', 'wheel_disc', 0.18, 0.18, 0.08, 24, [x, -0.25, z + (z < 0 ? -0.17 : 0.17)], [Math.PI * 0.5, 0, 0]));
    }
    roadwheelGroup.add(cylinderPlate(side + '_front_sprocket__bogie_side', 'bogie_side', 0.23, 0.23, 0.09, 24, [1.48, -0.2, z + (z < 0 ? -0.17 : 0.17)], [Math.PI * 0.5, 0, 0]));
    roadwheelGroup.add(cylinderPlate(side + '_rear_idler__bogie_side', 'bogie_side', 0.22, 0.22, 0.09, 24, [-1.48, -0.22, z + (z < 0 ? -0.17 : 0.17)], [Math.PI * 0.5, 0, 0]));
  }

  return hull;
}

function quadPlate(name, materialId, vertices) {
  return makeMesh(name, quadGeometry(vertices), materialId);
}

function addTurret(rootGroup) {
  const turretPivot = new THREE.Group();
  turretPivot.name = 'turret_traverse_pivot';
  turretPivot.position.set(0.05, 0.7, 0);
  turretPivot.userData.authored_retopo = true;
  rootGroup.add(turretPivot);

  const turret = new THREE.Group();
  turret.name = 'turret_shell';
  turret.userData.surface_id = 'turret_top';
  turretPivot.add(turret);
  turret.add(boxPlate('turret_core__turret_left', 'turret_left', 0.98, 0.38, 0.78, [0, 0.18, 0]));
  turret.add(quadPlate('turret_front_plate__turret_front', 'turret_front', [
    [0.5, 0.0, -0.36], [0.72, 0.16, -0.28], [0.72, 0.16, 0.28], [0.5, 0.0, 0.36]
  ]));
  turret.add(quadPlate('turret_left_cheek__turret_left', 'turret_left', [
    [0.5, 0.0, -0.36], [-0.48, 0.02, -0.4], [-0.36, 0.4, -0.31], [0.66, 0.34, -0.26]
  ]));
  turret.add(quadPlate('turret_right_cheek__turret_right', 'turret_right', [
    [-0.48, 0.02, 0.4], [0.5, 0.0, 0.36], [0.66, 0.34, 0.26], [-0.36, 0.4, 0.31]
  ]));
  turret.add(quadPlate('turret_roof__turret_top', 'turret_top', [
    [0.66, 0.34, -0.26], [-0.36, 0.4, -0.31], [-0.36, 0.4, 0.31], [0.66, 0.34, 0.26]
  ]));
  turret.add(cylinderPlate('commander_hatch__turret_top', 'turret_top', 0.18, 0.2, 0.07, 24, [-0.2, 0.48, -0.18]));
  turret.add(cylinderPlate('loader_hatch__turret_top', 'turret_top', 0.14, 0.16, 0.05, 20, [0.12, 0.46, 0.22]));

  const gunPivot = new THREE.Group();
  gunPivot.name = 'cannon_elevation_pivot';
  gunPivot.position.set(0.68, 0.16, 0);
  turretPivot.add(gunPivot);
  gunPivot.add(boxPlate('mantlet_block__mantlet', 'mantlet', 0.18, 0.28, 0.42, [0.0, 0, 0]));
  const barrel = cylinderPlate('barrel__barrel_strip', 'barrel_strip', 0.055, 0.065, 1.25, 24, [0.68, 0, 0], [0, 0, Math.PI * 0.5]);
  gunPivot.add(barrel);
  const muzzle = cylinderPlate('muzzle_ring__barrel_strip', 'barrel_strip', 0.07, 0.07, 0.08, 24, [1.34, 0, 0], [0, 0, Math.PI * 0.5]);
  gunPivot.add(muzzle);

  return turretPivot;
}

function writeTemplatePng(file, id, color) {
  const result = spawnSync('python3', ['-c', `
from PIL import Image, ImageDraw
import sys
file, color = sys.argv[1], sys.argv[2]
img = Image.new('RGB', (1024, 1024), color)
d = ImageDraw.Draw(img, 'RGBA')
d.rectangle((48, 48, 976, 976), outline=(216, 209, 167, 140), width=8)
d.rectangle((88, 88, 936, 936), outline=(37, 41, 30, 72), width=4)
d.line((128, 512, 896, 512), fill=(32, 36, 25, 32), width=2)
d.line((512, 128, 512, 896), fill=(32, 36, 25, 32), width=2)
img.save(file)
`, file, color], { encoding: 'utf8' });
  if ((result.status ?? 1) !== 0) {
    throw new Error('failed to write plate template ' + id + ': ' + (result.stderr || result.stdout));
  }
}

const model = new THREE.Group();
model.name = 'tank_root';
model.userData = {
  asset_id: assetId,
  authored_retopo: true,
  uv_policy: 'split_face_texture_plates',
  rejected_source_policy: 'no Meshy chassis or turret geometry'
};
addHull(model);
addTurret(model);
model.add(boxPlate('antenna_mount__turret_top', 'turret_top', 0.04, 0.34, 0.04, [-0.42, 1.08, 0.28], [0.15, 0.0, 0.1]));

const scene = new THREE.Scene();
scene.name = assetId + '_scene';
scene.add(model);
scene.updateWorldMatrix(true, true);

mkdirSync(outputDir, { recursive: true });
mkdirSync(templateDir, { recursive: true });
mkdirSync(runtimePlateDir, { recursive: true });
for (const id of facePlateIds) {
  writeTemplatePng(path.join(templateDir, id + '.png'), id, plateColors[id]);
  writeTemplatePng(path.join(runtimePlateDir, id + '.png'), id, plateColors[id]);
}

const exporter = new GLTFExporter();
const exported = await new Promise((resolve, reject) => {
  exporter.parse(scene, resolve, reject, { binary: true, trs: false, onlyVisible: true, maxTextureSize: 1024 });
});
writeFileSync(outputGlb, Buffer.from(exported));

function countTriangles(object) {
  let triangles = 0;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const primitive = child.geometry.getIndex()?.count || child.geometry.getAttribute('position')?.count || 0;
    triangles += Math.floor(primitive / 3);
  });
  return triangles;
}

const nodeContract = [
  'tank_root', 'hull_root', 'turret_traverse_pivot', 'turret_shell', 'cannon_elevation_pivot',
  'mantlet_block__mantlet', 'barrel__barrel_strip', 'left_track_motion', 'right_track_motion',
  'left_roadwheel_group', 'right_roadwheel_group', 'commander_hatch__turret_top'
];
const manifest = {
  asset_id: assetId,
  display_name: 'Authored Sherman Retopo V1',
  generated_at: new Date().toISOString(),
  generator: 'scripts/export_authored_sherman_retopo.mjs',
  output_glb: 'public/tftm/models/authored_sherman_retopo_v1/authored_sherman_retopo_v1.glb',
  source_policy: 'fully authored low-poly hard-surface geometry; no Meshy chassis or turret imports',
  uv_policy: 'split face texture plates, one 0-1 rectangular UV material per paintable surface group',
  dalle_paintability: {
    template_dir: 'assets/authored/authored_sherman_retopo_v1/texture_templates',
    runtime_plate_dir: 'public/tftm/models/authored_sherman_retopo_v1/texture_plates',
    prompt_rule: 'Use the filename/surface id in the prompt; do not ask DALL-E to paint labels or readable typography inside the image.',
    first_pass: 'albedo plates only; derive roughness/normal after cloud/Sense accepts silhouette and paint language.'
  },
  face_plate_ids: facePlateIds,
  node_contract: nodeContract,
  runtime_contract: {
    turret_traverse: 'rotate turret_traverse_pivot around Y',
    cannon_elevation: 'rotate cannon_elevation_pivot around local Z/X adapter in runtime as needed',
    tread_motion: 'scroll material maps on left_track_motion and right_track_motion',
    wheel_motion: 'rotate children of left_roadwheel_group and right_roadwheel_group',
    commander_hatch: 'commander_hatch__turret_top is a named posture marker, not final hatch rig'
  },
  approximate_triangles: countTriangles(scene)
};
writeFileSync(outputManifest, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ outputGlb, outputManifest, approximateTriangles: manifest.approximate_triangles, facePlateIds }, null, 2));

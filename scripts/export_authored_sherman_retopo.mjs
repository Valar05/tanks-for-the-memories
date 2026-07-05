import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { requirePromptContract } from './prompt_contract_guard.mjs';
requirePromptContract({ action: 'asset_export' });
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
const silhouetteRevision = 'v1.1-sherman-silhouette-subdivision';
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

function boxPlate(name, materialId, width, height, depth, position, rotation = [0, 0, 0], segments = [1, 1, 1]) {
  const geometry = new THREE.BoxGeometry(width, height, depth, ...segments);
  const mesh = makeMesh(name, geometry, materialId);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

function roundedBoxPlate(name, materialId, width, height, depth, position, radius = 0.035, segments = 2, rotation = [0, 0, 0]) {
  const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
  const mesh = makeMesh(name, geometry, materialId);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

function cylinderPlate(name, materialId, radiusTop, radiusBottom, height, radialSegments, position, rotation = [0, 0, 0], heightSegments = 1) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, false);
  const mesh = makeMesh(name, geometry, materialId);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

function ellipseCylinderPlate(name, materialId, radius, height, radialSegments, position, scale, rotation = [0, 0, 0], heightSegments = 1) {
  const mesh = cylinderPlate(name, materialId, radius, radius, height, radialSegments, position, rotation, heightSegments);
  mesh.scale.set(...scale);
  return mesh;
}

function domePlate(name, materialId, radius, position, scale) {
  const geometry = new THREE.SphereGeometry(radius, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const mesh = makeMesh(name, geometry, materialId);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  return mesh;
}

function addHull(rootGroup) {
  const hull = new THREE.Group();
  hull.name = 'hull_root';
  hull.userData.authored_retopo = true;
  rootGroup.add(hull);

  hull.add(roundedBoxPlate('hull_lower_box__hull_left', 'hull_left', 3.42, 0.5, 1.22, [-0.08, -0.08, 0], 0.035, 2));
  hull.add(roundedBoxPlate('transmission_cover_front__hull_glacis', 'hull_glacis', 0.26, 0.42, 1.04, [1.63, 0.04, 0], 0.09, 3));
  hull.add(quadPlate('hull_glacis_plate__hull_glacis', 'hull_glacis', [
    [1.55, 0.16, -0.58], [0.72, 0.66, -0.48], [0.72, 0.66, 0.48], [1.55, 0.16, 0.58]
  ]));
  hull.add(quadPlate('engine_deck_plate__engine_deck', 'engine_deck', [
    [0.68, 0.66, -0.52], [-1.5, 0.62, -0.56], [-1.54, 0.62, 0.56], [0.68, 0.66, 0.52]
  ]));
  hull.add(quadPlate('hull_left_sponson__hull_left', 'hull_left', [
    [1.42, 0.08, -0.75], [-1.56, 0.08, -0.75], [-1.42, 0.55, -0.6], [0.76, 0.62, -0.52]
  ]));
  hull.add(quadPlate('hull_right_sponson__hull_right', 'hull_right', [
    [-1.56, 0.08, 0.75], [1.42, 0.08, 0.75], [0.76, 0.62, 0.52], [-1.42, 0.55, 0.6]
  ]));
  hull.add(quadPlate('hull_rear_plate__hull_rear', 'hull_rear', [
    [-1.66, -0.28, 0.6], [-1.66, -0.28, -0.6], [-1.5, 0.56, -0.54], [-1.5, 0.56, 0.54]
  ]));
  hull.add(boxPlate('front_fender_left__hull_left', 'hull_left', 0.5, 0.035, 0.16, [1.38, 0.19, -0.8], [0, 0, -0.18]));
  hull.add(boxPlate('front_fender_right__hull_right', 'hull_right', 0.5, 0.035, 0.16, [1.38, 0.19, 0.8], [0, 0, -0.18]));
  hull.add(boxPlate('rear_fender_left__hull_left', 'hull_left', 0.52, 0.032, 0.16, [-1.38, 0.14, -0.8], [0, 0, 0.08]));
  hull.add(boxPlate('rear_fender_right__hull_right', 'hull_right', 0.52, 0.032, 0.16, [-1.38, 0.14, 0.8], [0, 0, 0.08]));
  hull.add(boxPlate('driver_hatch_left__engine_deck', 'engine_deck', 0.34, 0.035, 0.24, [0.76, 0.7, -0.23], [0, 0, -0.05]));
  hull.add(boxPlate('driver_hatch_right__engine_deck', 'engine_deck', 0.34, 0.035, 0.24, [0.76, 0.7, 0.23], [0, 0, -0.05]));
  hull.add(boxPlate('engine_vent_left__engine_deck', 'engine_deck', 0.58, 0.032, 0.11, [-0.9, 0.665, -0.2]));
  hull.add(boxPlate('engine_vent_right__engine_deck', 'engine_deck', 0.58, 0.032, 0.11, [-0.9, 0.665, 0.2]));
  hull.add(boxPlate('rear_stowage_lip__hull_rear', 'hull_rear', 0.08, 0.12, 0.92, [-1.62, 0.62, 0]));
  hull.add(cylinderPlate('turret_ring_socket__turret_top', 'turret_top', 0.52, 0.52, 0.055, 40, [0.02, 0.69, 0], [Math.PI * 0.5, 0, 0]));

  for (const z of [-0.83, 0.83]) {
    const side = z < 0 ? 'left' : 'right';
    const sign = z < 0 ? -1 : 1;
    const track = roundedBoxPlate(side + '_track_motion__track_outer', 'track_outer', 3.48, 0.5, 0.28, [-0.05, -0.25, z], 0.095, 3);
    track.name = side + '_track_motion';
    track.userData.surface_id = 'track_outer';
    hull.add(track);
    hull.add(boxPlate(side + '_track_top_inner__track_inner_top_bottom', 'track_inner_top_bottom', 3.0, 0.12, 0.22, [-0.06, 0.09, z]));
    hull.add(boxPlate(side + '_track_ground_run__track_inner_top_bottom', 'track_inner_top_bottom', 3.1, 0.12, 0.22, [-0.06, -0.5, z]));
    for (const x of [-1.52, -1.2, -0.88, -0.56, -0.24, 0.08, 0.4, 0.72, 1.04, 1.36]) {
      hull.add(boxPlate(side + '_track_cleat_top_' + x.toFixed(2) + '__track_outer', 'track_outer', 0.035, 0.08, 0.3, [x, 0.18, z]));
      hull.add(boxPlate(side + '_track_cleat_bottom_' + x.toFixed(2) + '__track_outer', 'track_outer', 0.035, 0.08, 0.3, [x, -0.58, z]));
    }
    const roadwheelGroup = new THREE.Group();
    roadwheelGroup.name = side + '_roadwheel_group';
    roadwheelGroup.userData.surface_id = 'wheel_disc';
    hull.add(roadwheelGroup);
    for (const bogieX of [-0.98, -0.18, 0.68]) {
      roadwheelGroup.add(roundedBoxPlate(side + '_vvss_bogie_' + bogieX.toFixed(2) + '__bogie_side', 'bogie_side', 0.48, 0.16, 0.08, [bogieX, -0.06, z + sign * 0.18], 0.025, 2));
      roadwheelGroup.add(boxPlate(side + '_vvss_arm_front_' + bogieX.toFixed(2) + '__bogie_side', 'bogie_side', 0.28, 0.04, 0.075, [bogieX + 0.12, -0.18, z + sign * 0.18], [0, 0, -0.45]));
      roadwheelGroup.add(boxPlate(side + '_vvss_arm_rear_' + bogieX.toFixed(2) + '__bogie_side', 'bogie_side', 0.28, 0.04, 0.075, [bogieX - 0.12, -0.18, z + sign * 0.18], [0, 0, 0.45]));
      for (const dx of [-0.16, 0.16]) {
        roadwheelGroup.add(cylinderPlate(side + '_roadwheel_' + (bogieX + dx).toFixed(2) + '__wheel_disc', 'wheel_disc', 0.145, 0.145, 0.075, 28, [bogieX + dx, -0.32, z + sign * 0.19], [Math.PI * 0.5, 0, 0]));
      }
    }
    roadwheelGroup.add(cylinderPlate(side + '_front_sprocket__bogie_side', 'bogie_side', 0.25, 0.25, 0.09, 30, [1.48, -0.2, z + sign * 0.18], [Math.PI * 0.5, 0, 0]));
    roadwheelGroup.add(cylinderPlate(side + '_rear_idler__bogie_side', 'bogie_side', 0.22, 0.22, 0.09, 30, [-1.5, -0.23, z + sign * 0.18], [Math.PI * 0.5, 0, 0]));
    roadwheelGroup.add(cylinderPlate(side + '_return_roller_front__wheel_disc', 'wheel_disc', 0.085, 0.085, 0.06, 20, [0.58, 0.0, z + sign * 0.19], [Math.PI * 0.5, 0, 0]));
    roadwheelGroup.add(cylinderPlate(side + '_return_roller_rear__wheel_disc', 'wheel_disc', 0.085, 0.085, 0.06, 20, [-0.78, 0.0, z + sign * 0.19], [Math.PI * 0.5, 0, 0]));
  }

  return hull;
}

function quadPlate(name, materialId, vertices) {
  return makeMesh(name, quadGeometry(vertices), materialId);
}

function addTurret(rootGroup) {
  const turretPivot = new THREE.Group();
  turretPivot.name = 'turret_traverse_pivot';
  turretPivot.position.set(0.02, 0.71, 0);
  turretPivot.userData.authored_retopo = true;
  rootGroup.add(turretPivot);

  const turret = new THREE.Group();
  turret.name = 'turret_shell';
  turret.userData.surface_id = 'turret_top';
  turretPivot.add(turret);
  turret.add(ellipseCylinderPlate('turret_cast_lower__turret_left', 'turret_left', 0.48, 0.34, 28, [-0.02, 0.16, 0], [1.25, 1.0, 0.86], [0, 0, 0], 2));
  turret.add(domePlate('turret_cast_roof__turret_top', 'turret_top', 0.52, [-0.02, 0.28, 0], [1.12, 0.55, 0.82]));
  turret.add(roundedBoxPlate('turret_rear_bustle__turret_left', 'turret_left', 0.42, 0.28, 0.58, [-0.45, 0.18, 0], 0.08, 3));
  turret.add(quadPlate('turret_front_plate__turret_front', 'turret_front', [
    [0.46, 0.02, -0.36], [0.72, 0.18, -0.26], [0.72, 0.18, 0.26], [0.46, 0.02, 0.36]
  ]));
  turret.add(quadPlate('turret_left_cheek__turret_left', 'turret_left', [
    [0.46, 0.02, -0.36], [-0.48, 0.04, -0.42], [-0.34, 0.42, -0.3], [0.64, 0.34, -0.24]
  ]));
  turret.add(quadPlate('turret_right_cheek__turret_right', 'turret_right', [
    [-0.48, 0.04, 0.42], [0.46, 0.02, 0.36], [0.64, 0.34, 0.24], [-0.34, 0.42, 0.3]
  ]));
  turret.add(quadPlate('turret_roof_flattened_panel__turret_top', 'turret_top', [
    [0.54, 0.43, -0.22], [-0.28, 0.48, -0.26], [-0.28, 0.48, 0.26], [0.54, 0.43, 0.22]
  ]));
  turret.add(cylinderPlate('commander_hatch__turret_top', 'turret_top', 0.19, 0.2, 0.07, 28, [-0.22, 0.56, -0.18]));
  turret.add(cylinderPlate('loader_hatch__turret_top', 'turret_top', 0.145, 0.16, 0.055, 24, [0.15, 0.52, 0.23]));
  turret.add(boxPlate('turret_periscope_left__turret_top', 'turret_top', 0.18, 0.055, 0.08, [0.2, 0.55, -0.17]));
  turret.add(boxPlate('turret_periscope_right__turret_top', 'turret_top', 0.18, 0.055, 0.08, [0.28, 0.53, 0.17]));

  const gunPivot = new THREE.Group();
  gunPivot.name = 'cannon_elevation_pivot';
  gunPivot.position.set(0.68, 0.19, 0);
  turretPivot.add(gunPivot);
  gunPivot.add(roundedBoxPlate('mantlet_block__mantlet', 'mantlet', 0.22, 0.32, 0.44, [0.0, 0, 0], 0.055, 3));
  const barrel = cylinderPlate('barrel__barrel_strip', 'barrel_strip', 0.048, 0.066, 1.38, 28, [0.76, 0.0, 0], [0, 0, Math.PI * 0.5], 1);
  gunPivot.add(barrel);
  const muzzle = cylinderPlate('muzzle_ring__barrel_strip', 'barrel_strip', 0.07, 0.07, 0.075, 28, [1.48, 0, 0], [0, 0, Math.PI * 0.5]);
  gunPivot.add(muzzle);

  return turretPivot;
}

function writeTemplatePng(file, id, color, guide = true) {
  const result = spawnSync('python3', ['-c', `
from PIL import Image, ImageDraw
import random, sys
file, color, guide, seed = sys.argv[1], sys.argv[2], sys.argv[3] == '1', sys.argv[4]
rng = random.Random(seed)
img = Image.new('RGB', (1024, 1024), color)
p = img.load()
base = tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
for y in range(1024):
    shade = int((y / 1023 - 0.5) * 18)
    for x in range(1024):
        if (x + y) % 7 == 0:
            jitter = rng.randint(-5, 5)
            p[x, y] = tuple(max(0, min(255, c + shade + jitter)) for c in base)
d = ImageDraw.Draw(img, 'RGBA')
# Runtime plates must not show obvious seams; authoring templates keep a guide border outside the safe paint area.
if guide:
    d.rectangle((52, 52, 972, 972), outline=(216, 209, 167, 132), width=6)
    d.rectangle((92, 92, 932, 932), outline=(37, 41, 30, 58), width=3)
    d.line((132, 512, 892, 512), fill=(32, 36, 25, 24), width=2)
    d.line((512, 132, 512, 892), fill=(32, 36, 25, 24), width=2)
else:
    for _ in range(34):
        x0 = rng.randint(80, 920)
        y0 = rng.randint(80, 920)
        x1 = x0 + rng.randint(18, 90)
        y1 = y0 + rng.randint(1, 4)
        d.line((x0, y0, x1, y1), fill=(30, 34, 24, rng.randint(10, 24)), width=rng.randint(1, 2))
img.save(file)
`, file, color, guide ? '1' : '0', id], { encoding: 'utf8' });
  if ((result.status ?? 1) !== 0) {
    throw new Error('failed to write plate template ' + id + ': ' + (result.stderr || result.stdout));
  }
}

const model = new THREE.Group();
model.name = 'tank_root';
model.userData = {
  asset_id: assetId,
  silhouette_revision: silhouetteRevision,
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
  writeTemplatePng(path.join(templateDir, id + '.png'), id, plateColors[id], true);
  writeTemplatePng(path.join(runtimePlateDir, id + '.png'), id, plateColors[id], false);
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
  display_name: 'Authored Sherman Retopo V1.1',
  silhouette_revision: silhouetteRevision,
  generated_at: new Date().toISOString(),
  generator: 'scripts/export_authored_sherman_retopo.mjs',
  output_glb: 'public/tftm/models/authored_sherman_retopo_v1/authored_sherman_retopo_v1.glb',
  source_policy: 'fully authored low-poly hard-surface geometry with added silhouette subdivision/detail layer; no Meshy chassis or turret imports',
  uv_policy: 'split face texture plates, one 0-1 rectangular UV material per paintable surface group',
  dalle_paintability: {
    template_dir: 'assets/authored/authored_sherman_retopo_v1/texture_templates',
    runtime_plate_dir: 'public/tftm/models/authored_sherman_retopo_v1/texture_plates',
    prompt_rule: 'Use the filename/surface id in the prompt; do not ask DALL-E to paint labels or readable typography inside the image.',
    first_pass: 'runtime albedo plates avoid visible guide seams; authoring templates retain safe-area guides; derive roughness/normal after cloud/Sense accepts silhouette and paint language.'
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

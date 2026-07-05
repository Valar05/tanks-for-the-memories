import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSET_ID = 'authored_sherman_armored_v1'
BLEND_PATH = ROOT / 'assets' / 'authored' / ASSET_ID / f'{ASSET_ID}.blend'
MODEL_MANIFEST_PATH = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID / 'model_manifest.json'
OUTPUT_DIR = ROOT / 'generated' / 'blender-visibility' / ASSET_ID
RENDER_DIR = OUTPUT_DIR / 'renders'
MANIFEST_PATH = OUTPUT_DIR / 'manifest.json'

WIDTH = 720
HEIGHT = 540

VIEWS = [
    {
        'id': 'front',
        'label': 'Front',
        'camera': (5.8, 0.0, 1.15),
        'target': (0.05, 0.0, 0.12),
        'ortho_scale': 3.2,
        'purpose': 'overall front silhouette and glacis ownership'
    },
    {
        'id': 'left_side',
        'label': 'Left side',
        'camera': (0.0, -6.0, 1.05),
        'target': (0.0, 0.0, 0.05),
        'ortho_scale': 3.8,
        'purpose': 'left track skirt, roadwheel occlusion, and side gap read'
    },
    {
        'id': 'right_side',
        'label': 'Right side',
        'camera': (0.0, 6.0, 1.05),
        'target': (0.0, 0.0, 0.05),
        'ortho_scale': 3.8,
        'purpose': 'right track skirt, roadwheel occlusion, and side gap read'
    },
    {
        'id': 'front_left_three_quarter',
        'label': 'Front left 3/4',
        'camera': (5.0, -4.2, 1.35),
        'target': (0.10, -0.10, 0.08),
        'ortho_scale': 3.9,
        'purpose': 'front-left gap and hull/track relationship'
    },
    {
        'id': 'front_right_three_quarter',
        'label': 'Front right 3/4',
        'camera': (5.0, 4.2, 1.35),
        'target': (0.10, 0.10, 0.08),
        'ortho_scale': 3.9,
        'purpose': 'front-right gap and hull/track relationship'
    },
    {
        'id': 'front_left_gap_close',
        'label': 'Front left gap close',
        'camera': (3.4, -3.4, 0.70),
        'target': (1.08, -0.94, 0.03),
        'ortho_scale': 1.28,
        'purpose': 'close-up of left glacis/track gap'
    },
    {
        'id': 'front_right_gap_close',
        'label': 'Front right gap close',
        'camera': (3.4, 3.4, 0.70),
        'target': (1.08, 0.94, 0.03),
        'ortho_scale': 1.28,
        'purpose': 'close-up of right glacis/track gap'
    }
    ,
    {
        'id': 'rear',
        'label': 'Rear',
        'camera': (-5.8, 0.0, 1.15),
        'target': (-0.10, 0.0, 0.08),
        'ortho_scale': 3.35,
        'purpose': 'overall rear silhouette and idler gap ownership'
    },
    {
        'id': 'rear_left_three_quarter',
        'label': 'Rear left 3/4',
        'camera': (-5.0, -4.2, 1.35),
        'target': (-0.90, -0.10, 0.04),
        'ortho_scale': 3.9,
        'purpose': 'rear-left larger hull/track gap relationship'
    },
    {
        'id': 'rear_right_three_quarter',
        'label': 'Rear right 3/4',
        'camera': (-5.0, 4.2, 1.35),
        'target': (-0.90, 0.10, 0.04),
        'ortho_scale': 3.9,
        'purpose': 'rear-right larger hull/track gap relationship'
    },
    {
        'id': 'rear_left_gap_close',
        'label': 'Rear left gap close',
        'camera': (-3.45, -3.45, 0.72),
        'target': (-1.18, -0.94, 0.02),
        'ortho_scale': 1.36,
        'purpose': 'close-up of left rear idler/sponson gap'
    },
    {
        'id': 'rear_right_gap_close',
        'label': 'Rear right gap close',
        'camera': (-3.45, 3.45, 0.72),
        'target': (-1.18, 0.94, 0.02),
        'ortho_scale': 1.36,
        'purpose': 'close-up of right rear idler/sponson gap'
    }
]

PASSES = [
    {'id': 'material', 'label': 'Material', 'mode': 'material'},
    {'id': 'clay', 'label': 'Clay', 'mode': 'clay'},
    {'id': 'problem', 'label': 'Problem', 'mode': 'problem'}
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def material(name, color, roughness=0.82, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat


def set_camera(camera, location, target, ortho_scale):
    camera.location = Vector(location)
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ortho_scale


def configure_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.film_transparent = False
    scene.world.color = (0.055, 0.058, 0.052)
    camera_data = bpy.data.cameras.new('offline_visibility_camera')
    camera = bpy.data.objects.new('offline_visibility_camera', camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    sun_data = bpy.data.lights.new('offline_visibility_sun', 'SUN')
    sun = bpy.data.objects.new('offline_visibility_sun', sun_data)
    sun.rotation_euler = (math.radians(42), 0, math.radians(35))
    sun_data.energy = 2.0
    bpy.context.collection.objects.link(sun)
    area_data = bpy.data.lights.new('offline_visibility_softbox', 'AREA')
    area = bpy.data.objects.new('offline_visibility_softbox', area_data)
    area.location = (1.5, -3.0, 4.0)
    area_data.energy = 420
    area_data.size = 5.0
    bpy.context.collection.objects.link(area)
    return scene, camera


def mesh_objects():
    return [obj for obj in bpy.data.objects if obj.type == 'MESH']


def store_materials(objects):
    return {obj.name: [slot.material for slot in obj.material_slots] for obj in objects}


def restore_materials(objects, stored):
    for obj in objects:
        original = stored.get(obj.name, [])
        while len(obj.material_slots) < len(original):
            obj.data.materials.append(None)
        for index, mat in enumerate(original):
            obj.material_slots[index].material = mat


def replace_all_slots(obj, mat):
    if not obj.material_slots:
        obj.data.materials.append(mat)
    for slot in obj.material_slots:
        slot.material = mat


def apply_clay(objects):
    clay = material('diagnostic_clay_neutral', (0.64, 0.64, 0.60, 1), 0.9, 0.0)
    for obj in objects:
        replace_all_slots(obj, clay)


def apply_problem_materials(objects):
    hull = material('diagnostic_hull_olive', (0.42, 0.52, 0.26, 1), 0.86, 0.02)
    gap = material('diagnostic_gap_hot_magenta', (1.0, 0.05, 0.42, 1), 0.74, 0.0)
    track = material('diagnostic_track_black', (0.02, 0.018, 0.014, 1), 0.92, 0.0)
    wheel = material('diagnostic_wheel_cyan', (0.0, 0.55, 1.0, 1), 0.8, 0.0)
    turret = material('diagnostic_turret_steel', (0.56, 0.58, 0.52, 1), 0.82, 0.05)
    gun = material('diagnostic_gun_yellow', (1.0, 0.78, 0.12, 1), 0.78, 0.05)
    other = material('diagnostic_other_gray', (0.36, 0.36, 0.34, 1), 0.88, 0.0)
    for obj in objects:
        name = obj.name.lower()
        surface = str(obj.get('surface_id', '')).lower()
        mat = other
        if any(token in name for token in ['gap', 'slot', 'shoulder', 'cheek', 'cover', 'closure', 'blocker', 'sponson', 'track_return']) or any(token in surface for token in ['hull_left', 'hull_right', 'hull_glacis']):
            mat = gap if any(token in name for token in ['gap', 'slot', 'shoulder', 'cheek', 'cover', 'closure', 'blocker', 'sponson', 'track_return']) else hull
        if 'track' in name or 'track' in surface or 'skirt' in name or 'cleat' in name:
            mat = track
        if 'wheel' in name or 'bogie' in name or 'idler' in name or 'sprocket' in name:
            mat = wheel
        if 'turret' in name or 'hatch' in name or 'periscope' in name:
            mat = turret
        if 'barrel' in name or 'mantlet' in name or 'coaxial' in name or 'muzzle' in name:
            mat = gun
        replace_all_slots(obj, mat)


def render_image(scene, camera, view, render_pass):
    set_camera(camera, view['camera'], view['target'], view['ortho_scale'])
    path = RENDER_DIR / f"{view['id']}__{render_pass['id']}.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return path


def main():
    if not BLEND_PATH.exists():
        raise FileNotFoundError(BLEND_PATH)
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))
    scene, camera = configure_scene()
    objects = mesh_objects()
    stored = store_materials(objects)
    manifest_model = json.loads(MODEL_MANIFEST_PATH.read_text()) if MODEL_MANIFEST_PATH.exists() else {}
    images = []
    for render_pass in PASSES:
        restore_materials(objects, stored)
        if render_pass['mode'] == 'clay':
            apply_clay(objects)
        elif render_pass['mode'] == 'problem':
            apply_problem_materials(objects)
        for view in VIEWS:
            output = render_image(scene, camera, view, render_pass)
            images.append({
                'view': view['id'],
                'view_label': view['label'],
                'pass': render_pass['id'],
                'pass_label': render_pass['label'],
                'path': str(output.relative_to(OUTPUT_DIR)),
                'purpose': view['purpose']
            })
    manifest = {
        'asset_id': ASSET_ID,
        'type': 'offline_blender_visibility_diagnostic',
        'diagnostic_only': True,
        'acceptance_note': 'Offline Blender renders are for authoring diagnosis; they are not browser/cloud acceptance proof.',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'blender': bpy.app.version_string,
        'source_blend': str(BLEND_PATH.relative_to(ROOT)),
        'source_blend_sha256': sha256(BLEND_PATH),
        'model_manifest': str(MODEL_MANIFEST_PATH.relative_to(ROOT)),
        'model_revision': manifest_model.get('silhouette_revision'),
        'model_triangles': manifest_model.get('approximate_triangles'),
        'dimensions': {'width': WIDTH, 'height': HEIGHT},
        'views': VIEWS,
        'passes': PASSES,
        'images': images,
        'contact_sheet': 'contact_sheet.png'
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'manifest': str(MANIFEST_PATH), 'images': len(images)}, indent=2))


if __name__ == '__main__':
    main()

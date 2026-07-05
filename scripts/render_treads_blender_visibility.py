import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSET_ID = 'authored_sherman_treads_v1'
BLEND_PATH = ROOT / 'assets' / 'authored' / ASSET_ID / f'{ASSET_ID}.blend'
MODEL_MANIFEST_PATH = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID / 'model_manifest.json'
OUTPUT_DIR = ROOT / 'generated' / 'blender-visibility' / ASSET_ID
RENDER_DIR = OUTPUT_DIR / 'renders'
MANIFEST_PATH = OUTPUT_DIR / 'manifest.json'

WIDTH = 780
HEIGHT = 560

VIEWS = [
    {'id': 'left_side', 'label': 'Left side', 'camera': (0.0, -5.0, 0.55), 'target': (0.0, 0.94, -0.12), 'ortho_scale': 3.45, 'purpose': 'left open bay, visible wheels, track-run mass'},
    {'id': 'right_side', 'label': 'Right side', 'camera': (0.0, 5.0, 0.55), 'target': (0.0, -0.94, -0.12), 'ortho_scale': 3.45, 'purpose': 'right open bay, visible wheels, track-run mass'},
    {'id': 'left_front_three_quarter', 'label': 'Left front 3/4', 'camera': (3.3, -4.3, 1.05), 'target': (0.15, 0.94, -0.12), 'ortho_scale': 3.65, 'purpose': 'front return thickness and exposed running gear'},
    {'id': 'right_front_three_quarter', 'label': 'Right front 3/4', 'camera': (3.3, 4.3, 1.05), 'target': (0.15, -0.94, -0.12), 'ortho_scale': 3.65, 'purpose': 'front return thickness and exposed running gear'},
    {'id': 'left_wheel_bay_close', 'label': 'Left wheel bay close', 'camera': (0.25, -3.4, 0.25), 'target': (0.0, 1.06, -0.18), 'ortho_scale': 1.55, 'purpose': 'road wheels must not be hidden by side plate'},
    {'id': 'right_wheel_bay_close', 'label': 'Right wheel bay close', 'camera': (0.25, 3.4, 0.25), 'target': (0.0, -1.06, -0.18), 'ortho_scale': 1.55, 'purpose': 'road wheels must not be hidden by side plate'},
]

PASSES = [
    {'id': 'material', 'label': 'Material', 'mode': 'material'},
    {'id': 'clay', 'label': 'Clay', 'mode': 'clay'},
    {'id': 'problem', 'label': 'Problem', 'mode': 'problem'},
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
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
    scene.cycles.samples = 28
    scene.cycles.use_denoising = False
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.film_transparent = False
    scene.world.color = (0.055, 0.058, 0.052)
    camera_data = bpy.data.cameras.new('offline_tread_visibility_camera')
    camera = bpy.data.objects.new('offline_tread_visibility_camera', camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    sun_data = bpy.data.lights.new('offline_tread_visibility_sun', 'SUN')
    sun = bpy.data.objects.new('offline_tread_visibility_sun', sun_data)
    sun.rotation_euler = (math.radians(48), 0, math.radians(35))
    sun_data.energy = 2.1
    bpy.context.collection.objects.link(sun)
    area_data = bpy.data.lights.new('offline_tread_visibility_softbox', 'AREA')
    area = bpy.data.objects.new('offline_tread_visibility_softbox', area_data)
    area.location = (1.7, -3.2, 4.2)
    area_data.energy = 460
    area_data.size = 4.7
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
    clay = material('diagnostic_tread_clay_neutral', (0.64, 0.64, 0.60, 1), 0.9, 0.0)
    for obj in objects:
        replace_all_slots(obj, clay)


def apply_problem_materials(objects):
    track = material('diagnostic_track_black', (0.035, 0.030, 0.022, 1), 0.90, 0.02)
    wheel = material('diagnostic_wheel_cyan', (0.0, 0.58, 1.0, 1), 0.78, 0.0)
    roller = material('diagnostic_return_roller_blue', (0.18, 0.36, 1.0, 1), 0.78, 0.0)
    bogie = material('diagnostic_bogie_yellow', (1.0, 0.78, 0.10, 1), 0.78, 0.0)
    connector = material('diagnostic_connector_green', (0.18, 0.72, 0.22, 1), 0.84, 0.0)
    other = material('diagnostic_other_gray', (0.36, 0.36, 0.34, 1), 0.88, 0.0)
    for obj in objects:
        name = obj.name.lower()
        mat = other
        if 'tread_' in name or 'guide_band' in name or 'track' in name:
            mat = track
        if 'roadwheel' in name or 'sprocket' in name or 'idler' in name:
            mat = wheel
        if 'return_roller' in name:
            mat = roller
        if 'bogie' in name or 'tie_beam' in name:
            mat = bogie
        if 'connector_mount' in name or 'connector_rail' in name:
            mat = connector
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
            images.append({'view': view['id'], 'view_label': view['label'], 'pass': render_pass['id'], 'pass_label': render_pass['label'], 'path': str(output.relative_to(OUTPUT_DIR)), 'purpose': view['purpose']})
    manifest = {
        'asset_id': ASSET_ID,
        'type': 'offline_blender_visibility_evidence',
        'user_authorized_local_offline_visual_evidence': True,
        'acceptance_note': 'User explicitly allowed offline/local screenshots for this pass because WebGL crashes locally but Blender renders are visible to the agent.',
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

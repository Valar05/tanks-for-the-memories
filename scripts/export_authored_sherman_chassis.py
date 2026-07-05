import json
import math
from pathlib import Path

import bpy

# Authoring coordinates: X = length, Y = height, Z = width.
# Blender authoring is converted to the same runtime-readable GLB axes used by the golden treads.
def P(x, y, z):
    return (x, z, y)

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
ASSET_ID = 'authored_sherman_chassis_v1'
REVISION = 'v1-2-silhouette-fit-chassis-shell'
PUBLIC_DIR = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID
SOURCE_DIR = ROOT / 'assets' / 'authored' / ASSET_ID
BLEND_PATH = SOURCE_DIR / (ASSET_ID + '.blend')
GLB_PATH = PUBLIC_DIR / (ASSET_ID + '.glb')
MANIFEST_PATH = PUBLIC_DIR / 'model_manifest.json'
TREAD_MANIFEST = ROOT / 'public' / 'tftm' / 'models' / 'authored_sherman_treads_v1' / 'model_manifest.json'
FACE_PLATE_IDS = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','sponson_left','sponson_right','turret_ring_cap','belly_shadow']
COLORS = {
    'hull_glacis': (0.36, 0.41, 0.25, 1),
    'hull_left': (0.31, 0.37, 0.23, 1),
    'hull_right': (0.31, 0.37, 0.23, 1),
    'hull_rear': (0.28, 0.32, 0.20, 1),
    'engine_deck': (0.33, 0.39, 0.24, 1),
    'sponson_left': (0.29, 0.35, 0.22, 1),
    'sponson_right': (0.29, 0.35, 0.22, 1),
    'turret_ring_cap': (0.25, 0.29, 0.19, 1),
    'belly_shadow': (0.12, 0.14, 0.10, 1),
}

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for directory in (PUBLIC_DIR, SOURCE_DIR):
    directory.mkdir(parents=True, exist_ok=True)

materials = {}
for plate_id in FACE_PLATE_IDS:
    mat = bpy.data.materials.new(plate_id)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = COLORS[plate_id]
    bsdf.inputs['Roughness'].default_value = 0.88
    bsdf.inputs['Metallic'].default_value = 0.08 if plate_id != 'belly_shadow' else 0.02
    materials[plate_id] = mat

# Cross-sections define one connected hard-surface armor body. Unlike v1.1, this
# profile has a broad flat deck and vertical side armor instead of a center ridge.
# The mesh remains one watertight chassis shell; the golden treads are fit reference only.
sections = [
    # x, top_y, deck_half_z, side_half_z, side_top_y, side_bottom_y, belly_half_z, nose_bias
    (-1.74, 0.72, 0.66, 1.08, 0.28, -0.31, 0.72, 0.00),
    (-1.16, 0.88, 0.80, 1.20, 0.34, -0.32, 0.78, 0.00),
    ( 0.55, 0.90, 0.82, 1.22, 0.34, -0.32, 0.80, 0.00),
    ( 1.18, 0.72, 0.76, 1.12, 0.30, -0.31, 0.72, 0.18),
    ( 1.70, 0.43, 0.58, 0.96, 0.18, -0.29, 0.62, 0.35),
]
# Profile points are (height, width) in authoring Y/Z, ordered around the exterior.
def profile(top_y, deck_half_z, side_half_z, side_top_y, side_bottom_y, belly_half_z, nose_bias):
    # Broad deck, chamfered shoulders, vertical sides, tucked belly. This gives a
    # Sherman-like hull envelope while preserving a single watertight mesh.
    return [
        (top_y, -deck_half_z),
        (top_y,  deck_half_z),
        (top_y - 0.12 - nose_bias * 0.05,  side_half_z * 0.82),
        (side_top_y,  side_half_z),
        (side_bottom_y,  side_half_z),
        (side_bottom_y - 0.10,  belly_half_z),
        (side_bottom_y - 0.13, -belly_half_z),
        (side_bottom_y, -side_half_z),
        (side_top_y, -side_half_z),
        (top_y - 0.12 - nose_bias * 0.05, -side_half_z * 0.82),
    ]

verts = []
for x, top_y, deck_half_z, side_half_z, side_top_y, side_bottom_y, belly_half_z, nose_bias in sections:
    for y, z in profile(top_y, deck_half_z, side_half_z, side_top_y, side_bottom_y, belly_half_z, nose_bias):
        verts.append((x, y, z))

n = 10
faces = []
face_mats = []
# Rear and front caps are real armor plates, not open profile ends.
faces.append(tuple(range(n - 1, -1, -1))); face_mats.append('hull_rear')
front_start = (len(sections) - 1) * n
faces.append(tuple(range(front_start, front_start + n))); face_mats.append('hull_glacis')
# Longitudinal bands. Segment ids are profile edge ids: i -> i+1.
for si in range(len(sections) - 1):
    a = si * n
    b = (si + 1) * n
    x_mid = (sections[si][0] + sections[si + 1][0]) * 0.5
    for i in range(n):
        j = (i + 1) % n
        faces.append((a + i, a + j, b + j, b + i))
        if i == 0:
            mat = 'turret_ring_cap' if -0.45 <= x_mid <= 0.65 else ('hull_glacis' if x_mid > 1.05 else 'engine_deck')
        elif i in (1, 2):
            mat = 'sponson_right'
        elif i == 3:
            mat = 'hull_right'
        elif i in (4, 5, 6):
            mat = 'belly_shadow'
        elif i == 7:
            mat = 'hull_left'
        elif i in (8, 9):
            mat = 'sponson_left'
        else:
            mat = 'engine_deck'
        face_mats.append(mat)

mesh = bpy.data.meshes.new('chassis_watertight_shell_mesh')
mesh.from_pydata([P(*v) for v in verts], [], faces)
mesh.update(calc_edges=True)
for plate_id in FACE_PLATE_IDS:
    mesh.materials.append(materials[plate_id])
mat_index = {plate_id: i for i, plate_id in enumerate(FACE_PLATE_IDS)}
for poly, plate_id in zip(mesh.polygons, face_mats):
    poly.material_index = mat_index[plate_id]
uv_layer = mesh.uv_layers.new(name='chassis_box_plate_uv')
for poly in mesh.polygons:
    for local_index, loop_index in enumerate(poly.loop_indices):
        vert = mesh.vertices[mesh.loops[loop_index].vertex_index].co
        # Large rectangular plate UVs per face family. Runtime plates stay paintable.
        uv_layer.data[loop_index].uv = (0.5 + vert.x * 0.25, 0.5 + vert.z * 0.35)

shell = bpy.data.objects.new('chassis_watertight_shell', mesh)
shell['asset_id'] = ASSET_ID
shell['silhouette_revision'] = REVISION
shell['component_role'] = 'one_visible_watertight_chassis_mesh_no_treads_no_turret'
shell['golden_tread_reference'] = 'authored_sherman_treads_v1 v1-8c-linked-mirror-tread-assembly read-only fit target'
shell['source_policy'] = 'existing Meshy Sherman assets may be used as hidden visual reference only; no Meshy topology exported'
bpy.context.collection.objects.link(shell)
for poly in mesh.polygons:
    poly.use_smooth = False
bevel = shell.modifiers.new('small_welded_armor_edge_bevel', 'BEVEL')
bevel.width = 0.012
bevel.segments = 1
bevel.affect = 'EDGES'
shell.modifiers.new('weighted_armor_normals', 'WEIGHTED_NORMAL')

# Hidden reference marker documents source intent without exporting Meshy geometry.
ref = bpy.data.objects.new('hidden_meshy_reference_not_exported', None)
ref.hide_viewport = True
ref.hide_render = True
ref['reference_only'] = True
ref['not_exported'] = True
bpy.context.collection.objects.link(ref)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
# Export only the shell. The hidden reference marker is intentionally excluded.
bpy.ops.object.select_all(action='DESELECT')
shell.select_set(True)
bpy.context.view_layer.objects.active = shell
bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format='GLB', use_selection=True, export_apply=True)

with TREAD_MANIFEST.open('r', encoding='utf8') as fh:
    tread_manifest = json.load(fh)
manifest = {
    'asset_id': ASSET_ID,
    'artifact_type': 'chassis_only_blender_asset',
    'silhouette_revision': REVISION,
    'generator': 'scripts/export_authored_sherman_chassis.py',
    'source_blend': str(BLEND_PATH.relative_to(ROOT)),
    'output_glb': str(GLB_PATH.relative_to(ROOT)),
    'approximate_triangles': sum(len(poly.vertices) - 2 for poly in mesh.polygons),
    'coordinate_contract': 'runtime X length, Y height, Z width; Blender Z-up converted through P()',
    'component_scope': 'one visible watertight chassis shell only; no treads, wheels, bogies, turret, mantlet, barrel, coaxial MG, or full tank scene',
    'mesh_contract': 'exactly one exported visible mesh node named chassis_watertight_shell; closed manifold shell with no boundary edges or pasted panels',
    'golden_tread_reference': {
        'asset_id': tread_manifest.get('asset_id'),
        'silhouette_revision': tread_manifest.get('silhouette_revision'),
        'output_glb': tread_manifest.get('output_glb'),
        'policy': 'read-only fit reference; exporter does not open, copy, modify, append, or re-export tread geometry'
    },
    'source_policy': 'Existing Meshy Sherman assets are visual reference ore only. No Meshy chassis topology is exported as the final chassis.',
    'uv_policy': 'box/planar face plate UVs per surface family; no atlas packing',
    'face_plate_ids': FACE_PLATE_IDS,
    'fit_contract': 'chassis side/sponson exterior overlaps the frozen tread width and outside-to-inside rays at front, rear, side, and oblique track-interface samples hit chassis exterior before interior',
    'forbidden_nodes': ['treads_root','left_tread_belt','right_tread_belt','left_wheel_group','right_wheel_group','turret','mantlet','barrel','coaxial_mg','cannon','roadwheel','sprocket','idler','bogie'],
    'acceptance': 'Cloud/Sense must judge chassisfirst-chassis.html only: one watertight chassis mesh fitting frozen authored_sherman_treads_v1 v1-8c with no visible tread-interface gaps, no pasted panels/blockers, no turret/barrel/tread/wheel edits, and no local capture.'
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print(json.dumps({'asset_id': ASSET_ID, 'revision': REVISION, 'triangles': manifest['approximate_triangles'], 'glb': str(GLB_PATH)}, indent=2))

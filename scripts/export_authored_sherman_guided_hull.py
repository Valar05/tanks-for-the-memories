import json
import math
from pathlib import Path

import bpy

# Runtime-readable authoring coordinates: X length, Y height, Z width.
# Blender export coordinates use Z-up, so convert every point through P.
def P(x, y, z):
    return (x, z, y)

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
ASSET_ID = 'authored_sherman_guided_hull_v1'
REVISION = 'v1-1-guided-hard-surface-hull-only'
BUILD_TOKEN = 'tftm-authored-sherman-guided-hull-v1-20260708'
PUBLIC_DIR = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID
SOURCE_DIR = ROOT / 'assets' / 'authored' / ASSET_ID
BLEND_PATH = SOURCE_DIR / (ASSET_ID + '.blend')
GLB_PATH = PUBLIC_DIR / (ASSET_ID + '.glb')
MANIFEST_PATH = PUBLIC_DIR / 'model_manifest.json'
TREAD_MANIFEST_PATH = ROOT / 'public' / 'tftm' / 'models' / 'authored_sherman_treads_v1' / 'model_manifest.json'
MESHY_REFERENCE_PATH = ROOT / 'public' / 'tftm' / 'models' / 'meshy_sherman_lowpoly_envelope_v1' / 'lowpoly_hull_envelope.glb'

FACE_PLATE_IDS = [
    'guided_glacis', 'guided_hull_left', 'guided_hull_right', 'guided_rear',
    'guided_engine_deck', 'guided_sponson_left', 'guided_sponson_right',
    'guided_turret_ring_pad', 'guided_belly_shadow', 'guided_plate_lip',
    'guided_weld_shadow', 'guided_edge_wear_marker'
]
COLORS = {
    'guided_glacis': (0.34, 0.39, 0.24, 1),
    'guided_hull_left': (0.30, 0.36, 0.22, 1),
    'guided_hull_right': (0.30, 0.36, 0.22, 1),
    'guided_rear': (0.26, 0.31, 0.19, 1),
    'guided_engine_deck': (0.32, 0.38, 0.23, 1),
    'guided_sponson_left': (0.28, 0.34, 0.21, 1),
    'guided_sponson_right': (0.28, 0.34, 0.21, 1),
    'guided_turret_ring_pad': (0.24, 0.28, 0.18, 1),
    'guided_belly_shadow': (0.11, 0.13, 0.09, 1),
    'guided_plate_lip': (0.23, 0.28, 0.17, 1),
    'guided_weld_shadow': (0.07, 0.08, 0.06, 1),
    'guided_edge_wear_marker': (0.43, 0.41, 0.31, 1),
}

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for d in (PUBLIC_DIR, SOURCE_DIR):
    d.mkdir(parents=True, exist_ok=True)

materials = {}
for plate in FACE_PLATE_IDS:
    mat = bpy.data.materials.new(plate)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = COLORS[plate]
    bsdf.inputs['Roughness'].default_value = 0.86
    bsdf.inputs['Metallic'].default_value = 0.04 if plate != 'guided_edge_wear_marker' else 0.10
    materials[plate] = mat

# Six cross sections derived from the Meshy hull proportions, then simplified into armor planes.
# No Meshy vertices are imported or sampled. Sections intentionally form a readable Sherman-like hull:
# rear plate, engine deck, turret pad, sloped glacis, tucked belly, and sponson side planes.
sections = [
    (-1.72, 0.42, 0.48, 0.74, 0.16, -0.32, 0.52),
    (-1.35, 0.70, 0.62, 0.88, 0.28, -0.34, 0.62),
    (-0.62, 0.86, 0.70, 0.96, 0.34, -0.36, 0.66),
    ( 0.42, 0.86, 0.72, 0.98, 0.34, -0.36, 0.66),
    ( 1.08, 0.70, 0.64, 0.92, 0.28, -0.34, 0.60),
    ( 1.66, 0.36, 0.42, 0.76, 0.12, -0.31, 0.48),
]
# profile points around one section: top left/right, shoulders, sides, belly chamfers.
def profile(top_y, deck_half, side_half, side_top_y, side_bottom_y, belly_half):
    return [
        (top_y, -deck_half),
        (top_y, deck_half),
        (top_y - 0.10, side_half * 0.86),
        (side_top_y, side_half),
        (side_bottom_y, side_half),
        (side_bottom_y - 0.08, belly_half),
        (side_bottom_y - 0.12, -belly_half),
        (side_bottom_y, -side_half),
        (side_top_y, -side_half),
        (top_y - 0.10, -side_half * 0.86),
    ]
verts = []
for sec in sections:
    x = sec[0]
    for y, z in profile(*sec[1:]):
        verts.append((x, y, z))

n = 10
faces = []
face_mats = []
# Split end caps into triangles around a cap center. This explicitly avoids one giant ngon cap.
for sec_i, cap_name, mat in [(0, 'rear', 'guided_rear'), (len(sections) - 1, 'front', 'guided_glacis')]:
    start = sec_i * n
    pts = [verts[start + i] for i in range(n)]
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    cz = sum(p[2] for p in pts) / n
    center_index = len(verts)
    verts.append((cx, cy, cz))
    order = range(n - 1, -1, -1) if sec_i == 0 else range(n)
    order = list(order)
    for idx, i in enumerate(order):
        j = order[(idx + 1) % n]
        faces.append((center_index, start + i, start + j))
        face_mats.append(mat)
# Longitudinal armor bands as quads.
for si in range(len(sections) - 1):
    a = si * n
    b = (si + 1) * n
    x_mid = (sections[si][0] + sections[si + 1][0]) * 0.5
    for i in range(n):
        j = (i + 1) % n
        faces.append((a + i, a + j, b + j, b + i))
        if i == 0:
            mat = 'guided_turret_ring_pad' if -0.52 <= x_mid <= 0.55 else ('guided_glacis' if x_mid > 0.82 else 'guided_engine_deck')
        elif i in (1, 2):
            mat = 'guided_sponson_right'
        elif i == 3:
            mat = 'guided_hull_right'
        elif i in (4, 5, 6):
            mat = 'guided_belly_shadow'
        elif i == 7:
            mat = 'guided_hull_left'
        else:
            mat = 'guided_sponson_left'
        face_mats.append(mat)

mesh = bpy.data.meshes.new('guided_hull_shell_mesh')
mesh.from_pydata([P(*v) for v in verts], [], faces)
mesh.update(calc_edges=True)
for plate in FACE_PLATE_IDS:
    mesh.materials.append(materials[plate])
mat_index = {plate: i for i, plate in enumerate(FACE_PLATE_IDS)}
for poly, plate in zip(mesh.polygons, face_mats):
    poly.material_index = mat_index[plate]
    poly.use_smooth = False
uv = mesh.uv_layers.new(name='guided_hull_planar_surface_uv')
for poly in mesh.polygons:
    normal = poly.normal
    for loop_index in poly.loop_indices:
        co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
        # Blender coords after P: x length, y width, z height. Use simple per-plane projection.
        if abs(normal.z) > abs(normal.y):
            uv.data[loop_index].uv = (0.5 + co.x * 0.24, 0.5 + co.y * 0.42)
        else:
            uv.data[loop_index].uv = (0.5 + co.x * 0.24, 0.5 + co.z * 0.55)

shell = bpy.data.objects.new('guided_hull_single_authored_shell', mesh)
shell['asset_id'] = ASSET_ID
shell['silhouette_revision'] = REVISION
shell['source_policy'] = 'Meshy hull is reference only; no Meshy topology, shrinkwrap, high-to-low decimation, or arbitrary mesh wrapping exported.'
shell['component_role'] = 'hull_only_guided_hard_surface_reconstruction'
shell['cap_policy'] = 'front and rear caps are split triangle armor facets; no giant cap ngon source face'
bpy.context.collection.objects.link(shell)
bevel = shell.modifiers.new('controlled_lowpoly_armor_bevels', 'BEVEL')
bevel.width = 0.010
bevel.segments = 1
bevel.affect = 'EDGES'
shell.modifiers.new('weighted_hard_surface_normals', 'WEIGHTED_NORMAL')

detail_objects = []

def rivet(name, center, radius, depth, axis, mat_id, segments=8):
    cx, cy, cz = center
    pts = []
    for side in (-0.5, 0.5):
        for k in range(segments):
            a = math.tau * k / segments
            ca = math.cos(a) * radius
            sa = math.sin(a) * radius
            if axis == 'z':
                pts.append((cx + ca, cy + sa, cz + side * depth))
            elif axis == 'x':
                pts.append((cx + side * depth, cy + ca, cz + sa))
            else:
                pts.append((cx + ca, cy + side * depth, cz + sa))
    rear = len(pts)
    front = rear + 1
    if axis == 'z':
        pts.append((cx, cy, cz - depth * 0.5)); pts.append((cx, cy, cz + depth * 0.5))
    elif axis == 'x':
        pts.append((cx - depth * 0.5, cy, cz)); pts.append((cx + depth * 0.5, cy, cz))
    else:
        pts.append((cx, cy - depth * 0.5, cz)); pts.append((cx, cy + depth * 0.5, cz))
    fs = []
    for k in range(segments):
        j = (k + 1) % segments
        fs.append((k, j, segments + j, segments + k))
        fs.append((rear, j, k))
        fs.append((front, segments + k, segments + j))
    me = bpy.data.meshes.new(name + '_mesh')
    me.from_pydata([P(*p) for p in pts], [], fs)
    me.update(calc_edges=True)
    me.materials.append(materials[mat_id])
    for poly in me.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    obj['surface_id'] = mat_id
    obj['detail_policy'] = 'controlled lowpoly bolt detail for readable hard-surface hull, not Meshy topology'
    bpy.context.collection.objects.link(obj)
    detail_objects.append(obj)
    return obj

def cuboid(name, center, size, mat_id):
    cx, cy, cz = center
    sx, sy, sz = size[0]*0.5, size[1]*0.5, size[2]*0.5
    pts = [(cx+dx*sx, cy+dy*sy, cz+dz*sz) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
    fs = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    me = bpy.data.meshes.new(name + '_mesh')
    me.from_pydata([P(*p) for p in pts], [], fs)
    me.update(calc_edges=True)
    me.materials.append(materials[mat_id])
    uv = me.uv_layers.new(name=name + '_uv')
    for poly in me.polygons:
        poly.use_smooth = False
        for loop_index in poly.loop_indices:
            co = me.vertices[me.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = (0.5 + co.x * 0.25, 0.5 + co.z * 0.45)
    obj = bpy.data.objects.new(name, me)
    obj['surface_id'] = mat_id
    obj['detail_policy'] = 'small authored armor readability detail; not Meshy topology'
    bpy.context.collection.objects.link(obj)
    detail_objects.append(obj)
    return obj

# Minimal readable hard-surface detail, intentionally not a noisy fence.
cuboid('guided_front_glacis_plate_lip', (1.23, 0.44, 0.0), (0.035, 0.024, 1.02), 'guided_plate_lip')
cuboid('guided_rear_plate_lip', (-1.47, 0.39, 0.0), (0.035, 0.024, 0.96), 'guided_plate_lip')
for z, side in [(-0.82, 'left'), (0.82, 'right')]:
    cuboid('guided_%s_upper_sponson_edge' % side, (-0.12, 0.332, z), (2.38, 0.020, 0.026), 'guided_plate_lip')
    cuboid('guided_%s_lower_shadow_weld' % side, (-0.10, -0.292, z), (2.46, 0.018, 0.020), 'guided_weld_shadow')
    cuboid('guided_%s_front_side_seam' % side, (1.03, 0.02, z), (0.020, 0.46, 0.018), 'guided_weld_shadow')
    cuboid('guided_%s_rear_side_seam' % side, (-1.18, 0.06, z), (0.020, 0.50, 0.018), 'guided_weld_shadow')
for x in [-0.72, -0.34, 0.04, 0.42]:
    cuboid('guided_engine_deck_seam_%s' % str(x).replace('-', 'm').replace('.', '_'), (x, 0.875, 0.0), (0.018, 0.018, 1.06), 'guided_weld_shadow')
cuboid('guided_turret_ring_low_pad', (0.08, 0.885, 0.0), (0.86, 0.028, 0.82), 'guided_turret_ring_pad')
cuboid('guided_front_edge_wear_marker', (1.255, 0.475, 0.0), (0.014, 0.014, 0.86), 'guided_edge_wear_marker')

for z, side in [(-0.852, 'left'), (0.852, 'right')]:
    for idx, x in enumerate([-1.28, -0.88, -0.48, -0.08, 0.32, 0.72, 1.12]):
        rivet('guided_%s_side_bolt_%02d' % (side, idx), (x, 0.305, z), 0.020, 0.014, 'z', 'guided_weld_shadow')
for idx, z in enumerate([-0.36, -0.18, 0.0, 0.18, 0.36]):
    rivet('guided_front_glacis_bolt_%02d' % idx, (1.246, 0.462, z), 0.018, 0.014, 'x', 'guided_weld_shadow')
    rivet('guided_rear_plate_bolt_%02d' % idx, (-1.492, 0.372, z), 0.018, 0.014, 'x', 'guided_weld_shadow')

# Non-exported empty documents the reference. It is intentionally hidden and excluded from export selection.
ref = bpy.data.objects.new('hidden_meshy_lowpoly_hull_reference_not_exported', None)
ref['reference_glb'] = str(MESHY_REFERENCE_PATH.relative_to(ROOT))
ref['reference_policy'] = 'bbox/silhouette/material mood reference only, no source vertices exported'
ref.hide_viewport = True
ref.hide_render = True
bpy.context.collection.objects.link(ref)

# Camera/light saved only for Blender inspection.
bpy.ops.object.light_add(type='AREA', location=P(0, 3.2, -3.5))
bpy.context.object.name = 'guided_hull_inspection_area_light'
bpy.context.object.data.energy = 350
bpy.context.object.data.size = 4
bpy.ops.object.camera_add(location=P(3.6, 2.2, -4.1), rotation=(math.radians(64), 0, math.radians(42)))
bpy.context.scene.camera = bpy.context.object

# Select exportable hull objects after camera/light creation. Blender add operators change selection.
bpy.ops.object.select_all(action='DESELECT')
for obj in [shell] + detail_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = shell

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
)

# Compute source-level face stats before Blender triangulates/modifier-applies.
source_face_vertex_counts = [len(f) for f in faces]
manifest = {
    'asset_id': ASSET_ID,
    'silhouette_revision': REVISION,
    'runtime_build': BUILD_TOKEN,
    'source_blend': str(BLEND_PATH.relative_to(ROOT)),
    'output_glb': str(GLB_PATH.relative_to(ROOT)),
    'golden_tread_reference': {
        'asset_id': 'authored_sherman_treads_v1',
        'manifest': str(TREAD_MANIFEST_PATH.relative_to(ROOT)),
        'role': 'fixed fit reference only; not modified by guided hull pass'
    },
    'meshy_reference': {
        'asset_id': 'meshy_sherman_lowpoly_envelope_v1',
        'runtime_glb': 'public/tftm/models/meshy_sherman_lowpoly_envelope_v1/lowpoly_hull_envelope.glb',
        'role': 'silhouette, bbox, and material mood reference only; no topology exported'
    },
    'source_policy': 'Guided hard-surface reconstruction from simple authored planes. No Meshy topology, no shrinkwrap, no high-to-low decimation, no arbitrary mesh wrapping.',
    'component_scope': 'hull only; no treads, wheels, turret, mantlet, barrel, coax, or hatch articulation',
    'geometry_budget': {'target_triangles_min': 800, 'target_triangles_max': 1800, 'hard_cap_triangles': 2500},
    'source_face_policy': {
        'max_source_face_vertices': max(source_face_vertex_counts),
        'front_rear_caps_split': True,
        'no_giant_cap_ngons': True,
        'cap_faces': 'triangles around authored cap centers, not one ngon per end'
    },
    'face_plate_ids': FACE_PLATE_IDS,
    'uv_policy': 'simple planar UV islands by surface family: glacis, hull sides, sponsons, engine deck, rear, turret ring pad, belly shadow',
    'fit_contract': 'Guided hull must stay inside authored tread exterior sidewalls while visually contacting the inboard tread socket region; treads remain separate and visible.',
    'required_nodes': ['guided_hull_single_authored_shell'] + [obj.name for obj in detail_objects],
    'forbidden_exported_topology': ['hidden_meshy_lowpoly_hull_reference_not_exported', 'lowpoly_hull_envelope', 'meshy'],
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'ok': True, 'asset_id': ASSET_ID, 'glb': str(GLB_PATH), 'blend': str(BLEND_PATH), 'nodes': len(manifest['required_nodes'])}, indent=2))

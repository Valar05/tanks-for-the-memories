import json
import math
from pathlib import Path

import bpy

# Authoring coordinates are runtime-readable: X = length, Y = height, Z = width.
# Blender is Z-up, so every authored coordinate is converted through P/S/R.
def P(x, y, z):
    return (x, z, y)

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
ASSET_ID = 'authored_sherman_treads_v1'
REVISION = 'v1-3-wheels-in-profile-opening'
PUBLIC_DIR = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID
SOURCE_DIR = ROOT / 'assets' / 'authored' / ASSET_ID
BLEND_PATH = SOURCE_DIR / (ASSET_ID + '.blend')
GLB_PATH = PUBLIC_DIR / (ASSET_ID + '.glb')
MANIFEST_PATH = PUBLIC_DIR / 'model_manifest.json'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for directory in (PUBLIC_DIR, SOURCE_DIR):
    directory.mkdir(parents=True, exist_ok=True)

materials = {}
for name, color, roughness, metallic in [
    ('track_outer', (0.15, 0.145, 0.12, 1), 0.94, 0.18),
    ('track_inner', (0.20, 0.19, 0.155, 1), 0.91, 0.12),
    ('connector_mount', (0.26, 0.29, 0.20, 1), 0.88, 0.08),
    ('wheel_rubber', (0.075, 0.073, 0.064, 1), 0.92, 0.08),
    ('wheel_metal', (0.31, 0.30, 0.23, 1), 0.86, 0.12),
    ('bogie_arm', (0.27, 0.285, 0.20, 1), 0.87, 0.10),
]:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    materials[name] = mat

def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = 0.2
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj

treads_root = empty('treads_root')
left_mount_root = empty('left_tread_connector_mounts', treads_root)
right_mount_root = empty('right_tread_connector_mounts', treads_root)
left_wheel_root = empty('left_wheel_group', treads_root)
right_wheel_root = empty('right_wheel_group', treads_root)
left_bogie_root = empty('left_bogie_connectors', treads_root)
right_bogie_root = empty('right_bogie_connectors', treads_root)

# The old model-assay tread was an 8-point profile. This pass keeps its Sherman-like
# proportions but adds a silhouette subdivision layer around both returns and the
# top/bottom transitions so the belt no longer reads as a highest-poly box.
OUTER_PROFILE = [
    (-1.62, -0.04, 0.00),
    (-1.60,  0.055, 0.20),
    (-1.52,  0.125, 0.38),
    (-0.96,  0.150, 1.18),
    ( 0.68,  0.150, 3.52),
    ( 1.16,  0.118, 4.18),
    ( 1.42,  0.035, 4.62),
    ( 1.56, -0.075, 4.94),
    ( 1.51, -0.205, 5.27),
    ( 1.34, -0.330, 5.61),
    ( 1.08, -0.405, 6.00),
    ( 0.18, -0.438, 7.34),
    (-1.16, -0.438, 9.28),
    (-1.43, -0.350, 9.72),
    (-1.58, -0.215, 10.10),
    (-1.65, -0.108, 10.42),
]
INNER_PROFILE = [
    (-1.39, -0.055, 0.00),
    (-1.36,  0.005, 0.20),
    (-1.26,  0.040, 0.38),
    (-0.86,  0.065, 1.18),
    ( 0.58,  0.065, 3.52),
    ( 0.99,  0.040, 4.18),
    ( 1.23, -0.025, 4.62),
    ( 1.34, -0.090, 4.94),
    ( 1.30, -0.180, 5.27),
    ( 1.13, -0.260, 5.61),
    ( 0.92, -0.300, 6.00),
    ( 0.12, -0.322, 7.34),
    (-0.98, -0.322, 9.28),
    (-1.18, -0.255, 9.72),
    (-1.34, -0.170, 10.10),
    (-1.42, -0.090, 10.42),
]

SEGMENT_MARKERS = {
    'top_run': [2, 3, 4],
    'front_return': [5, 6, 7, 8, 9],
    'bottom_run': [10, 11, 12],
    'rear_return': [13, 14, 15, 0, 1],
}

def assign_uvs(mesh):
    uv_layer = mesh.uv_layers.new(name='tread_unwrapped_lane')
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vert = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            # Blender coords are X, Z(width), Y(height) after P conversion.
            uv_layer.data[loop_index].uv = (vert.x * 0.31 + vert.z * 0.12, vert.y * 1.65)

def make_belt(side_name, side_sign):
    belt_root = empty(side_name + '_tread_belt', treads_root)
    outer_z = side_sign * 1.14
    inner_z = side_sign * 0.72

    def build_segment(role, segment_indices):
        verts = []
        faces = []
        face_mats = []
        def add(v):
            verts.append(v)
            return len(verts) - 1
        for i in segment_indices:
            j = (i + 1) % len(OUTER_PROFILE)
            ox0, oy0, _ = OUTER_PROFILE[i]
            ox1, oy1, _ = OUTER_PROFILE[j]
            ix0, iy0, _ = INNER_PROFILE[i]
            ix1, iy1, _ = INNER_PROFILE[j]
            a = add((ox0, oy0, outer_z)); b = add((ox1, oy1, outer_z)); c = add((ix1, iy1, outer_z)); d = add((ix0, iy0, outer_z))
            faces.append((a, b, c, d)); face_mats.append('track_outer')
            a = add((ox1, oy1, inner_z)); b = add((ox0, oy0, inner_z)); c = add((ix0, iy0, inner_z)); d = add((ix1, iy1, inner_z))
            faces.append((a, b, c, d)); face_mats.append('track_inner')
            a = add((ox0, oy0, outer_z)); b = add((ox0, oy0, inner_z)); c = add((ox1, oy1, inner_z)); d = add((ox1, oy1, outer_z))
            faces.append((a, b, c, d)); face_mats.append('track_outer')
            a = add((ix1, iy1, outer_z)); b = add((ix1, iy1, inner_z)); c = add((ix0, iy0, inner_z)); d = add((ix0, iy0, outer_z))
            faces.append((a, b, c, d)); face_mats.append('track_inner')
        mesh = bpy.data.meshes.new(side_name + '_tread_' + role + '_mesh')
        mesh.from_pydata([P(*v) for v in verts], [], faces)
        mesh.update(calc_edges=True)
        mesh.materials.append(materials['track_outer'])
        mesh.materials.append(materials['track_inner'])
        for poly, mat_name in zip(mesh.polygons, face_mats):
            poly.material_index = 0 if mat_name == 'track_outer' else 1
        assign_uvs(mesh)
        obj = bpy.data.objects.new(side_name + '_tread_' + role, mesh)
        obj['component_role'] = 'open_perimeter_sidewall_' + role
        obj['profile_point_count'] = len(OUTER_PROFILE)
        obj['source_reference'] = 'src/model-assay.ts createTreadGeometry subdivision-0 reference only'
        obj['contains_hull'] = False
        obj['contains_turret'] = False
        bpy.context.collection.objects.link(obj)
        obj.parent = belt_root
        bevel = obj.modifiers.new('worn_tread_edge_micro_bevel', 'BEVEL')
        bevel.width = 0.018
        bevel.segments = 1
        obj.modifiers.new('weighted_tread_normals', 'WEIGHTED_NORMAL')
        return obj

    for role, segment_indices in SEGMENT_MARKERS.items():
        build_segment(role, segment_indices)
    belt_root['component_role'] = 'closed_subdivided_tread_belt_with_split_visible_segments'
    belt_root['profile_point_count'] = len(OUTER_PROFILE)
    return belt_root

def disc_mesh(name, center, radius, depth, parent, material_name='wheel_metal', segments=28, hub_radius=0.12):
    cx, cy, cz = center
    z0 = cz - depth / 2
    z1 = cz + depth / 2
    verts = []
    faces = []
    def add(v):
        verts.append(v)
        return len(verts) - 1
    front_center = add((cx, cy, z1))
    back_center = add((cx, cy, z0))
    front_ring = []
    back_ring = []
    front_hub = []
    back_hub = []
    for i in range(segments):
        a = math.tau * i / segments
        co = math.cos(a)
        si = math.sin(a)
        front_ring.append(add((cx + co * radius, cy + si * radius, z1)))
        back_ring.append(add((cx + co * radius, cy + si * radius, z0)))
        front_hub.append(add((cx + co * hub_radius, cy + si * hub_radius, z1 + 0.006)))
        back_hub.append(add((cx + co * hub_radius, cy + si * hub_radius, z0 - 0.006)))
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((front_center, front_hub[i], front_hub[j]))
        faces.append((back_center, back_hub[j], back_hub[i]))
        faces.append((front_hub[i], front_ring[i], front_ring[j], front_hub[j]))
        faces.append((back_hub[j], back_ring[j], back_ring[i], back_hub[i]))
        faces.append((front_ring[i], back_ring[i], back_ring[j], front_ring[j]))
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(materials[material_name])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['component_role'] = 'side_facing_running_gear_wheel'
    obj['wheel_axis'] = 'runtime_Z_width_axis'
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj.modifiers.new('weighted_wheel_normals', 'WEIGHTED_NORMAL')
    return obj

def box_mesh(name, center, size, parent):
    cx, cy, cz = center
    sx, sy, sz = size
    x0, x1 = cx - sx / 2, cx + sx / 2
    y0, y1 = cy - sy / 2, cy + sy / 2
    z0, z1 = cz - sz / 2, cz + sz / 2
    verts = [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(materials['connector_mount'])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['component_role'] = 'subordinate_connector_mount'
    obj['not_hull'] = True
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    bevel = obj.modifiers.new('mount_edge_bevel', 'BEVEL')
    bevel.width = 0.014
    bevel.segments = 1
    obj.modifiers.new('weighted_mount_normals', 'WEIGHTED_NORMAL')
    return obj

left_belt = make_belt('left', 1)
right_belt = make_belt('right', -1)

for side_name, side_sign, mount_parent, wheel_parent, bogie_parent in [
    ('left', 1, left_mount_root, left_wheel_root, left_bogie_root),
    ('right', -1, right_mount_root, right_wheel_root, right_bogie_root),
]:
    mount_z = side_sign * 0.94
    wheel_z = side_sign * 1.02
    for x in [-1.08, -0.42, 0.24, 0.90]:
        box_mesh(f'{side_name}_tread_connector_mount_{x:+.2f}', (x, 0.045, mount_z), (0.30, 0.16, 0.16), mount_parent)
    box_mesh(f'{side_name}_upper_return_connector_rail', (-0.04, 0.055, mount_z), (2.48, 0.08, 0.08), mount_parent)
    box_mesh(f'{side_name}_lower_bogie_tie_beam', (-0.10, -0.205, mount_z), (2.58, 0.065, 0.10), bogie_parent)
    # Wheel centers deliberately occupy the side-view inner-profile opening;
    # they are not exterior-plane decorations.
    for index, x in enumerate([-1.04, -0.63, -0.22, 0.19, 0.60, 0.96]):
        disc_mesh(f'{side_name}_roadwheel_{index + 1}', (x, -0.205, wheel_z), 0.135, 0.105, wheel_parent, 'wheel_metal', 30, 0.064)
    disc_mesh(f'{side_name}_front_sprocket', (1.17, -0.130, wheel_z), 0.155, 0.12, wheel_parent, 'wheel_metal', 32, 0.066)
    disc_mesh(f'{side_name}_rear_idler', (-1.25, -0.118, wheel_z), 0.145, 0.11, wheel_parent, 'wheel_metal', 32, 0.060)
    for index, x in enumerate([-0.84, -0.12, 0.56]):
        disc_mesh(f'{side_name}_return_roller_{index + 1}', (x, -0.020, wheel_z), 0.065, 0.09, wheel_parent, 'wheel_metal', 24, 0.030)
    for x in [-0.84, -0.02, 0.78]:
        box_mesh(f'{side_name}_vvss_bogie_arm_{x:+.2f}', (x, -0.155, mount_z), (0.27, 0.11, 0.09), bogie_parent)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format='GLB', use_selection=False)

triangle_count = 0
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        triangle_count += sum(max(1, len(poly.vertices) - 2) for poly in obj.data.polygons)

manifest = {
    'asset_id': ASSET_ID,
    'artifact_type': 'tread_only_blender_asset',
    'silhouette_revision': REVISION,
    'generator': 'scripts/export_authored_sherman_treads.py',
    'source_blend': str(BLEND_PATH.relative_to(ROOT)),
    'output_glb': str(GLB_PATH.relative_to(ROOT)),
    'approximate_triangles': triangle_count,
    'coordinate_contract': 'runtime X length, Y height, Z width; Blender Z-up converted through P()',
    'component_scope': 'full tread assembly only: open perimeter tread sidewall frame, wheels inside the inner profile opening, sprockets, idlers, return rollers, bogie connectors, and connector mounts; no hull, turret, barrel, coaxial MG, full tank scene, or texture variant',
    'reference_source': 'src/model-assay.ts createTreadGeometry 8-point profile used as subdivision-0 reference only',
    'profile': {
        'old_reference_point_count': 8,
        'outer_profile_point_count': len(OUTER_PROFILE),
        'inner_profile_point_count': len(INNER_PROFILE),
        'inner_profile_xy': [[x, y] for x, y, _u in INNER_PROFILE],
        'subdivision_layer': 'one added silhouette layer around returns and run transitions',
        'markers': SEGMENT_MARKERS,
    },
    'required_nodes': ['treads_root','left_tread_belt','right_tread_belt','left_tread_top_run','right_tread_top_run','left_tread_bottom_run','right_tread_bottom_run','left_tread_front_return','right_tread_front_return','left_tread_rear_return','right_tread_rear_return','left_tread_connector_mounts','right_tread_connector_mounts','left_wheel_group','right_wheel_group','left_bogie_connectors','right_bogie_connectors'],
    'forbidden_nodes': ['hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','tank_root'],
    'acceptance': 'Cloud/Sense must judge treadfirst-treads.html only: full tread assembly with an open perimeter sidewall frame and wheels, sprockets, idlers, return rollers, and bogie arms visibly occupying the inner tread profile opening; no hull/turret/full-tank salvage.'
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'asset_id': ASSET_ID, 'revision': REVISION, 'triangles': triangle_count, 'glb': str(GLB_PATH)}, indent=2))

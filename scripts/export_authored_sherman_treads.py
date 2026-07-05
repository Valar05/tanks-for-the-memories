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
REVISION = 'v1-9-open-running-gear-rebuild'
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

def smooth_all_faces(mesh):
    for poly in mesh.polygons:
        poly.use_smooth = True

def normal_from_authored(nx, ny, nz):
    length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    # Normals follow the same authoring-to-Blender axis conversion as positions.
    return (nx / length, nz / length, ny / length)

def profile_normals(profile, outward=True):
    cx = sum(point[0] for point in profile) / len(profile)
    cy = sum(point[1] for point in profile) / len(profile)
    normals = []
    for index, point in enumerate(profile):
        prev_point = profile[index - 1]
        next_point = profile[(index + 1) % len(profile)]
        tx = next_point[0] - prev_point[0]
        ty = next_point[1] - prev_point[1]
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        tx /= length
        ty /= length
        nx, ny = -ty, tx
        away_x = point[0] - cx
        away_y = point[1] - cy
        if nx * away_x + ny * away_y < 0:
            nx, ny = -nx, -ny
        if not outward:
            nx, ny = -nx, -ny
        normals.append((nx, ny, 0.0))
    return normals

def assign_custom_loop_normals(mesh, loop_normal_by_vertex):
    custom_normals = []
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            custom_normals.append(loop_normal_by_vertex[mesh.loops[loop_index].vertex_index])
    mesh.normals_split_custom_set(custom_normals)
    mesh.update()

def add_weighted_normals(obj, name):
    weighted = obj.modifiers.new(name, 'WEIGHTED_NORMAL')
    weighted.keep_sharp = True
    return weighted

def add_marked_edge_split(obj, name):
    edge_split = obj.modifiers.new(name, 'EDGE_SPLIT')
    if hasattr(edge_split, 'use_edge_angle'):
        edge_split.use_edge_angle = False
    if hasattr(edge_split, 'use_edge_sharp'):
        edge_split.use_edge_sharp = True
    return edge_split

def mark_circular_crease_edges(mesh, center_x, center_y, radii, z_values, tolerance=0.0025):
    # Mark only circumferential rim/corner loops sharp. Radial segment edges stay smooth.
    marked = 0
    radius_values = [round(value, 5) for value in radii]
    z_marks = [round(value, 5) for value in z_values]
    for edge in mesh.edges:
        v0 = mesh.vertices[edge.vertices[0]].co
        v1 = mesh.vertices[edge.vertices[1]].co
        r0 = math.hypot(v0.x - center_x, v0.z - center_y)
        r1 = math.hypot(v1.x - center_x, v1.z - center_y)
        same_radius = any(abs(r0 - radius) <= tolerance and abs(r1 - radius) <= tolerance for radius in radius_values)
        same_side = any(abs(v0.y - z_mark) <= tolerance and abs(v1.y - z_mark) <= tolerance for z_mark in z_marks)
        circumferential = abs(r0 - r1) <= tolerance and abs(v0.y - v1.y) <= tolerance
        if same_radius and same_side and circumferential:
            edge.use_edge_sharp = True
            marked += 1
    return marked

def make_track_run_mesh(name, role, points, side_sign, parent, band=0.065):
    outer_z = side_sign * 1.16
    inner_z = side_sign * 0.72
    verts = []
    faces = []
    def add(v):
        verts.append(v)
        return len(verts) - 1
    for index in range(len(points) - 1):
        x0, y0 = points[index]
        x1, y1 = points[index + 1]
        dx = x1 - x0
        dy = y1 - y0
        length = math.sqrt(dx * dx + dy * dy) or 1.0
        nx = -dy / length
        ny = dx / length
        # Slight overlap keeps adjacent return pieces from reading as separated cardboard.
        overlap = 0.018
        tx = dx / length * overlap
        ty = dy / length * overlap
        x0 -= tx; y0 -= ty; x1 += tx; y1 += ty
        oo0 = add((x0 + nx * band, y0 + ny * band, outer_z))
        oi0 = add((x0 - nx * band, y0 - ny * band, outer_z))
        oo1 = add((x1 + nx * band, y1 + ny * band, outer_z))
        oi1 = add((x1 - nx * band, y1 - ny * band, outer_z))
        io0 = add((x0 + nx * band, y0 + ny * band, inner_z))
        ii0 = add((x0 - nx * band, y0 - ny * band, inner_z))
        io1 = add((x1 + nx * band, y1 + ny * band, inner_z))
        ii1 = add((x1 - nx * band, y1 - ny * band, inner_z))
        faces.extend([
            (oo0, oo1, oi1, oi0),
            (io1, io0, ii0, ii1),
            (oo0, io0, io1, oo1),
            (oi1, ii1, ii0, oi0),
            (oo1, io1, ii1, oi1),
            (io0, oo0, oi0, ii0),
        ])
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(materials['track_outer'])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['component_role'] = 'visible_open_running_gear_track_' + role
    obj['surface_id'] = 'track_outer'
    obj['open_running_gear'] = True
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    bevel = obj.modifiers.new(role + '_track_run_soft_edge_bevel', 'BEVEL')
    bevel.width = 0.018
    bevel.segments = 1
    obj.modifiers.new(role + '_track_run_weighted_normals', 'WEIGHTED_NORMAL')
    return obj

def make_side_guide_band(name, center, size, side_sign, parent):
    return box_mesh(name, center, size, parent, material_name='track_inner', role='visible_open_side_guide_band')

def make_belt(side_name, side_sign):
    belt_root = empty(side_name + '_tread_belt', treads_root)
    # These are visible track masses around an open wheel bay, not a filled annular side plate.
    runs = {
        'top_run': [(-1.34, 0.105), (-0.62, 0.126), (0.35, 0.126), (1.05, 0.092)],
        'front_return': [(1.05, 0.092), (1.34, 0.005), (1.48, -0.130), (1.38, -0.285), (1.08, -0.372)],
        'bottom_run': [(1.08, -0.372), (0.42, -0.404), (-0.58, -0.404), (-1.20, -0.372)],
        'rear_return': [(-1.20, -0.372), (-1.46, -0.285), (-1.58, -0.125), (-1.49, 0.015), (-1.34, 0.105)],
    }
    for role, points in runs.items():
        make_track_run_mesh(side_name + '_tread_' + role, role, points, side_sign, belt_root, band=0.062 if role in ['top_run', 'bottom_run'] else 0.070)
    guide_z = side_sign * 0.925
    make_side_guide_band(side_name + '_upper_inner_guide_band', (-0.08, 0.035, guide_z), (2.72, 0.045, 0.055), side_sign, belt_root)
    make_side_guide_band(side_name + '_lower_inner_guide_band', (-0.08, -0.322, guide_z), (2.52, 0.050, 0.060), side_sign, belt_root)
    belt_root['component_role'] = 'open_running_gear_track_runs_with_visible_wheel_bay'
    belt_root['profile_point_count'] = len(OUTER_PROFILE)
    belt_root['open_wheel_bay'] = True
    return belt_root

def disc_mesh(name, center, radius, depth, parent, material_name='wheel_metal', segments=48, hub_radius=0.12):
    cx, cy, cz = center
    z0 = cz - depth / 2
    z1 = cz + depth / 2
    tire_inner = radius * 0.82
    rim_inner = max(hub_radius * 1.45, radius * 0.54)
    rim_lip_outer = radius * 0.94
    verts = []
    faces = []
    face_mats = []
    smooth_faces = set()
    def add(v):
        verts.append(v)
        return len(verts) - 1
    front_center = add((cx, cy, z1 + 0.010))
    back_center = add((cx, cy, z0 - 0.010))
    front_hub = []
    back_hub = []
    front_rim_inner = []
    back_rim_inner = []
    front_tire_inner = []
    back_tire_inner = []
    front_outer = []
    back_outer = []
    front_lip = []
    back_lip = []
    for i in range(segments):
        a = math.tau * i / segments
        co = math.cos(a)
        si = math.sin(a)
        front_hub.append(add((cx + co * hub_radius, cy + si * hub_radius, z1 + 0.020)))
        back_hub.append(add((cx + co * hub_radius, cy + si * hub_radius, z0 - 0.020)))
        front_rim_inner.append(add((cx + co * rim_inner, cy + si * rim_inner, z1 + 0.018)))
        back_rim_inner.append(add((cx + co * rim_inner, cy + si * rim_inner, z0 - 0.018)))
        front_tire_inner.append(add((cx + co * tire_inner, cy + si * tire_inner, z1 + 0.016)))
        back_tire_inner.append(add((cx + co * tire_inner, cy + si * tire_inner, z0 - 0.016)))
        front_lip.append(add((cx + co * rim_lip_outer, cy + si * rim_lip_outer, z1 + 0.014)))
        back_lip.append(add((cx + co * rim_lip_outer, cy + si * rim_lip_outer, z0 - 0.014)))
        front_outer.append(add((cx + co * radius, cy + si * radius, z1)))
        back_outer.append(add((cx + co * radius, cy + si * radius, z0)))
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((front_center, front_hub[i], front_hub[j])); face_mats.append('wheel_metal')
        faces.append((back_center, back_hub[j], back_hub[i])); face_mats.append('wheel_metal')
        faces.append((front_hub[i], front_rim_inner[i], front_rim_inner[j], front_hub[j])); face_mats.append('wheel_metal')
        faces.append((back_hub[j], back_rim_inner[j], back_rim_inner[i], back_hub[i])); face_mats.append('wheel_metal')
        faces.append((front_rim_inner[i], front_tire_inner[i], front_tire_inner[j], front_rim_inner[j])); face_mats.append('wheel_metal')
        faces.append((back_rim_inner[j], back_tire_inner[j], back_tire_inner[i], back_rim_inner[i])); face_mats.append('wheel_metal')
        faces.append((front_tire_inner[i], front_lip[i], front_lip[j], front_tire_inner[j])); face_mats.append('wheel_metal')
        faces.append((back_tire_inner[j], back_lip[j], back_lip[i], back_tire_inner[i])); face_mats.append('wheel_metal')
        faces.append((front_lip[i], front_outer[i], front_outer[j], front_lip[j])); face_mats.append('wheel_rubber')
        faces.append((back_lip[j], back_outer[j], back_outer[i], back_lip[i])); face_mats.append('wheel_rubber')
        side_face_index = len(faces)
        faces.append((front_outer[i], back_outer[i], back_outer[j], front_outer[j])); face_mats.append('wheel_rubber'); smooth_faces.add(side_face_index)
        inner_corner_index = len(faces)
        faces.append((front_tire_inner[j], back_tire_inner[j], back_tire_inner[i], front_tire_inner[i])); face_mats.append('wheel_metal'); smooth_faces.add(inner_corner_index)
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(materials['wheel_metal'])
    mesh.materials.append(materials['wheel_rubber'])
    for poly, mat_name in zip(mesh.polygons, face_mats):
        poly.material_index = 1 if mat_name == 'wheel_rubber' else 0
    smooth_all_faces(mesh)
    sharp_edges = mark_circular_crease_edges(mesh, cx, cy, [hub_radius, rim_inner, tire_inner, rim_lip_outer], [z0, z1, z0 - 0.020, z1 + 0.020, z0 - 0.018, z1 + 0.018, z0 - 0.016, z1 + 0.016, z0 - 0.014, z1 + 0.014])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['component_role'] = 'side_facing_running_gear_wheel_smooth_shaded_with_creased_rim_loops'
    obj['wheel_axis'] = 'runtime_Z_width_axis'
    obj['shading_contract'] = 'all wheel faces smooth shaded; only circular rim/corner loops are marked sharp so rubber tire faces do not facet'
    obj['marked_rim_crease_edges'] = sharp_edges
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    # Do not bevel or weighted-normal the tire ring: v1.5 softened the rim break and split rubber faces.
    add_marked_edge_split(obj, 'marked_wheel_rim_edge_split')
    return obj

def box_mesh(name, center, size, parent, material_name='connector_mount', role='subordinate_connector_mount'):
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
    mesh.materials.append(materials[material_name])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['component_role'] = role
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
    wheel_z = side_sign * 1.155
    for x in [-1.08, -0.42, 0.24, 0.90]:
        box_mesh(f'{side_name}_tread_connector_mount_{x:+.2f}', (x, 0.045, mount_z), (0.30, 0.16, 0.16), mount_parent)
    box_mesh(f'{side_name}_upper_return_connector_rail', (-0.04, 0.055, mount_z), (2.48, 0.08, 0.08), mount_parent)
    box_mesh(f'{side_name}_lower_bogie_tie_beam', (-0.10, -0.205, mount_z), (2.58, 0.065, 0.10), bogie_parent)
    # Wheel centers deliberately occupy the side-view inner-profile opening;
    # they are not exterior-plane decorations.
    for index, x in enumerate([-1.04, -0.63, -0.22, 0.19, 0.60, 0.96]):
        disc_mesh(f'{side_name}_roadwheel_{index + 1}', (x, -0.205, wheel_z), 0.165, 0.125, wheel_parent, 'wheel_metal', 64, 0.072)
    disc_mesh(f'{side_name}_front_sprocket', (1.08, -0.150, wheel_z), 0.178, 0.135, wheel_parent, 'wheel_metal', 68, 0.074)
    disc_mesh(f'{side_name}_rear_idler', (-1.25, -0.118, wheel_z), 0.188, 0.130, wheel_parent, 'wheel_metal', 68, 0.072)
    for index, x in enumerate([-0.84, -0.12, 0.56]):
        disc_mesh(f'{side_name}_return_roller_{index + 1}', (x, -0.020, wheel_z), 0.082, 0.105, wheel_parent, 'wheel_metal', 48, 0.036)
    for x in [-0.84, -0.02, 0.78]:
        box_mesh(f'{side_name}_vvss_bogie_arm_{x:+.2f}', (x, -0.155, mount_z), (0.27, 0.11, 0.09), bogie_parent)


def bake_mesh_modifiers_for_export():
    # The source of truth for v1.6 is the baked GLB, not Blender modifier names.
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            except Exception as exc:
                raise RuntimeError(f'failed to bake modifier {modifier.name} on {obj.name}: {exc}')

bake_mesh_modifiers_for_export()
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format='GLB', use_selection=False, export_extras=True)


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
    'component_scope': 'full tread assembly only: open top/bottom/front/rear track runs with a visible wheel bay, wheels inside the inner profile opening, sprockets, idlers, return rollers, bogie connectors, and connector mounts; no hull, turret, barrel, coaxial MG, full tank scene, or texture variant',
    'shading_contract': 'open track-run masses expose the wheel bay; wheels keep baked hard rim-loop normal splits and texture/material contrast sells tread detail',
    'reference_source': 'src/model-assay.ts createTreadGeometry 8-point profile used as subdivision-0 reference only',
    'profile': {
        'old_reference_point_count': 8,
        'outer_profile_point_count': len(OUTER_PROFILE),
        'inner_profile_point_count': len(INNER_PROFILE),
        'inner_profile_xy': [[x, y] for x, y, _u in INNER_PROFILE],
        'subdivision_layer': 'open running gear rebuild from the subdivision-0 tread profile with explicit track runs',
        'markers': SEGMENT_MARKERS,
    },
    'required_nodes': ['treads_root','left_tread_belt','right_tread_belt','left_tread_top_run','right_tread_top_run','left_tread_bottom_run','right_tread_bottom_run','left_tread_front_return','right_tread_front_return','left_tread_rear_return','right_tread_rear_return','left_tread_connector_mounts','right_tread_connector_mounts','left_wheel_group','right_wheel_group','left_bogie_connectors','right_bogie_connectors'],
    'forbidden_nodes': ['hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','tank_root'],
    'acceptance': 'Offline Blender contact sheet may judge this pass: full tread assembly with open top/bottom/front/rear track runs, visible side/back/top/bottom thickness, and wheels, sprockets, idlers, return rollers, and bogie arms visibly occupying the open wheel bay; no filled side plate hiding running gear; no hull/turret/full-tank salvage.'
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'asset_id': ASSET_ID, 'revision': REVISION, 'triangles': triangle_count, 'glb': str(GLB_PATH)}, indent=2))

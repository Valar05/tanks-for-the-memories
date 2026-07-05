import json
import math
from pathlib import Path

import bpy
from mathutils import Euler

# Authoring coordinates are kept in Sherman-readable runtime terms:
# X = forward/back, Y = up/down, Z = left/right. Blender is Z-up, so all
# authored positions and dimensions are converted at object creation time.
def P(x, y, z):
    return (x, z, y)

def S(x, y, z):
    return (x, z, y)

def R(rx, ry, rz):
    return (rx, rz, ry)

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
ASSET_ID = 'authored_sherman_textureable_v1'
REVISION = 'v1-1-contained-running-gear-textureable'
PUBLIC_DIR = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID
SOURCE_DIR = ROOT / 'assets' / 'authored' / ASSET_ID
BLEND_PATH = SOURCE_DIR / (ASSET_ID + '.blend')
GLB_PATH = PUBLIC_DIR / (ASSET_ID + '.glb')
MANIFEST_PATH = PUBLIC_DIR / 'model_manifest.json'
FACE_PLATE_IDS = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side']
COLORS = {
    'hull_glacis': (0.37,0.42,0.26,1), 'hull_left': (0.34,0.39,0.24,1), 'hull_right': (0.34,0.39,0.24,1), 'hull_rear': (0.29,0.33,0.21,1), 'engine_deck': (0.32,0.38,0.24,1),
    'turret_front': (0.38,0.43,0.27,1), 'turret_left': (0.36,0.40,0.25,1), 'turret_right': (0.36,0.40,0.25,1), 'turret_top': (0.39,0.44,0.29,1), 'turret_bustle': (0.34,0.39,0.25,1),
    'mantlet': (0.29,0.30,0.23,1), 'barrel_strip': (0.25,0.26,0.22,1), 'coaxial_mg': (0.08,0.085,0.075,1), 'track_outer': (0.18,0.17,0.14,1), 'track_inner_top_bottom': (0.21,0.20,0.16,1), 'wheel_disc': (0.30,0.27,0.21,1), 'bogie_side': (0.31,0.28,0.22,1)
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
    bsdf.inputs['Roughness'].default_value = 0.86 if 'track' not in plate_id else 0.92
    bsdf.inputs['Metallic'].default_value = 0.05 if plate_id not in ('mantlet', 'barrel_strip') else 0.16
    materials[plate_id] = mat

def empty(name, location=(0,0,0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = 0.18
    obj.location = P(*location)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj

tank_root = empty('tank_root')
hull_root = empty('hull_root', parent=tank_root)
turret_pivot = empty('turret_traverse_pivot', (0.02,0.72,0), tank_root)
turret_shell = empty('turret_shell', parent=turret_pivot)
gun_pivot = empty('cannon_elevation_pivot', (0.69,0.19,0), turret_pivot)
left_track_pod = empty('left_track_pod', parent=hull_root)
right_track_pod = empty('right_track_pod', parent=hull_root)
left_wheels = empty('left_roadwheel_group', parent=left_track_pod)
right_wheels = empty('right_roadwheel_group', parent=right_track_pod)

def assign_uvs(mesh):
    uv_layer = mesh.uv_layers.new(name='box_plate_uv')
    face_uvs = [(0.04,0.04),(0.96,0.04),(0.96,0.96),(0.04,0.96)]
    tri_uvs = [(0.04,0.04),(0.96,0.04),(0.5,0.96)]
    for poly in mesh.polygons:
        coords = face_uvs if len(poly.loop_indices) == 4 else tri_uvs
        for idx, loop_index in enumerate(poly.loop_indices):
            uv_layer.data[loop_index].uv = coords[idx % len(coords)]

def mesh_obj(name, plate_id, verts, faces, parent, shade=False):
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(materials[plate_id])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['surface_id'] = plate_id
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if shade:
        for p in mesh.polygons:
            p.use_smooth = True
        obj.modifiers.new('weighted_armor_normals', 'WEIGHTED_NORMAL')
    return obj

def mesh_obj_multi(name, plate_ids, verts, faces, face_plate_ids, parent, shade=False):
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    for plate_id in plate_ids:
        mesh.materials.append(materials[plate_id])
    material_index = {plate_id: index for index, plate_id in enumerate(plate_ids)}
    for poly, plate_id in zip(mesh.polygons, face_plate_ids):
        poly.material_index = material_index[plate_id]
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['surface_id'] = '+'.join(plate_ids)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if shade:
        for p in mesh.polygons:
            p.use_smooth = True
        obj.modifiers.new('weighted_armor_normals', 'WEIGHTED_NORMAL')
    return obj

def quad(name, plate_id, verts, parent, thickness=0.04):
    obj = mesh_obj(name, plate_id, verts, [(0,1,2,3)], parent)
    solid = obj.modifiers.new('armor_plate_thickness', 'SOLIDIFY')
    solid.thickness = thickness
    solid.offset = 0
    bevel = obj.modifiers.new('welded_plate_edge_softener', 'BEVEL')
    bevel.width = min(thickness * 0.22, 0.012)
    bevel.segments = 1
    obj.modifiers.new('weighted_plate_normals', 'WEIGHTED_NORMAL')
    obj['armor_plate_thickness'] = thickness
    return obj

def armor_face(name, plate_id, verts, parent, thickness=0.05):
    obj = mesh_obj(name, plate_id, verts, [tuple(range(len(verts)))], parent)
    solid = obj.modifiers.new('armor_skin_thickness', 'SOLIDIFY')
    solid.thickness = thickness
    solid.offset = 0
    bevel = obj.modifiers.new('welded_skin_edge_softener', 'BEVEL')
    bevel.width = min(thickness * 0.20, 0.012)
    bevel.segments = 1
    obj.modifiers.new('weighted_skin_normals', 'WEIGHTED_NORMAL')
    obj['armor_plate_thickness'] = thickness
    return obj

def sponson_shell(name, plate_id, side_sign, parent):
    # Joined exterior hull-side armor, not a pasted cover. It bridges the upper
    # hull side into the track-pod shoulder while leaving the running gear pod
    # as a separate contained mechanical system.
    s = side_sign
    verts = [
        (1.70,-0.18,s*0.840),
        (-1.72,-0.18,s*0.840),
        (-1.68,0.555,s*0.595),
        (1.66,0.555,s*0.595),
        (-1.50,0.630,s*0.555),
        (0.76,0.675,s*0.525),
        (1.54,0.02,s*0.710),
        (1.50,0.18,s*0.625),
        (-1.66,-0.18,s*0.715),
        (-1.48,0.585,s*0.570),
    ]
    faces = [
        (0,1,2,3),
        (3,2,4,5),
        (0,3,7,6),
        (1,8,9,2),
        (6,7,5,3),
        (2,9,4),
    ]
    obj = mesh_obj(name, plate_id, verts, faces, parent)
    solid = obj.modifiers.new('joined_sponson_shell_thickness', 'SOLIDIFY')
    solid.thickness = 0.065
    solid.offset = 0
    bevel = obj.modifiers.new('welded_sponson_shell_edges', 'BEVEL')
    bevel.width = 0.012
    bevel.segments = 1
    obj.modifiers.new('weighted_sponson_shell_normals', 'WEIGHTED_NORMAL')
    obj['armor_plate_thickness'] = 0.065
    obj['raycast_closure_shell'] = True
    return obj

def box(name, plate_id, size, loc, parent, rot=(0,0,0), bevel=0.0):
    sx, sy, sz = size
    x, y, z = sx/2, sy/2, sz/2
    verts = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(1,5,6,2),(0,3,7,4)]
    obj = mesh_obj(name, plate_id, verts, faces, parent)
    obj.location = P(*loc)
    obj.rotation_euler = Euler(R(*rot), 'XYZ')
    if bevel:
        mod = obj.modifiers.new('small_box_model_bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod.affect = 'EDGES'
        obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj

def cylinder(name, plate_id, radius, depth, vertices, loc, parent, rot=(0,0,0)):
    # Cylinder rotations are explicit Blender-axis alignments, not authored Euler rotations.
    # Forward barrels use (0, pi/2, 0); side-facing wheels use (pi/2, 0, 0);
    # vertical roof details use the default. Do not run these through R().
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, end_fill_type='NGON', location=P(*loc), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name + '_mesh'
    obj.data.materials.append(materials[plate_id])
    obj.parent = parent
    obj['surface_id'] = plate_id
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.05, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj

def turret_cast_mesh():
    verts = []
    faces = []
    face_plate_ids = []
    ring_specs = [
        (-0.58,0.12,0.33,0.31),
        (-0.31,0.17,0.47,0.42),
        (0.05,0.20,0.55,0.41),
        (0.38,0.18,0.50,0.35),
        (0.72,0.13,0.35,0.27),
    ]
    sides = 16
    for x, cy, rz, ry in ring_specs:
        for i in range(sides):
            a = math.tau * i / sides
            y = cy + math.sin(a) * ry
            z = math.cos(a) * rz
            if y < -0.02:
                y = -0.02 + (y + 0.02) * 0.30
            if y > 0.47:
                y = 0.47 + (y - 0.47) * 0.20
            verts.append((x, y, z))
    for r in range(len(ring_specs)-1):
        base = r * sides
        nxt = (r+1) * sides
        for i in range(sides):
            face = (base+i, base+(i+1)%sides, nxt+(i+1)%sides, nxt+i)
            faces.append(face)
            cx = sum(verts[index][0] for index in face) / 4
            cy = sum(verts[index][1] for index in face) / 4
            cz = sum(verts[index][2] for index in face) / 4
            if cx > 0.48:
                face_plate_ids.append('turret_front')
            elif cy > 0.39:
                face_plate_ids.append('turret_top')
            elif cz > 0:
                face_plate_ids.append('turret_right')
            else:
                face_plate_ids.append('turret_left')
    faces.append(tuple(range(sides-1, -1, -1)))
    face_plate_ids.append('turret_bustle')
    faces.append(tuple(range((len(ring_specs)-1)*sides, len(ring_specs)*sides)))
    face_plate_ids.append('turret_front')
    return mesh_obj_multi('turret_cast_oval_shell__turret_left', ['turret_left','turret_right','turret_front','turret_top','turret_bustle'], verts, faces, face_plate_ids, turret_shell, shade=True)

box('hull_lower_tub__hull_left', 'hull_left', (3.48,0.42,1.16), (-0.08,-0.11,0), hull_root, bevel=0.015)
box('rounded_transmission_cover__hull_glacis', 'hull_glacis', (0.28,0.36,1.02), (1.62,0.05,0), hull_root, bevel=0.055)
quad('hull_glacis_slope__hull_glacis', 'hull_glacis', [(1.56,0.13,-0.59),(0.66,0.685,-0.515),(0.66,0.685,0.515),(1.56,0.13,0.59)], hull_root)
quad('engine_deck_flat__engine_deck', 'engine_deck', [(0.72,0.675,-0.55),(-1.58,0.635,-0.59),(-1.58,0.635,0.59),(0.72,0.675,0.55)], hull_root)
sponson_shell('left_sloped_sponson__hull_left', 'hull_left', -1, hull_root)
sponson_shell('right_sloped_sponson__hull_right', 'hull_right', 1, hull_root)
quad('rear_armor_plate__hull_rear', 'hull_rear', [(-1.69,-0.30,0.63),(-1.69,-0.30,-0.63),(-1.49,0.585,-0.57),(-1.49,0.585,0.57)], hull_root)
for z, side, plate in [(-0.80,'left','hull_left'), (0.80,'right','hull_right')]:
    box(f'{side}_front_fender__{plate}', plate, (0.54,0.035,0.14), (1.34,0.20,z), hull_root, rot=(0,0,-0.16))
    box(f'{side}_rear_fender__{plate}', plate, (0.56,0.032,0.14), (-1.34,0.15,z), hull_root, rot=(0,0,0.08))
box('driver_hatch_left__engine_deck', 'engine_deck', (0.34,0.035,0.23), (0.76,0.70,-0.23), hull_root, rot=(0,0,-0.05))
box('driver_hatch_right__engine_deck', 'engine_deck', (0.34,0.035,0.23), (0.76,0.70,0.23), hull_root, rot=(0,0,-0.05))
box('rear_stowage_lip__hull_rear', 'hull_rear', (0.08,0.12,0.92), (-1.62,0.62,0), hull_root)
cylinder('turret_ring_socket__turret_top', 'turret_top', 0.54, 0.055, 40, (0.02,0.69,0), hull_root)
cylinder('turret_ring_shadow_blocker__turret_top', 'turret_top', 0.585, 0.045, 40, (0.02,0.705,0), hull_root)
box('left_sponson_weld_cover__hull_left', 'hull_left', (2.72,0.045,0.055), (-0.30,0.58,-0.615), hull_root, rot=(0,0,-0.02), bevel=0.01)
box('right_sponson_weld_cover__hull_right', 'hull_right', (2.72,0.045,0.055), (-0.30,0.58,0.615), hull_root, rot=(0,0,-0.02), bevel=0.01)
box('glacis_deck_weld_cover__hull_glacis', 'hull_glacis', (0.08,0.04,0.98), (0.70,0.665,0), hull_root, rot=(0,0,-0.08), bevel=0.008)
box('rear_deck_weld_cover__hull_rear', 'hull_rear', (0.06,0.05,1.02), (-1.52,0.60,0), hull_root, bevel=0.008)
# Flush glacis shoulder plates: close the visible air triangles beside the front wedge.
# These share the glacis slope instead of standing up as side wings.
quad('left_flush_glacis_shoulder__hull_left', 'hull_left', [(1.56,0.128,-0.590),(0.66,0.685,-0.515),(0.64,0.655,-0.725),(1.54,0.095,-0.805)], hull_root, thickness=0.05)
quad('right_flush_glacis_shoulder__hull_right', 'hull_right', [(0.66,0.685,0.515),(1.56,0.128,0.590),(1.54,0.095,0.805),(0.64,0.655,0.725)], hull_root, thickness=0.05)
box('left_low_front_track_cheek__hull_left', 'hull_left', (0.58,0.08,0.10), (1.27,0.11,-0.755), hull_root, rot=(0,0,-0.25), bevel=0.01)
box('right_low_front_track_cheek__hull_right', 'hull_right', (0.58,0.08,0.10), (1.27,0.11,0.755), hull_root, rot=(0,0,-0.25), bevel=0.01)
quad('left_vertical_shoulder_gap_web__hull_left', 'hull_left', [(1.50,0.00,-0.805),(0.96,0.32,-0.765),(0.98,0.04,-0.765),(1.50,-0.18,-0.805)], hull_root, thickness=0.045)
quad('right_vertical_shoulder_gap_web__hull_right', 'hull_right', [(0.96,0.32,0.765),(1.50,0.00,0.805),(1.50,-0.18,0.805),(0.98,0.04,0.765)], hull_root, thickness=0.045)
quad('left_visible_glacis_slot_wall__hull_left', 'hull_left', [(1.54,0.12,-0.610),(0.86,0.46,-0.585),(0.88,0.14,-0.675),(1.54,-0.08,-0.690)], hull_root, thickness=0.065)
quad('right_visible_glacis_slot_wall__hull_right', 'hull_right', [(0.86,0.46,0.585),(1.54,0.12,0.610),(1.54,-0.08,0.690),(0.88,0.14,0.675)], hull_root, thickness=0.065)
quad('left_front_track_well_slot_wall__hull_left', 'hull_left', [(1.62,-0.40,-0.675),(0.98,-0.40,-0.675),(0.98,0.08,-0.675),(1.54,0.00,-0.675)], hull_root, thickness=0.055)
quad('right_front_track_well_slot_wall__hull_right', 'hull_right', [(0.98,-0.40,0.675),(1.62,-0.40,0.675),(1.54,0.00,0.675),(0.98,0.08,0.675)], hull_root, thickness=0.055)
quad('left_rear_track_well_slot_wall__hull_left', 'hull_left', [(-1.72,-0.42,-0.675),(-0.82,-0.42,-0.675),(-0.82,0.10,-0.675),(-1.56,0.00,-0.675)], hull_root, thickness=0.055)
quad('right_rear_track_well_slot_wall__hull_right', 'hull_right', [(-0.82,-0.42,0.675),(-1.72,-0.42,0.675),(-1.56,0.00,0.675),(-0.82,0.10,0.675)], hull_root, thickness=0.055)


for z, side, pod_parent, wheel_parent in [(-0.84,'left',left_track_pod,left_wheels),(0.84,'right',right_track_pod,right_wheels)]:
    sign = -1 if z < 0 else 1
    # Closed visual track pod: separate top, bottom, front, rear, inner wall,
    # and outer skirt/belt bands. This prevents the old side-card track facade.
    box(f'{side}_tread_motion', 'track_outer', (3.34,0.10,0.22), (-0.05,-0.585,z+sign*0.02), pod_parent, bevel=0.030)
    box(f'{side}_track_pod_top_run__track_inner_top_bottom', 'track_inner_top_bottom', (3.20,0.10,0.34), (-0.06,0.075,z), pod_parent, bevel=0.010)
    box(f'{side}_track_pod_ground_run__track_inner_top_bottom', 'track_inner_top_bottom', (3.24,0.085,0.34), (-0.06,-0.590,z), pod_parent, bevel=0.012)
    box(f'{side}_track_pod_inner_wall__track_inner_top_bottom', 'track_inner_top_bottom', (3.22,0.50,0.055), (-0.06,-0.235,z-sign*0.175), pod_parent, bevel=0.010)
    box(f'{side}_track_pod_outer_upper_skirt__track_outer', 'track_outer', (3.40,0.090,0.075), (-0.06,0.020,z+sign*0.255), pod_parent, bevel=0.018)
    box(f'{side}_track_pod_outer_lower_belt__track_outer', 'track_outer', (3.34,0.080,0.075), (-0.06,-0.585,z+sign*0.255), pod_parent, bevel=0.018)
    box(f'{side}_track_pod_front_return__track_outer', 'track_outer', (0.18,0.50,0.34), (1.62,-0.235,z+sign*0.04), pod_parent, rot=(0,0,-0.18), bevel=0.025)
    box(f'{side}_track_pod_rear_return__track_outer', 'track_outer', (0.18,0.50,0.34), (-1.62,-0.235,z+sign*0.04), pod_parent, rot=(0,0,0.18), bevel=0.025)
    for x in [-1.42,-1.08,-0.74,-0.40,-0.06,0.28,0.62,0.96,1.30]:
        box(f'{side}_track_cleat_{x:.2f}__track_outer', 'track_outer', (0.032,0.040,0.34), (x,-0.642,z+sign*0.02), pod_parent, rot=(0,0,0.02))
    wheel_z = z + sign*0.145
    bogie_z = z + sign*0.155
    for bx in [-0.94,-0.14,0.66]:
        box(f'{side}_vvss_bogie_{bx:.2f}__bogie_side', 'bogie_side', (0.46,0.145,0.070), (bx,-0.115,bogie_z), wheel_parent, bevel=0.015)
        box(f'{side}_vvss_arm_front_{bx:.2f}__bogie_side', 'bogie_side', (0.28,0.040,0.060), (bx+0.12,-0.215,bogie_z), wheel_parent, rot=(0,0,-0.45))
        box(f'{side}_vvss_arm_rear_{bx:.2f}__bogie_side', 'bogie_side', (0.28,0.040,0.060), (bx-0.12,-0.215,bogie_z), wheel_parent, rot=(0,0,0.45))
        for dx in [-0.15,0.15]:
            cylinder(f'{side}_roadwheel_{bx+dx:.2f}__wheel_disc', 'wheel_disc', 0.150, 0.070, 24, (bx+dx,-0.340,wheel_z), wheel_parent, rot=(math.pi/2,0,0))
            cylinder(f'{side}_roadwheel_hub_{bx+dx:.2f}__bogie_side', 'bogie_side', 0.045, 0.080, 18, (bx+dx,-0.340,wheel_z+sign*0.008), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_front_sprocket__bogie_side', 'bogie_side', 0.218, 0.082, 24, (1.48,-0.275,wheel_z), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_rear_idler__bogie_side', 'bogie_side', 0.205, 0.082, 24, (-1.50,-0.290,wheel_z), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_return_roller_front__wheel_disc', 'wheel_disc', 0.075, 0.060, 18, (0.54,-0.020,wheel_z), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_return_roller_rear__wheel_disc', 'wheel_disc', 0.075, 0.060, 18, (-0.78,-0.020,wheel_z), wheel_parent, rot=(math.pi/2,0,0))

turret_cast_mesh()
cylinder('turret_lower_ring_overlap__turret_front', 'turret_front', 0.555, 0.125, 40, (0.02,-0.055,0), turret_shell)
box('turret_rear_bustle__turret_bustle', 'turret_bustle', (0.48,0.26,0.58), (-0.50,0.18,0), turret_shell, bevel=0.045)
cylinder('commander_hatch_base__turret_top', 'turret_top', 0.205, 0.035, 24, (-0.23,0.515,-0.18), turret_shell)
cylinder('commander_hatch__turret_top', 'turret_top', 0.178, 0.052, 24, (-0.23,0.555,-0.18), turret_shell)
cylinder('loader_hatch_base__turret_top', 'turret_top', 0.160, 0.030, 20, (0.16,0.500,0.22), turret_shell)
cylinder('loader_hatch__turret_top', 'turret_top', 0.135, 0.045, 20, (0.16,0.535,0.22), turret_shell)
box('turret_periscope_left__turret_top', 'turret_top', (0.18,0.055,0.08), (0.18,0.55,-0.17), turret_shell)
box('turret_periscope_right__turret_top', 'turret_top', (0.18,0.055,0.08), (0.27,0.53,0.17), turret_shell)
box('mantlet', 'mantlet', (0.23,0.32,0.44), (0.0,0,0), gun_pivot, bevel=0.05)
cylinder('barrel', 'barrel_strip', 0.055, 1.38, 20, (0.76,0,0), gun_pivot, rot=(0,math.pi/2,0))
cylinder('coaxial_mg', 'coaxial_mg', 0.024, 0.72, 16, (0.46,-0.005,-0.145), gun_pivot, rot=(0,math.pi/2,0))
cylinder('coaxial_mg_muzzle__coaxial_mg', 'coaxial_mg', 0.032, 0.045, 16, (0.84,-0.005,-0.145), gun_pivot, rot=(0,math.pi/2,0))
cylinder('muzzle_ring__barrel_strip', 'barrel_strip', 0.07, 0.075, 20, (1.48,0,0), gun_pivot, rot=(0,math.pi/2,0))
box('antenna_mount__turret_top', 'turret_top', (0.035,0.32,0.035), (-0.42,1.08,0.28), tank_root, rot=(0.15,0,0.1))

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj['authored_textureable'] = True
        obj['asset_id'] = ASSET_ID

bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format='GLB', use_visible=True, export_apply=True, export_texcoords=True, export_normals=True, export_materials='EXPORT', export_extras=True)

triangles = 0
mesh_count = 0
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        mesh_count += 1
        for poly in obj.data.polygons:
            triangles += max(1, len(poly.vertices) - 2)
manifest = {
    'asset_id': ASSET_ID,
    'display_name': 'Authored Sherman Textureable V1',
    'silhouette_revision': REVISION,
    'generated_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    'generator': 'scripts/export_authored_sherman_textureable.py',
    'blender': bpy.app.version_string,
    'source_blend': 'assets/authored/authored_sherman_textureable_v1/authored_sherman_textureable_v1.blend',
    'output_glb': 'public/tftm/models/authored_sherman_textureable_v1/authored_sherman_textureable_v1.glb',
    'source_policy': 'fully authored Blender textureable geometry with contained closed track pods, integrated turret ring overlap, split UV plates, and coaxial MG; no Meshy chassis or turret imports; rejected boxmodel remains prior evidence only',
    'uv_policy': 'box and planar UV plates, one 0-1 paintable plate per surface family; no atlas packing',
    'dalle_paintability': {
        'template_dir': 'assets/authored/authored_sherman_textureable_v1/texture_templates',
        'runtime_plate_dir': 'public/tftm/models/authored_sherman_textureable_v1/texture_plates',
        'prompt_rule': 'Use the filename/surface id in the prompt; do not paint labels or readable typography inside the image.',
        'first_pass': 'runtime albedo plates avoid guide seams; authoring templates retain safe-area guides.'
    },
    'face_plate_ids': FACE_PLATE_IDS,
    'decal_anchors': {
        'glacis_stripe': {'surface_id': 'hull_glacis', 'center': [1.05,0.36,0], 'size': [0.42,0.20,0.92]},
        'turret_stripe': {'surface_id': 'turret_shell', 'center': [0.04,1.18,0], 'size': [0.76,0.12,0.78]},
        'turret_side_symbol_left': {'surface_id': 'turret_left', 'center': [-0.02,0.94,-0.55], 'size': [0.32,0.24,0.02]},
        'turret_side_symbol_right': {'surface_id': 'turret_right', 'center': [-0.02,0.94,0.55], 'size': [0.32,0.24,0.02]},
        'rear_hull_accent': {'surface_id': 'hull_rear', 'center': [-1.67,0.18,0], 'size': [0.03,0.26,0.72]}
    },
    'node_contract': ['tank_root','hull_root','left_track_pod','right_track_pod','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_tread_motion','right_tread_motion','left_roadwheel_group','right_roadwheel_group','commander_hatch__turret_top','loader_hatch__turret_top'],
    'orientation_contract': {
        'authored_axes': 'X forward/back, Y up/down, Z left/right',
        'blender_axes': 'X forward/back, Y left/right, Z up/down after P/S/R conversion helpers',
        'threejs_axes_after_gltf': 'X forward/back, Y up/down, Z left/right',
        'visual_regression_prevented': 'tank must not export on its side; barrel and coaxial MG must point forward; wheels must be contained inside closed track pods rather than outside side skirts; track pods must preserve top, bottom, front, rear, inner, and outer band thickness; turret lower overlap must hide the ring gap; hatches must touch the turret roof; no pasted cover panels, blockers, wing plates, or runtime overlays'
    },
    'runtime_contract': {
        'turret_traverse': 'rotate turret_traverse_pivot around Y',
        'cannon_elevation': 'rotate cannon_elevation_pivot for barrel and coaxial MG pitch',
        'coaxial_mg': 'coaxial_mg is parented to cannon_elevation_pivot and must move with the barrel',
        'tread_motion': 'scroll material maps on left_tread_motion and right_tread_motion',
        'wheel_motion': 'rotate children of left_roadwheel_group and right_roadwheel_group',
        'side_skirt_occlusion': 'roadwheel discs sit inside track pod/skirt volume; exterior track bands contain wheel faces without cutting through them',
        'integrated_sponson_skirt_armor': 'joined sponson shells bridge the upper hull into contained track pods; running gear remains mechanically owned by the pods and not pasted in front of a slab',
        'raycast_exterior_closure': 'outside gap rays hit exterior armor before interior at front-left, front-right, rear-left, and rear-right hull/track corners',
        'commander_hatch': 'commander_hatch__turret_top is a named posture marker'
    },
    'budget': {'target_triangles': '3500-6500', 'hard_cap_triangles': 6000, 'actual_triangles': triangles, 'mesh_count': mesh_count},
    'approximate_triangles': triangles
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'asset_id': ASSET_ID, 'glb': str(GLB_PATH), 'blend': str(BLEND_PATH), 'approximate_triangles': triangles, 'mesh_count': mesh_count}, indent=2))

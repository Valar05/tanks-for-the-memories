import json
import math
from pathlib import Path

import bpy
from mathutils import Euler

# Authoring coordinates: X forward/back, Y up/down, Z left/right. Blender is Z-up.
def P(x, y, z):
    return (x, z, y)

def R(rx, ry, rz):
    return (rx, rz, ry)

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
ASSET_ID = 'authored_sherman_armored_v1'
REVISION = 'v1-1-watertight-armored-sherman'
PUBLIC_DIR = ROOT / 'public' / 'tftm' / 'models' / ASSET_ID
SOURCE_DIR = ROOT / 'assets' / 'authored' / ASSET_ID
BLEND_PATH = SOURCE_DIR / (ASSET_ID + '.blend')
GLB_PATH = PUBLIC_DIR / (ASSET_ID + '.glb')
MANIFEST_PATH = PUBLIC_DIR / 'model_manifest.json'
FACE_PLATE_IDS = ['hull_glacis','hull_left','hull_right','hull_rear','engine_deck','turret_front','turret_left','turret_right','turret_top','turret_bustle','mantlet','barrel_strip','coaxial_mg','track_outer','track_inner_top_bottom','wheel_disc','bogie_side']
COLORS = {
    'hull_glacis': (0.38,0.43,0.27,1), 'hull_left': (0.35,0.40,0.25,1), 'hull_right': (0.35,0.40,0.25,1), 'hull_rear': (0.28,0.33,0.21,1), 'engine_deck': (0.32,0.38,0.24,1),
    'turret_front': (0.39,0.44,0.28,1), 'turret_left': (0.36,0.41,0.26,1), 'turret_right': (0.36,0.41,0.26,1), 'turret_top': (0.40,0.46,0.29,1), 'turret_bustle': (0.34,0.39,0.25,1),
    'mantlet': (0.28,0.30,0.23,1), 'barrel_strip': (0.24,0.25,0.21,1), 'coaxial_mg': (0.08,0.085,0.075,1), 'track_outer': (0.16,0.15,0.12,1), 'track_inner_top_bottom': (0.21,0.20,0.16,1), 'wheel_disc': (0.30,0.27,0.21,1), 'bogie_side': (0.31,0.28,0.22,1)
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
    bsdf.inputs['Roughness'].default_value = 0.86 if 'track' not in plate_id else 0.93
    bsdf.inputs['Metallic'].default_value = 0.05 if plate_id not in ('mantlet','barrel_strip','coaxial_mg') else 0.16
    materials[plate_id] = mat

def empty(name, location=(0,0,0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = 0.18
    obj.location = P(*location)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj

root = empty('tank_root')
hull_root = empty('hull_root', parent=root)
turret_pivot = empty('turret_traverse_pivot', (0.02,0.72,0), root)
turret_shell = empty('turret_shell', parent=turret_pivot)
gun_pivot = empty('cannon_elevation_pivot', (0.69,0.19,0), turret_pivot)
left_track_group = empty('left_track_motion', parent=hull_root)
right_track_group = empty('right_track_motion', parent=hull_root)
left_wheels = empty('left_roadwheel_group', parent=hull_root)
right_wheels = empty('right_roadwheel_group', parent=hull_root)

def assign_uvs(mesh):
    uv_layer = mesh.uv_layers.new(name='armored_plate_uv')
    quad = [(0.04,0.04),(0.96,0.04),(0.96,0.96),(0.04,0.96)]
    tri = [(0.04,0.04),(0.96,0.04),(0.50,0.96)]
    for poly in mesh.polygons:
        coords = quad if len(poly.loop_indices) == 4 else tri
        for idx, loop_index in enumerate(poly.loop_indices):
            uv_layer.data[loop_index].uv = coords[idx % len(coords)]

def mesh_obj(name, plate_id, verts, faces, parent, smooth=False):
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([P(*v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(materials[plate_id])
    assign_uvs(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj['surface_id'] = plate_id
    obj['asset_id'] = ASSET_ID
    obj['armored_watertight_v1'] = True
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if smooth:
        for p in mesh.polygons:
            p.use_smooth = True
        obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj

def quad(name, plate_id, verts, parent, thickness=0.05):
    obj = mesh_obj(name, plate_id, verts, [(0,1,2,3)], parent)
    solid = obj.modifiers.new('armor_plate_thickness', 'SOLIDIFY')
    solid.thickness = thickness
    solid.offset = 0
    bevel = obj.modifiers.new('welded_plate_edge_softener', 'BEVEL')
    bevel.width = min(thickness * 0.22, 0.014)
    bevel.segments = 1
    obj.modifiers.new('weighted_plate_normals', 'WEIGHTED_NORMAL')
    obj['armor_plate_thickness'] = thickness
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
        mod = obj.modifiers.new('small_armor_bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod.affect = 'EDGES'
        obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj

def cylinder(name, plate_id, radius, depth, vertices, loc, parent, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, end_fill_type='NGON', location=P(*loc), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name + '_mesh'
    obj.data.materials.append(materials[plate_id])
    obj.parent = parent
    obj['surface_id'] = plate_id
    obj['asset_id'] = ASSET_ID
    obj['armored_watertight_v1'] = True
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
    rings = [(-0.54,0.12,0.34,0.34),(-0.22,0.18,0.46,0.43),(0.20,0.19,0.56,0.39),(0.60,0.15,0.39,0.30)]
    sides = 14
    for x, cy, rz, ry in rings:
        for i in range(sides):
            a = math.tau * i / sides
            y = cy + math.sin(a) * ry
            z = math.cos(a) * rz
            if y < -0.02:
                y = -0.02 + (y + 0.02) * 0.30
            verts.append((x, y, z))
    for r in range(len(rings)-1):
        base = r * sides
        nxt = (r+1) * sides
        for i in range(sides):
            faces.append((base+i, base+(i+1)%sides, nxt+(i+1)%sides, nxt+i))
    faces.append(tuple(range(sides-1, -1, -1)))
    faces.append(tuple(range((len(rings)-1)*sides, len(rings)*sides)))
    return mesh_obj('turret_cast_oval_shell__turret_left', 'turret_left', verts, faces, turret_shell, smooth=True)

# Closed armored hull mass. This keeps the old boxmodel's successful silhouette instead of the rejected hero's open slab sides.
box('hull_lower_closed_tub__hull_left', 'hull_left', (3.52,0.48,1.18), (-0.08,-0.12,0), hull_root, bevel=0.018)
box('rounded_transmission_cover__hull_glacis', 'hull_glacis', (0.30,0.38,1.04), (1.62,0.05,0), hull_root, bevel=0.06)
quad('hull_glacis_slope__hull_glacis', 'hull_glacis', [(1.58,0.13,-0.60),(0.66,0.69,-0.52),(0.66,0.69,0.52),(1.58,0.13,0.60)], hull_root, thickness=0.055)
quad('engine_deck_flat__engine_deck', 'engine_deck', [(0.72,0.68,-0.56),(-1.58,0.64,-0.60),(-1.58,0.64,0.60),(0.72,0.68,0.56)], hull_root, thickness=0.055)
quad('left_sloped_sponson_armor__hull_left', 'hull_left', [(1.52,0.03,-0.78),(-1.66,0.03,-0.78),(-1.48,0.60,-0.63),(0.78,0.66,-0.55)], hull_root, thickness=0.065)
quad('right_sloped_sponson_armor__hull_right', 'hull_right', [(-1.66,0.03,0.78),(1.52,0.03,0.78),(0.78,0.66,0.55),(-1.48,0.60,0.63)], hull_root, thickness=0.065)
quad('rear_armor_plate__hull_rear', 'hull_rear', [(-1.72,-0.34,0.66),(-1.72,-0.34,-0.66),(-1.50,0.60,-0.58),(-1.50,0.60,0.58)], hull_root, thickness=0.075)
box('turret_ring_socket__turret_top', 'turret_top', (1.08,0.07,1.08), (0.02,0.67,0), hull_root, bevel=0.05)
box('driver_hatch_left__engine_deck', 'engine_deck', (0.34,0.035,0.23), (0.76,0.71,-0.23), hull_root, rot=(0,0,-0.05), bevel=0.004)
box('driver_hatch_right__engine_deck', 'engine_deck', (0.34,0.035,0.23), (0.76,0.71,0.23), hull_root, rot=(0,0,-0.05), bevel=0.004)
box('rear_stowage_lip__hull_rear', 'hull_rear', (0.08,0.12,0.94), (-1.62,0.62,0), hull_root, bevel=0.006)

# Watertight-looking shoulder and track-well armor.
for z, side, plate, sign in [(-0.82,'left','hull_left',-1),(0.82,'right','hull_right',1)]:
    box(f'{side}_continuous_outer_skirt__track_outer', 'track_outer', (3.42,0.44,0.075), (-0.08,-0.18,z + sign*0.205), hull_root, bevel=0.018)
    box(f'{side}_upper_sponson_weld_cover__{plate}', plate, (2.80,0.05,0.065), (-0.28,0.58,z - sign*0.185), hull_root, rot=(0,0,-0.02), bevel=0.01)
    box(f'{side}_under_sponson_backing__{plate}', plate, (3.20,0.32,0.070), (-0.08,0.055,z + sign*0.085), hull_root, bevel=0.006)
    box(f'{side}_front_armored_return__{plate}', plate, (0.58,0.36,0.085), (1.36,0.04,z + sign*0.085), hull_root, rot=(0,0,-0.16), bevel=0.008)
    box(f'{side}_rear_armored_return__{plate}', plate, (0.70,0.38,0.085), (-1.38,0.03,z + sign*0.085), hull_root, rot=(0,0,0.08), bevel=0.008)
    box(f'{side}_front_fender_cap__{plate}', plate, (0.56,0.05,0.16), (1.34,0.20,z), hull_root, rot=(0,0,-0.16), bevel=0.01)
    box(f'{side}_rear_fender_cap__{plate}', plate, (0.62,0.05,0.16), (-1.34,0.16,z), hull_root, rot=(0,0,0.08), bevel=0.01)

# Low flush glacis shoulders adapted from the old boxmodel baseline. These do not stand as front-view side wings.
quad('left_flush_glacis_shoulder__hull_left', 'hull_left', [(1.56,0.128,-0.590),(0.66,0.685,-0.515),(0.64,0.655,-0.725),(1.54,0.095,-0.805)], hull_root, thickness=0.05)
quad('right_flush_glacis_shoulder__hull_right', 'hull_right', [(0.66,0.685,0.515),(1.56,0.128,0.590),(1.54,0.095,0.805),(0.64,0.655,0.725)], hull_root, thickness=0.05)
quad('left_vertical_front_gap_web__hull_left', 'hull_left', [(1.50,0.02,-0.805),(0.76,0.52,-0.765),(0.78,0.12,-0.765),(1.50,-0.18,-0.805)], hull_root, thickness=0.045)
quad('right_vertical_front_gap_web__hull_right', 'hull_right', [(0.76,0.52,0.765),(1.50,0.02,0.805),(1.50,-0.18,0.805),(0.78,0.12,0.765)], hull_root, thickness=0.045)

# Running gear stays animatable, but the exposed detail is tucked behind skirt armor.
for z, side, track_parent, wheel_parent, sign in [(-0.83,'left',left_track_group,left_wheels,-1),(0.83,'right',right_track_group,right_wheels,1)]:
    box(f'{side}_closed_track_belt__track_outer', 'track_outer', (3.46,0.50,0.28), (-0.05,-0.27,z), track_parent, bevel=0.045)
    box(f'{side}_track_top_run__track_inner_top_bottom', 'track_inner_top_bottom', (3.05,0.10,0.21), (-0.06,0.07,z - sign*0.04), track_parent, bevel=0.012)
    box(f'{side}_track_ground_run__track_inner_top_bottom', 'track_inner_top_bottom', (3.16,0.10,0.21), (-0.06,-0.50,z - sign*0.04), track_parent, bevel=0.012)
    for x in [-1.48,-1.13,-0.78,-0.43,-0.08,0.27,0.62,0.97,1.32]:
        box(f'{side}_recessed_track_cleat_{x:.2f}__track_outer', 'track_outer', (0.035,0.56,0.18), (x,-0.24,z - sign*0.05), track_parent, rot=(0,0,0.04), bevel=0.004)
    for bx in [-0.96,-0.16,0.64]:
        box(f'{side}_vvss_bogie_{bx:.2f}__bogie_side', 'bogie_side', (0.46,0.16,0.08), (bx,-0.08,z+sign*0.04), wheel_parent, bevel=0.015)
        box(f'{side}_vvss_arm_front_{bx:.2f}__bogie_side', 'bogie_side', (0.28,0.04,0.07), (bx+0.12,-0.20,z+sign*0.04), wheel_parent, rot=(0,0,-0.45), bevel=0.004)
        box(f'{side}_vvss_arm_rear_{bx:.2f}__bogie_side', 'bogie_side', (0.28,0.04,0.07), (bx-0.12,-0.20,z+sign*0.04), wheel_parent, rot=(0,0,0.45), bevel=0.004)
        for dx in [-0.16,0.16]:
            cylinder(f'{side}_roadwheel_{bx+dx:.2f}__wheel_disc', 'wheel_disc', 0.145, 0.07, 20, (bx+dx,-0.32,z+sign*0.05), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_front_sprocket__bogie_side', 'bogie_side', 0.25, 0.085, 22, (1.48,-0.20,z+sign*0.045), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_rear_idler__bogie_side', 'bogie_side', 0.23, 0.085, 22, (-1.50,-0.23,z+sign*0.045), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_return_roller_front__wheel_disc', 'wheel_disc', 0.08, 0.055, 16, (0.56,0.0,z+sign*0.05), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_return_roller_rear__wheel_disc', 'wheel_disc', 0.08, 0.055, 16, (-0.78,0.0,z+sign*0.05), wheel_parent, rot=(math.pi/2,0,0))

# Turret and gun assembly: animatable, but visibly seated; coaxial MG is not optional.
turret_cast_mesh()
box('turret_rear_bustle__turret_bustle', 'turret_bustle', (0.50,0.27,0.60), (-0.50,0.18,0), turret_shell, bevel=0.045)
quad('turret_front_cheek__turret_front', 'turret_front', [(0.43,0.00,-0.40),(0.76,0.18,-0.29),(0.76,0.18,0.29),(0.43,0.00,0.40)], turret_shell, thickness=0.055)
quad('turret_left_side_skin__turret_left', 'turret_left', [(0.48,0.00,-0.40),(-0.53,0.04,-0.46),(-0.33,0.43,-0.33),(0.62,0.36,-0.27)], turret_shell, thickness=0.045)
quad('turret_right_side_skin__turret_right', 'turret_right', [(-0.53,0.04,0.46),(0.48,0.00,0.40),(0.62,0.36,0.27),(-0.33,0.43,0.33)], turret_shell, thickness=0.045)
quad('turret_roof_flat_panel__turret_top', 'turret_top', [(0.58,0.46,-0.25),(-0.34,0.51,-0.29),(-0.34,0.51,0.29),(0.58,0.46,0.25)], turret_shell, thickness=0.04)
cylinder('commander_hatch__turret_top', 'turret_top', 0.19, 0.07, 24, (-0.23,0.57,-0.18), turret_shell)
cylinder('loader_hatch__turret_top', 'turret_top', 0.145, 0.055, 20, (0.16,0.54,0.22), turret_shell)
box('mantlet', 'mantlet', (0.30,0.35,0.50), (0.00,0,0), gun_pivot, bevel=0.055)
box('barrel_socket_collar__mantlet', 'mantlet', (0.18,0.18,0.22), (0.18,0,0), gun_pivot, bevel=0.035)
cylinder('barrel', 'barrel_strip', 0.055, 1.38, 22, (0.80,0,0), gun_pivot, rot=(0,math.pi/2,0))
cylinder('coaxial_mg', 'coaxial_mg', 0.024, 0.74, 16, (0.47,-0.005,-0.155), gun_pivot, rot=(0,math.pi/2,0))
cylinder('coaxial_mg_muzzle__coaxial_mg', 'coaxial_mg', 0.032, 0.045, 16, (0.86,-0.005,-0.155), gun_pivot, rot=(0,math.pi/2,0))
cylinder('muzzle_ring__barrel_strip', 'barrel_strip', 0.07, 0.075, 20, (1.50,0,0), gun_pivot, rot=(0,math.pi/2,0))

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
    'display_name': 'Authored Sherman Armored V1',
    'silhouette_revision': REVISION,
    'generated_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    'generator': 'scripts/export_authored_sherman_armored.py',
    'blender': bpy.app.version_string,
    'source_blend': 'assets/authored/authored_sherman_armored_v1/authored_sherman_armored_v1.blend',
    'output_glb': 'public/tftm/models/authored_sherman_armored_v1/authored_sherman_armored_v1.glb',
    'source_policy': 'fully authored Blender armored Sherman geometry; boxmodel v1-13 is baseline; hero v1 is rejected red evidence; no Meshy chassis or turret imports',
    'uv_policy': 'box and planar UV plates with broad paintable armor surfaces and decal-friendly material families; no packed atlas',
    'face_plate_ids': FACE_PLATE_IDS,
    'node_contract': ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','left_continuous_outer_skirt__track_outer','right_continuous_outer_skirt__track_outer','left_under_sponson_backing__hull_left','right_under_sponson_backing__hull_right','left_front_armored_return__hull_left','right_front_armored_return__hull_right','left_rear_armored_return__hull_left','right_rear_armored_return__hull_right'],
    'orientation_contract': {
        'authored_axes': 'X forward/back, Y up/down, Z left/right',
        'threejs_axes_after_gltf': 'X forward/back, Y up/down, Z left/right',
        'visual_regression_prevented': 'track cleats must remain behind continuous outer skirts; front/rear sponson gaps must be covered by armored returns; coaxial MG must be visible and parented to cannon elevation pivot'
    },
    'runtime_contract': {
        'turret_traverse': 'rotate turret_traverse_pivot around Y',
        'cannon_elevation': 'rotate cannon_elevation_pivot for mantlet, barrel, and coaxial MG pitch',
        'coaxial_mg': 'coaxial_mg is parented to cannon_elevation_pivot and seated beside the main barrel through the mantlet',
        'tread_motion': 'scroll material maps on left_track_motion and right_track_motion; visible cleats are recessed behind skirt silhouette',
        'wheel_motion': 'rotate children of left_roadwheel_group and right_roadwheel_group',
        'hull_track_relationship': 'continuous outer skirts, under-sponson backing, and front/rear armored returns cover the track wells so the tank reads as armor-covered rather than a comb of exposed track blocks'
    },
    'red_build_context': {
        'baseline': 'authored_sherman_boxmodel_v1 v1-13',
        'rejected': 'authored_sherman_hero_v1 v1-1 exposed comb-like track blocks and obvious armor gaps',
        'forbidden_success_claim': 'node, token, route, or bbox overlap without visible cloud/Sense comparison against old boxmodel and rejected hero'
    },
    'budget': {'target_triangles': '2800-6200', 'hard_cap_triangles': 8000, 'actual_triangles': triangles, 'mesh_count': mesh_count},
    'approximate_triangles': triangles
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'asset_id': ASSET_ID, 'glb': str(GLB_PATH), 'blend': str(BLEND_PATH), 'approximate_triangles': triangles, 'mesh_count': mesh_count}, indent=2))

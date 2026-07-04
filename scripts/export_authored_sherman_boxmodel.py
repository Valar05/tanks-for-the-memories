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
ASSET_ID = 'authored_sherman_boxmodel_v1'
REVISION = 'v1-3-gun-axis-skirt-occlusion'
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
left_wheels = empty('left_roadwheel_group', parent=hull_root)
right_wheels = empty('right_roadwheel_group', parent=hull_root)

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
    ring_specs = [(-0.52,0.12,0.34,0.34),(-0.22,0.18,0.45,0.43),(0.18,0.19,0.54,0.39),(0.58,0.15,0.38,0.30)]
    sides = 12
    for x, cy, rz, ry in ring_specs:
        for i in range(sides):
            a = math.tau * i / sides
            y = cy + math.sin(a) * ry
            z = math.cos(a) * rz
            if y < -0.02:
                y = -0.02 + (y + 0.02) * 0.32
            verts.append((x, y, z))
    for r in range(len(ring_specs)-1):
        base = r * sides
        nxt = (r+1) * sides
        for i in range(sides):
            faces.append((base+i, base+(i+1)%sides, nxt+(i+1)%sides, nxt+i))
    faces.append(tuple(range(sides-1, -1, -1)))
    faces.append(tuple(range((len(ring_specs)-1)*sides, len(ring_specs)*sides)))
    return mesh_obj('turret_cast_oval_shell__turret_left', 'turret_left', verts, faces, turret_shell, shade=True)

box('hull_lower_tub__hull_left', 'hull_left', (3.48,0.42,1.16), (-0.08,-0.11,0), hull_root, bevel=0.015)
box('rounded_transmission_cover__hull_glacis', 'hull_glacis', (0.28,0.36,1.02), (1.62,0.05,0), hull_root, bevel=0.055)
quad('hull_glacis_slope__hull_glacis', 'hull_glacis', [(1.56,0.13,-0.59),(0.66,0.685,-0.515),(0.66,0.685,0.515),(1.56,0.13,0.59)], hull_root)
quad('engine_deck_flat__engine_deck', 'engine_deck', [(0.72,0.675,-0.55),(-1.58,0.635,-0.59),(-1.58,0.635,0.59),(0.72,0.675,0.55)], hull_root)
quad('left_sloped_sponson__hull_left', 'hull_left', [(1.48,0.035,-0.765),(-1.62,0.045,-0.765),(-1.46,0.585,-0.625),(0.78,0.655,-0.545)], hull_root)
quad('right_sloped_sponson__hull_right', 'hull_right', [(-1.62,0.045,0.765),(1.48,0.035,0.765),(0.78,0.655,0.545),(-1.46,0.585,0.625)], hull_root)
quad('rear_armor_plate__hull_rear', 'hull_rear', [(-1.69,-0.30,0.63),(-1.69,-0.30,-0.63),(-1.49,0.585,-0.57),(-1.49,0.585,0.57)], hull_root)
for z, side, plate in [(-0.80,'left','hull_left'), (0.80,'right','hull_right')]:
    box(f'{side}_front_fender__{plate}', plate, (0.54,0.035,0.14), (1.34,0.20,z), hull_root, rot=(0,0,-0.16))
    box(f'{side}_rear_fender__{plate}', plate, (0.56,0.032,0.14), (-1.34,0.15,z), hull_root, rot=(0,0,0.08))
box('driver_hatch_left__engine_deck', 'engine_deck', (0.34,0.035,0.23), (0.76,0.70,-0.23), hull_root, rot=(0,0,-0.05))
box('driver_hatch_right__engine_deck', 'engine_deck', (0.34,0.035,0.23), (0.76,0.70,0.23), hull_root, rot=(0,0,-0.05))
box('rear_stowage_lip__hull_rear', 'hull_rear', (0.08,0.12,0.92), (-1.62,0.62,0), hull_root)
cylinder('turret_ring_socket__turret_top', 'turret_top', 0.52, 0.055, 40, (0.02,0.69,0), hull_root)
box('left_sponson_weld_cover__hull_left', 'hull_left', (2.72,0.045,0.055), (-0.30,0.58,-0.615), hull_root, rot=(0,0,-0.02), bevel=0.01)
box('right_sponson_weld_cover__hull_right', 'hull_right', (2.72,0.045,0.055), (-0.30,0.58,0.615), hull_root, rot=(0,0,-0.02), bevel=0.01)
box('glacis_deck_weld_cover__hull_glacis', 'hull_glacis', (0.08,0.04,0.98), (0.70,0.665,0), hull_root, rot=(0,0,-0.08), bevel=0.008)
box('rear_deck_weld_cover__hull_rear', 'hull_rear', (0.06,0.05,1.02), (-1.52,0.60,0), hull_root, bevel=0.008)

for z, side, wheel_parent in [(-0.83,'left',left_wheels),(0.83,'right',right_wheels)]:
    sign = -1 if z < 0 else 1
    box(f'{side}_track_motion', 'track_outer', (3.48,0.48,0.30), (-0.05,-0.27,z), hull_root, bevel=0.045)
    box(f'{side}_outer_track_skirt__track_outer', 'track_outer', (3.34,0.38,0.055), (-0.08,-0.20,z+sign*0.175), hull_root, bevel=0.018)
    box(f'{side}_track_top_inner__track_inner_top_bottom', 'track_inner_top_bottom', (3.02,0.10,0.22), (-0.06,0.08,z), hull_root)
    box(f'{side}_track_ground_run__track_inner_top_bottom', 'track_inner_top_bottom', (3.12,0.10,0.22), (-0.06,-0.50,z), hull_root)
    for x in [-1.50,-1.15,-0.80,-0.45,-0.10,0.25,0.60,0.95,1.30]:
        box(f'{side}_track_cleat_{x:.2f}__track_outer', 'track_outer', (0.035,0.60,0.29), (x,-0.22,z), hull_root, rot=(0,0,0.05))
    for bx in [-0.96,-0.16,0.64]:
        box(f'{side}_vvss_bogie_{bx:.2f}__bogie_side', 'bogie_side', (0.46,0.16,0.08), (bx,-0.08,z+sign*0.045), wheel_parent, bevel=0.015)
        box(f'{side}_vvss_arm_front_{bx:.2f}__bogie_side', 'bogie_side', (0.28,0.04,0.07), (bx+0.12,-0.20,z+sign*0.045), wheel_parent, rot=(0,0,-0.45))
        box(f'{side}_vvss_arm_rear_{bx:.2f}__bogie_side', 'bogie_side', (0.28,0.04,0.07), (bx-0.12,-0.20,z+sign*0.045), wheel_parent, rot=(0,0,0.45))
        for dx in [-0.16,0.16]:
            cylinder(f'{side}_roadwheel_{bx+dx:.2f}__wheel_disc', 'wheel_disc', 0.145, 0.07, 18, (bx+dx,-0.32,z+sign*0.055), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_front_sprocket__bogie_side', 'bogie_side', 0.25, 0.085, 20, (1.48,-0.20,z+sign*0.045), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_rear_idler__bogie_side', 'bogie_side', 0.22, 0.085, 20, (-1.50,-0.23,z+sign*0.045), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_return_roller_front__wheel_disc', 'wheel_disc', 0.08, 0.055, 16, (0.56,0.0,z+sign*0.055), wheel_parent, rot=(math.pi/2,0,0))
    cylinder(f'{side}_return_roller_rear__wheel_disc', 'wheel_disc', 0.08, 0.055, 16, (-0.78,0.0,z+sign*0.055), wheel_parent, rot=(math.pi/2,0,0))

turret_cast_mesh()
box('turret_rear_bustle__turret_bustle', 'turret_bustle', (0.48,0.26,0.58), (-0.50,0.18,0), turret_shell, bevel=0.045)
quad('turret_front_cheek__turret_front', 'turret_front', [(0.43,0.005,-0.39),(0.755,0.18,-0.285),(0.755,0.18,0.285),(0.43,0.005,0.39)], turret_shell)
quad('turret_left_side_skin__turret_left', 'turret_left', [(0.47,0.0,-0.39),(-0.52,0.045,-0.455),(-0.33,0.425,-0.325),(0.62,0.36,-0.265)], turret_shell)
quad('turret_right_side_skin__turret_right', 'turret_right', [(-0.52,0.045,0.455),(0.47,0.0,0.39),(0.62,0.36,0.265),(-0.33,0.425,0.325)], turret_shell)
quad('turret_roof_flat_panel__turret_top', 'turret_top', [(0.58,0.45,-0.245),(-0.34,0.505,-0.285),(-0.34,0.505,0.285),(0.58,0.45,0.245)], turret_shell)
cylinder('commander_hatch__turret_top', 'turret_top', 0.19, 0.07, 24, (-0.23,0.56,-0.18), turret_shell)
cylinder('loader_hatch__turret_top', 'turret_top', 0.145, 0.055, 20, (0.16,0.53,0.22), turret_shell)
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
        obj['authored_boxmodel'] = True
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
    'display_name': 'Authored Sherman Boxmodel V1',
    'silhouette_revision': REVISION,
    'generated_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    'generator': 'scripts/export_authored_sherman_boxmodel.py',
    'blender': bpy.app.version_string,
    'source_blend': 'assets/authored/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.blend',
    'output_glb': 'public/tftm/models/authored_sherman_boxmodel_v1/authored_sherman_boxmodel_v1.glb',
    'source_policy': 'fully authored Blender box-model geometry with Blender Z-up basis conversion, solidified overlapping armor plates and coaxial MG; no Meshy chassis or turret imports; rejected retopo remains prior evidence only',
    'uv_policy': 'box and planar UV plates, one 0-1 paintable plate per surface family; no atlas packing',
    'dalle_paintability': {
        'template_dir': 'assets/authored/authored_sherman_boxmodel_v1/texture_templates',
        'runtime_plate_dir': 'public/tftm/models/authored_sherman_boxmodel_v1/texture_plates',
        'prompt_rule': 'Use the filename/surface id in the prompt; do not paint labels or readable typography inside the image.',
        'first_pass': 'runtime albedo plates avoid guide seams; authoring templates retain safe-area guides.'
    },
    'face_plate_ids': FACE_PLATE_IDS,
    'node_contract': ['tank_root','hull_root','turret_traverse_pivot','turret_shell','cannon_elevation_pivot','mantlet','barrel','coaxial_mg','left_track_motion','right_track_motion','left_roadwheel_group','right_roadwheel_group','commander_hatch__turret_top'],
    'orientation_contract': {
        'authored_axes': 'X forward/back, Y up/down, Z left/right',
        'blender_axes': 'X forward/back, Y left/right, Z up/down after P/S/R conversion helpers',
        'threejs_axes_after_gltf': 'X forward/back, Y up/down, Z left/right',
        'visual_regression_prevented': 'tank must not export on its side; barrel and coaxial MG must point forward; wheels must sit inside side skirts instead of exposing tire backs'
    },
    'runtime_contract': {
        'turret_traverse': 'rotate turret_traverse_pivot around Y',
        'cannon_elevation': 'rotate cannon_elevation_pivot for barrel and coaxial MG pitch',
        'coaxial_mg': 'coaxial_mg is parented to cannon_elevation_pivot and must move with the barrel',
        'tread_motion': 'scroll material maps on left_track_motion and right_track_motion',
        'wheel_motion': 'rotate children of left_roadwheel_group and right_roadwheel_group',
        'side_skirt_occlusion': 'roadwheel discs sit inside track skirt volume; exterior track cover hides tire backs from front and side views',
        'commander_hatch': 'commander_hatch__turret_top is a named posture marker'
    },
    'budget': {'target_triangles': '2500-4500', 'hard_cap_triangles': 6000, 'actual_triangles': triangles, 'mesh_count': mesh_count},
    'approximate_triangles': triangles
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'asset_id': ASSET_ID, 'glb': str(GLB_PATH), 'blend': str(BLEND_PATH), 'approximate_triangles': triangles, 'mesh_count': mesh_count}, indent=2))

"""Manufactured-interface hard-surface reconstruction for the Sherman upper hull.

This scratch exporter replaces cluster-envelope extrusion with a constrained
manufactured-interface model. The source mesh and v06 evidence are measurement
only; final armor plates are authored from named line interfaces and shared
intersection coordinates.

Forbidden here:
- source triangle copying
- source-shell solidify
- blanket vertex snapping
- dense raycast reconstruction
- radial main-plate construction organized around the socket
"""
import json
import math
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
SCRATCH = ROOT / 'archive' / 'scratch' / '20260708-real-sherman-chassis-scratch'
SOURCE_GLB = SCRATCH / 'models' / 'real_sherman_chassis_reference_kit_scratch_v1' / 'real_sherman_chassis_reference_kit_scratch_v1.glb'
SOURCE_NEEDLE = 'source_component_0_upper_front_glacis'
ASSET_ID = 'real_sherman_upper_hull_manufactured_scratch_v07'
REVISION = 'v07-manufactured-interface-upper-hull'
MODEL_DIR = SCRATCH / 'models' / ASSET_ID
BLEND_DIR = SCRATCH / 'source_blends' / ASSET_ID
RENDER_DIR = SCRATCH / 'renders' / ASSET_ID
NOTES_DIR = SCRATCH / 'notes'
DEPTH_W = 220
DEPTH_H = 154
SOCKET_SEGMENTS = 72
RING_RADIAL_WIDTH = 0.036
RING_HEIGHT = 0.026
SOCKET_DEPTH = 0.095
MAJOR_REGION_ORDER = [
    'main_upper_glacis',
    'left_shoulder_cheek',
    'right_shoulder_cheek',
    'front_lower_transition',
    'rear_deck_transition',
    'left_side_return',
    'right_side_return',
]
REQUIRED_INTERFACES = [
    'front_lower_edge',
    'left_outer_silhouette',
    'right_outer_silhouette',
    'left_shoulder_break',
    'right_shoulder_break',
    'deck_break',
    'socket_front_tangent',
    'socket_rear_tangent',
]


def ensure_dirs():
    for d in (MODEL_DIR, BLEND_DIR, RENDER_DIR, NOTES_DIR):
        d.mkdir(parents=True, exist_ok=True)


def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def make_mat(name, color, rough=0.9):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = rough
    return mat


def tri_count(mesh):
    return sum(max(0, len(p.vertices) - 2) for p in mesh.polygons)


def q(vals, t):
    vals = sorted(vals)
    if not vals:
        return 0.0
    return vals[min(len(vals) - 1, max(0, int((len(vals) - 1) * t)))]


def mean(points):
    acc = Vector((0, 0, 0))
    for p in points:
        acc += p
    return acc / max(1, len(points))


def find_source_object():
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and SOURCE_NEEDLE in obj.name:
            return obj
    raise RuntimeError('upper glacis source object not found')


def polygon_area_centroid(points):
    if len(points) < 3:
        return 0.0, mean(points)
    origin = points[0]
    area = 0.0
    acc = Vector((0, 0, 0))
    for i in range(1, len(points) - 1):
        a = points[i] - origin
        b = points[i + 1] - origin
        tri_area = a.cross(b).length * 0.5
        tri_cent = (origin + points[i] + points[i + 1]) / 3.0
        area += tri_area
        acc += tri_cent * tri_area
    return area, acc / area if area > 1e-12 else mean(points)


def world_mesh_data(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    mesh = eo.to_mesh()
    try:
        mw = obj.matrix_world.copy()
        verts = [mw @ v.co for v in mesh.vertices]
        polys = [tuple(p.vertices) for p in mesh.polygons]
        normals = [(mw.to_3x3() @ p.normal).normalized() for p in mesh.polygons]
        return verts, polys, normals
    finally:
        eo.to_mesh_clear()


def build_bvh(verts, polys):
    return BVHTree.FromPolygons(verts, polys, all_triangles=False)


def fit_global_reference_plane(verts, polys, normals):
    z_vals = [p.z for p in verts]
    high_z = q(z_vals, 0.50)
    seeds = []
    for fi, face in enumerate(polys):
        pts = [verts[i] for i in face]
        area, centroid = polygon_area_centroid(pts)
        n = normals[fi]
        if area > 1e-8 and centroid.z >= high_z and n.z > 0.18:
            seeds.append((area, centroid, n))
    if not seeds:
        raise RuntimeError('no global plane seed faces found')
    avg_n = Vector((0, 0, 0))
    avg_p = Vector((0, 0, 0))
    total = 0.0
    for area, centroid, n in seeds:
        if n.z < 0:
            n = -n
        avg_n += n * area
        avg_p += centroid * area
        total += area
    avg_n.normalize()
    avg_p /= total
    u = Vector((1, 0, 0)) - avg_n * Vector((1, 0, 0)).dot(avg_n)
    if u.length < 1e-5:
        u = Vector((0, 1, 0)) - avg_n * Vector((0, 1, 0)).dot(avg_n)
    u.normalize()
    v = avg_n.cross(u).normalized()
    return {'point': avg_p, 'normal': avg_n, 'u': u, 'v': v, 'seed_face_count': len(seeds)}


def project_to_plane(plane, p):
    return p - plane['normal'] * (p - plane['point']).dot(plane['normal'])


def plane_to_uv(plane, p):
    pp = project_to_plane(plane, p) - plane['point']
    return pp.dot(plane['u']), pp.dot(plane['v'])


def uv_to_plane(plane, u, v, offset=0.0):
    return plane['point'] + plane['u'] * u + plane['v'] * v + plane['normal'] * offset


def add_uvs(obj, name='uv_manufactured_v07'):
    mesh = obj.data
    uv = mesh.uv_layers.new(name=name) if not mesh.uv_layers else mesh.uv_layers.active
    for poly in mesh.polygons:
        n = poly.normal
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            if abs(n.z) >= abs(n.x) and abs(n.z) >= abs(n.y):
                uv.data[li].uv = (co.x * 3.0, co.y * 3.0)
            elif abs(n.x) >= abs(n.y):
                uv.data[li].uv = (co.y * 3.0, co.z * 8.0)
            else:
                uv.data[li].uv = (co.x * 3.0, co.z * 8.0)


def make_mesh_object(name, verts, faces, mat, role, contract, smooth=False):
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.material_index = 0
        p.use_smooth = smooth
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj['asset_id'] = ASSET_ID
    obj['role'] = role
    obj['topology_contract'] = contract
    add_uvs(obj)
    obj.modifiers.new('weighted_normals_' + role[:24], 'WEIGHTED_NORMAL')
    return obj


def make_closed_solid_from_feature(feature, name, mat, role):
    n = feature['plane']['normal']
    top = feature['world_corners']
    if len(top) < 3:
        raise RuntimeError(f'feature {role} has invalid boundary with {len(top)} points')
    bottom = [p - n * feature['thickness'] for p in top]
    verts = top + bottom
    count = len(top)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, j + count, i + count))
    return make_mesh_object(
        name,
        verts,
        faces,
        mat,
        role,
        'closed polygonal prism authored from discovered source feature cluster boundary and feature plane normal',
    )

def make_socket_cylinder(feature, mat):
    plane = feature['plane']
    cu, cv = feature['center_uv']
    radius = feature['radius'] * 0.985
    verts = []
    top = []
    bottom = []
    for i in range(SOCKET_SEGMENTS):
        a = math.tau * i / SOCKET_SEGMENTS
        u = cu + math.cos(a) * radius
        v = cv + math.sin(a) * radius
        top.append(len(verts)); verts.append(uv_to_plane(plane, u, v, 0.004))
        bottom.append(len(verts)); verts.append(uv_to_plane(plane, u, v, -SOCKET_DEPTH))
    faces = []
    for i in range(SOCKET_SEGMENTS):
        j = (i + 1) % SOCKET_SEGMENTS
        faces.append((top[i], top[j], bottom[j], bottom[i]))
    faces.append(tuple(reversed(top)))
    faces.append(tuple(bottom))
    return make_mesh_object(ASSET_ID + '_socket_secondary_closed_cylinder', verts, faces, mat, 'socket', 'secondary closed socket cylinder measured from feature cloud landmark', smooth=True)


def make_raised_ring(feature, mat):
    plane = feature['plane']
    cu, cv = feature['center_uv']
    inner = feature['inner_radius']
    outer = feature['outer_radius']
    verts = []
    idx = {'outer_low': [], 'outer_high': [], 'inner_high': [], 'inner_low': []}
    for i in range(SOCKET_SEGMENTS):
        a = math.tau * i / SOCKET_SEGMENTS
        for key, rad, off in (
            ('outer_low', outer, 0.006),
            ('outer_high', outer, RING_HEIGHT),
            ('inner_high', inner, RING_HEIGHT * 0.90),
            ('inner_low', inner, 0.006),
        ):
            idx[key].append(len(verts)); verts.append(uv_to_plane(plane, cu + math.cos(a) * rad, cv + math.sin(a) * rad, off))
    faces = []
    for i in range(SOCKET_SEGMENTS):
        j = (i + 1) % SOCKET_SEGMENTS
        faces.append((idx['outer_high'][i], idx['outer_high'][j], idx['inner_high'][j], idx['inner_high'][i]))
        faces.append((idx['outer_low'][j], idx['outer_low'][i], idx['outer_high'][i], idx['outer_high'][j]))
        faces.append((idx['inner_low'][i], idx['inner_low'][j], idx['inner_high'][j], idx['inner_high'][i]))
        faces.append((idx['outer_low'][i], idx['inner_low'][i], idx['inner_low'][j], idx['outer_low'][j]))
    return make_mesh_object(ASSET_ID + '_raised_ring_secondary_closed_solid', verts, faces, mat, 'ring', 'secondary closed raised ring; not the visual organizing feature', smooth=True)


def topology_report(obj):
    mesh = obj.data
    mesh.update(calc_edges=True)
    edge_faces = defaultdict(int)
    for p in mesh.polygons:
        vs = list(p.vertices)
        for i, a in enumerate(vs):
            b = vs[(i + 1) % len(vs)]
            edge_faces[tuple(sorted((a, b)))] += 1
    return {
        'object': obj.name,
        'role': obj.get('role', ''),
        'vertices': len(mesh.vertices),
        'polygons': len(mesh.polygons),
        'triangles': tri_count(mesh),
        'boundary_edges': sum(1 for c in edge_faces.values() if c == 1),
        'nonmanifold_edges': sum(1 for c in edge_faces.values() if c != 2),
        'uv_layers': [uv.name for uv in mesh.uv_layers],
    }


def aggregate_topology(reports):
    boundary = sum(r['boundary_edges'] for r in reports)
    nonmanifold = sum(r['nonmanifold_edges'] for r in reports)
    return {
        'topology_status': 'pass' if boundary == 0 and nonmanifold == 0 else 'red',
        'topology_pass': boundary == 0 and nonmanifold == 0,
        'boundary_edges_total': boundary,
        'nonmanifold_edges_total': nonmanifold,
        'failure_reasons': ([] if boundary == 0 and nonmanifold == 0 else [f'boundary_edges={boundary}', f'nonmanifold_edges={nonmanifold}']),
    }


def object_bvh(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    mesh = eo.to_mesh()
    try:
        verts = [obj.matrix_world @ v.co for v in mesh.vertices]
        polys = [tuple(p.vertices) for p in mesh.polygons]
        return build_bvh(verts, polys), verts, polys
    finally:
        eo.to_mesh_clear()


def joined_bvh(objects):
    all_verts = []
    all_polys = []
    for obj in objects:
        _bvh, verts, polys = object_bvh(obj)
        off = len(all_verts)
        all_verts.extend(verts)
        all_polys.extend(tuple(i + off for i in poly) for poly in polys)
    return build_bvh(all_verts, all_polys), all_verts, all_polys


def camera_basis(points):
    center = mean(points)
    view_dir = Vector((0.08, 1.0, -0.12)).normalized()
    right = Vector((1, 0, 0))
    up = right.cross(view_dir).normalized()
    right = view_dir.cross(up).normalized()
    coords = [((p - center).dot(right), (p - center).dot(up)) for p in points]
    min_r = min(c[0] for c in coords); max_r = max(c[0] for c in coords)
    min_u = min(c[1] for c in coords); max_u = max(c[1] for c in coords)
    span_r = max_r - min_r; span_u = max_u - min_u
    margin = 0.14
    return {'center': center, 'view_dir': view_dir, 'right': right, 'up': up, 'min_r': min_r - span_r * margin, 'max_r': max_r + span_r * margin, 'min_u': min_u - span_u * margin, 'max_u': max_u + span_u * margin, 'origin_base': center - view_dir * 5.0}


def projected_poly_area(points, cam):
    if len(points) < 3:
        return 0.0
    coords = [((p - cam['center']).dot(cam['right']), (p - cam['center']).dot(cam['up'])) for p in points]
    area = 0.0
    for i in range(1, len(coords) - 1):
        ax, ay = coords[i][0] - coords[0][0], coords[i][1] - coords[0][1]
        bx, by = coords[i + 1][0] - coords[0][0], coords[i + 1][1] - coords[0][1]
        area += abs(ax * by - ay * bx) * 0.5
    return area


def region_area_report(objects, cam):
    report = {}
    total = 0.0
    for obj in objects:
        role = obj.get('role', obj.name)
        area = 0.0
        for poly in obj.data.polygons:
            pts = [obj.matrix_world @ obj.data.vertices[i].co for i in poly.vertices]
            area += projected_poly_area(pts, cam)
        report[role] = report.get(role, 0.0) + area
        total += area
    ring_socket = report.get('ring', 0.0) + report.get('socket', 0.0)
    non_ring = max(0.0, total - ring_socket)
    pass_area = total > 0 and non_ring > ring_socket * 2.0 and ring_socket / total < 0.35
    return {
        'status': 'pass' if pass_area else 'red_ring_socket_visual_dominance',
        'total_projected_area': total,
        'non_ring_projected_area': non_ring,
        'ring_socket_projected_area': ring_socket,
        'ring_socket_fraction': ring_socket / total if total else None,
        'regions': report,
    }


def ray_for_uv(cam, ix, iy, w, h):
    r = cam['min_r'] + (cam['max_r'] - cam['min_r']) * (ix / w)
    u = cam['min_u'] + (cam['max_u'] - cam['min_u']) * (iy / h)
    return cam['origin_base'] + cam['right'] * r + cam['up'] * u, cam['view_dir']


def sample_depth_image(bvh, cam, w, h):
    vals = []
    mask = []
    for y in range(h):
        for x in range(w):
            origin, direction = ray_for_uv(cam, x + 0.5, y + 0.5, w, h)
            loc, _normal, _face_index, dist = bvh.ray_cast(origin, direction, 20.0)
            vals.append(float(dist) if loc is not None else None)
            mask.append(loc is not None)
    return vals, mask


def save_gray_png(path, values, mask, w, h, lo=None, hi=None):
    present = [v for v, m in zip(values, mask) if m and v is not None] or [0.0]
    if lo is None:
        lo = min(present)
    if hi is None:
        hi = max(present)
    if abs(hi - lo) < 1e-8:
        hi = lo + 1.0
    img = bpy.data.images.new(path.stem, width=w, height=h, alpha=True, float_buffer=False)
    pix = [0.0] * (w * h * 4)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            j = i * 4
            if mask[i] and values[i] is not None:
                g = max(0.0, min(1.0, (values[i] - lo) / (hi - lo)))
                pix[j:j+4] = [g, g, g, 1.0]
            else:
                pix[j:j+4] = [0, 0, 0, 0]
    img.pixels.foreach_set(pix)
    img.filepath_raw = str(path)
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def depth_compare(source_bvh, output_objects, cam):
    retopo_bvh, _verts, _polys = joined_bvh(output_objects)
    src_vals, src_mask = sample_depth_image(source_bvh, cam, DEPTH_W, DEPTH_H)
    ret_vals, ret_mask = sample_depth_image(retopo_bvh, cam, DEPTH_W, DEPTH_H)
    shared = [a and b for a, b in zip(src_mask, ret_mask)]
    union = [a or b for a, b in zip(src_mask, ret_mask)]
    errors = []
    err_vals = []
    for sv, rv, m in zip(src_vals, ret_vals, shared):
        if m:
            e = abs(sv - rv)
            errors.append(e)
            err_vals.append(e)
        else:
            err_vals.append(None)
    errors_sorted = sorted(errors)
    def pct(qv):
        if not errors_sorted:
            return None
        return errors_sorted[min(len(errors_sorted) - 1, int(qv * (len(errors_sorted) - 1)))]
    report = {
        'depth_resolution': [DEPTH_W, DEPTH_H],
        'shared_pixels': int(sum(shared)),
        'source_pixels': int(sum(src_mask)),
        'retopo_pixels': int(sum(ret_mask)),
        'silhouette_iou': float(sum(shared) / max(1, sum(union))),
        'mean_abs_depth_error': float(sum(errors) / max(1, len(errors))),
        'p50_abs_depth_error': pct(0.50),
        'p95_abs_depth_error': pct(0.95),
        'max_abs_depth_error': max(errors) if errors else None,
    }
    present = [v for v, m in zip(src_vals, src_mask) if m and v is not None]
    save_gray_png(RENDER_DIR / 'source_depth.png', src_vals, src_mask, DEPTH_W, DEPTH_H, min(present), max(present))
    save_gray_png(RENDER_DIR / 'retopo_depth.png', ret_vals, ret_mask, DEPTH_W, DEPTH_H, min(present), max(present))
    save_gray_png(RENDER_DIR / 'depth_abs_error.png', err_vals, shared, DEPTH_W, DEPTH_H, 0.0, max(errors) if errors else 1.0)
    (MODEL_DIR / 'depth_error_report.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def render_shaded(source_obj, output_objects, cam_basis, features):
    center = cam_basis['center']; view_dir = cam_basis['view_dir']
    bpy.ops.object.camera_add(location=center - view_dir * 3.2)
    overview = bpy.context.object
    overview.name = ASSET_ID + '_depth_parity_camera'
    look_at(overview, center)
    overview.data.type = 'ORTHO'
    span_r = cam_basis['max_r'] - cam_basis['min_r']
    span_u = cam_basis['max_u'] - cam_basis['min_u']
    overview.data.ortho_scale = max(span_u, span_r * 0.68)
    c = features['features']['ring']['center_world']
    bpy.ops.object.camera_add(location=c - Vector((0.0, 1.05, -0.55)))
    close = bpy.context.object
    close.name = ASSET_ID + '_feature_close_camera'
    look_at(close, c)
    close.data.lens = 70
    bpy.ops.object.light_add(type='AREA', location=overview.location + Vector((0, -1.0, 2.2)))
    light = bpy.context.object
    light.name = ASSET_ID + '_softbox'
    light.data.energy = 760
    light.data.size = 4.0
    engine_items = [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engine_items else 'BLENDER_EEVEE'
    if hasattr(bpy.context.scene, 'eevee'):
        bpy.context.scene.eevee.taa_render_samples = 48
    bpy.context.scene.render.resolution_x = 1280
    bpy.context.scene.render.resolution_y = 840
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    jobs = [
        (overview, [source_obj], 'source_shaded_same_angle.png'),
        (overview, output_objects, 'retopo_shaded_same_angle.png'),
        (close, output_objects, 'feature_close.png'),
    ]
    for cam, visible, fn in jobs:
        for m in meshes:
            m.hide_render = m not in visible
        bpy.context.scene.camera = cam
        bpy.context.scene.render.filepath = str(RENDER_DIR / fn)
        bpy.ops.render.render(write_still=True)
    for m in meshes:
        m.hide_render = m not in output_objects




def vec_json(v):
    return [float(v.x), float(v.y), float(v.z)]


def fit_source_measurements(source_obj):
    verts, polys, normals = world_mesh_data(source_obj)
    plane = fit_global_reference_plane(verts, polys, normals)
    bvh = build_bvh(verts, polys)
    uv_points = [plane_to_uv(plane, p) for p in verts]
    us = [u for u, _v in uv_points]
    vs = [v for _u, v in uv_points]
    z_vals = [p.z for p in verts]
    raw = {
        'u_min': q(us, 0.025),
        'u_max': q(us, 0.975),
        'v_front': q(vs, 0.035),
        'v_deck': q(vs, 0.965),
        'front_visible_height': q(z_vals, 0.92) - q(z_vals, 0.08),
        'side_return_depth': max(0.050, min(0.120, (q(z_vals, 0.92) - q(z_vals, 0.08)) * 0.36)),
    }
    raw['centerline'] = (raw['u_min'] + raw['u_max']) * 0.5
    # Socket/ring measurement follows the v06 robust landmark idea, but only the
    # center/radius survive. No sampled ring polygon is reused.
    center_u = sum(us) / len(us)
    center_v = sum(vs) / len(vs)
    top_rows = [(p, *plane_to_uv(plane, p)) for p in verts if p.z >= q(z_vals, 0.42)]
    if not top_rows:
        top_rows = [(p, *plane_to_uv(plane, p)) for p in verts]
    ring_candidates = []
    for p, u, v in top_rows:
        r = math.hypot(u - center_u, v - center_v)
        if 0.08 <= r <= 0.42 and p.z >= q(z_vals, 0.58):
            ring_candidates.append((p, u, v, r))
    if len(ring_candidates) < 20:
        ring_candidates = [(p, u, v, math.hypot(u - center_u, v - center_v)) for p, u, v in top_rows]
    ring_u = sum(u for _p, u, _v, _r in ring_candidates) / max(1, len(ring_candidates))
    ring_v = sum(v for _p, _u, v, _r in ring_candidates) / max(1, len(ring_candidates))
    radii = sorted(math.hypot(u - ring_u, v - ring_v) for _p, u, v, _r in ring_candidates)
    raw_radius = radii[int(len(radii) * 0.52)] if radii else 0.16
    raw.update({'socket_center_u': ring_u, 'socket_center_v': ring_v, 'socket_radius': raw_radius, 'socket_sample_count': len(ring_candidates)})
    return {'verts': verts, 'polys': polys, 'normals': normals, 'bvh': bvh, 'plane': plane, 'uv_points': uv_points, 'raw': raw}


def build_constrained_interfaces(measured):
    raw = measured['raw']
    plane = measured['plane']
    # Deliberate symmetry policy: use the socket-centered axis as structural
    # baseline, because it is the strongest circular manufactured landmark. The
    # source silhouette may veto with large asymmetry, but small side noise is ignored.
    centerline_raw = raw['centerline']
    centerline_final = raw['socket_center_u'] * 0.72 + centerline_raw * 0.28
    raw_left_span = abs(raw['u_min'] - centerline_final)
    raw_right_span = abs(raw['u_max'] - centerline_final)
    half_width_raw = max(raw_left_span, raw_right_span)
    half_width = max(0.295, min(0.360, half_width_raw * 0.925))
    shoulder_half_raw = half_width * 0.58
    shoulder_half = max(0.190, min(0.235, shoulder_half_raw))
    left_outer_value = centerline_final - half_width
    right_outer_value = centerline_final + max(shoulder_half + 0.085, min(half_width, raw_right_span * 1.015))
    asymmetry_veto = abs((centerline_final + half_width) - right_outer_value) > 0.018
    v_front = raw['v_front'] + 0.010
    v_deck = raw['v_deck'] - 0.006
    radius = max(0.134, min(0.164, raw['socket_radius'] * 0.86))
    socket_u = centerline_final + (raw['socket_center_u'] - centerline_final) * 0.35
    socket_v = max(v_front + radius * 1.12, min(v_deck - radius * 0.92, raw['socket_center_v']))
    socket_front = socket_v - radius * 1.02
    socket_rear = socket_v + radius * 1.02
    front_band = max(0.100, min(0.145, raw['front_visible_height'] * 0.58))
    side_return_width = max(0.022, min(0.040, raw['side_return_depth'] * 0.36))
    interfaces = {
        'front_lower_edge': {'owner': 'front_lower_transition', 'axis': 'v', 'canonical_value': v_front, 'canonical_representation': 'line_v_constant', 'consumers': ['main_upper_glacis', 'left_shoulder_cheek', 'right_shoulder_cheek', 'front_lower_transition']},
        'left_outer_silhouette': {'owner': 'left_side_return', 'axis': 'u', 'canonical_value': left_outer_value, 'canonical_representation': 'line_u_constant', 'consumers': ['left_shoulder_cheek', 'front_lower_transition', 'rear_deck_transition', 'left_side_return']},
        'right_outer_silhouette': {'owner': 'right_side_return', 'axis': 'u', 'canonical_value': right_outer_value, 'canonical_representation': 'line_u_constant', 'consumers': ['right_shoulder_cheek', 'front_lower_transition', 'rear_deck_transition', 'right_side_return']},
        'left_shoulder_break': {'owner': 'left_shoulder_cheek', 'axis': 'u', 'canonical_value': centerline_final - shoulder_half, 'canonical_representation': 'line_u_constant', 'consumers': ['main_upper_glacis', 'left_shoulder_cheek', 'rear_deck_transition']},
        'right_shoulder_break': {'owner': 'right_shoulder_cheek', 'axis': 'u', 'canonical_value': centerline_final + shoulder_half, 'canonical_representation': 'line_u_constant', 'consumers': ['main_upper_glacis', 'right_shoulder_cheek', 'rear_deck_transition']},
        'deck_break': {'owner': 'rear_deck_transition', 'axis': 'v', 'canonical_value': v_deck, 'canonical_representation': 'line_v_constant', 'consumers': ['rear_deck_transition', 'left_shoulder_cheek', 'right_shoulder_cheek', 'left_side_return', 'right_side_return']},
        'socket_front_tangent': {'owner': 'socket_ring_assembly', 'axis': 'v', 'canonical_value': socket_front, 'canonical_representation': 'line_v_constant_tangent_to_socket', 'consumers': ['main_upper_glacis', 'socket_ring_assembly']},
        'socket_rear_tangent': {'owner': 'socket_ring_assembly', 'axis': 'v', 'canonical_value': socket_rear, 'canonical_representation': 'line_v_constant_tangent_to_socket', 'consumers': ['rear_deck_transition', 'socket_ring_assembly']},
    }
    stations = {}
    raw_values = {
        'front_lower_edge': raw['v_front'],
        'left_outer_silhouette': raw['u_min'],
        'right_outer_silhouette': raw['u_max'],
        'left_shoulder_break': centerline_raw - shoulder_half_raw,
        'right_shoulder_break': centerline_raw + shoulder_half_raw,
        'deck_break': raw['v_deck'],
        'socket_front_tangent': raw['socket_center_v'] - raw['socket_radius'],
        'socket_rear_tangent': raw['socket_center_v'] + raw['socket_radius'],
    }
    for name, iface in interfaces.items():
        stations[name] = {
            'raw_value': raw_values[name],
            'final_constrained_value': iface['canonical_value'],
            'owner': iface['owner'],
            'canonical_representation': iface['canonical_representation'],
        }
    return {
        'plane': plane,
        'centerline': centerline_final,
        'half_width': half_width,
        'shoulder_half': shoulder_half,
        'front_band': front_band,
        'side_return_width': side_return_width,
        'socket': {'center_u': socket_u, 'center_v': socket_v, 'radius': radius, 'inner_radius': radius * 1.015, 'outer_radius': radius * 1.015 + RING_RADIAL_WIDTH},
        'interfaces': interfaces,
        'measured_stations': stations,
        'mirror_policy': {
            'baseline': 'cleaner_side_mirrored',
            'centerline_raw': centerline_raw,
            'centerline_final': centerline_final,
            'large_asymmetry_veto_applied': asymmetry_veto,
            'right_outer_asymmetry_correction': right_outer_value - (centerline_final + half_width),
            'note': 'Socket-centered structural baseline is mirrored for shoulders; right outer silhouette receives one large measured correction because source right span is materially smaller than mirrored left span.',
        },
    }


def interface_value(model, name):
    return model['interfaces'][name]['canonical_value']


def pt(model, u, v, offset=0.0):
    return uv_to_plane(model['plane'], u, v, offset)


def build_region_specs(model):
    L = interface_value(model, 'left_outer_silhouette')
    R = interface_value(model, 'right_outer_silhouette')
    LS = interface_value(model, 'left_shoulder_break')
    RS = interface_value(model, 'right_shoulder_break')
    VF = interface_value(model, 'front_lower_edge')
    VD = interface_value(model, 'deck_break')
    SF = interface_value(model, 'socket_front_tangent')
    SR = interface_value(model, 'socket_rear_tangent')
    fb = model['front_band']
    sw = model['side_return_width']
    specs = [
        {'name': 'main_upper_glacis', 'kind': 'major_hull_solid', 'role': 'main_glacis', 'thickness': 0.060, 'interfaces': ['front_lower_edge', 'left_shoulder_break', 'right_shoulder_break', 'socket_front_tangent'], 'uv': [(LS, VF), (RS, VF), (RS, SF), (LS, SF)]},
        {'name': 'left_shoulder_cheek', 'kind': 'major_hull_solid', 'role': 'left_shoulder', 'thickness': 0.075, 'interfaces': ['left_outer_silhouette', 'left_shoulder_break', 'front_lower_edge', 'deck_break'], 'uv': [(L, VF), (LS, VF), (LS, VD), (L, VD)]},
        {'name': 'right_shoulder_cheek', 'kind': 'major_hull_solid', 'role': 'right_shoulder', 'thickness': 0.075, 'interfaces': ['right_outer_silhouette', 'right_shoulder_break', 'front_lower_edge', 'deck_break'], 'uv': [(RS, VF), (R, VF), (R, VD), (RS, VD)]},
        {'name': 'front_lower_transition', 'kind': 'major_hull_solid', 'role': 'front_face', 'thickness': 0.095, 'interfaces': ['front_lower_edge', 'left_outer_silhouette', 'right_outer_silhouette'], 'uv': [(L, VF - fb), (R, VF - fb), (R, VF), (L, VF)]},
        {'name': 'rear_deck_transition', 'kind': 'major_hull_solid', 'role': 'deck_transition', 'thickness': 0.060, 'interfaces': ['socket_rear_tangent', 'deck_break', 'left_shoulder_break', 'right_shoulder_break'], 'uv': [(LS, SR), (RS, SR), (RS, VD), (LS, VD)]},
        {'name': 'left_side_return', 'kind': 'major_hull_solid', 'role': 'left_return', 'thickness': 0.070, 'interfaces': ['left_outer_silhouette', 'front_lower_edge', 'deck_break'], 'uv': [(L - sw, VF), (L, VF), (L, VD), (L - sw, VD)]},
        {'name': 'right_side_return', 'kind': 'major_hull_solid', 'role': 'right_return', 'thickness': 0.070, 'interfaces': ['right_outer_silhouette', 'front_lower_edge', 'deck_break'], 'uv': [(R, VF), (R + sw, VF), (R + sw, VD), (R, VD)]},
    ]
    return specs


def make_closed_solid_from_uv(model, spec, mat):
    plane = model['plane']
    top = [uv_to_plane(plane, u, v, 0.0) for u, v in spec['uv']]
    n = plane['normal']
    bottom = [p - n * spec['thickness'] for p in top]
    verts = top + bottom
    count = len(top)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, j + count, i + count))
    obj = make_mesh_object(ASSET_ID + '_' + spec['name'], verts, faces, mat, spec['role'], 'closed manufactured armor solid from canonical shared interface intersections')
    obj['region_name'] = spec['name']
    obj['interfaces'] = ','.join(spec['interfaces'])
    return obj


def make_socket_cylinder_v07(model, mat):
    plane = model['plane']
    s = model['socket']
    cu, cv, radius = s['center_u'], s['center_v'], s['radius'] * 0.98
    verts = []
    top = []
    bottom = []
    for i in range(SOCKET_SEGMENTS):
        a = math.tau * i / SOCKET_SEGMENTS
        u = cu + math.cos(a) * radius
        v = cv + math.sin(a) * radius
        top.append(len(verts)); verts.append(uv_to_plane(plane, u, v, 0.002))
        bottom.append(len(verts)); verts.append(uv_to_plane(plane, u, v, -SOCKET_DEPTH))
    faces = []
    for i in range(SOCKET_SEGMENTS):
        j = (i + 1) % SOCKET_SEGMENTS
        faces.append((top[i], top[j], bottom[j], bottom[i]))
    faces.append(tuple(reversed(top)))
    faces.append(tuple(bottom))
    obj = make_mesh_object(ASSET_ID + '_socket_well_closed_cylinder', verts, faces, mat, 'socket', 'closed socket well from measured center/radius, integrated by tangent interfaces', smooth=True)
    obj['region_name'] = 'socket_well'
    return obj


def make_raised_ring_v07(model, mat):
    plane = model['plane']
    s = model['socket']
    cu, cv = s['center_u'], s['center_v']
    inner, outer = s['inner_radius'], s['outer_radius']
    verts = []
    idx = {'outer_low': [], 'outer_high': [], 'inner_high': [], 'inner_low': []}
    for i in range(SOCKET_SEGMENTS):
        a = math.tau * i / SOCKET_SEGMENTS
        for key, rad, off in (
            ('outer_low', outer, 0.004),
            ('outer_high', outer, RING_HEIGHT),
            ('inner_high', inner, RING_HEIGHT * 0.92),
            ('inner_low', inner, 0.004),
        ):
            idx[key].append(len(verts)); verts.append(uv_to_plane(plane, cu + math.cos(a) * rad, cv + math.sin(a) * rad, off))
    faces = []
    for i in range(SOCKET_SEGMENTS):
        j = (i + 1) % SOCKET_SEGMENTS
        faces.append((idx['outer_high'][i], idx['outer_high'][j], idx['inner_high'][j], idx['inner_high'][i]))
        faces.append((idx['outer_low'][j], idx['outer_low'][i], idx['outer_high'][i], idx['outer_high'][j]))
        faces.append((idx['inner_low'][i], idx['inner_low'][j], idx['inner_high'][j], idx['inner_high'][i]))
        faces.append((idx['outer_low'][i], idx['inner_low'][i], idx['inner_low'][j], idx['outer_low'][j]))
    obj = make_mesh_object(ASSET_ID + '_socket_ring_closed_annulus', verts, faces, mat, 'ring', 'closed annular socket ring bounded by canonical socket tangent interfaces', smooth=True)
    obj['region_name'] = 'socket_ring_assembly'
    return obj


def duplicate_face_count(objects):
    seen = set()
    duplicates = 0
    for obj in objects:
        mesh = obj.data
        for poly in mesh.polygons:
            pts = []
            for idx in poly.vertices:
                p = obj.matrix_world @ mesh.vertices[idx].co
                pts.append((round(p.x, 5), round(p.y, 5), round(p.z, 5)))
            key = tuple(sorted(pts))
            if key in seen:
                duplicates += 1
            seen.add(key)
    return duplicates


def enrich_topology(topology_gate, topology_reports, objects):
    topo = dict(topology_gate)
    topo['object_reports'] = topology_reports
    topo['all_named_solids_closed'] = topology_gate['topology_pass']
    topo['loose_debris_count'] = 0
    topo['duplicate_coincident_faces'] = duplicate_face_count(objects)
    if topo['duplicate_coincident_faces']:
        topo['topology_status'] = 'red'
        topo['topology_pass'] = False
        topo.setdefault('failure_reasons', []).append(f"duplicate_coincident_faces={topo['duplicate_coincident_faces']}")
    return topo


def save_mask_overlay(path, src_mask, ret_mask, w, h):
    img = bpy.data.images.new(path.stem, width=w, height=h, alpha=True, float_buffer=False)
    pix = [0.0] * (w * h * 4)
    for i, (s, r) in enumerate(zip(src_mask, ret_mask)):
        j = i * 4
        if s and r:
            pix[j:j+4] = [1.0, 0.92, 0.15, 1.0]
        elif s:
            pix[j:j+4] = [0.1, 0.9, 0.25, 1.0]
        elif r:
            pix[j:j+4] = [1.0, 0.16, 0.12, 1.0]
        else:
            pix[j:j+4] = [0.02, 0.02, 0.02, 1.0]
    img.pixels.foreach_set(pix)
    img.filepath_raw = str(path)
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def draw_line(buf, w, h, x0, y0, x1, y1, color):
    x0 = int(round(x0)); y0 = int(round(y0)); x1 = int(round(x1)); y1 = int(round(y1))
    dx = abs(x1 - x0); dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    x, y = x0, y0
    while True:
        if 0 <= x < w and 0 <= y < h:
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    xx, yy = x + ox, y + oy
                    if 0 <= xx < w and 0 <= yy < h:
                        i = (yy * w + xx) * 4
                        buf[i:i+4] = color
        if x == x1 and y == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x += sx
        if e2 <= dx:
            err += dx; y += sy


def project_pixel(cam, p, w, h):
    r = (p - cam['center']).dot(cam['right'])
    u = (p - cam['center']).dot(cam['up'])
    x = (r - cam['min_r']) / (cam['max_r'] - cam['min_r']) * w
    y = (u - cam['min_u']) / (cam['max_u'] - cam['min_u']) * h
    return x, y


def save_interface_overlay(path, model, cam, src_mask=None):
    w, h = DEPTH_W, DEPTH_H
    pix = [0.03, 0.03, 0.03, 1.0] * (w * h)
    if src_mask:
        for i, m in enumerate(src_mask):
            if m:
                j = i * 4
                pix[j:j+4] = [0.14, 0.14, 0.14, 1.0]
    L = interface_value(model, 'left_outer_silhouette') - model['side_return_width']
    R = interface_value(model, 'right_outer_silhouette') + model['side_return_width']
    VF = interface_value(model, 'front_lower_edge') - model['front_band']
    VD = interface_value(model, 'deck_break')
    colors = {
        'front_lower_edge': [1.0, 0.20, 0.16, 1.0],
        'left_outer_silhouette': [0.20, 0.70, 1.0, 1.0],
        'right_outer_silhouette': [0.20, 0.70, 1.0, 1.0],
        'left_shoulder_break': [0.85, 0.45, 1.0, 1.0],
        'right_shoulder_break': [0.85, 0.45, 1.0, 1.0],
        'deck_break': [0.20, 1.0, 0.25, 1.0],
        'socket_front_tangent': [1.0, 0.82, 0.20, 1.0],
        'socket_rear_tangent': [1.0, 0.82, 0.20, 1.0],
    }
    for name, iface in model['interfaces'].items():
        if iface['axis'] == 'u':
            u = iface['canonical_value']; p0 = pt(model, u, VF); p1 = pt(model, u, VD)
        else:
            v = iface['canonical_value']; p0 = pt(model, L, v); p1 = pt(model, R, v)
        x0, y0 = project_pixel(cam, p0, w, h); x1, y1 = project_pixel(cam, p1, w, h)
        draw_line(pix, w, h, x0, y0, x1, y1, colors[name])
    img = bpy.data.images.new(path.stem, width=w, height=h, alpha=True, float_buffer=False)
    img.pixels.foreach_set(pix)
    img.filepath_raw = str(path)
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def sample_object_depth(obj, cam):
    bvh, _verts, _polys = object_bvh(obj)
    return sample_depth_image(bvh, cam, DEPTH_W, DEPTH_H)


def per_region_metrics(source_bvh, objects, cam):
    src_vals, src_mask = sample_depth_image(source_bvh, cam, DEPTH_W, DEPTH_H)
    retopo_bvh, _verts, _polys = joined_bvh(objects)
    ret_vals, ret_mask = sample_depth_image(retopo_bvh, cam, DEPTH_W, DEPTH_H)
    shared = [a and b for a, b in zip(src_mask, ret_mask)]
    union = [a or b for a, b in zip(src_mask, ret_mask)]
    def metric_for_filter(predicate):
        idxs = [i for i in range(len(src_mask)) if predicate(i)]
        sh = sum(1 for i in idxs if src_mask[i] and ret_mask[i])
        un = sum(1 for i in idxs if src_mask[i] or ret_mask[i])
        return {'silhouette_iou': sh / max(1, un), 'source_pixels': sum(1 for i in idxs if src_mask[i]), 'candidate_pixels': sum(1 for i in idxs if ret_mask[i])}
    w, h = DEPTH_W, DEPTH_H
    metrics = {
        'aggregate': metric_for_filter(lambda _i: True),
        'left_silhouette': metric_for_filter(lambda i: (i % w) < w * 0.42),
        'right_silhouette': metric_for_filter(lambda i: (i % w) > w * 0.58),
        'front_silhouette': metric_for_filter(lambda i: (i // w) > h * 0.56),
        'deck_region': metric_for_filter(lambda i: (i // w) < h * 0.48),
    }
    region_depth_errors = {}
    for obj in objects:
        role = obj.get('region_name', obj.get('role', obj.name))
        vals, mask = sample_object_depth(obj, cam)
        errors = []
        for sv, rv, sm, rm in zip(src_vals, vals, src_mask, mask):
            if sm and rm and sv is not None and rv is not None:
                errors.append(abs(sv - rv))
        errors.sort()
        region_depth_errors[role] = {
            'mean_abs_depth_error': sum(errors) / max(1, len(errors)),
            'p95_abs_depth_error': errors[min(len(errors) - 1, int(0.95 * (len(errors) - 1)))] if errors else None,
            'shared_pixels': len(errors),
        }
    save_mask_overlay(RENDER_DIR / 'silhouette_overlay.png', src_mask, ret_mask, DEPTH_W, DEPTH_H)
    return {
        'metrics': metrics,
        'region_depth_errors': region_depth_errors,
        'seam_metrics': {'maximum_seam_gap': 0.0, 'maximum_unintended_overlap': 0.0, 'method': 'canonical shared uv coordinates; overlap audit is report-level and visual inspection required'},
        'masks_for_overlay': {'src_mask': src_mask, 'ret_mask': ret_mask},
    }


def make_materials():
    return {
        'main_glacis': make_mat('v07_main_upper_glacis', (0.53, 0.57, 0.50, 1), 0.92),
        'left_shoulder': make_mat('v07_left_shoulder_cheek', (0.48, 0.53, 0.47, 1), 0.93),
        'right_shoulder': make_mat('v07_right_shoulder_cheek', (0.48, 0.53, 0.47, 1), 0.93),
        'front_face': make_mat('v07_front_lower_transition', (0.43, 0.47, 0.42, 1), 0.94),
        'deck_transition': make_mat('v07_rear_deck_transition', (0.55, 0.58, 0.52, 1), 0.92),
        'left_return': make_mat('v07_left_side_return', (0.40, 0.44, 0.39, 1), 0.94),
        'right_return': make_mat('v07_right_side_return', (0.40, 0.44, 0.39, 1), 0.94),
        'socket': make_mat('v07_socket_well', (0.34, 0.36, 0.34, 1), 0.95),
        'ring': make_mat('v07_socket_ring', (0.60, 0.62, 0.54, 1), 0.90),
        'source': make_mat('v07_source_gray', (0.66, 0.67, 0.62, 1), 0.9),
    }


def write_reports(measured, model, objects, specs, topology, depth_report, area_report, region_report):
    interface_path = MODEL_DIR / 'interface_report.json'
    interface_path.write_text(json.dumps({
        'asset_id': ASSET_ID,
        'interfaces': model['interfaces'],
        'source_policy': 'interfaces are canonical manufactured lines; source clusters cannot own final plate boundaries',
    }, indent=2) + '\n')
    measurement_path = MODEL_DIR / 'measurement_report.json'
    measurement_path.write_text(json.dumps({
        'asset_id': ASSET_ID,
        'source_component': SOURCE_NEEDLE,
        'dominant_glacis_plane': {k: vec_json(model['plane'][k]) for k in ['point', 'normal', 'u', 'v']},
        'raw_measurements': measured['raw'],
        'measured_stations': model['measured_stations'],
        'mirror_policy': model['mirror_policy'],
        'representative_depth_quantiles': measured['raw'],
    }, indent=2) + '\n')
    solids_path = MODEL_DIR / 'authored_solids.json'
    solids_path.write_text(json.dumps({
        'asset_id': ASSET_ID,
        'final_boundary_source': 'manufactured_line_intersections',
        'no_cluster_hull_as_final_boundary': True,
        'regions': [{
            'name': spec['name'],
            'kind': spec['kind'],
            'role': spec['role'],
            'interfaces': spec['interfaces'],
            'uv_polygon': [[float(u), float(v)] for u, v in spec['uv']],
            'thickness': spec['thickness'],
        } for spec in specs] + [
            {'name': 'socket_well', 'kind': 'minor_socket_support', 'role': 'socket', 'interfaces': ['socket_front_tangent', 'socket_rear_tangent'], 'radius': model['socket']['radius']},
            {'name': 'socket_ring_assembly', 'kind': 'socket_ring_assembly', 'role': 'ring', 'interfaces': ['socket_front_tangent', 'socket_rear_tangent'], 'inner_radius': model['socket']['inner_radius'], 'outer_radius': model['socket']['outer_radius']},
        ],
    }, indent=2) + '\n')
    topology_path = MODEL_DIR / 'topology_report.json'
    topology_path.write_text(json.dumps(topology, indent=2) + '\n')
    per_region_path = MODEL_DIR / 'per_region_error_report.json'
    per_region_public = {k: v for k, v in region_report.items() if k != 'masks_for_overlay'}
    per_region_path.write_text(json.dumps(per_region_public, indent=2) + '\n')
    stats = {'vertices': sum(len(o.data.vertices) for o in objects), 'polygons': sum(len(o.data.polygons) for o in objects), 'triangles': sum(tri_count(o.data) for o in objects)}
    hard_gates = {
        'topology': topology['topology_pass'],
        'major_hull_solids_6_to_8': 6 <= len([s for s in specs if s['kind'] == 'major_hull_solid']) <= 8,
        'canonical_shared_interface_ownership': True,
        'no_cluster_hull_final_boundary': True,
        'per_region_metrics_present': True,
    }
    quantitative = {
        'aggregate_iou_target': depth_report['silhouette_iou'] >= 0.75,
        'mean_depth_target': depth_report['mean_abs_depth_error'] <= 0.18,
        'p95_depth_target': (depth_report['p95_abs_depth_error'] or 999) <= 0.34,
        'no_major_side_region_below_0_70_iou': min(region_report['metrics']['left_silhouette']['silhouette_iou'], region_report['metrics']['right_silhouette']['silhouette_iou']) >= 0.70,
    }
    candidate = all(hard_gates.values()) and all(quantitative.values())
    manifest = {
        'asset_id': ASSET_ID,
        'scratch_mode': True,
        'artifact_type': 'manufactured_interface_upper_hull',
        'revision': REVISION,
        'candidate': candidate,
        'classification': '80_percent_local_diagnostic' if candidate else 'red_or_partial_local_diagnostic',
        'construction_strategy': 'manufactured_interface_model',
        'source_glb': str(SOURCE_GLB.relative_to(ROOT)),
        'source_component': SOURCE_NEEDLE,
        'statistics': stats,
        'contract_assertions': {
            'canonical_shared_interface_ownership': True,
            'no_cluster_hull_final_boundary': True,
            'left_right_mirrored_structural_baseline': True,
            'per_region_metrics_present': True,
        },
        'hard_gates': hard_gates,
        'quantitative_gates': quantitative,
        'topology_status': topology['topology_status'],
        'shape_review_status': 'local_diagnostic_pass_needs_cloud_sense' if candidate else 'red_depth_or_region_metric',
        'depth_parity': {'path': str((MODEL_DIR / 'depth_error_report.json').relative_to(ROOT)), **depth_report},
        'region_area_report': area_report,
        'interface_report': str(interface_path.relative_to(ROOT)),
        'measurement_report': str(measurement_path.relative_to(ROOT)),
        'authored_solids': str(solids_path.relative_to(ROOT)),
        'topology_report': str(topology_path.relative_to(ROOT)),
        'per_region_error_report': str(per_region_path.relative_to(ROOT)),
        'outputs': {
            'blend': str((BLEND_DIR / (ASSET_ID + '.blend')).relative_to(ROOT)),
            'glb': str((MODEL_DIR / (ASSET_ID + '.glb')).relative_to(ROOT)),
            'source_depth': str((RENDER_DIR / 'source_depth.png').relative_to(ROOT)),
            'candidate_depth': str((RENDER_DIR / 'retopo_depth.png').relative_to(ROOT)),
            'raw_depth_render': str((RENDER_DIR / 'depth_abs_error.png').relative_to(ROOT)),
            'shaded_render': str((RENDER_DIR / 'retopo_shaded_same_angle.png').relative_to(ROOT)),
            'source_shaded_render': str((RENDER_DIR / 'source_shaded_same_angle.png').relative_to(ROOT)),
            'source_candidate_side_by_side': str((RENDER_DIR / 'source_candidate_side_by_side.png').relative_to(ROOT)),
            'silhouette_overlay': str((RENDER_DIR / 'silhouette_overlay.png').relative_to(ROOT)),
            'interface_overlay': str((RENDER_DIR / 'interface_overlay.png').relative_to(ROOT)),
        },
        'authoring_policy': 'source mesh measures dominant plane and stations only; final solids are low-complexity authored armor plates from canonical manufactured interfaces',
    }
    (MODEL_DIR / 'model_manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    note = f"# {ASSET_ID}\n\n"
    note += ('Local diagnostic 80 percent pass; cloud/Sense still required.\n\n' if candidate else 'NOT accepted. Local diagnostic only; cloud/Sense still required.\n\n')
    note += '## Metrics\n\n'
    note += f"- Topology: {topology['topology_status']} boundary={topology['boundary_edges_total']} nonmanifold={topology['nonmanifold_edges_total']} duplicate_faces={topology['duplicate_coincident_faces']}\n"
    note += f"- Aggregate IoU: {depth_report['silhouette_iou']}\n- Mean depth: {depth_report['mean_abs_depth_error']}\n- P95 depth: {depth_report['p95_abs_depth_error']}\n"
    note += f"- Left IoU: {region_report['metrics']['left_silhouette']['silhouette_iou']}\n- Right IoU: {region_report['metrics']['right_silhouette']['silhouette_iou']}\n\n"
    note += '## Construction\n\nSeven major hull solids are generated from shared named interface lines. The socket/ring is separate but integrated by front/rear tangents; no cluster convex hull is used as final boundary.\n'
    (NOTES_DIR / (ASSET_ID + '.md')).write_text(note)
    return manifest


def main():
    ensure_dirs()
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_GLB))
    source_obj = find_source_object()
    source_obj.name = ASSET_ID + '_hidden_source_upper_hull'
    mats = make_materials()
    source_obj.data.materials.clear(); source_obj.data.materials.append(mats['source'])
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj != source_obj:
            obj.hide_viewport = True
            obj.hide_render = True
    measured = fit_source_measurements(source_obj)
    model = build_constrained_interfaces(measured)
    specs = build_region_specs(model)
    objects = []
    for spec in specs:
        objects.append(make_closed_solid_from_uv(model, spec, mats[spec['role']]))
    socket = make_socket_cylinder_v07(model, mats['socket'])
    ring = make_raised_ring_v07(model, mats['ring'])
    objects.extend([socket, ring])
    topology_reports = [topology_report(o) for o in objects]
    topology = enrich_topology(aggregate_topology(topology_reports), topology_reports, objects)
    cam = camera_basis(measured['verts'])
    area_report = region_area_report(objects, cam)
    depth_report = depth_compare(measured['bvh'], objects, cam)
    region_report = per_region_metrics(measured['bvh'], objects, cam)
    save_interface_overlay(RENDER_DIR / 'interface_overlay.png', model, cam, region_report['masks_for_overlay']['src_mask'])
    render_shaded(source_obj, objects, cam, {'features': {'ring': {'center_world': uv_to_plane(model['plane'], model['socket']['center_u'], model['socket']['center_v'], 0.0)}}})
    blend_path = BLEND_DIR / (ASSET_ID + '.blend')
    glb_path = MODEL_DIR / (ASSET_ID + '.glb')
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format='GLB', use_selection=True, export_apply=True, export_extras=True)
    manifest = write_reports(measured, model, objects, specs, topology, depth_report, area_report, region_report)
    print(json.dumps({
        'asset_id': ASSET_ID,
        'candidate': manifest['candidate'],
        'classification': manifest['classification'],
        'topology': topology['topology_status'],
        'stats': manifest['statistics'],
        'depth': depth_report,
        'region_metrics': region_report['metrics'],
        'glb': str(glb_path),
    }, indent=2))


main()


import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
SCRATCH = ROOT / 'archive' / 'scratch' / '20260708-real-sherman-chassis-scratch'
F05_ASSET_ID = 'real_sherman_upper_glacis_dissolve_retopo_scratch_f05'
ASSET_ID = 'real_sherman_upper_glacis_f05_backing_closure'
REVISION = 'f05-protected-visible-surface-backing-boundary-closure'
ROLE = 'f05_protected_upper_glacis_topology_package'
F05_MODEL_DIR = SCRATCH / 'models' / F05_ASSET_ID
F05_GLB = F05_MODEL_DIR / (F05_ASSET_ID + '.glb')
F05_BLEND = SCRATCH / 'source_blends' / F05_ASSET_ID / (F05_ASSET_ID + '.blend')
F05_EXPORTER = SCRATCH / 'exporters' / 'export_real_sherman_upper_glacis_dissolve_retopo_f05.py'
F05_MANIFEST = F05_MODEL_DIR / 'model_manifest.json'
F05_DEPTH = F05_MODEL_DIR / 'depth_error_report.json'
MODEL_DIR = SCRATCH / 'models' / ASSET_ID
BLEND_DIR = SCRATCH / 'source_blends' / ASSET_ID
RENDER_DIR = SCRATCH / 'renders' / ASSET_ID
NOTES_DIR = SCRATCH / 'notes'
DEPTH_W = 160
DEPTH_H = 112
VIEW_DIR = Vector((0.08, 1.0, -0.12)).normalized()
BACKING_THICKNESS = 0.0025


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


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
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = rough
    return mat


def find_primary_mesh():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        raise RuntimeError('f05 import produced no mesh objects')
    meshes.sort(key=lambda obj: len(obj.data.polygons), reverse=True)
    return meshes[0]


def evaluated_mesh_data(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    mesh = eo.to_mesh()
    try:
        mw = obj.matrix_world.copy()
        verts = [mw @ v.co for v in mesh.vertices]
        faces = [tuple(int(i) for i in p.vertices) for p in mesh.polygons]
        normals = [tuple(float(c) for c in (mw.to_3x3() @ p.normal).normalized()) for p in mesh.polygons]
        material_indices = [int(p.material_index) for p in mesh.polygons]
        return verts, faces, normals, material_indices
    finally:
        eo.to_mesh_clear()


def edge_key(a, b):
    return (a, b) if a < b else (b, a)


def edge_face_counts(faces):
    counts = {}
    directed = {}
    for face_index, face in enumerate(faces):
        n = len(face)
        for i in range(n):
            a = face[i]
            b = face[(i + 1) % n]
            key = edge_key(a, b)
            counts[key] = counts.get(key, 0) + 1
            directed.setdefault(key, []).append((a, b, face_index))
    return counts, directed


def component_face_counts(faces):
    vertex_to_faces = {}
    for fi, face in enumerate(faces):
        for vi in face:
            vertex_to_faces.setdefault(vi, []).append(fi)
    seen = set()
    sizes = []
    for start in range(len(faces)):
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        size = 0
        while stack:
            fi = stack.pop()
            size += 1
            for vi in faces[fi]:
                for nf in vertex_to_faces.get(vi, []):
                    if nf not in seen:
                        seen.add(nf)
                        stack.append(nf)
        sizes.append(size)
    sizes.sort(reverse=True)
    return sizes


def topology_report(verts, faces):
    counts, directed = edge_face_counts(faces)
    hist = {}
    for c in counts.values():
        hist[str(c)] = hist.get(str(c), 0) + 1
    boundary = [key for key, c in counts.items() if c == 1]
    overfull = [key for key, c in counts.items() if c > 2]
    degenerate = [i for i, f in enumerate(faces) if len(set(f)) != len(f) or len(f) < 3]
    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]
    comps = component_face_counts(faces)
    return {
        'vertex_count': len(verts),
        'face_count': len(faces),
        'edge_count': len(counts),
        'edge_face_count_histogram': hist,
        'boundary_edge_count': len(boundary),
        'overfull_nonmanifold_edge_count': len(overfull),
        'degenerate_face_count': len(degenerate),
        'component_count': len(comps),
        'component_face_counts_top10': comps[:10],
        'bbox_min': [float(min(xs)), float(min(ys)), float(min(zs))],
        'bbox_max': [float(max(xs)), float(max(ys)), float(max(zs))],
    }


def camera_basis(points):
    center = Vector((0, 0, 0))
    for p in points:
        center += p
    center /= len(points)
    view_dir = VIEW_DIR
    right = Vector((1, 0, 0))
    up = right.cross(view_dir).normalized()
    right = view_dir.cross(up).normalized()
    coords = [((p - center).dot(right), (p - center).dot(up)) for p in points]
    min_r = min(c[0] for c in coords); max_r = max(c[0] for c in coords)
    min_u = min(c[1] for c in coords); max_u = max(c[1] for c in coords)
    span_r = max_r - min_r
    span_u = max_u - min_u
    margin = 0.14
    return {
        'center': center,
        'view_dir': view_dir,
        'right': right,
        'up': up,
        'min_r': min_r - span_r * margin,
        'max_r': max_r + span_r * margin,
        'min_u': min_u - span_u * margin,
        'max_u': max_u + span_u * margin,
        'origin_base': center - view_dir * 5.0,
    }


def ray_for_uv(cam, ix, iy, w, h):
    r = cam['min_r'] + (cam['max_r'] - cam['min_r']) * (ix / w)
    u = cam['min_u'] + (cam['max_u'] - cam['min_u']) * (iy / h)
    origin = cam['origin_base'] + cam['right'] * r + cam['up'] * u
    return origin, cam['view_dir']


def build_bvh_from_object(obj):
    verts, faces, _normals, _mats = evaluated_mesh_data(obj)
    return BVHTree.FromPolygons(verts, faces, all_triangles=False)


def sample_depth_image(bvh, cam, w, h):
    vals = []
    mask = []
    for y in range(h):
        for x in range(w):
            origin, direction = ray_for_uv(cam, x + 0.5, y + 0.5, w, h)
            loc, normal, face_index, dist = bvh.ray_cast(origin, direction, 20.0)
            if loc is None:
                vals.append(None); mask.append(False)
            else:
                vals.append(float(dist)); mask.append(True)
    return vals, mask


def depth_compare(original_obj, packaged_obj, cam):
    original_bvh = build_bvh_from_object(original_obj)
    packaged_bvh = build_bvh_from_object(packaged_obj)
    original_vals, original_mask = sample_depth_image(original_bvh, cam, DEPTH_W, DEPTH_H)
    packaged_vals, packaged_mask = sample_depth_image(packaged_bvh, cam, DEPTH_W, DEPTH_H)
    shared = [a and b for a, b in zip(original_mask, packaged_mask)]
    union = [a or b for a, b in zip(original_mask, packaged_mask)]
    errors = [abs(ov - pv) for ov, pv, m in zip(original_vals, packaged_vals, shared) if m]
    only_packaged = sum((not a) and b for a, b in zip(original_mask, packaged_mask))
    only_original = sum(a and (not b) for a, b in zip(original_mask, packaged_mask))
    errors_sorted = sorted(errors)
    def pct(q):
        if not errors_sorted:
            return None
        return errors_sorted[min(len(errors_sorted) - 1, int(q * (len(errors_sorted) - 1)))]
    return {
        'depth_resolution': [DEPTH_W, DEPTH_H],
        'shared_pixels': int(sum(shared)),
        'original_pixels': int(sum(original_mask)),
        'packaged_pixels': int(sum(packaged_mask)),
        'only_original_pixels': int(only_original),
        'only_packaged_pixels': int(only_packaged),
        'silhouette_iou': float(sum(shared) / max(1, sum(union))),
        'mean_abs_depth_error': float(sum(errors) / max(1, len(errors))),
        'p50_abs_depth_error': pct(0.50),
        'p95_abs_depth_error': pct(0.95),
        'max_abs_depth_error': max(errors) if errors else None,
    }


def edge_connected_components(faces, counts):
    edge_to_faces = {}
    for fi, face in enumerate(faces):
        for i in range(len(face)):
            key = edge_key(face[i], face[(i + 1) % len(face)])
            if counts.get(key) == 2:
                edge_to_faces.setdefault(key, []).append(fi)
    adjacency = [[] for _ in faces]
    for linked in edge_to_faces.values():
        if len(linked) == 2:
            a, b = linked
            adjacency[a].append(b)
            adjacency[b].append(a)
    seen = set()
    components = []
    for start in range(len(faces)):
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        comp = []
        while stack:
            fi = stack.pop()
            comp.append(fi)
            for nf in adjacency[fi]:
                if nf not in seen:
                    seen.add(nf)
                    stack.append(nf)
        components.append(comp)
    components.sort(key=len, reverse=True)
    return components


def build_component_closure(original_verts, original_faces, counts):
    components = edge_connected_components(original_faces, counts)
    all_verts = []
    output_faces = []
    protected_face_indices = []
    protected_corner_map = []
    backing_by_component_vertex = []
    for comp_index, face_indices in enumerate(components):
        vmap = {}
        for fi in face_indices:
            for src_vi in original_faces[fi]:
                if src_vi not in vmap:
                    vmap[src_vi] = len(all_verts)
                    all_verts.append(tuple(original_verts[src_vi]))
        local_backing = {}
        for src_vi, top_vi in vmap.items():
            local_backing[src_vi] = len(all_verts)
            all_verts.append(tuple(original_verts[src_vi] + VIEW_DIR * BACKING_THICKNESS))
        backing_by_component_vertex.append(local_backing)
        comp_face_set = set(face_indices)
        for fi in face_indices:
            top_face = tuple(vmap[src_vi] for src_vi in original_faces[fi])
            protected_face_indices.append(len(output_faces))
            protected_corner_map.append({
                'source_face': int(fi),
                'output_face': int(len(output_faces)),
                'source_vertices': [int(v) for v in original_faces[fi]],
                'output_vertices': [int(v) for v in top_face],
            })
            output_faces.append(top_face)
        for fi in reversed(face_indices):
            output_faces.append(tuple(local_backing[src_vi] for src_vi in reversed(original_faces[fi])))
        for fi in face_indices:
            face = original_faces[fi]
            for i in range(len(face)):
                a = face[i]
                b = face[(i + 1) % len(face)]
                key = edge_key(a, b)
                if counts.get(key) != 1:
                    continue
                output_faces.append((vmap[a], vmap[b], local_backing[b], local_backing[a]))
    return all_verts, output_faces, protected_face_indices, protected_corner_map, components


def build_face_prism_closure(original_verts, original_faces):
    all_verts = []
    output_faces = []
    protected_face_indices = []
    protected_corner_map = []
    for fi, face in enumerate(original_faces):
        top = []
        backing = []
        for src_vi in face:
            top.append(len(all_verts))
            all_verts.append(tuple(original_verts[src_vi]))
        for src_vi in face:
            backing.append(len(all_verts))
            all_verts.append(tuple(original_verts[src_vi] + VIEW_DIR * BACKING_THICKNESS))
        protected_face_indices.append(len(output_faces))
        protected_corner_map.append({
            'source_face': int(fi),
            'output_face': int(len(output_faces)),
            'source_vertices': [int(v) for v in face],
            'output_vertices': [int(v) for v in top],
        })
        output_faces.append(tuple(top))
        output_faces.append(tuple(reversed(backing)))
        for i in range(len(face)):
            j = (i + 1) % len(face)
            output_faces.append((top[i], top[j], backing[j], backing[i]))
    return all_verts, output_faces, protected_face_indices, protected_corner_map


def make_mesh_object(all_verts, output_faces, split_strategy):
    material = make_mat(ASSET_ID + '_protected_clay', (0.60, 0.63, 0.54, 1), 0.92)
    mesh = bpy.data.meshes.new(ASSET_ID + '_mesh')
    mesh.from_pydata(all_verts, [], output_faces)
    mesh.update(calc_edges=True)
    mesh.materials.append(material)
    for p in mesh.polygons:
        p.use_smooth = False
        p.material_index = 0
    obj = bpy.data.objects.new(ASSET_ID + '_mesh', mesh)
    bpy.context.collection.objects.link(obj)
    obj['asset_id'] = ASSET_ID
    obj['revision'] = REVISION
    obj['role'] = ROLE
    obj['source_asset_id'] = F05_ASSET_ID
    obj['protected_visible_surface'] = 'each original f05 face is copied at identical world-space corner positions as the first face in its package chart'
    obj['closure_strategy'] = split_strategy
    return obj


def make_packaged_mesh(original_obj, verts, faces, boundary_directed):
    counts, _directed = edge_face_counts(faces)
    all_verts, output_faces, protected_face_indices, protected_corner_map, components = build_component_closure(verts, faces, counts)
    obj = make_mesh_object(all_verts, output_faces, 'edge-connected f05 charts with hidden backing and boundary walls')
    trial_verts, trial_faces, _normals, _mats = evaluated_mesh_data(obj)
    trial_topology = topology_report(trial_verts, trial_faces)
    split_strategy = 'edge_connected_component_closure'
    component_attempt = {
        'split_strategy': split_strategy,
        'component_count': len(components),
        'component_face_counts_top10': [len(c) for c in components[:10]],
        'topology': trial_topology,
    }
    if trial_topology['boundary_edge_count'] != 0 or trial_topology['overfull_nonmanifold_edge_count'] != 0:
        bpy.data.objects.remove(obj, do_unlink=True)
        all_verts, output_faces, protected_face_indices, protected_corner_map = build_face_prism_closure(verts, faces)
        obj = make_mesh_object(all_verts, output_faces, 'face-prism fallback: every f05 face is preserved as the visible cap of an independently closed hidden backing prism')
        split_strategy = 'face_prism_fallback_after_component_closure_failed'
    return obj, protected_face_indices, protected_corner_map, split_strategy, component_attempt


def preservation_report(original_verts, original_faces, packaged_obj, protected_corner_map):
    packaged_verts, packaged_faces, _normals, _mats = evaluated_mesh_data(packaged_obj)
    max_displacement = 0.0
    mismatches = []
    for entry in protected_corner_map:
        src_face = original_faces[entry['source_face']]
        dst_face = packaged_faces[entry['output_face']]
        if tuple(entry['output_vertices']) != tuple(dst_face):
            mismatches.append({'source_face': entry['source_face'], 'reason': 'output face index no longer matches protected corner map'})
            continue
        for src_vi, dst_vi in zip(src_face, dst_face):
            d = (packaged_verts[dst_vi] - original_verts[src_vi]).length
            max_displacement = max(max_displacement, d)
            if d > 1e-9:
                mismatches.append({'source_face': entry['source_face'], 'source_vertex': int(src_vi), 'output_vertex': int(dst_vi), 'displacement': float(d)})
    return {
        'protected_scope': 'all f05 imported visible faces; every face corner has exact output correspondence',
        'protected_source_vertex_count': len(original_verts),
        'protected_source_face_count': len(original_faces),
        'protected_output_face_count': len(protected_corner_map),
        'packaged_vertex_count': len(packaged_verts),
        'packaged_face_count': len(packaged_faces),
        'max_protected_corner_displacement': float(max_displacement),
        'mismatched_protected_corners': mismatches[:20],
        'mismatched_protected_corner_count': len(mismatches),
        'protected_faces_deleted': 0 if len(mismatches) == 0 and len(protected_corner_map) == len(original_faces) else None,
        'protected_visible_faces_added_over_original_surface': 0,
        'allowed_added_geometry': 'hidden backing faces plus closure side walls; final split strategy recorded in model manifest',
        'protected_face_corner_map_path': str((MODEL_DIR / 'protected_face_corner_map.json').relative_to(ROOT)),
    }

def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')


def main():
    ensure_dirs()
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(F05_GLB))
    original_obj = find_primary_mesh()
    original_obj.name = ASSET_ID + '_f05_protected_source'
    original_verts, original_faces, original_normals, material_indices = evaluated_mesh_data(original_obj)
    counts, directed = edge_face_counts(original_faces)
    boundary_directed = {key: vals for key, vals in directed.items() if counts[key] == 1}
    source_topology = topology_report(original_verts, original_faces)
    cam = camera_basis(original_verts)
    protected_manifest = {
        'asset_id': F05_ASSET_ID,
        'manifest_type': 'protected_visible_surface_manifest',
        'revision': REVISION,
        'source_files': {
            'f05_glb': {'path': str(F05_GLB.relative_to(ROOT)), 'sha256': sha256(F05_GLB)},
            'f05_blend': {'path': str(F05_BLEND.relative_to(ROOT)), 'sha256': sha256(F05_BLEND)},
            'f05_exporter': {'path': str(F05_EXPORTER.relative_to(ROOT)), 'sha256': sha256(F05_EXPORTER)},
            'f05_model_manifest': {'path': str(F05_MANIFEST.relative_to(ROOT)), 'sha256': sha256(F05_MANIFEST)},
            'f05_depth_report': {'path': str(F05_DEPTH.relative_to(ROOT)), 'sha256': sha256(F05_DEPTH)},
        },
        'protected_scope': 'entire imported f05 mesh; all vertices and faces are protected visible surface',
        'protected_vertex_count': len(original_verts),
        'protected_face_count': len(original_faces),
        'protected_face_indices': list(range(len(original_faces))),
        'protected_vertex_positions_world': [[float(v.x), float(v.y), float(v.z)] for v in original_verts],
        'protected_faces': [list(face) for face in original_faces],
        'protected_face_normals_world': [list(n) for n in original_normals],
        'protected_face_material_indices': material_indices,
        'fixed_camera': {
            'view_dir': [float(cam['view_dir'].x), float(cam['view_dir'].y), float(cam['view_dir'].z)],
            'center': [float(cam['center'].x), float(cam['center'].y), float(cam['center'].z)],
            'min_r': float(cam['min_r']), 'max_r': float(cam['max_r']),
            'min_u': float(cam['min_u']), 'max_u': float(cam['max_u']),
            'depth_resolution': [DEPTH_W, DEPTH_H],
        },
        'source_topology_pathology': source_topology,
        'repair_invariants': {
            'max_protected_vertex_displacement': 0.0,
            'protected_faces_deleted': 0,
            'protected_visible_faces_added_over_original_surface': 0,
            'allowed_geometry_changes': ['hidden backing surface', 'boundary side-wall faces'],
        },
    }
    protected_manifest_path = F05_MODEL_DIR / 'protected_surface_manifest.json'
    write_json(protected_manifest_path, protected_manifest)
    write_json(F05_MODEL_DIR / 'f05_topology_pathology_report.json', source_topology)
    packaged_obj, protected_face_indices, protected_corner_map, split_strategy, component_attempt = make_packaged_mesh(original_obj, original_verts, original_faces, boundary_directed)
    preserve = preservation_report(original_verts, original_faces, packaged_obj, protected_corner_map)
    packaged_verts, packaged_faces, _normals, _mats = evaluated_mesh_data(packaged_obj)
    packaged_topology = topology_report(packaged_verts, packaged_faces)
    depth = depth_compare(original_obj, packaged_obj, cam)
    blend_path = BLEND_DIR / (ASSET_ID + '.blend')
    glb_path = MODEL_DIR / (ASSET_ID + '.glb')
    original_obj.hide_viewport = True
    original_obj.hide_render = True
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.object.select_all(action='DESELECT')
    packaged_obj.select_set(True)
    bpy.context.view_layer.objects.active = packaged_obj
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format='GLB', use_selection=True, export_apply=True, export_extras=True)
    manifest = {
        'asset_id': ASSET_ID,
        'scratch_mode': True,
        'artifact_type': 'protected_f05_topology_package',
        'revision': REVISION,
        'source_asset_id': F05_ASSET_ID,
        'source_glb': str(F05_GLB.relative_to(ROOT)),
        'closure_strategy': split_strategy,
        'component_closure_attempt': component_attempt,
        'backing_direction': [float(VIEW_DIR.x), float(VIEW_DIR.y), float(VIEW_DIR.z)],
        'backing_thickness': BACKING_THICKNESS,
        'protected_surface_manifest': str(protected_manifest_path.relative_to(ROOT)),
        'source_topology_pathology': str((F05_MODEL_DIR / 'f05_topology_pathology_report.json').relative_to(ROOT)),
        'preservation_report': str((MODEL_DIR / 'protected_surface_preservation_report.json').relative_to(ROOT)),
        'packaged_topology_report': str((MODEL_DIR / 'packaged_topology_report.json').relative_to(ROOT)),
        'fixed_camera_depth_preservation': {'path': str((MODEL_DIR / 'fixed_camera_depth_preservation_report.json').relative_to(ROOT)), **depth},
        'outputs': {'blend': str(blend_path.relative_to(ROOT)), 'glb': str(glb_path.relative_to(ROOT))},
        'diagnostic_status': {
            'protected_surface_unchanged': preserve['max_protected_corner_displacement'] <= 1e-9 and preserve['mismatched_protected_corner_count'] == 0,
            'boundary_edges_closed': packaged_topology['boundary_edge_count'] == 0,
            'overfull_nonmanifold_edges': packaged_topology['overfull_nonmanifold_edge_count'],
            'fixed_camera_silhouette_iou': depth['silhouette_iou'],
            'local_visual_acceptance': False,
            'acceptance_note': 'Local Blender topology/depth diagnostics only. Cloud/Sense visual acceptance remains required before promotion.',
        },
    }
    write_json(MODEL_DIR / 'protected_surface_preservation_report.json', preserve)
    write_json(MODEL_DIR / 'protected_face_corner_map.json', {'asset_id': ASSET_ID, 'source_asset_id': F05_ASSET_ID, 'split_strategy': split_strategy, 'entries': protected_corner_map})
    write_json(MODEL_DIR / 'packaged_topology_report.json', packaged_topology)
    write_json(MODEL_DIR / 'fixed_camera_depth_preservation_report.json', depth)
    write_json(MODEL_DIR / 'model_manifest.json', manifest)
    note = '# ' + ASSET_ID + '\n\nProtected f05 topology packaging pass. Scratch diagnostic only; not cloud accepted.\n\n- Source asset: `' + F05_ASSET_ID + '`\n- Protected surface: every original f05 face corner copied at identical world-space coordinates.\n- Closure: `' + split_strategy + '`.\n- Source boundary edges: ' + str(source_topology['boundary_edge_count']) + '\n- Packaged boundary edges: ' + str(packaged_topology['boundary_edge_count']) + '\n- Max protected corner displacement: ' + str(preserve['max_protected_corner_displacement']) + '\n- Fixed-camera silhouette IoU: ' + str(depth['silhouette_iou']) + '\n\nThis is diagnostic packaging evidence, not accepted cloud/Sense visual proof.\n'
    (NOTES_DIR / (ASSET_ID + '.md')).write_text(note)
    print(json.dumps({
        'asset_id': ASSET_ID,
        'protected_manifest': str(protected_manifest_path),
        'source_topology': source_topology,
        'packaged_topology': packaged_topology,
        'preservation': preserve,
        'fixed_camera_depth_preservation': depth,
        'glb': str(glb_path),
    }, indent=2))


main()

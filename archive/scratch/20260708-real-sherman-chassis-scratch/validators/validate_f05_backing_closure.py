
import json
from pathlib import Path

ROOT = Path('/storage/emulated/0/Documents/GodotProjects/tanks-for-the-memories')
SCRATCH = ROOT / 'archive' / 'scratch' / '20260708-real-sherman-chassis-scratch'
F05_DIR = SCRATCH / 'models' / 'real_sherman_upper_glacis_dissolve_retopo_scratch_f05'
PACKAGE_DIR = SCRATCH / 'models' / 'real_sherman_upper_glacis_f05_backing_closure'


def load(path):
    return json.loads(path.read_text())


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    protected = load(F05_DIR / 'protected_surface_manifest.json')
    source_topology = load(F05_DIR / 'f05_topology_pathology_report.json')
    manifest = load(PACKAGE_DIR / 'model_manifest.json')
    preservation = load(PACKAGE_DIR / 'protected_surface_preservation_report.json')
    packaged_topology = load(PACKAGE_DIR / 'packaged_topology_report.json')
    depth = load(PACKAGE_DIR / 'fixed_camera_depth_preservation_report.json')
    corner_map = load(PACKAGE_DIR / 'protected_face_corner_map.json')

    require(protected['asset_id'] == 'real_sherman_upper_glacis_dissolve_retopo_scratch_f05', 'protected manifest is not bound to f05')
    require(protected['protected_face_count'] == source_topology['face_count'], 'protected face count does not match f05 topology report')
    require(source_topology['boundary_edge_count'] > 0, 'source f05 pathology should prove an open shell before repair')
    require(source_topology['overfull_nonmanifold_edge_count'] == 0, 'source f05 unexpectedly has overfull edges; failure class changed')

    require(preservation['max_protected_corner_displacement'] == 0.0, 'protected visible face corners moved')
    require(preservation['mismatched_protected_corner_count'] == 0, 'protected face corner correspondence failed')
    require(preservation['protected_faces_deleted'] == 0, 'protected faces were deleted')
    require(preservation['protected_visible_faces_added_over_original_surface'] == 0, 'visible faces were added over original surface')
    require(len(corner_map['entries']) == source_topology['face_count'], 'corner map does not cover every source face')

    require(packaged_topology['boundary_edge_count'] == 0, 'packaged mesh still has boundary edges')
    require(packaged_topology['overfull_nonmanifold_edge_count'] == 0, 'packaged mesh has overfull nonmanifold edges')
    require(packaged_topology['degenerate_face_count'] == 0, 'packaged mesh has degenerate faces')
    require(manifest['diagnostic_status']['protected_surface_unchanged'] is True, 'manifest did not mark protected surface unchanged')
    require(manifest['diagnostic_status']['boundary_edges_closed'] is True, 'manifest did not mark boundary closure')
    require(manifest['diagnostic_status']['local_visual_acceptance'] is False, 'manifest must not claim local visual acceptance')

    require(depth['silhouette_iou'] == 1.0, 'fixed-camera silhouette changed')
    require(depth['mean_abs_depth_error'] == 0.0, 'fixed-camera depth changed')
    require(depth['only_original_pixels'] == 0, 'packaged mesh lost fixed-camera pixels')
    require(depth['only_packaged_pixels'] == 0, 'packaged mesh added fixed-camera pixels')

    print(json.dumps({
        'ok': True,
        'source_boundary_edges': source_topology['boundary_edge_count'],
        'packaged_boundary_edges': packaged_topology['boundary_edge_count'],
        'packaged_overfull_edges': packaged_topology['overfull_nonmanifold_edge_count'],
        'protected_corner_displacement': preservation['max_protected_corner_displacement'],
        'fixed_camera_silhouette_iou': depth['silhouette_iou'],
        'closure_strategy': manifest['closure_strategy'],
    }, indent=2))


if __name__ == '__main__':
    main()

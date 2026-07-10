# real_sherman_upper_glacis_shared_interfaces_scratch_v08 Review

Status: RED scratch diagnostic, not a candidate.

## Why this pass exists
PR review found that v07 was individually manifold but assembly-incoherent: it preserved some silhouette/depth evidence by exporting separate feature prisms, but the object read as stacked closed boxes with gaps, steps, and a ring on top. v08 tests whether canonical shared interfaces plus one continuous visible skin can preserve manifold behavior while removing the box-stack failure.

## What changed
- Added `export_upper_glacis_shared_interfaces_v08.py`.
- Kept v07 measurement, clustering, silhouette-edge, socket/ring, depth, and topology infrastructure.
- Added canonical shared-interface reporting for the v07 feature relationships.
- Replaced the seven exported feature prisms with one closed `primary_visible_skin` plus socket/ring support geometry.
- Added `shared_interface_report.json`, `assembly_interface_report.json`, `assembled_screenshot_angle.png`, and `exploded_interface_diagnostic.png`.

## Results
- Candidate: `False`
- Shape status: `red_shared_interface_or_depth`
- Topology status: `pass`
- Shared-interface status: `pass`
- Assembly-interface status: `red`
- Assembly failure reasons: `['iou_below_v07_tolerance', 'p95_above_v07_tolerance']`
- Boundary/nonmanifold: `{'topology_status': 'pass', 'topology_pass': True, 'boundary_edges_total': 0, 'nonmanifold_edges_total': 0, 'failure_reasons': []}`
- Mesh statistics: `{'vertices': 456, 'polygons': 376, 'triangles': 904}`

## v07 comparison
- silhouette_iou: v08 `0.631207` vs v07 `0.699543`; delta `-0.068335`
- mean_abs_depth_error: v08 `0.076812` vs v07 `0.049229`; delta `+0.027582`
- p95_abs_depth_error: v08 `0.213708` vs v07 `0.165174`; delta `+0.048533`

## Area and visual read
- Region area report: `{'status': 'red_ring_socket_visual_dominance', 'total_projected_area': 0.33455239705050144, 'non_ring_projected_area': 0.22023770089253325, 'ring_socket_projected_area': 0.1143146961579682, 'ring_socket_fraction': 0.34169444656740017, 'regions': {'primary_visible_skin': 0.22023770089253325, 'socket': 0.08563317189045838, 'ring': 0.02868152426750982}}`
- Local diagnostic read: v08 removes the obvious seven-prism stack, but overcorrects into a broad smooth slab/ring silhouette. It no longer reads as manufactured Sherman upper-hull armor. It loses too much source mass and shoulder/deck structure.
- Cloud/Sense visual acceptance was not claimed. These local renders are diagnostic only.

## Lesson learned
The PR review hypothesis was only partially supported. Canonical interface bookkeeping is useful and can be made green, but a single continuous envelope is not a valid replacement for manufactured part authoring. It destroys the plate language that v07 at least measured.

The next useful experiment is not another envelope, not another cluster hull, and not a parameter tweak. The next geometry path needs a true multi-region shared-vertex visible skin: large authored armor regions with exact shared edge coordinates, no duplicate internal walls, and a socket opening authored into the deck topology. Shared interfaces must drive the actual mesh topology, not just reports beside a one-piece slab.

## Artifacts
- Exporter: `archive/scratch/20260708-real-sherman-chassis-scratch/exporters/export_upper_glacis_shared_interfaces_v08.py`
- Manifest: `archive/scratch/20260708-real-sherman-chassis-scratch/models/real_sherman_upper_glacis_shared_interfaces_scratch_v08/model_manifest.json`
- Shared interfaces: `archive/scratch/20260708-real-sherman-chassis-scratch/models/real_sherman_upper_glacis_shared_interfaces_scratch_v08/shared_interface_report.json`
- Assembly report: `archive/scratch/20260708-real-sherman-chassis-scratch/models/real_sherman_upper_glacis_shared_interfaces_scratch_v08/assembly_interface_report.json`
- Depth panel: `archive/scratch/20260708-real-sherman-chassis-scratch/renders/real_sherman_upper_glacis_shared_interfaces_scratch_v08/depth_side_by_side.png`
- Assembled diagnostic render: `archive/scratch/20260708-real-sherman-chassis-scratch/renders/real_sherman_upper_glacis_shared_interfaces_scratch_v08/assembled_screenshot_angle.png`
- Exploded interface diagnostic: `archive/scratch/20260708-real-sherman-chassis-scratch/renders/real_sherman_upper_glacis_shared_interfaces_scratch_v08/exploded_interface_diagnostic.png`

# Upper Glacis Silhouette Recovery v04-v06 Review

Scratch review note. None of these are promoted candidates. The useful result is the process correction: source topology remains measurement-only, and primary armor regions must not be allowed to choose independent noisy planes.

## v04 - adjacency/normal clusters, debris-expanded hulls

Asset: `real_sherman_upper_glacis_measurement_clusters_scratch_v04`

- Topology: pass, zero boundary edges, zero nonmanifold edges.
- Stats: 572 verts, 446 polys, 1112 tris.
- Shape: red. IoU 0.636108, mean depth error 0.272017, p95 depth error 0.542800.
- Lesson: face adjacency/normal clustering was useful, but debris-merged hulls and reused clusters manufactured stacked shelf slabs. `left_return` and `right_return` reused the main-glacis cluster, which is a process defect.
- Depth panel: `archive/scratch/20260708-real-sherman-chassis-scratch/renders/real_sherman_upper_glacis_measurement_clusters_scratch_v04/depth_side_by_side.png`

## v05 - unique cluster ownership and side-normal returns

Asset: `real_sherman_upper_glacis_cluster_owned_silhouette_scratch_v05`

- Topology: pass, zero boundary edges, zero nonmanifold edges.
- Stats: 544 verts, 432 polys, 1056 tris.
- Shape: red. IoU 0.624874, mean depth error 0.279745, p95 depth error 0.537403.
- Lesson: unique cluster ownership fixed the fake side-return slabs, but independent primary armor planes still produced a tiered shelf model. This proves cluster assignment alone is not enough.
- Depth panel: `archive/scratch/20260708-real-sherman-chassis-scratch/renders/real_sherman_upper_glacis_cluster_owned_silhouette_scratch_v05/depth_side_by_side.png`

## v06 - unique clusters plus primary-plane lock

Asset: `real_sherman_upper_glacis_plane_locked_silhouette_scratch_v06`

- Topology: pass, zero boundary edges, zero nonmanifold edges.
- Stats: 544 verts, 432 polys, 1056 tris.
- Shape: red but materially improved. IoU 0.647870, mean depth error 0.205211, p95 depth error 0.376282.
- Lesson: primary armor regions should use cluster-discovered boundaries but author onto one manufactured glacis plane unless a true hard seam is measured. This collapses the shelf failure while preserving independent closed solids.
- Remaining miss: p95 depth is still above the v03 target of 0.364, and the right-side block/deck mismatch remains visible. The next useful step is silhouette clipping/edge-line fitting against measured outline breaks, not another plane-fitting variant.
- Depth panel: `archive/scratch/20260708-real-sherman-chassis-scratch/renders/real_sherman_upper_glacis_plane_locked_silhouette_scratch_v06/depth_side_by_side.png`
- Viewer: `http://127.0.0.1:8804/model-viewer-lab/dist/model-viewer.html?src=%2Ftanks-for-the-memories%2Farchive%2Fscratch%2F20260708-real-sherman-chassis-scratch%2Fmodels%2Freal_sherman_upper_glacis_plane_locked_silhouette_scratch_v06%2Freal_sherman_upper_glacis_plane_locked_silhouette_scratch_v06.glb&manifest=%2Ftanks-for-the-memories%2Farchive%2Fscratch%2F20260708-real-sherman-chassis-scratch%2Fmodels%2Freal_sherman_upper_glacis_plane_locked_silhouette_scratch_v06%2Fmodel_manifest.json&title=real_sherman_upper_glacis_plane_locked_silhouette_scratch_v06`

## Carry-Forward Rules

- Never accept topology pass as shape pass.
- Never allow two named regions to own the same measured cluster unless the manifest explicitly marks it as a shared seam and no geometry is duplicated from it.
- Side returns require side-normal evidence; UV edge contact is insufficient.
- Primary armor regions may use separate cluster boundaries, but their planes should be locked to a measured manufactured reference plane until an actual seam line justifies a plane break.
- Boundary hulls should use centroid/feature evidence, not all debris vertices.
- The next improvement should fit/clamp silhouette edge lines before extrusion, while keeping every output region closed.

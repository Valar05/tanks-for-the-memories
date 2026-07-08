#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
TEXTURE_SET_ID = 'sherman_hybrid_meshy_hull_material_v1_baked_reference_masks_20260707'
BUILD = 'tftm-hybrid-meshy-hull-authored-treads-v1-34-tread-pbr-v3-20260707'
STYLE = 'meshy-hybrid-hull-material-v1-baked-reference-masks'
failures: list[str] = []

def fail(message: str) -> None:
    failures.append(message)

def stats(path: Path) -> dict:
    if not path.exists():
        fail(f'missing {path}')
        return {'width': 0, 'height': 0, 'mean': 0.0, 'stddev': 0.0, 'min': 0, 'max': 0}
    im = Image.open(path)
    gray = im.convert('L')
    st = ImageStat.Stat(gray)
    lo, hi = gray.getextrema()
    return {'width': im.width, 'height': im.height, 'mean': st.mean[0], 'stddev': st.stddev[0], 'min': lo, 'max': hi}

texture_dir = ROOT / 'public/tftm/textures/sherman_hybrid_meshy_hull_material_v1'
manifest_path = texture_dir / 'manifest.json'
hull_manifest_path = ROOT / 'public/tftm/models/sherman_hybrid_meshy_hull_lowpoly_v1/model_manifest.json'
for path in [manifest_path, hull_manifest_path, ROOT / 'scripts/generate_hybrid_hull_material_maps.py']:
    if not path.exists():
        fail(f'missing {path}')
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
hull_manifest = json.loads(hull_manifest_path.read_text()) if hull_manifest_path.exists() else {}
if manifest.get('texture_set_id') != TEXTURE_SET_ID:
    fail('hull material texture_set_id mismatch')
if hull_manifest.get('runtime_build') != BUILD:
    fail('hull manifest runtime_build mismatch')
if hull_manifest.get('runtime_material_style', {}).get('style_id') != STYLE:
    fail('hull manifest style id mismatch')
if 'Meshy hull only' not in str(manifest.get('scope', '')):
    fail('manifest must scope material to Meshy hull only')
if 'reference' not in str(manifest.get('source_policy', '')):
    fail('manifest must document embedded Meshy texture reference policy')
if 'debug_modes' not in str(manifest.get('material_policy', {})):
    fail('manifest must document materialDebug modes')

files = {
    'albedo': 'hull_albedo.png',
    'normal': 'hull_normal.png',
    'roughness': 'hull_roughness.png',
    'metalness': 'hull_metalness.png',
    'edge': 'hull_edge_mask.png',
    'grime': 'hull_grime_mask.png',
    'dust': 'hull_dust_mask.png',
    'wear': 'hull_wear_mask.png',
    'reference': 'hull_reference_mask.png',
    'source_base': 'source_meshy_base_color.jpg',
    'source_normal': 'source_meshy_normal.jpg',
    'source_mr': 'source_meshy_metallic_roughness.jpg',
    'source_emissive': 'source_meshy_emissive.jpg',
}
image_stats = {name: stats(texture_dir / file) for name, file in files.items()}
for name, st in image_stats.items():
    if st['width'] != 1024 or st['height'] != 1024:
        fail(f'{name} must be 1024x1024, saw {st["width"]}x{st["height"]}')
if image_stats['albedo']['mean'] < 45 or image_stats['albedo']['stddev'] < 12:
    fail('hull albedo is too dark or too flat for visible red-build repair')
if image_stats['normal']['stddev'] < 18:
    fail('hull normal lacks visible variation')
if image_stats['roughness']['mean'] < 165 or image_stats['roughness']['stddev'] < 10:
    fail('hull roughness must stay matte and varied')
if image_stats['metalness']['mean'] > 24 or image_stats['metalness']['max'] > 80:
    fail('hull metalness must remain low and edge-only')
for name in ['edge', 'grime', 'dust', 'wear', 'reference']:
    if image_stats[name]['stddev'] < 18:
        fail(f'{name} debug mask is too flat to diagnose material')

links = (ROOT / 'src/sherman-asset-links.ts').read_text()
for marker in [
    'SHERMAN_HYBRID_HULL_MATERIAL_TEXTURE_SET_ID',
    'SHERMAN_HYBRID_HULL_MATERIAL_ALBEDO_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_NORMAL_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_ROUGHNESS_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_METALNESS_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_EDGE_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_GRIME_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_DUST_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_WEAR_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_REFERENCE_URL',
    'v1-meshy-lowpoly-hull-material-v1-20260707',
]:
    if marker not in links:
        fail(f'asset links missing {marker}')
materials = (ROOT / 'src/authored-sherman-shared-materials.ts').read_text()
for marker in [
    STYLE,
    'applyHybridHullBakedMaterial',
    'currentHullMaterialDebugMode',
    'SHERMAN_HYBRID_HULL_MATERIAL_ALBEDO_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_NORMAL_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_ROUGHNESS_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_METALNESS_URL',
    'SHERMAN_HYBRID_HULL_MATERIAL_EDGE_URL',
    'generated hull normal/roughness/metalness maps are bound directly to the Meshy hull UVs',
    "role === 'hullArmor'",
]:
    if marker not in materials:
        fail(f'shared material source missing {marker}')
hybrid = (ROOT / 'src/hybrid-hull-treads.ts').read_text()
for marker in [
    BUILD,
    'materialDebugParam',
    'hullMaterialDebugMode',
    '__TFTM_MESHY_HULL_MATERIAL_DEBUG__',
    STYLE,
    TEXTURE_SET_ID,
    'embedded-meshy-reference-generated-hull-uv-material-v1',
]:
    if marker not in hybrid:
        fail(f'hybrid route missing {marker}')
pkg = json.loads((ROOT / 'package.json').read_text())
if pkg.get('scripts', {}).get('hybrid-hull-material-smoke') != 'python3 scripts/validate_hybrid_hull_material_maps.py':
    fail('package missing hybrid-hull-material-smoke script')
if failures:
    print('Hybrid hull material validation failed:', file=sys.stderr)
    for failure in failures:
        print('- ' + failure, file=sys.stderr)
    sys.exit(1)
print('Hybrid hull material validation passed: Meshy hull embedded textures are extracted, generated UV-bound maps are varied, debug modes are wired, and geometry/treads remain out of scope.')

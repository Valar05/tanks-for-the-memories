#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SMART = ROOT / 'public/tftm/textures/authored_sherman_smart_material_v1'
ARMOR_OUT = ROOT / 'public/tftm/textures/authored_sherman_runtime_armor_pbr_v1'
WHEEL_OUT = ROOT / 'public/tftm/textures/authored_sherman_runtime_wheel_v1'
TREAD_OUT = ROOT / 'public/tftm/textures/authored_sherman_runtime_tread_shoe_v1'
SIZE = (1024, 1024)

def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert('RGB').resize(SIZE, Image.Resampling.LANCZOS)

def load_l(path: Path) -> Image.Image:
    return Image.open(path).convert('L').resize(SIZE, Image.Resampling.LANCZOS)

def autocontrast_l(image: Image.Image, cutoff: float = 1.0) -> Image.Image:
    return ImageOps.autocontrast(image.convert('L'), cutoff=cutoff)

def blend_l(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    return Image.blend(a.convert('L'), b.convert('L'), t)

def screen_l(a: Image.Image, b: Image.Image) -> Image.Image:
    return ImageChops.screen(a.convert('L'), b.convert('L'))

def multiply_l(a: Image.Image, b: Image.Image) -> Image.Image:
    return ImageChops.multiply(a.convert('L'), b.convert('L'))

def normal_from_height(height: Image.Image, strength: float) -> Image.Image:
    h = height.convert('L').filter(ImageFilter.GaussianBlur(radius=0.65))
    px = h.load()
    w, hgt = h.size
    out = Image.new('RGB', (w, hgt))
    opx = out.load()
    for y in range(hgt):
        ym = max(0, y - 1)
        yp = min(hgt - 1, y + 1)
        for x in range(w):
            xm = max(0, x - 1)
            xp = min(w - 1, x + 1)
            dx = (px[xp, y] - px[xm, y]) / 255.0 * strength
            dy = (px[x, yp] - px[x, ym]) / 255.0 * strength
            nx = -dx
            ny = -dy
            nz = 1.0
            length = (nx * nx + ny * ny + nz * nz) ** 0.5
            nx /= length
            ny /= length
            nz /= length
            opx[x, y] = (int((nx * 0.5 + 0.5) * 255), int((ny * 0.5 + 0.5) * 255), int((nz * 0.5 + 0.5) * 255))
    return out

def clamp_l(image: Image.Image, lo: int, hi: int) -> Image.Image:
    lut = []
    span = max(1, hi - lo)
    for i in range(256):
        v = lo + (i / 255.0) * span
        lut.append(max(0, min(255, int(round(v)))))
    return image.convert('L').point(lut)

def stats(path: Path) -> dict:
    im = Image.open(path)
    gray = im.convert('L')
    st = ImageStat.Stat(gray)
    return {
        'width': im.width,
        'height': im.height,
        'mode': im.mode,
        'mean_luma': round(st.mean[0], 3),
        'stddev_luma': round(st.stddev[0], 3),
        'min_luma': int(gray.getextrema()[0]),
        'max_luma': int(gray.getextrema()[1]),
    }

def save_rgb(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert('RGB').save(path)

tread_albedo = load_l(TREAD_OUT / 'tread_shoe_albedo.png')
tread_source = autocontrast_l(tread_albedo, 0.4)
tread_high = autocontrast_l(ImageChops.difference(tread_source, tread_source.filter(ImageFilter.GaussianBlur(radius=5.0))), 0.5)
tread_edges = autocontrast_l(tread_source.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(radius=0.65)), 0.8)
tread_dark = ImageOps.invert(tread_source).filter(ImageFilter.GaussianBlur(radius=2.0))
tread_height = screen_l(clamp_l(tread_high, 72, 194), clamp_l(tread_edges, 44, 172))
tread_normal = normal_from_height(tread_height, 7.4)
tread_roughness = Image.new('L', SIZE, 236)
tread_roughness = ImageChops.subtract(tread_roughness, clamp_l(tread_edges, 0, 46))
tread_roughness = ImageChops.subtract(tread_roughness, clamp_l(tread_high, 0, 18))
tread_roughness = ImageChops.add(tread_roughness, clamp_l(tread_dark, 0, 14))
tread_roughness = ImageOps.autocontrast(tread_roughness, cutoff=0.1).point(lambda v: max(178, min(255, int(v * 0.42 + 142))))
tread_metalness = clamp_l(tread_edges.filter(ImageFilter.GaussianBlur(radius=0.9)), 0, 52)

save_rgb(tread_normal, TREAD_OUT / 'tread_shoe_normal.png')
save_rgb(tread_roughness, TREAD_OUT / 'tread_shoe_roughness.png')
save_rgb(tread_metalness, TREAD_OUT / 'tread_shoe_metalness.png')

tread_manifest_path = TREAD_OUT / 'manifest.json'
tread_manifest = json.loads(tread_manifest_path.read_text())
tread_manifest['revision'] = 'v3-matte-detail-roughness-20260707'
tread_manifest['texture_set_id'] = 'authored_sherman_runtime_tread_shoe_v3_matte_detail_roughness_20260707'
tread_manifest['source_class'] = 'user-provided downloaded albedo with deterministic regenerated runtime data maps'
tread_manifest['roughness_policy'] = 'high matte painted-steel roughness map; mostly white data map with localized lower roughness only on worn shoe edges so Three.js roughnessMap no longer multiplies the scalar into a glossy surface'
tread_manifest['normal_policy'] = 'deterministic regenerated normal map from albedo high-frequency shoe plates and edge wear, stronger than the downloaded source normal so highlights break up across each tread shoe'
tread_manifest['metalness_policy'] = 'painted-metal metalness map: mostly black painted faces remain dull; narrow exposed edge wear only, still capped by runtime metalness 0.16 so treads do not become shinier than the tank average'
tread_manifest['generator'] = 'scripts/generate_sherman_runtime_pbr_materials.py'
tread_manifest['files']['tread_shoe_normal.png']['processing'] = 'regenerated from tread albedo high-frequency plate/edge height; RGB tangent-style normal data map'
tread_manifest['files']['tread_shoe_roughness.png']['processing'] = 'regenerated as high-value matte roughness data map; prevents glossy white reflection planes under final lighting'
tread_manifest['files']['tread_shoe_metalness.png']['processing'] = 'regenerated as mostly black edge-only painted-metal data map; runtime scalar caps exposed metal at 0.16'
tread_manifest['stats'] = {name: stats(TREAD_OUT / file) for name, file in {'albedo': 'tread_shoe_albedo.png', 'normal': 'tread_shoe_normal.png', 'roughness': 'tread_shoe_roughness.png', 'metalness': 'tread_shoe_metalness.png'}.items()}
tread_manifest_path.write_text(json.dumps(tread_manifest, indent=2) + '\n')

armor = load_l(SMART / 'armor_base.png')
edge = autocontrast_l(load_l(SMART / 'edge_wear.png'), 0.5)
grime = autocontrast_l(load_l(SMART / 'cavity_grime.png'), 0.5)
dust = autocontrast_l(load_l(SMART / 'dust_mud.png'), 0.5)
wheel = load_l(WHEEL_OUT / 'wheel_contact_albedo.png')
wheel_source = autocontrast_l(load_l(SMART / 'wheel_wear.png'), 0.5)

# Armor height emphasizes chipped paint/edge flecks and keeps broad armor grain subtle.
armor_grain = autocontrast_l(ImageChops.difference(armor, armor.filter(ImageFilter.GaussianBlur(radius=6))), 0.5)
armor_height = screen_l(clamp_l(edge, 64, 180), clamp_l(armor_grain, 72, 158))
armor_normal = normal_from_height(armor_height, 3.6)
armor_roughness = blend_l(Image.new('L', SIZE, 224), clamp_l(dust, 214, 255), 0.32)
armor_roughness = blend_l(armor_roughness, clamp_l(grime, 228, 255), 0.26)
# Exposed edge wear is slightly less rough, but paint remains matte.
edge_soft = edge.filter(ImageFilter.GaussianBlur(radius=1.2))
armor_roughness = ImageChops.subtract(armor_roughness, clamp_l(edge_soft, 0, 38))
armor_metalness = clamp_l(edge_soft, 0, 42)

save_rgb(armor_normal, ARMOR_OUT / 'armor_overlay_normal.png')
save_rgb(armor_roughness, ARMOR_OUT / 'armor_overlay_roughness.png')
save_rgb(armor_metalness, ARMOR_OUT / 'armor_overlay_metalness.png')

# Wheel PBR: rim/hub contrast from existing LUT plus source wheel plate. Keep rubber dark but readable.
wheel_grain = autocontrast_l(ImageChops.difference(wheel, wheel.filter(ImageFilter.GaussianBlur(radius=5))), 0.5)
wheel_height = screen_l(clamp_l(wheel_grain, 72, 175), clamp_l(wheel_source, 40, 150))
wheel_normal = normal_from_height(wheel_height, 4.8)
wheel_roughness = blend_l(Image.new('L', SIZE, 222), clamp_l(wheel_source, 188, 255), 0.54)
wheel_roughness = ImageChops.subtract(wheel_roughness, clamp_l(wheel_grain, 0, 44))
wheel_roughness = ImageChops.add(wheel_roughness, clamp_l(grime, 0, 18))
wheel_metalness = clamp_l(wheel_grain.filter(ImageFilter.GaussianBlur(radius=1.0)), 0, 30)

save_rgb(wheel_normal, WHEEL_OUT / 'wheel_contact_normal.png')
save_rgb(wheel_roughness, WHEEL_OUT / 'wheel_contact_roughness.png')
save_rgb(wheel_metalness, WHEEL_OUT / 'wheel_contact_metalness.png')

manifest = {
    'asset_id': 'authored_sherman_runtime_armor_pbr_v1',
    'texture_set_id': 'authored_sherman_runtime_armor_pbr_v1_edge_grime_matte_metal_20260707',
    'created_at': datetime.now(timezone.utc).isoformat(),
    'generator': 'scripts/generate_sherman_runtime_pbr_materials.py',
    'source_policy': 'deterministic derived PBR support maps from authored_sherman_smart_material_v1 source plates; no Meshy retexture and no external generation; supports runtime smart overlay with edge wear, grime, matte painted metal, and low edge-only metalness',
    'color_space_policy': 'normal, roughness, and metalness are linear/no color space',
    'files': {
        'normal': 'armor_overlay_normal.png',
        'roughness': 'armor_overlay_roughness.png',
        'metalness': 'armor_overlay_metalness.png',
    },
    'source_inputs': {
        'armor_base': '../authored_sherman_smart_material_v1/armor_base.png',
        'edge_wear': '../authored_sherman_smart_material_v1/edge_wear.png',
        'cavity_grime': '../authored_sherman_smart_material_v1/cavity_grime.png',
        'dust_mud': '../authored_sherman_smart_material_v1/dust_mud.png',
    },
    'material_policy': {
        'normal': 'derived from low-frequency armor grain plus broken edge wear height; used as supplemental overlay detail without replacing imported Meshy normal maps',
        'roughness': 'high matte paint and dust response; edge chips slightly lower roughness but remain non-chrome',
        'metalness': 'mostly black; narrow exposed edge flecks only; runtime shader caps visible metal exposure for painted armor',
    },
    'stats': {name: stats(ARMOR_OUT / file) for name, file in {'normal': 'armor_overlay_normal.png', 'roughness': 'armor_overlay_roughness.png', 'metalness': 'armor_overlay_metalness.png'}.items()},
}
(ARMOR_OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

wheel_manifest_path = WHEEL_OUT / 'manifest.json'
wheel_manifest = json.loads(wheel_manifest_path.read_text())
wheel_manifest['texture_set_id'] = 'authored_sherman_runtime_wheel_v2_pbr_edge_grime_contact_20260707'
wheel_manifest['source_policy'] = 'offline LUT/color-corrected runtime wheel texture plus deterministic normal/roughness/metalness maps; not a shader-only tweak and not a tread-shoe repaint'
wheel_manifest['files'] = {
    'albedo': 'wheel_contact_albedo.png',
    'normal': 'wheel_contact_normal.png',
    'roughness': 'wheel_contact_roughness.png',
    'metalness': 'wheel_contact_metalness.png',
}
wheel_manifest['color_space_policy'] = 'albedo sRGB; normal, roughness, and metalness linear/no color space'
wheel_manifest['normal_policy'] = 'derived from wheel LUT and wheel_wear source plate to reveal rim lip, hub, and rubber pitting under glancing light'
wheel_manifest['roughness_policy'] = 'high roughness for dusty painted metal and rubber; localized lowered roughness only for rubbed rim/hub highlights'
wheel_manifest['metalness_policy'] = 'mostly black low painted-metal response; rubber remains near zero; no broad grey metalness'
wheel_manifest['stats'] = {name: stats(WHEEL_OUT / file) for name, file in {'albedo': 'wheel_contact_albedo.png', 'normal': 'wheel_contact_normal.png', 'roughness': 'wheel_contact_roughness.png', 'metalness': 'wheel_contact_metalness.png'}.items()}
wheel_manifest_path.write_text(json.dumps(wheel_manifest, indent=2) + '\n')

for p in [TREAD_OUT / 'manifest.json', TREAD_OUT / 'tread_shoe_normal.png', TREAD_OUT / 'tread_shoe_roughness.png', TREAD_OUT / 'tread_shoe_metalness.png', ARMOR_OUT / 'manifest.json', ARMOR_OUT / 'armor_overlay_normal.png', ARMOR_OUT / 'armor_overlay_roughness.png', ARMOR_OUT / 'armor_overlay_metalness.png', WHEEL_OUT / 'manifest.json', WHEEL_OUT / 'wheel_contact_normal.png', WHEEL_OUT / 'wheel_contact_roughness.png', WHEEL_OUT / 'wheel_contact_metalness.png']:
    print(p.relative_to(ROOT), p.stat().st_size)

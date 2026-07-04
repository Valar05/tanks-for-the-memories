#!/usr/bin/env python3
"""Generate the first Alpha Sherman texture-language proof.

This is a deterministic Pillow proof, not final production art. It creates
flat surface plates and a contact sheet that prove Alpha's identity language
before real UV-specific textures are authored.
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "tftm" / "tanks" / "alpha"
SEED = 19440609
RNG = random.Random(SEED)

SIZE = (1024, 1024)
THUMB = (420, 420)

OLIVE = (77, 85, 55)
OLIVE_DARK = (50, 57, 40)
OLIVE_LIGHT = (94, 101, 66)
REPLACEMENT_OLIVE = (91, 96, 70)
CRIMSON = (93, 22, 26)
CRIMSON_FADED = (112, 42, 42)
WHITE = (226, 222, 205)
CHALK = (214, 211, 190)
GREASE = (32, 34, 28)
MUD = (77, 58, 39)
OIL = (19, 18, 15)
FUEL = (83, 78, 55)
RUST = (110, 62, 39)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf" if bold else "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/system/fonts/Roboto-Bold.ttf" if bold else "/system/fonts/Roboto-Regular.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def base_plate(panel_tint: tuple[int, int, int] = OLIVE) -> Image.Image:
    image = Image.new("RGB", SIZE, panel_tint)
    draw = ImageDraw.Draw(image, "RGBA")
    for _ in range(2600):
        x = RNG.randrange(SIZE[0])
        y = RNG.randrange(SIZE[1])
        delta = RNG.randrange(-16, 17)
        alpha = RNG.randrange(10, 24)
        color = tuple(max(0, min(255, c + delta)) for c in panel_tint) + (alpha,)
        draw.point((x, y), fill=color)
    for y in range(0, SIZE[1], 13):
        shade = int((y / SIZE[1]) * 18)
        draw.line((0, y, SIZE[0], y), fill=(0, 0, 0, 5 + shade // 3))
    return image


def hand_brushed_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    color: tuple[int, int, int],
    horizontal_fade: bool = False,
) -> None:
    x0, y0, x1, y1 = xy
    for y in range(y0, y1, 9):
        wobble_left = RNG.randrange(-7, 8)
        wobble_right = RNG.randrange(-7, 8)
        if horizontal_fade:
            fade = int((y - y0) / max(1, y1 - y0) * 24)
            stroke = tuple(max(0, min(255, c + fade)) for c in color)
        else:
            stroke = color
        draw.rectangle((x0 + wobble_left, y, x1 + wobble_right, min(y + 10, y1)), fill=stroke + (210,))
    for _ in range(100):
        x = RNG.randrange(x0, x1)
        y = RNG.randrange(y0, y1)
        draw.ellipse((x - 3, y - 1, x + 5, y + 2), fill=OLIVE + (75,))


def add_scratches(draw: ImageDraw.ImageDraw, count: int, area: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = area
    for _ in range(count):
        x = RNG.randrange(x0, x1)
        y = RNG.randrange(y0, y1)
        length = RNG.randrange(18, 90)
        angle = RNG.uniform(-0.35, 0.35)
        x2 = int(x + length)
        y2 = int(y + length * angle)
        draw.line((x, y, x2, y2), fill=(224, 216, 181, RNG.randrange(30, 80)), width=RNG.randrange(1, 3))
        if RNG.random() < 0.22:
            draw.line((x, y + 2, x2, y2 + 2), fill=(24, 24, 19, 48), width=1)


def add_boot_wear(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int) -> None:
    cx, cy = center
    for _ in range(140):
        x = int(RNG.gauss(cx, radius * 0.42))
        y = int(RNG.gauss(cy, radius * 0.25))
        if 0 <= x < SIZE[0] and 0 <= y < SIZE[1]:
            w = RNG.randrange(18, 58)
            h = RNG.randrange(5, 16)
            draw.ellipse((x - w, y - h, x + w, y + h), fill=(190, 179, 137, RNG.randrange(18, 48)))
            if RNG.random() < 0.08:
                draw.arc((x - w, y - h, x + w, y + h), 190, 350, fill=(43, 40, 31, 60), width=2)


def add_stains(draw: ImageDraw.ImageDraw, kind: str, count: int, area: tuple[int, int, int, int]) -> None:
    color = OIL if kind == "oil" else FUEL if kind == "fuel" else MUD
    x0, y0, x1, y1 = area
    for _ in range(count):
        x = RNG.randrange(x0, x1)
        y = RNG.randrange(y0, y1)
        r = RNG.randrange(12, 54)
        alpha = RNG.randrange(38, 110)
        draw.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=color + (alpha,))
        if kind == "mud":
            for _ in range(5):
                sx = x + RNG.randrange(-r, r)
                sy = y + RNG.randrange(-r, r)
                draw.ellipse((sx - 4, sy - 3, sx + 5, sy + 4), fill=(92, 72, 47, 92))


def label(image: Image.Image, title: str, subtitle: str) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rectangle((0, 0, SIZE[0], 108), fill=(10, 13, 12, 190))
    draw.text((34, 20), title, fill=WHITE, font=font(38, True))
    draw.text((36, 66), subtitle, fill=(184, 184, 164), font=font(21))


def glacis_plate() -> Image.Image:
    image = base_plate()
    draw = ImageDraw.Draw(image, "RGBA")
    draw.polygon([(0, 170), (1024, 130), (1024, 860), (0, 930)], fill=(0, 0, 0, 22))
    draw.rectangle((710, 195, 960, 700), fill=REPLACEMENT_OLIVE + (170,))
    draw.text((722, 628), "old panel", fill=(38, 44, 29, 88), font=font(24))
    draw.text((388, 470), "23", fill=(238, 232, 190, 46), font=font(210, True))
    hand_brushed_rect(draw, (438, 130, 590, 920), CRIMSON)
    draw.text((372, 330), "A", fill=WHITE + (228,), font=font(380, True))
    add_scratches(draw, 115, (80, 190, 940, 910))
    add_stains(draw, "fuel", 16, (115, 610, 940, 880))
    label(image, "Alpha glacis plate", "restrained crimson field stripe, white A, ghosted old tactical number")
    return image


def turret_plate() -> Image.Image:
    image = base_plate(OLIVE_LIGHT)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.ellipse((138, 218, 890, 808), fill=(50, 56, 37, 72))
    draw.ellipse((180, 238, 850, 780), fill=OLIVE + (235,))
    hand_brushed_rect(draw, (444, 182, 574, 815), CRIMSON_FADED, horizontal_fade=True)
    draw.polygon([(700, 450), (785, 512), (700, 574), (615, 512)], outline=WHITE + (210,), fill=(255, 255, 255, 0), width=11)
    draw.text((250, 392), "A", fill=WHITE + (220,), font=font(230, True))
    add_boot_wear(draw, (470, 350), 220)
    add_scratches(draw, 75, (140, 230, 880, 795))
    label(image, "Alpha turret plate", "matching stripe, simple geometric squad symbol, faded horizontal paint")
    return image


def rear_hull_plate() -> Image.Image:
    image = base_plate(OLIVE_DARK)
    draw = ImageDraw.Draw(image, "RGBA")
    for x in (180, 430, 680):
        draw.rectangle((x, 210, x + 170, 610), outline=(20, 23, 18, 170), width=8)
        draw.line((x + 24, 238, x + 146, 238), fill=(120, 126, 89, 120), width=4)
    hand_brushed_rect(draw, (150, 720, 880, 805), CRIMSON)
    add_stains(draw, "oil", 42, (140, 270, 890, 760))
    add_scratches(draw, 55, (100, 190, 920, 850))
    label(image, "Alpha rear hull plate", "small rear recognition accent, engine grime, maintained not neglected")
    return image


def hatch_wear_plate() -> Image.Image:
    image = base_plate(REPLACEMENT_OLIVE)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.ellipse((230, 190, 805, 765), fill=(39, 44, 33, 210))
    draw.ellipse((285, 245, 750, 710), fill=OLIVE + (238,))
    draw.arc((300, 260, 735, 695), 20, 330, fill=(25, 27, 22, 185), width=10)
    add_boot_wear(draw, (518, 472), 285)
    add_scratches(draw, 90, (210, 170, 815, 820))
    for _ in range(9):
        x = RNG.randrange(240, 790)
        y = RNG.randrange(220, 780)
        draw.ellipse((x - 5, y - 5, x + 6, y + 6), fill=RUST + (44,))
    label(image, "Alpha hatch wear", "boot traffic, touched-up olive, minimal rust")
    return image


def lower_hull_mud_plate() -> Image.Image:
    image = base_plate(OLIVE_DARK)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rectangle((0, 650, SIZE[0], SIZE[1]), fill=(39, 33, 24, 180))
    add_stains(draw, "mud", 95, (0, 610, SIZE[0], SIZE[1]))
    for y in range(690, 980, 55):
        draw.line((0, y, SIZE[0], y + RNG.randrange(-18, 19)), fill=(17, 18, 16, 130), width=10)
    for x in range(80, 980, 150):
        draw.ellipse((x - 55, 650, x + 55, 760), outline=(21, 24, 21, 190), width=13)
        draw.ellipse((x - 34, 670, x + 34, 738), fill=(86, 80, 62, 118))
    label(image, "Alpha lower hull mud", "mud stays low; the upper machine remains cared for")
    return image


def history_marks_plate() -> Image.Image:
    image = base_plate()
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rectangle((95, 185, 910, 820), outline=(37, 42, 30, 170), width=7)
    draw.text((142, 255), "INSPECT 6/9", fill=CHALK + (205,), font=font(58, True))
    draw.text((142, 355), "CHECK OIL", fill=CHALK + (165,), font=font(46, True))
    draw.line((152, 470, 810, 430), fill=GREASE + (170,), width=8)
    draw.text((190, 500), "RTE RED - HEDGE GAP", fill=GREASE + (190,), font=font(43, True))
    draw.text((170, 645), "DRIVER: BRAKE TEST", fill=CHALK + (155,), font=font(37, True))
    draw.text((620, 690), "A", fill=WHITE + (90,), font=font(122, True))
    add_scratches(draw, 35, (100, 180, 915, 830))
    label(image, "Alpha history marks", "chalk, inspection dates, grease pencil, overpainted memories")
    return image


PLATES: list[tuple[str, str, Callable[[], Image.Image]]] = [
    ("alpha_glacis_plate.png", "glacis", glacis_plate),
    ("alpha_turret_plate.png", "turret", turret_plate),
    ("alpha_rear_hull_plate.png", "rear_hull", rear_hull_plate),
    ("alpha_hatch_wear_plate.png", "hatches", hatch_wear_plate),
    ("alpha_lower_hull_mud_plate.png", "lower_hull", lower_hull_mud_plate),
    ("alpha_history_marks_plate.png", "history_marks", history_marks_plate),
]


def contact_sheet(plates: list[tuple[str, Image.Image]]) -> Image.Image:
    sheet = Image.new("RGB", (1480, 1160), (16, 20, 19))
    draw = ImageDraw.Draw(sheet, "RGBA")
    draw.text((42, 28), "ALPHA SHERMAN TEXTURE LANGUAGE PROOF", fill=WHITE, font=font(54, True))
    draw.text((44, 92), "Geometry locked. Identity comes from paint, wear, markings, and maintenance history.", fill=(184, 184, 164), font=font(27))
    draw.rectangle((42, 142, 1438, 208), fill=(38, 14, 16, 230))
    draw.text((66, 158), "Recognition read: crimson stripe + white A + disciplined veteran wear", fill=WHITE, font=font(26, True))
    for idx, (name, image) in enumerate(plates):
        x = 42 + (idx % 3) * 470
        y = 250 + (idx // 3) * 440
        thumb = image.resize(THUMB, Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.rectangle((x, y, x + THUMB[0], y + THUMB[1]), outline=(221, 211, 180, 85), width=3)
        draw.text((x, y + THUMB[1] + 12), name.replace("alpha_", "").replace("_plate.png", "").replace("_", " "), fill=WHITE, font=font(24, True))
    return sheet


def write_manifest(files: list[str]) -> None:
    manifest = {
        "identity_id": "alpha",
        "display_name": "Alpha Sherman",
        "generated_by": "scripts/generate_alpha_texture_proof.py",
        "generator": "Pillow",
        "seed": SEED,
        "asset_class": "generated_texture_language_proof",
        "base_vehicle": {
            "variant": "m4a3_75_vvss",
            "chassis_fixed": True,
            "turret_fixed": True,
            "geometry_locked": True,
            "accessory_additions_allowed": False,
            "identity_from_texture_only": True,
        },
        "personality": ["calm", "professional", "veteran", "disciplined", "reliable", "restrained"],
        "recognition_colors": [{"name": "deep_crimson", "hex": "#5d161a", "role": "primary_only"}],
        "paint_layers": [
            "olive_drab_base",
            "broad_vertical_glacis_stripe",
            "matching_turret_stripe",
            "small_rear_hull_accent",
            "hand_painted_white_A",
            "simple_geometric_squad_symbol",
        ],
        "wear_layers": [
            "crew_traffic_hatch_boot_wear",
            "oil_stains_engine_access",
            "fuel_staining_near_caps",
            "maintenance_panel_scratches",
            "lower_hull_mud_only",
            "minimal_rust",
            "field_brushed_imperfect_edges",
            "months_of_touchups",
        ],
        "history_layers": [
            "replacement_panel_slightly_different_olive",
            "old_unit_markings_partially_painted_over",
            "previous_tactical_number_barely_visible",
            "chalk_maintenance_notes",
            "inspection_dates",
            "grease_pencil_route_marks",
            "driver_hatch_reminders",
        ],
        "surface_targets": [
            "glacis",
            "turret",
            "rear_hull",
            "hatches",
            "engine_deck",
            "fuel_caps",
            "maintenance_panels",
            "lower_hull",
        ],
        "forbidden_motifs": [
            "skulls",
            "flames",
            "pinup_art",
            "fantasy_emblems",
            "superhero_graphics",
            "science_fiction_references",
            "extra_armor_for_style",
            "accessories_solely_for_style",
        ],
        "files": files,
        "real_texture_needs": [
            "UV-aware glacis albedo/normal/roughness with crimson stripe and white A",
            "UV-aware turret stripe and squad symbol decal mask",
            "panel-level olive variation mask",
            "hatch boot-wear mask",
            "engine-deck oil and fuel stain masks",
            "lower-hull mud and track grime masks",
            "ghost-marking decal sheet for old tactical number and overpainted unit marks",
            "chalk and grease-pencil decal sheet",
        ],
        "runtime_policy": {
            "missing_texture_behavior": "use procedural proof or fallback material",
            "mesh_material_names_are_not_source_truth": True,
            "medium_distance_identity_requires_ui": False,
        },
    }
    (OUT_DIR / "texture_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def write_needs_report() -> None:
    report = """# Alpha Real Texture Needs

This Pillow pass proves the visual language only. The next art pass needs real UV-aware texture maps for the fixed Sherman model.

## Needed Texture Maps

- Glacis albedo/normal/roughness with restrained crimson stripe, brushed edge, white A, and ghost number.
- Turret albedo/normal/roughness with matching crimson stripe and simple geometric squad mark.
- Rear hull map with small rear accent plus engine access oil staining.
- Hatch wear mask with boot traffic, touched-up olive paint, and very light rust.
- Lower hull mud mask that never creeps into upper identity zones.
- Detail decal sheet for chalk notes, inspection dates, grease-pencil route marks, and driver reminders.
- Panel variation mask for replacement olive tone and old overpainted markings.

## Art Direction Check

Alpha should feel like a trusted veteran wearing a well-used field jacket. It is maintained, not pristine; worn, not neglected.
"""
    (OUT_DIR / "texture_needs_report.md").write_text(report, encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated: list[str] = []
    contact_inputs: list[tuple[str, Image.Image]] = []
    for filename, label_name, make_image in PLATES:
        image = make_image()
        image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=115, threshold=3))
        image.save(OUT_DIR / filename)
        generated.append(f"/tftm/tanks/alpha/{filename}")
        contact_inputs.append((label_name, image))

    sheet = contact_sheet(contact_inputs)
    sheet.save(OUT_DIR / "alpha_texture_contact_sheet.png")
    generated.insert(0, "/tftm/tanks/alpha/alpha_texture_contact_sheet.png")
    write_manifest(generated)
    write_needs_report()
    print(f"Wrote Alpha texture proof to {OUT_DIR}")


if __name__ == "__main__":
    main()

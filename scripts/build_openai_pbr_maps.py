#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/meshy/sherman_runtime_tread_pbr_v1/sherman_runtime_tread_pbr_v1_concept.png"
OUT = ROOT / "assets/generated/openai/sherman_runtime_pbr_v1"


def save_png(image: Image.Image, name: str) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    image.save(path)
    return str(path.relative_to(ROOT))


def make_normal_from_height(height: Image.Image, strength: float = 2.8) -> Image.Image:
    gray = ImageOps.grayscale(height).filter(ImageFilter.GaussianBlur(1.0))
    left = ImageChops.offset(gray, -1, 0)
    right = ImageChops.offset(gray, 1, 0)
    up = ImageChops.offset(gray, 0, -1)
    down = ImageChops.offset(gray, 0, 1)
    normal = Image.new("RGB", gray.size)
    lp = left.load()
    rp = right.load()
    upx = up.load()
    dp = down.load()
    np = normal.load()
    for y in range(gray.height):
      for x in range(gray.width):
        dx = (lp[x, y] - rp[x, y]) * strength
        dy = (upx[x, y] - dp[x, y]) * strength
        nx = int(max(0, min(255, 128 + dx * 0.5)))
        ny = int(max(0, min(255, 128 + dy * 0.5)))
        np[x, y] = (nx, ny, 255)
    return normal


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing OpenAI source texture: {SOURCE}")

    source = Image.open(SOURCE).convert("RGB")

    # The generated source has vertical track runs at the left and right edges.
    # Rotate the left run so tread pads repeat along U, which is what the shader scrolls.
    tread_column = source.crop((28, 0, 302, 1024))
    tread_albedo = tread_column.rotate(90, expand=True).resize((1024, 256), Image.Resampling.LANCZOS)
    tread_albedo = ImageEnhance.Color(tread_albedo).enhance(0.9)
    tread_albedo = ImageEnhance.Contrast(tread_albedo).enhance(1.12)

    armor_panel = source.crop((338, 90, 690, 860)).resize((1024, 1024), Image.Resampling.LANCZOS)
    armor_albedo = ImageEnhance.Color(armor_panel).enhance(0.85)
    armor_albedo = ImageEnhance.Contrast(armor_albedo).enhance(1.05)

    tread_gray = ImageOps.grayscale(tread_albedo)
    armor_gray = ImageOps.grayscale(armor_albedo)

    tread_roughness = ImageOps.autocontrast(tread_gray).point(lambda p: int(120 + (255 - p) * 0.42))
    armor_roughness = ImageOps.autocontrast(armor_gray).point(lambda p: int(145 + (255 - p) * 0.34))

    tread_metalness = ImageOps.autocontrast(tread_gray).point(lambda p: 88 if p > 140 else 24)
    armor_metalness = ImageOps.autocontrast(armor_gray).point(lambda p: 56 if p > 150 else 18)

    outputs = {
        "tread_albedo": save_png(tread_albedo, "tread_albedo.png"),
        "tread_roughness": save_png(tread_roughness.convert("RGB"), "tread_roughness.png"),
        "tread_metalness": save_png(tread_metalness.convert("RGB"), "tread_metalness.png"),
        "tread_normal": save_png(make_normal_from_height(tread_albedo), "tread_normal.png"),
        "olive_albedo": save_png(armor_albedo, "olive_albedo.png"),
        "olive_roughness": save_png(armor_roughness.convert("RGB"), "olive_roughness.png"),
        "olive_metalness": save_png(armor_metalness.convert("RGB"), "olive_metalness.png"),
        "olive_normal": save_png(make_normal_from_height(armor_albedo, strength=1.8), "olive_normal.png"),
    }

    manifest = {
        "asset_class": "openai_generated_pbr_material",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_image": str(SOURCE.relative_to(ROOT)),
        "generator": "OpenAI image generation via tools/meshy_asset_workflow.py openai-image",
        "processing": "Pillow crops, rotation, grayscale-derived roughness/metalness, and height-derived normal maps",
        "target_use": "Three.js model assay tread, barrel, and mantlet/socket authored material matching",
        "outputs": outputs,
        "notes": [
            "tread_albedo is rotated from the generated vertical track run so pads repeat along shader-scrolled U",
            "olive maps come from the same OpenAI source image to match authored barrel/socket color language",
            "derived normal/roughness/metalness maps are runtime approximations, not scanned physical measurements"
        ],
    }
    manifest_path = OUT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"out": str(OUT.relative_to(ROOT)), "outputs": outputs}, indent=2))


if __name__ == "__main__":
    main()

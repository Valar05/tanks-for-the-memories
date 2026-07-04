#!/usr/bin/env python3
"""Create commander texture variants by recoloring Alpha's accepted base-color map.

This avoids asking Meshy to improvise letters, chalk, or new graphic language.
The geometry, UVs, material slots, and non-color PBR maps remain the accepted
Alpha retexture asset. Only red high-saturation Alpha recognition pixels are
shifted toward the target commander color.
"""

from __future__ import annotations

import io
import json
import math
import struct
from pathlib import Path
from typing import Dict, Tuple

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ALPHA_GLB = ROOT / "public/tftm/models/m4a3_75_vvss_sherman_alpha_retexture_v2/m4a3_75_vvss_sherman_alpha_retexture_v2.glb"
SOURCE_TASK = "019f2bbd-be31-7fc4-bf14-bcb6dea15284"
VANILLA_TASK = "019f2a16-c82b-7b52-b541-c707b58c5d00"

TARGETS: Dict[str, Dict[str, object]] = {
    "bravo": {
        "label": "Bravo",
        "role": "Aggressive Assault Tank",
        "color": "blue",
        "rgb": (42, 92, 165),
        "mood": "Restless, energetic, always moving",
    },
    "tango": {
        "label": "Tango",
        "role": "Human Tank",
        "color": "green",
        "rgb": (55, 125, 72),
        "mood": "Warm, approachable, campaign veteran",
    },
    "delta": {
        "label": "Delta",
        "role": "Planner",
        "color": "yellow",
        "rgb": (176, 142, 44),
        "mood": "Methodical, disciplined, controlled",
    },
}


def pad4(data: bytes, pad_byte: bytes) -> bytes:
    missing = (-len(data)) % 4
    return data + (pad_byte * missing)


def read_glb(path: Path) -> Tuple[dict, bytearray]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise ValueError(f"{path} is not a GLB")
    version, total_len = struct.unpack_from("<II", data, 4)
    if version != 2 or total_len != len(data):
        raise ValueError(f"unexpected GLB header in {path}")
    json_len, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise ValueError("first GLB chunk is not JSON")
    json_start = 20
    json_end = json_start + json_len
    gltf = json.loads(data[json_start:json_end].decode("utf8"))
    bin_len, bin_type = struct.unpack_from("<I4s", data, json_end)
    if bin_type != b"BIN\x00":
        raise ValueError("second GLB chunk is not BIN")
    bin_start = json_end + 8
    return gltf, bytearray(data[bin_start:bin_start + bin_len])


def image_bytes(gltf: dict, bin_chunk: bytearray, image_index: int) -> bytes:
    image = gltf["images"][image_index]
    view = gltf["bufferViews"][image["bufferView"]]
    start = view.get("byteOffset", 0)
    return bytes(bin_chunk[start:start + view["byteLength"]])


def recolor_alpha_base(jpeg_bytes: bytes, target_rgb: Tuple[int, int, int]) -> Tuple[bytes, int]:
    image = Image.open(io.BytesIO(jpeg_bytes)).convert("RGB")
    pixels = image.load()
    target = tuple(channel / 255.0 for channel in target_rgb)
    changed = 0
    for y in range(image.height):
      for x in range(image.width):
        r, g, b = pixels[x, y]
        rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
        mx = max(rf, gf, bf)
        mn = min(rf, gf, bf)
        saturation = 0.0 if mx == 0 else (mx - mn) / mx
        red_dominance = rf - max(gf, bf)
        # Alpha's useful mark is the only high-saturation red/magenta family
        # feature. Conservative selection avoids recoloring olive drab, mud,
        # grease, and warm lighting.
        if saturation > 0.42 and r > 105 and r > g * 1.55 and r > b * 1.35 and red_dominance > 0.12:
            value = 0.42 + (mx * 0.72)
            shade = 0.66 + (mn * 0.58)
            nr = int(max(0, min(255, target[0] * 255 * value * shade)))
            ng = int(max(0, min(255, target[1] * 255 * value * shade)))
            nb = int(max(0, min(255, target[2] * 255 * value * shade)))
            pixels[x, y] = (nr, ng, nb)
            changed += 1
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=92, optimize=True)
    return out.getvalue(), changed


def rebuild_glb(gltf: dict, old_bin: bytearray, replacements: Dict[int, bytes], out_path: Path) -> None:
    old_views = gltf["bufferViews"]
    new_bin = bytearray()
    for index, view in enumerate(old_views):
        old_start = view.get("byteOffset", 0)
        old_bytes = bytes(old_bin[old_start:old_start + view["byteLength"]])
        chunk = replacements.get(index, old_bytes)
        view["byteOffset"] = len(new_bin)
        view["byteLength"] = len(chunk)
        new_bin.extend(chunk)
        new_bin.extend(b"\x00" * ((-len(new_bin)) % 4))
    gltf["buffers"][0]["byteLength"] = len(new_bin)
    json_bytes = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf8"), b" ")
    bin_bytes = pad4(bytes(new_bin), b"\x00")
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    out = bytearray()
    out.extend(struct.pack("<4sII", b"glTF", 2, total))
    out.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    out.extend(json_bytes)
    out.extend(struct.pack("<I4s", len(bin_bytes), b"BIN\x00"))
    out.extend(bin_bytes)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(out)


def write_manifest(variant_id: str, info: dict, slug: str, glb_path: Path, changed_pixels: int) -> None:
    manifest = {
        "asset_id": slug,
        "display_name": f"M4A3 75mm Sherman {info['label']} Alpha-Style Texture V1",
        "asset_class": "deterministic_texture_derivative_from_alpha",
        "status": "human_cloud_visual_review_pending",
        "commander_variant": variant_id,
        "role": info["role"],
        "recognition_color": info["color"],
        "mood": info["mood"],
        "generated_at": "2026-07-04T07:08:00.000Z",
        "source_alpha_task_id": SOURCE_TASK,
        "source_vanilla_task_id": VANILLA_TASK,
        "source_alpha_glb": str(ALPHA_GLB.relative_to(ROOT)),
        "glb": str(glb_path.relative_to(ROOT)),
        "processing": {
            "method": "recolored Alpha accepted base-color texture red recognition pixels to target commander color",
            "changed_base_color_pixels": changed_pixels,
            "mesh_geometry_changed": False,
            "uvs_changed": False,
            "non_color_pbr_maps_changed": False
        },
        "inspection": {
            "approximate_triangles": 10216,
            "texture_count": 4,
            "image_count": 4,
            "node_count": 1,
            "mesh_count": 1,
            "primitive_count": 1,
            "material_count": 1,
            "glb_bytes": glb_path.stat().st_size
        },
        "runtime_contract": {
            "vanilla_base_preserved": True,
            "alpha_graphic_language_preserved": True,
            "identity_from_texture_only": True,
            "visual_texture_candidate": True,
            "gameplay_animation_ready": False,
            "acceptance_gate": "Human cloud visual review must confirm these read like the same successful Alpha/ninja-shell graphic language in commander colors, not like independent rejected Meshy font-noise tanks."
        }
    }
    (glb_path.parent / "model_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    gltf, bin_chunk = read_glb(ALPHA_GLB)
    base_image_view = gltf["images"][0]["bufferView"]
    base_jpeg = image_bytes(gltf, bin_chunk, 0)
    generated_root = ROOT / "assets/generated/derived/commander_alpha_style_texture_v1"
    generated_root.mkdir(parents=True, exist_ok=True)
    summary = {
        "asset_class": "deterministic_texture_derivative_set",
        "source_alpha_glb": str(ALPHA_GLB.relative_to(ROOT)),
        "source_alpha_task_id": SOURCE_TASK,
        "source_vanilla_task_id": VANILLA_TASK,
        "variants": []
    }
    for variant_id, info in TARGETS.items():
        slug = f"m4a3_75_vvss_sherman_{variant_id}_alpha_style_v1"
        recolored, changed = recolor_alpha_base(base_jpeg, info["rgb"])
        gltf_copy = json.loads(json.dumps(gltf))
        public_glb = ROOT / f"public/tftm/models/{slug}/{slug}.glb"
        rebuild_glb(gltf_copy, bin_chunk, {base_image_view: recolored}, public_glb)
        source_glb = generated_root / f"{slug}.glb"
        source_glb.parent.mkdir(parents=True, exist_ok=True)
        source_glb.write_bytes(public_glb.read_bytes())
        write_manifest(variant_id, info, slug, public_glb, changed)
        summary["variants"].append({
            "id": variant_id,
            "slug": slug,
            "changed_base_color_pixels": changed,
            "public_glb": str(public_glb.relative_to(ROOT)),
            "source_glb": str(source_glb.relative_to(ROOT))
        })
        print(f"{variant_id}: {changed} recolored pixels -> {public_glb}")
    (generated_root / "manifest.json").write_text(json.dumps(summary, indent=2) + "\n")


if __name__ == "__main__":
    main()

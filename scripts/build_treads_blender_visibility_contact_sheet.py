import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'generated' / 'blender-visibility' / 'authored_sherman_treads_v1'
MANIFEST = OUT / 'manifest.json'
CONTACT = OUT / 'contact_sheet.png'
THUMB_W = 380
THUMB_H = 285
LABEL_H = 58
PAD = 16
BG = (18, 20, 18)
PANEL = (34, 37, 31)
TEXT = (232, 231, 220)
MUTED = (166, 169, 150)


def font(size):
    for candidate in ['/system/fonts/Roboto-Regular.ttf', '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf']:
        p = Path(candidate)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def main():
    manifest = json.loads(MANIFEST.read_text())
    views = manifest['views']
    passes = manifest['passes']
    image_by_key = {(img['view'], img['pass']): OUT / img['path'] for img in manifest['images']}
    width = PAD + len(passes) * (THUMB_W + PAD)
    height = PAD + 100 + len(views) * (THUMB_H + LABEL_H + PAD)
    sheet = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(sheet, 'RGBA')
    title_font = font(25)
    label_font = font(17)
    small_font = font(13)
    draw.text((PAD, PAD), 'Authored Sherman Treads - Offline Blender Visibility', fill=TEXT, font=title_font)
    draw.text((PAD, PAD + 34), f"revision: {manifest.get('model_revision')} | Blender {manifest.get('blender')} | user-authorized offline visual evidence", fill=MUTED, font=small_font)
    y = PAD + 90
    for view in views:
        x = PAD
        for render_pass in passes:
            path = image_by_key[(view['id'], render_pass['id'])]
            image = Image.open(path).convert('RGB')
            image.thumbnail((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
            cell = Image.new('RGB', (THUMB_W, THUMB_H), (12, 13, 12))
            cell.paste(image, ((THUMB_W - image.width) // 2, (THUMB_H - image.height) // 2))
            sheet.paste(cell, (x, y))
            draw.rectangle((x, y + THUMB_H, x + THUMB_W, y + THUMB_H + LABEL_H), fill=PANEL + (255,))
            draw.text((x + 10, y + THUMB_H + 8), f"{view['label']} / {render_pass['label']}", fill=TEXT, font=label_font)
            draw.text((x + 10, y + THUMB_H + 32), view['purpose'][:48], fill=MUTED, font=small_font)
            x += THUMB_W + PAD
        y += THUMB_H + LABEL_H + PAD
    sheet.save(CONTACT)
    manifest['contact_sheet'] = str(CONTACT.relative_to(OUT))
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    print(CONTACT)


if __name__ == '__main__':
    main()

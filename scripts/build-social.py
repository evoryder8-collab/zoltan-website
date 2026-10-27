"""Builds the share image (public/og.jpg, 1200x630) and the home-screen icon
(public/apple-touch-icon.png) from the hero cut-out. Re-run after changing
the brand line or the portrait: python3 scripts/build-social.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
PUB = os.path.join(ROOT, 'public')
DIDOT = '/System/Library/Fonts/Supplemental/Didot.ttc'
SANS = '/System/Library/Fonts/HelveticaNeue.ttc'


def font(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except OSError:
        return ImageFont.load_default()


def glow_bg(w, h, cx, cy, r):
    bg = Image.new('RGB', (w, h), (11, 6, 7))
    layer = Image.new('RGB', (w, h), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(150, 16, 40))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.55))
    return Image.blend(bg, layer, 0.75)


def og():
    W, H = 1200, 630
    img = glow_bg(W, H, 880, 300, 330)
    portrait = Image.open(os.path.join(PUB, 'img', 'cutout-kneel-1600.webp')).convert('RGBA')
    ph = 600
    portrait = portrait.resize((round(portrait.width * ph / portrait.height), ph), Image.LANCZOS)
    img.paste(portrait, (W - portrait.width - 40, H - ph + 30), portrait)
    d = ImageDraw.Draw(img)
    d.text((70, 150), 'Zoltan', font=font(DIDOT, 150), fill=(246, 241, 236))
    d.text((76, 330), 'Clinical Precision • Aesthetic Flow', font=font(DIDOT, 40, 1), fill=(246, 241, 236))
    d.text((78, 410), 'AUSMC 2026 OVERALL WINNER', font=font(SANS, 24, 1), fill=(255, 92, 110))
    d.text((78, 450), 'Massage therapy · Budapest & Mezőkeresztes', font=font(SANS, 26), fill=(189, 179, 171))
    img.save(os.path.join(PUB, 'og.jpg'), quality=88)


def touch_icon():
    S = 180
    img = glow_bg(S, S, 60, 45, 120)
    d = ImageDraw.Draw(img)
    k = S / 64
    pts = [(19, 16), (46, 16), (46, 19.5), (26, 44.5), (46.5, 44.5), (46.5, 48), (18, 48), (18, 44.5), (38, 19.5), (19, 19.5)]
    d.polygon([(x * k, y * k) for x, y in pts], fill=(246, 241, 236))
    img.save(os.path.join(PUB, 'apple-touch-icon.png'))


if __name__ == '__main__':
    og()
    touch_icon()
    print('og.jpg + apple-touch-icon.png written')

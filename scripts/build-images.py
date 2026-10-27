"""Copy the approved Zoltan photos into public/img as web-sized WebP.

Sources live outside the repo (in ~/Downloads); everything the site needs is
written into public/img so the repo stands on its own. Re-run with
`npm run images` after adding a photo to SOURCES or GALLERY.
"""
import json
import os
import sys

from PIL import Image, ImageOps

HOME = os.path.expanduser('~/Downloads')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'img')
PROOFS = os.path.join(HOME, 'LR Editing via Agent/analysis/ausmc-zoltan-grade-matthew-2026-10-13/z-final-proof')

# Transparent cut-outs for the hero (trimmed to the figure)
CUTOUTS = {
    'cutout-kneel': 'Zoltan IMA/ara/transparent portrait zoltan.png',
    'cutout-stand': 'Zoltan IMA/ara/zoltan standing transparent.png',
}

# slug: (source, category). Proof sources are matched by their numeric id.
GALLERY = {
    'ima-standing': ('Zoltan IMA/ara/0E7A0547-2-retouched.jpg', 'portrait'),
    'ima-kneeling': ('Zoltan IMA/ara/0E7A0570-2-retouched lips fixed.jpg', 'portrait'),
    'at-the-table': ('clients copenhagen/Zoltan.webp', 'treatment'),
    'overall-lifted': ('proof:91612', 'awards'),
    'trophy': ('proof:91691', 'awards'),
    'medal-flag': ('proof:91467', 'awards'),
    'flag-raised': ('proof:91449', 'awards'),
    'freestyle-award': ('proof:91517', 'awards'),
    'shoulders': ('proof:20922', 'treatment'),
    'arch-stretch': ('proof:21063', 'stretch'),
    'focus': ('proof:90424', 'portrait'),
    'stones': ('proof:90400', 'treatment'),
    'assisted-stretch': ('proof:21052', 'stretch'),
    'ready': ('proof:20792', 'portrait'),
    'leg-stretch': ('proof:21006', 'stretch'),
    'forearm': ('proof:90361', 'treatment'),
    'head': ('proof:90439', 'treatment'),
    'hip-stretch': ('proof:21016', 'stretch'),
    'explaining': ('proof:21106', 'portrait'),
    'back-wide': ('proof:20822', 'treatment'),
    'lower-back': ('proof:20962', 'treatment'),
    'crouch': ('proof:20803', 'portrait'),
    'robe': ('proof:90715', 'portrait'),
}


def resolve(src):
    if not src.startswith('proof:'):
        return os.path.join(HOME, src)
    pid = src.split(':', 1)[1]
    for f in sorted(os.listdir(PROOFS)):
        if f.startswith(pid + '-') and f.endswith('.jpg'):
            return os.path.join(PROOFS, f)
    sys.exit(f'missing proof {pid}')


def fit(im, long_edge):
    im = im.copy()
    im.thumbnail((long_edge, long_edge), Image.LANCZOS)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {'cutouts': {}, 'gallery': []}

    for slug, src in CUTOUTS.items():
        im = Image.open(resolve(src)).convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
        for h in (1600, 900):
            out = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
            out.save(os.path.join(OUT, f'{slug}-{h}.webp'), 'WEBP', quality=86, method=6)
        manifest['cutouts'][slug] = {'w': im.width, 'h': im.height}

    for slug, (src, cat) in GALLERY.items():
        im = ImageOps.exif_transpose(Image.open(resolve(src))).convert('RGB')
        for edge in (800, 1600):
            fit(im, edge).save(os.path.join(OUT, f'g-{slug}-{edge}.webp'), 'WEBP', quality=82, method=6)
        big = fit(im, 1600)
        manifest['gallery'].append({'id': slug, 'cat': cat, 'w': big.width, 'h': big.height})

    print(json.dumps(manifest, indent=1))


if __name__ == '__main__':
    main()

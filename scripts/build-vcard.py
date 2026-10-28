"""Writes public/zoltan-kodor.vcf, the "Save my contact" card on /linkinbio.

Details match src/config.js (from zwellness.hu). The photo is the avatar in
public/img. Run again after changing either: python3 scripts/build-vcard.py
"""
import base64
import io
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SITE = 'https://evoryder8-collab.github.io/zoltan-website/'  # the domain once it launches

photo = io.BytesIO()
Image.open(os.path.join(ROOT, 'public/img/avatar-256.webp')).convert('RGB').resize((240, 240)).save(photo, 'JPEG', quality=80, optimize=True)

lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N;CHARSET=UTF-8:Kódor;Zoltán;;;',
    'FN;CHARSET=UTF-8:Zoltán Kódor',
    'ORG:Z-Wellness',
    'TITLE:Massage therapist',
    'TEL;TYPE=CELL,VOICE:+36304162043',
    'EMAIL;TYPE=INTERNET:zwellness18@gmail.com',
    'ADR;TYPE=WORK;CHARSET=UTF-8:;;Bornemissza utca 3;Mezőkeresztes;;3441;Hungary',
    'ADR;TYPE=WORK;CHARSET=UTF-8:;;Sashalom, District XVI;Budapest;;;Hungary',
    f'URL:{SITE}',
    'X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/zwellness18/',
    'X-SOCIALPROFILE;TYPE=tiktok:https://www.tiktok.com/@zwellness18',
    'X-SOCIALPROFILE;TYPE=facebook:https://www.facebook.com/zwellness18',
    'X-SOCIALPROFILE;TYPE=youtube:https://www.youtube.com/@zwellness18',
    'NOTE;CHARSET=UTF-8:Clinical Precision • Aesthetic Flow. Book by phone or WhatsApp.',
    'PHOTO;ENCODING=b;TYPE=JPEG:' + base64.b64encode(photo.getvalue()).decode(),
    'END:VCARD',
]


def fold(line):
    # vCard lines fold at 75 octets; continuation lines start with a space
    out, cur = [], b''
    for ch in line:
        b = ch.encode()
        if len(cur) + len(b) > (75 if not out else 74):
            out.append(cur)
            cur = b''
        cur += b
    out.append(cur)
    return b'\r\n '.join(out)


with open(os.path.join(ROOT, 'public/zoltan-kodor.vcf'), 'wb') as f:
    f.write(b'\r\n'.join(fold(l) for l in lines) + b'\r\n')
print('public/zoltan-kodor.vcf written')

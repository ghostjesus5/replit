"""Turn the Cycles EXR passes into graded 1920x1080 plates for the browser composite.

    python3 post.py --range 1 1440                 frames/main + frames/haze -> plates/f0001.jpg ...
    python3 post.py --frames 300,700 --src lookdev --out lookdev/plates

Per frame, in scene-linear light: main pass + haze pass (scaled to the shot's haze level), upscale, lens glare
(an energy-conserving blend of three blur radii, so only genuinely bright sources bloom), lateral chromatic
aberration, natural vignetting, exposure. Then Blender's AgX view transform with the shot's white balance.
"""
import argparse
import json
import os
import sys
import time

import numpy as np
import OpenEXR
from PIL import Image
from scipy.ndimage import gaussian_filter

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from look import SHOT, CAL  # noqa: E402
from build_scene import HAZE_DENSITY  # noqa: E402

W, H = 1920, 1080

ap = argparse.ArgumentParser()
ap.add_argument('--range', nargs=2, type=int)
ap.add_argument('--frames')
ap.add_argument('--src', default='frames')
ap.add_argument('--out', default='plates')
ap.add_argument('--force', action='store_true')
args = ap.parse_args()

F = json.load(open(os.path.join(HERE, 'data', 'frames.json')))['frames']
src = os.path.join(HERE, args.src); out = os.path.join(HERE, args.out)
os.makedirs(out, exist_ok=True)


def read_exr(path):
    with OpenEXR.File(path) as f:
        ch = f.channels()
        if 'RGB' in ch:
            return np.asarray(ch['RGB'].pixels, np.float32)[..., :3]
        return np.stack([np.asarray(ch[c].pixels, np.float32) for c in 'RGB'], -1)


def resize(img, w, h):
    if img.shape[1] == w and img.shape[0] == h:
        return img
    return np.stack([np.asarray(Image.fromarray(np.ascontiguousarray(img[..., c]), 'F').resize((w, h), Image.LANCZOS)) for c in range(3)], -1)


def glare(img, k):
    """Veiling glare: blend toward a wide blur of the frame. Computed at quarter res, it is soft by nature."""
    q = img.reshape(H // 4, 4, W // 4, 4, 3).mean((1, 3))
    b = 0.55 * gaussian_filter(q, (1.5, 1.5, 0)) + 0.3 * gaussian_filter(q, (7, 7, 0)) + 0.15 * gaussian_filter(q, (26, 26, 0))
    return img * (1 - k) + resize(b, W, H) * k


def lateral_ca(img, amt=0.0009):
    """Red scaled out, blue scaled in about the center: about one pixel of fringing in the corners."""
    outc = [img[..., 1]]
    for c, s in ((0, 1 + amt), (2, 1 - amt)):
        im = Image.fromarray(np.ascontiguousarray(img[..., c]), 'F')
        a = 1 / s; cx, cy = W / 2, H / 2
        outc.insert(c, np.asarray(im.transform((W, H), Image.AFFINE, (a, 0, cx - a * cx, 0, a, cy - a * cy), Image.BILINEAR)))
    return np.stack(outc, -1)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r2 = ((xx - W / 2) ** 2 + (yy - H / 2) ** 2) / ((W / 2) ** 2 + (H / 2) ** 2)
VIG = (1 - 0.32 * r2 ** 1.15)[..., None].astype(np.float32)
del yy, xx, r2

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
vs = sc.view_settings
vs.view_transform = 'AgX'
vs.look = 'AgX - Medium High Contrast'
vs.use_white_balance = True
ims = sc.render.image_settings
ims.file_format = 'JPEG'; ims.quality = 95
plate = bpy.data.images.new('plate', W, H, alpha=False, float_buffer=True)
rgba = np.ones((H, W, 4), np.float32)

frames = list(range(args.range[0], args.range[1] + 1)) if args.range else [int(x) for x in args.frames.split(',')]
t0 = time.time(); done = 0
for f in frames:
    fr = F[f - 1]
    dst = os.path.join(out, f'f{f:04d}.jpg')
    mp = os.path.join(src, 'main', f'f{f:04d}.exr')
    if not fr['S']['three'] or not os.path.exists(mp) or (os.path.exists(dst) and not args.force):
        continue
    cal = CAL(SHOT[fr['shot']])
    img = read_exr(mp)
    img = np.nan_to_num(img, nan=0.0, posinf=0.0)
    if cal['haze'] > 0:
        hp = os.path.join(src, 'haze', f'f{f:04d}.exr')
        if os.path.exists(hp):
            hz = resize(read_exr(hp), img.shape[1], img.shape[0])
            img = img + np.maximum(hz, 0) * (cal['haze'] / HAZE_DENSITY)
        else:
            print(f'warning: frame {f} has no haze pass', flush=True)
    img = np.maximum(resize(img, W, H), 0)
    img = glare(img, cal['glare'])
    img = lateral_ca(img) * VIG
    img *= 2.0 ** (np.log2(max(1e-3, fr['S']['exposure'])) + cal['ev'])
    vs.white_balance_temperature = cal['wb']
    rgba[..., :3] = img[::-1]
    plate.pixels.foreach_set(rgba.ravel())
    plate.save_render(dst, scene=sc)
    done += 1
    if done % 24 == 1:
        print(f'plate {f}  {(time.time() - t0) / done:.2f}s/frame', flush=True)
print(f'wrote {done} plates in {(time.time() - t0) / 60:.1f} min', flush=True)

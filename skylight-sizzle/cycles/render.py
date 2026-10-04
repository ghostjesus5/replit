"""Render frames of skylight.blend with Cycles into scene-linear EXRs. Restartable: frames already on disk are skipped.

    python3 render.py --range 1 1440                       main pass, into frames/main/
    python3 render.py --range 1 1440 --pass haze           haze pass (only shots with haze), into frames/haze/
    python3 render.py --frames 300,700 --scale 50 --out lookdev

The haze pass renders the volume alone at low resolution with every surface turned black, so surfaces still hide
the haze behind them. post.py adds it to the main pass, grades and upscales. Photo-plate frames (the film's
photography beat) are skipped, and letterboxed frames only render the picture area.
"""
import argparse
import json
import os
import sys
import time

import bpy
from bpy_extras import anim_utils

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from look import SHOT, CAL  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--range', nargs=2, type=int)
ap.add_argument('--frames')
ap.add_argument('--pass', dest='pss', default='main', choices=['main', 'haze'])
ap.add_argument('--scale', type=int, default=100)
ap.add_argument('--res', nargs=2, type=int, help='override resolution (before --scale)')
ap.add_argument('--spp', type=int, default=0)
ap.add_argument('--out', default='frames')
ap.add_argument('--force', action='store_true')
args = ap.parse_args()

F = json.load(open(os.path.join(HERE, 'data', 'frames.json')))['frames']
bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, 'skylight.blend'))
sc = bpy.context.scene
r = sc.render; cy = sc.cycles


def unkey(idb, path):
    """Drop the baked fcurve on idb.path so a value set here sticks through frame changes."""
    ad = idb.animation_data
    if not ad or not ad.action:
        return
    cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
    fc = cb.fcurves.find(path)
    if fc:
        cb.fcurves.remove(fc)


if args.pss == 'haze':
    r.resolution_x, r.resolution_y = 640, 360
    cy.samples = 8; cy.adaptive_threshold = 0.06
    cy.denoising_prefilter = 'FAST'
    r.film_transparent = True
    bpy.data.objects['haze'].hide_render = False
    for name in ('rain', 'cable_pulse'):
        ob = bpy.data.objects.get(name)
        if ob:
            unkey(ob, 'hide_render'); ob.hide_render = True
    # every surface black: it still occludes the haze and casts the petals' shadows into it
    for m in bpy.data.materials:
        if m.name == 'haze' or not m.node_tree:
            continue
        nt = m.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if out is None:
            continue
        d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (0, 0, 0, 1)
        nt.links.new(d.outputs[0], out.inputs['Surface'])
    # the LED faces and lenses sit in front of the area lights' housings; keep them out of camera rays only
    for ob in bpy.data.objects:
        if ob.name.startswith('petal') and ob.name.endswith(('_leds', '_lens')):
            ob.visible_camera = False
if args.res:
    r.resolution_x, r.resolution_y = args.res
r.resolution_percentage = args.scale
if args.spp:
    cy.samples = args.spp
out = os.path.join(HERE, args.out, args.pss)
os.makedirs(out, exist_ok=True)

# sky strength: set directly, and only when it changes (keying the world costs 2.3 s a frame, see build_scene.py)
bg = sc.world.node_tree.nodes['BG']
SKY = [round(fr['S']['skyLift'] * CAL(SHOT[fr['shot']])['sky'], 3) for fr in F]

frames = list(range(args.range[0], args.range[1] + 1)) if args.range else [int(x) for x in args.frames.split(',')]
LB = 138 / 1080
done = 0
t0 = time.time()
for f in frames:
    fr = F[f - 1]
    path = os.path.join(out, f'f{f:04d}.exr')
    if not fr['S']['three'] or (os.path.exists(path) and not args.force):
        continue
    if args.pss == 'haze' and CAL(SHOT[fr['shot']])['haze'] <= 0:
        continue
    lb = fr['S'].get('lbox', 0) or 0
    if lb >= 0.999:
        r.use_border = True; r.use_crop_to_border = False
        r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = 0, 1, LB, 1 - LB
    else:
        r.use_border = False
    if abs(bg.inputs['Strength'].default_value - SKY[f - 1]) > 1e-4:
        bg.inputs['Strength'].default_value = SKY[f - 1]
    sc.frame_set(f)
    r.filepath = path
    ts = time.time()
    bpy.ops.render.render(write_still=True)
    done += 1
    print(f'{args.pss} frame {f} shot {fr["shot"]} {time.time() - ts:.1f}s  avg {(time.time() - t0) / done:.1f}s', flush=True)
print(f'rendered {done} {args.pss} frames in {(time.time() - t0) / 60:.1f} min', flush=True)

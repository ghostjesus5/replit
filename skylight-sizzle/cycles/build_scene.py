"""Build the path-traced Skylight film in Blender (Cycles) from the WebGL film's exported scene and per-frame state.

    python3 build_scene.py            writes cycles/skylight.blend

Inputs (from the browser export): data/scene.glb (product, Yeti, cable, case, camp, people with named nodes and
materials) and data/frames.json (24 fps: world matrices of every moving part, camera, and lighting state).
Everything environmental (sky, terrain, grass, trees, ridge, haze, rain) is built here, procedurally, in meters.
"""
import json
import math
import os
import random
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from bpy_extras import anim_utils

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
FT = 0.3048
A4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))   # three (Y-up) -> blender (Z-up)
A3 = A4.to_3x3()
AINV = A4.inverted()

sys.path.insert(0, HERE)
from look import SHOT, CAL  # noqa: E402  per-shot lens and light calibration


def three_matrix(e):
    return Matrix(((e[0], e[4], e[8], e[12]), (e[1], e[5], e[9], e[13]), (e[2], e[6], e[10], e[14]), (e[3], e[7], e[11], e[15])))


def srgb_to_lin(c):
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c]


def kelvin_rgb(K):
    t = K / 100.0
    if t <= 66:
        r = 255.0
        g = 99.4708025861 * math.log(t) - 161.1195681661
        b = 0.0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307
    else:
        r = 329.698727446 * (t - 60) ** -0.1332047592
        g = 288.1221695283 * (t - 60) ** -0.0755148492
        b = 255.0
    return srgb_to_lin([min(255, max(0, v)) / 255 for v in (r, g, b)])


# ---------------------------------------------------------------- animation helpers
INTERP = {'CONSTANT': 0, 'LINEAR': 1}


def fcurve(struct, prop, index=0):
    """Return the fcurve for struct.prop, creating the action/slot via one keyframe_insert if needed."""
    try:
        struct.keyframe_insert(data_path=prop, index=index, frame=1)
    except TypeError:
        struct.keyframe_insert(data_path=prop, frame=1)
    idb = struct.id_data
    full = struct.path_from_id(prop)
    ad = idb.animation_data
    cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
    return cb.fcurves.find(full, index=max(0, index))


def bake(id_data, path, index, values, const_frames):
    """Write one value per frame (frame numbers start at 1) as LINEAR keys, CONSTANT on shot-final frames."""
    fc = fcurve(id_data, path, index)
    n = len(values)
    fc.keyframe_points.clear()
    fc.keyframe_points.add(n)
    co = np.empty(n * 2, dtype=np.float32)
    co[0::2] = np.arange(1, n + 1, dtype=np.float32)
    co[1::2] = values
    fc.keyframe_points.foreach_set('co', co)
    interp = np.full(n, INTERP['LINEAR'], dtype=np.int32)
    interp[list(const_frames)] = INTERP['CONSTANT']
    fc.keyframe_points.foreach_set('interpolation', interp)
    fc.update()


def bake_bool(id_data, path, values):
    fc = fcurve(id_data, path, 0)
    n = len(values)
    fc.keyframe_points.clear()
    fc.keyframe_points.add(n)
    co = np.empty(n * 2, dtype=np.float32)
    co[0::2] = np.arange(1, n + 1, dtype=np.float32)
    co[1::2] = np.asarray(values, dtype=np.float32)
    fc.keyframe_points.foreach_set('co', co)
    fc.keyframe_points.foreach_set('interpolation', np.zeros(n, dtype=np.int32))
    fc.update()


# ---------------------------------------------------------------- materials
def new_mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try:
        m.use_nodes = True  # noqa
    except Exception:
        pass
    m.node_tree.nodes.clear()
    return m


def principled(m, **kw):
    nt = m.node_tree
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(b.outputs[0], out.inputs['Surface'])
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return nt, b, out


def micro_bump(nt, bsdf, scale=400.0, strength=0.05, coord='Object'):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs[coord], nz.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    nt.links.new(nz.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return bump


def no_light_sampling(m):
    try:
        m.cycles.emission_sampling = 'NONE'
    except Exception:
        pass


def build_materials():
    mats = {}
    # Black polycarbonate housings: slight clearcoat, fine texture.
    m = new_mat('plastic'); nt, b, _ = principled(m, **{'Base Color': (0.012, 0.012, 0.013, 1), 'Roughness': 0.42, 'Coat Weight': 0.35, 'Coat Roughness': 0.25})
    micro_bump(nt, b, 900, 0.03); mats['plastic'] = m
    # Hard-anodized black aluminum mast and legs, faint brushed anisotropy.
    m = new_mat('alu'); nt, b, _ = principled(m, **{'Base Color': (0.03, 0.031, 0.034, 1), 'Metallic': 1.0, 'Roughness': 0.3, 'Anisotropic': 0.5})
    micro_bump(nt, b, 1400, 0.015); mats['alu'] = m
    m = new_mat('lime'); nt, b, _ = principled(m, **{'Base Color': (0.48, 0.62, 0.035, 1), 'Roughness': 0.38, 'Coat Weight': 0.2})
    micro_bump(nt, b, 900, 0.02); mats['lime'] = m
    m = new_mat('rubber'); nt, b, _ = principled(m, **{'Base Color': (0.008, 0.008, 0.009, 1), 'Roughness': 0.75})
    micro_bump(nt, b, 600, 0.08); mats['rubber'] = m
    m = new_mat('silver'); nt, b, _ = principled(m, **{'Base Color': (0.62, 0.64, 0.67, 1), 'Metallic': 1.0, 'Roughness': 0.34, 'Anisotropic': 0.6})
    micro_bump(nt, b, 1600, 0.01); mats['silver'] = m
    m = new_mat('yeti_lid'); nt, b, _ = principled(m, **{'Base Color': (0.014, 0.015, 0.017, 1), 'Roughness': 0.55})
    micro_bump(nt, b, 500, 0.06); mats['yeti_lid'] = m
    # LED arrays: emission with a per-LED ignition sweep driven by a keyed "lit" value and a baked order attribute.
    for k in range(6):
        m = new_mat(f'led{k}')
        nt = m.node_tree
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission'); em.name = 'EM'
        attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'order'
        lit = nt.nodes.new('ShaderNodeValue'); lit.name = 'LIT'; lit.outputs[0].default_value = 28
        sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.use_clamp = True
        nt.links.new(lit.outputs[0], sub.inputs[0]); nt.links.new(attr.outputs['Fac'], sub.inputs[1])
        strength = nt.nodes.new('ShaderNodeValue'); strength.name = 'STR'
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
        nt.links.new(sub.outputs[0], mul.inputs[0]); nt.links.new(strength.outputs[0], mul.inputs[1])
        nt.links.new(mul.outputs[0], em.inputs['Strength'])
        dark = nt.nodes.new('ShaderNodeBsdfPrincipled')
        dark.inputs['Base Color'].default_value = (0.75, 0.74, 0.7, 1); dark.inputs['Roughness'].default_value = 0.3
        add = nt.nodes.new('ShaderNodeAddShader')
        nt.links.new(dark.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
        nt.links.new(add.outputs[0], out.inputs['Surface'])
        no_light_sampling(m); mats[f'led{k}'] = m
        # Lens: frosted polycarbonate over the LEDs, glows when on.
        m = new_mat(f'lens{k}'); nt, b, _ = principled(m, **{'Base Color': (0.05, 0.05, 0.052, 1), 'Roughness': 0.22, 'Coat Weight': 1.0, 'Coat Roughness': 0.05})
        b.name = 'B'; micro_bump(nt, b, 300, 0.02)
        # the diffuser glows behind the LEDs that are lit: same hub-to-tip sweep, softened over ~3 LEDs
        la = nt.nodes.new('ShaderNodeAttribute'); la.attribute_name = 'order'
        llit = nt.nodes.new('ShaderNodeValue'); llit.name = 'LIT'; llit.outputs[0].default_value = 28
        lstr = nt.nodes.new('ShaderNodeValue'); lstr.name = 'LSTR'
        d1 = nt.nodes.new('ShaderNodeMath'); d1.operation = 'SUBTRACT'; nt.links.new(llit.outputs[0], d1.inputs[0]); nt.links.new(la.outputs['Fac'], d1.inputs[1])
        d2 = nt.nodes.new('ShaderNodeMath'); d2.operation = 'MULTIPLY_ADD'; d2.use_clamp = True; d2.inputs[1].default_value = 1 / 3; d2.inputs[2].default_value = 2 / 3
        nt.links.new(d1.outputs[0], d2.inputs[0])
        d3 = nt.nodes.new('ShaderNodeMath'); d3.operation = 'MULTIPLY'; nt.links.new(d2.outputs[0], d3.inputs[0]); nt.links.new(lstr.outputs[0], d3.inputs[1])
        nt.links.new(d3.outputs[0], b.inputs['Emission Strength'])
        no_light_sampling(m); mats[f'lens{k}'] = m
    m = new_mat('latch_em'); nt, b, _ = principled(m, **{'Base Color': (0.48, 0.62, 0.035, 1), 'Roughness': 0.38, 'Emission Color': (0.6, 0.85, 0.1, 1)})
    b.name = 'B'; no_light_sampling(m); mats['latch'] = m
    m = new_mat('remote_led'); nt, b, _ = principled(m, **{'Base Color': (0.1, 0.2, 1, 1), 'Emission Color': (0.15, 0.35, 1.0, 1), 'Emission Strength': 8})
    no_light_sampling(m); mats['remote_led'] = m
    # Fabric, car paint, glass, cooler, table for the campsite.
    def fabric(name, rgb):
        m = new_mat(name); nt, b, _ = principled(m, **{'Base Color': (*rgb, 1), 'Roughness': 0.85, 'Sheen Weight': 0.6, 'Sheen Tint': (*[min(1, c * 2) for c in rgb], 1)})
        micro_bump(nt, b, 160, 0.12); return m
    mats['fabric'] = fabric
    m = new_mat('paint'); nt, b, _ = principled(m, **{'Base Color': (0.025, 0.035, 0.05, 1), 'Metallic': 0.6, 'Roughness': 0.32, 'Coat Weight': 1.0, 'Coat Roughness': 0.04})
    micro_bump(nt, b, 2000, 0.01); mats['paint'] = m
    m = new_mat('glass'); principled(m, **{'Base Color': (0.01, 0.012, 0.015, 1), 'Metallic': 0.0, 'Roughness': 0.02, 'Coat Weight': 1.0}); mats['glass'] = m
    m = new_mat('cooler'); nt, b, _ = principled(m, **{'Base Color': (0.2, 0.2, 0.19, 1), 'Roughness': 0.5}); micro_bump(nt, b, 200, 0.05); mats['cooler'] = m
    m = new_mat('tabletop'); nt, b, _ = principled(m, **{'Base Color': (0.22, 0.21, 0.19, 1), 'Roughness': 0.55}); micro_bump(nt, b, 300, 0.04); mats['tabletop'] = m
    m = new_mat('steel_dark'); principled(m, **{'Base Color': (0.02, 0.02, 0.022, 1), 'Metallic': 1, 'Roughness': 0.4}); mats['dark'] = m
    m = new_mat('tire'); nt, b, _ = principled(m, **{'Base Color': (0.01, 0.01, 0.01, 1), 'Roughness': 0.85}); micro_bump(nt, b, 120, 0.2); mats['tire'] = m
    m = new_mat('skin'); principled(m, **{'Base Color': (0.25, 0.15, 0.1, 1), 'Roughness': 0.5, 'Subsurface Weight': 0.3}); mats['skin'] = m
    return mats


def assign_materials(mats):
    """Swap the imported glTF materials for the Cycles set, by the names the browser export gave them."""
    rename = {'plastic': 'plastic', 'alu': 'alu', 'lime': 'lime', 'rubber': 'rubber', 'silver': 'silver', 'latch': 'latch'}
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        for slot in o.material_slots:
            m = slot.material
            if m is None:
                continue
            n = m.name.split('.')[0]
            if n in rename:
                slot.material = mats[rename[n]]
            elif n.startswith('led') or n.startswith('lens'):
                slot.material = mats[n]
            elif n == 'yeti_meshstandard_141518':
                slot.material = mats['yeti_lid']
            elif n == 'yeti_meshstandard_1a1b1e':
                slot.material = mats['plastic']
            elif n.startswith('cable_meshbasic'):
                slot.material = mats['remote_led']
            elif n.startswith('camp_meshphysical'):
                slot.material = mats['paint']
            elif n == 'camp_meshstandard_050608':
                slot.material = mats['glass']
            elif n == 'camp_meshstandard_15161a':
                slot.material = mats['tire'] if 'cyl' in o.data.name.lower() else mats['dark']
            elif n == 'camp_meshstandard_a9a69f':
                slot.material = mats['cooler']
            elif n == 'camp_meshstandard_8e8a83':
                slot.material = mats['tabletop']
            elif n == 'camp_meshstandard_b9cd2b':
                slot.material = mats['lime']
            elif n.startswith('camp_meshstandard') or n.startswith('people_meshstandard'):
                rgb = srgb_to_lin([int(n[-6:][i:i + 2], 16) / 255 for i in (0, 2, 4)])
                key = 'fab_' + n[-6:]
                if key not in mats:
                    mats[key] = mats['fabric'](key, rgb) if not n.endswith('3a2c24') else mats['skin']
                slot.material = mats[key]
            elif n == 'sky_meshstandard_ffffff':
                # printed mast tube: keep the logo texture, anodized everywhere the print isn't
                tex = next((nd for nd in m.node_tree.nodes if nd.type == 'TEX_IMAGE'), None)
                nm = new_mat('brand'); nt, b, _ = principled(nm, **{'Roughness': 0.3, 'Anisotropic': 0.5})
                if tex:
                    ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = tex.image
                    uv = nt.nodes.new('ShaderNodeUVMap')
                    nt.links.new(uv.outputs[0], ti.inputs[0])
                    nt.links.new(ti.outputs['Color'], b.inputs['Base Color'])
                    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
                    nt.links.new(ti.outputs['Color'], inv.inputs[1])
                    nt.links.new(inv.outputs[0], b.inputs['Metallic'])
                slot.material = nm


# ---------------------------------------------------------------- night sky (equirectangular, generated)
def night_sky(path, W=8192, H=4096, band_three=(0.94, 0.35, 0.33), seed=7):
    if os.path.exists(path):
        return
    rng = np.random.default_rng(seed)
    v = (np.arange(H, dtype=np.float32) + 0.5) / H
    u = (np.arange(W, dtype=np.float32) + 0.5) / W
    lat = (v - 0.5) * np.float32(np.pi)            # -pi/2 .. pi/2, row 0 = bottom in Blender images
    lon = (u - 0.5) * np.float32(2 * np.pi)
    LON, LAT = np.meshgrid(lon, lat)
    # Blender equirect: dir = (-cos(lat)cos(lon), -cos(lat)sin(lon), sin(lat)) ... use the documented mapping u = atan2(y,-x)/2pi+.5
    dx = -np.cos(LAT) * np.cos(LON)
    dy = np.cos(LAT) * np.sin(LON)
    dz = np.sin(LAT)
    zen = np.clip(dz, 0, 1)
    sky = np.zeros((H, W, 3), np.float32)
    hor = np.array([0.018, 0.024, 0.048]); top = np.array([0.0016, 0.0028, 0.008])
    t = (zen ** 0.42)[..., None]
    sky[:] = hor * (1 - t) + top * t
    # Milky Way band, converted from the three.js band normal into blender axes
    bn = np.array([band_three[0], -band_three[2], band_three[1]], np.float64); bn /= np.linalg.norm(bn)
    d_band = np.abs(dx * bn[0] + dy * bn[1] + dz * bn[2])
    band = (1 - d_band) ** 6

    def value_noise(shape, cells, s):
        r = np.random.default_rng(s).random((cells[0] + 1, cells[1] + 1))
        yy = np.linspace(0, cells[0], shape[0], endpoint=False); xx = np.linspace(0, cells[1], shape[1], endpoint=False)
        y0 = yy.astype(int); x0 = xx.astype(int); fy = (yy - y0)[:, None]; fx = (xx - x0)[None, :]
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        a = r[y0][:, x0]; b = r[y0][:, x0 + 1]; c = r[y0 + 1][:, x0]; d = r[y0 + 1][:, x0 + 1]
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

    small = (H // 4, W // 4)
    fbm = sum(value_noise(small, (6 * 2 ** i, 12 * 2 ** i), seed + i) * 0.5 ** i for i in range(6)) / 1.9
    dust = sum(value_noise(small, (10 * 2 ** i, 20 * 2 ** i), seed + 50 + i) * 0.5 ** i for i in range(5)) / 1.9
    fbm = np.kron(fbm, np.ones((4, 4)))[:H, :W]; dust = np.kron(dust, np.ones((4, 4)))[:H, :W]
    glow = band * (fbm ** 2.2) * 1.4 * (1 - 0.75 * np.clip((dust - 0.48) * 4, 0, 1)) * np.clip(dz * 4 + 0.2, 0, 1)
    sky += glow[..., None] * np.array([0.032, 0.033, 0.042])
    # Unresolved star grain inside the band: the texture that makes the Milky Way read as stars, not cloud.
    grain = (rng.random((H, W), dtype=np.float32) < 0.006 * (0.15 + band)) * rng.random((H, W), dtype=np.float32)
    sky += (grain * 0.05 * np.clip(dz * 6, 0, 1))[..., None] * np.array([0.9, 0.92, 1.0], np.float32)
    del grain
    # Resolved stars: point sources splatted bilinearly into single texels (sub-pixel on screen), steep magnitude
    # falloff so only a few hundred carry, denser along the band, a little color temperature spread.
    n = 16000
    sl = rng.uniform(-0.1, 1, n); sp = rng.uniform(-np.pi, np.pi, n)
    lat_s = np.arcsin(sl)
    sx = -np.cos(lat_s) * np.cos(sp); sy = np.cos(lat_s) * np.sin(sp); sz = np.sin(lat_s)
    inb = (1 - np.abs(sx * bn[0] + sy * bn[1] + sz * bn[2])) ** 4
    keep = (rng.random(n) < 0.2 + 0.8 * inb) & (lat_s > -0.02)
    lat_s, sp = lat_s[keep], sp[keep]; m = len(lat_s)
    mag = np.minimum(rng.pareto(2.4, m) * 0.5 + 0.02, 6.0) * 1.8
    temp = rng.random(m)
    col = np.where((temp < 0.3)[:, None], [1.0, 0.9, 0.78], np.where((temp > 0.78)[:, None], [0.78, 0.86, 1.0], [1.0, 1.0, 1.0]))
    px = (sp / (2 * np.pi) + 0.5) * W - 0.5; py = (lat_s / np.pi + 0.5) * H - 0.5
    x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = px - x0; fy = py - y0
    for ox, oy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        np.add.at(sky, (np.clip(y0 + oy, 0, H - 1), (x0 + ox) % W), (col * (mag * w)[:, None]).astype(np.float32))
    sky[(dz < -0.01)] = hor * 0.25
    img = bpy.data.images.new('night_sky', W, H, alpha=False, float_buffer=True)
    px = np.ones((H, W, 4), np.float32); px[..., :3] = sky
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path; img.file_format = 'OPEN_EXR'
    img.save()
    # re-save as half-float, zip-compressed: a quarter of the size, no visible difference for a night sky
    sc = bpy.context.scene; s_ = sc.render.image_settings
    s_.file_format = 'OPEN_EXR'; s_.color_depth = '16'; s_.exr_codec = 'ZIP'
    img.save_render(path, scene=sc)
    bpy.data.images.remove(img)


# ---------------------------------------------------------------- terrain, grass, trees, ridge
def fbm2(x, y, seed=0, octaves=5):
    v = np.zeros_like(x); a = 0.5; f = 1.0
    rs = np.random.default_rng(seed).uniform(0, 100, (octaves, 2))
    for i in range(octaves):
        v += a * (np.sin(x * f * 0.013 + rs[i, 0]) * np.cos(y * f * 0.011 + rs[i, 1]) + np.sin((x + y) * f * 0.007 + rs[i, 1]) * 0.5)
        a *= 0.5; f *= 2.03
    return v


def terrain_z(X, Y):
    R = np.hypot(X, Y)
    return fbm2(X, Y, 3) * np.clip((R - 18) / 60, 0, 1) * 2.2 + fbm2(X * 3, Y * 3, 9) * 0.06 * np.clip((R - 6) / 10, 0, 1)


def build_terrain():
    rings = np.concatenate([np.linspace(0, 30, 61), 30 * np.exp(np.linspace(0, np.log(1600 / 30), 70))[1:]])
    seg = 320
    th = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    R, T = np.meshgrid(rings, th, indexing='ij')
    X = R * np.cos(T); Y = R * np.sin(T)
    Z = terrain_z(X, Y) - 0.002
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    faces = []
    nr = len(rings)
    for i in range(nr - 1):
        for j in range(seg):
            a = i * seg + j; b = i * seg + (j + 1) % seg; c = (i + 1) * seg + (j + 1) % seg; d = (i + 1) * seg + j
            faces.append((a, d, c, b))
    me = bpy.data.meshes.new('terrain'); me.from_pydata(verts.tolist(), [], faces); me.update()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new('terrain', me); bpy.context.collection.objects.link(ob)
    m = new_mat('ground'); nt, b, _ = principled(m, **{'Roughness': 0.92})
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.6; n1.inputs['Detail'].default_value = 6
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 9; n2.inputs['Detail'].default_value = 8; n2.inputs['Roughness'].default_value = 0.7
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 60
    for nd in (n1, n2, vor):
        nt.links.new(tc.outputs['Object'], nd.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.018, 0.016, 0.011, 1); ramp.color_ramp.elements[1].color = (0.075, 0.066, 0.04, 1)
    mixf = nt.nodes.new('ShaderNodeMath'); mixf.operation = 'MULTIPLY_ADD'
    nt.links.new(n1.outputs['Fac'], mixf.inputs[0]); mixf.inputs[1].default_value = 0.6
    nt.links.new(n2.outputs['Fac'], mixf.inputs[2])
    nt.links.new(mixf.outputs[0], ramp.inputs[0])
    # Dry meadow thatch beyond the grass disc (what the drone sees), trampled dirt at the rig.
    meadow = nt.nodes.new('ShaderNodeValToRGB')
    meadow.color_ramp.elements[0].color = (0.02, 0.019, 0.008, 1); meadow.color_ramp.elements[1].color = (0.075, 0.064, 0.026, 1)
    nt.links.new(mixf.outputs[0], meadow.inputs[0])
    sxy = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sxy.inputs[0])
    cxy = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(sxy.outputs['X'], cxy.inputs['X']); nt.links.new(sxy.outputs['Y'], cxy.inputs['Y'])
    rl = nt.nodes.new('ShaderNodeVectorMath'); rl.operation = 'LENGTH'; nt.links.new(cxy.outputs[0], rl.inputs[0])
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.interpolation_type = 'SMOOTHSTEP'
    rr.inputs['From Min'].default_value = 1.5; rr.inputs['From Max'].default_value = 7.0
    nt.links.new(rl.outputs['Value'], rr.inputs['Value'])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    # Mix node sockets share names across data types: 0 factor, 6/7 color A/B, output 2 color result
    nt.links.new(rr.outputs[0], mixc.inputs[0]); nt.links.new(ramp.outputs[0], mixc.inputs[6]); nt.links.new(meadow.outputs[0], mixc.inputs[7])
    nt.links.new(mixc.outputs[2], b.inputs['Base Color'])
    bm1 = nt.nodes.new('ShaderNodeBump'); bm1.inputs['Strength'].default_value = 0.35; bm1.inputs['Distance'].default_value = 0.02
    nt.links.new(n2.outputs['Fac'], bm1.inputs['Height'])
    bm2 = nt.nodes.new('ShaderNodeBump'); bm2.inputs['Strength'].default_value = 0.4; bm2.inputs['Distance'].default_value = 0.004
    nt.links.new(vor.outputs['Distance'], bm2.inputs['Height']); nt.links.new(bm1.outputs['Normal'], bm2.inputs['Normal'])
    nt.links.new(bm2.outputs['Normal'], b.inputs['Normal'])
    ob.data.materials.append(m)
    return ob


def blade_clump(name, rng, blades=14, height=(0.12, 0.42), lean=0.35, spread=0.025):
    """A patch of grass blades. Patches are large (dozens of blades) so the meadow needs few instances:
    Cycles re-syncs every instance each frame, and that, not the path tracing, was the cost."""
    bmsh = bmesh.new()
    tone = bmsh.verts.layers.float.new('tone')
    for _ in range(blades):
        h = rng.uniform(*height); w = rng.uniform(0.003, 0.0055); a = rng.uniform(0, 2 * math.pi)
        ox, oy = rng.gauss(0, spread), rng.gauss(0, spread); bend = rng.uniform(0.1, lean); tv = rng.random()
        dirx, diry = math.cos(a), math.sin(a)
        segs = 4; prev = None
        for s in range(segs + 1):
            f = s / segs; z = h * f; off = bend * h * f * f
            ww = w * (1 - f * 0.92)
            px = ox + dirx * off; py = oy + diry * off
            v1 = bmsh.verts.new((px - diry * ww, py + dirx * ww, z)); v2 = bmsh.verts.new((px + diry * ww, py - dirx * ww, z))
            v1[tone] = tv; v2[tone] = tv
            if prev:
                bmsh.faces.new((prev[0], prev[1], v2, v1))
            prev = (v1, v2)
    me = bpy.data.meshes.new(name); bmsh.to_mesh(me); bmsh.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def build_grass(terrain):
    rng = random.Random(11)
    coll = bpy.data.collections.new('grass_blades'); bpy.context.scene.collection.children.link(coll)
    m = new_mat('grass'); nt = m.node_tree
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    info = nt.nodes.new('ShaderNodeObjectInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.035, 0.045, 0.012, 1); ramp.color_ramp.elements[1].color = (0.16, 0.13, 0.05, 1)
    el = ramp.color_ramp.elements.new(0.55); el.color = (0.07, 0.075, 0.022, 1)
    # color per blade (baked "tone") mixed with a per-patch offset
    tone = nt.nodes.new('ShaderNodeAttribute'); tone.attribute_name = 'tone'
    tmix = nt.nodes.new('ShaderNodeMath'); tmix.operation = 'MULTIPLY_ADD'; tmix.inputs[1].default_value = 0.7
    nt.links.new(tone.outputs['Fac'], tmix.inputs[0])
    tsc = nt.nodes.new('ShaderNodeMath'); tsc.operation = 'MULTIPLY'; tsc.inputs[1].default_value = 0.3
    nt.links.new(info.outputs['Random'], tsc.inputs[0]); nt.links.new(tsc.outputs[0], tmix.inputs[2])
    nt.links.new(tmix.outputs[0], ramp.inputs[0])
    dif = nt.nodes.new('ShaderNodeBsdfDiffuse')   # plain diffuse + translucency: half the shading cost of Principled
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(ramp.outputs[0], dif.inputs['Color']); nt.links.new(ramp.outputs[0], tr.inputs['Color'])
    mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = 0.3
    nt.links.new(dif.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    for i in range(8):
        me = blade_clump(f'clump{i}', rng, blades=rng.randint(45, 75), height=(0.06, 0.24 + 0.045 * i), spread=0.07)
        me.materials.append(m)
        ob = bpy.data.objects.new(f'clump{i}', me); coll.objects.link(ob)
    # Emitter: a polar grid out to 50 m that follows the terrain. "density" is patches per m2: dense near the rig,
    # sparse far out where the camera never gets close, with "spread" widening the far patches to keep the
    # ground covered. The meadow then runs under the whole 300 ft pool with few instances.
    rings = np.linspace(0, 50, 101); seg = 160
    th = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    R, T = np.meshgrid(rings, th, indexing='ij'); X = R * np.cos(T); Y = R * np.sin(T)
    Z = terrain_z(X, Y)
    core = 30 - 25 * np.clip((R - 12) / 8, 0, 1) ** 2 * (3 - 2 * np.clip((R - 12) / 8, 0, 1))
    edge = np.clip((50 - R) / 6 + 0.3 * np.sin(X * 0.4) * np.cos(Y * 0.5), 0, 1)
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    faces = [(i * seg + j, (i + 1) * seg + j, (i + 1) * seg + (j + 1) % seg, i * seg + (j + 1) % seg) for i in range(len(rings) - 1) for j in range(seg)]
    me = bpy.data.meshes.new('grass_emitter'); me.from_pydata(verts.tolist(), [], faces); me.update()
    em = bpy.data.objects.new('grass', me); bpy.context.collection.objects.link(em)
    att = me.attributes.new('density', 'FLOAT', 'POINT'); att.data.foreach_set('value', (core * edge).ravel().astype(np.float32))
    att = me.attributes.new('spread', 'FLOAT', 'POINT'); att.data.foreach_set('value', np.sqrt(30 / core).ravel().astype(np.float32))
    ng = bpy.data.node_groups.new('grass_gn', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; Lk = ng.links.new
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    dist = N.new('GeometryNodeDistributePointsOnFaces'); dist.distribute_method = 'RANDOM'
    na = N.new('GeometryNodeInputNamedAttribute'); na.data_type = 'FLOAT'; na.inputs['Name'].default_value = 'density'
    dm = N.new('ShaderNodeMath'); dm.operation = 'MULTIPLY'; dm.inputs[1].default_value = 1.0
    Lk(na.outputs['Attribute'], dm.inputs[0]); Lk(dm.outputs[0], dist.inputs['Density'])
    Lk(gi.outputs[0], dist.inputs['Mesh'])
    ci = N.new('GeometryNodeCollectionInfo'); ci.inputs['Collection'].default_value = coll
    ci.inputs['Separate Children'].default_value = True; ci.inputs['Reset Children'].default_value = True
    iop = N.new('GeometryNodeInstanceOnPoints'); iop.inputs['Pick Instance'].default_value = True
    ri = N.new('FunctionNodeRandomValue'); ri.data_type = 'INT'; ri.inputs['Min'].default_value = 0; ri.inputs['Max'].default_value = 7
    rz = N.new('FunctionNodeRandomValue'); rz.data_type = 'FLOAT_VECTOR'
    rz.inputs['Min'].default_value = (-0.12, -0.12, 0.0); rz.inputs['Max'].default_value = (0.12, 0.12, 6.283); rz.inputs['Seed'].default_value = 3
    rs = N.new('FunctionNodeRandomValue'); rs.data_type = 'FLOAT'; rs.inputs['Min'].default_value = 0.55; rs.inputs['Max'].default_value = 1.35; rs.inputs['Seed'].default_value = 5
    # trampled short around the rig and the camp (height only, so the ground stays covered), full height by 9 m
    pos = N.new('GeometryNodeInputPosition'); sxy = N.new('ShaderNodeSeparateXYZ'); Lk(pos.outputs[0], sxy.inputs[0])
    cxy = N.new('ShaderNodeCombineXYZ'); Lk(sxy.outputs['X'], cxy.inputs['X']); Lk(sxy.outputs['Y'], cxy.inputs['Y'])
    rl = N.new('ShaderNodeVectorMath'); rl.operation = 'LENGTH'; Lk(cxy.outputs[0], rl.inputs[0])
    trample = N.new('ShaderNodeMapRange'); trample.interpolation_type = 'SMOOTHSTEP'
    trample.inputs['From Min'].default_value = 1.0; trample.inputs['From Max'].default_value = 9.0
    trample.inputs['To Min'].default_value = 0.28; trample.inputs['To Max'].default_value = 1.0
    Lk(rl.outputs['Value'], trample.inputs['Value'])
    sm = N.new('ShaderNodeMath'); sm.operation = 'MULTIPLY'; Lk(rs.outputs[1], sm.inputs[0]); Lk(trample.outputs[0], sm.inputs[1])
    spa = N.new('GeometryNodeInputNamedAttribute'); spa.data_type = 'FLOAT'; spa.inputs['Name'].default_value = 'spread'
    sxy_ = N.new('ShaderNodeMath'); sxy_.operation = 'MULTIPLY'; Lk(rs.outputs[1], sxy_.inputs[0]); Lk(spa.outputs['Attribute'], sxy_.inputs[1])
    sv = N.new('ShaderNodeCombineXYZ'); Lk(sxy_.outputs[0], sv.inputs['X']); Lk(sxy_.outputs[0], sv.inputs['Y']); Lk(sm.outputs[0], sv.inputs['Z'])
    Lk(dist.outputs['Points'], iop.inputs['Points']); Lk(ci.outputs[0], iop.inputs['Instance'])
    Lk(ri.outputs[2], iop.inputs['Instance Index']); Lk(rz.outputs[0], iop.inputs['Rotation']); Lk(sv.outputs[0], iop.inputs['Scale'])
    Lk(iop.outputs[0], go.inputs[0])
    mod = em.modifiers.new('grass', 'NODES'); mod.node_group = ng
    try:
        em.cycles.use_motion_blur = False   # static meadow: skip its motion steps
    except Exception:
        pass
    coll.hide_render = True
    for ob in coll.objects:
        ob.hide_render = True
    return em


def build_rain():
    """Rain streaks as instances on a point cloud that falls with scene time; brightest inside the light's cone."""
    rng = np.random.default_rng(5)
    n = 5000
    pts = np.column_stack([rng.uniform(-6.5, 6.5, n), rng.uniform(-6.5, 6.5, n), rng.uniform(0, 6.2, n)])
    me = bpy.data.meshes.new('rain_pts'); me.from_pydata(pts.tolist(), [], []); me.update()
    ob = bpy.data.objects.new('rain', me); bpy.context.collection.objects.link(ob)
    sm = bpy.data.meshes.new('streak')
    w, h = 0.0008, 0.16
    sm.from_pydata([(-w, 0, 0), (w, 0, 0), (w, 0, h), (-w, 0, h), (0, -w, 0), (0, w, 0), (0, w, h), (0, -w, h)], [], [(0, 1, 2, 3), (4, 5, 6, 7)])
    so = bpy.data.objects.new('streak', sm); bpy.context.collection.objects.link(so); so.hide_render = True; so.location = (0, 0, -100)
    m = bpy.data.materials.new('rain')
    try:
        m.use_nodes = True  # noqa
    except Exception:
        pass
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    cx = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(sep.outputs['X'], cx.inputs['X']); nt.links.new(sep.outputs['Y'], cx.inputs['Y'])
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nt.links.new(cx.outputs[0], ln.inputs[0])
    cone = nt.nodes.new('ShaderNodeMath'); cone.operation = 'MULTIPLY_ADD'; cone.inputs[1].default_value = -1.05; cone.inputs[2].default_value = 3.8
    nt.links.new(sep.outputs['Z'], cone.inputs[0])
    ratio = nt.nodes.new('ShaderNodeMath'); ratio.operation = 'DIVIDE'; nt.links.new(ln.outputs['Value'], ratio.inputs[0]); nt.links.new(cone.outputs[0], ratio.inputs[1])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 1.0; mr.inputs['From Max'].default_value = 0.25
    nt.links.new(ratio.outputs[0], mr.inputs['Value'])
    ems = nt.nodes.new('ShaderNodeMath'); ems.operation = 'MULTIPLY'; ems.inputs[1].default_value = 1.1; nt.links.new(mr.outputs[0], ems.inputs[0])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.72, 0.45, 1); nt.links.new(ems.outputs[0], em.inputs['Strength'])
    gl = nt.nodes.new('ShaderNodeBsdfTranslucent'); gl.inputs['Color'].default_value = (0.6, 0.62, 0.65, 1)
    tp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = 0.18; nt.links.new(tp.outputs[0], mx.inputs[1]); nt.links.new(gl.outputs[0], mx.inputs[2])
    add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(mx.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    sm.materials.append(m); no_light_sampling(m)
    ng = bpy.data.node_groups.new('rain_gn', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; Lk = ng.links.new
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    pos = N.new('GeometryNodeInputPosition'); sp = N.new('ShaderNodeSeparateXYZ'); Lk(pos.outputs[0], sp.inputs[0])
    tm = N.new('GeometryNodeInputSceneTime')
    fall = N.new('ShaderNodeMath'); fall.operation = 'MULTIPLY_ADD'; fall.inputs[1].default_value = -7.9
    Lk(tm.outputs['Seconds'], fall.inputs[0]); Lk(sp.outputs['Z'], fall.inputs[2])
    md = N.new('ShaderNodeMath'); md.operation = 'FLOORED_MODULO'; md.inputs[1].default_value = 6.2; Lk(fall.outputs[0], md.inputs[0])
    cb = N.new('ShaderNodeCombineXYZ'); Lk(sp.outputs['X'], cb.inputs['X']); Lk(sp.outputs['Y'], cb.inputs['Y']); Lk(md.outputs[0], cb.inputs['Z'])
    setp = N.new('GeometryNodeSetPosition'); Lk(gi.outputs[0], setp.inputs['Geometry']); Lk(cb.outputs[0], setp.inputs['Position'])
    m2p = N.new('GeometryNodeMeshToPoints'); Lk(setp.outputs[0], m2p.inputs['Mesh'])
    oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = so; oi.transform_space = 'ORIGINAL'
    iop = N.new('GeometryNodeInstanceOnPoints'); Lk(m2p.outputs[0], iop.inputs['Points']); Lk(oi.outputs['Geometry'], iop.inputs['Instance'])
    rz = N.new('FunctionNodeRandomValue'); rz.data_type = 'FLOAT_VECTOR'; rz.inputs['Min'].default_value = (0.05, 0, 0); rz.inputs['Max'].default_value = (0.09, 0, 6.28)
    Lk(rz.outputs[0], iop.inputs['Rotation'])
    Lk(iop.outputs[0], go.inputs[0])
    mod = ob.modifiers.new('rain', 'NODES'); mod.node_group = ng
    return ob


def build_stones():
    """A few hundred small stones and pebbles pressed into the trampled ground around the rig."""
    rng = random.Random(23)
    m = new_mat('stone'); nt, b, _ = principled(m, **{'Roughness': 0.8})
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.03, 0.028, 0.025, 1); ramp.color_ramp.elements[1].color = (0.11, 0.1, 0.088, 1)
    tone = nt.nodes.new('ShaderNodeAttribute'); tone.attribute_name = 'tone'
    nt.links.new(tone.outputs['Fac'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs['Base Color'])
    micro_bump(nt, b, 60, 0.4)
    bm = bmesh.new(); tone = bm.verts.layers.float.new('tone')
    n = 0
    while n < 700:
        r = 7.0 * math.sqrt(rng.random()); a = rng.uniform(0, 2 * math.pi)
        if r < 0.35:
            continue
        sz = 0.006 + 0.03 * rng.random() ** 3
        ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        tv = rng.random(); rz = rng.uniform(0, 6.283); sx = rng.uniform(0.8, 1.3)
        mat = Matrix.Translation((r * math.cos(a), r * math.sin(a), -0.004)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Diagonal((sz * sx, sz, sz * 0.55, 1))
        for v in ret['verts']:
            v.co = mat @ (v.co * rng.uniform(0.85, 1.12)); v[tone] = tv
        n += 1
    me = bpy.data.meshes.new('stones'); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(m)
    ob = bpy.data.objects.new('stones', me); bpy.context.collection.objects.link(ob)
    return ob


def pine_mesh(name, rng):
    """A unit-height spruce: thin trunk, 20-30 whorls of drooping branch fans with ragged tips and gaps,
    so the treeline silhouette breaks up like real conifers instead of stacked cones."""
    bmsh = bmesh.new()
    V = bmsh.verts.new
    # trunk
    ring0 = [V((math.cos(a) * 0.012, math.sin(a) * 0.012, 0)) for a in np.linspace(0, 2 * math.pi, 6, endpoint=False)]
    top = V((0, 0, 1.0))
    for k in range(6):
        bmsh.faces.new((ring0[k], ring0[(k + 1) % 6], top))
    lean = (rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.02))
    sparse = rng.uniform(0.0, 0.25)
    whorls = rng.randint(20, 30)
    for i in range(whorls):
        f = (i + rng.uniform(0, 0.7)) / whorls
        if f > 0.12 and rng.random() < sparse:
            continue
        z = 0.06 + f * 0.9
        R = (0.25 * (1 - f) ** 0.95 + 0.012) * rng.uniform(0.7, 1.2)
        cx, cy = lean[0] * f, lean[1] * f
        nb = rng.randint(5, 9)
        for b in range(nb):
            if rng.random() < 0.12:
                continue
            a = b / nb * 2 * math.pi + rng.uniform(-0.35, 0.35)
            ca, sa = math.cos(a), math.sin(a)
            L = R * rng.uniform(0.55, 1.15)
            droop = L * rng.uniform(0.25, 0.6)
            hb = L * rng.uniform(0.35, 0.6)
            # a vertical fan: wide at the trunk, drooping to a point, with one ragged side spike
            b0 = V((cx, cy, z + hb * 0.35)); b1 = V((cx, cy, z - hb * 0.65))
            tip = V((cx + ca * L, cy + sa * L, z - droop))
            mx = 0.55 * L; side = rng.choice((-1, 1)) * L * rng.uniform(0.12, 0.3)
            sp_ = V((cx + ca * mx - sa * side, cy + sa * mx + ca * side, z - droop * 0.5 + rng.uniform(-0.3, 0.1) * hb))
            mid = V((cx + ca * mx, cy + sa * mx, z - droop * 0.45))
            bmsh.faces.new((b0, b1, tip))
            bmsh.faces.new((mid, sp_, tip))
    me = bpy.data.meshes.new(name); bmsh.to_mesh(me); bmsh.free()
    return me


def far_material(name, base, fogcol):
    """Diffuse that fades to the night haze color with distance: cheap aerial perspective."""
    m = new_mat(name); nt, b, out = principled(m, **{'Base Color': (*base, 1), 'Roughness': 0.85})
    cam = nt.nodes.new('ShaderNodeCameraData')
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 60; mr.inputs['From Max'].default_value = 900
    nt.links.new(cam.outputs['View Distance'], mr.inputs['Value'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*fogcol, 1); em.name = 'FOG'
    mx = nt.nodes.new('ShaderNodeMixShader')
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 0.7
    nt.links.new(mr.outputs[0], pw.inputs[0]); nt.links.new(pw.outputs[0], mx.inputs[0])
    nt.links.new(b.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m


def build_trees():
    rng = random.Random(42)
    m = far_material('pine', (0.006, 0.009, 0.006), (0.006, 0.008, 0.016))
    meshes = [pine_mesh(f'pine{i}', rng) for i in range(8)]
    for me in meshes:
        me.materials.append(m)
    coll = bpy.data.collections.new('trees'); bpy.context.scene.collection.children.link(coll)
    n = 0
    while n < 1100:
        a = rng.uniform(0, 2 * math.pi); d = 80 + (rng.random() ** 0.7) * 170
        # the three.js gap faces -Z there, which is +Y here
        ga = math.atan2(math.sin(a - math.atan2(0.95, -0.31)), math.cos(a - math.atan2(0.95, -0.31)))
        if abs(ga) < 0.35 and d < 130:
            continue
        h = rng.uniform(7, 16)
        ob = bpy.data.objects.new(f'tree{n}', rng.choice(meshes)); coll.objects.link(ob)
        ob.location = (math.cos(a) * d, math.sin(a) * d, -0.2); ob.scale = (h, h, h); ob.rotation_euler.z = rng.uniform(0, 6.28)
        n += 1
    # ridgeline, same profile as the WebGL film
    verts, faces = [], []
    for i in range(361):
        a = i / 360 * 2 * math.pi
        h = 70 + 120 * abs(math.sin(a * 1.7 + 1) * math.sin(a * 3.3 + .4)) ** 1.3 + 25 * math.sin(a * 11 + 2) + 12 * math.sin(a * 23)
        x3, z3 = math.cos(a) * 1300, math.sin(a) * 1300
        verts += [(x3 * FT, -z3 * FT, -20), (x3 * FT, -z3 * FT, h * FT)]
    for i in range(360):
        faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    me = bpy.data.meshes.new('ridge'); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new('ridge', me); coll.objects.link(ob)
    me.materials.append(far_material('ridge', (0.004, 0.005, 0.008), (0.009, 0.012, 0.024)))


# ---------------------------------------------------------------- haze and the drone-shot pool
HAZE_DENSITY = 0.008   # nominal density of the haze pass; post scales it per shot (single scattering is linear here)


def build_haze():
    """A homogeneous night-air sphere around the light. Rendered as its own low-res pass (render.py --pass haze)
    with every surface black, then added in post, because volumes triple the cost of the main pass."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=30, location=(0, 0, 2), segments=48, ring_count=24)
    ob = bpy.context.object; ob.name = 'haze'
    m = bpy.data.materials.new('haze')
    try:
        m.use_nodes = True  # noqa
    except Exception:
        pass
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    pv = nt.nodes.new('ShaderNodeVolumePrincipled'); pv.name = 'PV'
    pv.inputs['Density'].default_value = HAZE_DENSITY; pv.inputs['Anisotropy'].default_value = 0.6
    pv.inputs['Color'].default_value = (0.9, 0.9, 0.92, 1)
    nt.links.new(pv.outputs[0], out.inputs['Volume'])
    ob.data.materials.append(m)
    ob.hide_render = True
    return ob


# ---------------------------------------------------------------- main build
def main():
    frames_path = os.path.join(DATA, 'frames.json')
    data = json.load(open(frames_path))
    F = data['frames']; NF = len(F)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = data['fps']; sc.frame_start = 1; sc.frame_end = NF

    bpy.ops.import_scene.gltf(filepath=os.path.join(DATA, 'scene.glb'))
    for o in list(bpy.data.objects):
        if o.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(o, do_unlink=True)

    # Re-root everything under one feet->meters empty, flattening the glTF hierarchy.
    world = bpy.data.objects.new('FT2M', None); sc.collection.objects.link(world); world.scale = (FT, FT, FT)
    keep_empties = {f'petal{k}_pivot' for k in range(6)}
    imported = [o for o in bpy.data.objects if o is not world]
    mw = {o.name: o.matrix_world.copy() for o in imported}
    for o in imported:
        o.parent = None
    for o in imported:
        if o.type == 'EMPTY' and o.name not in keep_empties:
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        o.parent = world; o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_basis = mw[o.name]
        o.rotation_mode = 'QUATERNION'

    mats = build_materials()
    assign_materials(mats)

    # LED order attribute: hub-to-tip sweep, two rows, from each LED's position along the petal.
    for k in range(6):
        ob = bpy.data.objects[f'petal{k}_leds']; me = ob.data
        attr = me.attributes.new('order', 'FLOAT', 'POINT')
        # one value per LED (an LED is one or more mesh islands): column along the petal, then row
        nv = len(me.vertices); parent = list(range(nv))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]; i = parent[i]
            return i
        for e in me.edges:
            ra, rb = find(e.vertices[0]), find(e.vertices[1])
            if ra != rb:
                parent[ra] = rb
        roots = [find(i) for i in range(nv)]
        isl = {}
        for i, rt in enumerate(roots):
            isl.setdefault(rt, []).append(i)
        cen = {rt: (np.mean([me.vertices[i].co.x for i in ids]), np.mean([me.vertices[i].co.y for i in ids])) for rt, ids in isl.items()}
        xs = sorted({round(c[0], 3) for c in cen.values()}); pitch = (xs[-1] - xs[0]) / max(1, len(xs) - 1)
        led_order = {rt: round((c[0] - xs[0]) / pitch) * 2 + (0 if c[1] < 0 else 1) for rt, c in cen.items()}
        vals = [float(led_order[rt]) for rt in roots]
        attr.data.foreach_set('value', vals)
        # the same order on the lens, by position along the petal axis (linear fit against the LEDs)
        bpy.context.view_layer.update()
        p0 = bpy.data.objects[f'petal{k}_pivot'].matrix_world.translation
        wl = np.array([tuple(ob.matrix_world @ v.co) for v in me.vertices])
        u = wl.mean(0) - np.array(p0); u /= np.linalg.norm(u)
        a_, b_ = np.polyfit((wl - np.array(p0)) @ u, np.array(vals, float), 1)
        lo = bpy.data.objects[f'petal{k}_lens']
        wv = np.array([tuple(lo.matrix_world @ v.co) for v in lo.data.vertices])
        la = lo.data.attributes.new('order', 'FLOAT', 'POINT'); la.data.foreach_set('value', ((wv - np.array(p0)) @ u * a_ + b_).astype(np.float32))

    # Petal area lights, one per petal, emitting along the LED normal.
    lights = []
    for k in range(6):
        ld = bpy.data.lights.new(f'petal{k}_light', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = 0.88; ld.size_y = 0.12
        ld.spread = math.radians(130)
        lo = bpy.data.objects.new(f'petal{k}_light', ld); sc.collection.objects.link(lo)
        lo.parent = bpy.data.objects[f'petal{k}_pivot']; lo.location = (0.55, 0, -0.05)
        lo.visible_camera = False; lo.visible_glossy = False
        lights.append(lo)
    # Pulse along the cable: a slightly fatter copy with an emission band.
    cab = max((o for o in bpy.data.objects if o.name.startswith('cable_') and o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    pulse = cab.copy(); pulse.data = cab.data.copy(); pulse.name = 'cable_pulse'; sc.collection.objects.link(pulse)
    pulse.parent = world; pulse.matrix_parent_inverse = Matrix.Identity(4)
    pm = bpy.data.materials.new('pulse')
    try:
        pm.use_nodes = True  # noqa
    except Exception:
        pass
    nt = pm.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); uv = nt.nodes.new('ShaderNodeUVMap'); sepu = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(uv.outputs[0], sepu.inputs[0])
    prog = nt.nodes.new('ShaderNodeValue'); prog.name = 'PROG'
    d = nt.nodes.new('ShaderNodeMath'); d.operation = 'SUBTRACT'; nt.links.new(sepu.outputs['X'], d.inputs[0]); nt.links.new(prog.outputs[0], d.inputs[1])
    g = nt.nodes.new('ShaderNodeMath'); g.operation = 'MULTIPLY'; nt.links.new(d.outputs[0], g.inputs[0]); nt.links.new(d.outputs[0], g.inputs[1])
    g2 = nt.nodes.new('ShaderNodeMath'); g2.operation = 'MULTIPLY'; g2.inputs[1].default_value = -900; nt.links.new(g.outputs[0], g2.inputs[0])
    ex = nt.nodes.new('ShaderNodeMath'); ex.operation = 'EXPONENT'; nt.links.new(g2.outputs[0], ex.inputs[0])
    inten = nt.nodes.new('ShaderNodeValue'); inten.name = 'INT'
    m3 = nt.nodes.new('ShaderNodeMath'); m3.operation = 'MULTIPLY'; nt.links.new(ex.outputs[0], m3.inputs[0]); nt.links.new(inten.outputs[0], m3.inputs[1])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.55, 1.0, 0.25, 1); nt.links.new(m3.outputs[0], em.inputs['Strength'])
    tp = nt.nodes.new('ShaderNodeBsdfTransparent'); add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tp.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out.inputs['Surface'])
    pulse.data.materials.clear(); pulse.data.materials.append(pm); no_light_sampling(pm)
    # thicken the pulse tube a little around the cable
    sol = pulse.modifiers.new('fat', 'DISPLACE'); sol.strength = 0.012; sol.mid_level = 0.0

    # Studio softbox for the case and Yeti beats; moon; drone-shot pool spot.
    sd = bpy.data.lights.new('studio', 'AREA'); sd.shape = 'DISK'; sd.size = 1.2; sd.color = srgb_to_lin([1.0, 0.95, 0.88])
    studio = bpy.data.objects.new('studio', sd); sc.collection.objects.link(studio)
    tgt = bpy.data.objects.new('studio_tgt', None); sc.collection.objects.link(tgt)
    tr = studio.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    md = bpy.data.lights.new('moon', 'SUN'); md.angle = math.radians(0.55); md.color = (0.55, 0.66, 1.0)
    moon = bpy.data.objects.new('moon', md); sc.collection.objects.link(moon)
    moon.rotation_euler = Vector((-60, 80, 90)).normalized().to_track_quat('Z', 'Y').to_euler()
    pd = bpy.data.lights.new('pool', 'SPOT'); pd.spot_size = math.radians(174); pd.spot_blend = 0.12; pd.shadow_soft_size = 0.4
    pd.color = kelvin_rgb(3250)
    pd.use_nodes = True
    pnt = pd.node_tree; emn = next(n for n in pnt.nodes if n.type == 'EMISSION')
    fo = pnt.nodes.new('ShaderNodeLightFalloff'); fo.inputs['Strength'].default_value = 1.0; fo.inputs['Smooth'].default_value = 0.0
    # constant falloff: a broad, even pool out to the 300 ft claim, layered under the petals' real 1/r^2 light
    pnt.links.new(fo.outputs['Constant'], emn.inputs['Strength'])
    pool = bpy.data.objects.new('pool', pd); sc.collection.objects.link(pool); pool.location = (0, 0, 3.6)

    # World: generated night sky.
    sky_path = os.path.join(DATA, 'night_sky.exr')
    night_sky(sky_path)
    w = bpy.data.worlds.new('night'); sc.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    wn = w.node_tree; wn.nodes.clear()
    wo = wn.nodes.new('ShaderNodeOutputWorld'); bg = wn.nodes.new('ShaderNodeBackground'); bg.name = 'BG'
    et = wn.nodes.new('ShaderNodeTexEnvironment'); et.image = bpy.data.images.load(sky_path)
    wn.links.new(et.outputs['Color'], bg.inputs['Color']); wn.links.new(bg.outputs[0], wo.inputs['Surface'])

    terrain = build_terrain()
    grass = build_grass(terrain)
    build_trees()
    stones = build_stones()
    haze = build_haze()
    rain = build_rain()

    # Camera.
    cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24.0; cd.sensor_width = 24 * 16 / 9
    cd.dof.use_dof = True
    cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.rotation_mode = 'QUATERNION'

    # ---------------------------------------------------------------- bake the animation
    shots = [fr['shot'] for fr in F]
    const_frames = {i for i in range(NF - 1) if shots[i] != shots[i + 1]}
    names = data['names']
    for nm in names:
        ob = bpy.data.objects.get(nm)
        if ob is None:
            continue
        mats_ = [AINV.inverted() @ three_matrix(fr['m'][nm]) @ AINV for fr in F]
        first = mats_[0]
        if all(max(abs(a - b) for ra, rb in zip(mm, first) for a, b in zip(ra, rb)) < 1e-5 for mm in mats_):
            ob.matrix_basis = first; continue
        loc = np.zeros((NF, 3)); rot = np.zeros((NF, 4)); scl = np.zeros((NF, 3)); prev = None
        for i, mm in enumerate(mats_):
            l, q, s = mm.decompose()
            if prev is not None and prev.dot(q) < 0:
                q = Quaternion((-q.w, -q.x, -q.y, -q.z))
            prev = q
            loc[i] = l; rot[i] = (q.w, q.x, q.y, q.z); scl[i] = s
        for j in range(3):
            bake(ob, 'location', j, loc[:, j], const_frames); bake(ob, 'scale', j, scl[:, j], const_frames)
        for j in range(4):
            bake(ob, 'rotation_quaternion', j, rot[:, j], const_frames)

    # camera
    loc = np.zeros((NF, 3)); rot = np.zeros((NF, 4)); lens = np.zeros(NF); sx = np.zeros(NF); sy = np.zeros(NF)
    focus = np.zeros(NF); fstop = np.zeros(NF); clip = np.zeros(NF); prev = None
    for i, fr in enumerate(F):
        M = three_matrix(fr['cam']['m'])
        p = (A4 @ M.to_translation().to_4d()).to_3d() * FT
        R = A3 @ M.to_3x3()
        q = R.to_quaternion()
        if prev is not None and prev.dot(q) < 0:
            q = Quaternion((-q.w, -q.x, -q.y, -q.z))
        prev = q
        loc[i] = p; rot[i] = (q.w, q.x, q.y, q.z)
        lens[i] = 12.0 / math.tan(math.radians(fr['cam']['fov']) / 2)
        shf = fr['cam']['shift']; sx[i] = -shf[0]; sy[i] = shf[1] * 9 / 16
        tgt3 = fr['cam']['target']; tb = Vector((tgt3[0], -tgt3[2], tgt3[1])) * FT
        cfg = SHOT[fr['shot']]
        focus[i] = cfg.get('focus_m') or (tb - p).length
        fstop[i] = cfg['fstop']; clip[i] = max(0.005, fr['cam']['near'] * FT * 0.5)
    for j in range(3):
        bake(cam, 'location', j, loc[:, j], const_frames)
    for j in range(4):
        bake(cam, 'rotation_quaternion', j, rot[:, j], const_frames)
    bake(cd, 'lens', 0, lens, const_frames); bake(cd, 'shift_x', 0, sx, const_frames); bake(cd, 'shift_y', 0, sy, const_frames)
    bake(cd.dof, 'focus_distance', 0, focus, const_frames); bake(cd.dof, 'aperture_fstop', 0, fstop, const_frames)
    bake(cd, 'clip_start', 0, clip, const_frames)

    # lights and materials
    S = [fr['S'] for fr in F]
    pw = np.array([s['power'] for s in S]); kv = [kelvin_rgb(s['kelvin']) for s in S]
    led = np.array([s['led'] if s['led'] else [28] * 6 for s in S], dtype=np.float64)
    petalK = np.array([s['petalK'] for s in S])
    cal = [CAL(SHOT[fr['shot']]) for fr in F]
    for k in range(6):
        on = np.clip(led[:, k] / 28, 0, 1)
        e = pw * on * petalK * np.array([c['petal_w'] for c in cal])
        bake(lights[k].data, 'energy', 0, e, const_frames)
        for j in range(3):
            bake(lights[k].data, 'color', j, np.array([c[j] for c in kv]), const_frames)
        lm = mats[f'led{k}'].node_tree
        bake(lm.nodes['LIT'].outputs[0], 'default_value', 0, led[:, k], const_frames)
        bake(lm.nodes['STR'].outputs[0], 'default_value', 0, np.where(pw > 0, 20 + 160 * pw ** 0.7, 0) * np.array([c['led_k'] for c in cal]), const_frames)
        emc = lm.nodes['EM'].inputs['Color']
        for j in range(3):
            bake(emc, 'default_value', j, np.array([c[j] for c in kv]), const_frames)
        lnt = mats[f'lens{k}'].node_tree; b = lnt.nodes['B']
        bake(lnt.nodes['LIT'].outputs[0], 'default_value', 0, led[:, k], const_frames)
        bake(lnt.nodes['LSTR'].outputs[0], 'default_value', 0, np.where((pw > 0) & (led[:, k] > 0), 1.5 + 9 * pw ** 0.6, 0) * np.array([c['lens_k'] for c in cal]), const_frames)
        for j in range(3):
            bake(b.inputs['Emission Color'], 'default_value', j, np.array([c[j] for c in kv]), const_frames)
    bake(sd, 'energy', 0, np.array([s['studio'] for s in S]) * np.array([c['studio_w'] for c in cal]), const_frames)
    sp = np.array([[s['studioPos'][0], -s['studioPos'][2], s['studioPos'][1]] for s in S]) * FT
    st = np.array([[s['studioTgt'][0], -s['studioTgt'][2], s['studioTgt'][1]] for s in S]) * FT
    for j in range(3):
        bake(studio, 'location', j, sp[:, j], const_frames); bake(tgt, 'location', j, st[:, j], const_frames)
    bake(md, 'energy', 0, np.array([s['moon'] for s in S]) * np.array([c['moon'] for c in cal]), const_frames)
    # Sky strength is NOT keyed: any animation on the world makes Cycles reprocess the 8K sky every frame
    # (2.3 s). render.py sets it directly, only on the four frames where it changes.
    bake(pd, 'energy', 0, np.array([s['pool'] * s['power'] for s in S]) * np.array([c['pool_w'] for c in cal]), const_frames)
    # exposure, white balance and the haze level are applied in post.py, so they can be graded without re-rendering
    pn = pm.node_tree
    bake(pn.nodes['PROG'].outputs[0], 'default_value', 0, np.array([s['pulse'] for s in S]), const_frames)
    bake(pn.nodes['INT'].outputs[0], 'default_value', 0, np.array([s['pulseI'] * 6 for s in S]), const_frames)
    lb = mats['latch'].node_tree.nodes['B']
    bake(lb.inputs['Emission Strength'], 'default_value', 0, np.array([s['latch'] * 6 for s in S]), const_frames)

    # visibility
    def vis(objs, flags):
        for ob in objs:
            bake_bool(ob, 'hide_render', [0.0 if f else 1.0 for f in flags])
    vis([o for o in bpy.data.objects if o.name.startswith(('yeti_', 'cable_'))], [s['yeti'] for s in S])
    vis([o for o in bpy.data.objects if o.name.startswith('camp_')], [s['camp'] for s in S])
    vis([o for o in bpy.data.objects if o.name.startswith('people_')], [s['people'] for s in S])
    vis([o for o in bpy.data.objects if o.name.startswith('case_')], [s['caseOn'] for s in S])
    vis([grass, stones], [s['grass'] for s in S])
    vis([rain], [s['rain'] > 0 for s in S])
    remote = sorted([o for o in bpy.data.objects if o.name.startswith('cable_') and o.material_slots and o.material_slots[0].material == mats['remote_led']], key=lambda o: o.name)
    for i, ob in enumerate(remote):
        bake_bool(ob, 'hide_render', [0.0 if (s['yeti'] and i < s['remote']) else 1.0 for s in S])

    # ---------------------------------------------------------------- render settings
    r = sc.render; cy = sc.cycles
    r.engine = 'CYCLES'; cy.device = 'CPU'
    # main pass resolution; post.py upscales to 1920x1080 and grades
    r.resolution_x = 1280; r.resolution_y = 720; r.resolution_percentage = 100
    # 10 spp + OIDN: indistinguishable from 16 spp here, at 60% of the time (4 CPU cores, ~1,300 frames)
    cy.samples = 10; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.06; cy.adaptive_min_samples = 6
    cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'; cy.denoising_prefilter = 'ACCURATE'
    cy.max_bounces = 3; cy.diffuse_bounces = 1; cy.glossy_bounces = 1; cy.transmission_bounces = 4; cy.volume_bounces = 1; cy.transparent_max_bounces = 8
    cy.caustics_reflective = False; cy.caustics_refractive = False; cy.sample_clamp_indirect = 6; cy.blur_glossy = 1.0
    cy.use_light_tree = False   # nine lights: flat sampling is cheaper and just as clean
    # procedural bump noise above two octaves is invisible at this resolution and costs a fifth of the frame
    for m in bpy.data.materials:
        for n in (m.node_tree.nodes if m.node_tree else []):
            if n.type == 'TEX_NOISE':
                n.inputs['Detail'].default_value = min(n.inputs['Detail'].default_value, 2.0)
    cy.volume_step_rate = 4.0; cy.volume_max_steps = 256
    r.use_persistent_data = True
    r.use_motion_blur = True; r.motion_blur_shutter = 0.5; r.motion_blur_position = 'START'
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    # scene-linear half-float EXR; post.py applies exposure, white balance, AgX
    r.image_settings.file_format = 'OPEN_EXR'; r.image_settings.color_depth = '16'; r.image_settings.exr_codec = 'PIZ'
    r.image_settings.color_mode = 'RGB'
    r.filter_size = 1.2
    out_path = os.path.join(HERE, 'skylight.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out_path, compress=True)
    print('saved', out_path, 'frames', NF)


if __name__ == '__main__':
    main()

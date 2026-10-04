"""Per-shot lens, light and grade calibration for the Cycles film. Index matches SHOTS in src/shots.js.

Baked into skylight.blend by build_scene.py (rebuild after changing):
fstop          aperture for the shot (focus is the shot's look-at target unless focus_m is set)
petal_w        watts per petal area light at full power
led_k, lens_k  multipliers on the visible LED and lens glow
moon, sky      moonlight and night-sky strength multipliers
studio_w       softbox multiplier for the product beats
pool_w         broad fill that carries the light out to the 300 ft claim in the drone shot

Applied by post.py (no re-render needed):
ev             exposure offset in stops on top of the film's own exposure
haze           density of night air around the light (0 = no haze pass for the shot)
wb             white balance in kelvin: the camera is balanced warmer than daylight, as a DP would under 3250K
glare          lens veiling glare amount
"""
BASE = dict(fstop=4.0, ev=0.0, petal_w=55.0, led_k=1.0, lens_k=1.0, haze=0.0, moon=0.35, sky=1.0, studio_w=1.0, pool_w=0.0,
            wb=4400.0, glare=0.035)

SHOT = [
    dict(name='Night', fstop=4.0, ev=0.6, moon=1.6, sky=1.6, wb=5000.0),
    dict(name='Ignition', fstop=2.0, ev=0.4, moon=2.2, sky=1.4, wb=5000.0),
    dict(name='Six petals', fstop=2.8, haze=0.006),
    dict(name='Title', fstop=4.0, haze=0.006),
    dict(name='Hero base', fstop=5.6),
    dict(name='Hero head', fstop=2.8, haze=0.006),
    dict(name='Lumens', fstop=4.0, haze=0.005),
    dict(name='Telescope', fstop=4.0, haze=0.005),
    dict(name='Drone', fstop=11.0, ev=2.0, pool_w=320.0),
    dict(name='Aim', fstop=2.8, haze=0.005),
    dict(name='3250K', fstop=2.8, haze=0.005),
    dict(name='IPX4', fstop=2.0, haze=0.012),
    dict(name='Yeti', fstop=2.8, studio_w=1.0),
    dict(name='Out there', fstop=4.0),
    dict(name='Packs down', fstop=3.5, studio_w=1.0),
    dict(name='Finale', fstop=2.8, haze=0.007),
    dict(name='End', fstop=4.0, haze=0.007),
]


def CAL(cfg):
    out = dict(BASE)
    out.update(cfg)
    return out

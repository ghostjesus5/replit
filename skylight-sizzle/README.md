# Goal Zero Skylight sizzle reel

A 60-second hero film for the Skylight telescoping area light. The product, the campsite and every camera move are real-time 3D (Three.js), composited with Goal Zero's own photography and an original score synthesized in Web Audio.

- `dist/goalzero-skylight-sizzle-60s.mp4` is the master: 1920x1080, 30 fps, H.264 (CRF 18) with 320 kbps AAC, -13 LUFS integrated, -0.4 dB true peak.
- `index.html` plays the film in a browser with chapters and scrubbing. It renders at half resolution while playing so it keeps up, and at full resolution when paused.
- `python3 build.py` bundles `src/` with esbuild and inlines the fonts and photos into `index.html`. Run `npm install` first.
- `node render.mjs` exports the master frame by frame through headless Chromium and ffmpeg. `--stills 9.2,31.5` writes PNG stills. A full render took about 65 minutes on 4 CPU cores with software WebGL. Any machine with a GPU is much faster.

## Path-traced version

`dist/goalzero-skylight-sizzle-60s-cycles.mp4` is the same film with every 3D frame path-traced in Blender Cycles instead of drawn in WebGL: same edit, camera moves, type, callouts and score. It's 1920x1080 at 24 fps, H.264 (CRF 18) with 320 kbps AAC, -13.1 LUFS integrated, -0.4 dB peak. At 124 MB it's over GitHub's 100 MB file limit, so it isn't committed here. Keep it in Drive or another file host, or add it with Git LFS. The light is physical. Six area lights at 3250K do all the work, the haze is real volumetric scattering, and the camera has real depth of field and motion blur. The grade is shot-matched in `cycles/look.py`.

The pipeline lives in `cycles/`. It needs Python 3.11 with `pip install bpy==5.0.1 OpenEXR scipy pillow numpy`, plus Playwright and ffmpeg for the browser steps.

1. `node cycles/export.mjs` pulls the film's geometry (`data/scene.glb`) and every moving part, camera and light state per frame (`data/frames.json`) out of `index.html`. Both are committed, so this step only reruns if the WebGL film changes.
2. `python3 cycles/build_scene.py` builds `skylight.blend` in about 15 seconds. It sets up Cycles materials for the product, an 8K procedural night sky with the Milky Way and point stars, terrain, a 55,000-patch meadow trampled short around the rig, 1,100 spruces, stones, rain, and a haze volume.
3. `sh cycles/render_all.sh` renders, in blocks of 96 frames. Each block gets the main pass (1280x720, 10 samples, OpenImageDenoise), a separate low-res haze pass, and `post.py`, which adds the haze, upscales to 1080p, and applies lens glare, chromatic aberration, vignetting, exposure, white balance and AgX. The script is restartable and skips anything already on disk. A full render takes about 5 hours on 4 CPU cores. A machine with an RTX GPU would do it in minutes.
4. `node cycles/composite.mjs` lays the type, callouts, letterbox, flares and grain over the plates, renders the score, and encodes the master. `--stills 9.2,31.5` writes review frames.

## Concept

**Raise your own sky.** The sun sets on schedule. Your night doesn't have to end with it. The film starts in the dark, fires the Skylight one LED at a time, then proves every claim on the product page with something you can see: the mast climbing to 12 ft, the light reaching 300 ft, the petals aiming, rain falling through the beam.

## Structure

| Time | Act | What happens |
|---|---|---|
| 0:00 | Night | The light stands dark in a field under the Milky Way. "The sun clocks out." Under the head: "You don't have to." |
| 0:07 | Ignition | One click. 28 LEDs fire hub to tip on one petal, then all six chase on and the frame floods to white. |
| 0:10 | Title | Looking straight up at the lit head. SKYLIGHT. |
| 0:12 | Engineering | Plan view of the tripod, then a crane up the mast, with callouts locked to the hardware: stakes, remote, Yeti input, 4 to 12 ft, petals, 168 LEDs at 3250K, IPX4. |
| 0:20 | Drop | Four brightness modes step up to 6,000 lumens. The mast telescopes 4 to 12 ft against a tracked ruler. A drone pulls back to the full 300 ft pool. |
| 0:32 | Control | Petals aim through their 180° range. Cold work-light white shifts to 3250K over the campsite. Rain through the beam for IPX4. |
| 0:42 | Power | A pulse runs up the cable from a Yeti. Runtime on Low: 8, 63, 144, 357 hrs. |
| 0:46 | Out there | Goal Zero's photography: campsite, tailgate, backyard, jobsite. |
| 0:50 | Pack down | Petals fold into a lantern, the mast retracts, it drops into the hard case and the latches close. |
| 0:53 | Finale | From the ground: "Raise your own sky." |
| 0:56 | Lockup | Goal Zero Skylight, goalzero.com. |

## Art direction

- **Palette:** night navy, 3250K warm white (computed from the black-body curve, so the light on screen is the light the product makes), and Goal Zero lime used only as an accent.
- **Type:** Barlow Condensed for statements, Barlow for support lines, IBM Plex Mono for callouts and data.
- **Lens:** 2.39 letterbox for the opening and the finale, opening to full frame at the drop. Anamorphic streaks on the light, soft bloom, film grain, a light filmic grade.
- **Sound:** 120 BPM in A minor. Foley lands on every hardware beat: crickets, the remote click, 28 LED ticks, mast ratchets, petal servos, rain, the power surge, case latches.

## Claims

Every number on screen comes from the goalzero.com Skylight page as pulled October 3, 2026: 6,000 lumens, 4 modes (400 / 1,350 / 3,500 / 6,000 lm at 4 / 12 / 34 / 67 W), 168 LEDs, 6 petals with 180° of travel, 3250K, IPX4, 4 to 12 ft, up to 300 ft, 47.6 in collapsed, 14 lbs, hard case and 12V aux adapter in the box, 3 integrated ground stakes, wired remote, and the published runtime chart on Low (internal battery 8 hrs, Yeti 300 63 hrs, Yeti 700 144 hrs, Yeti 1500 357 hrs). The runtime chart is labeled Low with Yeti sold separately.

## Before release

- The GOAL ZERO wordmark in the title and lockup is typeset in Barlow Condensed as a stand-in. Swap in the official logo files.
- The 3D Skylight is built procedurally from the product photos and the spec sheet dimensions, not from CAD. Proportions and details are close but not exact. Goal Zero's product CAD would replace it cleanly.
- The Yeti is a generic Yeti form, not a specific model.
- The photography at 0:46 is Goal Zero's own gallery imagery. The score is original, so there is nothing to license.

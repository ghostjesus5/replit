# Goal Zero Skylight sizzle reel

66-second, 1920x1080, 24 fps motion piece with an original synthesized score. See `TREATMENT.md` for the creative direction and shot list.

- `dist/goal-zero-skylight-sizzle.mp4` is the H.264/AAC export (loudness normalized to -14 LUFS).
- `dist/index.html` is a self-contained real-time version of the same reel (three.js scene, type, and score all inlined). Open it in a desktop browser and press space or click Play.
- `dist/contact-sheet.jpg` is a frame grid for quick review.

## Source

- `src/model.js` builds the Skylight procedurally (tripod, three-stage telescoping mast, six hinged 28-LED petals) plus the props for each location.
- `src/world.js` is the night environment: sky, stars, terrain, grass, trees, volumetric beams, dust, rain, studio floor.
- `src/main.js` holds the shot list. Every shot is a pure function of time, so a frame at t seconds always renders the same.
- `src/overlay.js` is the 2D layer: supers, HUD readouts, callouts that track the 3D model, letterbox, flare.
- `src/audio.js` is the score (Web Audio), timed to the same event list the picture uses.

## Build and render

```
npm install
node build.mjs                    # bundles src/ into dist/index.html
node render.mjs                   # full MP4 export (Playwright + ffmpeg with libx264)
node render.mjs --stills 16.4,62  # PNG stills to dist/stills/
```

The renderer captures each frame through headless Chromium. On a machine with a GPU it runs much faster than in software rendering.

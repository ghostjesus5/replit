# All In Advertising sizzle reel

70-second motion piece built to the September 2026 brand guidelines (Roboto, All In Blue, All In Gold, Deep Navy, the 60 degree stroke angle from the logomark).

- `index.html` plays the reel in a browser with a Web Audio soundtrack synthesized at 120 BPM. Built from `src/reel.html` by `python3 build.py`, which embeds the Roboto faces and logo geometry.
- `dist/all-in-sizzle-reel.mp4` is the 1920x1080, 30 fps H.264/AAC export.
- `node render.mjs` re-exports the MP4 frame by frame through Playwright and ffmpeg (`pip install imageio-ffmpeg` provides an ffmpeg with libx264). `node render.mjs --stills 10.6,62.8` writes PNG stills.

Every scene is a pure function of time, so the browser version and the MP4 match frame for frame. The chart in the Recovery scene is illustrative and labeled that way on screen.

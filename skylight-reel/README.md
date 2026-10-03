# Goal Zero Skylight ad reel

30-second paid social spot for the Skylight telescoping area light, cut natively in two formats from one timeline.

- `dist/goalzero-skylight-30s-16x9.mp4` is 1920x1080 for YouTube, CTV and feed placements.
- `dist/goalzero-skylight-30s-9x16.mp4` is 1080x1920 for Reels, Stories, TikTok and Shorts. All type stays out of the top 14% and bottom 35% so platform UI never covers it.
- `index.html` plays the reel in a browser with a 16:9 / 9:16 toggle and a Web Audio soundtrack synthesized at 120 BPM. Built from `src/reel.html` by `python3 build.py`, which embeds the Barlow faces and the photos in `src/img/`.
- `node render.mjs` re-exports both MP4s frame by frame through Playwright and ffmpeg (needs libx264 on PATH). `--fmt v` renders one format, `--stills 4.6,14.8` writes PNG stills.

Every scene is a pure function of time, so the browser version and the MP4s match frame for frame.

## Story

| Time | Scene | On screen |
|---|---|---|
| 0:00 | Hook | The sun's down. You're not done. Click, the petals bloom, light floods the frame. |
| 0:03 | Reveal | Skylight, telescoping area light |
| 0:07 | Modes | One button, four modes: 400 / 1,350 / 3,500 / 6,000 lumens |
| 0:11 | Mast | Raise it from 4 to 12 ft, then pull back to a 300 ft pool of light |
| 0:15 | Petals | Aim it where you need it. Each petal tilts up and down 180°. |
| 0:18 | Warm light | Warm 3250K. Bright enough to work, warm enough to hang out. |
| 0:21 | Use cases | Light up the campsite, tailgate, backyard, jobsite. IPX4, hard case included. |
| 0:23 | Runtime | Light for days on a Yeti: 8 / 63 / 144 / 357 hrs on Low |
| 0:27 | End card | Skylight. Light up the night. $399.95, Shop now, goalzero.com |

The spot is written to work with the sound off. Every claim on screen comes from the goalzero.com product page as pulled October 3, 2026, including the runtime chart, which is labeled as Low brightness with Yetis sold separately.

## Before trafficking

- The GOAL ZERO wordmark is typeset in Barlow Condensed as a stand-in. Swap in the official logo files.
- Price is hard-coded at $399.95. Check it against the live page before each flight.
- Photography is Goal Zero's own product and lifestyle imagery. The soundtrack is original and synthesized, so there is nothing to license.

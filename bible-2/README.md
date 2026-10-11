# Bible 2: The Newest Testament

Greybox build of Eden 1-1. The point of this build is to answer one question: does the run feel good on a phone? All the art is placeholder, drawn in code. Nothing here should be judged on looks yet.

## Run it

```
npm install
npm run dev          # local server, open the "Network" URL on your phone (same wifi)
npm run build        # static build in dist/, what Capacitor will wrap later
npm run build:single # one self-contained HTML file in dist-single/, easy to share for playtests
```

## Controls

| Touch | Keyboard | Does |
| --- | --- | --- |
| Tap | Space / Up / W | Jump |
| Tap again in the air | same | Double jump (rainbow trail) |
| Hold while falling | hold the key | Hover on wings, about 1.4 seconds per jump |
| Swipe up | E / L / Shift | Laser eyes, once the meter is full. Wipes the screen. |
| Pause button | P / Esc | Pause |

The miniguns fire on their own. The lower gun tilts down a few degrees so it can hit serpents on the ground. The upper gun handles imps. Landing on an enemy from above kills it and gives your double jump back.

## What's in the greybox

- Eden 1-1, about 40 seconds long. It teaches one verb at a time (jump, double jump, shooting, platforms, hover, laser) and then mixes them.
- Enemies: serpents (ground), imps (flying, throw fireballs), thorn bushes (can't be shot, only jumped or lasered).
- Powers: Loaves and Fishes (spread shot, 10s), Water into Wine (one-hit shield, 10s, the screen wobbles).
- 3 hearts. Pits kill instantly.
- Death screen offers one resurrect per level behind a fake rewarded ad, then a 3, 2, 1 countdown and "HE IS RISEN". The real ad hooks into `src/ads.js`.
- Clear screen with time, halos, kills, and deaths. Best time is saved on the device.

## Where things live

```
src/config.js          every tuning number (speed, jump height, hover, fire rate, laser, enemy HP)
src/levels/eden-1.js   the level, written as a list of "beats"
src/levels/builder.js  turns beats into world coordinates
src/textures.js        placeholder art, one function per sprite
src/scenes/GameScene.js  the run: physics, guns, enemies, laser, death, resurrect
src/scenes/UIScene.js    HUD, menus, and all touch input
src/scenes/TitleScene.js title screen
src/ads.js             rewarded ad stub
```

## Tuning the feel

Start in `src/config.js`. The numbers that matter most:

- `PLAYER.runSpeed` (400). Faster is more exciting and less forgiving.
- `PLAYER.jumpVelocity` and `PLAYER.gravity`. Together they set jump height and hang time.
- `PLAYER.hoverFuelMs` and `PLAYER.hoverMaxFall`. How long and how gently you can float.
- `GUNS.lowerAngleDeg`. How far ahead the lower gun hits ground enemies.
- `LASER.perKill`. How often you get to use laser eyes.

## Editing the level

A level is a list of beats. `flat(10, ...)` is 10 tiles of ground, `gap(4, ...)` is a 4-tile pit. Things go inside a beat with a tile offset:

```js
flat(14, serpent(5), imp(9, 7), thorns(12)),
gap(6, platform(1, 7, 3), halos(0, 6, 5, 2)),
```

Rows count down from the top in 64px tiles. Ground is row 9, so row 7 is a small hop and rows 5 and 6 need a real jump. Rough reach at default tuning: a single jump clears 4 tiles, a double jump about 7, and a double jump plus hover about 14.

## Debug flags

Add these to the URL:

- `?god` enemies can't hurt you (pits still can)
- `?debug` draws hitboxes
- `?autoplay` a simple bot plays the level. Used to prove the level can be finished end to end.

## Next steps

1. Playtest on real phones and tune `config.js` until the run feels right.
2. Lock the Eden 1-1 layout, then build 1-2 through 1-5 and the Serpent boss.
3. Wrap with Capacitor (`npm i @capacitor/core @capacitor/cli`, `npx cap init`, `npx cap add android`, `npx cap add ios`) and swap `src/ads.js` for AdMob rewarded ads.
4. Commission art and music once the greybox is fun. Every sprite key in `textures.js` maps to one asset to replace.

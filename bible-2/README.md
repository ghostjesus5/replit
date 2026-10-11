# Bible 2: The Newest Testament

Greybox build of the full campaign. All the art is placeholder, drawn in code. Judge it on feel and level design, not looks.

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

## What's in the build

Six worlds, 19 levels. Every world has its own look, enemies, and one new idea, and ends in a boss.

| World | Levels | New enemies | New idea |
| --- | --- | --- | --- |
| 1. Eden | In the Beginning, Fruit of Knowledge, East of Eden, **The Serpent** | serpents, imps | crumbling tablets, moving platforms, the Holy Ghost |
| 2. Egypt | The Plagues, Plague of Darkness, **Pharaoh's War Chariot** | frogs, locust swarms, war chariots | hail zones, darkness zones |
| 3. The Red Sea | Walk on Water, Pillar of Fire, **Leviathan** | leaping fish, crabs | deadly water, Walk on Water, Part the Sea |
| 4. Jericho | The Walls, Seven Days of Marching, **Goliath** | brick golems | breakable walls, the trumpet |
| 5. Babel | Many Tongues, The Tower, **The Babbler** | gargoyles that shout scrambled scripture | stacked climbs, everything crumbles |
| 6. Revelation | The Seven Seals, The Seventh Trumpet, **The Four Horsemen** | diving demons | lake of fire, a boss rush ending in the Seven-Headed Beast |

Powers:

- **Holy Ghost** (8s): he turns into a see-through flying ghost. Hold to rise, let go to sink. Passes through walls and enemies, can't be hurt, and never runs out over a pit (it waits for solid ground).
- **Loaves and Fishes** (10s): spread shot.
- **Water into Wine** (10s): one-hit shield, the screen wobbles.
- **Walk on Water** (12s): water turns solid and you run 30% faster on it.
- **Part the Sea**: parts every sea in the next 40 tiles.
- **The Trumpet**: drops every wall in the next 30 tiles.

The powers you need to get past what's ahead (Ghost, Walk on Water, Part the Sea, Trumpet) sit in a pillar of light. Pass through any part of the pillar and it's yours, so a jump can't make you miss one.

Bosses ride along on the right side of the screen while you keep running. Every attack can be answered without stopping: jump it, stay low under it, or shoot it down. They get faster below half health. The laser does big damage to bosses.

There's also a world map with progress saved on the device, an "unlock all levels" switch for playtesters, a Next Level button on the clear screen, and the fake rewarded-ad resurrect from the first build.

## Where things live

```
src/config.js          every tuning number (speed, jump height, hover, fire rate, laser, enemy HP)
src/levels/*.js        one file per world, each level written as a list of "beats"
src/levels/builder.js  turns beats into world coordinates, plus the boss arena generator
src/levels/campaign.js world order and level lookup
src/bosses.js          boss health, attack patterns, and the attack library
src/themes.js          per-world terrain, skies and backdrops
src/textures.js        hero, Eden art, pickups
src/art.js             later enemies, projectiles, power-up icons, bosses
src/scenes/GameScene.js  the run: physics, guns, enemies, laser, death, resurrect
src/scenes/UIScene.js    HUD, menus, and all touch input
src/scenes/TitleScene.js title screen
src/scenes/MapScene.js   world map and level select
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
sea(20, fish(4), fish(11)),
flat(16, wall(4, 5), ghost(1), rain(0, 16, 'hail'), dark(0, 40)),
gap(8, crumble(1, 7, 2), mover(4, 6, 2, { dy: 1.5 })),
```

`builder.js` lists every building block. Boss levels use `arena()`, which lays out a long run with short pits and powers along the way.

Rows count down from the top in 64px tiles. Ground is row 9, so row 7 is a small hop and rows 5 and 6 need a real jump. Rough reach at default tuning: a single jump clears 4 tiles, a double jump about 7, and a double jump plus hover about 14.

## Debug flags

Add these to the URL:

- `?god` enemies can't hurt you (pits still can)
- `?debug` draws hitboxes
- `?level=jericho-2` jumps straight into a level
- `?autoplay` a simple bot plays the level. Used to prove each level can be finished end to end.
- `?headless` runs with no drawing at all, for fast automated tests (`?level=babel-2&autoplay&god&headless`)

## Next steps

1. Playtest on real phones and tune `config.js` until the run feels right.
2. Play every level and boss on a phone and flag anything unfair. The bot proves each level can be finished, not that it's fun.
3. Wrap with Capacitor (`npm i @capacitor/core @capacitor/cli`, `npx cap init`, `npx cap add android`, `npx cap add ios`) and swap `src/ads.js` for AdMob rewarded ads.
4. Commission art and music once the greybox is fun. Every sprite key in `textures.js` maps to one asset to replace.

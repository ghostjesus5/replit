import { TILE, GROUND_Y } from '../config.js';

// Levels are authored as a list of "beats": stretches of ground, pits or sea, each with
// things placed inside them. Reorder or resize beats to redesign a level without
// touching coordinates. `at` is a tile offset from the start of the beat.
// Rows count down from the top of the screen in 64px tiles. The ground surface is row 9,
// so row 8 is "standing height", row 7 needs a hop, rows 5-6 need a real jump.
//
// Rough reach at default tuning: a single jump clears 4 tiles, a double jump about 7,
// a double jump plus hover about 13. Anything longer needs a power.

export const flat = (w, ...things) => ({ kind: 'flat', w, things });
export const gap = (w, ...things) => ({ kind: 'gap', w, things });
// deadly water, unless you can walk on it or the sea has been parted
export const sea = (w, ...things) => ({ kind: 'sea', w, things });

// enemies
export const serpent = (at) => ({ kind: 'enemy', type: 'serpent', at });
export const imp = (at, row = 6) => ({ kind: 'enemy', type: 'imp', at, row });
export const frog = (at) => ({ kind: 'enemy', type: 'frog', at });
export const locust = (at, row = 6) => ({ kind: 'enemy', type: 'locust', at, row });
export const swarm = (at, row = 6, n = 5) => ({ kind: 'swarm', at, row, n });
export const chariot = (at) => ({ kind: 'enemy', type: 'chariot', at });
export const fish = (at) => ({ kind: 'enemy', type: 'fish', at });
export const crab = (at) => ({ kind: 'enemy', type: 'crab', at });
export const golem = (at) => ({ kind: 'enemy', type: 'golem', at });
export const gargoyle = (at, row = 6) => ({ kind: 'enemy', type: 'gargoyle', at, row });
export const demon = (at, row = 6) => ({ kind: 'enemy', type: 'demon', at, row });

// terrain
export const thorns = (at) => ({ kind: 'thorns', at });
export const wall = (at, h = 3) => ({ kind: 'wall', at, h });
export const platform = (at, row, w) => ({ kind: 'platform', at, row, w });
export const crumble = (at, row, w) => ({ kind: 'platform', at, row, w, style: 'crumble' });
// moving platform. dx/dy are travel in tiles, period in ms for a full round trip
export const mover = (at, row, w, { dx = 0, dy = 0, period = 2600 } = {}) => ({ kind: 'platform', at, row, w, style: 'mover', dx, dy, period });

// pickups. Powers default to row 8 so running along the ground collects them.
const pickup = (type) => (at, row = 8) => ({ kind: 'pickup', type, at, row });
export const loaves = pickup('loaves');
export const wine = pickup('wine');
export const ghost = pickup('ghost');
export const walk = pickup('walk');
export const staff = pickup('staff');
export const trumpet = pickup('trumpet');
// A line of halos. `arc` lifts the middle of the line by that many rows.
export const halos = (at, n, row = 8, arc = 0) => ({ kind: 'halos', at, n, row, arc });

// zones: things falling from the sky, or the lights going out. Width can run past the beat.
export const rain = (at, w, shot = 'hail', everyMs = 520) => ({ kind: 'zone', zone: 'rain', at, w, shot, everyMs });
export const dark = (at, w) => ({ kind: 'zone', zone: 'dark', at, w });

export const sign = (at, text) => ({ kind: 'sign', at, text });
export const finish = (at) => ({ kind: 'finish', at });

const rowY = (row) => row * TILE + TILE / 2;
const GROUND_ENEMY_Y = { serpent: 24, frog: 24, chariot: 46, crab: 24, golem: 60 };

// A boss arena: long runs of ground broken by short pits (or seas), with powers along the way.
export function arena(tiles, { gapEvery = 34, gapW = 3, water = false, powers = ['wine', 'loaves'], intro = '' } = {}) {
  const beats = [flat(18, ...(intro ? [sign(6, intro)] : []))];
  let t = 18;
  let i = 0;
  while (t < tiles) {
    const things = [halos(8, 4, 8)];
    if (i % 3 === 1) things.push(pickup(powers[Math.floor(i / 3) % powers.length])(gapEvery - 8));
    beats.push(flat(gapEvery, ...things));
    beats.push(water ? sea(gapW) : gap(gapW));
    t += gapEvery + gapW;
    i++;
  }
  beats.push(flat(80));
  return beats;
}

export function buildLevel(def) {
  const out = {
    id: def.id,
    name: def.name,
    subtitle: def.subtitle,
    theme: def.theme || 'eden',
    boss: def.boss || null,
    startX: (def.startTile ?? 3) * TILE,
    bossStartX: (def.bossStartTile ?? 14) * TILE,
    ground: [],
    seas: [],
    platforms: [],
    enemies: [],
    hazards: [],
    walls: [],
    pickups: [],
    signs: [],
    zones: [],
    finishX: null,
    width: 0,
  };

  let t = 0;
  for (const beat of def.beats) {
    const x0 = t * TILE;
    const x1 = (t + beat.w) * TILE;
    if (beat.kind === 'flat') {
      const last = out.ground[out.ground.length - 1];
      // merge back-to-back flats into one ground segment
      if (last && last.x1 === x0) last.x1 = x1;
      else out.ground.push({ x0, x1 });
    } else if (beat.kind === 'sea') {
      const last = out.seas[out.seas.length - 1];
      if (last && last.x1 === x0) last.x1 = x1;
      else out.seas.push({ x0, x1 });
    }
    for (const th of beat.things) {
      const x = (t + th.at) * TILE + TILE / 2;
      switch (th.kind) {
        case 'enemy': {
          const groundY = GROUND_ENEMY_Y[th.type];
          let y = groundY != null ? GROUND_Y - groundY : rowY(th.row ?? 6);
          if (th.type === 'fish') y = GROUND_Y + 60; // waits under the surface
          out.enemies.push({ type: th.type, x, y });
          break;
        }
        case 'swarm':
          for (let i = 0; i < th.n; i++) {
            out.enemies.push({ type: 'locust', x: x + i * TILE * 0.7, y: rowY(th.row) + (i % 2 ? -26 : 26), phase: i * 0.9 });
          }
          break;
        case 'thorns':
          out.hazards.push({ x, y: GROUND_Y + 4 });
          break;
        case 'wall':
          out.walls.push({ x: (t + th.at) * TILE, h: th.h });
          break;
        case 'platform':
          out.platforms.push({
            x0: (t + th.at) * TILE,
            x1: (t + th.at + th.w) * TILE,
            y: th.row * TILE,
            style: th.style || 'static',
            dx: (th.dx || 0) * TILE,
            dy: (th.dy || 0) * TILE,
            period: th.period || 2600,
          });
          break;
        case 'pickup':
          out.pickups.push({ type: th.type, x, y: rowY(th.row) });
          break;
        case 'halos':
          for (let i = 0; i < th.n; i++) {
            const mid = (th.n - 1) / 2;
            const lift = th.arc && th.n > 1 ? th.arc * (1 - Math.pow((i - mid) / Math.max(mid, 1), 2)) : 0;
            out.pickups.push({ type: 'halo', x: x + i * TILE, y: rowY(th.row - lift) });
          }
          break;
        case 'zone':
          out.zones.push({ kind: th.zone, x0: (t + th.at) * TILE, x1: (t + th.at + th.w) * TILE, shot: th.shot, everyMs: th.everyMs });
          break;
        case 'sign':
          out.signs.push({ x, text: th.text });
          break;
        case 'finish':
          out.finishX = x;
          break;
        default:
          throw new Error(`Unknown level thing: ${th.kind}`);
      }
    }
    t += beat.w;
  }

  out.width = t * TILE;
  if (out.boss) out.finishX = Infinity; // the gate shows up when the boss goes down
  else if (out.finishX == null) out.finishX = out.width - 6 * TILE;
  return out;
}

import { TILE, GROUND_Y } from '../config.js';

// Levels are authored as a list of "beats": stretches of ground or gaps, each with
// things placed inside them. Reorder or resize beats to redesign a level without
// touching coordinates. `at` is a tile offset from the start of the beat.
// Rows count down from the top of the screen in 64px tiles. The ground surface is row 9,
// so row 8 is "standing height", row 7 needs a hop, rows 5-6 need a real jump.

export const flat = (w, ...things) => ({ ground: true, w, things });
export const gap = (w, ...things) => ({ ground: false, w, things });

export const serpent = (at) => ({ kind: 'serpent', at });
export const imp = (at, row = 6) => ({ kind: 'imp', at, row });
export const thorns = (at) => ({ kind: 'thorns', at });
export const platform = (at, row, w) => ({ kind: 'platform', at, row, w });
export const loaves = (at, row = 7) => ({ kind: 'loaves', at, row });
export const wine = (at, row = 7) => ({ kind: 'wine', at, row });
export const sign = (at, text) => ({ kind: 'sign', at, text });
export const finish = (at) => ({ kind: 'finish', at });
// A line of halos. `arc` lifts the middle of the line by that many rows.
export const halos = (at, n, row = 8, arc = 0) => ({ kind: 'halos', at, n, row, arc });

const rowY = (row) => row * TILE + TILE / 2;

export function buildLevel(def) {
  const out = {
    name: def.name,
    subtitle: def.subtitle,
    startX: (def.startTile ?? 3) * TILE,
    ground: [],
    platforms: [],
    enemies: [],
    hazards: [],
    pickups: [],
    signs: [],
    finishX: null,
    width: 0,
  };

  let t = 0;
  for (const beat of def.beats) {
    if (beat.ground) {
      const last = out.ground[out.ground.length - 1];
      // merge back-to-back flats into one ground segment
      if (last && last.x1 === t * TILE) last.x1 = (t + beat.w) * TILE;
      else out.ground.push({ x0: t * TILE, x1: (t + beat.w) * TILE });
    }
    for (const th of beat.things) {
      const x = (t + th.at) * TILE + TILE / 2;
      switch (th.kind) {
        case 'serpent':
          out.enemies.push({ type: 'serpent', x, y: GROUND_Y - 24 });
          break;
        case 'imp':
          out.enemies.push({ type: 'imp', x, y: rowY(th.row) });
          break;
        case 'thorns':
          out.hazards.push({ type: 'thorns', x, y: GROUND_Y + 4 });
          break;
        case 'platform':
          out.platforms.push({ x0: (t + th.at) * TILE, x1: (t + th.at + th.w) * TILE, y: th.row * TILE });
          break;
        case 'loaves':
        case 'wine':
          out.pickups.push({ type: th.kind, x, y: rowY(th.row) });
          break;
        case 'halos':
          for (let i = 0; i < th.n; i++) {
            const mid = (th.n - 1) / 2;
            const lift = th.arc && th.n > 1 ? th.arc * (1 - Math.pow((i - mid) / Math.max(mid, 1), 2)) : 0;
            out.pickups.push({ type: 'halo', x: x + i * TILE, y: rowY(th.row - lift) });
          }
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
  if (out.finishX == null) out.finishX = out.width - 6 * TILE;
  return out;
}

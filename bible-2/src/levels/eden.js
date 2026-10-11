import { flat, gap, serpent, imp, thorns, platform, crumble, mover, loaves, wine, ghost, sign, finish, halos, arena } from './builder.js';
import EDEN_1 from './eden-1.js';

// 1-2 adds crumbling tablets, moving platforms, and the Holy Ghost.
const EDEN_2 = {
  id: 'eden-2',
  name: 'EDEN 1-2',
  subtitle: 'Fruit of Knowledge',
  beats: [
    flat(14, sign(5, 'CRACKED TABLETS CRUMBLE.\nDON\'T DAWDLE.'), halos(9, 4)),
    gap(8, crumble(1, 7, 2), crumble(5, 7, 2), halos(1, 2, 6), halos(5, 2, 6)),
    flat(8, serpent(5)),
    flat(4, sign(1, 'GOLD-TRIMMED TABLETS MOVE.')),
    gap(7, mover(2, 7, 2, { dy: 1.5 }), halos(2, 2, 5)),
    flat(10, imp(5, 6), thorns(7), halos(3, 3, 6, 1)),
    // high road for halos, low road for serpents
    flat(18, platform(2, 6, 4), platform(8, 5, 4), platform(14, 6, 3), halos(2, 4, 5), halos(8, 4, 4), halos(14, 3, 5), serpent(6), serpent(10), thorns(12), serpent(16)),
    gap(4),
    flat(8, sign(2, 'THE HOLY GHOST.\nHOLD TO RISE. LET GO TO SINK.')),
    flat(6, ghost(3)),
    gap(26, halos(2, 6, 5, 2), halos(10, 6, 3, 1), imp(6, 4), imp(10, 7), imp(15, 5), imp(20, 3), halos(18, 6, 6)),
    flat(12, loaves(2), serpent(6), serpent(8), serpent(10)),
    flat(10, thorns(2), thorns(5)),
    gap(5, mover(1, 7, 2, { dx: 1.5, period: 2000 })),
    flat(6, imp(4, 6)),
    gap(9, crumble(1, 7, 2), mover(4, 6, 2, { dy: 1 }), crumble(7, 7, 2)),
    flat(12, serpent(4), imp(7, 5), serpent(9), imp(10, 7)),
    gap(6, halos(0, 6, 5, 2)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

// 1-3: everything at once, stacked routes, a longer flight.
const EDEN_3 = {
  id: 'eden-3',
  name: 'EDEN 1-3',
  subtitle: 'East of Eden',
  beats: [
    flat(12, sign(5, 'NO MORE SIGNS.\nYOU KNOW WHAT TO DO.'), halos(8, 4)),
    gap(6, mover(1, 7, 2, { dy: 1.5 }), mover(4, 6, 2, { dy: -1.5 })),
    flat(6, thorns(3)),
    gap(4),
    flat(8, serpent(3), serpent(5), imp(6, 6)),
    flat(16, platform(1, 7, 3), platform(5, 6, 3), platform(9, 5, 3), platform(13, 6, 3), halos(1, 3, 6), halos(5, 3, 5), halos(9, 3, 4), halos(13, 3, 5), thorns(3), thorns(4), thorns(8), thorns(11), thorns(12), imp(10, 7)),
    gap(5, halos(0, 5, 6, 1)),
    flat(10, wine(2), imp(5, 5), imp(7, 7), serpent(8)),
    gap(7, crumble(2, 7, 3)),
    flat(6),
    gap(10, mover(1, 7, 2, { dx: 2, period: 2200 }), mover(6, 6, 2, { dy: 1.5 }), halos(1, 9, 5)),
    flat(12, serpent(3), thorns(6), serpent(8), imp(10, 6)),
    flat(6, ghost(3)),
    gap(30, imp(4, 7), imp(7, 4), imp(10, 6), imp(14, 3), imp(17, 7), imp(20, 5), imp(24, 4), halos(2, 8, 5), halos(12, 8, 4, 1), halos(22, 6, 6)),
    flat(10, loaves(2), serpent(5), serpent(6), serpent(7), serpent(8)),
    gap(4),
    flat(5, thorns(2)),
    gap(5),
    flat(5),
    gap(6, platform(2, 7, 2)),
    flat(10, imp(3, 6), imp(5, 5), imp(7, 7), imp(9, 6)),
    gap(7, halos(0, 7, 5, 2)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const EDEN_BOSS = {
  id: 'eden-boss',
  name: 'EDEN 1-4',
  subtitle: 'The Serpent',
  boss: 'serpent',
  beats: arena(520, { intro: 'IT\'S THE SNAKE.\nYOU KNOW THE ONE.' }),
};

export default [EDEN_1, EDEN_2, EDEN_3, EDEN_BOSS];

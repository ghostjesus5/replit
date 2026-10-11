import { flat, gap, serpent, imp, thorns, platform, loaves, wine, sign, finish, halos } from './builder.js';

// Eden 1-1. Teaches one verb at a time, then mixes them.
// Target length is about 50 seconds at default run speed.
export default {
  id: 'eden-1',
  name: 'EDEN 1-1',
  subtitle: 'In the Beginning',
  startTile: 3,
  beats: [
    // jump
    flat(16, sign(7, 'TAP TO JUMP'), halos(10, 4)),
    flat(10, thorns(5), halos(4, 3, 7, 1)),
    flat(5),
    gap(3, halos(0, 3, 6)),
    flat(10, halos(3, 4)),

    // double jump
    flat(6, sign(1, 'TAP AGAIN IN THE AIR\nTO DOUBLE JUMP')),
    gap(6, halos(0, 6, 5, 2)),

    // shooting
    flat(13, sign(2, 'THE MINIGUNS FIRE ON THEIR OWN.\nYOU\'RE WELCOME.'), serpent(9), serpent(12)),
    flat(10, thorns(3)),
    gap(3),
    flat(14, serpent(5), imp(9, 7), imp(12, 5)),

    // stone tablets over the pits
    flat(6),
    gap(5, platform(1, 7, 3), halos(1, 3, 6)),
    flat(4),
    gap(6, platform(1, 6, 2), platform(4, 7, 2), halos(1, 2, 5), halos(4, 2, 6)),
    flat(11, loaves(2), serpent(6), serpent(8), serpent(10)),
    flat(12, imp(4, 6), imp(7, 7), imp(10, 5), thorns(9)),

    // hover
    flat(6, sign(1, 'HOLD TO HOVER')),
    gap(10, halos(0, 10, 6)),
    flat(12, serpent(6), thorns(9), imp(10, 6)),

    // laser eyes
    flat(6, sign(1, 'LASER EYES CHARGED?\nSWIPE UP')),
    flat(16, wine(1), imp(5, 6), imp(7, 5), imp(9, 7), serpent(8), thorns(11), serpent(13), serpent(14)),

    // final stretch
    gap(4),
    flat(8, imp(5, 6)),
    gap(5, platform(1, 6, 3), halos(1, 3, 5)),
    flat(8, thorns(3)),
    gap(7, halos(0, 7, 5, 1)),
    flat(10, serpent(4), serpent(6), imp(8, 6)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

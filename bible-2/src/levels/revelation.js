import { flat, gap, sea, demon, imp, swarm, golem, thorns, wall, platform, crumble, mover, loaves, wine, ghost, walk, sign, finish, halos, rain, dark, arena } from './builder.js';

const REV_1 = {
  id: 'revelation-1',
  name: 'REVELATION 6-1',
  subtitle: 'The Seven Seals',
  beats: [
    flat(14, sign(6, 'THIS IS THE END.\nDEMONS DIVE AT YOU.'), halos(10, 3)),
    flat(12, demon(6, 5), demon(10, 6)),
    gap(5, halos(0, 5, 6, 1)),
    flat(14, rain(0, 14, 'ember'), demon(8, 4), thorns(5), thorns(10)),
    sea(4),
    flat(10, sign(1, 'A LAKE OF FIRE.\nSAME RULES AS WATER.'), golem(7)),
    flat(4, walk(2)),
    sea(18, demon(6, 5), demon(12, 4), halos(2, 14, 8)),
    flat(10, swarm(5, 6, 6), thorns(8)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(12, wine(1), dark(3, 34), demon(6, 6), imp(8, 5), halos(3, 9, 8)),
    gap(5, crumble(1, 7, 3)),
    flat(10, golem(4), demon(7, 4), wall(9, 3)),
    gap(4),
    flat(6, ghost(3)),
    gap(30, demon(4, 5), demon(9, 3), demon(14, 6), demon(19, 4), demon(24, 5), halos(2, 8, 5), halos(14, 8, 4, 1)),
    flat(14, loaves(2), rain(0, 14, 'ember', 420), swarm(6, 5, 6), golem(10)),
    gap(6, platform(1, 7, 2), platform(4, 6, 2)),
    flat(10, demon(4, 6), demon(6, 4), thorns(8)),
    gap(7, halos(0, 7, 5, 2)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const REV_2 = {
  id: 'revelation-2',
  name: 'REVELATION 6-2',
  subtitle: 'The Seventh Trumpet',
  beats: [
    flat(12, halos(6, 4)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(10, demon(5, 5), golem(8)),
    sea(6, mover(2, 7, 2, { dx: 1.5, period: 2000 })),
    flat(14, rain(0, 14, 'ember'), platform(2, 6, 4), platform(8, 6, 4), thorns(3), thorns(4), thorns(9), thorns(10), demon(12, 4), halos(2, 4, 5), halos(8, 4, 5)),
    flat(4, walk(2)),
    sea(22, demon(5, 5), demon(10, 3), demon(15, 6), imp(19, 4), halos(2, 18, 8)),
    flat(10, wine(1), wall(5, 5), demon(8, 4)),
    gap(8, crumble(1, 7, 2), mover(4, 6, 2, { dy: 1.5 })),
    flat(12, dark(0, 40), golem(4), demon(6, 5), thorns(9), halos(0, 8, 8)),
    gap(6, halos(0, 6, 5, 2)),
    flat(10, swarm(4, 6, 6), demon(8, 4), halos(0, 6, 8)),
    gap(5, platform(1, 7, 3)),
    flat(8, ghost(4)),
    gap(32, demon(3, 4), demon(7, 6), demon(11, 3), demon(15, 5), demon(19, 7), demon(23, 4), demon(27, 6), halos(2, 8, 5), halos(16, 10, 4, 1)),
    flat(14, loaves(2), rain(0, 14, 'ember', 380), golem(6), demon(9, 5), golem(12)),
    sea(5),
    flat(8, wall(4, 4), demon(6, 6)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const REV_BOSS = {
  id: 'revelation-boss',
  name: 'REVELATION 6-3',
  subtitle: 'The Four Horsemen',
  boss: 'apocalypse',
  beats: arena(1000, { powers: ['wine', 'loaves', 'wine'], intro: 'FOUR HORSEMEN.\nTHEN THE BEAST.\nGOOD LUCK.' }),
};

export default [REV_1, REV_2, REV_BOSS];

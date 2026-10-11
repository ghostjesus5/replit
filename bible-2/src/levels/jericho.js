import { flat, gap, golem, imp, thorns, wall, platform, crumble, mover, loaves, wine, ghost, trumpet, sign, finish, halos, arena } from './builder.js';

const JERICHO_1 = {
  id: 'jericho-1',
  name: 'JERICHO 4-1',
  subtitle: 'The Walls',
  beats: [
    flat(14, sign(5, 'WALLS STOP YOU COLD.\nSHOOT THEM DOWN.'), halos(10, 3)),
    flat(8, wall(5, 2)),
    flat(10, wall(5, 4)),
    gap(4),
    flat(12, golem(6), wall(10, 3)),
    flat(10, sign(2, 'SOUND THE TRUMPET.'), trumpet(6)),
    flat(16, wall(3, 5), wall(7, 5), wall(11, 5), imp(9, 4)),
    gap(5, platform(1, 7, 3)),
    flat(12, golem(4), golem(9), thorns(6)),
    flat(10, platform(2, 5, 5), wall(4, 3), halos(2, 5, 4)),
    gap(6, mover(2, 7, 2, { dy: 1.5 })),
    flat(14, loaves(1), wall(5, 4), golem(8), wall(12, 2)),
    flat(8, sign(1, 'GHOSTS GO THROUGH WALLS.')),
    flat(6, ghost(3)),
    flat(30, wall(4, 6), wall(9, 6), wall(14, 6), wall(19, 6), wall(24, 6), imp(7, 4), imp(17, 3), halos(2, 26, 4)),
    flat(10, golem(5), imp(7, 6)),
    gap(5),
    flat(8, wall(4, 3), imp(6, 5)),
    gap(7, crumble(2, 7, 3)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const JERICHO_2 = {
  id: 'jericho-2',
  name: 'JERICHO 4-2',
  subtitle: 'Seven Days of Marching',
  beats: [
    flat(12, halos(6, 4)),
    flat(10, wall(3, 2), wall(7, 3)),
    gap(4, halos(0, 4, 6, 1)),
    flat(16, platform(1, 6, 4), platform(7, 4, 4), wall(5, 5), wall(11, 5), halos(7, 4, 3), golem(14)),
    gap(6, mover(1, 7, 2, { dx: 1.5, period: 2000 }), mover(4, 6, 2, { dy: 1 })),
    flat(10, wine(2), wall(6, 4), imp(8, 5)),
    flat(12, golem(3), golem(7), thorns(5), thorns(9)),
    flat(6, trumpet(3)),
    flat(20, wall(2, 5), wall(5, 5), wall(8, 5), wall(11, 5), wall(14, 5), wall(17, 5)),
    gap(5, crumble(1, 7, 3)),
    flat(10, loaves(2), golem(5), golem(6), golem(8)),
    gap(7, halos(0, 7, 5, 2)),
    flat(14, wall(4, 3), imp(6, 4), wall(9, 4), imp(11, 6)),
    flat(6, ghost(3)),
    gap(24, imp(4, 6), imp(8, 3), imp(12, 7), imp(16, 4), imp(20, 6), halos(2, 8, 5), halos(14, 8, 4, 1)),
    flat(12, wall(3, 4), golem(6), wall(9, 2)),
    gap(6, platform(1, 7, 2), platform(4, 6, 2)),
    flat(12, wall(2, 6), wall(6, 6), imp(9, 5), trumpet(0)),
    gap(5),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const JERICHO_BOSS = {
  id: 'jericho-boss',
  name: 'JERICHO 4-3',
  subtitle: 'Goliath',
  boss: 'goliath',
  beats: arena(600, { intro: 'HE\'S BIG.\nYOU HAVE TWO MINIGUNS.' }),
};

export default [JERICHO_1, JERICHO_2, JERICHO_BOSS];

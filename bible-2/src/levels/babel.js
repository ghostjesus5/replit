import { flat, gap, gargoyle, golem, thorns, wall, platform, crumble, mover, loaves, wine, ghost, trumpet, sign, finish, halos, arena } from './builder.js';

const BABEL_1 = {
  id: 'babel-1',
  name: 'BABEL 5-1',
  subtitle: 'Many Tongues',
  beats: [
    flat(14, sign(6, 'NOBODY UP HERE SPEAKS\nTHE SAME LANGUAGE.'), halos(10, 3)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(8, gargoyle(5, 6)),
    gap(8, mover(1, 7, 2, { dy: 1.5 }), mover(5, 6, 2, { dx: 1, period: 2000 })),
    flat(10, gargoyle(4, 5), gargoyle(8, 7), thorns(6)),
    flat(14, platform(1, 7, 3), platform(5, 5, 3), platform(9, 3, 3), halos(9, 3, 2), gargoyle(12, 4), thorns(3), thorns(7)),
    gap(5),
    flat(10, wine(2), golem(6), gargoyle(8, 6)),
    gap(10, crumble(1, 7, 2), crumble(4, 6, 2), crumble(7, 7, 2), halos(1, 8, 5)),
    flat(8, gargoyle(3, 6), gargoyle(6, 4)),
    flat(6, ghost(3)),
    gap(30, gargoyle(4, 3), gargoyle(9, 6), gargoyle(14, 4), gargoyle(19, 7), gargoyle(24, 3), halos(2, 8, 5), halos(16, 8, 5, 1)),
    flat(12, loaves(2), gargoyle(5, 6), gargoyle(7, 5), gargoyle(9, 7), thorns(10)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(10, wall(4, 4), gargoyle(7, 5)),
    gap(6, crumble(2, 7, 3)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const BABEL_2 = {
  id: 'babel-2',
  name: 'BABEL 5-2',
  subtitle: 'The Tower',
  beats: [
    flat(12, halos(6, 4)),
    gap(7, crumble(1, 7, 2), crumble(4, 5, 2)),
    flat(6, gargoyle(4, 6)),
    // the climb: tiers of tablets with walls below
    flat(20, platform(1, 7, 3), platform(4, 5, 3), platform(7, 3, 4), platform(12, 5, 3), platform(16, 7, 3), wall(5, 3), wall(10, 4), wall(15, 3), halos(7, 4, 2), halos(12, 3, 4), gargoyle(9, 5)),
    gap(6, mover(1, 7, 2, { dx: 1.5, period: 2000 }), mover(4, 6, 2, { dy: -1.5 })),
    flat(8, golem(4), gargoyle(6, 4)),
    gap(9, crumble(1, 7, 2), crumble(4, 6, 1), crumble(6, 7, 2), halos(1, 7, 5)),
    flat(10, wine(1), wall(4, 5), gargoyle(7, 6), trumpet(0)),
    flat(14, thorns(3), thorns(4), golem(7), thorns(10), thorns(11), gargoyle(8, 4)),
    gap(5, platform(1, 6, 3)),
    flat(6, ghost(3)),
    flat(30, wall(4, 6), wall(10, 6), wall(16, 6), wall(22, 6), gargoyle(7, 3), gargoyle(13, 5), gargoyle(19, 3), gargoyle(25, 6), halos(2, 26, 4)),
    gap(6, mover(2, 7, 2, { dy: 1 })),
    flat(12, loaves(2), golem(6), gargoyle(8, 6), gargoyle(10, 4)),
    gap(8, crumble(1, 7, 2), mover(4, 6, 2, { dy: 1.5 })),
    flat(8, thorns(3), gargoyle(5, 6)),
    gap(7, halos(0, 7, 5, 2)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const BABEL_BOSS = {
  id: 'babel-boss',
  name: 'BABEL 5-3',
  subtitle: 'The Babbler',
  boss: 'babbler',
  beats: arena(600, { intro: 'THE TOWER HAS\nA LOT TO SAY.' }),
};

export default [BABEL_1, BABEL_2, BABEL_BOSS];

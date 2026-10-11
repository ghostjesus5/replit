import { flat, gap, frog, swarm, chariot, thorns, platform, crumble, mover, loaves, wine, ghost, sign, finish, halos, rain, dark, arena } from './builder.js';

const EGYPT_1 = {
  id: 'egypt-1',
  name: 'EGYPT 2-1',
  subtitle: 'The Plagues',
  beats: [
    flat(14, sign(5, 'PLAGUE OF FROGS.\nTHEY HOP.'), halos(9, 4)),
    flat(12, frog(4), frog(7), frog(10)),
    gap(4, halos(0, 4, 6, 1)),
    flat(10, sign(1, 'PLAGUE OF LOCUSTS.'), swarm(6, 6, 5), thorns(8)),
    gap(5, platform(1, 7, 3)),
    flat(14, sign(1, 'PLAGUE OF HAIL.'), rain(3, 12, 'hail'), frog(7), frog(11)),
    flat(10, sign(2, 'WAR CHARIOT.\nSHOOT IT OR JUMP IT.'), chariot(9)),
    flat(12, chariot(10), halos(2, 4, 7, 1)),
    gap(6, halos(0, 6, 5, 2)),
    flat(12, loaves(2), swarm(6, 5, 6), swarm(9, 7, 4), frog(10)),
    flat(16, platform(2, 7, 4), platform(7, 5, 4), platform(12, 7, 3), rain(0, 16, 'hail'), halos(7, 4, 4), thorns(4), thorns(9), frog(13)),
    gap(4),
    flat(8, chariot(7), swarm(4, 5, 4)),
    flat(6, ghost(3)),
    gap(28, swarm(4, 4, 6), swarm(12, 6, 6), swarm(20, 3, 6), halos(2, 8, 5), halos(14, 8, 4, 1)),
    flat(14, chariot(6), frog(8), frog(9), frog(10), thorns(12)),
    gap(5),
    flat(6, wine(2)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(12, swarm(4, 6, 8), chariot(11)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const EGYPT_2 = {
  id: 'egypt-2',
  name: 'EGYPT 2-2',
  subtitle: 'Plague of Darkness',
  beats: [
    flat(12, halos(6, 4)),
    flat(10, frog(4), frog(6), swarm(8, 6, 5)),
    gap(5, platform(1, 7, 3)),
    flat(8, sign(2, 'PLAGUE OF DARKNESS.\nTRUST THE HALOS.')),
    flat(14, dark(0, 66), halos(0, 14, 8), frog(6), thorns(9)),
    gap(4, halos(0, 4, 6, 1)),
    flat(10, thorns(4), halos(0, 3, 8), halos(3, 2, 6), halos(5, 5, 8), chariot(9)),
    gap(6, halos(0, 6, 5, 2)),
    flat(10, swarm(5, 6, 5), frog(8), halos(0, 10, 8)),
    gap(5, mover(1, 7, 2, { dy: 1 }), halos(1, 2, 6)),
    flat(12, rain(0, 12, 'hail'), loaves(2), chariot(11), halos(4, 6, 8)),
    flat(14, platform(2, 6, 3), platform(7, 6, 3), thorns(3), thorns(4), thorns(8), thorns(9), frog(12), halos(2, 3, 5), halos(7, 3, 5)),
    gap(4),
    flat(6, ghost(3)),
    gap(30, swarm(4, 5, 6), swarm(11, 3, 6), swarm(18, 7, 6), swarm(24, 5, 6), halos(2, 8, 4), halos(16, 8, 6)),
    flat(16, chariot(4), chariot(10), chariot(15), rain(0, 16, 'hail', 420)),
    gap(7, crumble(2, 7, 3)),
    flat(10, dark(0, 34), frog(3), frog(5), thorns(8), halos(0, 7, 8)),
    gap(5, halos(0, 5, 6, 1)),
    flat(10, swarm(4, 6, 6), thorns(7), halos(0, 6, 8)),
    gap(6, halos(0, 6, 5, 2)),
    flat(10, wine(1), frog(4), chariot(9)),
    gap(4),
    flat(22, finish(10), halos(2, 6)),
  ],
};

const EGYPT_BOSS = {
  id: 'egypt-boss',
  name: 'EGYPT 2-3',
  subtitle: "Pharaoh's War Chariot",
  boss: 'chariot',
  beats: arena(560, { intro: 'THE CHARIOT HAS\nNOBODY DRIVING IT.\nTHAT\'S WORSE.' }),
};

export default [EGYPT_1, EGYPT_2, EGYPT_BOSS];

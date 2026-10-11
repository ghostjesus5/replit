// Book of Mormon campaign: "Another Testament". Worlds look like WORLDS in campaign.js.
// Joseph Smith rides a tapir. The tapir has been told it is a horse.
import {
  flat, gap, sea, serpent, imp, frog, locust, swarm, chariot, fish, crab, golem, gargoyle, demon,
  thorns, wall, platform, crumble, mover, loaves, wine, ghost, walk, staff, sign, finish, halos, rain, dark, arena,
} from './builder.js';

const HERO = { prefix: 'joseph', gun: 'pepperbox', laserText: 'PEEP STONE ENGAGED.' };

const ENEMY_SKINS = {
  serpent: 'bomhorse',
  imp: 'bomsalamander',
  frog: 'curelom',
  locust: 'bombee',
  chariot: 'bomelephant',
  crab: 'cumom',
  golem: 'bomplates',
  gargoyle: 'bomtablet',
  demon: 'bommummy',
  fish: 'bomsword',
};

const PICKUP_SKINS = {
  loaves: { tex: 'seerstone', text: 'SEER STONE. PUT IT IN THE HAT.' },
  wine: { tex: 'urim', text: 'URIM AND THUMMIM. DIVINE SPECTACLES.' },
  ghost: { tex: 'spiritualeyes', text: 'SPIRITUAL EYES. SEE ANYTHING.' },
  walk: { tex: 'bargestone', text: 'GLOWING BARGE STONE. WATER IS OPTIONAL.' },
  staff: { tex: 'liahona', text: 'LIAHONA. A COMPASS. CENTURIES EARLY.' },
  trumpet: { tex: 'bomtrumpet', text: 'ANGEL TRUMPET. GOLD LEAF EXTRA.' },
  halo: { tex: 'bomplate', text: "TRUST ME, THEY'RE HERE" },
};

const lvl = (def) => ({ hero: HERO, enemySkins: ENEMY_SKINS, pickupSkins: PICKUP_SKINS, ...def });

// ---------------------------------------------------------------- world 1
const PALMYRA_1 = lvl({
  id: 'bom-palmyra-1',
  name: 'PALMYRA 1-1',
  subtitle: 'Glass Looker',
  beats: [
    flat(14, sign(5, 'JOSEPH SMITH.\nTREASURE SEER.\nEST. 1826.'), halos(9, 4)),
    flat(10, serpent(6)),
    gap(4),
    flat(12, sign(1, 'HORSES IN ANCIENT\nAMERICA? APOLOGISTS\nSAY: TAPIRS.'), serpent(7), thorns(10)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(14, sign(1, 'THIS IS A TAPIR.\nIT IS NOW A HORSE.'), platform(4, 6, 3), platform(9, 5, 3), halos(4, 3, 5), halos(9, 3, 4), imp(11, 5)),
    flat(10, sign(1, 'THE TREASURE SLIDES\nAWAY UNDERGROUND.\nCLASSIC TREASURE.'), frog(6)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(12, loaves(1), sign(4, 'THE WHITE SALAMANDER.\nGUARDS THE TREASURE.\nHAS NOTES.'), imp(8, 5), serpent(10)),
    flat(8, sign(1, 'SPIRITUAL EYES.\nFOR SEEING THINGS\nOTHERS CANNOT.'), ghost(5)),
    gap(24, imp(5, 4), imp(12, 6), imp(18, 5), halos(2, 8, 5), halos(14, 8, 5, 1)),
    flat(12, wine(2), crab(6), thorns(9)),
    sea(4),
    flat(10, wall(4, 3), serpent(7)),
    gap(5, halos(0, 5, 6, 1)),
    flat(22, sign(3, 'THE PLATES ARE HERE.\nYOU JUST CANNOT\nSEE THEM.'), finish(10), halos(5, 4)),
  ],
});

const PALMYRA_2 = lvl({
  id: 'bom-palmyra-2',
  name: 'PALMYRA 1-2',
  subtitle: 'The Hat',
  beats: [
    flat(12, sign(5, 'TRANSLATION METHOD:\nSTONE IN HAT.\nFACE IN HAT.'), halos(8, 4)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(10, imp(5, 6), serpent(7)),
    flat(16, platform(1, 7, 3), platform(5, 5, 3), platform(9, 3, 3), halos(9, 3, 2), imp(12, 4), thorns(3), thorns(7)),
    gap(5),
    flat(10, sign(2, 'THE PLATES SAT IN\nANOTHER ROOM.\nUNDER A CLOTH.'), golem(7)),
    flat(14, dark(0, 30), swarm(6, 6, 5), thorns(10), halos(2, 6, 8)),
    gap(6, mover(1, 7, 2, { dx: 1.5, period: 2000 }), mover(4, 6, 2, { dy: -1.5 })),
    flat(10, wine(1), wall(4, 4), gargoyle(7, 6)),
    flat(8, sign(1, 'EIGHT WITNESSES\nSAW THE PLATES.\nWITH SPIRITUAL EYES.'), ghost(5)),
    gap(28, gargoyle(4, 3), gargoyle(10, 6), gargoyle(16, 4), gargoyle(22, 6), halos(2, 8, 5), halos(14, 8, 5, 1)),
    flat(12, loaves(2), frog(5), frog(8), thorns(10)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(8, sign(1, 'GLOWING STONES LIT\nTHE JAREDITE BARGES.\nFOR 344 DAYS.'), walk(5)),
    sea(18, fish(4), fish(10), fish(14), halos(2, 14, 8)),
    flat(10, serpent(4), crab(7)),
    gap(6, crumble(2, 7, 3)),
    flat(22, sign(3, 'MARTIN HARRIS HAS\nTHE 116 PAGES.\nWHAT COULD GO WRONG.'), finish(10), halos(5, 4)),
  ],
});

const PALMYRA_BOSS = lvl({
  id: 'bom-palmyra-boss',
  name: 'PALMYRA 1-3',
  subtitle: 'The Lost 116 Pages',
  boss: 'pages',
  beats: arena(560, { intro: 'THE PAGES WENT\nMISSING. THEY WERE\nNEVER RETRANSLATED.' }),
});

// ---------------------------------------------------------------- world 2
const ZARA_1 = lvl({
  id: 'bom-zarahemla-1',
  name: 'ZARAHEMLA 2-1',
  subtitle: 'Cureloms and Cumoms',
  beats: [
    flat(14, sign(5, 'CURELOMS AND CUMOMS.\nVERY USEFUL ANIMALS.\nNOBODY KNOWS WHAT.'), halos(9, 4)),
    flat(10, frog(4), frog(7)),
    gap(5, halos(0, 5, 6, 1)),
    flat(12, sign(1, 'THE CUMOM.\nPOSSIBLY A TAPIR.\nEVERYTHING IS.'), crab(7)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(16, sign(1, 'ELEPHANTS.\nEXTINCT FOR 10000\nYEARS. NOT HERE.'), chariot(12)),
    flat(12, sign(1, 'HONEYBEES. FIRST\nIMPORTED IN 1622.\nSHHH.'), swarm(6, 6, 5), thorns(10)),
    flat(8, sign(1, 'STEEL SWORDS.\nPLEASE IGNORE THE\nMISSING STEEL.'), walk(5)),
    sea(20, fish(4), fish(9), fish(14), imp(10, 5), halos(2, 16, 8)),
    flat(10, wine(1), serpent(6)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(14, platform(2, 6, 4), platform(8, 6, 4), thorns(3), thorns(4), thorns(9), thorns(10), imp(12, 4), halos(2, 4, 5), halos(8, 4, 5)),
    flat(6, ghost(3)),
    gap(28, imp(4, 5), locust(9, 4), imp(14, 6), locust(19, 5), imp(24, 4), halos(2, 8, 5), halos(14, 8, 4, 1)),
    flat(12, loaves(2), golem(6), frog(9)),
    gap(6, platform(1, 7, 2), platform(4, 6, 2)),
    flat(22, sign(3, 'WHEAT. BARLEY. SILK.\nLOCALLY SOURCED.\nALLEGEDLY.'), finish(10), halos(5, 4)),
  ],
});

const ZARA_2 = lvl({
  id: 'bom-zarahemla-2',
  name: 'ZARAHEMLA 2-2',
  subtitle: 'Location Unknown',
  beats: [
    flat(12, sign(5, 'ZARAHEMLA.\nPOPULATION: MILLIONS.\nRUINS FOUND: 0.'), halos(8, 4)),
    gap(7, crumble(1, 7, 2), crumble(4, 5, 2)),
    flat(14, frog(4), serpent(8), imp(10, 5)),
    sea(6, mover(2, 7, 2, { dx: 1.5, period: 2000 })),
    flat(14, dark(0, 36), sign(1, 'DNA EVIDENCE:\nSTILL LOADING.'), crab(6), frog(10), halos(2, 8, 8)),
    gap(6, halos(0, 6, 5, 2)),
    flat(16, sign(1, 'WE PUT THE CITY\nRIGHT ABOUT HERE.\nPROBABLY.'), chariot(12)),
    flat(8, wine(1), wall(5, 4)),
    flat(20, platform(1, 7, 3), platform(4, 5, 3), platform(7, 3, 4), platform(12, 5, 3), platform(16, 7, 3), wall(5, 3), wall(10, 4), wall(15, 3), halos(7, 4, 2), halos(12, 3, 4), gargoyle(9, 5)),
    flat(8, sign(1, 'CHARIOTS. NO WHEELS\nEVER FOUND.\nSTILL VERY FAST.'), staff(5)),
    sea(18, halos(0, 16, 8)),
    flat(10, loaves(2), crab(5), crab(7)),
    gap(5, platform(1, 6, 3)),
    flat(6, ghost(3)),
    gap(30, imp(4, 3), locust(9, 6), imp(14, 4), locust(19, 7), imp(24, 3), halos(2, 8, 5), halos(16, 8, 5, 1)),
    flat(12, golem(5), frog(8), thorns(10)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(22, sign(3, 'ARCHAEOLOGISTS\nARE STILL LOOKING.\nANY DAY NOW.'), finish(10), halos(5, 4)),
  ],
});

const ZARA_BOSS = lvl({
  id: 'bom-zarahemla-boss',
  name: 'ZARAHEMLA 2-3',
  subtitle: 'The Curelom and the Cumom',
  boss: 'beasts',
  beats: arena(720, { intro: 'TWO ANIMALS.\nNO DESCRIPTION.\nBOTH VERY ANGRY.' }),
});

// ---------------------------------------------------------------- world 3
const KIRT_1 = lvl({
  id: 'bom-kirtland-1',
  name: 'KIRTLAND 3-1',
  subtitle: 'Anti-Banking',
  beats: [
    flat(14, sign(5, 'KIRTLAND SAFETY\nSOCIETY ANTI-BANKING\nCOMPANY. EST. 1836.'), halos(9, 4)),
    flat(12, demon(6, 5), serpent(9)),
    gap(5, halos(0, 5, 6, 1)),
    flat(14, rain(0, 14, 'bomnote'), sign(1, 'THE NOTES ARE NOW\nWORTH SLIGHTLY LESS\nTHAN PAPER.'), demon(8, 4), thorns(5), thorns(10)),
    sea(4),
    flat(10, sign(1, 'NO BANK CHARTER?\nJUST ADD ANTI.'), golem(7)),
    flat(4, walk(2)),
    sea(18, demon(6, 5), demon(12, 4), halos(2, 14, 8)),
    flat(10, swarm(5, 6, 6), thorns(8)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(12, wine(1), dark(3, 34), demon(6, 6), imp(8, 5), halos(3, 9, 8)),
    gap(5, crumble(1, 7, 3)),
    flat(10, sign(1, 'KINDERHOOK PLATES.\nFORGED BY PRANKSTERS.\nTRANSLATED ANYWAY.'), golem(5), wall(9, 3)),
    gap(4),
    flat(6, ghost(3)),
    gap(30, demon(4, 5), demon(9, 3), demon(14, 6), demon(19, 4), demon(24, 5), halos(2, 8, 5), halos(14, 8, 4, 1)),
    flat(14, loaves(2), rain(0, 14, 'bomnote', 420), swarm(6, 5, 6), golem(10)),
    gap(6, platform(1, 7, 2), platform(4, 6, 2)),
    flat(10, demon(4, 6), gargoyle(6, 4), thorns(8)),
    gap(7, halos(0, 7, 5, 2)),
    flat(22, sign(3, 'BANK CLOSED 1837.\nTHANK YOU FOR\nYOUR FAITH.'), finish(10), halos(5, 4)),
  ],
});

const KIRT_2 = lvl({
  id: 'bom-kirtland-2',
  name: 'KIRTLAND 3-2',
  subtitle: 'The Book of Abraham',
  beats: [
    flat(12, sign(5, 'FOUR MUMMIES.\nSOME PAPYRUS.\n2400 DOLLARS.'), halos(8, 4)),
    gap(6, crumble(1, 7, 2), crumble(4, 6, 2)),
    flat(10, demon(5, 5), golem(8)),
    sea(6, mover(2, 7, 2, { dx: 1.5, period: 2000 })),
    flat(14, rain(0, 14, 'bompage'), platform(2, 6, 4), platform(8, 6, 4), thorns(3), thorns(4), thorns(9), thorns(10), demon(12, 4), halos(2, 4, 5), halos(8, 4, 5)),
    flat(8, sign(1, 'THE PAPYRI SURVIVED.\nEGYPTOLOGISTS READ\nTHEM IN 1967.'), walk(5)),
    sea(22, demon(5, 5), demon(10, 3), demon(15, 6), imp(19, 4), halos(2, 18, 8)),
    flat(10, wine(1), wall(5, 5), demon(8, 4)),
    gap(8, crumble(1, 7, 2), mover(4, 6, 2, { dy: 1.5 })),
    flat(12, dark(0, 40), sign(1, 'STANDARD FUNERAL\nTEXTS. FOR A MAN\nNAMED HOR.'), golem(5), demon(7, 5), thorns(10), halos(0, 8, 8)),
    gap(6, halos(0, 6, 5, 2)),
    flat(10, swarm(4, 6, 6), gargoyle(8, 4), halos(0, 6, 8)),
    gap(5, platform(1, 7, 3)),
    flat(8, sign(1, 'REFORMED EGYPTIAN.\nNOT TO BE CONFUSED\nWITH EGYPTIAN.'), ghost(5)),
    gap(32, demon(3, 4), demon(7, 6), demon(11, 3), demon(15, 5), demon(19, 7), demon(23, 4), demon(27, 6), halos(2, 8, 5), halos(16, 10, 4, 1)),
    flat(14, loaves(2), rain(0, 14, 'bomnote', 380), golem(6), demon(9, 5), golem(12)),
    sea(5),
    flat(8, wall(4, 4), demon(6, 6)),
    gap(7, mover(2, 7, 2, { dy: 1.5 })),
    flat(22, sign(3, 'THE MUMMIES ARE\nIN THE NEXT ROOM.\nREFUNDS ARE NOT.'), finish(10), halos(5, 4)),
  ],
});

const KIRT_BOSS = lvl({
  id: 'bom-kirtland-boss',
  name: 'KIRTLAND 3-3',
  subtitle: 'Actual Mummies',
  boss: 'abraham',
  beats: arena(760, { powers: ['wine', 'loaves', 'wine'], intro: 'THE BANK FAILED.\nTHE MUMMIES REMAIN.\nNO REFUNDS.' }),
});

export const MORMON_WORLDS = [
  {
    id: 'palmyra',
    name: 'PALMYRA',
    intro: [
      'PALMYRA, NEW YORK. 1823.',
      'A YOUNG MAN HAS A HAT AND A STONE.',
      'AN ANGEL SHOWS HIM GOLDEN PLATES.',
      'NOBODY ELSE IS ALLOWED TO LOOK AT THEM.',
      'THIS WILL NOT BE A PROBLEM.',
    ],
    levels: [PALMYRA_1, PALMYRA_2, PALMYRA_BOSS],
  },
  {
    id: 'zarahemla',
    name: 'ZARAHEMLA',
    intro: [
      'THE PLATES DESCRIBE A GREAT CIVILIZATION.',
      'MILLIONS OF PEOPLE. HORSES. STEEL. CHARIOTS.',
      'ALL OF IT IN ANCIENT AMERICA.',
      'ARCHAEOLOGISTS ARE STILL LOOKING.',
      'THEY WILL GET BACK TO US.',
    ],
    levels: [ZARA_1, ZARA_2, ZARA_BOSS],
  },
  {
    id: 'kirtland',
    name: 'KIRTLAND',
    intro: [
      'KIRTLAND, OHIO. 1835.',
      'A TRAVELLING SHOW SELLS JOSEPH FOUR MUMMIES.',
      'THE PAPYRUS COMES FREE WITH PURCHASE.',
      'JOSEPH TRANSLATES IT. SO DO EGYPTOLOGISTS.',
      'THEY DO NOT AGREE.',
    ],
    levels: [KIRT_1, KIRT_2, KIRT_BOSS],
  },
];

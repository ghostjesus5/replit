// Book of Mormon campaign bosses. Same shape as BOSSES in bosses.js.
// BOM_ATTACKS can add new attack functions: (scene, boss, opts) => busy ms.
import { GROUND_Y } from './config.js';

export const BOM_BOSSES = {
  pages: {
    title: 'THE LOST 116 PAGES',
    phases: [
      {
        name: 'THE LOST 116 PAGES', tex: 'bossPages', hp: 220, y: GROUND_Y - 190, bob: 22, hit: [170, 200, 45, 40], every: 1450,
        mouth: [-0.1, 0.1],
        attacks: [
          ['fan', { shot: 'bompage', n: 3, spread: 0.18 }],
          ['rain', { shot: 'bompage', n: 8 }],
          ['spears', { shot: 'bompage', heights: ['low', 'high'] }],
          ['fan', { shot: 'bompage', n: 5, spread: 0.15, speed: 380 }],
          ['wave', { n: 2 }],
          ['rain', { shot: 'bompage', n: 10, spanMs: 1600 }],
        ],
      },
    ],
  },
  beasts: {
    title: 'THE CURELOM AND THE CUMOM',
    phases: [
      {
        name: 'THE CURELOM', tex: 'bossCurelom', hp: 130, y: GROUND_Y - 112, bob: 6, hit: [190, 150, 25, 40], every: 1400,
        mouth: [-0.4, -0.05],
        attacks: [['lob', { shot: 'bomquestion', n: 3 }], ['wave', { n: 2 }], ['summon', { type: 'frog', n: 2, rows: [8] }], ['lob', { shot: 'bomquestion', n: 4 }], ['spears', { shot: 'bomquestion', heights: ['high', 'low'] }]],
      },
      {
        name: 'THE CUMOM', tex: 'bossCumom', hp: 140, y: GROUND_Y - 112, bob: 6, hit: [190, 150, 25, 40], every: 1350,
        mouth: [-0.4, -0.05],
        attacks: [['fan', { shot: 'bomquestion', n: 4, spread: 0.16 }], ['wave', { n: 3, gapMs: 560 }], ['summon', { type: 'crab', n: 2, rows: [8] }], ['spears', { shot: 'bomquestion', heights: ['low', 'high', 'low'] }], ['lob', { shot: 'bomquestion', n: 5 }]],
      },
    ],
  },
  abraham: {
    title: 'THE BOOK OF ABRAHAM',
    phases: [
      {
        name: 'THE KIRTLAND SAFETY SOCIETY', tex: 'bossBank', hp: 140, y: GROUND_Y - 150, bob: 4, hit: [200, 200, 30, 70], every: 1400,
        mouth: [-0.05, 0.05],
        attacks: [['fan', { shot: 'bomnote', n: 4, spread: 0.14 }], ['rain', { shot: 'bomnote', n: 9 }], ['shield', { ms: 1800 }], ['lob', { shot: 'coin', n: 4 }], ['spears', { shot: 'bomnote', heights: ['high', 'low'] }]],
      },
      {
        name: 'THE MUMMIES', tex: 'bossMummies', hp: 150, y: GROUND_Y - 140, bob: 14, hit: [200, 200, 30, 40], every: 1400,
        mouth: [-0.3, -0.2],
        attacks: [['summon', { type: 'demon', n: 2, rows: [4, 6] }], ['beam', { height: 'low' }], ['rain', { shot: 'bompage', n: 9 }], ['lunge', { depth: 200 }], ['beam', {}], ['fan', { shot: 'bompage', n: 5, spread: 0.14 }]],
      },
    ],
  },
};

export const BOM_ATTACKS = {};

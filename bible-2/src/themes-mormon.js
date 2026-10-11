// Book of Mormon campaign themes. Same shape as THEMES in themes.js.
// `prop` may be a function (g) => draws a 512x260 backdrop with its base at y=256.
import { poly } from './textures.js';
import { strokeText } from './art-mormon.js';

function signboard(g, x, y, w, h, lines, size = 10, bg = 0xf6f3ea, ink = 0x2a1a10) {
  g.fillStyle(0x5a3a1e);
  g.fillRect(x + 8, y + h, 5, 256 - y - h);
  g.fillRect(x + w - 13, y + h, 5, 256 - y - h);
  g.fillStyle(bg);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, 0x5a3a1e);
  g.strokeRect(x, y, w, h);
  lines.forEach((t, i) => strokeText(g, t, x + w / 2, y + (h / (lines.length + 1)) * (i + 1), size, ink, 2));
}

function palmyra(g) {
  // the Hill Cumorah, a church spire, a farmhouse, and holes from money-digging
  g.fillStyle(0x6a9a4a);
  g.fillEllipse(330, 262, 360, 190);
  g.fillStyle(0x7fb05a);
  g.fillEllipse(310, 250, 280, 120);
  // church
  g.fillStyle(0xf6f3ea);
  g.fillRect(60, 170, 60, 86);
  g.fillRect(78, 110, 24, 60);
  g.fillTriangle(74, 112, 106, 112, 90, 60);
  g.fillTriangle(54, 172, 126, 172, 90, 140);
  g.fillStyle(0x3a2a1e);
  g.fillRect(84, 214, 12, 42);
  g.fillRect(86, 124, 8, 12);
  // farmhouse
  g.fillStyle(0xb5523a);
  g.fillRect(170, 196, 64, 60);
  g.fillStyle(0x6a2a1e);
  g.fillTriangle(164, 198, 240, 198, 202, 166);
  g.fillStyle(0xf6e7b0);
  g.fillRect(182, 212, 12, 12);
  g.fillRect(210, 212, 12, 12);
  // dug holes on the hill
  g.fillStyle(0x4a3220);
  [[300, 214], [356, 204], [410, 222]].forEach(([x, y]) => g.fillEllipse(x, y, 30, 9));
  signboard(g, 360, 120, 128, 40, ['CUMORAH', 'DIG AT OWN RISK'], 9);
  // fence
  g.lineStyle(3, 0x8a6a42);
  g.lineBetween(0, 236, 512, 236);
  for (let x = 6; x < 512; x += 28) g.lineBetween(x, 226, x, 256);
}

function zarahemla(g) {
  // jungle, a hypothetical pyramid, and the most honest sign in the game
  g.fillStyle(0x2e6a3a);
  [[30, 150], [120, 120], [470, 140]].forEach(([x, h]) => {
    g.fillStyle(0x5a3a1e);
    g.fillRect(x - 5, 256 - h, 10, h);
    g.fillStyle(0x2e7a3a);
    g.fillCircle(x, 256 - h, 36);
    g.fillCircle(x - 26, 256 - h + 16, 26);
    g.fillCircle(x + 26, 256 - h + 14, 26);
  });
  // a pyramid that is only an outline, because nobody has found it
  g.lineStyle(3, 0xffffff, 0.55);
  for (let i = 0; i < 5; i++) {
    const w = 190 - i * 34;
    const y = 256 - (i + 1) * 26;
    for (let x = 300 - w / 2; x < 300 + w / 2 - 6; x += 14) g.lineBetween(x, y, x + 7, y);
  }
  signboard(g, 180, 60, 240, 70, ['ZARAHEMLA', 'LOCATION UNKNOWN', 'ARCHAEOLOGICAL EVIDENCE: 0'], 9, 0xf6f3ea, 0x2a1a10);
}

function kirtland(g) {
  // Kirtland and Nauvoo: a failed bank, a travelling mummy show
  g.fillStyle(0xd8cfc0);
  g.fillRect(30, 130, 170, 126);
  g.fillStyle(0xc0b6a4);
  g.fillTriangle(20, 132, 210, 132, 115, 86);
  g.fillStyle(0xf0eade);
  for (let x = 46; x < 196; x += 36) g.fillRect(x, 150, 12, 106);
  g.fillStyle(0x9b2a2a);
  g.fillRect(36, 134, 158, 14);
  strokeText(g, 'ANTI-BANKING CO', 115, 141, 8, 0xffe9a0, 1.6);
  g.fillStyle(0xf6f3ea);
  poly(g, [[70, 190], [160, 176], [164, 196], [74, 210]]);
  strokeText(g, 'CLOSED', 117, 193, 10, 0x9b2a2a, 2);
  // the mummy tent
  g.fillStyle(0xd9a330);
  g.fillTriangle(280, 256, 360, 120, 440, 256);
  g.fillStyle(0x9b2a2a);
  for (let i = 0; i < 4; i++) g.fillTriangle(300 + i * 34, 256, 316 + i * 34, 160 + Math.abs(1.5 - i) * 20, 330 + i * 34, 256);
  g.fillStyle(0x3a2a1e);
  g.fillTriangle(340, 256, 360, 200, 380, 256);
  signboard(g, 300, 60, 150, 44, ['GENUINE MUMMIES', 'ALSO PAPYRUS'], 9, 0xf6e7b0, 0x5a1a10);
}

export const MORMON_THEMES = {
  palmyra: {
    sky: ['#5f9fdc', '#b6dcf2', '#f6e2b0'],
    clouds: [0xffffff, 0.85],
    far: 0x9cc48a,
    near: 0x6faa58,
    abyss: 0x2a1e14,
    top: [0x4a8a36, 0x76b856],
    dirt: [0x6a4a2a, 0x58391f, 0x8a6440],
    topStyle: 'grass',
    stone: [0xa89c88, 0xcfc4ae, 0x7d7262],
    hazard: [0x5a3a1e, 0xb08a5a], // shovels left by treasure seekers
    water: [0x3a7fb0, 0x8fc7e8],
    prop: palmyra,
  },
  zarahemla: {
    sky: ['#3a8a7a', '#9cd8b8', '#f2f0c0'],
    clouds: [0xeaffea, 0.6],
    far: 0x3f8a52,
    near: 0x2a6a3a,
    abyss: 0x0e2216,
    top: [0x2f7a3a, 0x5aaa4a],
    dirt: [0x5a3a22, 0x452c18, 0x7a5638],
    topStyle: 'rock',
    stone: [0x8a9a7a, 0xb4c4a0, 0x5a6a4a],
    hazard: [0x2a4a1a, 0x9ad04a], // thorny vines, botanically fine
    water: [0x1f7a7a, 0x6ad0c0],
    prop: zarahemla,
  },
  kirtland: {
    sky: ['#3a2a5a', '#b06a6a', '#f6c48a'],
    clouds: [0xf6dcdc, 0.6],
    far: 0x8a6a7a,
    near: 0x6a4a5a,
    abyss: 0x1a1018,
    top: [0x8a5a3a, 0xb07a52],
    dirt: [0x6a4026, 0x52301a, 0x8a5a36],
    topStyle: 'brick',
    stone: [0xb8a890, 0xd8ccb4, 0x7a6a56],
    hazard: [0x3a2a1e, 0xcfe0b8], // spikes made of worthless banknotes
    water: [0x3a5a9a, 0x8aa8e0],
    prop: kirtland,
  },
};

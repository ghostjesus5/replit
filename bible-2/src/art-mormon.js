// Book of Mormon campaign art: Joseph Smith hero skin, enemies, pickups, bosses.
// Everything is drawn in code like the main game. Enemies face left, toward the hero.
import { make, poly } from './textures.js';

// A tiny stroke font so textures and backdrops can carry deadpan signage.
// Glyphs live on a 4x6 grid, strokes are polylines.
const FONT = {
  A: [[[0, 6], [0, 2], [2, 0], [4, 2], [4, 6]], [[0, 3.5], [4, 3.5]]],
  B: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[0, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
  C: [[[4, 0], [0, 0], [0, 6], [4, 6]]],
  D: [[[0, 0], [0, 6], [2, 6], [4, 4], [4, 2], [2, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 0], [0, 0], [0, 6], [4, 6], [4, 3], [2, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[0, 0], [4, 0]], [[2, 0], [2, 6]], [[0, 6], [4, 6]]],
  J: [[[4, 0], [4, 6], [0, 6], [0, 4]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]]],
  P: [[[0, 6], [0, 0], [4, 0], [4, 3], [0, 3]]],
  Q: [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]], [[2, 4], [4, 6]]],
  R: [[[0, 6], [0, 0], [4, 0], [4, 3], [0, 3], [4, 6]]],
  S: [[[4, 0], [0, 0], [0, 3], [4, 3], [4, 6], [0, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 6], [4, 6], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  0: [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]], [[4, 0], [0, 6]]],
  1: [[[1, 1], [2, 0], [2, 6]], [[0, 6], [4, 6]]],
  2: [[[0, 0], [4, 0], [4, 3], [0, 3], [0, 6], [4, 6]]],
  3: [[[0, 0], [4, 0], [4, 6], [0, 6]], [[1, 3], [4, 3]]],
  4: [[[0, 0], [0, 3], [4, 3]], [[4, 0], [4, 6]]],
  5: [[[4, 0], [0, 0], [0, 3], [4, 3], [4, 6], [0, 6]]],
  6: [[[4, 0], [0, 0], [0, 6], [4, 6], [4, 3], [0, 3]]],
  7: [[[0, 0], [4, 0], [2, 6]]],
  8: [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]], [[0, 3], [4, 3]]],
  9: [[[4, 3], [0, 3], [0, 0], [4, 0], [4, 6], [0, 6]]],
  '?': [[[0, 1], [0, 0], [4, 0], [4, 3], [2, 3], [2, 4.4]], [[2, 5.4], [2, 6]]],
  '!': [[[2, 0], [2, 4.2]], [[2, 5.4], [2, 6]]],
  ':': [[[2, 1.4], [2, 2]], [[2, 4.4], [2, 5]]],
  '.': [[[2, 5.4], [2, 6]]],
  '-': [[[0.5, 3], [3.5, 3]]],
  $: [[[4, 1], [0, 1], [0, 3], [4, 3], [4, 5], [0, 5]], [[2, 0], [2, 6]]],
  "'": [[[2, 0], [2, 1.6]]],
};

// draws text centred on (cx, cy). size is the cap height in px
export function strokeText(g, str, cx, cy, size, color, width = 2, alpha = 1) {
  const s = size / 6;
  const adv = 6 * s;
  const total = str.length * adv - 2 * s;
  let x = cx - total / 2;
  const y = cy - size / 2;
  g.lineStyle(width, color, alpha);
  for (const ch of str) {
    for (const stroke of FONT[ch] || []) {
      g.beginPath();
      g.moveTo(x + stroke[0][0] * s, y + stroke[0][1] * s);
      for (let i = 1; i < stroke.length; i++) g.lineTo(x + stroke[i][0] * s, y + stroke[i][1] * s);
      g.strokePath();
    }
    x += adv;
  }
}

function anim2(scene, key, rate = 6) {
  if (!scene.anims.exists(key)) scene.anims.create({ key, frames: [{ key: `${key}0` }, { key: `${key}1` }], frameRate: rate, repeat: -1 });
}

// ---------------------------------------------------------------- hero
const GALLOP = [
  [0.5, 0.25, -0.45, -0.2],
  [0.2, -0.1, -0.1, 0.2],
  [-0.35, -0.5, 0.35, 0.5],
  [0.1, -0.2, 0.2, -0.1],
];
const TUCK = [0.9, 1.1, -0.9, -1.1];

function drawJoseph(g, legs) {
  const L = 22;
  const hips = [[92, 86], [100, 86], [34, 86], [42, 86]];
  // far legs
  [1, 3].forEach((i) => {
    const [hx, hy] = hips[i];
    g.lineStyle(9, 0x3d332e);
    g.lineBetween(hx, hy, hx + Math.sin(legs[i]) * L, hy + Math.cos(legs[i]) * L);
    g.fillStyle(0x221c19);
    g.fillCircle(hx + Math.sin(legs[i]) * L, hy + Math.cos(legs[i]) * L, 4.5);
  });
  // tapir body: a hog that went to divinity school
  g.fillStyle(0x4d433d);
  g.fillEllipse(66, 76, 96, 46);
  g.fillStyle(0x6a5e56);
  g.fillEllipse(64, 68, 84, 26);
  g.fillStyle(0x4d433d);
  g.fillCircle(20, 78, 4); // stub tail
  // head and the famous snout
  g.fillStyle(0x5a4f48);
  g.fillEllipse(106, 70, 34, 30);
  poly(g, [[110, 62], [126, 70], [127, 80], [118, 84], [108, 80]]);
  g.fillStyle(0x3d332e);
  g.fillEllipse(125, 81, 6, 8);
  g.fillStyle(0x6a5e56);
  g.fillEllipse(98, 55, 10, 12); // ear
  g.fillStyle(0xd8c8c0);
  g.fillEllipse(98, 53, 4, 6);
  g.fillStyle(0x140f0d);
  g.fillCircle(112, 66, 2.5);
  g.fillStyle(0xffffff);
  g.fillCircle(113, 65, 0.9);
  // saddle blanket. The apologetics are stitched right on.
  g.fillStyle(0x9b2a2a);
  g.fillRoundedRect(12, 58, 54, 30, 4);
  g.fillStyle(0xd9b44a);
  g.fillRect(12, 84, 54, 3);
  g.fillRect(12, 58, 54, 2);
  strokeText(g, 'HORSE', 36, 71, 9, 0xffe9a0, 2.2);
  // near legs
  [0, 2].forEach((i) => {
    const [hx, hy] = hips[i];
    g.lineStyle(10, 0x5a4f48);
    g.lineBetween(hx, hy, hx + Math.sin(legs[i]) * L, hy + Math.cos(legs[i]) * L);
    g.fillStyle(0x221c19);
    g.fillCircle(hx + Math.sin(legs[i]) * L, hy + Math.cos(legs[i]) * L, 5);
  });
  // rider: trouser leg and boot on the near side
  g.fillStyle(0x2b2b38);
  poly(g, [[62, 60], [74, 60], [80, 86], [72, 88]]);
  g.fillStyle(0x15151c);
  g.fillEllipse(80, 89, 14, 6);
  // frock coat
  g.fillStyle(0x1e1e2a);
  poly(g, [[48, 64], [76, 64], [72, 34], [52, 34]]);
  poly(g, [[48, 64], [40, 72], [52, 70]]); // coat tail
  g.fillStyle(0x34344a);
  poly(g, [[60, 36], [64, 36], [66, 60], [62, 62]]);
  // white cravat
  g.fillStyle(0xf6f3ea);
  poly(g, [[56, 32], [68, 32], [64, 42], [60, 42]]);
  g.fillCircle(62, 33, 4);
  // brass buttons
  g.fillStyle(0xd9b44a);
  g.fillCircle(66, 46, 1.4);
  g.fillCircle(66, 52, 1.4);
  // face, sideburns, nose
  g.fillStyle(0xe8b894);
  g.fillCircle(63, 24, 8);
  g.fillEllipse(70, 25, 5, 4);
  g.fillStyle(0x6b4423);
  g.fillRect(55, 20, 4, 11);
  g.fillEllipse(57, 19, 10, 6);
  g.fillStyle(0x140f0d);
  g.fillCircle(66, 22, 1.5);
  // the hat. Historically central to the translation process.
  g.fillStyle(0x111118);
  g.fillEllipse(62, 16, 30, 6);
  g.fillRect(53, 1, 18, 15);
  g.fillStyle(0x2a2a36);
  g.fillRect(53, 1, 18, 3);
  g.fillStyle(0x6b4423);
  g.fillRect(53, 11, 18, 3);
  // arm reaching to the pistols
  g.lineStyle(7, 0x1e1e2a);
  g.lineBetween(60, 40, 76, 50);
  g.fillStyle(0xe8b894);
  g.fillCircle(77, 50, 3);
}

function drawPepperbox(g) {
  // grip
  g.fillStyle(0x6b3f1f);
  poly(g, [[6, 12], [20, 12], [14, 32], [1, 30]]);
  g.fillStyle(0x8a5530);
  poly(g, [[8, 14], [16, 14], [11, 28], [5, 27]]);
  // trigger guard
  g.lineStyle(2, 0xc9a23a);
  g.strokeCircle(20, 21, 5);
  // frame and hammer
  g.fillStyle(0x5a5a64);
  g.fillRoundedRect(8, 5, 22, 13, 3);
  g.fillStyle(0x3a3a42);
  poly(g, [[16, 6], [22, 0], [26, 2], [22, 8]]);
  // the barrel cluster. Six barrels, zero aim.
  g.fillStyle(0x6e6e78);
  g.fillRoundedRect(28, 1, 52, 22, 6);
  g.fillStyle(0xa8a8b4);
  g.fillRect(30, 4, 48, 3);
  g.fillStyle(0x4a4a54);
  g.fillRect(30, 11, 48, 2);
  g.fillRect(30, 17, 48, 2);
  g.fillStyle(0xc9a23a);
  g.fillRect(30, 1, 3, 22);
  g.fillRect(56, 1, 3, 22);
  g.fillStyle(0x1a1a20);
  [5, 12, 19].forEach((y) => g.fillCircle(80, y, 2.4));
}

// ---------------------------------------------------------------- enemies
function horse(g, f) {
  // an anachronistic horse, 100x44
  const k = f ? 0.4 : -0.4;
  g.lineStyle(6, 0x6b4423);
  [[30, k], [40, -k], [66, -k], [76, k]].forEach(([x, a]) => g.lineBetween(x, 28, x + Math.sin(a) * 14, 42));
  g.fillStyle(0x8a5a32);
  g.fillEllipse(54, 24, 56, 22);
  poly(g, [[34, 22], [20, 4], [10, 6], [26, 28]]);
  g.fillEllipse(12, 8, 18, 10);
  g.fillStyle(0x3a2412);
  g.fillCircle(14, 5, 1.6);
  poly(g, [[20, 3], [32, 18], [28, 22], [18, 8]]);
  g.lineStyle(4, 0x3a2412);
  g.lineBetween(82, 20, 96, 30 + (f ? 4 : 0));
  // an inventory tag. Not to be found for another few centuries.
  g.fillStyle(0xf6f3ea);
  g.fillRect(46, 14, 18, 10);
  strokeText(g, '1493', 55, 19, 6, 0x9b2a2a, 1.2);
}

function salamander(g, f) {
  // the White Salamander, 64x58. Guards treasure, then it does not.
  g.fillStyle(0xf4f1ff, 0.35);
  g.fillCircle(32, 29, 26);
  g.fillStyle(0xf8f8ff);
  g.fillEllipse(30, 30, 40, 18);
  g.fillEllipse(12, 26, 18, 14);
  g.lineStyle(7, 0xf0eef8);
  g.beginPath();
  g.moveTo(48, 30);
  g.lineTo(56, f ? 20 : 40);
  g.lineTo(62, f ? 30 : 30);
  g.strokePath();
  g.lineStyle(4, 0xe0dcf0);
  [[20, 1], [28, -1], [36, 1], [42, -1]].forEach(([x, s]) => g.lineBetween(x, 34, x + s * 4, 46 + (f ? 2 : 0)));
  g.fillStyle(0xff2a2a);
  g.fillCircle(9, 23, 2.6);
  g.fillCircle(15, 22, 2.2);
  g.fillStyle(0xc8a0ff);
  [[24, 26], [34, 28], [40, 25]].forEach(([x, y]) => g.fillCircle(x, y, 2));
}

function questionBlob(g, w, h, color, dark, f, legs) {
  const cx = w / 2;
  const cy = h / 2 + (f ? 2 : 0);
  g.fillStyle(dark);
  for (let i = 0; i < legs; i++) {
    const x = cx - w * 0.3 + (i * w * 0.6) / Math.max(1, legs - 1);
    g.fillEllipse(x + (f && i % 2 ? 3 : 0), h - 5, 10, 8);
  }
  g.fillStyle(color);
  g.fillEllipse(cx, cy, w * 0.86, h * (f ? 0.7 : 0.8));
  strokeText(g, '?', cx + 4, cy + 2, h * 0.42, 0xffffff, 3.2);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - w * 0.28, cy - h * 0.18, 5);
  g.fillStyle(0x140f0d);
  g.fillCircle(cx - w * 0.3, cy - h * 0.18, 2.4);
}

function bee(g, f) {
  // 40x32, honeybees: arrived with Europeans in the 1600s
  g.fillStyle(0xffffff, 0.75);
  g.fillEllipse(20, f ? 6 : 10, 16, 10);
  g.fillEllipse(28, f ? 7 : 11, 12, 8);
  g.fillStyle(0xffc21a);
  g.fillEllipse(22, 19, 28, 16);
  g.fillStyle(0x1a1408);
  g.fillRect(18, 12, 4, 15);
  g.fillRect(26, 12, 4, 15);
  g.fillTriangle(35, 19, 40, 17, 40, 21);
  g.fillCircle(9, 18, 6);
  g.fillStyle(0xffffff);
  g.fillCircle(7, 17, 1.6);
}

function elephant(g, f) {
  // 124x92 charging elephant. Also not supposed to be here.
  const k = f ? 0.3 : -0.3;
  g.lineStyle(16, 0x7d7f8a);
  [[40, k], [56, -k], [88, -k], [102, k]].forEach(([x, a]) => g.lineBetween(x, 60, x + Math.sin(a) * 18, 86));
  g.fillStyle(0x8e909c);
  g.fillEllipse(72, 50, 92, 58);
  g.fillEllipse(32, 38, 46, 44);
  g.fillStyle(0x7d7f8a);
  g.fillEllipse(42, 36, 24, 34); // ear
  g.lineStyle(12, 0x8e909c);
  g.beginPath();
  g.moveTo(16, 46);
  g.lineTo(8, 66);
  g.lineTo(f ? 4 : 12, 84);
  g.strokePath();
  g.fillStyle(0xf6f3ea);
  poly(g, [[22, 56], [6, 62], [22, 62]]);
  g.fillStyle(0x140f0d);
  g.fillCircle(24, 32, 3);
  g.fillStyle(0x9b2a2a);
  g.fillRect(60, 22, 34, 16);
  strokeText(g, 'ETHER', 77, 30, 7, 0xffe9a0, 1.4);
}

function plates(g, f) {
  // 98x120 walking stack of Reformed Egyptian plates
  const k = f ? 4 : -4;
  g.fillStyle(0x6a4a14);
  g.fillRect(28 + k, 104, 14, 16);
  g.fillRect(58 - k, 104, 14, 16);
  for (let i = 0; i < 6; i++) {
    const y = 10 + i * 16;
    g.fillStyle(i % 2 ? 0xd9a330 : 0xe8bc48);
    g.fillRoundedRect(12, y, 74, 15, 3);
    g.lineStyle(1.5, 0x8a6214);
    for (let x = 18; x < 80; x += 9) {
      g.lineBetween(x, y + 4, x + 4, y + 7);
      g.lineBetween(x + 4, y + 7, x + 2, y + 11);
    }
  }
  g.lineStyle(4, 0x6a4a14);
  g.lineBetween(10, 6, 10, 104);
  g.lineBetween(88, 6, 88, 104);
  g.fillStyle(0xffffff);
  g.fillCircle(32, 38, 7);
  g.fillCircle(58, 38, 7);
  g.fillStyle(0x140f0d);
  g.fillCircle(30, 39, 3.5);
  g.fillCircle(56, 39, 3.5);
  g.lineStyle(4, 0x140f0d);
  g.lineBetween(24, 28 + (f ? 2 : 0), 38, 32);
  g.lineBetween(52, 32, 66, 28 + (f ? 2 : 0));
}

function tablet(g, f) {
  // 64x60 floating Reformed Egyptian tablet
  g.fillStyle(0xffe14d, 0.25);
  g.fillCircle(32, 30, 29);
  g.fillStyle(0xd9a330);
  g.fillRoundedRect(10, 6 + (f ? 2 : 0), 44, 50, 6);
  g.fillStyle(0xf0c95a);
  g.fillRoundedRect(14, 10 + (f ? 2 : 0), 36, 42, 4);
  g.lineStyle(2, 0x7a5410);
  const glyph = [[18, 16], [30, 16], [40, 16], [18, 28], [30, 28], [40, 28], [18, 40], [30, 40], [40, 40]];
  glyph.forEach(([x, y], i) => {
    const yy = y + (f ? 2 : 0);
    if (i % 3 === 0) g.strokeCircle(x + 3, yy + 3, 3);
    else if (i % 3 === 1) g.lineBetween(x, yy, x + 6, yy + 7);
    else {
      g.lineBetween(x, yy + 6, x + 3, yy);
      g.lineBetween(x + 3, yy, x + 6, yy + 6);
    }
  });
  g.fillStyle(0x140f0d);
  g.fillCircle(22, 50 + (f ? 2 : 0), 2);
  g.fillCircle(42, 50 + (f ? 2 : 0), 2);
}

function mummy(g, f) {
  // 64x62 diving mummy. Purchased in 1835 for 2400 dollars.
  g.fillStyle(0xd9cfa8);
  g.fillEllipse(34, 34, 46, 26);
  g.fillCircle(14, 26, 11);
  g.lineStyle(7, 0xd9cfa8);
  g.lineBetween(20, 34, 4, f ? 44 : 30);
  g.lineBetween(26, 40, 8, f ? 52 : 40);
  g.lineBetween(52, 36, 62, f ? 30 : 44);
  g.lineStyle(1.5, 0x9a8a60);
  for (let x = 16; x < 56; x += 6) g.lineBetween(x, 22, x + 4, 46);
  g.lineBetween(6, 22, 22, 28);
  g.fillStyle(0x140f0d);
  g.fillRect(6, 23, 14, 4);
  g.fillStyle(0xffe14d);
  g.fillCircle(10, 25, 1.6);
  g.fillCircle(16, 25, 1.6);
}

function sword(g, f) {
  // 60x42 a steel sword. Steel. In the Bronze Age Americas.
  g.fillStyle(0xd8dee8);
  poly(g, [[2, 21], [12, 16], [44, 17], [44, 25], [12, 26]]);
  g.fillStyle(0xffffff);
  g.fillRect(12, 19, 30, 2);
  g.fillStyle(0xc9a23a);
  g.fillRect(44, 9, 5, 24);
  g.fillStyle(0x6b3f1f);
  g.fillRect(49, 17, 9, 8);
  g.fillStyle(0xc9a23a);
  g.fillCircle(58, 21, 3);
  if (f) {
    g.fillStyle(0xffffff);
    g.fillTriangle(24, 12, 26, 21, 28, 12);
    g.fillTriangle(20, 21, 26, 19, 32, 21);
  }
}

// ---------------------------------------------------------------- pickups
function seerstone(g) {
  // a hat with a stone, the full translation suite
  g.fillStyle(0xffe14d, 0.3);
  g.fillCircle(26, 26, 25);
  g.fillStyle(0x111118);
  g.fillEllipse(26, 42, 44, 10);
  g.fillRect(14, 22, 24, 20);
  g.fillStyle(0x6b4423);
  g.fillRect(14, 36, 24, 4);
  g.fillStyle(0x7a5a3a);
  g.fillEllipse(26, 14, 18, 14);
  g.fillStyle(0xb08a5a);
  g.fillEllipse(23, 11, 7, 5);
  g.fillStyle(0xffffff);
  g.fillCircle(21, 10, 1.6);
}

function urim(g) {
  // Urim and Thummim: divine spectacles on a breastplate
  g.fillStyle(0x7fd0ff, 0.3);
  g.fillCircle(26, 26, 25);
  g.fillStyle(0xc9a23a);
  g.fillRoundedRect(10, 26, 32, 20, 4);
  g.lineStyle(3, 0xd8dee8);
  g.strokeCircle(16, 18, 8);
  g.strokeCircle(36, 18, 8);
  g.lineBetween(24, 18, 28, 18);
  g.fillStyle(0xbfe8ff);
  g.fillCircle(16, 18, 6);
  g.fillCircle(36, 18, 6);
  g.fillStyle(0xffffff);
  g.fillCircle(14, 15, 2);
  g.fillCircle(34, 15, 2);
}

function spiritualEyes(g) {
  g.fillStyle(0xc8a0ff, 0.3);
  g.fillCircle(26, 26, 25);
  g.fillStyle(0xffffff);
  g.fillEllipse(26, 26, 40, 22);
  g.fillStyle(0x8a5aff);
  g.fillCircle(26, 26, 9);
  g.fillStyle(0x140f0d);
  g.fillCircle(26, 26, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(23, 23, 2);
  g.lineStyle(2, 0xffe14d);
  [[6, 6], [46, 8], [8, 46], [44, 44]].forEach(([x, y]) => {
    g.lineBetween(x - 4, y, x + 4, y);
    g.lineBetween(x, y - 4, x, y + 4);
  });
}

function bargeStone(g) {
  // the glowing stones God touched to light the Jaredite barges
  g.fillStyle(0xbff4ff, 0.35);
  g.fillCircle(26, 26, 25);
  g.fillStyle(0xeafcff);
  poly(g, [[14, 30], [20, 14], [34, 12], [40, 28], [30, 40], [18, 40]]);
  g.fillStyle(0xffffff);
  poly(g, [[20, 18], [30, 15], [26, 26]]);
  g.fillStyle(0x6a4a2a);
  g.fillRect(8, 44, 36, 5);
}

function liahona(g) {
  // a brass compass ball, centuries ahead of the compass
  g.fillStyle(0xffd447, 0.3);
  g.fillCircle(26, 26, 25);
  g.fillStyle(0xc9a23a);
  g.fillCircle(26, 26, 17);
  g.fillStyle(0xf0d27a);
  g.fillCircle(22, 21, 7);
  g.lineStyle(3, 0x6a4a14);
  g.lineBetween(18, 34, 34, 18);
  g.fillStyle(0x9b2a2a);
  g.fillTriangle(34, 18, 28, 20, 32, 24);
}

function trumpet(g) {
  // a gold angel trumpet
  g.fillStyle(0xffe14d, 0.3);
  g.fillCircle(26, 26, 25);
  g.fillStyle(0xe8bc48);
  poly(g, [[6, 24], [34, 22], [46, 12], [46, 40], [34, 30], [6, 28]]);
  g.fillStyle(0xfff0a0);
  g.fillRect(10, 24, 22, 2);
}

function plate(g) {
  // a golden plate. You will have to take its word for it.
  g.lineStyle(2, 0xffd447, 0.7);
  const pts = [[4, 4], [26, 4], [26, 26], [4, 26], [4, 4]];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    for (let t = 0; t < 1; t += 0.25) g.lineBetween(ax + (bx - ax) * t, ay + (by - ay) * t, ax + (bx - ax) * (t + 0.13), ay + (by - ay) * (t + 0.13));
  }
  g.fillStyle(0xffd447, 0.12);
  g.fillRect(5, 5, 20, 20);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(22, 8, 1.6);
}

// ---------------------------------------------------------------- shots
function page(g) {
  g.fillStyle(0xf6f0dc);
  poly(g, [[2, 2], [22, 2], [28, 8], [28, 34], [2, 34]]);
  g.fillStyle(0xd8ccaa);
  poly(g, [[22, 2], [28, 8], [22, 8]]);
  g.lineStyle(1.2, 0x7a6a4a);
  for (let y = 12; y < 32; y += 4) g.lineBetween(5, y, 25, y);
}
function note(g) {
  g.fillStyle(0xcfe0b8);
  g.fillRect(1, 1, 38, 20);
  g.lineStyle(1.5, 0x4a6a3a);
  g.strokeRect(3, 3, 34, 16);
  strokeText(g, '$0', 20, 11, 8, 0x2a4a2a, 1.6);
}
function question(g) {
  g.fillStyle(0xa86bff);
  g.fillCircle(16, 16, 15);
  strokeText(g, '?', 17, 17, 16, 0xffffff, 3);
}

// ---------------------------------------------------------------- bosses
function bossPages(g, f) {
  // THE LOST 116 PAGES, 260x280: a storm of manuscript
  g.fillStyle(0xe8e0c8, 0.25);
  g.fillCircle(130, 140, 128);
  for (let i = 0; i < 26; i++) {
    const a = i * 0.9 + (f ? 0.4 : 0);
    const r = 30 + (i * 37) % 95;
    const x = 130 + Math.cos(a) * r;
    const y = 140 + Math.sin(a) * r * 0.9;
    g.fillStyle(i % 3 ? 0xf6f0dc : 0xe0d6b4);
    const w = 22;
    const h = 28;
    const c = Math.cos(a);
    const s = Math.sin(a);
    poly(g, [[-w, -h], [w, -h], [w, h], [-w, h]].map(([px, py]) => [x + (px * c - py * s) / 2, y + (px * s + py * c) / 2]));
  }
  g.fillStyle(0xf6f0dc);
  g.fillRoundedRect(70, 70, 120, 140, 10);
  g.lineStyle(2, 0x9a8a60);
  for (let y = 100; y < 200; y += 10) g.lineBetween(84, y, 176, y);
  strokeText(g, '116', 130, 86, 18, 0x9b2a2a, 3);
  g.fillStyle(0x140f0d);
  g.fillEllipse(104, 130, 22, f ? 10 : 18);
  g.fillEllipse(156, 130, 22, f ? 10 : 18);
  g.fillStyle(0xff3b30);
  g.fillCircle(104, 130, 4);
  g.fillCircle(156, 130, 4);
  g.fillStyle(0x140f0d);
  g.fillEllipse(130, 176, 54, f ? 30 : 12);
}

function bossBeast(g, f, color, dark, label) {
  // 240x220 question-mark beast. Nobody knows what these are, including the book.
  const k = f ? 6 : -6;
  g.fillStyle(dark);
  [[60, k], [100, -k], [150, k], [190, -k]].forEach(([x, d]) => g.fillRoundedRect(x - 12 + d, 160, 26, 58, 8));
  g.fillStyle(color);
  g.fillEllipse(124, 110, 220, 150);
  g.fillEllipse(40, 80, 80, 70);
  strokeText(g, '?', 140, 112, 80, 0xffffff, 10);
  g.fillStyle(0xffffff);
  g.fillCircle(30, 70, 14);
  g.fillStyle(0x140f0d);
  g.fillCircle(26, 72, 6);
  g.fillEllipse(24, 100, 30, f ? 22 : 8);
  g.fillStyle(0xf6f3ea);
  g.fillRoundedRect(150, 160, 84, 24, 4);
  strokeText(g, label, 192, 172, 11, 0x140f0d, 2);
}

function bossBank(g, f) {
  // KIRTLAND SAFETY SOCIETY ANTI-BANKING CO, 260x280
  g.fillStyle(0xe8e0d0);
  g.fillRect(20, 80, 220, 196);
  g.fillStyle(0xd0c6b0);
  g.fillTriangle(10, 82, 250, 82, 130, 20);
  g.fillStyle(0xf6f0e4);
  for (let x = 40; x < 230; x += 46) g.fillRect(x, 104, 16, 150);
  g.fillStyle(0x3a2a1e);
  g.fillRect(104, 196, 52, 80);
  g.fillStyle(0x9b2a2a);
  g.fillRect(30, 86, 200, 20);
  strokeText(g, 'SAFETY SOCIETY', 130, 96, 10, 0xffe9a0, 2);
  // the vault door mouth
  g.fillStyle(0x140f0d);
  g.fillEllipse(130, 160, 90, f ? 56 : 18);
  g.fillStyle(0xcfe0b8);
  if (f) [[100, 160], [130, 166], [160, 158]].forEach(([x, y]) => g.fillRect(x - 10, y - 6, 20, 10));
  g.fillStyle(0xffffff);
  g.fillCircle(90, 126, 12);
  g.fillCircle(170, 126, 12);
  g.fillStyle(0x140f0d);
  g.fillCircle(86, 128, 5);
  g.fillCircle(166, 128, 5);
  g.fillStyle(0xf6f3ea);
  g.fillRect(70, 30, 120, 26);
  strokeText(g, 'CLOSED 1837', 130, 43, 11, 0x9b2a2a, 2.2);
}

function bossMummies(g, f) {
  // 260x260: THE MUMMIES. Bought from a travelling exhibition. Real ones.
  [[60, 150, -0.2], [130, 120, 0], [200, 150, 0.2]].forEach(([x, y, tilt], i) => {
    const bob = f ? (i % 2 ? 6 : -6) : 0;
    g.fillStyle(0xd9cfa8);
    poly(g, [[x - 30, y - 80 + bob], [x + 30, y - 80 + bob], [x + 36 + tilt * 40, y + 90 + bob], [x - 36 + tilt * 40, y + 90 + bob]]);
    g.fillCircle(x, y - 84 + bob, 26);
    g.lineStyle(2, 0x9a8a60);
    for (let yy = y - 70; yy < y + 86; yy += 12) g.lineBetween(x - 32, yy + bob, x + 32, yy + 8 + bob);
    g.fillStyle(0x140f0d);
    g.fillRect(x - 18, y - 92 + bob, 36, 8);
    g.fillStyle(0xffe14d);
    g.fillCircle(x - 8, y - 88 + bob, 2.5);
    g.fillCircle(x + 8, y - 88 + bob, 2.5);
    if (f) {
      g.lineStyle(7, 0xd9cfa8);
      g.lineBetween(x - 28, y - 50 + bob, x - 64, y - 60 + bob);
    }
  });
  g.fillStyle(0xf6f3ea);
  g.fillRect(50, 232, 160, 24);
  strokeText(g, 'SEE THEM 25 CENTS', 130, 244, 10, 0x140f0d, 2);
}

export function createMormonArt(scene) {
  if (scene.textures.exists('joseph0')) return;
  GALLOP.forEach((legs, i) => make(scene, `joseph${i}`, 128, 112, (g) => drawJoseph(g, legs)));
  make(scene, 'josephJump', 128, 112, (g) => drawJoseph(g, TUCK));
  if (!scene.anims.exists('josephGallop')) {
    scene.anims.create({ key: 'josephGallop', frames: [0, 1, 2, 3].map((i) => ({ key: `joseph${i}` })), frameRate: 12, repeat: -1 });
  }
  make(scene, 'pepperbox', 84, 34, drawPepperbox);

  const enemies = [
    ['bomhorse', 100, 44, horse, 6],
    ['bomsalamander', 64, 58, salamander, 5],
    ['curelom', 56, 46, (g, f) => questionBlob(g, 56, 46, 0xa86bff, 0x5a3a8a, f, 2), 5],
    ['bombee', 40, 32, bee, 14],
    ['bomelephant', 124, 92, elephant, 8],
    ['cumom', 70, 50, (g, f) => questionBlob(g, 70, 50, 0xff8a3a, 0x8a4a1a, f, 4), 5],
    ['bomplates', 98, 120, plates, 4],
    ['bomtablet', 64, 60, tablet, 4],
    ['bommummy', 64, 62, mummy, 6],
    ['bomsword', 60, 42, sword, 5],
  ];
  enemies.forEach(([key, w, h, draw, rate]) => {
    make(scene, `${key}0`, w, h, (g) => draw(g, 0));
    make(scene, `${key}1`, w, h, (g) => draw(g, 1));
    anim2(scene, key, rate);
  });

  make(scene, 'seerstone', 52, 52, seerstone);
  make(scene, 'urim', 52, 52, urim);
  make(scene, 'spiritualeyes', 52, 52, spiritualEyes);
  make(scene, 'bargestone', 52, 52, bargeStone);
  make(scene, 'liahona', 52, 52, liahona);
  make(scene, 'bomtrumpet', 52, 52, trumpet);
  make(scene, 'bomplate', 30, 30, plate);

  make(scene, 'bompage', 30, 36, page);
  make(scene, 'bomnote', 40, 22, note);
  make(scene, 'bomquestion', 32, 32, question);

  make(scene, 'bossPages0', 260, 280, (g) => bossPages(g, 0));
  make(scene, 'bossPages1', 260, 280, (g) => bossPages(g, 1));
  anim2(scene, 'bossPages', 3);
  make(scene, 'bossCurelom0', 240, 220, (g) => bossBeast(g, 0, 0xa86bff, 0x5a3a8a, 'CURELOM'));
  make(scene, 'bossCurelom1', 240, 220, (g) => bossBeast(g, 1, 0xa86bff, 0x5a3a8a, 'CURELOM'));
  anim2(scene, 'bossCurelom', 4);
  make(scene, 'bossCumom0', 240, 220, (g) => bossBeast(g, 0, 0xff8a3a, 0x8a4a1a, 'CUMOM'));
  make(scene, 'bossCumom1', 240, 220, (g) => bossBeast(g, 1, 0xff8a3a, 0x8a4a1a, 'CUMOM'));
  anim2(scene, 'bossCumom', 4);
  make(scene, 'bossBank0', 260, 280, (g) => bossBank(g, 0));
  make(scene, 'bossBank1', 260, 280, (g) => bossBank(g, 1));
  anim2(scene, 'bossBank', 2);
  make(scene, 'bossMummies0', 260, 260, (g) => bossMummies(g, 0));
  make(scene, 'bossMummies1', 260, 260, (g) => bossMummies(g, 1));
  anim2(scene, 'bossMummies', 3);
}

import Phaser from 'phaser';

// Placeholder art, drawn in code so the greybox needs zero asset files.
// Every key here gets swapped for commissioned art later, same names, same sizes.

const RAINBOW = [0xff4d4d, 0xff9f2e, 0xffe14d, 0x5fd35f, 0x4da6ff, 0xa66bff];

export function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  // headless test runs have no renderer to draw with, so they get blank textures of the right size
  if (scene.sys.game.config.renderType === Phaser.HEADLESS) {
    scene.textures.createCanvas(key, w, h);
    return;
  }
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function poly(g, pts) {
  g.fillPoints(pts.map(([x, y]) => ({ x, y })), true);
}

// Hero = unicorn + rider, minus the guns (those are separate sprites so they can recoil).
const GALLOP = [
  [0.6, 0.3, -0.5, -0.2],
  [0.2, -0.1, -0.1, 0.2],
  [-0.4, -0.6, 0.4, 0.6],
  [0.1, -0.2, 0.2, -0.1],
];
const TUCK = [1.0, 1.25, -1.0, -1.25];

// quadratic bezier sampled into points, so Graphics can stroke soft curves
export function qcurve(p0, p1, p2, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({ x: u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y: u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1] });
  }
  return pts;
}

export function strokeCurve(g, width, color, p0, p1, p2, alpha = 1) {
  g.lineStyle(width, color, alpha);
  g.strokePoints(qcurve(p0, p1, p2), false);
}

// soft glow: stacked translucent circles
export function glow(g, x, y, r, color, alpha = 0.12, steps = 5) {
  for (let i = steps; i >= 1; i--) {
    g.fillStyle(color, alpha);
    g.fillCircle(x, y, (r * i) / steps);
  }
}

function heroLeg(g, hx, hy, a, far) {
  const L = 26;
  const kx = hx + Math.sin(a) * L * 0.5;
  const ky = hy + Math.cos(a) * L * 0.5;
  const fx = hx + Math.sin(a * 0.6) * L;
  const fy = hy + Math.cos(a * 0.6) * L;
  const out = far ? 0x8a3f6c : 0xa34d80;
  const fill = far ? 0xc76aa0 : 0xf1a5cd;
  const hi = far ? 0xd884b4 : 0xffd3ea;
  g.lineStyle(far ? 9 : 10, out);
  g.lineBetween(hx, hy, kx, ky);
  g.lineBetween(kx, ky, fx, fy);
  g.lineStyle(far ? 6 : 7, fill);
  g.lineBetween(hx, hy, kx, ky);
  g.lineBetween(kx, ky, fx, fy);
  g.lineStyle(2, hi, 0.8);
  g.lineBetween(hx - 2, hy, kx - 2, ky);
  // feathered fetlock + golden hoof
  g.fillStyle(far ? 0xd9c4e8 : 0xffffff, 0.85);
  g.fillEllipse(fx, fy - 2, 9, 6);
  g.fillStyle(far ? 0x9a7420 : 0xc99a1a);
  g.fillEllipse(fx, fy + 2, 10, 6);
  g.fillStyle(far ? 0xc99a1a : 0xffd447);
  g.fillEllipse(fx - 1, fy + 1, 6, 3);
}

function drawHero(g, legs) {
  const hips = [
    [84, 80], [92, 80], // front
    [36, 80], [44, 80], // back
  ];

  // halo glow sits behind everything
  glow(g, 58, 12, 22, 0xfff3b0, 0.1, 6);

  // far-side legs first (darker)
  [1, 3].forEach((i) => heroLeg(g, hips[i][0], hips[i][1], legs[i], true));

  // flowing rainbow tail, strand by strand
  RAINBOW.forEach((c, i) => {
    const o = i * 2.2;
    strokeCurve(g, 5, c, [28, 60 + o * 0.4], [6 + o, 58 + o], [3 + i, 82 + o * 1.6]);
    strokeCurve(g, 1.5, 0xffffff, [26, 60 + o * 0.4], [8 + o, 57 + o], [5 + i, 78 + o * 1.4], 0.35);
  });

  // body: outline, base, belly shadow, back highlight
  g.fillStyle(0xa34d80);
  g.fillEllipse(62, 72, 88, 44);
  g.fillStyle(0xe58bbd);
  g.fillEllipse(62, 72, 84, 40);
  g.fillStyle(0xf6b0d6);
  g.fillEllipse(62, 67, 78, 30);
  g.fillStyle(0xffd3ea);
  g.fillEllipse(58, 60, 56, 10);
  g.fillStyle(0xc96fa2, 0.6);
  g.fillEllipse(64, 86, 64, 10);
  // dappled sparkle on the flank
  g.fillStyle(0xffffff, 0.7);
  [[34, 70, 1.6], [40, 76, 1], [82, 74, 1.3]].forEach(([x, y, r]) => g.fillCircle(x, y, r));

  // neck + head with an outline pass
  g.fillStyle(0xa34d80);
  poly(g, [[82, 64], [97, 25], [116, 32], [104, 76]]);
  g.fillEllipse(110, 32, 33, 23);
  g.fillEllipse(121, 38, 19, 16);
  g.fillStyle(0xf6b0d6);
  poly(g, [[84, 62], [98, 28], [114, 34], [102, 74]]);
  g.fillEllipse(110, 32, 30, 20);
  g.fillEllipse(121, 38, 16, 13);
  g.fillStyle(0xffd3ea);
  g.fillEllipse(108, 27, 18, 7);
  g.fillStyle(0xe58bbd, 0.7);
  g.fillEllipse(100, 56, 10, 26);
  // muzzle blush + nostril
  g.fillStyle(0xff8fc0, 0.6);
  g.fillEllipse(122, 41, 9, 5);
  g.fillStyle(0x7a4a6a);
  g.fillEllipse(125, 37, 3, 2);
  g.lineStyle(1.2, 0x7a4a6a);
  g.lineBetween(118, 43, 125, 43);
  // ear
  g.fillStyle(0xa34d80);
  g.fillTriangle(100, 24, 105, 9, 110, 25);
  g.fillStyle(0xf6b0d6);
  g.fillTriangle(101, 23, 105, 11, 109, 24);
  g.fillStyle(0xff8fc0);
  g.fillTriangle(103, 22, 105, 15, 107, 23);
  // horn: glowing, spiral-banded
  glow(g, 116, 12, 10, 0xfff3b0, 0.12, 4);
  g.fillStyle(0xc99a1a);
  g.fillTriangle(105, 24, 114, 21, 124, 0);
  g.fillStyle(0xffd447);
  g.fillTriangle(106, 23, 113, 21, 123, 1);
  g.fillStyle(0xfff3b0);
  g.fillTriangle(107, 22, 109, 21, 122, 3);
  g.lineStyle(1.5, 0xb07a10);
  g.lineBetween(108, 18, 114, 17);
  g.lineBetween(111, 12, 116, 11);
  g.lineBetween(114, 7, 118, 6);
  // eye with lashes
  g.fillStyle(0x2a1530);
  g.fillEllipse(112, 29, 7, 8);
  g.fillStyle(0x6a3cbf);
  g.fillCircle(112, 30, 2.4);
  g.fillStyle(0xffffff);
  g.fillCircle(113, 27.5, 1.4);
  g.fillCircle(111, 31, 0.7);
  g.lineStyle(1.4, 0x2a1530);
  g.lineBetween(109, 25, 106, 23);
  g.lineBetween(111, 25, 110, 22);
  g.lineBetween(113, 25, 114, 22);
  // flowing rainbow mane down the neck
  RAINBOW.forEach((c, i) => {
    const y0 = 20 + i * 6;
    strokeCurve(g, 4.5, c, [102 - i * 1.5, y0], [92 - i * 2, y0 + 2], [84 - i * 3, y0 + 12]);
    strokeCurve(g, 1.2, 0xffffff, [101 - i * 1.5, y0 - 1], [92 - i * 2, y0 + 1], [86 - i * 3, y0 + 9], 0.45);
  });
  // forelock
  strokeCurve(g, 4, 0xff4d4d, [104, 21], [112, 18], [116, 24]);
  strokeCurve(g, 3, 0xa66bff, [103, 23], [110, 22], [113, 28]);

  // near-side legs
  [0, 2].forEach((i) => heroLeg(g, hips[i][0], hips[i][1], legs[i], false));

  // saddle blanket, royal purple with gold trim
  g.fillStyle(0x5a2a86);
  poly(g, [[40, 62], [78, 62], [74, 80], [44, 80]]);
  g.fillStyle(0x7a3cb0);
  poly(g, [[42, 62], [76, 62], [73, 74], [45, 74]]);
  g.fillStyle(0xffd447);
  g.fillRect(44, 77, 30, 3);
  [48, 56, 64, 72].forEach((x) => g.fillTriangle(x - 2, 80, x + 2, 80, x, 84));

  // rider: robe over the unicorn's back, with folds
  g.fillStyle(0xb8a77a);
  poly(g, [[43, 67], [77, 67], [73, 49], [47, 49]]);
  g.fillStyle(0xf4ecd2);
  poly(g, [[44, 66], [76, 66], [72, 50], [48, 50]]);
  g.fillStyle(0xb8a77a);
  poly(g, [[55, 64], [61, 91], [72, 89], [71, 61]]);
  g.fillStyle(0xf4ecd2);
  poly(g, [[56, 64], [62, 89], [71, 87], [70, 62]]);
  g.lineStyle(1.5, 0xcbbd92);
  g.lineBetween(52, 52, 50, 64);
  g.lineBetween(60, 52, 58, 65);
  g.lineBetween(66, 66, 66, 86);
  g.lineBetween(62, 68, 64, 86);
  // sandal
  g.fillStyle(0x6b4a2b);
  g.fillEllipse(67, 91, 13, 6);
  g.fillStyle(0xd9a77a);
  g.fillEllipse(68, 89, 9, 4);
  g.lineStyle(1.2, 0x6b4a2b);
  g.lineBetween(64, 87, 70, 91);

  // long flowing hair behind the shoulders
  g.fillStyle(0x3e2614);
  poly(g, [[46, 10], [64, 8], [58, 26], [52, 40], [42, 36], [44, 22]]);
  g.fillStyle(0x5b3a1f);
  poly(g, [[47, 10], [62, 9], [57, 25], [51, 37], [44, 33], [46, 20]]);
  strokeCurve(g, 1.5, 0x8a5a2e, [50, 12], [46, 24], [46, 34], 0.9);
  strokeCurve(g, 1.5, 0x8a5a2e, [54, 12], [52, 26], [50, 36], 0.7);

  // torso: white robe, outline, folds
  g.fillStyle(0xb8a77a);
  poly(g, [[47, 55], [73, 55], [68, 23], [51, 23]]);
  g.fillStyle(0xf4ecd2);
  poly(g, [[48, 54], [72, 54], [67, 24], [52, 24]]);
  g.fillStyle(0xffffff, 0.8);
  poly(g, [[62, 26], [67, 25], [71, 52], [66, 52]]);
  g.lineStyle(1.2, 0xcbbd92);
  g.lineBetween(55, 30, 53, 52);
  g.lineBetween(59, 32, 58, 52);
  // red sash
  g.lineStyle(6, 0x7a1418);
  g.lineBetween(53, 26, 69, 52);
  g.lineStyle(4, 0xc8323a);
  g.lineBetween(53, 26, 69, 52);
  g.lineStyle(1.2, 0xff7a80);
  g.lineBetween(54, 25, 70, 50);
  // sash tail fluttering behind
  g.fillStyle(0xc8323a);
  poly(g, [[50, 50], [38, 46], [34, 52], [42, 54]]);
  g.fillStyle(0x7a1418);
  g.fillTriangle(34, 52, 42, 54, 36, 56);
  // ammo belt across the chest, with brass rounds
  g.lineStyle(3.5, 0x6b4a2b);
  g.lineBetween(66, 25, 50, 50);
  g.fillStyle(0xffd447);
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    g.fillCircle(66 - 16 * t, 25 + 25 * t, 1.6);
  }

  // halo ring, two tone
  g.lineStyle(4, 0xc99a1a, 0.9);
  g.strokeEllipse(57, 4, 28, 8);
  g.lineStyle(2.5, 0xffe680);
  g.strokeEllipse(57, 3.5, 26, 7);
  g.lineStyle(1, 0xffffff, 0.9);
  g.lineBetween(49, 1.5, 55, 0.5);

  // head: hair cap, face, beard
  g.fillStyle(0x3e2614);
  g.fillEllipse(56, 15, 22, 24);
  g.fillStyle(0x5b3a1f);
  g.fillEllipse(56, 15, 20, 22);
  g.fillStyle(0xa8714a);
  g.fillCircle(61, 14, 8.6);
  g.fillStyle(0xd9a77a);
  g.fillCircle(61, 14, 8);
  g.fillStyle(0xeec29a);
  g.fillEllipse(64, 11, 6, 6);
  // hair part + fringe over the brow
  g.fillStyle(0x5b3a1f);
  poly(g, [[53, 6], [62, 4], [68, 8], [60, 9], [55, 14]]);
  g.lineStyle(1.2, 0x8a5a2e);
  g.lineBetween(57, 6, 54, 13);
  // beard
  g.fillStyle(0x3e2614);
  g.fillEllipse(62, 22, 14, 12);
  g.fillStyle(0x5b3a1f);
  g.fillEllipse(62, 22, 12.5, 11);
  g.fillTriangle(57, 24, 67, 24, 62, 30);
  g.lineStyle(1, 0x8a5a2e, 0.9);
  g.lineBetween(60, 21, 60, 27);
  g.lineBetween(64, 21, 63, 26);
  // eye and brow (laser origin lives right here, at 66,12)
  g.fillStyle(0xffffff);
  g.fillEllipse(65.5, 12, 4, 3);
  g.fillStyle(0x3a6ab0);
  g.fillCircle(66, 12, 1.3);
  g.lineStyle(1.4, 0x3e2614);
  g.lineBetween(63, 9.5, 68, 9.5);
  // nose + serene little smile
  g.lineStyle(1.2, 0xa8714a);
  g.lineBetween(68, 13, 69, 16);
  g.lineStyle(1.2, 0x7a3a2a);
  g.lineBetween(63, 19.5, 67, 19);

  // arm reaching to the guns, sleeve shaded
  g.lineStyle(9, 0xb8a77a);
  g.lineBetween(58, 30, 74, 42);
  g.lineStyle(7, 0xf4ecd2);
  g.lineBetween(58, 30, 74, 42);
  g.lineStyle(2, 0xffffff, 0.8);
  g.lineBetween(59, 28, 74, 39);
  g.fillStyle(0xd9a77a);
  g.fillCircle(75, 42, 3);
}

function drawGun(g) {
  // ammo belt dangling from the receiver
  g.fillStyle(0xc99a1a);
  for (let i = 0; i < 6; i++) {
    g.fillRect(6 - i * 0.6, 18 + i * 2.6, 6, 3);
  }
  // receiver
  g.fillStyle(0x3a3a42);
  g.fillRoundedRect(0, 4, 32, 14, 4);
  g.fillStyle(0x55555f);
  g.fillRect(4, 6, 22, 3);
  // barrels
  g.lineStyle(3, 0x9a9aa6);
  g.lineBetween(30, 7, 82, 7);
  g.lineBetween(30, 11, 82, 11);
  g.lineBetween(30, 15, 82, 15);
  g.fillStyle(0x3a3a42);
  g.fillRect(58, 4, 6, 14);
  g.fillRect(78, 4, 5, 14);
  // grip
  g.fillStyle(0x2a2a30);
  g.fillRect(10, 16, 7, 8);
}

function drawSerpent(g, phase) {
  const segs = 10;
  for (let i = segs - 1; i >= 0; i--) {
    const x = 18 + i * 8.5;
    const y = 28 + Math.sin(i * 0.9 + phase) * 6;
    const r = 10 - i * 0.55;
    g.fillStyle(i % 2 ? 0x2f8a3d : 0x3fa34d);
    g.fillCircle(x, y, r);
    g.fillStyle(0xb7e07a);
    g.fillCircle(x, y + r * 0.45, r * 0.45);
  }
  const hy = 28 + Math.sin(phase) * 6;
  g.fillStyle(0x3fa34d);
  g.fillEllipse(14, hy - 2, 28, 19);
  g.fillStyle(0xffe14d);
  g.fillCircle(9, hy - 6, 4);
  g.fillStyle(0xd61f1f);
  g.fillEllipse(9, hy - 6, 2, 6);
  g.lineStyle(2, 0xd61f1f);
  g.lineBetween(1, hy + 1, -6, hy + 1);
  g.lineBetween(2, hy + 1, 0, hy + 5);
  g.lineBetween(2, hy + 1, 0, hy - 3);
}

function drawImp(g, up) {
  g.fillStyle(0x2c1838);
  if (up) {
    g.fillTriangle(26, 26, 2, 4, 10, 30);
    g.fillTriangle(38, 26, 62, 4, 54, 30);
  } else {
    g.fillTriangle(24, 28, 0, 44, 14, 24);
    g.fillTriangle(40, 28, 64, 44, 50, 24);
  }
  // tail
  g.lineStyle(3, 0x4a2a5e);
  g.lineBetween(32, 40, 44, 52);
  g.fillStyle(0x4a2a5e);
  g.fillTriangle(42, 52, 50, 50, 46, 56);
  // body
  g.fillStyle(0x6a3c84);
  g.fillCircle(32, 30, 14);
  // horns
  g.fillStyle(0xe8d9b0);
  g.fillTriangle(22, 22, 20, 8, 28, 18);
  g.fillTriangle(42, 22, 44, 8, 36, 18);
  // face
  g.fillStyle(0xffe14d);
  g.fillCircle(26, 28, 4);
  g.fillCircle(38, 28, 4);
  g.fillStyle(0x1b1430);
  g.fillCircle(26, 29, 1.6);
  g.fillCircle(38, 29, 1.6);
  g.lineStyle(2, 0x1b1430);
  g.lineBetween(26, 37, 38, 37);
}

function drawWing(g, up) {
  g.fillStyle(0xffffff);
  if (up) {
    poly(g, [[6, 44], [20, 8], [44, 0], [70, 4], [52, 18], [62, 22], [42, 32], [48, 38], [24, 44]]);
  } else {
    poly(g, [[6, 6], [24, 2], [48, 8], [70, 30], [50, 28], [58, 40], [36, 36], [38, 44], [16, 24]]);
  }
  g.lineStyle(1.5, 0xc9d6ea);
  if (up) {
    g.lineBetween(12, 40, 44, 6);
    g.lineBetween(16, 42, 54, 20);
  } else {
    g.lineBetween(12, 8, 52, 30);
    g.lineBetween(14, 10, 40, 38);
  }
}

function drawDirt(g) {
  g.fillStyle(0x7a4f2e);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle(0x6a4226);
  [[10, 30], [40, 12], [24, 50], [52, 40], [6, 6], [34, 28]].forEach(([x, y]) => g.fillEllipse(x, y, 10, 6));
  g.fillStyle(0x8f6440);
  [[10, 28], [40, 10], [24, 48], [52, 38], [34, 26]].forEach(([x, y]) => g.fillEllipse(x - 1, y - 1, 5, 2));
  g.fillStyle(0xa8805a);
  [[18, 40], [48, 56], [30, 16], [58, 22]].forEach(([x, y]) => g.fillCircle(x, y, 1.8));
  g.fillStyle(0x4f321c, 0.6);
  [[44, 46], [14, 58], [60, 4]].forEach(([x, y]) => g.fillCircle(x, y, 1.5));
}

function drawGround(g) {
  drawDirt(g);
  // grass band: dark base, mid, sunlit top, blades
  g.fillStyle(0x2f7a2a);
  g.fillRect(0, 0, 64, 16);
  for (let x = 0; x < 64; x += 8) g.fillTriangle(x, 15, x + 8, 15, x + 4, 22);
  g.fillStyle(0x4aa63c);
  g.fillRect(0, 0, 64, 13);
  for (let x = 0; x < 64; x += 8) g.fillTriangle(x + 1, 13, x + 7, 13, x + 4, 18);
  g.fillStyle(0x6ccf52);
  g.fillRect(0, 0, 64, 6);
  g.fillStyle(0x9be87a);
  g.fillRect(0, 0, 64, 2);
  g.lineStyle(1.5, 0x9be87a, 0.8);
  [[6, 9], [20, 10], [34, 8], [50, 10]].forEach(([x, y]) => g.lineBetween(x, y, x + 3, y - 4));
  g.fillStyle(0xffffff);
  g.fillCircle(27, 5, 1.5);
  g.fillStyle(0xffe14d);
  g.fillCircle(57, 6, 1.5);
}

function drawPlatform(g) {
  g.fillStyle(0xb9b2a2);
  g.fillRoundedRect(0, 0, 64, 24, 3);
  g.fillStyle(0xd8d2c4);
  g.fillRect(0, 0, 64, 8);
  g.lineStyle(1.5, 0x8d8676);
  g.lineBetween(20, 9, 26, 22);
  g.lineBetween(46, 6, 42, 18);
  g.lineStyle(2, 0x8d8676);
  g.lineBetween(63, 0, 63, 24);
}

function drawThorns(g) {
  g.fillStyle(0x5a3a1f);
  [[8, 58, 22, 6], [30, 58, 34, 4], [50, 58, 40, 8]].forEach(([x1, y1, x2, y2]) => {
    g.fillTriangle(x1 - 3, y1, x1 + 3, y1, x2, y2);
  });
  g.fillStyle(0x2f5b2a);
  g.fillEllipse(32, 46, 62, 30);
  g.fillStyle(0x3d7335);
  g.fillEllipse(24, 40, 30, 18);
  g.fillEllipse(42, 42, 28, 16);
  g.fillStyle(0xe8d9b0);
  [[6, 36, -1], [16, 26, -0.6], [30, 22, 0], [46, 26, 0.6], [58, 36, 1], [22, 46, -0.3], [40, 48, 0.3]].forEach(([x, y, a]) => {
    const tx = x + Math.sin(a) * 10;
    const ty = y - Math.cos(a) * 10;
    g.fillTriangle(x - 3, y, x + 3, y, tx, ty);
  });
}

function drawGate(g) {
  // light rays fanning up from behind the gate
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.2;
    const ex = 90 + Math.cos(a) * 240;
    const ey = 200 + Math.sin(a) * 240;
    g.fillStyle(0xfff6d6, i % 2 ? 0.12 : 0.2);
    g.fillTriangle(90 - 6, 200, 90 + 6, 200, ex, ey);
  }
  glow(g, 90, 140, 80, 0xfff6d6, 0.08, 6);
  // the doorway glow
  g.fillStyle(0xfff6d6, 0.45);
  g.fillRect(30, 80, 120, 220);
  g.fillEllipse(90, 80, 120, 100);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(50, 100, 80, 200);
  // pillars: outline, gold, highlight stripe, pearl studs
  [[14, 70], [144, 70]].forEach(([x, y]) => {
    g.fillStyle(0x9a7420);
    g.fillRect(x - 2, y, 26, 230);
    g.fillStyle(0xffd447);
    g.fillRect(x, y, 22, 230);
    g.fillStyle(0xfff3b0);
    g.fillRect(x + 4, y, 5, 230);
    g.fillStyle(0xc99a1a);
    g.fillRect(x + 16, y, 6, 230);
    for (let py = y + 20; py < 290; py += 30) {
      g.fillStyle(0xe8e4f0);
      g.fillCircle(x + 11, py, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(x + 9.5, py - 1.5, 2);
    }
  });
  // arch, layered
  g.lineStyle(24, 0x9a7420);
  g.beginPath();
  g.arc(90, 80, 66, Math.PI, 0, false);
  g.strokePath();
  g.lineStyle(20, 0xffd447);
  g.beginPath();
  g.arc(90, 80, 66, Math.PI, 0, false);
  g.strokePath();
  g.lineStyle(4, 0xfff3b0);
  g.beginPath();
  g.arc(90, 80, 72, Math.PI * 1.05, Math.PI * 1.7, false);
  g.strokePath();
  // pearls along the arch
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const px = 90 + Math.cos(a) * 66;
    const py = 80 + Math.sin(a) * 66;
    g.fillStyle(0xe8e4f0);
    g.fillCircle(px, py, 6);
    g.fillStyle(0xffffff);
    g.fillCircle(px - 2, py - 2, 2.4);
  }
  // wrought gold bars
  g.lineStyle(3, 0xc99a1a, 0.85);
  for (let bx = 46; bx <= 134; bx += 22) g.lineBetween(bx, 96, bx, 300);
  g.lineStyle(3, 0xc99a1a, 0.85);
  g.lineBetween(36, 180, 144, 180);
  // plinths
  g.fillStyle(0x9a7420);
  g.fillRect(8, 282, 34, 18);
  g.fillRect(138, 282, 34, 18);
  g.fillStyle(0xd9b44a);
  g.fillRect(8, 282, 34, 6);
  g.fillRect(138, 282, 34, 6);
  // cross on top, glowing
  glow(g, 90, 12, 16, 0xfff3b0, 0.14, 4);
  g.fillStyle(0xc99a1a);
  g.fillRect(83, 0, 14, 28);
  g.fillRect(75, 5, 30, 10);
  g.fillStyle(0xffd447);
  g.fillRect(85, 0, 10, 26);
  g.fillRect(77, 7, 26, 6);
  g.fillStyle(0xfff3b0);
  g.fillRect(86, 1, 3, 24);
}

function drawHalo(g) {
  glow(g, 15, 15, 15, 0xfff3b0, 0.1, 4);
  g.lineStyle(6, 0xc99a1a);
  g.strokeEllipse(15, 15, 24, 24);
  g.lineStyle(4, 0xffd447);
  g.strokeEllipse(15, 15, 24, 24);
  g.lineStyle(1.5, 0xfff8d0);
  g.beginPath();
  g.arc(15, 15, 11, Math.PI * 1.05, Math.PI * 1.6, false);
  g.strokePath();
  g.fillStyle(0xffffff);
  g.fillCircle(8, 9, 1.6);
}

export function drawBubble(g) {
  g.fillStyle(0xffffff, 0.18);
  g.fillCircle(26, 26, 25);
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokeCircle(26, 26, 24);
  g.fillStyle(0xffffff, 0.7);
  g.fillEllipse(16, 14, 10, 6);
}

function drawLoaves(g) {
  drawBubble(g);
  g.fillStyle(0xc98a3e);
  g.fillEllipse(22, 30, 30, 18);
  g.fillStyle(0xe0a85a);
  g.fillEllipse(22, 27, 26, 12);
  g.lineStyle(2, 0x9c6424);
  g.lineBetween(14, 24, 16, 30);
  g.lineBetween(21, 23, 23, 30);
  g.lineBetween(28, 24, 30, 30);
  g.fillStyle(0x6fb3e8);
  g.fillEllipse(32, 38, 20, 9);
  g.fillTriangle(41, 38, 47, 33, 47, 43);
  g.fillStyle(0x1b1430);
  g.fillCircle(26, 37, 1.3);
}

function drawWine(g) {
  drawBubble(g);
  g.fillStyle(0xe8e0d0);
  g.fillRect(24, 30, 4, 10);
  g.fillEllipse(26, 41, 16, 5);
  g.fillStyle(0x7a1e4a);
  g.beginPath();
  g.arc(26, 20, 10, 0, Math.PI, false);
  g.fillPath();
  g.lineStyle(2, 0xe8e0d0);
  g.beginPath();
  g.arc(26, 20, 10, 0, Math.PI, false);
  g.strokePath();
  g.lineBetween(16, 20, 16, 14);
  g.lineBetween(36, 20, 36, 14);
}

function drawHeart(g, full) {
  const pts = [];
  for (let t = 0; t < Math.PI * 2; t += 0.1) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([16 + x * 0.9, 14 + y * 0.9]);
  }
  if (full) {
    g.fillStyle(0xff3b4a);
    poly(g, pts);
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(10, 8, 6, 4);
  } else {
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokePoints(pts.map(([x, y]) => ({ x, y })), true);
  }
}

// lighten (k > 0) toward white or darken (k < 0) toward black
export function shade(c, k) {
  const r = (c >> 16) & 255;
  const gr = (c >> 8) & 255;
  const b = c & 255;
  const f = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return (f(r) << 16) | (f(gr) << 8) | f(b);
}

export function drawHills(g, w, h, color, amp, base, waves) {
  const bottom = h - 3;
  const yAt = (x) => base + Math.sin((x / w) * Math.PI * 2 * waves) * amp + Math.sin((x / w) * Math.PI * 2 * (waves + 1)) * amp * 0.4;
  const ridge = [];
  for (let x = 0; x <= w; x += 8) ridge.push([x, yAt(x)]);
  // sunlit rim
  g.fillStyle(shade(color, 0.28));
  poly(g, [[0, bottom], ...ridge.map(([x, y]) => [x, y - 3]), [w, bottom]]);
  g.fillStyle(color);
  poly(g, [[0, bottom], ...ridge.map(([x, y]) => [x, y + 2]), [w, bottom]]);
  // shaded lower slopes
  g.fillStyle(shade(color, -0.12));
  poly(g, [[0, bottom], ...ridge.map(([x, y]) => [x, y + (bottom - y) * 0.45 + 6]), [w, bottom]]);
  g.fillStyle(shade(color, -0.22), 0.7);
  poly(g, [[0, bottom], ...ridge.map(([x, y]) => [x, y + (bottom - y) * 0.75 + 8]), [w, bottom]]);
  // a few highlight strokes on the sunny faces
  g.lineStyle(2, shade(color, 0.4), 0.55);
  for (let x = 24; x < w; x += 72) {
    const y = yAt(x) + 10;
    g.lineBetween(x, y, x + 18, y + 2);
  }
}

function drawTrees(g) {
  const trees = [[70, 1], [250, 0.8], [400, 1.15]];
  trees.forEach(([x, s]) => {
    // ground shadow
    g.fillStyle(0x2a5a2a, 0.35);
    g.fillEllipse(x + 6 * s, 257, 90 * s, 10 * s);
    // trunk with bark shading
    g.fillStyle(0x4a321c);
    g.fillRect(x - 8 * s, 260 - 120 * s, 16 * s, 120 * s - 4);
    g.fillStyle(0x7a5532);
    g.fillRect(x - 6 * s, 260 - 120 * s, 9 * s, 120 * s - 4);
    g.fillStyle(0x9a7048, 0.7);
    g.fillRect(x - 5 * s, 260 - 110 * s, 3 * s, 100 * s);
    g.fillStyle(0x4a321c);
    g.fillTriangle(x - 8 * s, 256, x - 18 * s, 258, x - 6 * s, 236);
    g.fillTriangle(x + 8 * s, 256, x + 18 * s, 258, x + 6 * s, 236);
    // canopy: dark base, mid, sunlit tops
    const blobs = [[0, -140, 52], [-40, -115, 36], [40, -115, 36], [-22, -98, 30], [24, -96, 30]];
    g.fillStyle(0x24602c);
    blobs.forEach(([dx, dy, r]) => g.fillCircle(x + dx * s, 260 + dy * s, (r + 3) * s));
    g.fillStyle(0x3f8f45);
    blobs.forEach(([dx, dy, r]) => g.fillCircle(x + dx * s - 2 * s, 260 + dy * s - 2 * s, r * s));
    g.fillStyle(0x5cae5a);
    [[-12, -158, 26], [-46, -126, 18], [30, -130, 18], [6, -150, 20]].forEach(([dx, dy, r]) => g.fillCircle(x + dx * s, 260 + dy * s, r * s));
    g.fillStyle(0x8fd47a, 0.8);
    [[-18, -166, 10], [-50, -132, 7], [24, -140, 8]].forEach(([dx, dy, r]) => g.fillCircle(x + dx * s, 260 + dy * s, r * s));
    // forbidden fruit, glossy
    [[-20, -130], [18, -150], [30, -112], [-36, -108], [4, -120], [-6, -96]].forEach(([dx, dy]) => {
      g.fillStyle(0x9a1a16);
      g.fillCircle(x + dx * s, 260 + dy * s, 5.5 * s);
      g.fillStyle(0xe8352f);
      g.fillCircle(x + dx * s - 0.5 * s, 260 + dy * s - 0.5 * s, 4.6 * s);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(x + dx * s - 2 * s, 260 + dy * s - 2 * s, 1.4 * s);
    });
  });
  // flowers in the grass
  [[20, 0xffffff], [150, 0xffe14d], [320, 0xff9fd0], [470, 0xffffff]].forEach(([x, c]) => {
    g.fillStyle(c);
    [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([dx, dy]) => g.fillCircle(x + dx, 252 + dy, 2.2));
    g.fillStyle(0xffc23a);
    g.fillCircle(x, 252, 1.6);
  });
}

function drawClouds(g) {
  paintClouds(g, 0xffffff, 0.95);
}

// painted cumulus: shadowed underside, bright body, rim light
export function paintClouds(g, color, alpha) {
  const under = shade(color, -0.18);
  [[80, 70, 1], [300, 40, 0.7], [440, 110, 0.9]].forEach(([x, y, s]) => {
    g.fillStyle(under, alpha * 0.9);
    g.fillEllipse(x, y + 6 * s, 124 * s, 36 * s);
    g.fillEllipse(x - 32 * s, y + 10 * s, 70 * s, 26 * s);
    g.fillStyle(color, alpha);
    g.fillEllipse(x, y, 116 * s, 34 * s);
    g.fillEllipse(x - 30 * s, y + 3 * s, 64 * s, 26 * s);
    g.fillEllipse(x + 26 * s, y - 12 * s, 70 * s, 40 * s);
    g.fillEllipse(x - 8 * s, y - 16 * s, 46 * s, 30 * s);
    g.fillStyle(shade(color, 0.6), alpha * 0.7);
    g.fillEllipse(x + 20 * s, y - 22 * s, 40 * s, 14 * s);
    g.fillEllipse(x - 12 * s, y - 24 * s, 24 * s, 10 * s);
  });
}

export function createTextures(scene) {
  GALLOP.forEach((legs, i) => make(scene, `hero${i}`, 128, 112, (g) => drawHero(g, legs)));
  make(scene, 'heroJump', 128, 112, (g) => drawHero(g, TUCK));
  make(scene, 'minigun', 84, 34, drawGun);
  make(scene, 'serpent0', 100, 44, (g) => drawSerpent(g, 0));
  make(scene, 'serpent1', 100, 44, (g) => drawSerpent(g, Math.PI));
  make(scene, 'imp0', 64, 58, (g) => drawImp(g, true));
  make(scene, 'imp1', 64, 58, (g) => drawImp(g, false));
  make(scene, 'wing0', 72, 46, (g) => drawWing(g, true));
  make(scene, 'wing1', 72, 46, (g) => drawWing(g, false));
  make(scene, 'ground', 64, 64, drawGround);
  make(scene, 'dirt', 64, 64, drawDirt);
  make(scene, 'platform', 64, 24, drawPlatform);
  make(scene, 'thorns', 64, 60, drawThorns);
  make(scene, 'gate', 180, 300, drawGate);
  make(scene, 'halo', 30, 30, drawHalo);
  make(scene, 'loaves', 52, 52, drawLoaves);
  make(scene, 'wine', 52, 52, drawWine);
  make(scene, 'heart', 32, 30, (g) => drawHeart(g, true));
  make(scene, 'heartEmpty', 32, 30, (g) => drawHeart(g, false));
  make(scene, 'hillsFar', 512, 220, (g) => drawHills(g, 512, 220, 0xa9dba1, 26, 110, 1));
  make(scene, 'hillsNear', 512, 200, (g) => drawHills(g, 512, 200, 0x7cc46b, 22, 90, 2));
  make(scene, 'trees', 512, 260, drawTrees);
  make(scene, 'clouds', 512, 160, drawClouds);

  make(scene, 'bullet', 26, 6, (g) => {
    g.fillStyle(0xffc23a);
    g.fillRoundedRect(0, 0, 26, 6, 3);
    g.fillStyle(0xfffbe0);
    g.fillRoundedRect(8, 1, 18, 4, 2);
  });
  make(scene, 'flash', 30, 22, (g) => {
    g.fillStyle(0xffe14d);
    g.fillTriangle(0, 4, 30, 11, 0, 18);
    g.fillStyle(0xffffff);
    g.fillEllipse(8, 11, 14, 10);
  });
  make(scene, 'fireball', 24, 24, (g) => {
    g.fillStyle(0xff5a1f);
    g.fillCircle(12, 12, 11);
    g.fillStyle(0xffc23a);
    g.fillCircle(12, 12, 7);
    g.fillStyle(0xfff3b0);
    g.fillCircle(12, 12, 3);
  });
  make(scene, 'px', 8, 8, (g) => {
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 8, 8);
  });
  make(scene, 'spark', 16, 16, (g) => {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff);
    g.fillCircle(8, 8, 4);
  });

  // dawn sky gradient
  const sky = scene.textures.createCanvas('sky', 4, 256);
  const ctx = sky.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3a86d8');
  grad.addColorStop(0.35, '#6fb4f0');
  grad.addColorStop(0.62, '#b3e0ff');
  grad.addColorStop(0.85, '#fff0cf');
  grad.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  if (scene.sys.game.renderer) sky.refresh();

  const anims = scene.anims;
  if (!anims.exists('gallop')) {
    anims.create({ key: 'gallop', frames: [0, 1, 2, 3].map((i) => ({ key: `hero${i}` })), frameRate: 12, repeat: -1 });
    anims.create({ key: 'serpent', frames: [{ key: 'serpent0' }, { key: 'serpent1' }], frameRate: 5, repeat: -1 });
    anims.create({ key: 'imp', frames: [{ key: 'imp0' }, { key: 'imp1' }], frameRate: 8, repeat: -1 });
    anims.create({ key: 'flap', frames: [{ key: 'wing0' }, { key: 'wing1' }], frameRate: 14, repeat: -1 });
  }
}

export { RAINBOW };

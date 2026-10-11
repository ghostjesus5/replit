// Placeholder art, drawn in code so the greybox needs zero asset files.
// Every key here gets swapped for commissioned art later, same names, same sizes.

const RAINBOW = [0xff4d4d, 0xff9f2e, 0xffe14d, 0x5fd35f, 0x4da6ff, 0xa66bff];

function make(scene, key, w, h, draw) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function poly(g, pts) {
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

function drawHero(g, legs) {
  const legColor = 0xe07fb6;
  const hoof = 0x7a4a6a;
  const L = 26;
  const hips = [
    [84, 80], [92, 80], // front
    [36, 80], [44, 80], // back
  ];

  // far-side legs first (darker)
  [1, 3].forEach((i) => {
    const [hx, hy] = hips[i];
    const a = legs[i];
    g.lineStyle(7, 0xc76aa0);
    g.lineBetween(hx, hy, hx + Math.sin(a) * L, hy + Math.cos(a) * L);
    g.fillStyle(hoof);
    g.fillCircle(hx + Math.sin(a) * L, hy + Math.cos(a) * L, 4);
  });

  // tail
  RAINBOW.forEach((c, i) => {
    g.lineStyle(4, c);
    g.beginPath();
    g.moveTo(26, 58 + i * 2);
    g.lineTo(14, 62 + i * 4);
    g.lineTo(4, 74 + i * 5);
    g.strokePath();
  });

  // body
  g.fillStyle(0xe58bbd);
  g.fillEllipse(62, 72, 84, 40);
  g.fillStyle(0xf6b0d6);
  g.fillEllipse(62, 66, 76, 28);

  // neck + head
  g.fillStyle(0xf6b0d6);
  poly(g, [[84, 62], [98, 28], [114, 34], [102, 74]]);
  g.fillEllipse(110, 32, 30, 20);
  g.fillEllipse(121, 38, 16, 13);
  g.fillStyle(0x7a4a6a);
  g.fillCircle(125, 38, 1.8);
  // ear
  g.fillStyle(0xe58bbd);
  g.fillTriangle(101, 23, 105, 11, 109, 24);
  // horn
  g.fillStyle(0xffd447);
  g.fillTriangle(106, 23, 113, 21, 123, 1);
  g.lineStyle(1.5, 0xc99a1a);
  g.lineBetween(108, 18, 114, 17);
  g.lineBetween(111, 12, 116, 11);
  // eye
  g.fillStyle(0x2a1530);
  g.fillCircle(112, 29, 3);
  g.fillStyle(0xffffff);
  g.fillCircle(113, 28, 1);
  // mane
  RAINBOW.forEach((c, i) => {
    g.lineStyle(4, c);
    g.lineBetween(100 - i * 1.5, 22 + i * 6, 88 - i * 2, 34 + i * 7);
  });

  // near-side legs
  [0, 2].forEach((i) => {
    const [hx, hy] = hips[i];
    const a = legs[i];
    g.lineStyle(8, legColor);
    g.lineBetween(hx, hy, hx + Math.sin(a) * L, hy + Math.cos(a) * L);
    g.fillStyle(hoof);
    g.fillCircle(hx + Math.sin(a) * L, hy + Math.cos(a) * L, 4.5);
  });

  // rider: robe over the unicorn's back
  g.fillStyle(0xeadcb0);
  poly(g, [[44, 66], [76, 66], [72, 50], [48, 50]]);
  poly(g, [[56, 64], [62, 90], [71, 88], [70, 62]]);
  g.fillStyle(0xd9c890);
  g.fillEllipse(66, 90, 12, 6); // sandal-ish
  // torso
  g.fillStyle(0xf0e4bd);
  poly(g, [[48, 54], [72, 54], [67, 24], [52, 24]]);
  g.lineStyle(5, 0xb8323a);
  g.lineBetween(53, 26, 69, 52);
  // ammo belt across the chest
  g.lineStyle(3, 0xc99a1a);
  g.lineBetween(66, 25, 50, 50);
  // halo
  g.lineStyle(3, 0xffd447, 0.9);
  g.strokeEllipse(57, 4, 26, 7);
  // hair, face, beard
  g.fillStyle(0x5b3a1f);
  g.fillEllipse(55, 17, 20, 26);
  g.fillStyle(0xd9a77a);
  g.fillCircle(61, 14, 8);
  g.fillStyle(0x5b3a1f);
  g.fillEllipse(62, 22, 13, 11);
  g.fillStyle(0x2a1530);
  g.fillCircle(65, 12, 1.6);
  // arm reaching to the guns
  g.lineStyle(7, 0xf0e4bd);
  g.lineBetween(58, 30, 74, 42);
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
  [[10, 30], [40, 12], [24, 50], [52, 40], [6, 6], [34, 28]].forEach(([x, y]) => g.fillEllipse(x, y, 9, 5));
  g.fillStyle(0x8f6440);
  [[18, 40], [48, 56], [30, 16]].forEach(([x, y]) => g.fillCircle(x, y, 2));
}

function drawGround(g) {
  g.fillStyle(0x7a4f2e);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle(0x6a4226);
  [[10, 30], [40, 22], [24, 50], [52, 46], [6, 58], [34, 38]].forEach(([x, y]) => g.fillEllipse(x, y, 9, 5));
  g.fillStyle(0x8f6440);
  [[18, 40], [48, 56], [30, 26]].forEach(([x, y]) => g.fillCircle(x, y, 2));
  g.fillStyle(0x4aa63c);
  g.fillRect(0, 0, 64, 14);
  g.fillStyle(0x6ccf52);
  g.fillRect(0, 0, 64, 6);
  g.fillStyle(0x4aa63c);
  for (let x = 0; x < 64; x += 8) g.fillTriangle(x, 14, x + 8, 14, x + 4, 20);
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
  g.fillStyle(0xfff6d6, 0.35);
  g.fillRect(30, 60, 120, 240);
  g.fillEllipse(90, 66, 120, 110);
  g.fillStyle(0xffd447);
  g.fillRect(14, 70, 22, 230);
  g.fillRect(144, 70, 22, 230);
  g.lineStyle(20, 0xffd447);
  g.beginPath();
  g.arc(90, 80, 66, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xc99a1a);
  g.fillRect(8, 284, 34, 16);
  g.fillRect(138, 284, 34, 16);
  g.fillStyle(0xffd447);
  g.fillRect(84, 0, 12, 26);
  g.fillRect(76, 6, 28, 8);
}

function drawHalo(g) {
  g.lineStyle(5, 0xffd447);
  g.strokeEllipse(15, 15, 24, 24);
  g.lineStyle(2, 0xfff3b0);
  g.strokeEllipse(15, 15, 16, 16);
}

function drawBubble(g) {
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

function drawHills(g, w, h, color, amp, base, waves) {
  g.fillStyle(color);
  const bottom = h - 3;
  const pts = [[0, bottom]];
  for (let x = 0; x <= w; x += 8) {
    const y = base + Math.sin((x / w) * Math.PI * 2 * waves) * amp + Math.sin((x / w) * Math.PI * 2 * (waves + 1)) * amp * 0.4;
    pts.push([x, y]);
  }
  pts.push([w, bottom]);
  poly(g, pts);
}

function drawTrees(g) {
  const trees = [[70, 1], [250, 0.8], [400, 1.15]];
  trees.forEach(([x, s]) => {
    g.fillStyle(0x6b4a2b);
    g.fillRect(x - 7 * s, 260 - 120 * s, 14 * s, 120 * s - 4);
    g.fillStyle(0x3f8f45);
    g.fillCircle(x, 260 - 140 * s, 52 * s);
    g.fillCircle(x - 40 * s, 260 - 115 * s, 36 * s);
    g.fillCircle(x + 40 * s, 260 - 115 * s, 36 * s);
    g.fillStyle(0x55a85a);
    g.fillCircle(x - 12 * s, 260 - 158 * s, 26 * s);
    g.fillStyle(0xe8352f);
    [[-20, -130], [18, -150], [30, -112], [-36, -108], [4, -120]].forEach(([dx, dy]) => g.fillCircle(x + dx * s, 260 + dy * s, 5 * s));
  });
}

function drawClouds(g) {
  g.fillStyle(0xffffff, 0.9);
  [[80, 70, 1], [300, 40, 0.7], [440, 110, 0.9]].forEach(([x, y, s]) => {
    g.fillEllipse(x, y, 120 * s, 40 * s);
    g.fillEllipse(x - 30 * s, y + 6 * s, 70 * s, 30 * s);
    g.fillEllipse(x + 26 * s, y - 12 * s, 70 * s, 40 * s);
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
  grad.addColorStop(0, '#4f9fe8');
  grad.addColorStop(0.6, '#a9dcff');
  grad.addColorStop(1, '#ffe7b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  sky.refresh();

  const anims = scene.anims;
  if (!anims.exists('gallop')) {
    anims.create({ key: 'gallop', frames: [0, 1, 2, 3].map((i) => ({ key: `hero${i}` })), frameRate: 12, repeat: -1 });
    anims.create({ key: 'serpent', frames: [{ key: 'serpent0' }, { key: 'serpent1' }], frameRate: 5, repeat: -1 });
    anims.create({ key: 'imp', frames: [{ key: 'imp0' }, { key: 'imp1' }], frameRate: 8, repeat: -1 });
    anims.create({ key: 'flap', frames: [{ key: 'wing0' }, { key: 'wing1' }], frameRate: 14, repeat: -1 });
  }
}

export { RAINBOW };

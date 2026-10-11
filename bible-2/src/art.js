// Placeholder art for everything added after Eden 1-1: new enemies, projectiles,
// power-ups and bosses. Everything faces left, toward the hero.

import { make, poly, drawBubble } from './textures.js';

// ---------------------------------------------------------------- enemies

function frog(g, leap) {
  g.fillStyle(0x3f8a2a);
  if (leap) {
    g.fillTriangle(30, 26, 50, 40, 52, 30);
    g.fillTriangle(22, 28, 4, 38, 8, 30);
  } else {
    g.fillEllipse(40, 36, 20, 12);
    g.fillEllipse(12, 38, 14, 8);
  }
  g.fillStyle(0x5fae3a);
  g.fillEllipse(26, 28, 40, 26);
  g.fillStyle(0xd7e88a);
  g.fillEllipse(22, 34, 26, 12);
  g.fillStyle(0x5fae3a);
  g.fillCircle(14, 14, 8);
  g.fillCircle(30, 14, 8);
  g.fillStyle(0xffe14d);
  g.fillCircle(13, 13, 5);
  g.fillCircle(29, 13, 5);
  g.fillStyle(0x1b1430);
  g.fillRect(11, 11, 4, 5);
  g.fillRect(27, 11, 4, 5);
  g.lineStyle(2, 0x1b1430);
  g.lineBetween(6, 26, 18, 28);
}

function locust(g, up) {
  g.fillStyle(0xcfc7a0, 0.75);
  if (up) g.fillEllipse(22, 8, 26, 10);
  else g.fillEllipse(22, 20, 26, 8);
  g.fillStyle(0x8a7a24);
  g.fillEllipse(20, 16, 32, 11);
  g.fillStyle(0xb0a03a);
  g.fillEllipse(8, 14, 12, 10);
  g.fillStyle(0xd61f1f);
  g.fillCircle(6, 12, 2.5);
  g.lineStyle(2, 0x5a4e14);
  g.lineBetween(24, 20, 34, 28);
  g.lineBetween(30, 18, 36, 26);
  g.lineBetween(4, 10, 0, 2);
}

function wheel(g, x, y, r, spin) {
  g.lineStyle(5, 0x5a3a12);
  g.strokeCircle(x, y, r);
  g.lineStyle(3, 0x8a5a22);
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI) / 3;
    g.lineBetween(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.fillStyle(0xffd447);
  g.fillCircle(x, y, 4);
}

function horse(g, x, y, s, color, mane, stride) {
  g.fillStyle(color);
  g.fillEllipse(x, y, 54 * s, 24 * s);
  poly(g, [[x - 20 * s, y - 6 * s], [x - 34 * s, y - 30 * s], [x - 26 * s, y - 34 * s], [x - 12 * s, y - 10 * s]]);
  g.fillEllipse(x - 36 * s, y - 30 * s, 22 * s, 12 * s);
  g.fillStyle(mane);
  poly(g, [[x - 24 * s, y - 34 * s], [x - 10 * s, y - 14 * s], [x - 16 * s, y - 10 * s], [x - 30 * s, y - 32 * s]]);
  g.fillStyle(0xff3b30);
  g.fillCircle(x - 40 * s, y - 32 * s, 2 * s);
  g.lineStyle(5 * s, color);
  const legs = [[-16, stride], [-8, -stride], [14, -stride], [22, stride]];
  legs.forEach(([dx, a]) => g.lineBetween(x + dx * s, y + 8 * s, x + dx * s + Math.sin(a) * 20 * s, y + 30 * s));
  g.lineStyle(4 * s, mane);
  g.lineBetween(x + 26 * s, y - 4 * s, x + 40 * s, y + 10 * s);
}

function chariot(g, f) {
  horse(g, 34, 46, 0.9, 0x2a1d1a, 0xff7a2a, f ? 0.5 : -0.5);
  g.fillStyle(0xd9a330);
  poly(g, [[60, 30], [112, 22], [116, 64], [62, 64]]);
  g.fillStyle(0xffd447);
  g.fillRect(62, 30, 52, 6);
  g.fillStyle(0x9c6b1a);
  [[70, 44], [86, 44], [102, 44]].forEach(([x, y]) => g.fillCircle(x, y, 4));
  g.lineStyle(3, 0x5a3a12);
  g.lineBetween(44, 42, 64, 48);
  wheel(g, 92, 68, 18, f ? 0.4 : 0);
  // spiked hub
  g.fillStyle(0xc0c0c8);
  g.fillTriangle(110, 64, 110, 72, 120, 68);
  // fire trail
  g.fillStyle(0xff7a2a, 0.8);
  g.fillTriangle(110, 80, 120, 70, 120, 86);
}

function fish(g, open) {
  g.fillStyle(0x2f7fd0);
  g.fillTriangle(44, 20, 58, 6, 58, 34);
  g.fillStyle(0x4da6ff);
  g.fillEllipse(26, 20, 44, 26);
  g.fillStyle(0xbfe3ff);
  g.fillEllipse(26, 26, 34, 10);
  g.fillStyle(0x2f7fd0);
  g.fillTriangle(22, 8, 34, 0, 34, 10);
  g.fillStyle(0xffe14d);
  g.fillCircle(12, 15, 4);
  g.fillStyle(0x1b1430);
  g.fillCircle(11, 15, 2);
  g.fillStyle(0x1b1430);
  if (open) g.fillTriangle(2, 20, 14, 24, 2, 30);
  g.fillStyle(0xffffff);
  g.fillTriangle(4, 20, 7, 20, 5, 25);
  g.fillTriangle(9, 21, 12, 21, 10, 26);
}

function crab(g, f) {
  g.lineStyle(3, 0xa83a1f);
  for (let i = 0; i < 3; i++) {
    const dx = 18 + i * 10;
    const a = (i + f) % 2 ? 6 : -4;
    g.lineBetween(dx, 34, dx - 8 + a, 46);
    g.lineBetween(dx + 8, 34, dx + 16 + a, 46);
  }
  g.fillStyle(0xe2552f);
  g.fillEllipse(34, 30, 48, 26);
  g.fillStyle(0xf28a5f);
  g.fillEllipse(34, 24, 38, 10);
  // claws
  g.fillStyle(0xe2552f);
  g.fillCircle(8, f ? 10 : 14, 9);
  g.fillCircle(60, f ? 14 : 10, 9);
  g.fillStyle(0xa83a1f);
  g.fillTriangle(2, f ? 4 : 8, 10, f ? 10 : 14, 0, f ? 12 : 16);
  g.lineStyle(3, 0xe2552f);
  g.lineBetween(14, 24, 10, 16);
  g.lineBetween(54, 24, 58, 16);
  // eyes on stalks
  g.lineStyle(2, 0xa83a1f);
  g.lineBetween(28, 18, 26, 8);
  g.lineBetween(38, 18, 40, 8);
  g.fillStyle(0x1b1430);
  g.fillCircle(26, 8, 3);
  g.fillCircle(40, 8, 3);
}

function golem(g, f) {
  const c = 0x9c7b5a;
  const d = 0x6f5438;
  g.fillStyle(d);
  g.fillRect(f ? 22 : 30, 84, 18, 34);
  g.fillRect(f ? 58 : 50, 84, 18, 34);
  g.fillStyle(c);
  g.fillRect(14, 24, 70, 64);
  g.fillStyle(d);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 9 : 0;
    for (let x = 14 + off; x < 84; x += 18) g.fillRect(x, 24 + row * 16, 2, 16);
    g.fillRect(14, 24 + row * 16, 70, 2);
  }
  g.fillStyle(c);
  g.fillRect(26, 0, 44, 28);
  g.fillStyle(0xff7a2a);
  g.fillRect(32, 10, 10, 6);
  g.fillRect(52, 10, 10, 6);
  // arms
  g.fillStyle(d);
  g.fillRect(0, f ? 34 : 40, 16, 44);
  g.fillRect(82, f ? 40 : 34, 14, 40);
}

function gargoyle(g, up) {
  g.fillStyle(0x5d5f6a);
  if (up) {
    g.fillTriangle(24, 28, 0, 0, 14, 34);
    g.fillTriangle(40, 28, 64, 0, 50, 34);
  } else {
    g.fillTriangle(24, 30, 0, 50, 16, 26);
    g.fillTriangle(40, 30, 64, 50, 48, 26);
  }
  g.fillStyle(0x7d7f8a);
  g.fillEllipse(32, 34, 30, 32);
  g.fillCircle(30, 18, 12);
  g.fillStyle(0x5d5f6a);
  g.fillTriangle(20, 12, 18, 0, 26, 8);
  g.fillTriangle(38, 10, 42, 0, 36, 4);
  g.fillStyle(0x7cf3ff);
  g.fillCircle(25, 17, 3);
  g.fillCircle(34, 17, 3);
  g.fillStyle(0x2a2a30);
  g.fillEllipse(28, 26, 12, 5);
  g.fillStyle(0x5d5f6a);
  g.fillRect(24, 48, 6, 10);
  g.fillRect(34, 48, 6, 10);
}

function demon(g, up) {
  g.fillStyle(0x5a0e0a);
  if (up) {
    g.fillTriangle(26, 26, 2, 0, 12, 34);
    g.fillTriangle(38, 26, 62, 0, 52, 34);
  } else {
    g.fillTriangle(26, 28, 0, 50, 14, 24);
    g.fillTriangle(38, 28, 64, 50, 50, 24);
  }
  g.fillStyle(0xb3261e);
  g.fillEllipse(32, 34, 26, 30);
  g.fillCircle(30, 18, 12);
  g.fillStyle(0x1a0608);
  g.fillTriangle(20, 14, 12, 0, 24, 8);
  g.fillTriangle(40, 14, 48, 0, 36, 8);
  g.fillStyle(0xffe14d);
  g.fillTriangle(22, 16, 30, 18, 22, 20);
  g.fillTriangle(32, 18, 40, 16, 40, 20);
  g.lineStyle(3, 0x5a0e0a);
  g.lineBetween(36, 46, 50, 56);
  g.fillStyle(0x5a0e0a);
  g.fillTriangle(48, 52, 58, 52, 54, 60);
}

// ---------------------------------------------------------------- projectiles + fx

const shots = {
  hail(g) {
    g.fillStyle(0xdff4ff);
    poly(g, [[11, 0], [20, 6], [22, 16], [12, 22], [2, 16], [0, 6]]);
    g.fillStyle(0xffffff);
    g.fillTriangle(6, 6, 12, 3, 9, 10);
  },
  venom(g) {
    g.fillStyle(0x5fd35f);
    g.fillCircle(11, 11, 10);
    g.fillStyle(0xc6ff8a);
    g.fillCircle(8, 8, 4);
  },
  apple(g) {
    g.fillStyle(0xd61f1f);
    g.fillCircle(9, 14, 8);
    g.fillCircle(17, 14, 8);
    g.fillStyle(0xff6b6b);
    g.fillCircle(8, 11, 3);
    g.lineStyle(2, 0x5a3a12);
    g.lineBetween(13, 7, 15, 1);
    g.fillStyle(0x4aa63c);
    g.fillEllipse(19, 4, 8, 4);
  },
  spear(g) {
    g.lineStyle(4, 0x7a5a32);
    g.lineBetween(10, 4, 64, 4);
    g.fillStyle(0xc0c0c8);
    g.fillTriangle(0, 4, 14, 0, 14, 8);
  },
  boulder(g) {
    g.fillStyle(0x7a6a58);
    g.fillCircle(20, 20, 19);
    g.fillStyle(0x9a8a76);
    g.fillCircle(14, 14, 8);
    g.fillStyle(0x5a4c3e);
    g.fillCircle(26, 26, 5);
  },
  wave(g) {
    g.fillStyle(0xffe14d, 0.5);
    g.fillEllipse(36, 30, 72, 30);
    g.fillStyle(0xfff3b0);
    poly(g, [[0, 40], [20, 10], [30, 22], [44, 4], [56, 24], [72, 40]]);
  },
  arrow(g) {
    g.lineStyle(3, 0xe8e0d0);
    g.lineBetween(8, 4, 48, 4);
    g.fillStyle(0xc0c0c8);
    g.fillTriangle(0, 4, 10, 0, 10, 8);
    g.fillStyle(0xffffff);
    g.fillTriangle(42, 4, 50, 0, 50, 8);
  },
  scythe(g) {
    g.lineStyle(5, 0x5a4a3a);
    g.lineBetween(10, 44, 40, 14);
    g.fillStyle(0xd8e0e8);
    poly(g, [[34, 8], [50, 6], [48, 26], [40, 18], [30, 14]]);
  },
  coin(g) {
    g.fillStyle(0xffd447);
    g.fillCircle(10, 10, 9);
    g.fillStyle(0xc99a1a);
    g.fillCircle(10, 10, 5);
  },
  brick(g) {
    g.fillStyle(0xb05d36);
    g.fillRect(0, 0, 32, 18);
    g.fillStyle(0xd99067);
    g.fillRect(2, 2, 28, 4);
  },
  ember(g) {
    g.fillStyle(0xff5a1f);
    g.fillEllipse(9, 16, 16, 20);
    g.fillTriangle(1, 14, 9, 0, 17, 14);
    g.fillStyle(0xffe14d);
    g.fillEllipse(9, 18, 8, 10);
  },
  warn(g) {
    g.fillStyle(0xff3b30, 0.75);
    g.fillRect(0, 0, 64, 10);
    g.fillStyle(0xffe14d);
    for (let x = 0; x < 64; x += 16) g.fillTriangle(x, 10, x + 8, 0, x + 16, 10);
  },
  tentacle(g) {
    g.fillStyle(0x2a6a6a);
    poly(g, [[10, 400], [6, 200], [16, 60], [36, 0], [54, 60], [64, 200], [60, 400]]);
    g.fillStyle(0x8fd0c0);
    for (let y = 70; y < 400; y += 36) {
      g.fillCircle(14, y, 6);
      g.fillCircle(14, y + 16, 4);
    }
  },
  geyser(g) {
    g.fillStyle(0x6fc3f0, 0.85);
    poly(g, [[8, 400], [14, 40], [36, 0], [58, 40], [64, 400]]);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(24, 40, 6, 360);
  },
  beam(g) {
    g.fillStyle(0x9b5cff, 0.35);
    g.fillRect(0, 0, 64, 48);
    g.fillStyle(0xd6b8ff);
    g.fillRect(0, 14, 64, 20);
    g.fillStyle(0xffffff);
    g.fillRect(0, 20, 64, 8);
  },
};

// ---------------------------------------------------------------- pickups

function ghostIcon(g) {
  drawBubble(g);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(26, 22, 11);
  g.fillRect(15, 22, 22, 12);
  g.fillTriangle(15, 34, 21, 34, 18, 40);
  g.fillTriangle(21, 34, 29, 34, 25, 40);
  g.fillTriangle(29, 34, 37, 34, 33, 40);
  g.fillStyle(0x1b1430);
  g.fillCircle(22, 21, 2);
  g.fillCircle(30, 21, 2);
  g.lineStyle(2, 0xffd447);
  g.strokeEllipse(26, 9, 16, 5);
}

function walkIcon(g) {
  drawBubble(g);
  g.fillStyle(0x2f7fd0);
  g.fillEllipse(26, 36, 34, 10);
  g.fillStyle(0x8a5a2b);
  g.fillEllipse(22, 26, 12, 20);
  g.fillEllipse(32, 24, 10, 18);
  g.lineStyle(2, 0x5a3a12);
  g.lineBetween(18, 22, 26, 28);
  g.lineBetween(28, 20, 36, 26);
}

function staffIcon(g) {
  drawBubble(g);
  g.lineStyle(4, 0x8a5a2b);
  g.lineBetween(34, 44, 22, 12);
  g.lineStyle(4, 0x8a5a2b);
  g.beginPath();
  g.arc(18, 14, 6, 0, Math.PI * 1.2, true);
  g.strokePath();
  g.fillStyle(0x6fc3f0);
  g.fillTriangle(6, 44, 14, 30, 18, 44);
  g.fillTriangle(34, 44, 40, 30, 46, 44);
}

function trumpetIcon(g) {
  drawBubble(g);
  g.fillStyle(0xffd447);
  g.fillRect(10, 24, 24, 5);
  g.fillTriangle(32, 26, 44, 14, 44, 38);
  g.fillStyle(0xc99a1a);
  g.fillCircle(14, 26, 4);
  g.fillRect(18, 20, 3, 6);
  g.fillRect(24, 20, 3, 6);
}

// ---------------------------------------------------------------- bosses

function bossSerpent(g, open) {
  // coils
  [[200, 220, 140, 50], [180, 190, 120, 44], [210, 160, 100, 40]].forEach(([x, y, w, h], i) => {
    g.fillStyle(i % 2 ? 0x2f8a3d : 0x3fa34d);
    g.fillEllipse(x, y, w, h);
    g.fillStyle(0xb7e07a);
    g.fillEllipse(x, y + h * 0.25, w * 0.8, h * 0.3);
  });
  // neck
  g.fillStyle(0x3fa34d);
  poly(g, [[200, 150], [150, 60], [118, 70], [168, 160]]);
  g.fillStyle(0xb7e07a);
  poly(g, [[178, 150], [134, 72], [124, 78], [166, 156]]);
  // head
  g.fillStyle(0x2f8a3d);
  g.fillEllipse(110, 62, 110, open ? 70 : 56);
  g.fillStyle(0x3fa34d);
  g.fillEllipse(112, 54, 100, 40);
  // hood
  g.fillStyle(0x2f8a3d);
  poly(g, [[150, 30], [190, 20], [176, 80], [150, 90]]);
  // eye
  g.fillStyle(0xffe14d);
  g.fillEllipse(96, 46, 22, 14);
  g.fillStyle(0xd61f1f);
  g.fillEllipse(96, 46, 5, 13);
  if (open) {
    g.fillStyle(0x5a0e0a);
    poly(g, [[56, 66], [130, 74], [70, 96]]);
    g.fillStyle(0xffffff);
    g.fillTriangle(70, 70, 78, 70, 74, 88);
    g.fillTriangle(98, 72, 106, 72, 102, 86);
    g.lineStyle(4, 0xd61f1f);
    g.lineBetween(60, 80, 30, 84);
    g.lineBetween(30, 84, 22, 76);
    g.lineBetween(30, 84, 22, 92);
  }
}

function bossChariot(g, f) {
  horse(g, 60, 150, 1.6, 0x1e1412, 0xff7a2a, f ? 0.6 : -0.6);
  horse(g, 96, 160, 1.6, 0x2a1d1a, 0xffd447, f ? -0.6 : 0.6);
  g.fillStyle(0xd9a330);
  poly(g, [[150, 80], [280, 60], [290, 180], [150, 180]]);
  g.fillStyle(0xffd447);
  g.fillRect(152, 84, 136, 12);
  g.fillStyle(0x2f7fd0);
  [[180, 130], [220, 130], [260, 130]].forEach(([x, y]) => g.fillCircle(x, y, 9));
  // the empty golden mask riding it
  g.fillStyle(0xffd447);
  poly(g, [[200, 70], [216, 6], [250, 6], [266, 70], [233, 84]]);
  g.fillStyle(0x2f7fd0);
  for (let y = 12; y < 70; y += 10) g.fillRect(204 + (y - 12) * 0.2, y, 58 - (y - 12) * 0.4, 4);
  g.fillStyle(0xffd447);
  g.fillEllipse(233, 44, 36, 40);
  g.fillStyle(0x1b1430);
  g.fillEllipse(224, 40, 8, 4);
  g.fillEllipse(242, 40, 8, 4);
  wheel(g, 230, 176, 30, f ? 0.5 : 0);
  g.fillStyle(0xff7a2a, 0.8);
  g.fillTriangle(262, 190, 290, 160, 296, 200);
}

function bossLeviathan(g, open) {
  g.fillStyle(0x1f5f6a);
  poly(g, [[170, 280], [190, 120], [150, 60], [110, 70], [150, 140], [130, 280]]);
  g.fillStyle(0x3a8a8a);
  poly(g, [[176, 270], [186, 130], [170, 110], [160, 270]]);
  // fins
  g.fillStyle(0x8fd0c0);
  [[190, 140], [196, 180], [194, 220]].forEach(([x, y]) => g.fillTriangle(x, y, x + 30, y - 20, x + 6, y + 20));
  // head
  g.fillStyle(0x1f5f6a);
  g.fillEllipse(110, 62, 130, open ? 80 : 64);
  g.fillStyle(0x3a8a8a);
  g.fillEllipse(116, 52, 110, 36);
  g.fillStyle(0xffe14d);
  g.fillCircle(96, 44, 9);
  g.fillStyle(0x1b1430);
  g.fillCircle(94, 44, 4);
  g.fillStyle(0x8fd0c0);
  g.fillTriangle(130, 30, 170, 0, 160, 40);
  g.fillTriangle(110, 26, 136, 2, 132, 32);
  if (open) {
    g.fillStyle(0x0f2c3a);
    poly(g, [[46, 66], [140, 76], [60, 100]]);
    g.fillStyle(0xffffff);
    for (let x = 60; x < 130; x += 14) g.fillTriangle(x, 72, x + 6, 72, x + 3, 84);
  }
}

function bossGoliath(g, f) {
  const bronze = 0xb07a2a;
  const dark = 0x6f4a18;
  // legs
  g.fillStyle(0x7a5236);
  g.fillRect(f ? 70 : 80, 220, 34, 100);
  g.fillRect(f ? 130 : 120, 220, 34, 100);
  g.fillStyle(bronze);
  g.fillRect(f ? 68 : 78, 260, 38, 30);
  g.fillRect(f ? 128 : 118, 260, 38, 30);
  // body armor
  g.fillStyle(bronze);
  g.fillRoundedRect(60, 100, 120, 130, 18);
  g.fillStyle(dark);
  for (let y = 120; y < 220; y += 22) g.fillRect(64, y, 112, 4);
  // head
  g.fillStyle(0xc98a5a);
  g.fillEllipse(118, 70, 60, 64);
  g.fillStyle(0x3a2412);
  g.fillEllipse(110, 92, 50, 36);
  g.fillStyle(bronze);
  poly(g, [[86, 64], [96, 26], [140, 24], [150, 64]]);
  g.fillStyle(0xd61f1f);
  poly(g, [[110, 26], [130, 0], [150, 20], [134, 30]]);
  g.fillStyle(0x1b1430);
  g.fillRect(96, 64, 14, 6);
  // shield arm (front)
  g.fillStyle(bronze);
  g.fillEllipse(54, 170, 70, 130);
  g.fillStyle(0xffd447);
  g.fillCircle(54, 170, 12);
  g.lineStyle(4, dark);
  g.strokeEllipse(54, 170, 60, 118);
  // spear arm (back)
  g.lineStyle(8, 0x6b4a2b);
  g.lineBetween(196, 30, 186, 250);
  g.fillStyle(0xc0c0c8);
  g.fillTriangle(188, 0, 204, 0, 196, 36);
}

function bossBabbler(g, open) {
  // tower top
  for (let i = 0; i < 4; i++) {
    const w = 260 - i * 30;
    const y = 300 - (i + 1) * 64;
    g.fillStyle(i % 2 ? 0xb86a42 : 0xa35a35);
    g.fillRect(140 - w / 2, y, w, 64);
    g.fillStyle(0x7a3c20);
    for (let x = 140 - w / 2 + 6; x < 140 + w / 2; x += 26) g.fillRect(x, y + 4, 2, 56);
  }
  // carved face
  g.fillStyle(0xd99067);
  g.fillRoundedRect(50, 60, 180, 150, 30);
  g.fillStyle(0x1b1430);
  g.fillEllipse(96, 110, 34, 22);
  g.fillEllipse(176, 110, 34, 22);
  g.fillStyle(0x7cf3ff);
  g.fillCircle(96, 110, 7);
  g.fillCircle(176, 110, 7);
  g.fillStyle(0x7a3c20);
  g.fillRect(70, 86, 50, 8);
  g.fillRect(152, 86, 50, 8);
  g.fillStyle(0x1b1430);
  if (open) g.fillEllipse(136, 170, 90, 50);
  else g.fillRect(92, 166, 90, 10);
  g.fillStyle(0xffd447);
  g.fillTriangle(110, 0, 170, 0, 140, 50);
}

function horseman(g, f, { horseColor, mane, robe, item }) {
  horse(g, 100, 130, 2.2, horseColor, mane, f ? 0.5 : -0.5);
  // rider: hooded, no face, purely mythic
  g.fillStyle(robe);
  poly(g, [[100, 112], [130, 108], [128, 40], [104, 40]]);
  g.fillEllipse(116, 34, 36, 40);
  g.fillStyle(0x0a0204);
  g.fillEllipse(110, 36, 18, 22);
  g.fillStyle(0xff3b30);
  g.fillCircle(106, 34, 2.5);
  g.fillCircle(114, 34, 2.5);
  if (item === 'bow') {
    g.lineStyle(5, 0xe8e0d0);
    g.beginPath();
    g.arc(84, 70, 40, Math.PI * 0.6, Math.PI * 1.4, false);
    g.strokePath();
    g.lineStyle(1.5, 0xffffff);
    g.lineBetween(70, 32, 70, 108);
    g.fillStyle(0xffd447);
    g.fillTriangle(102, 14, 108, 2, 114, 14);
    g.fillTriangle(114, 14, 120, 0, 126, 14);
    g.fillTriangle(126, 14, 132, 2, 138, 14);
  } else if (item === 'sword') {
    g.lineStyle(8, 0xd8e0e8);
    g.lineBetween(96, 70, 40, 10);
    g.lineStyle(8, 0xffd447);
    g.lineBetween(98, 62, 104, 80);
  } else if (item === 'scales') {
    g.lineStyle(3, 0xffd447);
    g.lineBetween(70, 30, 70, 70);
    g.lineBetween(50, 40, 90, 40);
    g.fillStyle(0xffd447);
    g.fillEllipse(50, 56, 22, 8);
    g.fillEllipse(90, 56, 22, 8);
    g.lineStyle(1.5, 0xffd447);
    g.lineBetween(50, 40, 44, 54);
    g.lineBetween(50, 40, 56, 54);
    g.lineBetween(90, 40, 84, 54);
    g.lineBetween(90, 40, 96, 54);
  } else if (item === 'scythe') {
    g.lineStyle(6, 0x5a4a3a);
    g.lineBetween(90, 120, 70, 0);
    g.fillStyle(0xd8e0e8);
    poly(g, [[70, 0], [20, 8], [0, 34], [30, 18], [72, 12]]);
  }
}

function beastBody(g) {
  g.fillStyle(0x6a1410);
  g.fillEllipse(200, 200, 300, 140);
  g.fillStyle(0x8a1c16);
  g.fillEllipse(200, 180, 260, 90);
  g.fillStyle(0x3a0806);
  [[100, 250], [160, 260], [240, 260], [300, 250]].forEach(([x, y]) => g.fillRect(x - 14, y - 20, 28, 40));
  g.fillStyle(0xffd447);
  for (let x = 110; x < 300; x += 30) g.fillTriangle(x, 140, x + 12, 110, x + 24, 140);
}

function beastHead(g, open) {
  g.fillStyle(0x8a1c16);
  g.fillEllipse(40, 34, 66, open ? 46 : 38);
  g.fillStyle(0xb3261e);
  g.fillEllipse(44, 28, 56, 22);
  g.fillStyle(0x1a0608);
  g.fillTriangle(52, 16, 70, 0, 62, 20);
  g.fillTriangle(40, 14, 50, 0, 50, 18);
  g.fillStyle(0xffd447);
  g.fillTriangle(56, 8, 64, 0, 66, 10);
  g.fillStyle(0xffe14d);
  g.fillCircle(30, 26, 5);
  g.fillStyle(0x1a0608);
  g.fillCircle(29, 26, 2);
  if (open) {
    g.fillStyle(0x1a0608);
    poly(g, [[6, 36], [50, 40], [12, 52]]);
    g.fillStyle(0xff7a2a);
    g.fillCircle(10, 44, 4);
  }
}

// wispy tail that replaces the legs while the Holy Ghost is active
function ghostTail(g, f) {
  const wave = f ? 6 : -6;
  g.fillStyle(0xe6f3ff, 0.55);
  poly(g, [[110, 4], [118, 30], [96, 52], [70, 50 + wave], [44, 60], [20, 52 - wave], [0, 64], [24, 34], [60, 20], [90, 6]]);
  g.fillStyle(0xffffff, 0.75);
  poly(g, [[108, 8], [112, 28], [92, 40], [66, 38 + wave / 2], [40, 44], [56, 26], [86, 12]]);
  g.lineStyle(2, 0x7fb8ff, 0.8);
  g.strokePoints([[110, 4], [118, 30], [96, 52], [70, 50 + wave], [44, 60], [20, 52 - wave], [0, 64]].map(([x, y]) => ({ x, y })), false);
}

function radial(scene, key, size, inner, outer) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  inner.forEach(([stop, color]) => grad.addColorStop(stop, color));
  outer.forEach(([stop, color]) => grad.addColorStop(stop, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  if (scene.sys.game.renderer) tex.refresh();
}

export function createArt(scene) {
  make(scene, 'frog0', 56, 46, (g) => frog(g, false));
  make(scene, 'frog1', 56, 46, (g) => frog(g, true));
  make(scene, 'locust0', 40, 32, (g) => locust(g, true));
  make(scene, 'locust1', 40, 32, (g) => locust(g, false));
  make(scene, 'chariot0', 124, 92, (g) => chariot(g, 0));
  make(scene, 'chariot1', 124, 92, (g) => chariot(g, 1));
  make(scene, 'fish0', 60, 42, (g) => fish(g, false));
  make(scene, 'fish1', 60, 42, (g) => fish(g, true));
  make(scene, 'crab0', 70, 50, (g) => crab(g, 0));
  make(scene, 'crab1', 70, 50, (g) => crab(g, 1));
  make(scene, 'golem0', 98, 120, (g) => golem(g, 0));
  make(scene, 'golem1', 98, 120, (g) => golem(g, 1));
  make(scene, 'gargoyle0', 64, 60, (g) => gargoyle(g, true));
  make(scene, 'gargoyle1', 64, 60, (g) => gargoyle(g, false));
  make(scene, 'demon0', 64, 62, (g) => demon(g, true));
  make(scene, 'demon1', 64, 62, (g) => demon(g, false));

  const sizes = {
    hail: [22, 22], venom: [22, 22], apple: [26, 24], spear: [66, 8], boulder: [40, 40], wave: [72, 42],
    arrow: [50, 8], scythe: [52, 48], coin: [20, 20], brick: [32, 18], ember: [18, 28], warn: [64, 10],
    tentacle: [70, 400], geyser: [72, 400], beam: [64, 48],
  };
  for (const [key, [w, h]] of Object.entries(sizes)) make(scene, key, w, h, shots[key]);

  make(scene, 'ghost', 52, 52, ghostIcon);
  make(scene, 'ghostTail0', 124, 70, (g) => ghostTail(g, 0));
  make(scene, 'ghostTail1', 124, 70, (g) => ghostTail(g, 1));
  make(scene, 'walk', 52, 52, walkIcon);
  make(scene, 'staff', 52, 52, staffIcon);
  make(scene, 'trumpet', 52, 52, trumpetIcon);

  make(scene, 'bossSerpent0', 280, 250, (g) => bossSerpent(g, false));
  make(scene, 'bossSerpent1', 280, 250, (g) => bossSerpent(g, true));
  make(scene, 'bossChariot0', 300, 230, (g) => bossChariot(g, 0));
  make(scene, 'bossChariot1', 300, 230, (g) => bossChariot(g, 1));
  make(scene, 'bossLeviathan0', 240, 290, (g) => bossLeviathan(g, false));
  make(scene, 'bossLeviathan1', 240, 290, (g) => bossLeviathan(g, true));
  make(scene, 'bossGoliath0', 220, 320, (g) => bossGoliath(g, 0));
  make(scene, 'bossGoliath1', 220, 320, (g) => bossGoliath(g, 1));
  make(scene, 'bossBabbler0', 280, 300, (g) => bossBabbler(g, false));
  make(scene, 'bossBabbler1', 280, 300, (g) => bossBabbler(g, true));
  const riders = {
    White: { horseColor: 0xf2efe6, mane: 0xffd447, robe: 0xe8e0d0, item: 'bow' },
    Red: { horseColor: 0xb3261e, mane: 0x1a0608, robe: 0x7a1410, item: 'sword' },
    Black: { horseColor: 0x1a1416, mane: 0x6a5a5a, robe: 0x2a2224, item: 'scales' },
    Pale: { horseColor: 0xa9c4a0, mane: 0x5d6a5a, robe: 0x3a4a3a, item: 'scythe' },
  };
  for (const [name, opts] of Object.entries(riders)) {
    make(scene, `horseman${name}0`, 220, 210, (g) => horseman(g, 0, opts));
    make(scene, `horseman${name}1`, 220, 210, (g) => horseman(g, 1, opts));
  }
  make(scene, 'beastBody', 400, 280, beastBody);
  make(scene, 'beastHead0', 76, 60, (g) => beastHead(g, false));
  make(scene, 'beastHead1', 76, 60, (g) => beastHead(g, true));

  radial(scene, 'ghostGlow', 256, [[0, 'rgba(220,240,255,0.85)'], [0.4, 'rgba(160,210,255,0.35)']], [[1, 'rgba(160,210,255,0)']]);
  // drawn at 6x scale around the hero: clear for ~90px, fully dark past ~260px
  radial(scene, 'darkness', 512, [[0, 'rgba(5,2,10,0)'], [0.07, 'rgba(5,2,10,0)']], [[0.17, 'rgba(5,2,10,0.985)'], [1, 'rgba(5,2,10,0.985)']]);

  const anims = scene.anims;
  const two = (key, rate) => {
    if (!anims.exists(key)) anims.create({ key, frames: [{ key: `${key}0` }, { key: `${key}1` }], frameRate: rate, repeat: -1 });
  };
  two('frog', 2);
  two('locust', 14);
  two('chariot', 10);
  two('fish', 4);
  two('crab', 6);
  two('golem', 3);
  two('gargoyle', 6);
  two('demon', 9);
  two('bossSerpent', 2);
  two('bossChariot', 8);
  two('bossLeviathan', 2);
  two('bossGoliath', 2);
  two('bossBabbler', 3);
  ['White', 'Red', 'Black', 'Pale'].forEach((n) => two(`horseman${n}`, 8));
  two('beastHead', 3);
  two('ghostTail', 6);
}

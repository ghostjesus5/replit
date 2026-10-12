// One look per world. Each theme draws its own terrain and backdrop under
// keys like `ground_egypt`, so the game scene just asks for `${part}_${theme}`.

import { make, poly, drawHills, shade, glow, paintClouds } from './textures.js';
import { MORMON_THEMES } from './themes-mormon.js';

export const THEMES = {
  eden: {
    sky: ['#4f9fe8', '#a9dcff', '#ffe7b8'],
    clouds: [0xffffff, 0.9],
    far: 0xa9dba1,
    near: 0x7cc46b,
    abyss: 0x2a1a2e,
    top: [0x4aa63c, 0x6ccf52],
    dirt: [0x7a4f2e, 0x6a4226, 0x8f6440],
    topStyle: 'grass',
    stone: [0xb9b2a2, 0xd8d2c4, 0x8d8676],
    hazard: 'thorns',
    prop: 'trees',
    water: [0x2f7fd0, 0x7cc7ff],
  },
  egypt: {
    sky: ['#c8642a', '#e98b3a', '#f8c477', '#ffe2a8', '#fff3d6'],
    clouds: [0xfff1d6, 0.6],
    far: 0xe8c17a,
    near: 0xd9a75a,
    abyss: 0x3a2412,
    top: [0xe0b062, 0xf3d08b],
    dirt: [0xc28a45, 0xa87334, 0xd9a35f],
    topStyle: 'sand',
    stone: [0xc9a46a, 0xe6c88f, 0x8f6c3a],
    hazard: [0x8a6a2a, 0xd9b44a], // bronze caltrops
    prop: 'pyramids',
    water: [0x3f8fb0, 0x8fd0e0],
  },
  redsea: {
    sky: ['#1d5596', '#2c6fb5', '#79b8e6', '#cfe6f2', '#f6dcb0'],
    clouds: [0xffffff, 0.75],
    far: 0x2f78b8,
    near: 0x3c8fcf,
    abyss: 0x0f2c4a,
    top: [0xcdb487, 0xe4d2a8],
    dirt: [0x8a7454, 0x6f5c40, 0xa58e69],
    topStyle: 'sand',
    stone: [0x8aa0a8, 0xb4c6cc, 0x5d7078],
    hazard: [0xd84f6a, 0xffb3c0], // coral
    prop: 'rocks',
    water: [0x1f5fa8, 0x6fc3f0],
  },
  jericho: {
    sky: ['#4a7cb8', '#5e8fc7', '#b9d3e8', '#e8e2d2', '#f1d6a8'],
    clouds: [0xffffff, 0.8],
    far: 0xcbb38a,
    near: 0xb2956a,
    abyss: 0x2d2216,
    top: [0x9b8a72, 0xbcad94],
    dirt: [0x8a6b4a, 0x725638, 0xa1805c],
    topStyle: 'stone',
    stone: [0xa69780, 0xcabba2, 0x6f6352],
    hazard: [0x6f6352, 0xcabba2], // broken spears in rubble
    prop: 'citywalls',
    water: [0x3f8fb0, 0x8fd0e0],
  },
  babel: {
    sky: ['#25234f', '#3d3b7a', '#a77fb8', '#e8a6a0', '#f4c49a'],
    clouds: [0xf6dcef, 0.6],
    far: 0x9b7aa8,
    near: 0x7a5f86,
    abyss: 0x1c1430,
    top: [0xa8552f, 0xc97a4b],
    dirt: [0x8c4426, 0x6d321b, 0xb05d36],
    topStyle: 'brick',
    stone: [0xb86a42, 0xd99067, 0x7a3c20],
    hazard: [0x5a2a16, 0xe0a070],
    prop: 'ziggurats',
    water: [0x3f5fb0, 0x8fa0e0],
  },
  revelation: {
    sky: ['#0a0204', '#1a0608', '#6a1410', '#c43a14', '#ff8a2a'],
    clouds: [0x3a1a1a, 0.85],
    far: 0x3a1210,
    near: 0x24090a,
    abyss: 0x0a0204,
    top: [0x2a2224, 0x4a3a3a],
    dirt: [0x1e1618, 0x120c0e, 0xff5a1f],
    topStyle: 'rock',
    stone: [0x3a3234, 0x5a4e50, 0xff6a2a],
    hazard: [0x2a1a1a, 0xff7a2a], // brimstone
    prop: 'spires',
    water: [0xb3261e, 0xff8a3a], // a lake of fire, for the record
  },
};

Object.assign(THEMES, MORMON_THEMES);

function drawTop(g, t) {
  const [dirt, dirtDark, speck] = t.dirt;
  const [top, topLight] = t.top;
  g.fillStyle(dirt);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle(dirtDark);
  [[10, 30], [40, 22], [24, 50], [52, 46], [6, 58], [34, 38]].forEach(([x, y]) => g.fillEllipse(x, y, 9, 5));
  g.fillStyle(speck);
  [[18, 40], [48, 56], [30, 26]].forEach(([x, y]) => g.fillCircle(x, y, 2));
  if (t.topStyle === 'grass') {
    g.fillStyle(top);
    g.fillRect(0, 0, 64, 14);
    g.fillStyle(topLight);
    g.fillRect(0, 0, 64, 6);
    g.fillStyle(top);
    for (let x = 0; x < 64; x += 8) g.fillTriangle(x, 14, x + 8, 14, x + 4, 20);
  } else if (t.topStyle === 'sand') {
    g.fillStyle(top);
    g.fillRect(0, 0, 64, 16);
    for (let x = 0; x < 64; x += 16) g.fillEllipse(x + 8, 16, 18, 8);
    g.fillStyle(topLight);
    g.fillRect(0, 0, 64, 5);
    g.fillEllipse(20, 9, 10, 3);
    g.fillEllipse(48, 11, 8, 2);
  } else if (t.topStyle === 'stone') {
    g.fillStyle(top);
    g.fillRect(0, 0, 64, 18);
    g.fillStyle(topLight);
    [[0, 2, 20], [22, 2, 18], [42, 2, 21], [10, 11, 20], [32, 11, 22]].forEach(([x, y, w]) => g.fillRoundedRect(x, y, w, 7, 2));
  } else if (t.topStyle === 'brick') {
    g.fillStyle(top);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(topLight);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 16 : 0;
      for (let x = -16; x < 64; x += 32) g.fillRect(x + off + 1, row * 16 + 1, 30, 14);
    }
    g.fillStyle(top);
    g.fillRect(0, 0, 64, 4);
  } else if (t.topStyle === 'rock') {
    g.fillStyle(top);
    g.fillRect(0, 0, 64, 16);
    g.fillStyle(topLight);
    g.fillTriangle(0, 4, 18, 0, 30, 6);
    g.fillTriangle(34, 2, 50, 0, 64, 5);
    g.lineStyle(2, speck, 0.9);
    g.lineBetween(12, 22, 20, 34);
    g.lineBetween(20, 34, 16, 44);
    g.lineBetween(44, 26, 50, 40);
  }
  // shared polish: crisp sunlit lip and a soft shadow under the top layer
  g.fillStyle(shade(topLight, 0.35), 0.9);
  g.fillRect(0, 0, 64, 2);
  if (t.topStyle !== 'brick') {
    g.fillStyle(shade(dirt, -0.3), 0.35);
    g.fillRect(0, 22, 64, 4);
  }
}

function drawDirt(g, t) {
  const [dirt, dirtDark, speck] = t.dirt;
  g.fillStyle(dirt);
  g.fillRect(0, 0, 64, 64);
  if (t.topStyle === 'brick') {
    g.fillStyle(t.top[1]);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 16 : 0;
      for (let x = -16; x < 64; x += 32) g.fillRect(x + off + 1, row * 16 + 1, 30, 14);
    }
    return;
  }
  g.fillStyle(dirtDark);
  [[10, 30], [40, 12], [24, 50], [52, 40], [6, 6], [34, 28]].forEach(([x, y]) => g.fillEllipse(x, y, 9, 5));
  g.fillStyle(speck, t.topStyle === 'rock' ? 0.7 : 1);
  [[18, 40], [48, 56], [30, 16]].forEach(([x, y]) => g.fillCircle(x, y, 2));
}

function drawStone(g, t, cracked = false, trim = false) {
  const [base, light, dark] = t.stone;
  g.fillStyle(base);
  g.fillRoundedRect(0, 0, 64, 24, 3);
  g.fillStyle(light);
  g.fillRect(0, 0, 64, 8);
  g.lineStyle(2, dark);
  g.lineBetween(63, 0, 63, 24);
  if (cracked) {
    g.lineStyle(2, dark);
    g.lineBetween(14, 0, 22, 12);
    g.lineBetween(22, 12, 16, 24);
    g.lineBetween(40, 0, 36, 10);
    g.lineBetween(36, 10, 46, 24);
  } else {
    g.lineStyle(1.5, dark);
    g.lineBetween(20, 9, 26, 22);
    g.lineBetween(46, 6, 42, 18);
  }
  g.fillStyle(shade(light, 0.4), 0.9);
  g.fillRect(2, 1, 60, 2);
  g.fillStyle(shade(dark, -0.2), 0.5);
  g.fillRect(0, 21, 64, 3);
  if (trim) {
    g.fillStyle(0xffd447);
    g.fillRect(0, 0, 64, 4);
    g.fillRect(0, 20, 64, 4);
  }
}

function drawWallBlock(g, t) {
  const [base, light, dark] = t.stone;
  g.fillStyle(dark);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle(base);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 16 : 0;
    for (let x = -16; x < 64; x += 32) g.fillRect(x + off + 2, row * 16 + 2, 28, 12);
  }
  g.fillStyle(light, 0.6);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 16 : 0;
    for (let x = -16; x < 64; x += 32) g.fillRect(x + off + 2, row * 16 + 2, 28, 3);
  }
}

function drawSpikes(g, [dark, light]) {
  g.fillStyle(dark);
  g.fillEllipse(32, 52, 62, 16);
  [[8, 10], [18, 0], [32, 4], [44, 0], [56, 12]].forEach(([x, top], i) => {
    g.fillStyle(i % 2 ? light : dark);
    g.fillTriangle(x - 7, 54, x + 7, 54, x, top + 14);
  });
  g.fillStyle(light);
  [[18, 16], [44, 16], [32, 20]].forEach(([x, y]) => g.fillCircle(x, y, 2));
}

function drawWater(g, [deep, light]) {
  g.fillStyle(deep);
  g.fillRect(0, 10, 64, 118);
  g.fillStyle(light);
  for (let x = 0; x < 64; x += 32) {
    g.fillEllipse(x + 16, 12, 34, 10);
  }
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(14, 10, 12, 3);
  g.fillEllipse(46, 12, 10, 3);
  g.fillStyle(light, 0.35);
  g.fillRect(6, 40, 20, 3);
  g.fillRect(36, 70, 18, 3);
}

function drawClouds(g, [color, alpha]) {
  paintClouds(g, color, alpha);
}

// distant hills sink into a soft mist toward their feet
function drawHazyHills(g, w, h, color, amp, base, waves, mist) {
  drawHills(g, w, h, color, amp, base, waves);
  const top = base + amp * 1.4;
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const y = top + ((h - 3 - top) * i) / steps;
    g.fillStyle(mist, 0.08 + i * 0.05);
    g.fillRect(0, y, w, (h - 3 - top) / steps + 1);
  }
}

// ---------------------------------------------------------------- backdrops (512 x 260, base at the bottom)

const PROPS = {
  pyramids(g) {
    // sun disc low on the horizon
    glow(g, 230, 150, 60, 0xfff0c9, 0.08, 6);
    g.fillStyle(0xfff3d6, 0.9);
    g.fillCircle(230, 150, 22);
    [[110, 170, 0.9], [300, 230, 1.2], [450, 120, 0.6]].forEach(([x, h, s]) => {
      const w = h * 1.5;
      const apex = 256 - h;
      // sunlit west face
      g.fillStyle(0xf0c983);
      g.fillTriangle(x - w / 2, 256, x, apex, x + w * 0.12, 256);
      // shaded east face
      g.fillStyle(0xb7843f);
      g.fillTriangle(x, apex, x + w / 2, 256, x + w * 0.12, 256);
      // ridge highlight
      g.lineStyle(2, 0xfff0c9, 0.9);
      g.lineBetween(x, apex, x + w * 0.12, 256);
      // stone courses
      for (let y = apex + 20 * s; y < 256; y += 14 * s) {
        const half = ((y - apex) / h) * (w / 2);
        const split = x + ((y - apex) / h) * w * 0.12;
        g.lineStyle(1, 0xc79552, 0.6);
        g.lineBetween(x - half, y, split, y);
        g.lineStyle(1, 0x8f6430, 0.5);
        g.lineBetween(split, y, x + half, y);
      }
      // gold capstone
      g.fillStyle(0xffd447);
      g.fillTriangle(x - 7 * s, apex + 10 * s, x, apex, x + 7 * s, apex + 10 * s);
      g.fillStyle(0xfff3b0);
      g.fillTriangle(x - 4 * s, apex + 8 * s, x, apex, x, apex + 9 * s);
    });
    // palms
    [[40, 0.9], [210, 1], [380, 0.8]].forEach(([x, s]) => {
      const tx = x + 6 * s;
      const ty = 200 * (2 - s) - 40;
      g.lineStyle(8 * s, 0x5a3e20);
      g.lineBetween(x, 256, tx, ty);
      g.lineStyle(5 * s, 0x8a6438);
      g.lineBetween(x - 1, 256, tx - 1, ty);
      for (let yy = ty + 10; yy < 256; yy += 10) {
        const k = (yy - ty) / (256 - ty);
        const cx = tx + (x - tx) * k;
        g.lineStyle(1.5, 0x5a3e20, 0.8);
        g.lineBetween(cx - 4 * s, yy, cx + 4 * s, yy - 2);
      }
      [-2.6, -1.9, -1.2, -0.5, 0.2].forEach((a) => {
        g.fillStyle(0x2f6a28);
        g.fillTriangle(tx, ty, tx + Math.cos(a) * 54 * s, ty + Math.sin(a) * 30 * s + 22, tx + Math.cos(a + 0.3) * 42 * s, ty + Math.sin(a + 0.3) * 30 * s + 28);
        g.fillStyle(0x5aa040);
        g.fillTriangle(tx, ty, tx + Math.cos(a) * 50 * s, ty + Math.sin(a) * 30 * s + 20, tx + Math.cos(a + 0.18) * 40 * s, ty + Math.sin(a + 0.18) * 30 * s + 22);
      });
      g.fillStyle(0x6a4a20);
      g.fillCircle(tx - 3, ty + 4, 3 * s);
      g.fillCircle(tx + 3, ty + 5, 3 * s);
    });
  },
  rocks(g) {
    [[60, 140], [190, 90], [330, 170], [470, 110]].forEach(([x, h]) => {
      g.fillStyle(0x6d7a80);
      poly(g, [[x - 50, 256], [x - 36, 256 - h * 0.7], [x - 10, 256 - h], [x + 20, 256 - h * 0.85], [x + 44, 256 - h * 0.4], [x + 56, 256]]);
      g.fillStyle(0x8a979c);
      poly(g, [[x - 36, 256 - h * 0.7], [x - 10, 256 - h], [x + 4, 256 - h * 0.6], [x - 20, 256 - h * 0.45]]);
    });
    g.lineStyle(3, 0xffffff, 0.8);
    [[120, 60], [150, 80], [400, 50]].forEach(([x, y]) => {
      g.lineBetween(x - 10, y, x, y + 6);
      g.lineBetween(x, y + 6, x + 10, y);
    });
  },
  citywalls(g) {
    g.fillStyle(0xbfa57a);
    g.fillRect(0, 140, 512, 116);
    g.fillStyle(0xa98f63);
    for (let x = 0; x < 512; x += 24) g.fillRect(x, 128, 14, 14);
    [[80, 70], [260, 50], [430, 80]].forEach(([x, top]) => {
      g.fillStyle(0xcab38a);
      g.fillRect(x - 34, top, 68, 256 - top);
      g.fillStyle(0xb39a6e);
      for (let cx = x - 34; cx < x + 34; cx += 17) g.fillRect(cx, top - 14, 10, 14);
      g.fillStyle(0x4a3a28);
      g.fillRect(x - 8, top + 30, 16, 26);
      g.fillRect(x - 6, top + 80, 12, 20);
    });
    g.fillStyle(0x4a3a28);
    g.fillRoundedRect(160, 200, 40, 56, { tl: 20, tr: 20, bl: 0, br: 0 });
  },
  ziggurats(g) {
    const tower = (x, base, tiers, step, s) => {
      for (let i = 0; i < tiers; i++) {
        const w = base - i * step * 2;
        const y = 256 - (i + 1) * 30;
        // tier body with lit left and shaded right
        g.fillStyle(i % 2 ? 0xb86a42 : 0xa35a35);
        g.fillRect(x - w / 2, y, w, 30);
        g.fillStyle(0xd99067, 0.8);
        g.fillRect(x - w / 2, y, w * 0.3, 30);
        g.fillStyle(0x5a2a16, 0.45);
        g.fillRect(x + w * 0.22, y, w * 0.28, 30);
        // ledge highlight and shadow
        g.fillStyle(0xf0b88a);
        g.fillRect(x - w / 2, y, w, 3);
        g.fillStyle(0x4a2010, 0.5);
        g.fillRect(x - w / 2, y + 27, w, 3);
        // arched windows, some lit
        for (let wx = x - w / 2 + 8; wx < x + w / 2 - 8; wx += 22) {
          g.fillStyle(0x3a1a10);
          g.fillRoundedRect(wx, y + 9, 8, 14, { tl: 4, tr: 4, bl: 0, br: 0 });
          if ((wx + i * 7) % 3 < 1) {
            g.fillStyle(0xffc46a, 0.85);
            g.fillRoundedRect(wx + 1, y + 11, 6, 11, { tl: 3, tr: 3, bl: 0, br: 0 });
          }
        }
      }
      // spiral ramp
      g.lineStyle(3 * s, 0xe0a070, 0.7);
      for (let i = 0; i < tiers - 1; i++) {
        const w = base - i * step * 2;
        const y = 256 - (i + 1) * 30;
        g.lineBetween(x - w / 2 + 4, y + 28, x + w / 2 - 10, y + 2);
      }
    };
    tower(140, 220, 8, 12, 1);
    tower(400, 150, 5, 13, 0.8);
    // unfinished top with scaffolding and a crane, very ambitious
    g.fillStyle(0xd99067);
    g.fillTriangle(140 - 12, 256 - 240, 140 + 12, 256 - 240, 140, 256 - 262 + 6);
    g.lineStyle(2, 0x6a4a2a);
    g.lineBetween(118, 16, 118, 34);
    g.lineBetween(162, 10, 162, 34);
    g.lineBetween(118, 22, 162, 22);
    g.lineBetween(162, 10, 196, 16);
    g.lineBetween(196, 16, 196, 30);
    // birds
    g.lineStyle(2, 0x3d3b7a, 0.8);
    [[250, 50], [270, 40], [330, 70]].forEach(([bx, by]) => {
      g.lineBetween(bx - 6, by - 3, bx, by);
      g.lineBetween(bx, by, bx + 6, by - 3);
    });
  },
  spires(g) {
    // lava glow rising from below
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0xff5a1f, 0.06 + i * 0.03);
      g.fillRect(0, 196 + i * 10, 512, 60 - i * 10);
    }
    [[40, 180], [120, 230], [200, 140], [300, 250], [390, 160], [470, 210]].forEach(([x, h]) => {
      // silhouette with a hot rim on the lava side
      g.fillStyle(0x3a0c08);
      poly(g, [[x - 32, 256], [x - 10, 256 - h * 0.6], [x - 5, 256 - h - 2], [x + 8, 256 - h * 0.7], [x + 32, 256]]);
      g.fillStyle(0x0e0406);
      poly(g, [[x - 28, 256], [x - 8, 256 - h * 0.6], [x - 4, 256 - h], [x + 6, 256 - h * 0.7], [x + 28, 256]]);
      // lava veins
      g.lineStyle(2, 0xff5a1f, 0.85);
      g.lineBetween(x - 2, 256 - h * 0.55, x + 4, 256 - h * 0.35);
      g.lineBetween(x + 4, 256 - h * 0.35, x - 1, 256 - h * 0.15);
      g.lineStyle(1, 0xffd447, 0.8);
      g.lineBetween(x - 2, 256 - h * 0.55, x + 3, 256 - h * 0.4);
      // windows that glow, for some reason
      glow(g, x - 2, 256 - h * 0.45, 8, 0xff7a2a, 0.12, 3);
      g.fillStyle(0xffc23a);
      g.fillCircle(x - 2, 256 - h * 0.45, 2.5);
      g.fillCircle(x + 6, 256 - h * 0.25, 1.8);
      // underlit base
      g.fillStyle(0xff7a2a, 0.35);
      poly(g, [[x - 28, 256], [x - 18, 236], [x + 18, 236], [x + 28, 256]]);
    });
    // embers drifting up
    g.fillStyle(0xffc23a, 0.9);
    [[70, 120], [160, 90], [250, 140], [340, 60], [430, 110], [500, 80], [20, 70]].forEach(([ex, ey]) => g.fillCircle(ex, ey, 1.6));
    g.fillStyle(0xff7a2a, 0.5);
    g.fillRect(0, 244, 512, 12);
    g.fillStyle(0xffd447, 0.6);
    g.fillRect(0, 250, 512, 3);
  },
};

function makeSky(scene, key, stops) {
  if (scene.textures.exists(key)) return;
  const sky = scene.textures.createCanvas(key, 4, 256);
  const ctx = sky.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  // three stops keep the old 0 / 0.6 / 1 spacing, longer lists spread evenly
  const at = stops.length === 3 ? [0, 0.6, 1] : stops.map((_, i) => i / (stops.length - 1));
  stops.forEach((c, i) => grad.addColorStop(at[i], c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  if (scene.sys.game.renderer) sky.refresh();
}

// Texture keys for a theme. Eden reuses the original greybox keys.
export function themeKeys(id) {
  if (id === 'eden') {
    return {
      sky: 'sky', clouds: 'clouds', far: 'hillsFar', props: 'trees', near: 'hillsNear',
      ground: 'ground', dirt: 'dirt', platform: 'platform', hazard: 'thorns',
      crumble: 'crumble_eden', mover: 'mover_eden', wall: 'wall_eden', water: 'water_eden',
    };
  }
  const k = (p) => `${p}_${id}`;
  return {
    sky: k('sky'), clouds: k('clouds'), far: k('far'), props: k('props'), near: k('near'),
    ground: k('ground'), dirt: k('dirt'), platform: k('platform'), hazard: k('hazard'),
    crumble: k('crumble'), mover: k('mover'), wall: k('wall'), water: k('water'),
  };
}

export function createThemeTextures(scene) {
  for (const [id, t] of Object.entries(THEMES)) {
    const k = themeKeys(id);
    // shared extras every theme needs, eden included
    make(scene, k.crumble, 64, 24, (g) => drawStone(g, t, true));
    make(scene, k.mover, 64, 24, (g) => drawStone(g, t, false, true));
    make(scene, k.wall, 64, 64, (g) => drawWallBlock(g, t));
    make(scene, k.water, 64, 128, (g) => drawWater(g, t.water));
    if (id === 'eden') continue;
    makeSky(scene, k.sky, t.sky);
    make(scene, k.clouds, 512, 160, (g) => drawClouds(g, t.clouds));
    make(scene, k.far, 512, 220, (g) => drawHazyHills(g, 512, 220, t.far, 26, 110, 1, t.mist ?? shade(t.far, 0.45)));
    make(scene, k.near, 512, 200, (g) => drawHills(g, 512, 200, t.near, 22, 90, 2));
    make(scene, k.props, 512, 260, (g) => (typeof t.prop === 'function' ? t.prop(g) : PROPS[t.prop](g)));
    make(scene, k.ground, 64, 64, (g) => drawTop(g, t));
    make(scene, k.dirt, 64, 64, (g) => drawDirt(g, t));
    make(scene, k.platform, 64, 24, (g) => drawStone(g, t));
    make(scene, k.hazard, 64, 60, (g) => drawSpikes(g, t.hazard));
  }
}

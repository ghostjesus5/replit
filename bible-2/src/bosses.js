// Bosses ride along at the right side of the screen while you keep running.
// Every attack has to be answerable by a runner who can't stop: jump it,
// stay low under it, or shoot/laser it. Nothing fills a column you must run through.

import Phaser from 'phaser';
import { GROUND_Y, PLAYER } from './config.js';

const LOW = GROUND_Y - 40; // hits you unless you jump
const HIGH = GROUND_Y - 170; // hits you only if you jump

function aimAt(scene, x, y, spread = 0, lead = 0.3) {
  const p = scene.player;
  const tx = p.x + PLAYER.runSpeed * lead;
  const ty = p.y - 10;
  return Math.atan2(ty - y, tx - x) + spread;
}

const ATTACKS = {
  // a fan of aimed shots
  fan(scene, b, { shot = 'venom', n = 3, spread = 0.2, speed = 420 } = {}) {
    const [mx, my] = b.mouth();
    b.openMouth(500);
    for (let i = 0; i < n; i++) {
      const a = aimAt(scene, mx, my, (i - (n - 1) / 2) * spread);
      scene.spawnShot(shot, mx, my, Math.cos(a) * speed, Math.sin(a) * speed, { spin: shot === 'scythe' ? 720 : 0 });
    }
    return 700;
  },
  // arcing lobs that land around where you'll be
  lob(scene, b, { shot = 'apple', n = 3 } = {}) {
    const [mx, my] = b.mouth();
    b.openMouth(400);
    for (let i = 0; i < n; i++) {
      scene.time.delayedCall(i * 220, () => {
        if (!b.alive) return;
        const vx = -Phaser.Math.Between(160, 380);
        scene.spawnShot(shot, mx, my, vx, -Phaser.Math.Between(560, 760), { gravity: 1300, spin: 360 });
      });
    }
    return 900;
  },
  // a wave that rolls along the ground: jump it
  wave(scene, b, { n = 1, gapMs = 650, shot = 'wave' } = {}) {
    for (let i = 0; i < n; i++) {
      scene.time.delayedCall(i * gapMs, () => {
        if (!b.alive) return;
        scene.cameras.main.shake(120, 0.006);
        scene.spawnShot(shot, b.sprite.x - 60, GROUND_Y - 20, -560, 0, {});
      });
    }
    return 600 + n * gapMs;
  },
  // straight shots at low or high height, called with a warning stripe on screen edge
  spears(scene, b, { shot = 'spear', heights = ['low', 'high'], speed = 720 } = {}) {
    heights.forEach((h, i) => {
      const y = h === 'low' ? LOW : HIGH;
      scene.time.delayedCall(i * 700, () => {
        if (!b.alive) return;
        scene.edgeWarning(y, 450);
        scene.time.delayedCall(450, () => b.alive && scene.spawnShot(shot, b.sprite.x - 80, y, -speed, 0, {}));
      });
    });
    return heights.length * 700 + 300;
  },
  // stuff falls from the sky across the screen ahead of you
  rain(scene, b, { shot = 'hail', n = 7, spanMs = 1400 } = {}) {
    const cam = scene.cameras.main;
    for (let i = 0; i < n; i++) {
      scene.time.delayedCall((i * spanMs) / n, () => {
        if (!b.alive) return;
        const x = cam.scrollX + cam.width * Phaser.Math.FloatBetween(0.35, 0.95);
        scene.spawnShot(shot, x, cam.scrollY - 30, -40, Phaser.Math.Between(380, 520), {});
      });
    }
    return spanMs + 300;
  },
  summon(scene, b, { type = 'locust', n = 4, rows = [5, 6, 7] } = {}) {
    const cam = scene.cameras.main;
    for (let i = 0; i < n; i++) {
      const row = rows[i % rows.length];
      scene.spawnEnemy(type, cam.scrollX + cam.width + 40 + i * 50, row * 64 + 32);
    }
    return 800;
  },
  // dive low and sweep left across the ground, then come back: jump over it
  lunge(scene, b, { depth = 150, speedMs = 900 } = {}) {
    const cam = scene.cameras.main;
    b.busy = true;
    scene.tweens.add({
      targets: b,
      offY: depth,
      duration: 450,
      ease: 'Sine.in',
      onComplete: () => {
        if (!b.alive) return;
        b.openMouth(speedMs);
        scene.tweens.add({
          targets: b,
          offX: -cam.width * 0.78,
          duration: speedMs,
          ease: 'Quad.in',
          yoyo: true,
          hold: 150,
          onComplete: () => {
            scene.tweens.add({ targets: b, offY: 0, duration: 400, onComplete: () => (b.busy = false) });
          },
        });
      },
    });
    return 450 + speedMs * 2 + 600;
  },
  // a beam across the whole lane: low means be in the air, high means stay down
  beam(scene, b, { height } = {}) {
    const h = height || (Math.random() < 0.5 ? 'low' : 'high');
    const y = h === 'low' ? LOW - 6 : HIGH;
    scene.laneBeam(y, 900, 650);
    b.openMouth(1500);
    return 1800;
  },
  shield(scene, b, { ms = 2200 } = {}) {
    b.shieldUntil = scene.time.now + ms;
    scene.floatText(b.sprite.x - 40, b.sprite.y - 140, 'SHIELD UP', '#ffd447', 26);
    return 500;
  },
  // a spinning blade that flies out and comes back
  boomerang(scene, b, { shot = 'scythe' } = {}) {
    const [mx, my] = b.mouth();
    const s = scene.spawnShot(shot, mx, LOW - 10, -700, 0, { spin: 900 });
    if (s) s.boomerang = { turnAt: scene.time.now + 900, back: 760 };
    return 900;
  },
  // every head on a multi-headed boss spits at once, staggered
  heads(scene, b, { shot = 'fireball', speed = 380 } = {}) {
    b.heads.filter((h) => h.active).forEach((h, i) => {
      scene.time.delayedCall(i * 160, () => {
        if (!h.active || !b.alive) return;
        h.setTexture('beastHead1');
        scene.time.delayedCall(300, () => h.active && h.setTexture('beastHead0'));
        const a = aimAt(scene, h.x - 30, h.y);
        scene.spawnShot(shot, h.x - 30, h.y + 6, Math.cos(a) * speed, Math.sin(a) * speed, { spin: 360 });
      });
    });
    return 1400;
  },
};

// Each phase is one body with its own health. Most bosses have a single phase.
// `attacks` cycle in order. Each entry is [attackName, options].
export const BOSSES = {
  serpent: {
    title: 'THE SERPENT',
    phases: [
      {
        name: 'THE SERPENT', tex: 'bossSerpent', hp: 190, y: GROUND_Y - 150, bob: 26, hit: [170, 150, 40, 30], every: 1500,
        mouth: [-0.38, -0.05],
        attacks: [['fan', { shot: 'venom', n: 3 }], ['lob', { shot: 'apple', n: 3 }], ['lunge', { depth: 190 }], ['fan', { shot: 'venom', n: 5, spread: 0.16 }], ['lob', { shot: 'apple', n: 4 }]],
      },
    ],
  },
  chariot: {
    title: "PHARAOH'S WAR CHARIOT",
    phases: [
      {
        name: "PHARAOH'S WAR CHARIOT", tex: 'bossChariot', hp: 240, y: GROUND_Y - 112, bob: 4, hit: [220, 150, 60, 60], every: 1500,
        mouth: [-0.1, -0.25],
        attacks: [['spears', { heights: ['low', 'high', 'low'] }], ['summon', { type: 'locust', n: 5 }], ['wave', { n: 2 }], ['rain', { shot: 'hail', n: 8 }], ['spears', { heights: ['high', 'low'] }], ['wave', { n: 3, gapMs: 550 }]],
      },
    ],
  },
  leviathan: {
    title: 'LEVIATHAN',
    phases: [
      {
        name: 'LEVIATHAN', tex: 'bossLeviathan', hp: 260, y: GROUND_Y - 110, bob: 34, hit: [150, 160, 50, 20], every: 1450,
        mouth: [-0.42, -0.25],
        attacks: [['fan', { shot: 'venom', n: 4 }], ['lunge', { depth: 200, speedMs: 850 }], ['summon', { type: 'fish', n: 3, rows: [8] }], ['rain', { shot: 'hail', n: 9 }], ['wave', { n: 2 }], ['lob', { shot: 'boulder', n: 3 }]],
      },
    ],
  },
  goliath: {
    title: 'GOLIATH',
    phases: [
      {
        name: 'GOLIATH', tex: 'bossGoliath', hp: 300, y: GROUND_Y - 158, bob: 3, hit: [150, 280, 40, 30], every: 1500,
        mouth: [-0.25, -0.3],
        attacks: [['lob', { shot: 'boulder', n: 3 }], ['wave', { n: 2 }], ['shield', { ms: 2000 }], ['spears', { heights: ['low', 'low', 'high'] }], ['wave', { n: 3, gapMs: 520 }], ['shield', { ms: 1600 }], ['lob', { shot: 'boulder', n: 5 }]],
      },
    ],
  },
  babbler: {
    title: 'THE BABBLER',
    phases: [
      {
        name: 'THE BABBLER', tex: 'bossBabbler', hp: 300, y: GROUND_Y - 190, bob: 18, hit: [180, 200, 50, 90], every: 1450,
        mouth: [-0.02, 0.05],
        attacks: [['fan', { shot: 'letter', n: 5, spread: 0.14, speed: 380 }], ['beam', { height: 'low' }], ['rain', { shot: 'brick', n: 8 }], ['summon', { type: 'gargoyle', n: 2, rows: [4, 6] }], ['beam', { height: 'high' }], ['fan', { shot: 'letter', n: 7, spread: 0.12, speed: 360 }], ['beam', {}]],
      },
    ],
  },
  apocalypse: {
    title: 'THE FOUR HORSEMEN',
    phases: [
      {
        name: 'THE WHITE HORSEMAN', tex: 'horsemanWhite', hp: 80, y: GROUND_Y - 105, bob: 6, hit: [160, 180, 30, 20], every: 1300,
        mouth: [-0.2, -0.2],
        attacks: [['fan', { shot: 'arrow', n: 3, spread: 0.12, speed: 620 }], ['spears', { shot: 'arrow', heights: ['low', 'high', 'low'], speed: 820 }], ['rain', { shot: 'arrow', n: 6 }]],
      },
      {
        name: 'THE RED HORSEMAN', tex: 'horsemanRed', hp: 80, y: GROUND_Y - 105, bob: 6, hit: [160, 180, 30, 20], every: 1300,
        mouth: [-0.3, -0.3],
        attacks: [['wave', { n: 2 }], ['spears', { shot: 'spear', heights: ['high', 'low'] }], ['wave', { n: 3, gapMs: 500 }]],
      },
      {
        name: 'THE BLACK HORSEMAN', tex: 'horsemanBlack', hp: 80, y: GROUND_Y - 105, bob: 6, hit: [160, 180, 30, 20], every: 1300,
        mouth: [-0.25, -0.25],
        attacks: [['lob', { shot: 'coin', n: 5 }], ['rain', { shot: 'coin', n: 9 }], ['lob', { shot: 'coin', n: 4 }]],
      },
      {
        name: 'THE PALE HORSEMAN', tex: 'horsemanPale', hp: 80, y: GROUND_Y - 105, bob: 6, hit: [160, 180, 30, 20], every: 1300,
        mouth: [-0.35, -0.2],
        attacks: [['boomerang', {}], ['summon', { type: 'demon', n: 2, rows: [4, 6] }], ['boomerang', {}], ['rain', { shot: 'ember', n: 8 }]],
      },
      {
        name: 'THE BEAST', tex: 'beastBody', hp: 0, heads: 7, headHp: 30, y: GROUND_Y - 150, bob: 12, hit: [0, 0, 0, 0], every: 1500,
        mouth: [-0.4, 0],
        attacks: [['heads', {}], ['wave', { n: 2 }], ['heads', {}], ['rain', { shot: 'ember', n: 10 }], ['heads', {}], ['beam', {}]],
      },
    ],
  },
};

export function runAttack(scene, boss, [name, opts]) {
  return ATTACKS[name](scene, boss, opts || {});
}

import Phaser from 'phaser';
import { FONT, GROUND_Y } from '../config.js';
import { getProgress } from '../save.js';
import { CAMPAIGNS, campaignLevels } from '../levels/campaign.js';

const HOW_TO = [
  ['TAP', 'jump'],
  ['TAP AGAIN', 'double jump'],
  ['HOLD', 'hover'],
  ['SWIPE UP', 'laser eyes, when the meter is full'],
  ['GUNS', 'fire on their own. He is very busy'],
  ['HALOS', 'collect them. Heaven is counting'],
  ['PICKUPS', 'loaves spread shot, wine shield, staff parts seas'],
];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.items = [];
    this.started = false;
    this.howOpen = false;
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ENTER', () => this.begin('bible'));
      kb.on('keydown-ONE', () => this.begin('bible'));
      kb.on('keydown-TWO', () => CAMPAIGNS.mormon.worlds.length && this.begin('mormon'));
      kb.on('keydown-ESC', () => this.howOpen && this.toggleHow(false));
    }
    this.cameras.main.fadeIn(300, 27, 20, 48);
  }

  build() {
    this.items.forEach((o) => {
      this.tweens.killTweensOf(o);
      o.destroy();
    });
    this.items = [];
    const { width, height } = this.scale;
    const add = (o) => (this.items.push(o), o);
    const cx = width / 2;
    const ground = height - (720 - GROUND_Y);

    add(this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(width, height));
    this.clouds = add(this.add.tileSprite(0, 30, width, 160, 'clouds').setOrigin(0, 0));
    add(this.add.tileSprite(0, ground - 200, width, 220, 'hillsFar').setOrigin(0, 0));
    this.trees = add(this.add.tileSprite(0, ground - 250, width, 260, 'trees').setOrigin(0, 0));
    this.near = add(this.add.tileSprite(0, ground - 120, width, 200, 'hillsNear').setOrigin(0, 0));
    this.groundTs = add(this.add.tileSprite(0, ground, width, 64, 'ground').setOrigin(0, 0));
    this.dirtTs = add(this.add.tileSprite(0, ground + 64, width, Math.max(0, height - ground - 64), 'dirt').setOrigin(0, 0));

    // heavenly rays behind the scroll, like the cover
    const rays = add(this.add.graphics({ x: cx, y: 100 }));
    rays.fillStyle(0xfff3b0, 0.16);
    const R = Math.max(width, height) * 1.2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rays.fillTriangle(0, 0, Math.cos(a - 0.07) * R, Math.sin(a - 0.07) * R, Math.cos(a + 0.07) * R, Math.sin(a + 0.07) * R);
    }
    this.tweens.add({ targets: rays, rotation: Math.PI * 2, duration: 120000, repeat: -1 });

    // the scroll banner: parchment, rolled ends, gold trim
    const bw = Math.min(780, width - 120);
    const bh = 150;
    const by = 100;
    add(this.add.rectangle(cx + 6, by + 8, bw, bh, 0x000000, 0.3));
    add(this.add.rectangle(cx, by, bw, bh, 0xe9c98a).setStrokeStyle(5, 0x7a4f2e));
    add(this.add.rectangle(cx, by, bw - 22, bh - 22).setStrokeStyle(2, 0xa8753f, 0.9));
    [-1, 1].forEach((side) => {
      const x = cx + side * (bw / 2 + 4);
      add(this.add.rectangle(x, by, 34, bh + 26, 0xc98a3e).setStrokeStyle(4, 0x7a4f2e));
      add(this.add.ellipse(x, by - bh / 2 - 13, 34, 16, 0xa8753f).setStrokeStyle(3, 0x7a4f2e));
      add(this.add.ellipse(x, by + bh / 2 + 13, 34, 16, 0xa8753f).setStrokeStyle(3, 0x7a4f2e));
    });
    add(
      this.add
        .text(cx, by - 46, 'THE NEWEST TESTAMENT PRESENTS:', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold italic', color: '#4a2c12' })
        .setOrigin(0.5),
    );
    const logo = add(
      this.add
        .text(cx, by + 18, 'BIBLE 2', { fontFamily: FONT, fontSize: '100px', fontStyle: 'bold', color: '#ffffff', stroke: '#4a2c12', strokeThickness: 10 })
        .setOrigin(0.5)
        .setShadow(4, 5, '#7a4f2e', 0, true, true),
    );
    this.tweens.add({ targets: logo, scale: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    add(
      this.add
        .text(cx, by + bh / 2 + 34, 'SIX WORLDS. ONE UNICORN. NO MERCY.', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 })
        .setOrigin(0.5),
    );

    // the hero gallops in place on the ground
    const k = 1.2;
    const hero = add(this.add.sprite(cx, ground + 2 - 56 * k, 'hero0').play('gallop').setScale(k));
    add(this.add.image(hero.x + 8 * k, hero.y - 16 * k, 'minigun').setOrigin(0.15, 0.33).setScale(k));
    add(this.add.image(hero.x + 2 * k, hero.y + 2 * k, 'minigun').setOrigin(0.15, 0.33).setScale(k).setRotation(0.1));

    // campaign choices
    const choices = [{ id: 'bible', title: 'BIBLE 2', sub: 'THE NEWEST TESTAMENT', tex: 'hero0', tint: null }];
    if (CAMPAIGNS.mormon?.worlds?.length) {
      const jo = this.textures.exists('joseph0');
      choices.push({ id: 'mormon', title: 'ANOTHER TESTAMENT', sub: 'THE MORMON ONE', tex: jo ? 'joseph0' : 'hero0', tint: jo ? null : 0x9fc4ff });
    }
    const cw = Math.min(360, (width - 80 - 260) / 2);
    const ch = 104;
    const cy = by + bh / 2 + 112;
    const offs = choices.length === 1 ? [0] : [-(cw / 2 + 150), cw / 2 + 150];
    choices.forEach((c, i) => this.choiceCard(add, cx + offs[i], cy, cw, ch, c, i));

    // controls strip
    const controls = 'TAP  jump      TAP AGAIN  double jump      HOLD  hover      SWIPE UP  laser eyes';
    add(
      this.add
        .text(cx, height - 18, controls, { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#fff6d6', backgroundColor: '#1b1430aa', padding: { x: 14, y: 6 } })
        .setOrigin(0.5, 1),
    );

    // how to play, top left
    const how = add(
      this.add
        .text(16, 16, 'HOW TO PLAY', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#1b1430', backgroundColor: '#fff6d6', padding: { x: 12, y: 7 } })
        .setOrigin(0, 0),
    );
    how.setInteractive({ useHandCursor: true }).on('pointerup', () => this.toggleHow(true));

    const done = getProgress().cleared.length;
    if (done) {
      const total = Object.keys(CAMPAIGNS).reduce((n, c) => n + campaignLevels(c).length, 0);
      add(
        this.add
          .text(width - 16, 22, `${done} / ${total} LEVELS CLEARED`, { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 })
          .setOrigin(1, 0),
      );
    }

    if (this.howOpen) this.buildHow(add);
  }

  choiceCard(add, x, y, w, h, c, i) {
    const card = add(this.add.container(x, y));
    const mormon = c.id === 'mormon';
    const bg = this.add.rectangle(0, 0, w, h, mormon ? 0x1f3550 : 0xffd447, 1).setStrokeStyle(4, mormon ? 0xc9e0ff : 0xfff3b0);
    const shade = this.add.rectangle(6, 7, w, h, 0x000000, 0.3);
    const icon = this.add.image(-w / 2 + 56, 4, c.tex).setScale(0.62);
    if (c.tint) icon.setTint(c.tint);
    const tx = -w / 2 + 108;
    const title = this.add
      .text(tx, -18, c.title, { fontFamily: FONT, fontSize: c.title.length > 10 ? '24px' : '32px', fontStyle: 'bold', color: mormon ? '#fff6d6' : '#1b1430' })
      .setOrigin(0, 0.5);
    const sub = this.add.text(tx, 16, c.sub, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: mormon ? '#c9e0ff' : '#5a3a1f' }).setOrigin(0, 0.5);
    const ride = this.add.text(tx, 38, 'TAP TO RIDE', { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: mormon ? '#ffd447' : '#b3261e' }).setOrigin(0, 0.5);
    card.add([shade, bg, icon, title, sub, ride]);
    this.tweens.add({ targets: ride, alpha: 0.3, duration: 650, yoyo: true, repeat: -1, delay: i * 300 });
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => card.setScale(0.96));
    bg.on('pointerout', () => card.setScale(1));
    bg.on('pointerup', () => {
      card.setScale(1);
      this.begin(c.id);
    });
  }

  toggleHow(open) {
    this.howOpen = open;
    this.build();
  }

  buildHow(add) {
    const { width, height } = this.scale;
    const cx = width / 2;
    add(this.add.rectangle(0, 0, width, height, 0x0d0a18, 0.8).setOrigin(0, 0).setInteractive()).on('pointerup', () => this.toggleHow(false));
    const pw = Math.min(760, width - 40);
    const ph = Math.min(height - 40, 520);
    const py = height / 2 - ph / 2;
    add(this.add.rectangle(cx, height / 2, pw, ph, 0xf1e2bd).setStrokeStyle(6, 0x7a4f2e));
    add(this.add.text(cx, py + 40, 'HOW TO PLAY', { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#4a2c12' }).setOrigin(0.5));
    add(this.add.text(cx, py + 76, 'He rides on His own. You handle the miracles.', { fontFamily: FONT, fontSize: '18px', fontStyle: 'italic', color: '#7a4f2e' }).setOrigin(0.5));
    const rowH = Math.min(46, (ph - 170) / HOW_TO.length);
    const left = cx - pw / 2 + 50;
    HOW_TO.forEach(([k, v], i) => {
      const y = py + 116 + i * rowH;
      add(this.add.text(left, y, k, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#b3261e' }).setOrigin(0, 0.5));
      add(this.add.text(left + 150, y, v, { fontFamily: FONT, fontSize: '20px', color: '#2e1c0c' }).setOrigin(0, 0.5));
    });
    const close = add(
      this.add
        .text(cx, py + ph - 36, 'AMEN, GOT IT', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#1b1430', backgroundColor: '#ffd447', padding: { x: 18, y: 8 } })
        .setOrigin(0.5),
    );
    close.setInteractive({ useHandCursor: true }).on('pointerup', () => this.toggleHow(false));
  }

  update(time, delta) {
    const v = delta * 0.4;
    this.clouds.tilePositionX += v * 0.08;
    this.trees.tilePositionX += v * 0.35;
    this.near.tilePositionX += v * 0.55;
    this.groundTs.tilePositionX += v;
    this.dirtTs.tilePositionX += v;
  }

  begin(campaign = 'bible') {
    if (this.started || this.howOpen) return;
    this.started = true;
    // Android lets us go fullscreen from a tap. iPhone Safari doesn't, so it just plays in the browser.
    if (this.scale.fullscreen.available && !this.scale.isFullscreen) {
      try {
        this.scale.startFullscreen();
      } catch {
        // not fatal
      }
    }
    this.cameras.main.fadeOut(250, 27, 20, 48);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', { campaign }));
  }
}

import Phaser from 'phaser';
import { FONT, GROUND_Y } from '../config.js';
import { getProgress } from '../save.js';
import { ALL_LEVELS } from '../levels/campaign.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.items = [];
    this.started = false;
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));

    this.input.once('pointerup', () => this.begin());
    this.input.keyboard?.once('keydown', () => this.begin());
  }

  build() {
    this.items.forEach((o) => o.destroy());
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

    // the scroll banner
    const bannerY = height * 0.2;
    add(this.add.rectangle(cx, bannerY, Math.min(760, width - 40), 170, 0xc98a3e).setStrokeStyle(6, 0x7a4f2e));
    add(
      this.add
        .text(cx, bannerY - 50, 'THE NEWEST TESTAMENT PRESENTS:', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#4a2c12' })
        .setOrigin(0.5),
    );
    add(
      this.add
        .text(cx, bannerY + 16, 'BIBLE 2', { fontFamily: FONT, fontSize: '104px', fontStyle: 'bold', color: '#ffffff', stroke: '#4a2c12', strokeThickness: 10 })
        .setOrigin(0.5),
    );

    const k = 1.3;
    const hero = add(this.add.sprite(cx - 40, ground + 2 - 56 * k, 'hero0').play('gallop').setScale(k));
    add(this.add.image(hero.x + 8 * k, hero.y - 16 * k, 'minigun').setOrigin(0.15, 0.33).setScale(k));
    add(this.add.image(hero.x + 2 * k, hero.y + 2 * k, 'minigun').setOrigin(0.15, 0.33).setScale(k).setRotation(0.1));

    const cta = add(
      this.add
        .text(cx, height * 0.4, 'TAP TO RIDE', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffd447', stroke: '#1b1430', strokeThickness: 8 })
        .setOrigin(0.5),
    );
    this.tweens.add({ targets: cta, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    add(
      this.add
        .text(cx, height * 0.48, 'SIX WORLDS. ONE UNICORN. NO MERCY.', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 })
        .setOrigin(0.5),
    );

    const controls = 'TAP  jump      TAP AGAIN  double jump      HOLD  hover      SWIPE UP  laser eyes';
    add(
      this.add
        .text(cx, height - 26, controls, { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#fff6d6', backgroundColor: '#1b1430aa', padding: { x: 14, y: 6 } })
        .setOrigin(0.5, 1),
    );

    const done = getProgress().cleared.length;
    if (done) {
      add(
        this.add
          .text(width - 20, 20, `${done} / ${ALL_LEVELS.length} LEVELS CLEARED`, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 })
          .setOrigin(1, 0),
      );
    }
  }

  update(time, delta) {
    const v = delta * 0.4;
    this.clouds.tilePositionX += v * 0.08;
    this.trees.tilePositionX += v * 0.35;
    this.near.tilePositionX += v * 0.55;
    this.groundTs.tilePositionX += v;
    this.dirtTs.tilePositionX += v;
  }

  begin() {
    if (this.started) return;
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
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
  }
}

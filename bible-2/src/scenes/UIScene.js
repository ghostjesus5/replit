import Phaser from 'phaser';
import { LASER, PLAYER, FONT } from '../config.js';
import { showRewardedAd, FAKE_AD_MS } from '../ads.js';

// HUD, menus, and all touch input. Touch lives here (the top scene) so taps on
// buttons never leak through as jumps.

const SWIPE_MIN_PX = 60;
const SWIPE_MAX_MS = 400;

function fmtTime(ms) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.gestures = new Map();
    this.overlayKind = null;
    this.hud = this.add.container(0, 0).setDepth(1);
    this.overlay = this.add.container(0, 0).setDepth(10);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    const kb = this.input.keyboard;
    if (kb) {
      kb.addKey('P').on('down', () => this.togglePause());
      kb.addKey('ESC').on('down', () => this.togglePause());
    }

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.buildHud();
    this.reset();
  }

  get gameScene() {
    return this.scene.get('Game');
  }

  // called on first launch and whenever the Game scene restarts
  reset() {
    const ev = this.gameScene.events;
    ev.off('died', this.onDied, this);
    ev.off('cleared', this.onCleared, this);
    ev.off('laser-not-ready', this.onLaserNotReady, this);
    ev.on('died', this.onDied, this);
    ev.on('cleared', this.onCleared, this);
    ev.on('laser-not-ready', this.onLaserNotReady, this);
    this.gestures.clear();
    this.hideOverlay();
    this.showIntro();
  }

  // ---------------------------------------------------------------- touch

  onPointerDown(pointer, over) {
    if (over.length || this.overlayKind) return;
    const game = this.gameScene;
    if (game.state.status !== 'playing') return;
    const jumped = game.pressJump(`p${pointer.id}`);
    this.gestures.set(pointer.id, { x: pointer.x, y: pointer.y, t: this.time.now, jumped, swiped: false });
  }

  onPointerMove(pointer) {
    const g = this.gestures.get(pointer.id);
    if (!g || g.swiped || !pointer.isDown) return;
    const dy = g.y - pointer.y;
    const dx = Math.abs(pointer.x - g.x);
    if (dy > SWIPE_MIN_PX && dx < dy * 1.2 && this.time.now - g.t < SWIPE_MAX_MS) {
      g.swiped = true;
      const game = this.gameScene;
      // a swipe starts with a touch, which already spent the double jump. give it back.
      if (g.jumped === 'air') game.refundAirJump();
      game.releaseJump(`p${pointer.id}`);
      game.fireLaser();
    }
  }

  onPointerUp(pointer) {
    this.gestures.delete(pointer.id);
    this.gameScene.releaseJump(`p${pointer.id}`);
  }

  // ---------------------------------------------------------------- HUD

  buildHud() {
    this.hearts = [];
    for (let i = 0; i < PLAYER.maxHearts; i++) {
      this.hearts.push(this.add.image(0, 0, 'heart'));
    }
    this.haloIcon = this.add.image(0, 0, 'halo').setScale(0.9);
    this.haloText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 }).setOrigin(0, 0.5);
    this.meter = this.add.graphics();
    this.meterLabel = this.add.text(0, 0, 'LASER EYES', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 4 }).setOrigin(0.5, 1);
    this.powerText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 4, align: 'center' }).setOrigin(0.5, 0);
    this.timeText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 }).setOrigin(1, 0.5);

    this.pauseBtn = this.add.container(0, 0);
    const circle = this.add.circle(0, 0, 28, 0x1b1430, 0.55).setStrokeStyle(3, 0xfff6d6, 0.9);
    const bar1 = this.add.rectangle(-7, 0, 7, 22, 0xfff6d6);
    const bar2 = this.add.rectangle(7, 0, 7, 22, 0xfff6d6);
    this.pauseBtn.add([circle, bar1, bar2]);
    // hit area is bigger than the drawn circle so thumbs don't miss
    circle.setInteractive({ hitArea: new Phaser.Geom.Circle(28, 28, 44), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    circle.on('pointerup', () => this.togglePause());

    this.hud.add([...this.hearts, this.haloIcon, this.haloText, this.meter, this.meterLabel, this.powerText, this.timeText, this.pauseBtn]);
    this.layout();
  }

  layout() {
    const { width } = this.scale;
    this.hearts.forEach((h, i) => h.setPosition(36 + i * 40, 34));
    this.haloIcon.setPosition(38, 80);
    this.haloText.setPosition(60, 80);
    this.meterX = width / 2 - 140;
    this.meterY = 30;
    this.meterLabel.setPosition(width / 2, this.meterY - 2);
    this.powerText.setPosition(width / 2, this.meterY + 26);
    this.pauseBtn.setPosition(width - 46, 44);
    this.timeText.setPosition(width - 92, 44);
    if (this.overlayKind) this.rebuildOverlay();
  }

  update(time) {
    const game = this.gameScene;
    if (!game || !game.state) return;
    const s = game.state;
    const gt = game.time.now;

    this.hearts.forEach((h, i) => h.setTexture(i < s.hearts ? 'heart' : 'heartEmpty'));
    this.haloText.setText(`${s.halos}/${s.halosTotal}`);
    this.timeText.setText(fmtTime(s.timeMs));

    // laser meter
    const full = s.laser >= LASER.meterMax;
    const g = this.meter;
    const w = 280;
    const pct = s.laser / LASER.meterMax;
    g.clear();
    g.fillStyle(0x1b1430, 0.6);
    g.fillRoundedRect(this.meterX - 3, this.meterY - 3, w + 6, 24, 8);
    if (pct > 0) {
      const pulse = full ? 0.6 + Math.sin(time / 90) * 0.4 : 1;
      g.fillStyle(full ? 0xff3b30 : 0xffd447, pulse);
      g.fillRoundedRect(this.meterX, this.meterY, Math.max(12, w * pct), 18, 6);
    }
    g.lineStyle(2, 0xfff6d6, 0.8);
    g.strokeRoundedRect(this.meterX - 3, this.meterY - 3, w + 6, 24, 8);
    if (this.notReadyUntil && time < this.notReadyUntil) {
      this.meterLabel.setText('NOT YET. KEEP SMITING.').setColor('#ffb0a8');
    } else {
      this.meterLabel.setText(full ? 'LASER EYES READY: SWIPE UP' : 'LASER EYES').setColor(full ? '#ffe14d' : '#fff6d6');
    }

    const parts = [];
    if (gt < s.loavesUntil) parts.push(`SPREAD SHOT ${Math.ceil((s.loavesUntil - gt) / 1000)}s`);
    if (gt < s.wineUntil) parts.push(`SHIELD ${Math.ceil((s.wineUntil - gt) / 1000)}s`);
    this.powerText.setText(parts.join('   '));
  }

  onLaserNotReady() {
    this.notReadyUntil = this.time.now + 900;
    this.tweens.add({ targets: this.meterLabel, x: this.meterLabel.x + 8, duration: 40, yoyo: true, repeat: 3 });
  }

  showIntro() {
    const L = this.gameScene.level;
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height * 0.32, `${L.name}\n${L.subtitle.toUpperCase()}`, {
        fontFamily: FONT,
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#fff6d6',
        align: 'center',
        stroke: '#1b1430',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, delay: 1400, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- overlays

  hideOverlay() {
    this.overlay.removeAll(true);
    this.overlayKind = null;
    this.overlayData = null;
  }

  showOverlay(kind, data = null) {
    this.overlayKind = kind;
    this.overlayData = data;
    this.gestures.clear();
    this.gameScene.releaseAll?.();
    this.rebuildOverlay();
  }

  rebuildOverlay() {
    this.overlay.removeAll(true);
    const { width, height } = this.scale;
    const dim = this.add.rectangle(0, 0, width, height, 0x0d0a18, 0.72).setOrigin(0, 0).setInteractive();
    this.overlay.add(dim);
    const cx = width / 2;
    const builders = {
      pause: () => this.buildPause(cx, height),
      dead: () => this.buildDead(cx, height),
      ad: () => this.buildAd(cx, height),
      countdown: () => this.buildCountdown(cx, height),
      clear: () => this.buildClear(cx, height),
    };
    builders[this.overlayKind]?.();
  }

  title(x, y, str, size = 64, color = '#fff6d6') {
    const t = this.add
      .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center', stroke: '#1b1430', strokeThickness: 8 })
      .setOrigin(0.5);
    this.overlay.add(t);
    return t;
  }

  body(x, y, str, size = 24, color = '#e9dcc0') {
    const t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', lineSpacing: 6 }).setOrigin(0.5);
    this.overlay.add(t);
    return t;
  }

  button(x, y, label, sub, onClick, primary = true) {
    const w = 340;
    const h = sub ? 84 : 68;
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, primary ? 0xffd447 : 0x1b1430, primary ? 1 : 0.8).setStrokeStyle(3, primary ? 0xfff3b0 : 0xfff6d6);
    const txt = this.add
      .text(0, sub ? -12 : 0, label, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: primary ? '#1b1430' : '#fff6d6' })
      .setOrigin(0.5);
    c.add([bg, txt]);
    if (sub) {
      c.add(this.add.text(0, 20, sub, { fontFamily: FONT, fontSize: '18px', color: primary ? '#5a3a1f' : '#cfc2a4' }).setOrigin(0.5));
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => c.setScale(0.96));
    bg.on('pointerout', () => c.setScale(1));
    bg.on('pointerup', () => {
      c.setScale(1);
      onClick();
    });
    this.overlay.add(c);
    return c;
  }

  buildPause(cx, h) {
    this.title(cx, h * 0.24, 'PAUSED');
    this.body(cx, h * 0.24 + 60, 'Selah.');
    this.button(cx, h * 0.48, 'RESUME', null, () => this.togglePause());
    this.button(cx, h * 0.48 + 88, 'START OVER', null, () => this.restartLevel(), false);
    this.button(cx, h * 0.48 + 176, 'TITLE SCREEN', null, () => this.toTitle(), false);
  }

  buildDead(cx, h) {
    const s = this.gameScene.state;
    const pit = s.deathCause === 'pit';
    this.title(cx, h * 0.22, pit ? 'CAST INTO THE PIT.' : 'SMITTEN.');
    this.body(cx, h * 0.22 + 62, 'Even the Son of God has off days.');
    if (s.resurrectsUsed < 1) {
      this.button(cx, h * 0.52, 'RESURRECT', 'watch a short ad', () => this.startResurrect());
      this.button(cx, h * 0.52 + 104, 'START OVER', null, () => this.restartLevel(), false);
    } else {
      this.body(cx, h * 0.44, 'One resurrection per level. Those are the rules.', 22, '#cfc2a4');
      this.button(cx, h * 0.58, 'START OVER', null, () => this.restartLevel());
    }
  }

  buildAd(cx, h) {
    this.title(cx, h * 0.3, 'REWARDED AD', 40, '#cfc2a4');
    this.body(cx, h * 0.3 + 50, '(the real ad plays here once we wire up AdMob)', 20, '#8f8470');
    const barW = 420;
    const track = this.add.rectangle(cx - barW / 2, h * 0.55, barW, 14, 0x3a3150).setOrigin(0, 0.5);
    const fill = this.add.rectangle(cx - barW / 2, h * 0.55, 1, 14, 0xffd447).setOrigin(0, 0.5);
    this.overlay.add([track, fill]);
    const elapsed = this.time.now - (this.overlayData?.startedAt ?? this.time.now);
    fill.width = Math.min(barW, (elapsed / FAKE_AD_MS) * barW);
    this.tweens.add({ targets: fill, width: barW, duration: Math.max(0, FAKE_AD_MS - elapsed) });
  }

  buildCountdown(cx, h) {
    const n = this.overlayData?.n ?? 3;
    this.body(cx, h * 0.22, 'RISING IN', 26, '#cfc2a4');
    const t = this.title(cx, h * 0.45, String(n), 160, '#ffd447');
    t.setScale(1.3);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' });
    this.body(cx, h * 0.45 + 110, '(three days, abridged)', 22, '#8f8470');
  }

  buildClear(cx, h) {
    const s = this.gameScene.state;
    const L = this.gameScene.level;
    this.title(cx, h * 0.17, 'IT IS FINISHED.');
    this.body(cx, h * 0.17 + 58, `${L.name} CLEAR`, 24, '#ffd447');
    const best = s.best && s.best.timeMs < Math.round(s.timeMs) ? `   (best ${fmtTime(s.best.timeMs)})` : s.best ? '   (new best)' : '';
    const lines = [
      `Time   ${fmtTime(s.timeMs)}${best}`,
      `Halos   ${s.halos} / ${s.halosTotal}`,
      `Smitten   ${s.kills}`,
      `Deaths   ${s.deaths}`,
    ];
    this.body(cx, h * 0.47, lines.join('\n'), 28, '#fff6d6');
    this.button(cx - 180, h * 0.78, 'RIDE AGAIN', null, () => this.restartLevel());
    this.button(cx + 180, h * 0.78, 'TITLE SCREEN', null, () => this.toTitle(), false);
  }

  // ---------------------------------------------------------------- flow

  onDied() {
    this.time.delayedCall(450, () => this.showOverlay('dead'));
  }

  onCleared() {
    this.showOverlay('clear');
  }

  togglePause() {
    const game = this.gameScene;
    if (this.overlayKind === 'pause') {
      this.hideOverlay();
      this.scene.resume('Game');
      return;
    }
    if (this.overlayKind || game.state.status !== 'playing') return;
    this.scene.pause('Game');
    this.showOverlay('pause');
  }

  startResurrect() {
    this.showOverlay('ad', { startedAt: this.time.now });
    showRewardedAd().then((rewarded) => {
      if (this.overlayKind !== 'ad') return;
      if (!rewarded) {
        this.showOverlay('dead');
        return;
      }
      this.countdown(3);
    });
  }

  countdown(n) {
    if (n === 0) {
      this.hideOverlay();
      this.gameScene.resurrect();
      const { width, height } = this.scale;
      const t = this.add
        .text(width / 2, height * 0.38, 'HE IS RISEN', { fontFamily: FONT, fontSize: '84px', fontStyle: 'bold', color: '#ffd447', stroke: '#1b1430', strokeThickness: 10 })
        .setOrigin(0.5)
        .setDepth(6)
        .setScale(0.6);
      this.tweens.add({ targets: t, scale: 1, duration: 350, ease: 'Back.out' });
      this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 500, onComplete: () => t.destroy() });
      return;
    }
    this.showOverlay('countdown', { n });
    this.time.delayedCall(1000, () => {
      if (this.overlayKind === 'countdown') this.countdown(n - 1);
    });
  }

  restartLevel() {
    this.hideOverlay();
    if (this.scene.isPaused('Game')) this.scene.resume('Game');
    this.gameScene.scene.restart();
  }

  toTitle() {
    this.hideOverlay();
    this.scene.stop('Game');
    this.scene.start('Title');
  }
}

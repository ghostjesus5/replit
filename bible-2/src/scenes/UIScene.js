import Phaser from 'phaser';
import { LASER, PLAYER, FONT } from '../config.js';
import { showRewardedAd, FAKE_AD_MS } from '../ads.js';
import { nextLevel } from '../levels/campaign.js';
import { DEATH_LINES, MORMON_DEATH_LINES } from '../levels/story.js';
import { outroFor } from './StoryScene.js';

// HUD, menus, and all touch input. Touch lives here (the top scene) so taps on
// buttons never leak through as jumps.

const SWIPE_MIN_PX = 60;
const SWIPE_MAX_MS = 400;

const fmtNum = (n) => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// five-point star polygon, for the clear screen
function starPoints(r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Geom.Point(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  return pts;
}

let deathLineIdx = 0;

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
    ev.off('boss-intro', this.onBossIntro, this);
    ev.off('boss-defeated', this.onBossDefeated, this);
    ev.on('boss-intro', this.onBossIntro, this);
    ev.on('boss-defeated', this.onBossDefeated, this);
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
    this.scoreText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffd447', stroke: '#1b1430', strokeThickness: 5 }).setOrigin(1, 0.5);
    this.shownScore = 0;
    this.lastMult = 1;
    this.comboBadge = this.add.container(0, 0).setVisible(false);
    this.comboBg = this.add.rectangle(0, 0, 120, 34, 0xb3261e, 0.92).setStrokeStyle(3, 0xffd447).setOrigin(1, 0.5);
    this.comboText = this.add.text(-10, 0, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#fff6d6' }).setOrigin(1, 0.5);
    this.comboBadge.add([this.comboBg, this.comboText]);

    this.pauseBtn = this.add.container(0, 0);
    const circle = this.add.circle(0, 0, 28, 0x1b1430, 0.55).setStrokeStyle(3, 0xfff6d6, 0.9);
    const bar1 = this.add.rectangle(-7, 0, 7, 22, 0xfff6d6);
    const bar2 = this.add.rectangle(7, 0, 7, 22, 0xfff6d6);
    this.pauseBtn.add([circle, bar1, bar2]);
    // hit area is bigger than the drawn circle so thumbs don't miss
    circle.setInteractive({ hitArea: new Phaser.Geom.Circle(28, 28, 44), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    circle.on('pointerup', () => this.togglePause());

    this.bossGfx = this.add.graphics();
    this.bossName = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 5 }).setOrigin(0.5, 1);

    this.hud.add([...this.hearts, this.haloIcon, this.haloText, this.meter, this.meterLabel, this.powerText, this.timeText, this.scoreText, this.comboBadge, this.pauseBtn, this.bossGfx, this.bossName]);
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
    this.scoreText.setPosition(width - 20, 92);
    this.comboBadge.setPosition(width - 20, 130);
    this.bossName.setPosition(width / 2, this.scale.height - 34);
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
    this.updateScore(s);

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
    const secs = (until) => Math.ceil((until - gt) / 1000);
    if (game.ghosting) parts.push(gt < s.ghostUntil ? `HOLY GHOST ${secs(s.ghostUntil)}s` : 'HOLY GHOST: FIND GROUND');
    if (gt < s.walkUntil) parts.push(`WALK ON WATER ${secs(s.walkUntil)}s`);
    if (gt < s.loavesUntil) parts.push(`SPREAD SHOT ${secs(s.loavesUntil)}s`);
    if (gt < s.wineUntil) parts.push(`SHIELD ${secs(s.wineUntil)}s`);
    this.powerText.setText(parts.join('   '));

    // boss health along the bottom
    const bg = this.bossGfx;
    bg.clear();
    if (s.bossBar) {
      const bw = Math.min(560, this.scale.width - 80);
      const bx = this.scale.width / 2 - bw / 2;
      const by = this.scale.height - 28;
      bg.fillStyle(0x1b1430, 0.7);
      bg.fillRoundedRect(bx - 3, by - 3, bw + 6, 20, 6);
      bg.fillStyle(0xd61f1f, 1);
      bg.fillRoundedRect(bx, by, Math.max(0, (bw * s.bossBar.hp) / s.bossBar.max), 14, 5);
      bg.lineStyle(2, 0xfff6d6, 0.8);
      bg.strokeRoundedRect(bx - 3, by - 3, bw + 6, 20, 6);
      this.bossName.setText(s.bossBar.name).setVisible(true);
    } else {
      this.bossName.setVisible(false);
    }
  }

  // score rolls up, combo badge pops when the multiplier climbs. all fields optional.
  updateScore(s) {
    const score = Number.isFinite(s.score) ? s.score : null;
    if (score === null) {
      this.scoreText.setVisible(false);
    } else {
      if (score < this.shownScore) this.shownScore = score;
      this.shownScore += Math.ceil((score - this.shownScore) * 0.25);
      this.scoreText.setVisible(true).setText(fmtNum(this.shownScore));
    }
    const mult = Number.isFinite(s.comboMult) ? s.comboMult : 1;
    const combo = Number.isFinite(s.combo) ? s.combo : 0;
    if (mult > 1 || combo >= 5) {
      this.comboText.setText(mult > 1 ? `x${mult} COMBO ${combo}` : `COMBO ${combo}`);
      this.comboBg.width = this.comboText.width + 22;
      this.comboBadge.setVisible(true);
      if (mult > this.lastMult) {
        this.tweens.killTweensOf(this.comboBadge);
        this.comboBadge.setScale(1.6);
        this.tweens.add({ targets: this.comboBadge, scale: 1, duration: 260, ease: 'Back.out' });
      }
    } else {
      this.comboBadge.setVisible(false);
    }
    this.lastMult = mult;
  }

  banner(text, color = '#fff6d6', size = 52) {
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height * 0.3, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center', stroke: '#1b1430', strokeThickness: 9 })
      .setOrigin(0.5)
      .setDepth(5)
      .setScale(0.7);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 600, onComplete: () => t.destroy() });
  }

  onBossIntro(name) {
    this.banner(name, '#ff6b5a');
  }

  onBossDefeated() {
    this.banner('THE GATE IS OPEN', '#ffd447', 44);
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
    this.title(cx, h * 0.15, 'PAUSED');
    this.body(cx, h * 0.15 + 56, 'Selah.');
    const y0 = h * 0.15 + 132;
    this.button(cx, y0, 'RESUME', null, () => this.togglePause());
    this.button(cx, y0 + 82, 'START OVER', null, () => this.restartLevel(), false);
    this.button(cx, y0 + 164, 'WORLD MAP', null, () => this.toMap(), false);
    const audio = this.game.audio;
    if (audio?.toggleMute) {
      const muted = audio.isMuted?.() ?? false;
      this.button(cx, y0 + 246, muted ? 'SOUND: OFF' : 'SOUND: ON', null, () => {
        audio.toggleMute();
        this.rebuildOverlay();
      }, false);
    }
  }

  buildDead(cx, h) {
    const s = this.gameScene.state;
    const titles = { pit: 'CAST INTO THE PIT.', water: 'SWEPT AWAY.', hit: 'SMITTEN.' };
    this.title(cx, h * 0.22, titles[s.deathCause] || 'SMITTEN.');
    this.body(cx, h * 0.22 + 62, this.deathLine(s.deathCause), 24);
    if (s.resurrectsUsed < 1) {
      this.button(cx, h * 0.52, 'RESURRECT', 'watch a short ad', () => this.startResurrect());
      this.button(cx, h * 0.52 + 104, 'START OVER', null, () => this.restartLevel(), false);
    } else {
      this.body(cx, h * 0.44, 'One resurrection per level. Those are the rules.', 22, '#cfc2a4');
      this.button(cx, h * 0.58, 'START OVER', null, () => this.restartLevel());
    }
  }

  // pick once per death so a resize doesn't reroll the joke
  deathLine(cause) {
    if (this.overlayData?.line) return this.overlayData.line;
    const mormon = this.gameScene.levelDef?.campaign === 'mormon';
    const table = (mormon ? MORMON_DEATH_LINES : DEATH_LINES) || DEATH_LINES;
    const list = table[cause] || table.hit || DEATH_LINES.hit;
    const line = list[deathLineIdx++ % list.length];
    this.overlayData = { ...(this.overlayData || {}), line };
    return line;
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

  // stars from GameScene when it has them, otherwise our own simple three
  starInfo(s) {
    if (Array.isArray(s.starReasons) && s.starReasons.length) {
      const got = Number.isFinite(s.stars) ? s.stars : s.starReasons.filter((r) => r.got).length;
      return { stars: got, reasons: s.starReasons };
    }
    const reasons = [
      { label: 'CLEARED', got: true },
      { label: 'ALL HALOS', got: s.halosTotal > 0 && s.halos >= s.halosTotal },
      { label: 'NO DEATHS', got: !s.deaths },
    ];
    return { stars: Number.isFinite(s.stars) ? s.stars : reasons.filter((r) => r.got).length, reasons };
  }

  buildClear(cx, h) {
    const s = this.gameScene.state;
    const L = this.gameScene.level;
    const def = this.gameScene.levelDef;
    const next = nextLevel(def.id);
    const { width } = this.scale;
    const anim = !this.overlayData?.shown; // only animate the first time, not on resize
    this.overlayData = { ...(this.overlayData || {}), shown: true };

    this.title(cx, 54, next ? 'IT IS FINISHED.' : 'IT IS FINISHED. FOR REAL.', next ? 56 : 46);
    this.body(cx, 104, next ? `${L.name} CLEAR` : 'THE FINAL CHAPTER IS WRITTEN', 22, '#ffd447');

    // three stars
    const { stars, reasons } = this.starInfo(s);
    const starY = 166;
    const pts = starPoints(34);
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * 96;
      const g = this.add.graphics({ x, y: starY });
      g.fillStyle(0x0d0a18, 0.8).fillPoints(starPoints(40), true);
      g.fillStyle(0x3a3150, 1).fillPoints(pts, true);
      this.overlay.add(g);
      if (i < stars) {
        const gs = this.add.graphics({ x, y: starY });
        gs.fillStyle(0xffd447, 1).fillPoints(pts, true);
        gs.lineStyle(3, 0xfff3b0, 1).strokePoints(pts, true);
        this.overlay.add(gs);
        if (anim) {
          gs.setScale(0).setAngle(-40);
          this.tweens.add({ targets: gs, scale: 1, angle: 0, duration: 380, delay: 350 + i * 260, ease: 'Back.out', onStart: () => this.game.events.emit('sfx', 'halo') });
        }
      }
    }
    const shownReasons = reasons.slice(0, 4);
    const rw = Math.min(240, (width - 80) / Math.max(1, shownReasons.length));
    shownReasons.forEach((r, i) => {
      const x = cx + (i - (shownReasons.length - 1) / 2) * rw;
      const t = this.add
        .text(x, starY + 56, `${r.got ? '+' : '-'} ${String(r.label).toUpperCase()}`, { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: r.got ? '#ffd447' : '#8f8470' })
        .setOrigin(0.5);
      this.overlay.add(t);
    });

    // stats: run details on the left, score on the right
    const statsY = 312;
    const best = s.best && s.best.timeMs < Math.round(s.timeMs) ? `  (best ${fmtTime(s.best.timeMs)})` : s.best ? '  (new best)' : '';
    const lines = [`Time   ${fmtTime(s.timeMs)}${best}`, `Halos   ${s.halos} / ${s.halosTotal}`, `Smitten   ${s.kills}`, `Deaths   ${s.deaths}`];
    const hasScore = Number.isFinite(s.score);
    this.body(hasScore ? cx - 170 : cx, statsY, lines.join('\n'), 22, '#fff6d6');
    if (hasScore) {
      this.body(cx + 200, statsY - 50, 'SCORE', 18, '#cfc2a4');
      const sc = this.title(cx + 200, statsY - 12, fmtNum(anim ? 0 : s.score), 46, '#ffd447');
      if (anim) {
        const o = { v: 0 };
        this.tweens.add({ targets: o, v: s.score, duration: 900, delay: 300, ease: 'Cubic.out', onUpdate: () => sc.setText(fmtNum(o.v)) });
      }
      const bits = [];
      if (Number.isFinite(s.bestCombo)) bits.push(`Best combo   ${s.bestCombo}`);
      if (Number.isFinite(s.bestStars)) bits.push(`Record   ${Math.max(s.bestStars, stars)} of 3 stars`);
      if (bits.length) this.body(cx + 200, statsY + 44, bits.join('\n'), 18, '#cfc2a4');
    }

    const by = h - 142;
    if (next) {
      this.button(cx, by, 'NEXT LEVEL', next.name, () => this.goToLevel(next.id));
    } else {
      this.button(cx, by, 'THE END', 'read the final chapter', () => this.toEnding());
    }
    this.button(cx - 180, by + 92, 'RIDE AGAIN', null, () => this.restartLevel(), false);
    this.button(cx + 180, by + 92, 'WORLD MAP', null, () => this.toMap(), false);
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
    this.goToLevel(this.gameScene.levelDef.id);
  }

  goToLevel(levelId) {
    this.hideOverlay();
    if (this.scene.isPaused('Game')) this.scene.resume('Game');
    this.gameScene.scene.restart({ levelId });
  }

  toEnding() {
    const cid = this.gameScene.levelDef?.campaign || 'bible';
    this.hideOverlay();
    this.scene.stop('Game');
    this.scene.start('Story', { ...outroFor(cid), next: { scene: 'Map', data: { campaign: cid } } });
  }

  toMap() {
    this.hideOverlay();
    this.scene.stop('Game');
    this.scene.start('Map');
  }
}

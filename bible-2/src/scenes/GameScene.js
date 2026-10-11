import Phaser from 'phaser';
import { TILE, WORLD_HEIGHT, GROUND_Y, PLAYER, GUNS, LASER, POWERUPS, ENEMIES, DEBUG, FONT } from '../config.js';
import { buildLevel } from '../levels/builder.js';
import EDEN_1 from '../levels/eden-1.js';
import { RAINBOW } from '../textures.js';
import { saveBest } from '../save.js';

const DEG = Math.PI / 180;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelDef = data?.level || EDEN_1;
  }

  create() {
    this.level = buildLevel(this.levelDef);
    const L = this.level;

    this.state = {
      status: 'playing', // playing | dead | clear
      deathCause: null,
      hearts: PLAYER.maxHearts,
      halos: 0,
      halosTotal: L.pickups.filter((p) => p.type === 'halo').length,
      kills: 0,
      deaths: 0,
      resurrectsUsed: 0,
      laser: 0,
      timeMs: 0,
      loavesUntil: 0,
      wineUntil: 0,
      best: null,
    };

    this.physics.world.setBounds(0, -1000, L.width, WORLD_HEIGHT + 2000);

    this.buildBackground();
    this.buildWorld();
    this.buildPlayer();
    this.buildEffects();
    this.buildColliders();
    this.bindKeys();

    this.cameras.main.setBackgroundColor('#8fd3ff');
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.onResize();

    this.holdSources = new Set();
    this.jumpLockUntil = 0;
    this.lastGroundedAt = -Infinity;
    this.jumpBufferedAt = -Infinity;
    this.airJumps = 0;
    this.hoverFuel = PLAYER.hoverFuelMs;
    this.invulnUntil = 0;
    this.fireTimer = 0;
    this.nextGun = 0;
    this.laserUntil = 0;
    this.laserTick = 0;
    this.lastSafeX = L.startX;

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    else this.scene.get('UI').reset();
  }

  // ---------------------------------------------------------------- build

  buildBackground() {
    const w = this.scale.width;
    this.bg = {
      sky: this.add.image(0, 0, 'sky').setOrigin(0, 0).setScrollFactor(0).setDepth(-20),
      clouds: this.add.tileSprite(0, 40, w, 160, 'clouds').setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-19),
      far: this.add.tileSprite(0, GROUND_Y - 200, w, 220, 'hillsFar').setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-18),
      trees: this.add.tileSprite(0, GROUND_Y - 250, w, 260, 'trees').setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-17),
      near: this.add.tileSprite(0, GROUND_Y - 120, w, 200, 'hillsNear').setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-16),
      // what you see down a pit
      abyss: this.add.rectangle(0, GROUND_Y + 30, w, 400, 0x2a1a2e).setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-15),
    };
  }

  buildWorld() {
    const L = this.level;

    this.groundGroup = this.physics.add.staticGroup();
    for (const seg of L.ground) {
      const w = seg.x1 - seg.x0;
      const ts = this.add.tileSprite(seg.x0, GROUND_Y, w, TILE, 'ground').setOrigin(0, 0);
      this.add.tileSprite(seg.x0, GROUND_Y + TILE, w, WORLD_HEIGHT - GROUND_Y + 200, 'dirt').setOrigin(0, 0);
      this.groundGroup.add(ts);
    }

    this.platformGroup = this.physics.add.staticGroup();
    for (const p of L.platforms) {
      const ts = this.add.tileSprite(p.x0, p.y, p.x1 - p.x0, 24, 'platform').setOrigin(0, 0);
      this.platformGroup.add(ts);
      // one-way: land on top, jump up through from below
      ts.body.checkCollision.down = false;
      ts.body.checkCollision.left = false;
      ts.body.checkCollision.right = false;
    }

    for (const s of L.signs) {
      const txt = this.add
        .text(s.x, GROUND_Y - 200, s.text, {
          fontFamily: FONT,
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#3b2410',
          align: 'center',
          backgroundColor: '#e9cf9b',
          padding: { x: 16, y: 10 },
        })
        .setOrigin(0.5, 1)
        .setDepth(-2);
      this.add.rectangle(s.x, GROUND_Y - 200, 10, 200, 0x6b4a2b).setOrigin(0.5, 0).setDepth(-3);
    }

    this.gate = this.add.image(L.finishX, GROUND_Y + 2, 'gate').setOrigin(0.5, 1).setDepth(-1);

    // hazards: indestructible except by laser
    this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const h of L.hazards) {
      const t = this.hazards.create(h.x, h.y, 'thorns').setOrigin(0.5, 1).setDepth(2);
      t.body.setSize(44, 40).setOffset(10, 18);
    }

    this.enemies = this.physics.add.group();
    for (const e of L.enemies) {
      const def = ENEMIES[e.type];
      const s = this.enemies.create(e.x, e.y, `${e.type}0`).setDepth(2);
      s.kind = e.type;
      s.hp = def.hp;
      s.awake = false;
      s.baseY = e.y;
      s.phase = Math.random() * Math.PI * 2;
      s.fireAt = 0;
      s.play(e.type);
      if (e.type === 'serpent') {
        s.body.setSize(80, 30).setOffset(10, 12);
        s.body.allowGravity = true;
      } else {
        s.body.setSize(38, 34).setOffset(13, 12);
        s.body.allowGravity = false;
      }
    }

    this.fireballs = this.physics.add.group({ allowGravity: false, maxSize: 40 });

    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const p of L.pickups) {
      const s = this.pickups.create(p.x, p.y, p.type).setDepth(1);
      s.kind = p.type;
      if (p.type === 'halo') s.body.setCircle(13, 2, 2);
      else s.body.setCircle(22, 4, 4);
      this.tweens.add({ targets: s, y: p.y - 8, duration: 700 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    this.bullets = this.physics.add.group({ allowGravity: false, maxSize: 90 });
  }

  buildPlayer() {
    const L = this.level;
    this.wingBack = this.add.sprite(0, 0, 'wing0').setDepth(3).setVisible(false).setTint(0xdfe8f5);
    this.player = this.physics.add.sprite(L.startX, GROUND_Y - 56, 'hero0').setDepth(4);
    this.player.play('gallop');
    this.player.body.setSize(60, 76).setOffset(36, 34);
    this.player.body.setMaxVelocityY(1500);
    this.wingFront = this.add.sprite(0, 0, 'wing0').setDepth(5).setVisible(false);
    this.wingBack.play('flap');
    this.wingFront.play('flap');

    this.guns = [
      { img: this.add.image(0, 0, 'minigun').setOrigin(0.15, 0.33).setDepth(6), dx: 8, dy: -16, angle: GUNS.upperAngleDeg, kick: 0 },
      { img: this.add.image(0, 0, 'minigun').setOrigin(0.15, 0.33).setDepth(6), dx: 2, dy: 2, angle: GUNS.lowerAngleDeg, kick: 0 },
    ];
    this.guns.forEach((g) => {
      g.flash = this.add.image(0, 0, 'flash').setOrigin(0, 0.5).setDepth(7).setVisible(false);
    });

    this.shield = this.add.ellipse(0, 0, 150, 140).setStrokeStyle(4, 0xb05ad8, 0.9).setFillStyle(0x9b3fd1, 0.15).setDepth(6).setVisible(false);
    this.laserGfx = this.add.graphics().setDepth(8);
  }

  buildEffects() {
    this.rainbow = this.add
      .particles(0, 0, 'px', {
        lifespan: 520,
        speedX: { min: -60, max: -20 },
        speedY: { min: -20, max: 20 },
        scale: { start: 1.6, end: 0.2 },
        alpha: { start: 1, end: 0 },
        tint: RAINBOW,
        frequency: 14,
        quantity: 2,
        emitting: false,
      })
      .setDepth(3);
    this.rainbow.startFollow(this.player, -46, 28);

    this.puff = this.add
      .particles(0, 0, 'spark', {
        lifespan: 450,
        speed: { min: 80, max: 280 },
        scale: { start: 1.3, end: 0 },
        gravityY: 400,
        emitting: false,
      })
      .setDepth(7);

    this.brass = this.add
      .particles(0, 0, 'px', {
        lifespan: 500,
        speedX: { min: -160, max: -60 },
        speedY: { min: -260, max: -140 },
        gravityY: 1400,
        scale: 0.6,
        rotate: { min: 0, max: 360 },
        tint: 0xd8a72a,
        emitting: false,
      })
      .setDepth(6);

    this.glitter = this.add
      .particles(0, 0, 'spark', {
        lifespan: 400,
        speed: { min: 40, max: 140 },
        scale: { start: 0.8, end: 0 },
        tint: 0xffe14d,
        emitting: false,
      })
      .setDepth(7);
  }

  buildColliders() {
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.collider(this.enemies, this.groundGroup);

    this.physics.add.overlap(this.player, this.enemies, this.onTouchEnemy, null, this);
    this.physics.add.overlap(this.player, this.hazards, () => this.hurt(), null, this);
    this.physics.add.overlap(this.player, this.fireballs, (p, f) => {
      if (this.hurt()) f.destroy();
    });
    this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this);

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.bullets, this.hazards, (b) => this.killBullet(b, 0x8a5a2b));
    this.physics.add.overlap(this.bullets, this.groundGroup, (b) => this.killBullet(b, 0x7a4f2e));
    this.physics.add.overlap(this.fireballs, this.groundGroup, (f) => f.destroy());
  }

  bindKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    const jumpKeys = ['SPACE', 'UP', 'W'];
    jumpKeys.forEach((k) => {
      const key = kb.addKey(k);
      key.on('down', () => this.pressJump(`key-${k}`));
      key.on('up', () => this.releaseJump(`key-${k}`));
    });
    ['E', 'L', 'SHIFT'].forEach((k) => kb.addKey(k).on('down', () => this.fireLaser()));
  }

  onResize() {
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    // keep the ground pinned to the bottom; taller screens just see more sky
    cam.scrollY = WORLD_HEIGHT - height;
    this.bg.sky.setDisplaySize(width, height);
    ['clouds', 'far', 'trees', 'near', 'abyss'].forEach((k) => this.bg[k].setSize(width, this.bg[k].height));
  }

  // ---------------------------------------------------------------- input (called by UI scene + keys)

  pressJump(source = 'touch') {
    if (this.state.status !== 'playing') return null;
    this.holdSources.add(source);
    const now = this.time.now;
    // check the body directly too: on a slow frame the coyote window can expire
    // between "landed" and "tapped", which would wrongly spend the double jump
    const onGround = this.player.body.blocked.down || now < this.lastGroundedAt + PLAYER.coyoteMs;
    const canGroundJump = onGround && now >= this.jumpLockUntil;
    if (canGroundJump) {
      this.doJump(PLAYER.jumpVelocity);
      return 'ground';
    }
    if (this.airJumps < 1) {
      this.airJumps++;
      this.doJump(PLAYER.doubleJumpVelocity);
      this.rainbow.explode(24);
      this.flapUntil = now + 450;
      return 'air';
    }
    this.jumpBufferedAt = now;
    return null;
  }

  releaseJump(source = 'touch') {
    this.holdSources.delete(source);
  }

  releaseAll() {
    this.holdSources.clear();
  }

  refundAirJump() {
    this.airJumps = Math.max(0, this.airJumps - 1);
  }

  doJump(v) {
    this.player.body.setVelocityY(-v);
    this.lastGroundedAt = -Infinity;
    this.jumpLockUntil = this.time.now + 140;
    this.jumpBufferedAt = -Infinity;
  }

  fireLaser() {
    const s = this.state;
    if (s.status !== 'playing') return false;
    if (s.laser < LASER.meterMax || this.time.now < this.laserUntil) {
      this.events.emit('laser-not-ready');
      return false;
    }
    s.laser = 0;
    this.laserUntil = this.time.now + LASER.durationMs;
    this.laserTick = 0;
    this.cameras.main.shake(LASER.durationMs, 0.006);
    this.cameras.main.flash(160, 255, 90, 90);
    this.floatText(this.player.x + 60, this.player.y - 120, 'BEHOLD.', '#ff3b30', 40);
    return true;
  }

  // ---------------------------------------------------------------- loop

  update(time, delta) {
    const s = this.state;
    const cam = this.cameras.main;

    if (s.status === 'playing') {
      s.timeMs += delta;
      if (DEBUG.autoplay) this.botThink();
      this.updatePlayer(time, delta);
      this.updateGuns(time, delta);
      this.updateLaser(time, delta);
    } else if (s.status === 'clear') {
      this.player.body.setVelocityX(PLAYER.runSpeed);
      this.updateGunsPose(time);
    }

    // camera follows horizontally only
    const maxScroll = Math.max(0, this.level.width - cam.width);
    cam.scrollX = Phaser.Math.Clamp(this.player.x - cam.width * PLAYER.cameraLead, 0, maxScroll);
    cam.scrollY = WORLD_HEIGHT - cam.height;
    this.bg.clouds.tilePositionX = cam.scrollX * 0.08 + time * 0.01;
    this.bg.far.tilePositionX = cam.scrollX * 0.18;
    this.bg.trees.tilePositionX = cam.scrollX * 0.35;
    this.bg.near.tilePositionX = cam.scrollX * 0.55;

    // Water into Wine: a little wobble while the shield is up
    const wine = time < s.wineUntil && s.status === 'playing';
    cam.setRotation(wine ? Math.sin(time / 280) * 0.012 : 0);
    cam.setZoom(wine ? 1.03 : 1);

    this.updateEnemies(time, delta);
    this.cleanup();
  }

  updatePlayer(time, delta) {
    const p = this.player;
    const body = p.body;
    const s = this.state;

    if (time < (this.respawnHoldUntil || 0)) {
      body.setAllowGravity(false);
      body.setVelocity(0, 200 / (PLAYER.respawnDescentMs / 1000));
      p.anims.stop();
      p.setTexture('heroJump');
      this.wingBack.setVisible(true).setPosition(p.x - 22, p.y - 18);
      this.wingFront.setVisible(true).setPosition(p.x - 6, p.y - 10);
      p.setAlpha(Math.floor(time / 70) % 2 ? 0.5 : 1);
      return;
    }

    body.setVelocityX(PLAYER.runSpeed);

    const grounded = body.blocked.down && time >= this.jumpLockUntil;
    this.grounded = grounded;
    if (grounded) {
      this.lastGroundedAt = time;
      this.airJumps = 0;
      this.hoverFuel = PLAYER.hoverFuelMs;
      if (this.isOverGround(p.x)) this.lastSafeX = p.x;
      if (time - this.jumpBufferedAt <= PLAYER.jumpBufferMs) this.doJump(PLAYER.jumpVelocity);
    }

    // hover: hold while falling
    const holding = this.holdSources.size > 0;
    this.hovering = false;
    if (holding && !grounded && body.velocity.y > 0 && this.hoverFuel > 0) {
      // gravity off + fixed sink rate, so hover feels the same at 30fps and 120fps
      body.setAllowGravity(false);
      body.setVelocityY(PLAYER.hoverMaxFall);
      this.hoverFuel -= delta;
      this.hovering = true;
    } else {
      body.setAllowGravity(true);
    }

    // don't leave the top of the screen
    if (p.y - 56 < PLAYER.maxRiseY && body.velocity.y < 0) body.setVelocityY(0);

    // look
    if (grounded) {
      if (p.anims.currentAnim?.key !== 'gallop' || !p.anims.isPlaying) p.play('gallop');
    } else {
      p.anims.stop();
      p.setTexture('heroJump');
    }

    const flapping = this.hovering || time < (this.flapUntil || 0);
    this.wingBack.setVisible(flapping).setPosition(p.x - 22, p.y - 18);
    this.wingFront.setVisible(flapping).setPosition(p.x - 6, p.y - 10);
    if (flapping && !this.rainbow.emitting) this.rainbow.start();
    if (!flapping && this.rainbow.emitting) this.rainbow.stop();

    const invuln = time < this.invulnUntil;
    p.setAlpha(invuln ? (Math.floor(time / 70) % 2 ? 0.35 : 1) : 1);

    const shieldUp = time < s.wineUntil;
    this.shield.setVisible(shieldUp).setPosition(p.x, p.y - 4);

    if (p.y > WORLD_HEIGHT + 140) this.die('pit');

    if (p.x >= this.level.finishX) this.clearLevel();
  }

  updateGunsPose(time) {
    const p = this.player;
    const bob = this.grounded ? Math.sin(time / 40) * 1.5 : 0;
    for (const g of this.guns) {
      g.kick = Math.max(0, g.kick - 1.2);
      g.img.setPosition(p.x + g.dx - g.kick, p.y + g.dy + bob).setRotation(g.angle * DEG);
      g.img.setAlpha(p.alpha);
    }
  }

  updateGuns(time, delta) {
    this.updateGunsPose(time);
    this.fireTimer -= delta;
    if (this.fireTimer > 0) return;
    this.fireTimer += GUNS.fireIntervalMs;
    if (this.fireTimer < 0) this.fireTimer = GUNS.fireIntervalMs;

    const g = this.guns[this.nextGun];
    this.nextGun = 1 - this.nextGun;
    const a = g.angle * DEG;
    const mx = g.img.x + Math.cos(a) * 70;
    const my = g.img.y + Math.sin(a) * 70;
    const spread = time < this.state.loavesUntil ? GUNS.spreadAnglesDeg : [0];
    for (const off of spread) this.spawnBullet(mx, my, a + off * DEG);

    g.kick = 4;
    g.flash.setPosition(mx - 4, my).setRotation(a).setVisible(true).setScale(0.8 + Math.random() * 0.5);
    this.time.delayedCall(40, () => g.flash.setVisible(false));
    this.brass.emitParticleAt(g.img.x + 6, g.img.y - 2, 1);
  }

  spawnBullet(x, y, angle) {
    const b = this.bullets.get(x, y, 'bullet');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(6);
    b.body.enable = true;
    b.body.reset(x, y);
    b.body.allowGravity = false;
    b.body.setSize(22, 6);
    b.setRotation(angle);
    b.body.setVelocity(Math.cos(angle) * GUNS.bulletSpeed + PLAYER.runSpeed, Math.sin(angle) * GUNS.bulletSpeed);
  }

  killBullet(b, color = 0xffffff) {
    if (!b.active) return;
    this.puff.setParticleTint(color);
    this.puff.explode(2, b.x, b.y);
    b.disableBody(true, true);
  }

  updateLaser(time, delta) {
    const g = this.laserGfx;
    g.clear();
    if (time >= this.laserUntil) return;

    const cam = this.cameras.main;
    const p = this.player;
    const ex = p.x + 2;
    const ey = p.y - 44;
    const endX = cam.scrollX + cam.width / cam.zoom + 80;
    const flick = 0.85 + Math.random() * 0.3;

    for (const ang of [-0.1, -0.035]) {
      const ty = ey + Math.tan(ang) * (endX - ex);
      const beam = (w0, w1, color, alpha) => {
        g.fillStyle(color, alpha);
        g.fillPoints(
          [
            { x: ex, y: ey - w0 / 2 },
            { x: endX, y: ty - (w1 * flick) / 2 },
            { x: endX, y: ty + (w1 * flick) / 2 },
            { x: ex, y: ey + w0 / 2 },
          ],
          true,
        );
      };
      beam(14, 70, 0xff3b30, 0.28);
      beam(8, 34, 0xff3b30, 0.85);
      beam(3, 12, 0xfff1f0, 1);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(ex, ey, 6 * flick);

    // wipe everything on screen, checked a few times so things scrolling in die too
    this.laserTick -= delta;
    if (this.laserTick > 0) return;
    this.laserTick = 120;
    const left = cam.scrollX;
    const right = cam.scrollX + cam.width + 40;
    const inView = (o) => o.active && o.x > left && o.x < right;
    this.enemies.getChildren().filter(inView).forEach((e) => this.killEnemy(e, true));
    this.hazards.getChildren().filter(inView).forEach((h) => {
      this.puff.setParticleTint(0x3d7335);
      this.puff.explode(14, h.x, h.y - 24);
      h.destroy();
    });
    this.fireballs.getChildren().filter(inView).forEach((f) => f.destroy());
  }

  updateEnemies(time, delta) {
    const cam = this.cameras.main;
    const wake = cam.scrollX + cam.width + 60;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      if (!e.awake && e.x < wake) e.awake = true;
      if (!e.awake) continue;
      const def = ENEMIES[e.kind];
      if (e.kind === 'serpent') {
        e.body.setVelocityX(-def.speed);
      } else if (e.kind === 'imp') {
        e.body.setVelocityX(-def.speed);
        e.phase += delta / 1000 * 3;
        e.y = e.baseY + Math.sin(e.phase) * def.bob;
        if (this.state.status === 'playing' && e.x > this.player.x + 160 && e.x < cam.scrollX + cam.width - 20) {
          if (!e.fireAt) e.fireAt = time + 500 + Math.random() * 600;
          if (time >= e.fireAt) {
            e.fireAt = time + def.fireEveryMs;
            this.throwFireball(e);
          }
        }
      }
      if (e.y > WORLD_HEIGHT + 200) e.destroy();
    }
  }

  throwFireball(e) {
    const f = this.fireballs.create(e.x - 10, e.y + 6, 'fireball').setDepth(6);
    if (!f) return;
    f.body.setCircle(9, 3, 3);
    // aim at where the hero will be shortly, not where it is
    const tx = this.player.x + PLAYER.runSpeed * 0.35;
    const ty = this.player.y - 10;
    const a = Math.atan2(ty - f.y, tx - f.x);
    f.body.setVelocity(Math.cos(a) * ENEMIES.imp.fireballSpeed, Math.sin(a) * ENEMIES.imp.fireballSpeed);
    this.tweens.add({ targets: f, angle: 360, duration: 500, repeat: -1 });
  }

  cleanup() {
    const cam = this.cameras.main;
    const left = cam.scrollX - 300;
    const right = cam.scrollX + cam.width + 80;
    for (const b of this.bullets.getChildren()) {
      if (b.active && (b.x > right || b.y > WORLD_HEIGHT + 50 || b.y < -200)) b.disableBody(true, true);
    }
    for (const f of this.fireballs.getChildren()) {
      if (f.x < left || f.y > WORLD_HEIGHT + 50 || f.y < -300) f.destroy();
    }
    for (const e of this.enemies.getChildren()) if (e.x < left) e.destroy();
    for (const h of this.hazards.getChildren()) if (h.x < left) h.destroy();
  }

  // ---------------------------------------------------------------- interactions

  onTouchEnemy(p, e) {
    if (!e.active || this.state.status !== 'playing') return;
    const falling = p.body.velocity.y > 0;
    const fromAbove = p.body.bottom <= e.body.top + 20;
    if (falling && fromAbove) {
      this.killEnemy(e);
      p.body.setVelocityY(-PLAYER.stompBounce);
      this.airJumps = 0;
      this.jumpLockUntil = this.time.now + 140;
      this.floatText(e.x, e.y - 30, 'SMITE!', '#ffe14d', 28);
      return;
    }
    this.hurt();
  }

  onBulletHit(b, e) {
    if (!b.active || !e.active) return;
    this.killBullet(b, 0xffe14d);
    e.hp -= GUNS.damage;
    e.setTintFill(0xffffff);
    this.time.delayedCall(50, () => e.active && e.clearTint());
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e, byLaser = false) {
    if (!e.active) return;
    const s = this.state;
    s.kills++;
    if (!byLaser) s.laser = Math.min(LASER.meterMax, s.laser + LASER.perKill);
    this.puff.setParticleTint(e.kind === 'imp' ? 0x6a3c84 : 0x3fa34d);
    this.puff.explode(16, e.x, e.y);
    e.destroy();
  }

  onPickup(p, item) {
    if (!item.active) return;
    const s = this.state;
    const now = this.time.now;
    if (item.kind === 'halo') {
      s.halos++;
      s.laser = Math.min(LASER.meterMax, s.laser + LASER.perHalo);
      this.glitter.explode(6, item.x, item.y);
    } else if (item.kind === 'loaves') {
      s.loavesUntil = now + POWERUPS.loavesMs;
      this.floatText(item.x, item.y - 40, 'LOAVES & FISHES\nYOUR AMMO MULTIPLIES', '#ffe14d', 26);
    } else if (item.kind === 'wine') {
      s.wineUntil = now + POWERUPS.wineMs;
      this.floatText(item.x, item.y - 40, 'WATER INTO WINE\nSHIELD UP', '#e7b6ff', 26);
    }
    item.destroy();
  }

  // returns true if the hit landed
  hurt() {
    const s = this.state;
    const now = this.time.now;
    if (s.status !== 'playing' || now < this.invulnUntil || DEBUG.god) return false;
    if (now < s.wineUntil) {
      s.wineUntil = 0;
      this.invulnUntil = now + 700;
      this.cameras.main.flash(120, 190, 120, 255);
      this.floatText(this.player.x, this.player.y - 90, 'SHIELD BROKEN', '#e7b6ff', 24);
      return true;
    }
    s.hearts--;
    this.invulnUntil = now + PLAYER.hurtInvulnMs;
    this.cameras.main.shake(180, 0.01);
    this.player.setTint(0xff6b6b);
    this.time.delayedCall(160, () => this.player.clearTint());
    if (s.hearts <= 0) this.die('hit');
    return true;
  }

  die(cause) {
    const s = this.state;
    if (s.status !== 'playing') return;
    s.status = 'dead';
    s.deathCause = cause;
    s.deaths++;
    s.hearts = 0;
    this.releaseAll();
    this.laserGfx.clear();
    this.laserUntil = 0;
    this.rainbow.stop();
    this.physics.pause();
    this.player.anims.stop();
    this.cameras.main.shake(250, 0.012);
    this.events.emit('died', cause);
  }

  // called by the UI after the rewarded ad + countdown
  resurrect() {
    const s = this.state;
    s.resurrectsUsed++;
    s.status = 'playing';
    s.hearts = PLAYER.maxHearts;
    const x = this.safeRespawnX();
    // drift down out of the light for a beat before the run picks back up
    const y = GROUND_Y - 260;
    this.player.setPosition(x, y);
    this.player.body.reset(x, y);
    this.respawnHoldUntil = this.time.now + PLAYER.respawnDescentMs;
    this.player.clearTint().setAlpha(1);
    this.player.body.setAllowGravity(true);
    this.invulnUntil = this.time.now + PLAYER.respawnInvulnMs;
    this.airJumps = 0;
    this.lastGroundedAt = -Infinity;

    // clear the screen so you don't respawn into a fireball
    const right = x + this.cameras.main.width;
    this.enemies.getChildren().filter((e) => e.x < right).forEach((e) => {
      this.puff.setParticleTint(0xfff3b0);
      this.puff.explode(10, e.x, e.y);
      e.destroy();
    });
    this.fireballs.clear(true, true);

    // beam of light
    const beam = this.add.rectangle(x, 0, 140, GROUND_Y, 0xfff3b0, 0.8).setOrigin(0.5, 0).setDepth(9);
    this.tweens.add({ targets: beam, alpha: 0, scaleX: 0.2, duration: 900, onComplete: () => beam.destroy() });
    this.glitter.explode(30, x, GROUND_Y - 60);
    this.physics.resume();
  }

  isOverGround(x) {
    return this.level.ground.some((g) => x >= g.x0 + 20 && x <= g.x1 - 20);
  }

  safeRespawnX() {
    const segs = this.level.ground;
    const x = this.lastSafeX;
    const seg = segs.find((g) => x >= g.x0 && x <= g.x1) || segs.filter((g) => g.x1 <= x).pop() || segs[0];
    // about a second of runway before the next edge, so you can react
    const runway = 6 * TILE;
    if (seg.x1 - seg.x0 <= runway) return seg.x0 + 40;
    return Phaser.Math.Clamp(x - 3 * TILE, seg.x0 + 40, seg.x1 - runway);
  }

  clearLevel() {
    const s = this.state;
    if (s.status !== 'playing') return;
    s.status = 'clear';
    this.releaseAll();
    this.laserGfx.clear();
    this.guns.forEach((g) => g.flash.setVisible(false));
    s.best = saveBest(this.levelDef.id, { timeMs: Math.round(s.timeMs), halos: s.halos, kills: s.kills });
    this.glitter.explode(40, this.gate.x, GROUND_Y - 150);
    this.time.delayedCall(1100, () => this.events.emit('cleared'));
  }

  floatText(x, y, str, color, size = 28) {
    const t = this.add
      .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center', stroke: '#1b1430', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(9);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1400, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- test bot (?autoplay)
  // Not smart, just good enough to prove the level can be finished end to end.

  botTap() {
    this.pressJump('bot');
    this.releaseJump('bot');
  }

  botThink() {
    const p = this.player;
    const b = p.body;
    const L = this.level;
    const front = b.right;
    const feet = b.bottom;

    if (this.state.laser >= LASER.meterMax) this.fireLaser();

    if (b.blocked.down) {
      this.holdSources.delete('bot');
      // look further ahead when frames are long so slow devices don't run off edges
      const reach = 24 + (PLAYER.runSpeed * this.game.loop.delta) / 1000;
      const surfaces = [
        ...L.ground.map((g) => ({ x0: g.x0, x1: g.x1, y: GROUND_Y })),
        ...L.platforms.map((pl) => ({ x0: pl.x0, x1: pl.x1, y: pl.y })),
      ];
      const under = surfaces.find((sf) => b.center.x >= sf.x0 - 40 && b.center.x <= sf.x1 + 40 && Math.abs(sf.y - feet) < 24);
      const edgeSoon = under && under.x1 - front < reach;
      const thorn = this.hazards.getChildren().find((h) => h.active && h.x - front > 30 && h.x - front < 100);
      if (edgeSoon || thorn) this.botTap();
      return;
    }

    // airborne: if we'd come down over a pit, double jump, then hover
    const vy = b.velocity.y;
    const drop = GROUND_Y - feet;
    if (drop < -4) return;
    const t = (vy + Math.sqrt(vy * vy + 2 * PLAYER.gravity * drop)) / PLAYER.gravity;
    const landX = b.center.x + PLAYER.runSpeed * t;
    const safe = L.ground.some((g) => landX - 20 >= g.x0 && landX + 10 <= g.x1);
    if (!safe && this.airJumps === 0 && vy > -80) {
      this.botTap();
      return;
    }
    if (!safe && vy > 0) this.holdSources.add('bot');
    else this.holdSources.delete('bot');
  }
}

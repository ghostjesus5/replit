import Phaser from 'phaser';
import { TILE, WORLD_HEIGHT, GROUND_Y, PLAYER, GUNS, LASER, POWERUPS, ENEMIES, WALLS, DEBUG, FONT } from '../config.js';
import { buildLevel } from '../levels/builder.js';
import { findLevel } from '../levels/campaign.js';
import { THEMES, themeKeys } from '../themes.js';
import { BOSSES, runAttack } from '../bosses.js';
import { RAINBOW } from '../textures.js';
import { saveBest, markCleared } from '../save.js';

const DEG = Math.PI / 180;
const MOUTHY = ['bossSerpent', 'bossLeviathan', 'bossBabbler'];
const KEY_POWERS = ['ghost', 'walk', 'staff', 'trumpet'];
const SPEECH = ['REPENT', 'THE END IS NIGH', 'SMITE THEE', 'BEHOLD', 'WOE UNTO YOU', 'VERILY', 'HARK', 'BABEL RULES'];
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?!';

function scramble(phrase) {
  return phrase
    .split(' ')
    .map((w) => Phaser.Utils.Array.Shuffle(w.split('')).join(''))
    .join(' ');
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelDef = findLevel(data?.levelId);
  }

  create() {
    this.level = buildLevel(this.levelDef);
    const L = this.level;
    this.theme = THEMES[L.theme];
    this.keys = themeKeys(L.theme);

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
      ghostUntil: 0,
      walkUntil: 0,
      bossBar: null,
      best: null,
    };

    this.physics.world.setBounds(0, -1000, L.width, WORLD_HEIGHT + 2000);

    this.buildBackground();
    this.buildWorld();
    this.buildPlayer();
    this.buildEffects();
    this.buildColliders();
    this.bindKeys();

    this.cameras.main.setBackgroundColor(this.theme.sky[1]);
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
    this.ghosting = false;
    this.onWaterAt = -Infinity;
    this.beams = [];
    this.edgeWarnings = [];
    this.boss = null;
    this.bossDone = false;

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    else this.scene.get('UI').reset();
  }

  // ---------------------------------------------------------------- build

  buildBackground() {
    const w = this.scale.width;
    const k = this.keys;
    this.bg = {
      sky: this.add.image(0, 0, k.sky).setOrigin(0, 0).setScrollFactor(0).setDepth(-20),
      clouds: this.add.tileSprite(0, 40, w, 160, k.clouds).setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-19),
      far: this.add.tileSprite(0, GROUND_Y - 200, w, 220, k.far).setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-18),
      props: this.add.tileSprite(0, GROUND_Y - 250, w, 260, k.props).setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-17),
      near: this.add.tileSprite(0, GROUND_Y - 120, w, 200, k.near).setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-16),
      // what you see down a pit
      abyss: this.add.rectangle(0, GROUND_Y + 30, w, 400, this.theme.abyss).setOrigin(0, 0).setScrollFactor(0, 1).setDepth(-15),
    };
  }

  buildWorld() {
    const L = this.level;
    const k = this.keys;

    this.groundGroup = this.physics.add.staticGroup();
    for (const seg of L.ground) {
      const w = seg.x1 - seg.x0;
      const ts = this.add.tileSprite(seg.x0, GROUND_Y, w, TILE, k.ground).setOrigin(0, 0);
      this.add.tileSprite(seg.x0, GROUND_Y + TILE, w, WORLD_HEIGHT - GROUND_Y + 200, k.dirt).setOrigin(0, 0);
      this.groundGroup.add(ts);
    }

    // seas: deadly unless Walk on Water is active or the sea has been parted
    this.waterGroup = this.physics.add.staticGroup();
    this.seas = L.seas.map((seg) => {
      const w = seg.x1 - seg.x0;
      const sea = { ...seg, parted: false };
      sea.surface = this.add.tileSprite(seg.x0, GROUND_Y - 4, w, 128, k.water).setOrigin(0, 0).setDepth(1).setAlpha(0.92);
      sea.deep = this.add.rectangle(seg.x0, GROUND_Y + 122, w, 400, this.theme.water[0]).setOrigin(0, 0).setDepth(1);
      const zone = this.add.zone(seg.x0, GROUND_Y, w, 40).setOrigin(0, 0);
      this.waterGroup.add(zone);
      zone.sea = sea;
      return sea;
    });

    this.platformGroup = this.physics.add.staticGroup();
    this.crumbleGroup = this.physics.add.staticGroup();
    this.moverGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const p of L.platforms) {
      const key = p.style === 'crumble' ? k.crumble : p.style === 'mover' ? k.mover : k.platform;
      const ts = this.add.tileSprite(p.x0, p.y, p.x1 - p.x0, 24, key).setOrigin(0, 0);
      if (p.style === 'crumble') this.crumbleGroup.add(ts);
      else if (p.style === 'mover') {
        this.moverGroup.add(ts);
        ts.move = { bx: p.x0, by: p.y, dx: p.dx, dy: p.dy, period: p.period };
      } else this.platformGroup.add(ts);
      // one-way: land on top, jump up through from below
      ts.body.checkCollision.down = false;
      ts.body.checkCollision.left = false;
      ts.body.checkCollision.right = false;
    }

    for (const s of L.signs) {
      this.add
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

    this.gate = Number.isFinite(L.finishX) ? this.add.image(L.finishX, GROUND_Y + 2, 'gate').setOrigin(0.5, 1).setDepth(-1) : null;

    // hazards: indestructible except by laser
    this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const h of L.hazards) {
      const t = this.hazards.create(h.x, h.y, k.hazard).setOrigin(0.5, 1).setDepth(2);
      t.body.setSize(44, 40).setOffset(10, 18);
    }

    // breakable walls: they stop you until you shoot them down
    this.walls = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const wl of L.walls) {
      const ts = this.add.tileSprite(wl.x, GROUND_Y - wl.h * TILE, TILE, wl.h * TILE, k.wall).setOrigin(0, 0).setDepth(1.5);
      this.walls.add(ts);
      ts.hp = wl.h * WALLS.hpPerTile;
      ts.tiles = wl.h;
    }

    this.enemies = this.physics.add.group();
    for (const e of L.enemies) this.spawnEnemy(e.type, e.x, e.y, { phase: e.phase, sleeping: true });

    this.shots = this.physics.add.group({ allowGravity: false });

    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const p of L.pickups) {
      const s = this.pickups.create(p.x, p.y, p.type).setDepth(1);
      s.kind = p.type;
      if (p.type === 'halo') s.body.setCircle(13, 2, 2);
      else if (KEY_POWERS.includes(p.type)) {
        // powers you need for what's ahead sit in a pillar of light: run, jump or fly
        // through any part of it and it's yours
        s.body.setSize(60, GROUND_Y - p.y + 360).setOffset(-4, -(GROUND_Y - p.y) - 300 + 26);
        const pillar = this.add.rectangle(p.x, GROUND_Y, 64, 420, 0xfff3b0, 0.16).setOrigin(0.5, 1).setDepth(0.9);
        this.tweens.add({ targets: pillar, alpha: 0.32, duration: 600, yoyo: true, repeat: -1 });
        s.once('destroy', () => this.tweens.add({ targets: pillar, alpha: 0, scaleX: 3, duration: 300, onComplete: () => pillar.destroy() }));
      } else s.body.setCircle(22, 4, 4);
      this.tweens.add({ targets: s, y: p.y - 8, duration: 700 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    this.zones = L.zones.map((z) => ({ ...z, next: 0 }));
    this.darkness = this.add.image(0, 0, 'darkness').setScale(6).setDepth(8.5).setAlpha(0).setScrollFactor(1);
    this.beamGfx = this.add.graphics().setDepth(8);

    this.bossGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bullets = this.physics.add.group({ allowGravity: false, maxSize: 110 });
  }

  spawnEnemy(type, x, y, { phase, sleeping = false } = {}) {
    const def = ENEMIES[type];
    if (type === 'fish') y = GROUND_Y + 60; // fish always start under the surface
    const s = this.enemies.create(x, y, `${type}0`).setDepth(type === 'fish' ? 0.5 : 2);
    s.kind = type;
    s.hp = def.hp;
    s.awake = !sleeping;
    s.baseY = y;
    s.phase = phase ?? Math.random() * Math.PI * 2;
    s.nextAct = 0;
    s.play(type);
    s.body.setSize(def.w, def.h).setOffset(def.ox, def.oy);
    s.body.allowGravity = !!def.gravity;
    if (type === 'gargoyle') {
      s.bubble = this.add
        .text(x, y - 56, scramble(Phaser.Utils.Array.GetRandom(SPEECH)), { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#1b1430', backgroundColor: '#ffffff', padding: { x: 8, y: 4 } })
        .setOrigin(0.5, 1)
        .setDepth(2.5);
      s.once('destroy', () => s.bubble.destroy());
    }
    return s;
  }

  buildPlayer() {
    const L = this.level;
    this.ghostGlow = this.add.image(0, 0, 'ghostGlow').setDepth(3.5).setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4);
    // the unicorn's legs fade into a ghost's tail while flying
    this.ghostTail = this.add.sprite(0, 0, 'ghostTail0').setDepth(3.6).setVisible(false).setOrigin(0.85, 0.3);
    this.ghostTail.play('ghostTail');
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

    this.wisps = this.add
      .particles(0, 0, 'spark', {
        lifespan: 700,
        speedX: { min: -140, max: -60 },
        speedY: { min: -30, max: 30 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xffffff, 0xcfe8ff, 0xa9d4ff],
        frequency: 20,
        emitting: false,
      })
      .setDepth(3.4);
    this.wisps.startFollow(this.player, -30, 10);

    this.spray = this.add
      .particles(0, 0, 'spark', {
        lifespan: 380,
        speedX: { min: -200, max: -80 },
        speedY: { min: -220, max: -80 },
        gravityY: 900,
        scale: { start: 0.7, end: 0 },
        tint: 0xdff4ff,
        frequency: 30,
        emitting: false,
      })
      .setDepth(3);
    this.spray.startFollow(this.player, -20, 54);

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
    const notGhost = () => !this.ghosting;
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.collider(this.player, this.moverGroup);
    this.physics.add.collider(this.player, this.crumbleGroup, (p, plat) => this.onCrumbleTouch(plat));
    this.physics.add.collider(this.player, this.walls, null, notGhost);
    this.physics.add.collider(
      this.player,
      this.waterGroup,
      () => (this.onWaterAt = this.time.now),
      (p, zone) => this.isSeaSolid(zone.sea),
    );
    this.physics.add.collider(this.enemies, this.groundGroup);
    this.physics.add.collider(this.enemies, this.walls);

    this.physics.add.overlap(this.player, this.enemies, this.onTouchEnemy, null, this);
    this.physics.add.overlap(this.player, this.hazards, () => this.hurt(), notGhost, this);
    this.physics.add.overlap(this.player, this.shots, (p, f) => {
      if (this.hurt()) f.destroy();
    }, notGhost);
    this.physics.add.overlap(this.player, this.bossGroup, () => this.hurt(), notGhost);
    this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this);

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.bullets, this.bossGroup, (b, part) => {
      if (!b.active) return;
      this.killBullet(b, 0xffe14d);
      this.damageBoss(part, GUNS.damage);
    });
    this.physics.add.overlap(this.bullets, this.walls, (b, wl) => {
      if (!b.active) return;
      this.killBullet(b, this.theme.stone[0]);
      this.damageWall(wl, GUNS.damage);
    });
    this.physics.add.overlap(this.bullets, this.hazards, (b) => this.killBullet(b, 0x8a5a2b));
    this.physics.add.overlap(this.bullets, this.groundGroup, (b) => this.killBullet(b, this.theme.dirt[0]));
    this.physics.add.overlap(this.shots, this.groundGroup, (f) => !f.roll && this.popShot(f));
    this.physics.add.overlap(this.shots, this.walls, (f) => this.popShot(f));
  }

  bindKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    const jumpKeys = ['SPACE', 'UP', 'W'];
    jumpKeys.forEach((key) => {
      const k = kb.addKey(key);
      k.on('down', () => this.pressJump(`key-${key}`));
      k.on('up', () => this.releaseJump(`key-${key}`));
    });
    ['E', 'L', 'SHIFT'].forEach((key) => kb.addKey(key).on('down', () => this.fireLaser()));
  }

  onResize() {
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    // keep the ground pinned to the bottom; taller screens just see more sky
    cam.scrollY = WORLD_HEIGHT - height;
    this.bg.sky.setDisplaySize(width, height);
    ['clouds', 'far', 'props', 'near', 'abyss'].forEach((key) => this.bg[key].setSize(width, this.bg[key].height));
  }

  // ---------------------------------------------------------------- terrain queries

  isOverGround(x) {
    return this.level.ground.some((g) => x >= g.x0 + 20 && x <= g.x1 - 20);
  }

  seaAt(x) {
    return this.seas.find((s) => x >= s.x0 && x <= s.x1) || null;
  }

  isSeaSolid(sea) {
    return sea.parted || this.time.now < this.state.walkUntil;
  }

  // can you stand at x right now?
  isSolidAt(x) {
    if (this.level.ground.some((g) => x >= g.x0 && x <= g.x1)) return true;
    const sea = this.seaAt(x);
    return !!sea && this.isSeaSolid(sea);
  }

  // ---------------------------------------------------------------- input (called by UI scene + keys)

  pressJump(source = 'touch') {
    if (this.state.status !== 'playing') return null;
    this.holdSources.add(source);
    if (this.ghosting) return 'ghost';
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
      this.updateZones(time);
      this.updateBossTrigger();
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
    this.bg.props.tilePositionX = cam.scrollX * 0.35;
    this.bg.near.tilePositionX = cam.scrollX * 0.55;
    for (const sea of this.seas) sea.surface.tilePositionX = time * 0.05;

    // Water into Wine: a little wobble while the shield is up
    const wine = time < s.wineUntil && s.status === 'playing';
    cam.setRotation(wine ? Math.sin(time / 280) * 0.012 : 0);
    cam.setZoom(wine ? 1.03 : 1);

    this.updateMovers(delta);
    this.updateEnemies(time, delta);
    this.updateShots(time);
    this.updateBoss(time, delta);
    this.updateBeams(time);
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

    const onWater = time - this.onWaterAt < 80;
    body.setVelocityX(PLAYER.runSpeed * (onWater ? POWERUPS.walkSpeedBoost : 1));
    if (onWater && !this.spray.emitting) this.spray.start();
    if (!onWater && this.spray.emitting) this.spray.stop();

    const grounded = body.blocked.down && time >= this.jumpLockUntil;
    this.grounded = grounded;
    if (grounded) {
      this.lastGroundedAt = time;
      this.airJumps = 0;
      this.hoverFuel = PLAYER.hoverFuelMs;
      if (this.isOverGround(p.x)) this.lastSafeX = p.x;
      if (!this.ghosting && time - this.jumpBufferedAt <= PLAYER.jumpBufferMs) this.doJump(PLAYER.jumpVelocity);
    }

    const holding = this.holdSources.size > 0;
    this.updateGhost(time, delta, holding);

    this.hovering = false;
    if (!this.ghosting) {
      // hover: hold while falling
      if (holding && !grounded && body.velocity.y > 0 && this.hoverFuel > 0) {
        // gravity off + fixed sink rate, so hover feels the same at 30fps and 120fps
        body.setAllowGravity(false);
        body.setVelocityY(PLAYER.hoverMaxFall);
        this.hoverFuel -= delta;
        this.hovering = true;
      } else {
        body.setAllowGravity(true);
      }
    }

    // don't leave the top of the screen
    if (p.y - 56 < PLAYER.maxRiseY && body.velocity.y < 0) body.setVelocityY(0);

    // look
    if (grounded && !this.ghosting) {
      if (p.anims.currentAnim?.key !== 'gallop' || !p.anims.isPlaying) p.play('gallop');
    } else {
      p.anims.stop();
      p.setTexture('heroJump');
    }

    const flapping = !this.ghosting && (this.hovering || time < (this.flapUntil || 0));
    this.wingBack.setVisible(flapping).setPosition(p.x - 22, p.y - 18);
    this.wingFront.setVisible(flapping).setPosition(p.x - 6, p.y - 10);
    if (flapping && !this.rainbow.emitting) this.rainbow.start();
    if (!flapping && this.rainbow.emitting) this.rainbow.stop();

    if (!this.ghosting) {
      const invuln = time < this.invulnUntil;
      p.setAlpha(invuln ? (Math.floor(time / 70) % 2 ? 0.35 : 1) : 1);
    }

    const shieldUp = time < s.wineUntil;
    this.shield.setVisible(shieldUp).setPosition(p.x, p.y - 4);

    // drowning: you went under the surface of a sea you can't stand on
    const sea = this.seaAt(p.x);
    if (sea && !this.isSeaSolid(sea) && !this.ghosting && body.bottom > GROUND_Y + 30) {
      this.puff.setParticleTint(this.theme.water[1]);
      this.puff.explode(24, p.x, GROUND_Y);
      this.die('water');
      return;
    }
    if (p.y > WORLD_HEIGHT + 140) this.die('pit');

    if (p.x >= this.level.finishX) this.clearLevel();
  }

  // Holy Ghost: free flight, phase through walls and enemies, can't fall in a pit
  updateGhost(time, delta, holding) {
    const p = this.player;
    const body = p.body;
    const s = this.state;
    const wanted = time < s.ghostUntil;
    // never drop the hero out of the sky over a pit: wait for solid ground
    const overSolid = this.isSolidAt(p.x - 30) && this.isSolidAt(p.x + 30);
    if (this.ghosting && !wanted && overSolid) this.endGhost();
    if (!this.ghosting && wanted) this.startGhost();
    if (!this.ghosting) return;

    body.setAllowGravity(false);
    const target = holding ? -POWERUPS.ghostRise : POWERUPS.ghostSink;
    const k = Math.min(1, delta / 140);
    body.setVelocityY(body.velocity.y + (target - body.velocity.y) * k);
    if (!overSolid && body.bottom >= GROUND_Y - 4 && body.velocity.y > 0) {
      body.setVelocityY(0);
      p.y -= body.bottom - (GROUND_Y - 4);
    }

    const ending = s.ghostUntil - time < 1500;
    const flicker = ending && Math.floor(time / 90) % 2;
    p.setAlpha(flicker ? 0.3 : 0.62 + Math.sin(time / 120) * 0.08);
    this.ghostGlow.setPosition(p.x, p.y - 10).setAlpha(0.6 + Math.sin(time / 200) * 0.2);
    this.ghostTail.setPosition(p.x + 24, p.y + 40).setAlpha(flicker ? 0.3 : 0.9);
    this.guns.forEach((g) => g.img.setTint(0xcfe8ff));
  }

  startGhost() {
    this.ghosting = true;
    this.player.setTint(0xa9d4ff);
    this.ghostGlow.setVisible(true);
    this.ghostTail.setVisible(true);
    this.wisps.start();
    this.rainbow.stop();
    this.cameras.main.flash(200, 220, 240, 255);
  }

  endGhost() {
    this.ghosting = false;
    this.player.clearTint().setAlpha(1);
    this.ghostGlow.setVisible(false);
    this.ghostTail.setVisible(false);
    this.wisps.stop();
    this.guns.forEach((g) => g.img.clearTint());
    this.player.body.setAllowGravity(true);
    // a fresh double jump and hover, in case it ends somewhere awkward
    this.airJumps = 0;
    this.hoverFuel = PLAYER.hoverFuelMs;
    this.floatText(this.player.x, this.player.y - 100, 'THE GHOST DEPARTS', '#cfe8ff', 22);
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
    this.walls.getChildren().filter(inView).forEach((wl) => this.damageWall(wl, 6));
    this.shots.getChildren().filter(inView).forEach((f) => this.popShot(f));
    this.bossGroup.getChildren().filter(inView).forEach((part) => this.damageBoss(part, LASER.bossDamage));
  }

  updateMovers(delta) {
    const dt = delta / 1000;
    if (dt <= 0) return;
    const now = this.time.now;
    for (const m of this.moverGroup.getChildren()) {
      const { bx, by, dx, dy, period } = m.move;
      const f = (1 - Math.cos(((now % period) / period) * Math.PI * 2)) / 2;
      m.body.setVelocity((bx + f * dx - m.x) / dt, (by + f * dy - m.y) / dt);
    }
  }

  onCrumbleTouch(plat) {
    if (plat.crumbling || !this.player.body.blocked.down) return;
    plat.crumbling = true;
    this.tweens.add({ targets: plat, x: plat.x + 3, duration: 50, yoyo: true, repeat: 5 });
    this.time.delayedCall(520, () => {
      plat.body.enable = false;
      this.puff.setParticleTint(this.theme.stone[0]);
      this.puff.explode(10, plat.x + plat.width / 2, plat.y + 10);
      this.tweens.add({ targets: plat, y: plat.y + 300, alpha: 0, duration: 600, ease: 'Quad.in' });
    });
  }

  updateZones(time) {
    const p = this.player;
    const cam = this.cameras.main;
    let dark = false;
    for (const z of this.zones) {
      if (z.kind === 'dark') {
        if (p.x >= z.x0 && p.x <= z.x1) dark = true;
      } else if (z.kind === 'rain') {
        if (p.x < z.x0 - cam.width * 0.6 || p.x > z.x1 || time < z.next) continue;
        z.next = time + z.everyMs;
        const lo = Math.max(z.x0, p.x + 80);
        const hi = Math.min(z.x1 + 200, cam.scrollX + cam.width);
        if (hi > lo) this.spawnShot(z.shot, Phaser.Math.Between(lo, hi), cam.scrollY - 30, -40, Phaser.Math.Between(380, 500), {});
      }
    }
    const a = this.darkness.alpha + ((dark ? 1 : 0) - this.darkness.alpha) * 0.06;
    this.darkness.setAlpha(a < 0.01 ? 0 : a).setPosition(p.x, p.y - 20);
  }

  updateEnemies(time, delta) {
    const cam = this.cameras.main;
    const p = this.player;
    const playing = this.state.status === 'playing';
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const def = ENEMIES[e.kind];
      if (!e.awake) {
        const reach = e.kind === 'chariot' ? 380 : 60;
        if (e.x < cam.scrollX + cam.width + reach) e.awake = true;
        else continue;
      }
      const onScreen = e.x < cam.scrollX + cam.width - 20 && e.x > p.x + 140;
      switch (e.kind) {
        case 'serpent':
        case 'crab':
        case 'golem':
        case 'chariot':
          e.body.setVelocityX(-def.speed);
          break;
        case 'frog':
          if (e.body.blocked.down) {
            e.body.setVelocityX(0);
            e.setTexture('frog0');
            if (time >= e.nextAct) {
              e.nextAct = time + def.hopEveryMs;
              e.body.setVelocity(-200, -620);
              e.setTexture('frog1');
            }
          }
          break;
        case 'locust':
          e.body.setVelocityX(-def.speed);
          e.phase += (delta / 1000) * 6;
          e.y = e.baseY + Math.sin(e.phase) * def.bob;
          break;
        case 'imp':
        case 'gargoyle':
          e.body.setVelocityX(-def.speed);
          e.phase += (delta / 1000) * 3;
          e.y = e.baseY + Math.sin(e.phase) * def.bob;
          if (playing && onScreen) {
            if (!e.nextAct) e.nextAct = time + 500 + Math.random() * 600;
            if (time >= e.nextAct) {
              e.nextAct = time + def.fireEveryMs;
              const shot = e.kind === 'imp' ? 'fireball' : 'letter';
              const a = Math.atan2(p.y - 10 - e.y, p.x + PLAYER.runSpeed * 0.35 - e.x);
              this.spawnShot(shot, e.x - 10, e.y + 6, Math.cos(a) * def.shotSpeed, Math.sin(a) * def.shotSpeed, { spin: 360 });
            }
          }
          break;
        case 'demon':
          if (!e.diving) {
            e.body.setVelocityX(-def.speed);
            e.phase += (delta / 1000) * 3;
            e.y = e.baseY + Math.sin(e.phase) * def.bob;
            if (playing && e.x - p.x < 480 && e.x > p.x + 120) {
              e.diving = true;
              const a = Math.atan2(p.y - 10 - e.y, p.x + PLAYER.runSpeed * 0.45 - e.x);
              e.body.setVelocity(Math.cos(a) * def.diveSpeed, Math.sin(a) * def.diveSpeed);
            }
          } else if (e.x < p.x - 160) {
            e.body.setVelocity(-200, -260);
          }
          break;
        case 'fish':
          // waits under the surface, then leaps
          if (e.y >= GROUND_Y + 50 && e.body.velocity.y >= 0) {
            e.body.setAllowGravity(false);
            e.body.setVelocity(0, 0);
            e.y = GROUND_Y + 60;
            if (playing && time >= e.nextAct && e.x < cam.scrollX + cam.width) {
              e.nextAct = time + def.leapEveryMs;
              e.body.setAllowGravity(true);
              e.body.setVelocity(-60, -Phaser.Math.Between(980, 1100));
            }
          }
          e.setRotation(e.body.velocity.y * 0.0007);
          break;
        default:
          break;
      }
      if (e.bubble) e.bubble.setPosition(e.x, e.y - 34);
      if (e.y > WORLD_HEIGHT + 200 || e.y < -400) e.destroy();
    }
  }

  // ---------------------------------------------------------------- enemy shots

  spawnShot(key, x, y, vx, vy, { gravity = 0, spin = 0, roll = false } = {}) {
    let s;
    if (key === 'letter') {
      s = this.add
        .text(x, y, GLYPHS[Math.floor(Math.random() * GLYPHS.length)], { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#d6b8ff', stroke: '#2a1a4a', strokeThickness: 6 })
        .setOrigin(0.5);
      this.physics.add.existing(s);
      this.shots.add(s);
    } else {
      s = this.shots.create(x, y, key);
    }
    if (!s) return null;
    s.setDepth(6);
    s.kind = key;
    s.roll = roll || key === 'wave';
    const body = s.body;
    body.setSize(s.width * 0.7, s.height * 0.7, true);
    body.setAllowGravity(gravity > 0);
    if (gravity > 0) body.setGravityY(gravity - PLAYER.gravity);
    body.setVelocity(vx, vy);
    if (spin) body.setAngularVelocity(spin);
    else if (key === 'spear' || key === 'arrow') s.setRotation(Math.atan2(vy, vx) - Math.PI);
    return s;
  }

  popShot(f) {
    if (!f.active) return;
    this.puff.setParticleTint(0xffffff);
    this.puff.explode(5, f.x, f.y);
    f.destroy();
  }

  updateShots(time) {
    for (const s of this.shots.getChildren()) {
      if (s.boomerang && time >= s.boomerang.turnAt) {
        s.body.setVelocityX(s.boomerang.back);
        s.boomerang = null;
      }
    }
  }

  // a warning flash at the right edge before a straight shot comes in
  edgeWarning(y, ms) {
    this.edgeWarnings.push({ y, until: this.time.now + ms });
  }

  laneBeam(y, warnMs, beamMs) {
    const now = this.time.now;
    this.beams.push({ y, from: now + warnMs, until: now + warnMs + beamMs });
  }

  updateBeams(time) {
    const g = this.beamGfx;
    g.clear();
    const cam = this.cameras.main;
    const x0 = cam.scrollX;
    const w = cam.width;
    this.edgeWarnings = this.edgeWarnings.filter((wn) => time < wn.until);
    for (const wn of this.edgeWarnings) {
      if (Math.floor(time / 80) % 2) continue;
      g.fillStyle(0xff3b30, 0.9);
      g.fillTriangle(x0 + w - 8, wn.y - 22, x0 + w - 8, wn.y + 22, x0 + w - 44, wn.y);
    }
    this.beams = this.beams.filter((b) => time < b.until);
    const p = this.player.body;
    for (const b of this.beams) {
      if (time < b.from) {
        g.fillStyle(0xff3b30, Math.floor(time / 90) % 2 ? 0.25 : 0.6);
        g.fillRect(x0, b.y - 2, w, 4);
      } else {
        const flick = 0.85 + Math.random() * 0.3;
        g.fillStyle(0x9b5cff, 0.35);
        g.fillRect(x0, b.y - 24 * flick, w, 48 * flick);
        g.fillStyle(0xd6b8ff, 1);
        g.fillRect(x0, b.y - 10, w, 20);
        g.fillStyle(0xffffff, 1);
        g.fillRect(x0, b.y - 4, w, 8);
        if (!this.ghosting && p.bottom > b.y - 18 && p.top < b.y + 18) this.hurt();
      }
    }
  }

  // ---------------------------------------------------------------- walls

  damageWall(wl, dmg) {
    if (!wl.active) return;
    wl.hp -= dmg;
    wl.setTint(0xffffff);
    this.time.delayedCall(40, () => wl.active && wl.clearTint());
    if (wl.hp <= 0) this.breakWall(wl);
  }

  breakWall(wl) {
    if (!wl.active) return;
    this.puff.setParticleTint(this.theme.stone[0]);
    for (let i = 0; i < wl.tiles; i++) this.puff.explode(10, wl.x + 32, wl.y + i * TILE + 32);
    this.cameras.main.shake(120, 0.006);
    wl.destroy();
  }

  // ---------------------------------------------------------------- bosses

  updateBossTrigger() {
    if (!this.level.boss || this.boss || this.bossDone) return;
    if (this.player.x >= this.level.bossStartX) this.startBoss();
  }

  startBoss() {
    const def = BOSSES[this.level.boss];
    const phases = def.phases;
    const max = phases.reduce((n, ph) => n + (ph.heads ? ph.heads * ph.headHp : ph.hp), 0);
    const scene = this;
    this.boss = {
      def,
      phaseIndex: -1,
      alive: true,
      offX: 0,
      offY: 0,
      busy: false,
      hp: 0,
      max,
      lost: 0,
      heads: [],
      shieldUntil: 0,
      mouth() {
        const sp = this.sprite;
        return [sp.x + this.phase.mouth[0] * sp.displayWidth, sp.y + this.phase.mouth[1] * sp.displayHeight];
      },
      openMouth(ms) {
        const sp = this.sprite;
        if (!MOUTHY.includes(this.phase.tex)) return;
        sp.setTexture(`${this.phase.tex}1`);
        scene.time.delayedCall(ms, () => sp.active && sp.setTexture(`${this.phase.tex}0`));
      },
    };
    this.nextBossPhase();
  }

  nextBossPhase() {
    const b = this.boss;
    b.phaseIndex++;
    const ph = b.def.phases[b.phaseIndex];
    if (!ph) {
      this.defeatBoss();
      return;
    }
    b.phase = ph;
    b.attackIndex = 0;
    b.offX = this.cameras.main.width * 0.6;
    b.offY = 0;
    b.t = 0;
    b.busy = false;
    const tex = this.textures.exists(`${ph.tex}0`) ? `${ph.tex}0` : ph.tex;
    const sp = this.physics.add.sprite(0, ph.y, tex).setDepth(-0.5);
    b.sprite = sp;
    if (this.anims.exists(ph.tex) && !MOUTHY.includes(ph.tex)) sp.play(ph.tex);
    sp.body.setAllowGravity(false);
    if (ph.heads) {
      sp.body.enable = false;
      b.hp = ph.heads * ph.headHp;
      b.heads = [];
      for (let i = 0; i < ph.heads; i++) {
        const h = this.physics.add.sprite(0, 0, 'beastHead0').setDepth(-0.4);
        this.bossGroup.add(h);
        h.body.setAllowGravity(false);
        h.body.setSize(56, 40).setOffset(8, 12);
        h.hp = ph.headHp;
        h.slot = i;
        b.heads.push(h);
      }
    } else {
      this.bossGroup.add(sp);
      sp.body.setAllowGravity(false);
      const [w, hh, ox, oy] = ph.hit;
      sp.body.setSize(w, hh).setOffset(ox, oy);
      b.hp = ph.hp;
      b.heads = [];
    }
    this.tweens.add({ targets: b, offX: 0, duration: 1300, ease: 'Cubic.out' });
    b.nextAttackAt = this.time.now + 1800;
    this.events.emit('boss-intro', ph.name);
  }

  updateBoss(time, delta) {
    const b = this.boss;
    if (!b || !b.sprite || !b.sprite.active) {
      this.state.bossBar = b && b.alive ? this.state.bossBar : null;
      return;
    }
    const cam = this.cameras.main;
    const ph = b.phase;
    b.t += delta;
    const sp = b.sprite;
    sp.x = cam.scrollX + cam.width * 0.8 + b.offX;
    sp.y = ph.y + Math.sin(b.t / 600) * ph.bob + b.offY;
    if (b.heads.length) {
      b.heads.forEach((h) => {
        if (!h.active) return;
        const a = Math.PI * 0.95 + (h.slot / (ph.heads - 1)) * Math.PI * 0.75;
        h.x = sp.x + 20 + Math.cos(a) * 150 + Math.sin(b.t / 300 + h.slot) * 8;
        h.y = sp.y + 10 + Math.sin(a) * 120 + Math.cos(b.t / 340 + h.slot) * 8;
      });
    }
    const shielded = time < b.shieldUntil;
    if (shielded) sp.setTint(0xffd447);
    else if (!sp.tintFlash) sp.clearTint();

    const enraged = b.hp < (ph.heads ? ph.heads * ph.headHp : ph.hp) * 0.5;
    if (this.state.status === 'playing' && b.alive && !b.busy && time >= b.nextAttackAt && b.offX < 40) {
      const attack = ph.attacks[b.attackIndex++ % ph.attacks.length];
      const dur = runAttack(this, b, attack);
      b.nextAttackAt = time + dur + ph.every * (enraged ? 0.7 : 1);
    }

    this.state.bossBar = { name: ph.name, hp: b.max - b.lost, max: b.max };

    // fallback: the arena ran out before the boss did
    if (b.alive && this.player.x > this.level.width - cam.width * 2) {
      this.floatText(sp.x, sp.y - 160, 'IT FLED. THAT COUNTS.', '#ffd447', 30);
      this.defeatBoss();
    }
  }

  damageBoss(part, dmg) {
    const b = this.boss;
    if (!b || !b.alive || !part.active) return;
    if (this.time.now < b.shieldUntil) {
      this.puff.setParticleTint(0xffd447);
      this.puff.explode(2, part.x - 60, part.y);
      return;
    }
    const before = b.hp;
    if (b.heads.length) {
      part.hp -= dmg;
      if (part.hp <= 0) {
        this.puff.setParticleTint(0xb3261e);
        this.puff.explode(30, part.x, part.y);
        this.cameras.main.shake(150, 0.008);
        part.destroy();
      }
      b.hp = b.heads.reduce((n, h) => n + (h.active ? Math.max(0, h.hp) : 0), 0);
    } else {
      b.hp = Math.max(0, b.hp - dmg);
    }
    b.lost += before - b.hp;
    const now = this.time.now;
    if (!part.flashAt || now - part.flashAt > 140) {
      part.flashAt = now;
      part.setTint(0xff9a8a);
      part.tintFlash = true;
      this.time.delayedCall(60, () => {
        if (!part.active) return;
        part.tintFlash = false;
        part.clearTint();
      });
    }
    if (b.hp <= 0) this.endBossPhase();
  }

  endBossPhase() {
    const b = this.boss;
    const sp = b.sprite;
    this.state.kills++;
    this.puff.setParticleTint(0xffe14d);
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 140, () => this.puff.explode(20, sp.x + Phaser.Math.Between(-80, 80), sp.y + Phaser.Math.Between(-80, 80)));
    }
    this.cameras.main.shake(600, 0.01);
    this.floatText(sp.x, sp.y - 150, 'SMITTEN.', '#ffe14d', 40);
    this.tweens.killTweensOf(b);
    b.busy = true;
    b.offY = 0;
    this.bossGroup.remove(sp);
    sp.body.enable = false;
    b.heads.forEach((h) => h.destroy());
    b.heads = [];
    this.tweens.add({ targets: sp, alpha: 0, duration: 900, onComplete: () => sp.destroy() });
    this.time.delayedCall(1100, () => {
      if (this.boss === b) this.nextBossPhase();
    });
  }

  defeatBoss() {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.alive = false;
    this.bossDone = true;
    if (b.sprite?.active) {
      this.bossGroup.remove(b.sprite);
      this.tweens.add({ targets: b.sprite, alpha: 0, duration: 600 });
    }
    b.heads.forEach((h) => h.destroy());
    this.shots.clear(true, true);
    this.beams = [];
    this.state.bossBar = null;
    this.events.emit('boss-defeated', b.def.title);
    // open the gate a little way ahead
    const x = this.player.x + this.cameras.main.width * 0.6;
    this.level.finishX = x;
    this.gate = this.add.image(x, GROUND_Y + 2, 'gate').setOrigin(0.5, 1).setDepth(-1).setAlpha(0);
    this.tweens.add({ targets: this.gate, alpha: 1, duration: 600 });
    // make sure there's ground under the gate
    if (!this.isSolidAt(x)) {
      const patch = this.add.tileSprite(x - 6 * TILE, GROUND_Y, 12 * TILE, TILE, this.keys.ground).setOrigin(0, 0);
      this.groundGroup.add(patch);
      this.level.ground.push({ x0: x - 6 * TILE, x1: x + 6 * TILE });
    }
  }

  // ---------------------------------------------------------------- cleanup

  cleanup() {
    const cam = this.cameras.main;
    const left = cam.scrollX - 300;
    const right = cam.scrollX + cam.width + 80;
    for (const b of this.bullets.getChildren()) {
      if (b.active && (b.x > right || b.y > WORLD_HEIGHT + 50 || b.y < -200)) b.disableBody(true, true);
    }
    for (const f of this.shots.getChildren()) {
      if (f.x < left || f.x > right + 600 || f.y > WORLD_HEIGHT + 50 || f.y < -400) f.destroy();
    }
    for (const e of this.enemies.getChildren()) if (e.x < left) e.destroy();
    for (const h of this.hazards.getChildren()) if (h.x < left) h.destroy();
  }

  // ---------------------------------------------------------------- interactions

  onTouchEnemy(p, e) {
    if (!e.active || this.state.status !== 'playing') return;
    if (this.ghosting) {
      this.killEnemy(e);
      return;
    }
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
    this.puff.setParticleTint(ENEMIES[e.kind].tint);
    this.puff.explode(16, e.x, e.y);
    e.destroy();
  }

  onPickup(p, item) {
    if (!item.active) return;
    const s = this.state;
    const now = this.time.now;
    switch (item.kind) {
      case 'halo':
        s.halos++;
        s.laser = Math.min(LASER.meterMax, s.laser + LASER.perHalo);
        this.glitter.explode(6, item.x, item.y);
        break;
      case 'loaves':
        s.loavesUntil = now + POWERUPS.loavesMs;
        this.floatText(item.x, item.y - 40, 'LOAVES & FISHES\nYOUR AMMO MULTIPLIES', '#ffe14d', 26);
        break;
      case 'wine':
        s.wineUntil = now + POWERUPS.wineMs;
        this.floatText(item.x, item.y - 40, 'WATER INTO WINE\nSHIELD UP', '#e7b6ff', 26);
        break;
      case 'ghost':
        s.ghostUntil = now + POWERUPS.ghostMs;
        this.floatText(item.x, item.y - 60, 'HOLY GHOST\nHOLD TO RISE', '#cfe8ff', 30);
        break;
      case 'walk':
        s.walkUntil = now + POWERUPS.walkMs;
        this.floatText(item.x, item.y - 40, 'WALK ON WATER', '#8fd0e0', 28);
        break;
      case 'staff':
        this.partTheSea(item.x);
        this.floatText(item.x, item.y - 40, 'THE SEA PARTS', '#8fd0e0', 30);
        break;
      case 'trumpet':
        this.soundTheTrumpet(item.x);
        this.floatText(item.x, item.y - 40, 'SOUND THE TRUMPET', '#ffd447', 30);
        break;
      default:
        break;
    }
    item.destroy();
  }

  partTheSea(fromX) {
    const range = fromX + POWERUPS.partRangeTiles * TILE;
    this.seas
      .filter((sea) => !sea.parted && sea.x1 > fromX && sea.x0 < range)
      .forEach((sea, i) => {
        sea.parted = true;
        const w = sea.x1 - sea.x0;
        // the sea bed shows through, walls of water on each side
        const bed = this.add.tileSprite(sea.x0, GROUND_Y, w, TILE, this.keys.ground).setOrigin(0, 0).setAlpha(0).setDepth(0.8);
        const mud = this.add.tileSprite(sea.x0, GROUND_Y + TILE, w, 400, this.keys.dirt).setOrigin(0, 0).setAlpha(0).setDepth(0.8);
        this.tweens.add({ targets: [bed, mud], alpha: 1, duration: 500, delay: i * 200 });
        this.tweens.add({ targets: [sea.surface, sea.deep], alpha: 0, duration: 500, delay: i * 200 });
        [sea.x0, sea.x1 - 40].forEach((x) => {
          const col = this.add.rectangle(x, GROUND_Y + 60, 40, 380, this.theme.water[1], 0.85).setOrigin(0, 1).setDepth(1).setScale(1, 0);
          this.tweens.add({ targets: col, scaleY: 1, duration: 700, delay: i * 200, ease: 'Back.out' });
        });
        // anything swimming in it is out of luck
        this.enemies.getChildren().filter((e) => e.kind === 'fish' && e.x > sea.x0 && e.x < sea.x1).forEach((e) => this.killEnemy(e, true));
      });
  }

  soundTheTrumpet(fromX) {
    const range = fromX + POWERUPS.trumpetRangeTiles * TILE;
    this.walls
      .getChildren()
      .filter((wl) => wl.x > fromX && wl.x < range)
      .sort((a, b) => a.x - b.x)
      .forEach((wl, i) => this.time.delayedCall(250 + i * 220, () => this.breakWall(wl)));
    this.cameras.main.shake(900, 0.004);
  }

  // returns true if the hit landed
  hurt() {
    const s = this.state;
    const now = this.time.now;
    if (s.status !== 'playing' || now < this.invulnUntil || DEBUG.god || this.ghosting) return false;
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
    this.time.delayedCall(160, () => !this.ghosting && this.player.clearTint());
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
    this.spray.stop();
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
    s.ghostUntil = 0;
    if (this.ghosting) this.endGhost();
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
    this.shots.clear(true, true);
    this.beams = [];

    // beam of light
    const beam = this.add.rectangle(x, 0, 140, GROUND_Y, 0xfff3b0, 0.8).setOrigin(0.5, 0).setDepth(9);
    this.tweens.add({ targets: beam, alpha: 0, scaleX: 0.2, duration: 900, onComplete: () => beam.destroy() });
    this.glitter.explode(30, x, GROUND_Y - 60);
    this.physics.resume();
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
    if (this.ghosting) this.endGhost();
    s.best = saveBest(this.levelDef.id, { timeMs: Math.round(s.timeMs), halos: s.halos, kills: s.kills });
    markCleared(this.levelDef.id);
    if (this.gate) this.glitter.explode(40, this.gate.x, GROUND_Y - 150);
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
  // Not smart, just good enough to prove each level can be finished end to end.

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

    if (this.ghosting) {
      // cruise at mid height
      if (p.y > 380) this.holdSources.add('bot');
      else this.holdSources.delete('bot');
      return;
    }

    if (b.blocked.down) {
      this.holdSources.delete('bot');
      // look further ahead when frames are long so slow devices don't run off edges
      const reach = 24 + (PLAYER.runSpeed * POWERUPS.walkSpeedBoost * this.game.loop.delta) / 1000;
      const ahead = front + reach;
      const under = this.isSolidAt(b.center.x);
      const platformUnder = !under || feet < GROUND_Y - 8;
      let edgeSoon = false;
      if (platformUnder) {
        const plats = [...L.platforms.filter((pl) => pl.style !== 'mover'), ...this.moverGroup.getChildren().map((m) => ({ x0: m.x, x1: m.x + m.width, y: m.y }))];
        const on = plats.find((pl) => b.center.x >= pl.x0 - 40 && b.center.x <= pl.x1 + 40 && Math.abs(pl.y - feet) < 24);
        edgeSoon = !!on && on.x1 - front < reach;
      } else {
        edgeSoon = !this.isSolidAt(ahead);
      }
      const thorn = this.hazards.getChildren().find((h) => h.active && h.x - front > 30 && h.x - front < 100);
      if (edgeSoon || thorn) this.botTap();
      return;
    }

    // airborne: if we'd come down over a pit, double jump, then hover
    const vy = b.velocity.y;
    const drop = GROUND_Y - feet;
    if (drop < -4) return;
    const t = (-vy + Math.sqrt(vy * vy + 2 * PLAYER.gravity * drop)) / PLAYER.gravity;
    const landX = b.center.x + b.velocity.x * t;
    const safe = this.isSolidAt(landX - 20) && this.isSolidAt(landX + 10);
    if (!safe && this.airJumps === 0 && vy > -80) {
      this.botTap();
      return;
    }
    if (!safe && vy > 0) this.holdSources.add('bot');
    else this.holdSources.delete('bot');
  }
}

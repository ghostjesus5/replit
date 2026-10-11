import Phaser from 'phaser';
import { FONT } from '../config.js';
import { CAMPAIGNS, worldOf } from '../levels/campaign.js';
import { BIBLE_STORY, BIBLE_OUTRO, GENERIC_OUTRO } from '../levels/story.js';

// Story cards between levels, laid out like a page of scripture.
// Start with this.scene.start('Story', { heading, lines, next: { scene, data } }).

const SEEN = 'bible2.seenIntro';

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN) || '[]');
  } catch {
    return [];
  }
}

let seenMemory = null; // fallback when storage is blocked

export function hasSeenIntro(key) {
  return (seenMemory || readSeen()).includes(key);
}

export function markIntroSeen(key) {
  const list = seenMemory || readSeen();
  if (!list.includes(key)) list.push(key);
  seenMemory = list;
  try {
    localStorage.setItem(SEEN, JSON.stringify(list));
  } catch {
    // storage blocked, the intro will just play again next session
  }
}

// The intro page for a level, or null when the level is not the first of its world.
export function introFor(levelId) {
  const world = worldOf(levelId);
  if (!world || world.levels[0]?.id !== levelId) return null;
  const cid = world.levels[0].campaign || 'bible';
  const lines = world.intro || (cid === 'bible' ? BIBLE_STORY[world.id] : null);
  if (!lines?.length) return null;
  const chapter = CAMPAIGNS[cid].worlds.indexOf(world) + 1;
  return { key: `${cid}:${world.id}`, heading: `THE BOOK OF ${world.name}`, chapter: `CHAPTER ${chapter}`, lines, campaign: cid };
}

export function outroFor(cid) {
  const c = CAMPAIGNS[cid] || CAMPAIGNS.bible;
  const lines = c.outro || (cid === 'bible' ? BIBLE_OUTRO : GENERIC_OUTRO);
  return { heading: 'THE END', chapter: cid === 'bible' ? 'THE BOOK OF BIBLE 2, FINAL CHAPTER' : `${c.title}, FINAL CHAPTER`, lines, campaign: cid };
}

const LINE_GAP_MS = 1700;

export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  create(data) {
    this.data_ = data || {};
    this.lines = this.data_.lines || [];
    this.nextTarget = this.data_.next || { scene: 'Map' };
    if (!this.lines.length) {
      this.finish(true);
      return;
    }
    this.shown = 0;
    this.items = [];
    this.lineTexts = [];
    this.leaving = false;

    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));

    this.input.on('pointerup', (p, over) => {
      if (!over.length) this.advance();
    });
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-SPACE', () => this.advance());
      kb.on('keydown-ENTER', () => this.advance());
      kb.on('keydown-ESC', () => this.finish());
    }

    this.cameras.main.fadeIn(300, 27, 20, 48);
    this.time.delayedCall(500, () => this.reveal());
  }

  build() {
    this.items.forEach((o) => {
      this.tweens.killTweensOf(o);
      o.destroy();
    });
    this.items = [];
    this.lineTexts = [];
    const add = (o) => (this.items.push(o), o);
    const { width, height } = this.scale;
    const cx = width / 2;
    const mormon = this.data_.campaign === 'mormon';

    add(this.add.rectangle(0, 0, width, height, mormon ? 0x14202e : 0x1b1430).setOrigin(0, 0));

    // slow heavenly rays behind the page
    const rays = add(this.add.graphics({ x: cx, y: height / 2 }));
    rays.fillStyle(0xffd447, 0.07);
    const R = Math.max(width, height);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillTriangle(0, 0, Math.cos(a - 0.12) * R, Math.sin(a - 0.12) * R, Math.cos(a + 0.12) * R, Math.sin(a + 0.12) * R);
    }
    this.tweens.add({ targets: rays, rotation: Math.PI * 2, duration: 90000, repeat: -1 });

    // the page
    const pw = Math.min(width - 40, 980);
    const ph = height - 40;
    const px = cx - pw / 2;
    const py = 20;
    add(this.add.rectangle(cx + 8, py + ph / 2 + 8, pw, ph, 0x000000, 0.35));
    add(this.add.rectangle(cx, py + ph / 2, pw, ph, 0xf1e2bd).setStrokeStyle(6, 0x7a4f2e));
    add(this.add.rectangle(cx, py + ph / 2, pw - 24, ph - 24).setStrokeStyle(2, 0xa8753f, 0.8));
    // gilt corners
    [
      [px + 12, py + 12],
      [px + pw - 12, py + 12],
      [px + 12, py + ph - 12],
      [px + pw - 12, py + ph - 12],
    ].forEach(([x, y]) => add(this.add.rectangle(x, y, 18, 18, 0xc98a3e).setStrokeStyle(2, 0x7a4f2e).setRotation(Math.PI / 4)));

    const heading = this.data_.heading || 'THE NEWEST TESTAMENT';
    const headSize = Math.max(26, Math.min(46, Math.floor(pw / (heading.length * 0.62))));
    add(
      this.add
        .text(cx, py + 46, heading, { fontFamily: FONT, fontSize: `${headSize}px`, fontStyle: 'bold', color: '#4a2c12' })
        .setOrigin(0.5),
    );
    if (this.data_.chapter) {
      add(this.add.text(cx, py + 46 + headSize * 0.5 + 18, this.data_.chapter, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#a8753f' }).setOrigin(0.5));
    }
    const ruleY = py + 46 + headSize * 0.5 + 40;
    add(this.add.rectangle(cx, ruleY, pw * 0.6, 3, 0x7a4f2e));

    // two columns would be nicer, but phones are short. one column, verse numbers in the margin.
    const marginX = px + 40;
    const textX = px + 86;
    const textW = pw - 86 - 50;
    const top = ruleY + 20;
    const bottom = py + ph - 52;
    const n = this.lines.length;
    const size = Math.max(18, Math.min(30, Math.floor((bottom - top) / (n * 1.9))));
    let y = top;
    this.lines.forEach((line, i) => {
      const verse = add(this.add.text(marginX, y + 2, String(i + 1), { fontFamily: FONT, fontSize: `${Math.round(size * 0.7)}px`, fontStyle: 'bold', color: '#b3261e' }).setOrigin(0.5, 0));
      const t = add(
        this.add.text(textX, y, line, { fontFamily: FONT, fontSize: `${size}px`, color: '#2e1c0c', wordWrap: { width: textW }, lineSpacing: 2 }).setOrigin(0, 0),
      );
      const visible = i < this.shown;
      verse.setAlpha(visible ? 1 : 0);
      t.setAlpha(visible ? 1 : 0);
      this.lineTexts.push({ verse, t, baseX: textX });
      y += t.height + size * 0.55;
    });

    // skip, top right of the page
    const skip = add(
      this.add
        .text(px + pw - 26, py + 26, 'SKIP >', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#fff6d6', backgroundColor: '#7a4f2e', padding: { x: 12, y: 6 } })
        .setOrigin(1, 0),
    );
    skip.setInteractive({ useHandCursor: true }).on('pointerup', () => this.finish());

    this.hint = add(
      this.add
        .text(cx, py + ph - 30, 'TAP TO CONTINUE', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#7a4f2e' })
        .setOrigin(0.5)
        .setAlpha(this.shown >= n ? 1 : 0.35),
    );
    this.tweens.add({ targets: this.hint, alpha: { from: this.hint.alpha, to: 0.2 }, duration: 700, yoyo: true, repeat: -1 });
  }

  // show the next verse
  reveal() {
    if (this.leaving || this.shown >= this.lines.length) return;
    const entry = this.lineTexts[this.shown];
    this.shown++;
    if (entry) {
      entry.t.setX(entry.baseX + 24);
      this.tweens.add({ targets: entry.t, alpha: 1, x: entry.baseX, duration: 420, ease: 'Cubic.out' });
      this.tweens.add({ targets: entry.verse, alpha: 1, duration: 300 });
    }
    this.game.events.emit('sfx', 'halo');
    this.timer?.remove();
    if (this.shown < this.lines.length) this.timer = this.time.delayedCall(LINE_GAP_MS, () => this.reveal());
    else if (this.hint) this.hint.setAlpha(1);
  }

  advance() {
    if (this.leaving) return;
    if (this.shown < this.lines.length) this.reveal();
    else this.finish();
  }

  finish(instant = false) {
    if (this.leaving) return;
    this.leaving = true;
    this.timer?.remove();
    const go = () => this.scene.start(this.nextTarget.scene, this.nextTarget.data);
    if (instant) {
      go();
      return;
    }
    this.cameras.main.fadeOut(250, 27, 20, 48);
    this.cameras.main.once('camerafadeoutcomplete', go);
  }
}

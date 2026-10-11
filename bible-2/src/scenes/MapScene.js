import Phaser from 'phaser';
import { FONT } from '../config.js';
import { WORLDS, ALL_LEVELS } from '../levels/campaign.js';
import { themeKeys } from '../themes.js';
import { getProgress, setUnlockAll, loadBest } from '../save.js';

// World map: six worlds, each a card with its levels. A level unlocks when the one
// before it is cleared. Playtesters can flip "unlock all" at the bottom.

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {
    this.items = [];
    this.leaving = false;
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));
    this.cameras.main.fadeIn(250, 27, 20, 48);
  }

  isUnlocked(levelId, progress) {
    if (progress.unlockAll) return true;
    const i = ALL_LEVELS.findIndex((l) => l.id === levelId);
    return i === 0 || progress.cleared.includes(ALL_LEVELS[i - 1].id);
  }

  build() {
    this.items.forEach((o) => o.destroy());
    this.items = [];
    const add = (o) => (this.items.push(o), o);
    const { width, height } = this.scale;
    const progress = getProgress();

    add(this.add.rectangle(0, 0, width, height, 0x1b1430).setOrigin(0, 0));
    add(
      this.add
        .text(width / 2, 34, 'THE NEWEST TESTAMENT', { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffd447', stroke: '#000000', strokeThickness: 4 })
        .setOrigin(0.5),
    );

    const cols = 3;
    const gapX = 18;
    const gapY = 16;
    const top = 70;
    const bottomBar = 64;
    const cardW = Math.min(400, (width - 40 - gapX * (cols - 1)) / cols);
    const cardH = (height - top - bottomBar - gapY) / 2;
    const gridW = cardW * cols + gapX * (cols - 1);
    const left = (width - gridW) / 2;

    WORLDS.forEach((world, wi) => {
      const col = wi % cols;
      const row = Math.floor(wi / cols);
      const x = left + col * (cardW + gapX);
      const y = top + row * (cardH + gapY);
      const k = themeKeys(world.id);

      // card: the world's own sky and backdrop, cropped
      add(this.add.image(x, y, k.sky).setOrigin(0, 0).setDisplaySize(cardW, cardH));
      const props = add(this.add.tileSprite(x, y + cardH - 150, cardW, 150, k.props).setOrigin(0, 0).setTileScale(0.6, 0.58));
      props.tilePositionX = wi * 90;
      add(this.add.tileSprite(x, y + cardH - 26, cardW, 26, k.ground).setOrigin(0, 0).setTileScale(0.5, 0.5));
      add(this.add.rectangle(x, y, cardW, cardH).setOrigin(0, 0).setStrokeStyle(3, 0xfff6d6, 0.85));

      const worldNo = wi + 1;
      add(
        this.add
          .text(x + 14, y + 10, `${worldNo}. ${world.name}`, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 6 })
          .setOrigin(0, 0),
      );

      const n = world.levels.length;
      const bw = Math.min(78, (cardW - 28 - (n - 1) * 10) / n);
      const bh = 56;
      world.levels.forEach((lvl, li) => {
        const bx = x + 14 + li * (bw + 10);
        const by = y + 50;
        const unlocked = this.isUnlocked(lvl.id, progress);
        const cleared = progress.cleared.includes(lvl.id);
        const isBoss = !!lvl.boss;
        const fill = !unlocked ? 0x3a3150 : isBoss ? 0xb3261e : 0xffd447;
        const btn = add(this.add.rectangle(bx, by, bw, bh, fill, unlocked ? 1 : 0.85).setOrigin(0, 0).setStrokeStyle(3, cleared ? 0xffffff : 0x1b1430));
        const label = isBoss ? 'BOSS' : String(li + 1);
        add(
          this.add
            .text(bx + bw / 2, by + bh / 2 - (cleared ? 6 : 0), unlocked ? label : 'X', {
              fontFamily: FONT,
              fontSize: isBoss ? '18px' : '28px',
              fontStyle: 'bold',
              color: !unlocked ? '#8f8470' : isBoss ? '#fff6d6' : '#1b1430',
            })
            .setOrigin(0.5),
        );
        if (cleared) {
          const best = loadBest(lvl.id);
          const t = best ? `${(best.timeMs / 1000).toFixed(1)}s` : 'DONE';
          add(this.add.text(bx + bw / 2, by + bh - 10, t, { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: isBoss ? '#fff6d6' : '#5a3a1f' }).setOrigin(0.5));
        }
        if (unlocked) {
          btn.setInteractive({ useHandCursor: true });
          btn.on('pointerup', () => this.play(lvl.id));
        }
      });

      const sub = world.levels.map((l) => l.subtitle).join(' · ');
      add(
        this.add
          .text(x + 14, y + cardH - 34, sub, { fontFamily: FONT, fontSize: '13px', color: '#fff6d6', stroke: '#1b1430', strokeThickness: 4, wordWrap: { width: cardW - 28 } })
          .setOrigin(0, 1),
      );
    });

    // bottom bar
    const by = height - bottomBar / 2;
    const back = add(this.add.text(left, by, '< TITLE', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#fff6d6', padding: { x: 10, y: 8 } }).setOrigin(0, 0.5));
    back.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Title'));

    const toggle = add(
      this.add
        .text(left + gridW, by, progress.unlockAll ? '[X] ALL LEVELS UNLOCKED (PLAYTEST)' : '[ ] UNLOCK ALL LEVELS (PLAYTEST)', {
          fontFamily: FONT,
          fontSize: '18px',
          fontStyle: 'bold',
          color: progress.unlockAll ? '#ffd447' : '#cfc2a4',
          padding: { x: 10, y: 8 },
        })
        .setOrigin(1, 0.5),
    );
    toggle.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      setUnlockAll(!getProgress().unlockAll);
      this.build();
    });
  }

  play(levelId) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(200, 27, 20, 48);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { levelId }));
  }
}

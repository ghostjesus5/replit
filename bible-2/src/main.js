import Phaser from 'phaser';
import { PLAYER, DEBUG, VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import MapScene from './scenes/MapScene.js';

const game = new Phaser.Game({
  // ?headless runs the game with no drawing at all, for fast automated level tests
  type: new URLSearchParams(window.location.search).has('headless') ? Phaser.HEADLESS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1430',
  scale: {
    // EXPAND keeps the height fixed and widens the view on long phones,
    // so you see more of what's coming instead of black bars.
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: PLAYER.gravity }, debug: DEBUG.physics },
  },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, MapScene, GameScene, UIScene],
});

// handy for poking at things from the browser console during playtests
window.__game = game;

import Phaser from 'phaser';
import { createTextures } from '../textures.js';
import { createThemeTextures } from '../themes.js';
import { createArt } from '../art.js';
import { DEBUG } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createTextures(this);
    createThemeTextures(this);
    createArt(this);
    // ?autoplay skips the title so test runs start immediately
    // ?level=egypt-2 jumps straight into a level (handy with ?autoplay for testing)
    const levelId = new URLSearchParams(window.location.search).get('level');
    if (DEBUG.autoplay || levelId) {
      this.scene.start('Game', { levelId });
    } else {
      this.scene.start('Title');
    }
  }
}

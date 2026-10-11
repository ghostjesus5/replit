import Phaser from 'phaser';
import { createTextures } from '../textures.js';
import { DEBUG } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createTextures(this);
    // ?autoplay skips the title so test runs start immediately
    if (DEBUG.autoplay) {
      this.scene.start('Game');
    } else {
      this.scene.start('Title');
    }
  }
}

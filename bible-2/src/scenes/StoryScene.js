import Phaser from 'phaser';

// Story cards between levels. Start with this.scene.start('Story', { lines, next: { scene, data } }).
export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  create(data) {
    const next = data?.next || { scene: 'Map' };
    this.scene.start(next.scene, next.data);
  }
}

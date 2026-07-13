import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Renders basic color blocks as textures so the game is visual without external assets
    const makeColorBlock = (key: string, color: number) => {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture(key, 32, 32);
    };

    makeColorBlock('wall', 0x1f2833);
    makeColorBlock('floor', 0x0b0c10);
    makeColorBlock('player', 0x66fcf1);
    makeColorBlock('ghost', 0x45a29e);
    makeColorBlock('marker', 0xff0055);
    makeColorBlock('leader', 0xffd700);

    // Text loading indicator
    const txt = this.add.text(400, 300, 'Loading Daily Descent...', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#66fcf1'
    }).setOrigin(0.5);
  }

  create() {
    this.scene.start('DungeonScene');
  }
}

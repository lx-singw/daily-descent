import Phaser from 'phaser';
import { BootScene } from './game/BootScene.js';
import { DungeonScene } from './game/DungeonScene.js';
import { ResultScene } from './game/ResultScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#0b0c10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, DungeonScene, ResultScene]
};

new Phaser.Game(config);

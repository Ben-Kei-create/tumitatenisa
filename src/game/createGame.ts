import Phaser from 'phaser';
import { GameSpec } from '../spec/loadSpec';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

export function createGame(spec: GameSpec, containerId: string = 'app'): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: spec.screen.width,
    height: spec.screen.height,
    parent: containerId,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: spec.physics.gravityY },
        debug: false
      }
    },
    scene: [BootScene, TitleScene, GameScene, UIScene]
  };

  const game = new Phaser.Game(config);

  // BootScene に spec を渡す
  game.scene.start('BootScene', { spec });

  return game;
}


import Phaser from 'phaser';
import { GameSpec } from '../spec/loadSpec';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene'; // ★追加

export function createGame(spec: GameSpec, containerId: string = 'app'): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    // ...
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
    // ★GameOverScene をリストに追加
    scene: [BootScene, TitleScene, GameScene, UIScene, GameOverScene]
  };

  const game = new Phaser.Game(config);

  // BootScene に spec を渡す
  game.scene.start('BootScene', { spec });

  return game;
}


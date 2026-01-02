import Phaser from 'phaser';
import { GameSpec } from '../spec/loadSpec';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene'; // ★追加

export function createGame(spec: GameSpec, containerId: string = 'app'): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: spec.screen.width,
    height: spec.screen.height,
    parent: containerId,
    scale: {
      mode: Phaser.Scale.FIT, // 親コンテナの範囲内で最大化（アスペクト比維持）
      autoCenter: Phaser.Scale.CENTER_BOTH // コンテナ内で中央寄せ
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: spec.physics.gravityY },
        debug: false
      }
    },
    scene: [BootScene, TitleScene, GameScene, UIScene, GameOverScene]
  };

  const game = new Phaser.Game(config);

  // BootScene に spec を渡す
  game.scene.start('BootScene', { spec });

  return game;
}


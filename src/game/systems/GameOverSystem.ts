import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother } from '../objects/Brother';

export class GameOverSystem {
  private spec: GameSpec;
  private gameState: GameState;
  private scene: Phaser.Scene;
  private brotherGroup: Phaser.Physics.Arcade.Group;
  private gameOverStartTime: number = 0;

  constructor(scene: Phaser.Scene, spec: GameSpec, gameState: GameState, brotherGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.spec = spec;
    this.gameState = gameState;
    this.brotherGroup = brotherGroup;
  }

  update(time: number): void {
    // 台座外・画面下端チェックはGameScene.checkBaseBounds()で処理
    // ここでは高さチェックのみ（必要に応じて）
    if (this.gameState.gameOver) return;

    // Use brotherGroup to get all brothers
    const brothers = this.brotherGroup.children.entries as Brother[];

    // lineY を超える（yが小さい）高さに兄が存在するかチェック
    const hasBrotherAboveLine = brothers.some(
      (brother) =>
        brother !== this.gameState.currentBrother &&
        brother.y <= this.spec.gameOver.lineY
    );

    if (hasBrotherAboveLine) {
      if (this.gameOverStartTime === 0) {
        this.gameOverStartTime = time;
      }

      const elapsed = (time - this.gameOverStartTime) / 1000;
      if (elapsed >= this.spec.gameOver.lingerSec) {
        this.triggerGameOver('height_limit');
      }
    } else {
      this.gameOverStartTime = 0;
    }
  }

  triggerGameOver(reason?: string): void {
    if (this.gameState.gameOver) return;

    this.gameState.gameOver = true;
    this.scene.physics.pause();

    // Emit game-over event with reason
    this.scene.events.emit('game-over', reason);
  }
}



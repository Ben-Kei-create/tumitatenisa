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
    if (this.gameState.gameOver) return;

    // Use brotherGroup to get all brothers
    const brothers = this.brotherGroup.children.entries as Brother[];

    // lineY を超える（yが小さい）高さに兄が存在するかチェック
    // Simplest: y < lineY.
    // If user is holding one above line, it shouldn't trigger.
    // So ignore currentBrother.
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
        this.triggerGameOver();
      }
    } else {
      this.gameOverStartTime = 0;
    }
  }

  private triggerGameOver(): void {
    this.gameState.gameOver = true;
    this.scene.physics.pause();

    // Launch UI Scene for Game Over if not doing it elsewhere?
    // Or just set state and let GameScene/UIScene handle it.
    // For now, let's just let it be state.
    // GameScene listens to this state in update? 
    // Actually we should launch UIScene overlay here or Emit event.
    this.scene.events.emit('game-over');
  }
}



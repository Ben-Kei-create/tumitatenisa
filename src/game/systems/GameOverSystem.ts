import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother } from '../objects/Brother';

export class GameOverSystem {
  private spec: GameSpec;
  private gameState: GameState;
  private scene: Phaser.Scene;
  private brotherGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, spec: GameSpec, gameState: GameState, brotherGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.spec = spec;
    this.gameState = gameState;
    this.brotherGroup = brotherGroup;
  }

  update(time: number): void {
    if (this.gameState.gameOver) return;

    const { height } = this.spec.screen;
    const brothers = this.brotherGroup.children.entries as Brother[];

    for (const brother of brothers) {
      // 操作中(HOLDING)のブロックは除外
      if (brother === this.gameState.currentBrother) continue;

      // 画面下端判定
      // LOCKEDかDROPPINGかに関わらず、画面外（下）に落ちたらアウト
      // 少し余裕を持たせる (+50px)
      const isBelowScreen = brother.y > height + 50;

      if (isBelowScreen) {
        // 落下死
        this.triggerGameOver('fallen_out');
        return;
      }
    }
  }

  triggerGameOver(reason?: string): void {
    if (this.gameState.gameOver) return;

    console.log(`Game Over triggered: ${reason}`);
    this.gameState.gameOver = true;
    // 物理演算を一時停止（完全に止めないと裏で動く）
    this.scene.physics.pause();

    // ★修正: イベントに必要な情報を乗せる
    this.scene.events.emit('game-over', {
      reason,
      score: this.gameState.score
    });
  }
}

import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother, BrotherState } from '../objects/Brother';
import { BrotherFactory } from '../factories/BrotherFactory';

export class MergeSystem {
  private spec: GameSpec;
  private scene: Phaser.Scene;
  private gameState: GameState;
  private factory: BrotherFactory;

  constructor(scene: Phaser.Scene, spec: GameSpec, gameState: GameState, factory: BrotherFactory) {
    this.scene = scene;
    this.spec = spec;
    this.gameState = gameState;
    this.factory = factory;
  }

  mergeBrothers(a: Brother, b: Brother): void {
    const type = a.getType();

    // ★修正: 進化ロジック (brothersOrderのインデックスを進める)
    const order = this.spec.brothersOrder;
    const currentIndex = order.indexOf(type);

    // 定義にない、または最大ランク(最後)の場合は合体しない
    if (currentIndex === -1 || currentIndex >= order.length - 1) {
      return;
    }

    const nextType = order[currentIndex + 1];
    const brotherSpec = this.spec.brothers[nextType];

    // Lock
    a.mergeLock = true;
    b.mergeLock = true;

    // Midpoint
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;

    // Destroy old
    a.destroy();
    b.destroy();

    // Create New
    const newBrother = this.factory.createBrother(x, y, nextType);

    // Animation & Physics
    newBrother.setScale(0);
    this.scene.tweens.add({
      targets: newBrother,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.out'
    });

    newBrother.setBrotherState(BrotherState.DROPPING);
    newBrother.y -= 5;

    // 少し跳ねさせる
    const body = newBrother.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Phaser.Math.Between(-50, 50), -150);

    // 画面シェイク (サイズが大きいほど揺れる)
    // A=0, B=1 ... 係数で揺れ幅調整
    const shakeIntensity = 0.002 + (currentIndex * 0.002);
    this.scene.cameras.main.shake(100, shakeIntensity);

    // Event Emit
    this.scene.events.emit('merge-success', {
      x: x,
      y: y,
      type: type, // パーティクル用に合体前の色を渡す
      score: brotherSpec.score
    });
  }
}

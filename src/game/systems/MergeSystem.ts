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
    const nextType = this.spec.merge[type];

    if (!nextType) return;

    // Lock immediately
    a.mergeLock = true;
    b.mergeLock = true;

    // Calculate midpoint
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;

    // Remove old ones
    a.destroy();
    b.destroy();

    // Create new one
    // 仕様書: 新Brotherは DROPPING 状態
    const newBrother = this.factory.createBrother(x, y, nextType);

    // 1. ポップアップ演出 (スケール0からボヨンと出現)
    newBrother.setScale(0); // 最初は極小

    this.scene.tweens.add({
      targets: newBrother,
      scaleX: 1, // 元のサイズ(1倍)に戻す
      scaleY: 1,
      duration: 300,
      ease: 'Back.out', // ボヨンと弾むイージング
    });

    // 2. 物理挙動 (少し跳ねさせる)
    newBrother.setBrotherState(BrotherState.DROPPING);
    newBrother.y -= 5; // 少し浮かせる

    const body = newBrother.body as Phaser.Physics.Arcade.Body;
    // ランダムな方向に少し跳ねることで、詰まりを解消する効果も
    body.setVelocity(Phaser.Math.Between(-50, 50), -150);

    // Score
    const mergeScores: Record<string, number> = {
      'A': 50,
      'B': 150,
      'C': 300
    };
    const points = mergeScores[type] || 50;

    // GameScene経由でイベント発火
    this.scene.events.emit('merge-success', {
      x: x,
      y: y,
      type: type,   // 合体前のタイプ（色用）
      score: points
    });
  }
}

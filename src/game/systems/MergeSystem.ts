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

    // ポップアップ効果（少し浮かせて重力を効かせる）
    newBrother.y -= 10;
    newBrother.setBrotherState(BrotherState.DROPPING);

    // 物理的な勢いを少しつける（真上に跳ねる）
    const body = newBrother.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-150);

    // Score
    const mergeScores: Record<string, number> = {
      'A': 50,
      'B': 150,
      'C': 300
    };
    const points = mergeScores[type] || 50;
    this.gameState.score += points;
  }
}

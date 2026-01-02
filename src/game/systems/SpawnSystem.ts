import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother, BrotherState } from '../objects/Brother';
import { BrotherFactory } from '../factories/BrotherFactory';

export class SpawnSystem {
  private spec: GameSpec;
  private scene: Phaser.Scene;
  private gameState: GameState;
  private factory: BrotherFactory;
  private nextType: string | null = null;

  constructor(scene: Phaser.Scene, spec: GameSpec, gameState: GameState, factory: BrotherFactory) {
    this.scene = scene;
    this.spec = spec;
    this.gameState = gameState;
    this.factory = factory;
    this.generateNextType();
  }

  peekNextType(): string {
    if (!this.nextType) {
      this.generateNextType();
    }
    return this.nextType!;
  }

  consumeNextType(): string {
    if (!this.nextType) {
      this.generateNextType();
    }
    const type = this.nextType!;
    this.generateNextType();
    return type;
  }

  private generateNextType(): void {
    // ★変更: 出現するのは序盤の小さいものだけ（例：最初の3つ）
    // brothersOrder: ["A", "B", "C", "D", "E", "F"] -> "A", "B", "C" から抽選
    const spawnableTypes = this.spec.brothersOrder.slice(0, 3);
    this.nextType = Phaser.Utils.Array.GetRandom(spawnableTypes);
  }

  spawnNext(): Brother | null {
    if (this.gameState.currentBrother || this.gameState.gameOver) {
      return null;
    }

    const spawnX = this.spec.screen.width / 2;
    const spawnY = this.spec.spawn.y;
    const type = this.consumeNextType();

    const brother = this.factory.createBrother(spawnX, spawnY, type);

    // 仕様書準拠: 初期状態は HOLDING
    brother.setBrotherState(BrotherState.HOLDING);

    this.gameState.currentBrother = brother;
    return brother;
  }
}

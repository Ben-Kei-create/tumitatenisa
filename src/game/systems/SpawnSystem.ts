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
    // Initialize next type
    this.generateNextType();
  }

  /**
   * Peek at the next type without consuming it (for UI display)
   */
  peekNextType(): string {
    if (!this.nextType) {
      this.generateNextType();
    }
    return this.nextType!;
  }

  /**
   * Consume the next type and generate a new one
   */
  consumeNextType(): string {
    if (!this.nextType) {
      this.generateNextType();
    }
    const type = this.nextType!;
    this.generateNextType();
    return type;
  }

  /**
   * Generate a random next type
   */
  private generateNextType(): void {
    this.nextType = Phaser.Utils.Array.GetRandom(this.spec.brothers);
  }

  spawnNext(): Brother | null {
    console.log('[SpawnSystem] spawnNext called. Current:', !!this.gameState.currentBrother, 'GameOver:', this.gameState.gameOver);
    if (this.gameState.currentBrother) {
      console.log('[SpawnSystem] spawnNext aborted: currentBrother exists');
      return null;
    }

    if (this.gameState.gameOver) {
      console.log('[SpawnSystem] spawnNext aborted: gameOver');
      return null;
    }

    // Consume next type
    const type = this.consumeNextType();

    // Spawn at center X, spawn.y
    const spawnX = this.spec.screen.width / 2;
    const spawnY = this.spec.spawn.y;

    console.log('[SpawnSystem] Creating brother of type:', type, 'at', spawnX, spawnY);
    const brother = this.factory.createBrother(
      spawnX,
      spawnY,
      type
    );

    // Initial State: AIMING
    brother.setBrotherState(BrotherState.AIMING);

    this.gameState.currentBrother = brother;
    console.log('[SpawnSystem] Spawn complete. Brother:', brother.brotherData.id);
    return brother;
  }
}


import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother, BrotherState } from '../objects/Brother';
import { BrotherFactory } from '../factories/BrotherFactory';

export class MergeSystem {
  private spec: GameSpec;
  private scene: Phaser.Scene;
  private gameState: GameState;
  private factory: BrotherFactory; // Factory injection
  private mergedThisFrame: Set<string> = new Set();

  constructor(scene: Phaser.Scene, spec: GameSpec, gameState: GameState, factory: BrotherFactory) {
    this.scene = scene;
    this.spec = spec;
    this.gameState = gameState;
    this.factory = factory;
  }

  update(): void {
    if (!this.scene.physics || !this.scene.physics.world) {
      return;
    }

    this.mergedThisFrame.clear();

    // Filter valid brothers (not dropping, not aiming)
    // Actually, only LOCKED (landed) brothers should merge?
    // Or DROPPING ones can merge too?
    // Suika game: dropping ones definitely merge.
    const brothers = this.scene.children.list.filter(
      (child) => child instanceof Brother && !child.mergeLock
    ) as Brother[];

    // Naive O(N^2) check is fine for small N (usually < 50 brothers)
    for (let i = 0; i < brothers.length; i++) {
      const a = brothers[i];
      if (a.mergeLock) continue;

      for (let j = i + 1; j < brothers.length; j++) {
        const b = brothers[j];
        if (b.mergeLock) continue;

        // Optimization: Type check first
        if (a.getType() !== b.getType()) continue;

        // Physics Overlap Check
        // Note: Arcade Physics overlap uses bounding box.
        // For circle-like shapes we might want distance check, but boxes are squares here.
        if (this.scene.physics.overlap(a, b)) {
          this.mergeBrothers(a, b);
        }
      }
    }
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
    const y = (a.y + b.y) / 2; // Midpoint is better than min(y) for visual pop

    // Remove old ones
    a.destroy();
    b.destroy();

    // Create new one using Factory
    // IMPORTANT: New brother should be in DROPPING state but physically active?
    // Or "LOCKED"state but effectively falling?
    // Usually newly merged items pop up a bit and fall.
    const newBrother = this.factory.createBrother(x, y, nextType);

    newBrother.setBrotherState(BrotherState.DROPPING); // Enable gravity

    // Pop effect (move up slightly to avoid immediate collision with things below?)
    // And to look like it popped out.
    newBrother.y -= 5;

    // Score: 合体報酬（A+A=50, B+B=150, C+C=300）
    const mergeScores: Record<string, number> = {
      'A': 50,   // A+A → B
      'B': 150,  // B+B → C
      'C': 300   // C+C → A（ループボーナス）
    };
    const points = mergeScores[type] || 50;
    this.gameState.score += points;

    // TODO: Create Floating Text Effect for Score
  }
}


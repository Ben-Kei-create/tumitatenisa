import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother } from '../objects/Brother';

export class ScoreSystem {
  private spec: GameSpec;
  private gameState: GameState;
  private scene: Phaser.Scene;
  private brotherGroup: Phaser.Physics.Arcade.Group;
  private lastHeightCheck: number = 0;

  constructor(scene: Phaser.Scene, spec: GameSpec, gameState: GameState, brotherGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.spec = spec;
    this.gameState = gameState;
    this.brotherGroup = brotherGroup;
  }

  update(time: number): void {
    if (this.gameState.gameOver) return;

    if (time - this.lastHeightCheck >= 1000) {
      this.updateHeightScore();
      this.lastHeightCheck = time;
    }
  }

  private updateHeightScore(): void {
    // Use brotherGroup to get all brothers
    const brothers = this.brotherGroup.children.entries as Brother[];

    const groundY = this.spec.stage.groundY;

    if (brothers.length === 0) {
      this.gameState.highestY = groundY;
      return;
    }

    let highestY = groundY;
    for (const brother of brothers) {
      // Use Top of the brother
      // Brother origin is center (default in factories/containers usually?)
      // Container origin 0.5? Let's assume center.
      // Brother height is size.
      // We need bounds.

      // Safe bet: brother.y - brother.displayHeight/2
      // But brother is Container, displayHeight might be 0 if not set? 
      // I set setSize in Brother.ts.
      const topY = brother.y - (brother.height / 2);
      if (topY < highestY) {
        highestY = topY;
      }
    }

    this.gameState.highestY = highestY;

    // Calc height from ground
    const heightPx = groundY - highestY;
    if (heightPx <= 0) return;

    // Optional: Clamp height if needed (e.g. only count up to heightClampY?)
    // Spec says "heightClampY: 1100". Maybe if highestY < 1100 ?
    // "heightPerSec" implies points per second based on height.

    // Logic: 1 point for every X pixels?
    // Spec: "heightPerSec" = 5. Maybe 5 points * (pixels / 100)?
    // Let's implement simple: 5 points * (height / 100px)

    const heightScore = Math.floor((heightPx / 100) * this.spec.score.heightPerSec);
    if (heightScore > 0) {
      this.gameState.score += heightScore;
    }
  }
}



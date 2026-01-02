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
    // スコアは行動報酬型のみ：update()での加点は削除
    // 着地・合体時のみ加点される
  }
}



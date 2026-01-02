import { GameSpec } from '../../spec/loadSpec';

export class BootScene extends Phaser.Scene {
  private spec!: GameSpec;

  constructor() {
    super({ key: 'BootScene' });
  }

  init(data: { spec: GameSpec }) {
    this.spec = data.spec;
  }

  preload() {
    // 画像があれば読み込む（無い場合は色付き矩形で代替）
    // Note: 画像が存在しない場合でもエラーは出るが、Brother.ts で textures.exists() でチェックしてフォールバック処理がある
    for (const type of this.spec.brothers) {
      const imagePath = `assets/brothers/${type}.png`;
      this.load.image(`brother_${type}`, imagePath);
    }
  }

  create() {
    this.scene.start('GameScene', { spec: this.spec });
  }
}


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
    // 画像読み込み：brothersOrder（配列）を使用
    // ※画像ファイルがない場合、コンソールに404エラーが出ますが、
    // ゲーム側で自動生成（Brother.ts）するため動作に影響はありません。
    if (this.spec.brothersOrder) {
      for (const type of this.spec.brothersOrder) {
        const imagePath = `assets/brothers/${type}.png`;
        this.load.image(`brother_${type}`, imagePath);
      }
    }

    // パーティクル用テクスチャ生成
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
  }

  create() {
    this.scene.start('TitleScene', { spec: this.spec });
  }
}

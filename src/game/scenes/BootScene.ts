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
    // 画像ロード: brothersOrderがあればそれを使う、なければObject.keys、それもなければArrayとみなす
    let types: string[] = [];

    if (this.spec.brothersOrder && Array.isArray(this.spec.brothersOrder)) {
      types = this.spec.brothersOrder;
    } else if (this.spec.brothers) {
      if (Array.isArray(this.spec.brothers)) {
        types = this.spec.brothers;
      } else {
        types = Object.keys(this.spec.brothers);
      }
    }

    for (const type of types) {
      const imagePath = `assets/brothers/${type}.png`;
      this.load.image(`brother_${type}`, imagePath);
    }

    // パーティクル用テクスチャ
    // ★修正: add: false を削除
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy(); // 生成後に破棄
  }

  create() {
    this.scene.start('GameScene', { spec: this.spec });
  }
}

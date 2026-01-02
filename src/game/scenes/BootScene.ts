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
    // Generate placeholder textures programmatically
    // Avoids 404 errors for missing assets
    const size = 56; // Default size, or read from spec if possible (but spec not fully loaded yet? No, it is passed in init)

    for (const type of this.spec.brothers) {
      if (this.textures.exists(`brother_${type}`)) continue;

      const graphics = this.make.graphics({ x: 0, y: 0 });

      const colors: Record<string, number> = {
        'A': 0xB8D8FF,
        'B': 0xBFF0D2,
        'C': 0xFFD7B5,
        'default': 0xeeeeee
      };
      const color = colors[type] || colors['default'];

      graphics.fillStyle(color, 1);
      // Draw square
      graphics.fillRect(0, 0, size, size);

      // Draw border
      graphics.lineStyle(2, 0x000000, 0.1);
      graphics.strokeRect(0, 0, size, size);

      graphics.generateTexture(`brother_${type}`, size, size);
      graphics.destroy();
    }

    // ★追加: パーティクル用の白い丸（色を変えて使い回す）
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4); // 半径4pxの円
    graphics.generateTexture('particle', 8, 8);
  }

  create() {
    this.scene.start('GameScene', { spec: this.spec });
  }
}


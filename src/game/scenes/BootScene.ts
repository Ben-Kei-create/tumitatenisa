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

    // Generate textures for all defined brothers
    for (const type of this.spec.brothersOrder) {
      if (this.textures.exists(`brother_${type}`)) continue;

      const brotherSpec = this.spec.brothers[type];
      const size = brotherSpec.size;
      const graphics = this.make.graphics({ x: 0, y: 0 });

      // Convert hex string to number
      const color = parseInt(brotherSpec.color.replace('#', ''), 16);

      graphics.fillStyle(color, 1);
      // Draw square (legacy placeholder, actual game uses circles but this is just fallback-fallback or init)
      // Actually Brother.ts creates its own circles.
      // But BootScene creates `brother_${type}` which Brother constructor uses as initial texture?
      // Brother.ts: super(..., `brother_${type}`) -> if not exists, createFallbackTexture -> setTexture(`brother_bg_${type}`)
      // So this BootScene generation might be redundant or overriding?
      // Brother.ts checks `if (!scene.textures.exists(\`brother_${type}\`))` before creating fallback.
      // So if BootScene creates it, Brother uses it. 
      // Let's make BootScene create the nice circles too, or just squares as placeholders.
      // For consistency with new spec, let's just make simple placeholders using the correct size/color.

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
    // ★変更: いきなりゲーム開始せず、タイトルへ飛ばす
    this.scene.start('TitleScene', { spec: this.spec });
  }
}


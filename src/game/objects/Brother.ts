import { GameSpec } from '../../spec/loadSpec';
import { BrotherData } from '../types';

export enum BrotherState {
  HOLDING = 'HOLDING',   // 上で待機・左右操作中
  DROPPING = 'DROPPING', // 落下中
  LOCKED = 'LOCKED',     // 着地済み（パイルの一部）
}

export class Brother extends Phaser.Physics.Arcade.Sprite {
  public brotherData: BrotherData;
  public state: BrotherState = BrotherState.HOLDING;
  public mergeLock: boolean = false;

  private spec: GameSpec;
  private label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: string,
    spec: GameSpec
  ) {
    super(scene, x, y, `brother_${type}`);
    this.spec = spec;

    // ★変更: specからこのタイプの情報を取得
    const brotherSpec = this.spec.brothers[type];
    const size = brotherSpec.size; // 個別のサイズ

    this.brotherData = {
      id: Phaser.Utils.String.UUID(),
      type,
      merged: false
    };

    this.setDisplaySize(size, size);

    // テクスチャ生成（色もspecから取得）
    if (!scene.textures.exists(`brother_${type}`)) {
      this.createFallbackTexture(scene, type, size, brotherSpec.color);
      this.setTexture(`brother_bg_${type}`);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setupPhysicsBody(size);

    // テキストラベル
    this.label = scene.add.text(x, y, type, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.floor(size * 0.5)}px`, // 文字サイズも相対的に
      color: '#111111',
      fontStyle: 'bold'
    });
    this.label.setOrigin(0.5);
    this.label.setDepth(this.depth + 1);
  }

  private createFallbackTexture(scene: Phaser.Scene, type: string, size: number, colorHex: string) {
    const key = `brother_bg_${type}`;
    if (scene.textures.exists(key)) return;

    const radius = size / 2;
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // 文字列の色コード(#xxxxxx)を数値に変換
    const color = parseInt(colorHex.replace('#', ''), 16);

    // 本体
    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.lineStyle(2, 0x000000, 0.1);
    graphics.strokeCircle(radius, radius, radius);

    // おめめ (サイズに合わせて調整)
    graphics.fillStyle(0x000000, 0.6);
    const eyeSize = size * 0.1;
    const eyeY = radius - (size * 0.1);
    const eyeXOffset = size * 0.2;
    graphics.fillCircle(radius - eyeXOffset, eyeY, eyeSize);
    graphics.fillCircle(radius + eyeXOffset, eyeY, eyeSize);

    // テクスチャ生成（サイズは直径）
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private setupPhysicsBody(size: number) {
    if (!this.body) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 円形の当たり判定を設定
    const radius = size / 2;
    body.setCircle(radius);

    // setCircleをするとoffsetがずれることがあるため、必要なら調整
    // generateTextureで作った画像は左上が(0,0)なので、setCircle(radius)で中心が合うはず

    body.setCollideWorldBounds(false); // 画面外落下を許可
    // ★修正: 反発を抑えて、少し重さを感じるように
    // 旧: body.setBounce(this.spec.physics.restitution);
    body.setBounce(0.1);

    // ★修正: 摩擦・空気抵抗の設定（spec値より優先して調整）
    body.setFriction(0.5);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (this.label) {
      this.label.setPosition(this.x, this.y);
    }
  }

  destroy(fromScene?: boolean) {
    if (this.label) {
      this.label.destroy();
    }
    super.destroy(fromScene);
  }

  setBrotherState(newState: BrotherState) {
    this.state = newState;
    if (!this.body) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (newState) {
      case BrotherState.HOLDING:
        body.setAllowGravity(false);
        body.setVelocity(0, 0);
        body.setAngularVelocity(0);
        body.setImmovable(false);
        break;

      case BrotherState.DROPPING:
        body.setAllowGravity(true);
        if (this.spec.physics.allowRotation) {
          body.setAngularVelocity(Phaser.Math.Between(-10, 10));
        }
        body.setImmovable(false);
        // ★修正: 落下中も少し空気抵抗を入れて制御しやすくする
        body.setDrag(100, 100);
        body.setAngularDrag(100);
        break;

      case BrotherState.LOCKED:
        body.setAllowGravity(true);
        body.setImmovable(false);

        // ★修正: 転がりすぎ防止のため、強力な抵抗をかける
        body.setDrag(300, 300);
        body.setAngularDrag(300);
        body.setBounce(0.1);
        break;
    }
  }

  getType(): string {
    return this.brotherData.type;
  }
}

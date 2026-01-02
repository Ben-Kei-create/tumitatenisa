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

    this.brotherData = {
      id: Phaser.Utils.String.UUID(),
      type,
      merged: false
    };

    const size = spec.brother.size;
    this.setDisplaySize(size, size);

    // テクスチャ生成（円形に変更）
    if (!scene.textures.exists(`brother_${type}`)) {
      this.createFallbackTexture(scene, type, size);
      this.setTexture(`brother_bg_${type}`);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setupPhysicsBody(size);

    this.label = scene.add.text(x, y, type, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: spec.brother.fontSize,
      color: '#111111',
      fontStyle: 'bold'
    });
    this.label.setOrigin(0.5);
    this.label.setDepth(this.depth + 1);
  }

  /**
   * 円形のテクスチャを生成
   */
  private createFallbackTexture(scene: Phaser.Scene, type: string, size: number) {
    const key = `brother_bg_${type}`;
    if (scene.textures.exists(key)) return;

    const radius = size / 2;
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    const colors: Record<string, number> = {
      'A': 0xB8D8FF,
      'B': 0xBFF0D2,
      'C': 0xFFD7B5
    };
    const color = colors[type] || 0xeeeeee;

    graphics.fillStyle(color, 1);
    // 円を描画
    graphics.fillCircle(radius, radius, radius);
    graphics.lineStyle(2, 0x000000, 0.1);
    graphics.strokeCircle(radius, radius, radius);

    // 2. おめめ（シンプルに黒い点）を描く ★追加
    graphics.fillStyle(0x000000, 0.6); // 少し薄い黒
    const eyeSize = size * 0.1; // 本体の10%くらいの大きさ
    const eyeY = radius - (size * 0.1); // 中心より少し上
    const eyeXOffset = size * 0.2; // 中心から左右に離す距離

    // 左目
    graphics.fillCircle(radius - eyeXOffset, eyeY, eyeSize);
    // 右目
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
    body.setBounce(this.spec.physics.restitution);
    body.setFriction(this.spec.physics.friction);
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
        // 空気抵抗などは少なめに
        body.setDrag(0);
        body.setAngularDrag(0);
        break;

      case BrotherState.LOCKED:
        // 物理挙動を維持する（転がり落ちるようにする）
        body.setAllowGravity(true);
        body.setImmovable(false); // ★ここをFalseに変更（動けるようにする）

        // ただし、簡単には転がらないように抵抗(Drag)を強める（安定性とのバランス）
        body.setDrag(500, 500); // 平地では止まるくらい強く
        body.setAngularDrag(500); // 勝手に回転し続けないように

        // 跳ね返りはなくす
        body.setBounce(0);
        break;
    }
  }

  getType(): string {
    return this.brotherData.type;
  }
}

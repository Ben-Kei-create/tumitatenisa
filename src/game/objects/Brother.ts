import { GameSpec } from '../../spec/loadSpec';
import { BrotherData } from '../types';

export enum BrotherState {
  AIMING = 'AIMING',
  DROPPING = 'DROPPING',
  LOCKED = 'LOCKED',
}

// Ensure Brother extends Sprite, NOT Container
export class Brother extends Phaser.Physics.Arcade.Sprite {
  public brotherData: BrotherData;
  public state: BrotherState = BrotherState.AIMING;
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

    let size = 40;
    let color = "#cccccc";

    if (this.spec.brothers && !Array.isArray(this.spec.brothers) && (this.spec.brothers as any)[type]) {
      const bSpec = (this.spec.brothers as any)[type];
      size = bSpec.size || 40;
      color = bSpec.color || "#cccccc";
    }

    this.brotherData = {
      id: Phaser.Utils.String.UUID(),
      type,
      merged: false
    };

    if (isNaN(size) || size <= 0) size = 40;
    this.setDisplaySize(size, size);

    // Explicit texture check and fallback
    if (!scene.textures.exists(`brother_${type}`)) {
      this.createFallbackTexture(scene, type, size, color);
      this.setTexture(`brother_bg_${type}`);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setupPhysicsBody(size);

    this.label = scene.add.text(x, y, type, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.floor(size * 0.45)}px`,
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
    // Removing 'add: false' as it's not valid for make.graphics
    const graphics = scene.make.graphics({ x: 0, y: 0 });

    let color = 0xcccccc;
    if (typeof colorHex === 'string' && colorHex.startsWith('#')) {
      color = parseInt(colorHex.replace('#', ''), 16);
    }

    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.lineStyle(2, 0x000000, 0.1);
    graphics.strokeCircle(radius, radius, radius);

    graphics.fillStyle(0x000000, 0.6);
    const eyeSize = size * 0.12;
    const eyeY = radius - (size * 0.15);
    const eyeXOffset = size * 0.2;
    graphics.fillCircle(radius - eyeXOffset, eyeY, eyeSize);
    graphics.fillCircle(radius + eyeXOffset, eyeY, eyeSize);

    graphics.generateTexture(key, size, size);

    // Destroy graphics after texture generation
    graphics.destroy();
  }

  private setupPhysicsBody(size: number) {
    if (!this.body) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    const radius = size / 2;
    body.setCircle(radius);

    body.setCollideWorldBounds(false); // Valid: falling off stage

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
      case BrotherState.AIMING:
        body.setAllowGravity(false);
        body.setVelocity(0, 0);
        body.setAngularVelocity(0);
        body.setImmovable(false);
        break;

      case BrotherState.DROPPING:
        body.setAllowGravity(true);
        body.setImmovable(false);
        if (this.spec.physics.allowRotation) {
          body.setAngularVelocity(Phaser.Math.Between(-20, 20));
        }
        body.setDrag(50, 50);
        break;

      case BrotherState.LOCKED:
        body.setAllowGravity(true);
        body.setImmovable(false);
        body.setDrag(300, 300);
        body.setAngularDrag(300);
        body.setBounce(0.05);
        break;
    }
  }

  getType(): string {
    return this.brotherData.type;
  }
}

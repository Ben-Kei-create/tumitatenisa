import { GameSpec } from '../../spec/loadSpec';
import { BrotherData } from '../types';

export enum BrotherState {
  AIMING = 'AIMING',
  DROPPING = 'DROPPING',
  LOCKED = 'LOCKED',
}

export class Brother extends Phaser.GameObjects.Container {
  public brotherData: BrotherData;
  public state: BrotherState = BrotherState.AIMING;
  public mergeLock: boolean = false;

  private spec: GameSpec;
  private shape!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  private label!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: string,
    spec: GameSpec
  ) {
    super(scene, x, y);
    this.spec = spec;

    // Size determined by spec
    const size = spec.brother.size;

    // Container doesn't have setOrigin, we'll handle centering via physics offset
    this.setSize(size, size);

    this.brotherData = {
      id: Phaser.Utils.String.UUID(),
      type,
      merged: false
    };

    // Visuals
    this.createVisuals(type, size);

    scene.add.existing(this);
  }

  /**
   * Attach physics body with proper size and offset
   * Must be called after visual creation
   */
  attachPhysics(): void {
    if (!this.scene.physics) return;

    // Add physics if not already added
    if (!this.body) {
      this.scene.physics.add.existing(this);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const size = this.spec.brother.size;

    // Set body size to match visual size
    body.setSize(size, size);
    
    // Set offset to center (Container's origin is always 0,0, so we offset by -size/2)
    body.setOffset(-size / 2, -size / 2);

    // Body settings
    body.setCollideWorldBounds(true);
    body.setBounce(this.spec.physics.restitution);
    body.setFriction(this.spec.physics.friction);

    // Start with NO gravity for AIMING phase
    body.setAllowGravity(false);
    body.setImmovable(false);
  }

  private createVisuals(type: string, size: number) {
    const colors = {
      'A': 0xB8D8FF,
      'B': 0xBFF0D2,
      'C': 0xFFD7B5,
      // Default fallback
      'default': 0xeeeeee
    };
    const color = colors[type as keyof typeof colors] || colors['default'];

    const imageKey = `brother_${type}`;
    if (this.scene.textures.exists(imageKey)) {
      this.shape = this.scene.add.sprite(0, 0, imageKey);
      this.shape.setDisplaySize(size, size);
    } else {
      this.shape = this.scene.add.rectangle(0, 0, size, size, color);
      // Add a subtle stroke/shadow if possible, or just keeping it simple for now
      (this.shape as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0x000000, 0.1);
    }

    this.add(this.shape);

    // Text Label
    this.label = this.scene.add.text(0, 0, type, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: this.spec.brother.fontSize,
      color: '#111111',
      fontStyle: 'bold'
    });
    this.label.setOrigin(0.5);
    this.add(this.label);
  }

  setBrotherState(newState: BrotherState) {
    this.state = newState;
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (newState) {
      case BrotherState.AIMING:
        body.setAllowGravity(false);
        body.setVelocity(0, 0);
        break;

      case BrotherState.DROPPING:
        body.setAllowGravity(true);
        // Initial drop might add some small random torque or just let physics handle rotation
        if (this.spec.physics.allowRotation) {
          body.setAngularVelocity(Phaser.Math.Between(-10, 10));
        }
        break;

      case BrotherState.LOCKED:
        // Normally stays dynamic but sleeps? Or just effectively static?
        // In "Suika" style, they stay dynamic to push each other.
        // So we don't necessarily disable gravity, just logic state.
        break;
    }
  }

  getType(): string {
    return this.brotherData.type;
  }
}

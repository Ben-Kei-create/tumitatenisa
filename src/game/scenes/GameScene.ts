import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';
import { Brother, BrotherState } from '../objects/Brother';
import { BrotherFactory } from '../factories/BrotherFactory';
import { SpawnSystem } from '../systems/SpawnSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { GameOverSystem } from '../systems/GameOverSystem';

export class GameScene extends Phaser.Scene {
  private spec!: GameSpec;
  private gameState!: GameState;

  private brotherFactory!: BrotherFactory;
  private spawnSystem!: SpawnSystem;
  private mergeSystem!: MergeSystem;
  private scoreSystem!: ScoreSystem;
  private gameOverSystem!: GameOverSystem;

  private rKey!: Phaser.Input.Keyboard.Key;
  private ground!: Phaser.GameObjects.Rectangle;
  private safetyGround!: Phaser.GameObjects.Rectangle; // ★追加: クラス変数にする
  private guideLine!: Phaser.GameObjects.Graphics;
  private brotherGroup!: Phaser.Physics.Arcade.Group;
  private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private dragActive: boolean = false;
  private isSpawning: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { spec: GameSpec }) {
    this.spec = data.spec;
  }

  create() {
    this.physics.world.OVERLAP_BIAS = 8;

    this.gameState = {
      spec: this.spec,
      score: 0,
      gameOver: false,
      currentBrother: null,
      highestY: this.spec.screen.height,
      gameOverTimer: 0,
      heightScoreTimer: 0
    };

    this.cameras.main.setBackgroundColor(this.spec.screen.bg);

    // 壁判定なし
    this.physics.world.setBounds(0, 0, this.spec.screen.width, this.spec.screen.height + 500);
    this.physics.world.setBoundsCollision(false, false, false, false);

    // 環境作成
    this.createEnvironment();

    this.guideLine = this.add.graphics();
    this.brotherGroup = this.physics.add.group({ collideWorldBounds: false });

    // パーティクル
    this.particleEmitter = this.add.particles(0, 0, 'particle', {
      lifespan: 600,
      speed: { min: 150, max: 250 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
    this.particleEmitter.setDepth(10);

    // Event Listeners
    this.events.on('merge-success', (data: any) => this.handleMergeEffect(data));
    this.events.off('game-over');
    this.events.on('game-over', (data: { reason: string, score: number }) => this.handleGameOver(data));

    // Systems
    this.brotherFactory = new BrotherFactory(this, this.spec);
    this.brotherFactory.setBrotherGroup(this.brotherGroup);
    this.spawnSystem = new SpawnSystem(this, this.spec, this.gameState, this.brotherFactory);
    this.mergeSystem = new MergeSystem(this, this.spec, this.gameState, this.brotherFactory);
    this.scoreSystem = new ScoreSystem(this, this.spec, this.gameState, this.brotherGroup);
    this.gameOverSystem = new GameOverSystem(this, this.spec, this.gameState, this.brotherGroup);

    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.setupInputHandlers();

    this.scene.launch('UIScene', { spec: this.spec, gameState: this.gameState, gameSceneEvents: this.events });

    // Start
    this.spawnSystem.spawnNext();
    this.time.delayedCall(100, () => {
      this.events.emit('update-next', this.spawnSystem.peekNextType());
    });

    // 衝突判定
    this.physics.add.collider(this.brotherGroup, this.brotherGroup, (obj1, obj2) => {
      this.onBrotherCollide(obj1, obj2);
    });

    // ★修正: クラス変数 safetyGround を使用
    this.physics.add.collider(this.brotherGroup, [this.ground, this.safetyGround], (brother) => {
      this.onBrotherLanded(brother);
    });
  }

  private createEnvironment() {
    const { width, height } = this.spec.screen;
    const { baseWidth, baseHeight, bottomMargin } = this.spec.stage;
    const baseX = width / 2;
    const baseY = height - bottomMargin - baseHeight / 2;

    // 台座
    this.ground = this.add.rectangle(baseX, baseY, baseWidth, baseHeight, 0xE6E6E6);
    this.physics.add.existing(this.ground, true);

    // セーフティネット
    const safetyH = 500;
    const safetyY = baseY + (baseHeight / 2) + (safetyH / 2) - 10;
    this.safetyGround = this.add.rectangle(baseX, safetyY, baseWidth, safetyH, 0x000000, 0);
    this.physics.add.existing(this.safetyGround, true);
  }

  update(time: number) {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.scene.restart();
      return;
    }
    if (this.gameState.gameOver) return;

    this.guideLine.clear();
    if (this.gameState.currentBrother && this.gameState.currentBrother.state === BrotherState.AIMING) {
      if (this.spec.input.showDropGuide) {
        const b = this.gameState.currentBrother;
        this.guideLine.lineStyle(2, 0xaaaaaa, 0.5);
        this.guideLine.beginPath();
        this.guideLine.moveTo(b.x, b.y + b.displayHeight / 2);
        this.guideLine.lineTo(b.x, this.ground.y - this.ground.displayHeight / 2);
        this.guideLine.strokePath();
      }
    }

    // 落下チェック
    const killY = this.spec.screen.height + 100;
    this.brotherGroup.children.entries.forEach((child) => {
      const b = child as Brother;
      if (b.y > killY) {
        if (b.state === BrotherState.LOCKED || b.state === BrotherState.DROPPING) {
          if (!this.gameState.gameOver && b !== this.gameState.currentBrother) {
            this.gameOverSystem.triggerGameOver('fallen_out');
          }
        }
        b.destroy();
      }
    });

    // 着地チェック
    this.brotherGroup.children.entries.forEach((child) => {
      const brother = child as Brother;
      if (brother.state === BrotherState.DROPPING) {
        const body = brother.body as Phaser.Physics.Arcade.Body;
        const isStopped = body.velocity.length() < 10 && brother.y > this.spec.spawn.y + 50;
        if (body.blocked.down || body.touching.down || isStopped) {
          this.lockBrother(brother);
        }
      }
    });

    // スポーン
    if (!this.gameState.currentBrother && !this.gameState.gameOver && !this.isSpawning) {
      const isAnythingFalling = (this.brotherGroup.children.entries as Brother[])
        .some(b => b.state === BrotherState.DROPPING);
      if (!isAnythingFalling) {
        this.isSpawning = true;
        this.time.delayedCall(this.spec.spawn.nextDelayMs, () => {
          this.spawnSystem.spawnNext();
          this.isSpawning = false;
          this.events.emit('update-next', this.spawnSystem.peekNextType());
        });
      }
    }

    this.scoreSystem.update(time);
    this.gameOverSystem.update(time);
  }

  private handleMergeEffect(data: any) {
    this.gameState.score += data.score;
    const colors: Record<string, number> = {
      'A': 0xB8D8FF, 'B': 0xBFF0D2, 'C': 0xFFD7B5,
      'D': 0xE5C1FF, 'E': 0xFFF5BA, 'F': 0xFF9999,
      'G': 0x99CCFF, 'H': 0xFFFF99
    };
    const color = colors[data.type] || 0xffffff;

    this.particleEmitter.setPosition(data.x, data.y);
    this.particleEmitter.particleTint = color;
    this.particleEmitter.explode(16);

    const scoreText = this.add.text(data.x, data.y, `+${data.score}`, {
      fontFamily: 'system-ui',
      fontSize: '24px',
      color: '#111',
      fontStyle: 'bold',
      stroke: '#fff',
      strokeThickness: 3
    }).setOrigin(0.5);
    scoreText.setDepth(20);

    this.tweens.add({
      targets: scoreText,
      y: data.y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => scoreText.destroy()
    });
  }

  private handleGameOver(data: { reason: string, score: number }) {
    const saved = localStorage.getItem('tumitatenisa_highscore');
    const highScore = saved ? parseInt(saved, 10) : 0;
    const isNewRecord = data.score > highScore;
    if (isNewRecord) {
      localStorage.setItem('tumitatenisa_highscore', data.score.toString());
    }

    this.scene.stop('UIScene');
    // 物理演算を止めるが、見た目はそのまま
    this.physics.pause();

    this.scene.launch('GameOverScene', {
      spec: this.spec,
      score: data.score,
      isNewRecord: isNewRecord
    });
  }

  private setupInputHandlers() {
    this.input.on('pointerdown', () => {
      if (this.gameState.currentBrother && this.gameState.currentBrother.state === BrotherState.AIMING) {
        this.dragActive = true;
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragActive && this.gameState.currentBrother) {
        const x = Phaser.Math.Clamp(
          pointer.x,
          this.spec.spawn.xRange[0] + this.spec.screen.width / 2,
          this.spec.spawn.xRange[1] + this.spec.screen.width / 2
        );
        this.gameState.currentBrother.x = x;
      }
    });
    this.input.on('pointerup', () => {
      if (this.dragActive && this.gameState.currentBrother) {
        this.dragActive = false;
        this.gameState.currentBrother.setBrotherState(BrotherState.DROPPING);
        this.gameState.currentBrother = null;
      }
    });
  }

  private onBrotherCollide(obj1: any, obj2: any) {
    const a = obj1 as Brother;
    const b = obj2 as Brother;
    if (!a.mergeLock && !b.mergeLock && a.getType() === b.getType()) {
      this.mergeSystem.mergeBrothers(a, b);
    }
  }

  private onBrotherLanded(brother: any) { this.lockBrother(brother); }

  private lockBrother(brother: Brother) {
    if (brother.state === BrotherState.LOCKED) return;
    this.gameState.score += 10;
    brother.setBrotherState(BrotherState.LOCKED);
    const body = brother.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(body.velocity.x * 0.8, body.velocity.y * 0.8);
    body.setAngularVelocity(body.angularVelocity * 0.8);
  }
}

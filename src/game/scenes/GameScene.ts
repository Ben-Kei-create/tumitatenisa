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
    // Bias調整（めり込み防止）
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

    // ★修正: 画面端の壁判定をすべて無効化（false, false, false, false）
    // これでブロックは画面外へ落ちていきます
    this.physics.world.setBounds(0, 0, this.spec.screen.width, this.spec.screen.height + 500);
    this.physics.world.setBoundsCollision(false, false, false, false);

    this.createEnvironment();

    this.guideLine = this.add.graphics();

    this.brotherGroup = this.physics.add.group({
      collideWorldBounds: false // グループ全体設定でも壁衝突を無効化
    });

    // パーティクル設定
    this.particleEmitter = this.add.particles(0, 0, 'particle', {
      lifespan: 600,
      speed: { min: 150, max: 250 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
    this.particleEmitter.setDepth(10);

    // イベントリスナー
    this.events.on('merge-success', (data: any) => {
      this.handleMergeEffect(data);
    });

    this.brotherFactory = new BrotherFactory(this, this.spec);
    this.brotherFactory.setBrotherGroup(this.brotherGroup);

    this.spawnSystem = new SpawnSystem(this, this.spec, this.gameState, this.brotherFactory);
    this.mergeSystem = new MergeSystem(this, this.spec, this.gameState, this.brotherFactory);
    this.scoreSystem = new ScoreSystem(this, this.spec, this.gameState, this.brotherGroup);
    this.gameOverSystem = new GameOverSystem(this, this.spec, this.gameState, this.brotherGroup);

    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.setupInputHandlers();

    this.scene.launch('UIScene', {
      spec: this.spec,
      gameState: this.gameState,
      gameSceneEvents: this.events
    });

    this.events.off('game-over');
    this.events.on('game-over', (data: { reason: string, score: number }) => {
      this.handleGameOver(data);
    });

    this.spawnSystem.spawnNext();
    this.time.delayedCall(100, () => {
      this.events.emit('update-next', this.spawnSystem.peekNextType());
    });

    // 衝突設定
    this.physics.add.collider(
      this.brotherGroup,
      this.brotherGroup,
      (obj1, obj2) => {
        this.onBrotherCollide(obj1, obj2);
      }
    );

    // 地面（台座のみ）との衝突
    this.physics.add.collider(this.brotherGroup, this.ground, (brother) => {
      this.onBrotherLanded(brother);
    });
  }

  private createEnvironment() {
    const { width, height } = this.spec.screen;
    const { baseWidth, baseHeight, bottomMargin } = this.spec.stage;

    const baseX = width / 2;
    const baseY = height - bottomMargin - baseHeight / 2;

    // 1. メイン台座
    this.ground = this.add.rectangle(baseX, baseY, baseWidth, baseHeight, 0xE6E6E6);
    this.physics.add.existing(this.ground, true);

    // すり抜け防止のセーフティネット（今回は台座と同じ幅にして、横から落ちるようにする）
    // 台座の下に厚みを持たせるイメージ
    const safetyH = 500;
    const safetyY = baseY + (baseHeight / 2) + (safetyH / 2) - 10;

    // 台座と同じ幅の「見えない柱」を下に伸ばす
    const safetyGround = this.add.rectangle(baseX, safetyY, baseWidth, safetyH, 0x000000, 0);
    this.physics.add.existing(safetyGround, true);

    // コライダーに追加
    this.physics.add.collider(this.brotherGroup, [this.ground, safetyGround], (brother) => {
      this.onBrotherLanded(brother);
    });
  }

  // ★追加: 落下物の削除とゲームオーバー判定の強化
  update(time: number) {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.scene.restart();
      return;
    }
    if (this.gameState.gameOver) return;

    // ガイドライン表示
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

    // 画面外落下判定（ゲームオーバー）
    const killY = this.spec.screen.height + 100;
    this.brotherGroup.children.entries.forEach((child) => {
      const b = child as Brother;

      // 画面下に落ちた場合
      if (b.y > killY) {
        // 操作中のブロックでなければゲームオーバー
        // （操作中でも落ちたらアウトだが、LOCKED後に転がって落ちた場合を検知）
        if (b.state === BrotherState.LOCKED || b.state === BrotherState.DROPPING) {
          // まだゲームオーバーになっていないならトリガー
          if (!this.gameState.gameOver && b !== this.gameState.currentBrother) {
            this.gameOverSystem.triggerGameOver('fallen_out');
          }
        }
        b.destroy(); // メモリリーク防止
      }
    });

    // 着地判定
    this.brotherGroup.children.entries.forEach((child) => {
      const brother = child as Brother;
      if (brother.state === BrotherState.DROPPING) {
        const body = brother.body as Phaser.Physics.Arcade.Body;
        // 速度が十分遅く、かつスポーン位置より下にいるなら着地とみなす
        const isStopped = body.velocity.length() < 10 && brother.y > this.spec.spawn.y + 50;

        if (body.blocked.down || body.touching.down || isStopped) {
          this.lockBrother(brother);
        }
      }
    });

    // 次のスポーン処理
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

  private onBrotherCollide(obj1: any, obj2: any): void {
    const a = obj1 as Brother;
    const b = obj2 as Brother;
    if (!a.mergeLock && !b.mergeLock && a.getType() === b.getType()) {
      this.mergeSystem.mergeBrothers(a, b);
    }
  }

  private onBrotherLanded(brother: any): void {
    this.lockBrother(brother);
  }

  private lockBrother(brother: Brother) {
    if (brother.state === BrotherState.LOCKED) return;
    this.gameState.score += 10;
    brother.setBrotherState(BrotherState.LOCKED);

    // 速度を減衰させるが、ゼロにはしない（転がって落ちるように）
    const body = brother.body as Phaser.Physics.Arcade.Body;
    // body.setVelocity(0,0) はしない！転がれ！
    // ただし無限に転がりすぎないように少し減衰
    body.setVelocity(body.velocity.x * 0.8, body.velocity.y * 0.8);
    body.setAngularVelocity(body.angularVelocity * 0.8);
  }
}

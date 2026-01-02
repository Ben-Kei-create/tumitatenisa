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
  // private scoreText!: Phaser.GameObjects.Text; // Removed
  private ground!: Phaser.GameObjects.Rectangle;
  private walls!: Phaser.GameObjects.Group;
  private guideLine!: Phaser.GameObjects.Graphics;
  private brotherGroup!: Phaser.Physics.Arcade.Group;

  private dragActive: boolean = false;
  private isSpawning: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { spec: GameSpec }) {
    this.spec = data.spec;
  }

  create() {
    this.gameState = {
      spec: this.spec,
      score: 0,
      gameOver: false,
      currentBrother: null,
      highestY: this.spec.screen.height,
      gameOverTimer: 0,
      heightScoreTimer: 0
    };

    // Background
    this.cameras.main.setBackgroundColor(this.spec.screen.bg);

    // Physics World Bounds
    this.physics.world.setBounds(
      0, 0,
      this.spec.screen.width,
      this.spec.screen.height
    );
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.up = false; // Don't collide with top

    // --- Environment Setup ---
    this.createEnvironment();

    // Guide Line
    this.guideLine = this.add.graphics();

    // --- Create Brother Group ---
    this.brotherGroup = this.physics.add.group();

    // --- Systems Init ---
    this.brotherFactory = new BrotherFactory(this, this.spec);
    this.brotherFactory.setBrotherGroup(this.brotherGroup);
    this.spawnSystem = new SpawnSystem(this, this.spec, this.gameState, this.brotherFactory);
    this.mergeSystem = new MergeSystem(this, this.spec, this.gameState, this.brotherFactory);
    this.scoreSystem = new ScoreSystem(this, this.spec, this.gameState, this.brotherGroup);
    this.gameOverSystem = new GameOverSystem(this, this.spec, this.gameState, this.brotherGroup);

    // --- Inputs ---
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.setupInputHandlers();

    // --- UI ---
    // Launch UI Scene
    this.scene.launch('UIScene', {
      spec: this.spec,
      gameState: this.gameState,
      gameSceneEvents: this.events // Pass event emitter
    });

    // Start
    this.spawnSystem.spawnNext();

    // Sync initial Next UI (in case event was missed during scene boot)
    // Note: UIScene might take a frame to boot. 
    // Let's emit after a short delay to be safe
    this.time.delayedCall(100, () => {
      this.events.emit('update-next', this.spawnSystem.peekNextType());
    });

    // --- Collision Setup ---
    // Brother vs Brother (合体処理 + 物理制御)
    this.physics.add.collider(
      this.brotherGroup,
      this.brotherGroup,
      (obj1: any, obj2: any) => {
        this.onBrotherCollide(obj1, obj2);
        // 衝突時の横速度・回転を減衰
        this.dampenBrotherVelocity(obj1);
        this.dampenBrotherVelocity(obj2);
      }
    );

    // Brother vs Ground (台座)
    this.physics.add.collider(
      this.brotherGroup,
      this.ground,
      (brother: any) => {
        this.onBrotherLanded(brother);
      }
    );
  }

  private createEnvironment() {
    const { width, height } = this.spec.screen;
    const { baseWidth, baseHeight, bottomMargin } = this.spec.stage;

    // 台座（画面中央の狭い範囲）
    // baseX = 画面中央、baseY = 画面下端 - bottomMargin - baseHeight/2
    const baseX = width / 2;
    const baseY = height - bottomMargin - baseHeight / 2;
    
    this.ground = this.add.rectangle(
      baseX,
      baseY,
      baseWidth,
      baseHeight,
      0xE6E6E6
    );
    // 物理bodyを付与（見た目と物理を一致）
    this.physics.add.existing(this.ground, true); // static

    // 壁は削除（台座外はゲームオーバー）
    this.walls = this.physics.add.staticGroup();
  }

  private setupInputHandlers() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameState.currentBrother && this.gameState.currentBrother.state === BrotherState.AIMING) {
        this.dragActive = true;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragActive && this.gameState.currentBrother) {
        const x = Phaser.Math.Clamp(
          pointer.x,
          this.spec.spawn.xRange[0] + this.spec.screen.width / 2, // relative to center? No, absolute range needed.
          // Wait, spec.spawn.xRange is [-220, 220]. If 0 is center, we add screen.width/2
          this.spec.spawn.xRange[1] + this.spec.screen.width / 2
        );
        this.gameState.currentBrother.x = x;
      }
    });

    this.input.on('pointerup', () => {
      if (this.dragActive && this.gameState.currentBrother) {
        this.dragActive = false;
        this.gameState.currentBrother.setBrotherState(BrotherState.DROPPING);
        this.gameState.currentBrother = null; // Detach control

        // Schedule next spawn (delayed check for landing happens in update or collision?)
        // Re-reading spec: "LOCKED: landed... next spawn"
        // We need to detect landing.
      }
    });
  }

  update(time: number) {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.scene.restart();
      return;
    }

    if (this.gameState.gameOver) return;

    // Guide Line Logic
    this.guideLine.clear();
    if (this.gameState.currentBrother && this.gameState.currentBrother.state === BrotherState.AIMING) {
      if (this.spec.input.showDropGuide) {
        const b = this.gameState.currentBrother;
        const startX = b.x;
        const startY = b.y + (b.height / 2); // Start from bottom of block

        this.guideLine.lineStyle(2, 0xaaaaaa, 0.5);
        this.guideLine.beginPath();
        this.guideLine.moveTo(startX, startY);
        // Draw down to base (台座)
        const { baseHeight, bottomMargin } = this.spec.stage;
        const baseY = this.spec.screen.height - bottomMargin - baseHeight / 2;
        this.guideLine.lineTo(startX, baseY);
        this.guideLine.strokePath();
      }
    }

    // Check specific collisions for Merging
    // (This is usually better done via collision callbacks in create, 
    // but MergeSystem.update() was used in previous code. Let's keep using MergeSystem)

    // --- Landing Detection Failsafe ---
    // Check ALL brothers for landing connectivity or velocity stop
    this.brotherGroup.children.entries.forEach((child) => {
      const brother = child as Brother;
      if (brother.state === BrotherState.DROPPING) {
        const body = brother.body as Phaser.Physics.Arcade.Body;

        // Criteria for Landing:
        // 1. Blocked down (floor)
        // 2. Touching down (on another brother)
        // 3. Velocity Y is near zero (stopped moving) and is below spawn area
        const isStopped = Math.abs(body.velocity.y) < 10 && brother.y > this.spec.spawn.y + 50;

        if (body.blocked.down || body.touching.down || isStopped) {
          console.log('[GameScene] Brother landed:', brother.brotherData.id, brother.getType());
          brother.setBrotherState(BrotherState.LOCKED);
        }
      }
    });

    // --- Next Spawn Logic ---
    if (!this.gameState.currentBrother) {
      // Check if any brother is currently falling
      const brothers = this.brotherGroup.children.entries as Brother[];
      const isAnythingFalling = brothers.some(b => b.state === BrotherState.DROPPING);

      if (!isAnythingFalling && !this.gameState.gameOver) {
        // It's quiet, we can spawn.
        // Use a flag to ensure we don't spam spawnNext calls (though spawnNext protects itself, the delay shouldn't pile up)
        // We'll use a property on the scene or just rely on the delay call being unique? 
        // Better to check if we are already waiting.
        // For now, simpler: Just call spawnNext. SpawnSystem checks currentBrother.
        // BUT we want a DELAY.

        // We need a way to know "Only schedule ONCE per drop".
        // The simplest way in `update` without state is tricky. 
        // Let's check `spawnSystem` state? No.
        // Let's add `isSpawning` flag to GameScene class.
        if (!this.isSpawning) {
          console.log('[GameScene] No falling blocks. Scheduling next spawn.');
          this.isSpawning = true;
          this.time.delayedCall(this.spec.spawn.nextDelayMs, () => {
            this.spawnSystem.spawnNext();
            this.isSpawning = false;

            // Emit update-next event for UI after spawn
            this.time.delayedCall(50, () => {
              this.events.emit('update-next', this.spawnSystem.peekNextType());
            });
          });
        }
      }
    }

    // 台座外チェックはLOCK後のブロックのみ（落下中はチェックしない）

    // update systems
    // Note: Merge is now handled in onBrotherCollide callback
    // this.mergeSystem.update(); // Disabled - using collision callback instead
    this.scoreSystem.update(time);
    this.gameOverSystem.update(time);
  }

  /**
   * Handle collision between two brothers
   * Only merge if same type and not already locked
   */
  private onBrotherCollide(obj1: any, obj2: any): void {
    const a = obj1 as Brother;
    const b = obj2 as Brother;

    // Skip if either is locked for merging
    if (a.mergeLock || b.mergeLock) return;

    // Only merge same types
    if (a.getType() !== b.getType()) return;

    // Trigger merge
    this.mergeSystem.mergeBrothers(a, b);
  }

  /**
   * Handle brother landing on ground (台座)
   */
  private onBrotherLanded(brother: any): void {
    if (!(brother instanceof Brother)) return;

    if (brother.state === BrotherState.DROPPING) {
      // 着地時のスコア加点
      this.gameState.score += 10;

      // LOCK状態に変更（setImmovableが設定される）
      brother.setBrotherState(BrotherState.LOCKED);

      // 横速度・回転を完全に停止
      const body = brother.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(0);
      body.setAngularVelocity(0);

      // 着地確定後に台座外チェック（LOCK後のみ判定）
      this.checkBrotherBaseBounds(brother);
    }
  }

  /**
   * Dampen brother velocity on collision (横速度・回転を減衰)
   */
  private dampenBrotherVelocity(brother: any): void {
    if (!(brother instanceof Brother)) return;
    if (brother.state === BrotherState.LOCKED) return; // 既に着地済みはスキップ

    const body = brother.body as Phaser.Physics.Arcade.Body;
    // 横速度を強制的に減衰
    body.setVelocityX(body.velocity.x * 0.2);
    body.setAngularVelocity(body.angularVelocity * 0.2);
  }

  /**
   * Check if a LOCKED brother is outside the base bounds (台座外チェック)
   * 落下中（DROPPING）は絶対にチェックしない
   */
  private checkBrotherBaseBounds(brother: Brother): void {
    if (this.gameState.gameOver) return;
    // 落下中は絶対にチェックしない
    if (brother.state !== BrotherState.LOCKED) return;

    const { baseWidth } = this.spec.stage;
    const baseX = this.spec.screen.width / 2;
    const halfWidth = baseWidth / 2;
    const minX = baseX - halfWidth;
    const maxX = baseX + halfWidth;
    const screenHeight = this.spec.screen.height;

    // 台座外チェック（中心X）
    if (brother.x < minX || brother.x > maxX) {
      this.gameOverSystem.triggerGameOver('base_out');
      return;
    }

    // 画面下端チェック（底面Y）
    const bottomY = brother.y + (brother.height / 2);
    if (bottomY > screenHeight) {
      this.gameOverSystem.triggerGameOver('bottom_out');
      return;
    }
  }
}



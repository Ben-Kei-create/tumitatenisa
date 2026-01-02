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

    this.cameras.main.setBackgroundColor(this.spec.screen.bg);

    // 画面外の物理衝突判定はすべてOFF（落ちるようにする）
    this.physics.world.setBounds(0, 0, this.spec.screen.width, this.spec.screen.height + 100);
    this.physics.world.setBoundsCollision(false, false, false, false);

    this.createEnvironment();

    this.guideLine = this.add.graphics();

    this.brotherGroup = this.physics.add.group({
      collideWorldBounds: false
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

    this.spawnSystem.spawnNext();
    this.time.delayedCall(100, () => {
      this.events.emit('update-next', this.spawnSystem.peekNextType());
    });

    // 衝突設定
    this.physics.add.collider(
      this.brotherGroup,
      this.brotherGroup,
      (obj1, obj2) => this.onBrotherCollide(obj1, obj2)
    );

    this.physics.add.collider(
      this.brotherGroup,
      this.ground,
      (brother, ground) => this.onBrotherLanded(brother)
    );
  }

  private createEnvironment() {
    const { width, height } = this.spec.screen;
    const { baseWidth, baseHeight, bottomMargin } = this.spec.stage;

    const baseX = width / 2;
    const baseY = height - bottomMargin - baseHeight / 2;

    this.ground = this.add.rectangle(baseX, baseY, baseWidth, baseHeight, 0xE6E6E6);
    this.physics.add.existing(this.ground, true);
  }

  private setupInputHandlers() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameState.currentBrother && this.gameState.currentBrother.state === BrotherState.HOLDING) {
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

  update(time: number) {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.scene.restart();
      return;
    }

    if (this.gameState.gameOver) return;

    // ガイドライン
    this.guideLine.clear();
    if (this.gameState.currentBrother && this.gameState.currentBrother.state === BrotherState.HOLDING) {
      if (this.spec.input.showDropGuide) {
        const b = this.gameState.currentBrother;
        this.guideLine.lineStyle(2, 0xaaaaaa, 0.5);
        this.guideLine.beginPath();
        // 円の下端からガイド
        this.guideLine.moveTo(b.x, b.y + b.displayHeight / 2);
        this.guideLine.lineTo(b.x, this.ground.y - this.ground.displayHeight / 2);
        this.guideLine.strokePath();
      }
    }

    // 着地判定
    this.brotherGroup.children.entries.forEach((child) => {
      const brother = child as Brother;
      if (brother.state === BrotherState.DROPPING) {
        const body = brother.body as Phaser.Physics.Arcade.Body;

        // 地面または他のブロックに乗っている、かつ速度がある程度落ち着いたら
        // 円形の場合、touching.down が反応しにくいことがあるが、ArcadePhysicsではCircleでもBox同様にtouching flagsが立つはず。
        // ただし転がっている間は isMoving なので、単純に touching.down だけ見ると「転がっているのに着地とみなされる」?
        // 仕様としては「操作から離れて、何かに接触したら」ロック扱いで良い
        if (body.touching.down || body.blocked.down) {
          // 少し滑りを許容するため、即ロックせずとも良いが、
          // ゲーム進行（次のスポーン）のためにステートは切り替える
          this.lockBrother(brother);
        }
      }
    });

    // 次のスポーン判定
    if (!this.gameState.currentBrother && !this.gameState.gameOver && !this.isSpawning) {
      // 落下中のものがあるか
      const hasDropping = (this.brotherGroup.children.entries as Brother[])
        .some(b => b.state === BrotherState.DROPPING);

      // 落下中がなく、かつ全体の速度がある程度落ち着いているか？
      // 今回はシンプルに「DROPPING」がいなければ次へ
      if (!hasDropping) {
        this.isSpawning = true;
        this.time.delayedCall(this.spec.spawn.nextDelayMs, () => {
          this.spawnSystem.spawnNext();
          this.isSpawning = false;
          this.events.emit('update-next', this.spawnSystem.peekNextType());
        });
      }
    }

    this.gameOverSystem.update(time);
  }

  private onBrotherCollide(obj1: any, obj2: any): void {
    const a = obj1 as Brother;
    const b = obj2 as Brother;

    // 合体判定
    if (!a.mergeLock && !b.mergeLock && a.getType() === b.getType()) {
      this.mergeSystem.mergeBrothers(a, b);
      return;
    }

    // 衝突時の減衰は、物理任せにするため削除（または控えめに）
    // 転がってほしいので、速度を殺しすぎない
  }

  private onBrotherLanded(brother: any): void {
    if (brother instanceof Brother && brother.state === BrotherState.DROPPING) {
      this.lockBrother(brother);
    }
  }

  private lockBrother(brother: Brother) {
    if (brother.state === BrotherState.LOCKED) return;

    this.gameState.score += 10;

    // ステートをLOCKEDにする（物理は維持されるがDragが増える）
    brother.setBrotherState(BrotherState.LOCKED);
    console.log(`Brother Locked (Active Physics): ${brother.brotherData.id}`);
  }
}

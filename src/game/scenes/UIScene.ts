import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';

export class UIScene extends Phaser.Scene {
  private spec!: GameSpec;
  private gameState!: GameState;
  private gameSceneEvents!: Phaser.Events.EventEmitter;

  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text; // ★追加
  private highScore: number = 0; // ★追加
  private gameOverContainer!: Phaser.GameObjects.Container;
  private nextPreviewSprite!: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { spec: GameSpec; gameState: GameState; gameSceneEvents: Phaser.Events.EventEmitter }) {
    this.spec = data.spec;
    this.gameState = data.gameState;
    this.gameSceneEvents = data.gameSceneEvents;
  }

  create() {
    this.loadHighScore(); // ★読み込み

    // HUD Layer
    this.createHUD();
    this.createNextDisplay();

    // Overlay Layer (Hidden initially)
    this.createGameOverOverlay();

    // Listeners
    if (this.gameSceneEvents) {
      this.gameSceneEvents.on('game-over', this.showGameOver, this);
      this.gameSceneEvents.on('update-next', (nextType: string) => {
        this.updateNextDisplay(nextType);
      }, this);
    }
  }

  private loadHighScore() {
    const saved = localStorage.getItem('tumitatenisa_highscore');
    this.highScore = saved ? parseInt(saved, 10) : 0;
  }

  private saveHighScore() {
    if (this.gameState.score > this.highScore) {
      this.highScore = this.gameState.score;
      localStorage.setItem('tumitatenisa_highscore', this.highScore.toString());
      // ハイスコア更新演出（テキスト色を変えるなど）
      this.highScoreText.setColor('#ff0000');
    }
  }

  // ★追加: NEXT表示エリアの作成
  private createNextDisplay() {
    const { width } = this.spec.screen;

    // 右上に表示 ("NEXT" という文字)
    this.add.text(width - 80, 20, 'NEXT', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#555',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // プレビュー用のダミースプライト（最初は非表示）
    // ※位置は "NEXT" 文字の下あたり
    this.nextPreviewSprite = this.add.sprite(width - 80, 60, '');
    this.nextPreviewSprite.setVisible(false);
  }

  // ★追加: NEXT表示の更新
  private updateNextDisplay(nextType: string) {
    if (!this.nextPreviewSprite) return;

    // テクスチャキー
    const key = `brother_${nextType}`;
    // テクスチャがまだ生成されていない場合（初回など）の対策
    const fallbackKey = `brother_bg_${nextType}`;
    const textureKey = this.textures.exists(key) ? key : fallbackKey;

    if (this.textures.exists(textureKey)) {
      this.nextPreviewSprite.setTexture(textureKey);
      this.nextPreviewSprite.setVisible(true);

      // NEXT表示は少し小さめに表示するとUIとして綺麗
      this.nextPreviewSprite.setDisplaySize(32, 32);
    }
  }

  private createHUD() {
    // Score
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#111111',
      fontStyle: 'bold'
    });

    // ★追加: ハイスコア表示 (右上に小さく)
    this.highScoreText = this.add.text(20, 55, `Best: ${this.highScore}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#666',
      fontStyle: 'bold'
    });
    // Ensure HUD is on top of everything (though this is a separate scene, so it's on top of GameScene naturally)
  }

  private createGameOverOverlay() {
    const { width, height } = this.spec.screen;

    this.gameOverContainer = this.add.container(0, 0);
    this.gameOverContainer.setVisible(false);
    this.gameOverContainer.setDepth(1000);

    // Semi-transparent background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
    bg.setInteractive(); // Block input to game
    this.gameOverContainer.add(bg);

    // Card
    const cardW = width * 0.8;
    const cardH = height * 0.3;
    const card = this.add.rectangle(width / 2, height / 2, cardW, cardH, 0xFFFFFF);
    card.setStrokeStyle(2, 0x000000, 0.1);
    (card as any).radius = 12; // Round corners if possible in graphics, but plain rect for now
    this.gameOverContainer.add(card);

    // Title
    const title = this.add.text(width / 2, height / 2 - 40, 'GAME OVER', {
      fontFamily: 'system-ui',
      fontSize: '48px',
      color: '#111',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.gameOverContainer.add(title);

    // Score Label (updated when shown)
    // We will create it here and update text later
    // But simpler to just show current score text?
    // Let's hide the HUD score and show a big score here?
    // Or just keep HUD visible.

    // Restart Button
    const btnY = height / 2 + 60;
    const btn = this.add.rectangle(width / 2, btnY, 200, 50, 0x111111);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      // Restart Game
      // We need to restart GameScene.
      // And hide this.
      this.gameSceneEvents.emit('restart-request'); // Or handle here
      // Better: GameScene listens to R key. We can also directly call scene.start from here?
      // No, GameScene needs to reset.
      // Let's just create a new registry or stop/start.

      // Triggering restart via GameScene logic is cleaner if inputs are there.
      // But UI needs to lead.

      // Let's stop UIScene and restart GameScene.
      this.scene.stop('UIScene');
      this.scene.get('GameScene').scene.restart();
    });
    this.gameOverContainer.add(btn);

    const btnText = this.add.text(width / 2, btnY, 'RESTART', {
      fontSize: '24px',
      color: '#FFF',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    this.gameOverContainer.add(btnText);
  }

  private showGameOver() {
    if (this.gameOverContainer) {
      this.gameOverContainer.setVisible(true);
      this.tweens.add({
        targets: this.gameOverContainer,
        alpha: { from: 0, to: 1 },
        duration: 300
      });
    }
  }

  update() {
    if (this.gameState && this.scoreText) {
      this.scoreText.setText(`Score: ${this.gameState.score}`);

      // ゲーム中にハイスコアを超えたらリアルタイム更新
      if (this.gameState.score > this.highScore) {
        this.highScoreText.setText(`Best: ${this.gameState.score}`);
        this.saveHighScore();
      }
    }
  }
}


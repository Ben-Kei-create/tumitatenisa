import { GameSpec } from '../../spec/loadSpec';
import { GameState } from '../types';

export class UIScene extends Phaser.Scene {
  private spec!: GameSpec;
  private gameState!: GameState;
  private gameSceneEvents!: Phaser.Events.EventEmitter;

  private scoreText!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { spec: GameSpec; gameState: GameState; gameSceneEvents: Phaser.Events.EventEmitter }) {
    this.spec = data.spec;
    this.gameState = data.gameState;
    this.gameSceneEvents = data.gameSceneEvents;
  }

  create() {
    // HUD Layer
    this.createHUD();

    // Overlay Layer (Hidden initially)
    this.createGameOverOverlay();

    // Listeners
    if (this.gameSceneEvents) {
      this.gameSceneEvents.on('game-over', this.showGameOver, this);
      this.gameSceneEvents.on('update-next', (_nextType: string) => {
        // TODO: Update Next UI display with nextType
        // For now, just prevent crash
      }, this);
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
    }
  }
}


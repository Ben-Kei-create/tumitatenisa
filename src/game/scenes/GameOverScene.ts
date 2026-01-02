import { GameSpec } from '../../spec/loadSpec';

export class GameOverScene extends Phaser.Scene {
    private spec!: GameSpec;
    private finalScore: number = 0;
    private isNewRecord: boolean = false;

    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data: { spec: GameSpec; score: number; isNewRecord: boolean }) {
        this.spec = data.spec;
        this.finalScore = data.score;
        this.isNewRecord = data.isNewRecord;
    }

    create() {
        const { width, height } = this.spec.screen;
        const cx = width / 2;
        const cy = height / 2;

        // 1. 背景（半透明の黒）
        // プレイ画面を透けさせるため、透明度のある矩形を置く
        this.add.rectangle(cx, cy, width, height, 0x000000, 0.7);

        // 2. "GAME OVER" テキスト
        this.add.text(cx, cy - 180, 'GAME OVER', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '42px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 3. スコア表示（カウントアップ演出）
        const scoreLabel = this.add.text(cx, cy - 80, 'SCORE', {
            fontFamily: 'system-ui',
            fontSize: '18px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const scoreText = this.add.text(cx, cy - 40, '0', {
            fontFamily: 'system-ui',
            fontSize: '56px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // カウントアップ Tween
        this.tweens.addCounter({
            from: 0,
            to: this.finalScore,
            duration: 1000, // 1秒かけてカウント
            ease: 'Power2',
            onUpdate: (tween) => {
                const val = Math.floor(tween.getValue());
                scoreText.setText(val.toString());
            }
        });

        // 4. NEW RECORD 演出
        if (this.isNewRecord) {
            const newRecordText = this.add.text(cx, cy + 10, 'NEW RECORD!', {
                fontFamily: 'system-ui',
                fontSize: '24px',
                color: '#ffdd00',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: newRecordText,
                scale: { from: 1.5, to: 1 },
                alpha: { from: 0, to: 1 },
                duration: 500,
                ease: 'Back.out'
            });
        }

        // 5. RESTART ボタン
        this.createButton(cx, cy + 100, 'RESTART', 0xffffff, 0x111111, () => {
            // GameSceneを再起動
            this.scene.stop('GameOverScene');
            this.scene.stop('GameScene');
            this.scene.start('GameScene', { spec: this.spec, fromTitle: true });
        });

        // 6. SHARE ボタン (X/Twitter)
        this.createButton(cx, cy + 180, 'SHARE SCORE', 0x1DA1F2, 0xffffff, () => {
            this.shareScore();
        });
    }

    private createButton(x: number, y: number, label: string, bgColor: number, textColor: number, onClick: () => void) {
        const btnW = 220;
        const btnH = 50;

        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, btnW, btnH, bgColor)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(0, 0, label, {
            fontFamily: 'system-ui',
            fontSize: '20px',
            color: Phaser.Display.Color.IntegerToColor(textColor).rgba,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, text]);

        bg.on('pointerdown', () => {
            // 押下アクション
            this.tweens.add({
                targets: container,
                scale: 0.95,
                duration: 50,
                yoyo: true
            });
            onClick();
        });
    }

    private shareScore() {
        const text = `積み立てNISANでスコア ${this.finalScore} を獲得しました！ #積み立てNISAN`;
        const url = 'https://game-url.com'; // 実際のURLがあれば入れる
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(tweetUrl, '_blank');
    }
}

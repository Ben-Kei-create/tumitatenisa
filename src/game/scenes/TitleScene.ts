import { GameSpec } from '../../spec/loadSpec';

export class TitleScene extends Phaser.Scene {
    private spec!: GameSpec;

    constructor() {
        super({ key: 'TitleScene' });
    }

    init(data: { spec: GameSpec }) {
        this.spec = data.spec;
    }

    create() {
        const { width, height } = this.spec.screen;
        const cx = width / 2;
        const cy = height / 2;

        // 背景（薄いグレー）
        this.cameras.main.setBackgroundColor('#eeeeee');

        // タイトルロゴ
        this.add.text(cx, cy - 150, 'TSUMITATE\nNISAN', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '48px',
            color: '#111',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        // 説明テキスト枠
        const instructBg = this.add.rectangle(cx, cy + 20, width * 0.8, 160, 0xffffff);
        instructBg.setStrokeStyle(2, 0xaaaaaa);

        const instructions = [
            '指で左右に動かす',
            '離すと落ちる',
            '同じ文字は合体'
        ];

        this.add.text(cx, cy + 20, instructions, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            color: '#555',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        // STARTボタン
        const btnY = cy + 180;
        const startBtn = this.add.rectangle(cx, btnY, 200, 60, 0x111111)
            .setInteractive({ useHandCursor: true });

        const startText = this.add.text(cx, btnY, 'START', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // ボタンアニメーション（点滅）
        this.tweens.add({
            targets: [startBtn, startText],
            alpha: 0.8,
            yoyo: true,
            repeat: -1,
            duration: 800
        });

        // スタート処理
        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene', { spec: this.spec, fromTitle: true });
        });
    }
}

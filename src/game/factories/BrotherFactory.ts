import { Scene } from 'phaser';
import { Brother } from '../objects/Brother';
import { GameSpec } from '../../spec/loadSpec';

export class BrotherFactory {
    private brotherGroup?: Phaser.Physics.Arcade.Group;

    constructor(private scene: Scene, private spec: GameSpec) { }

    setBrotherGroup(group: Phaser.Physics.Arcade.Group): void {
        this.brotherGroup = group;
    }

    createBrother(x: number, y: number, type: string): Brother {
        // Sprite版はコンストラクタで物理設定が完了するためシンプルに
        const brother = new Brother(this.scene, x, y, type, this.spec);

        if (this.brotherGroup) {
            this.brotherGroup.add(brother);
        }

        return brother;
    }
}

import { Scene } from 'phaser';
import { Brother } from '../objects/Brother';
import { GameSpec } from '../../spec/loadSpec';

export class BrotherFactory {
    private brotherGroup?: Phaser.Physics.Arcade.Group;

    constructor(private scene: Scene, private spec: GameSpec) {}

    // GameScene 側の呼び出し互換のため
    setBrotherGroup(group: Phaser.Physics.Arcade.Group): void {
        this.brotherGroup = group;
    }

    /**
     * Attach physics to brother with proper size and offset
     */
    attachPhysics(brother: Brother): void {
        brother.attachPhysics();
    }

    /**
     * Register brother to the physics group
     */
    registerToGroup(brother: Brother): void {
        if (this.brotherGroup) {
            this.brotherGroup.add(brother);
        }
    }

    createBrother(x: number, y: number, type: string): Brother {
        const brother = new Brother(this.scene, x, y, type, this.spec);
        
        // Always attach physics and register to group
        this.attachPhysics(brother);
        this.registerToGroup(brother);
        
        return brother;
    }
}

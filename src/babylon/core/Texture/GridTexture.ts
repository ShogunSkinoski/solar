import { DynamicTexture, Scene } from "@babylonjs/core";
import { GridTextureConstants } from "../Constants";

export class GridTexture {
    private texture: DynamicTexture;

    constructor(scene: Scene, size: number = GridTextureConstants.SIZE) {
        this.texture = new DynamicTexture('gridTex', { width: size, height: size }, scene, false);
        this.draw(size);
    }

    private draw(size: number): void {
        const ctx = this.texture.getContext();
        ctx.fillStyle = GridTextureConstants.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = GridTextureConstants.GRID_COLOR;
        ctx.lineWidth = GridTextureConstants.LINE_WIDTH;
        const step = size / GridTextureConstants.GRID_DIVISIONS;
        for (let i = 0; i <= size; i += step) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
        }
        this.texture.update();
    }

    public getTexture(): DynamicTexture {
        return this.texture;
    }

    public dispose(): void {
        this.texture.dispose();
    }
}

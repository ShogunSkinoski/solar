import { Vector3 } from '@babylonjs/core';
import { Point2D } from '@/types/rooftop';
import { SceneConstants, CoordinateMapperConstants as C } from '../Constants';

export class CoordinateMapper {
    private canvasW: number;
    private canvasH: number;
    private groundW: number;
    private groundH: number;

    constructor(
        canvasW: number,
        canvasH: number,
        groundW: number = SceneConstants.GROUND_WIDTH,
        groundH: number = SceneConstants.GROUND_HEIGTH
    ) {
        this.canvasW = canvasW;
        this.canvasH = canvasH;
        this.groundW = groundW;
        this.groundH = groundH;
    }

    public setCanvasSize(width: number, height: number): void {
        this.canvasW = width;
        this.canvasH = height;
    }

    public toWorld(px: number, py: number): Vector3 {
        return new Vector3(
            (px / this.canvasW - 0.5) * this.groundW,
            0,
            -((py / this.canvasH - 0.5) * this.groundH)
        );
    }

    public centroid(footprint: Point2D[]): Vector3 {
        const cx = footprint.reduce((s, p) => s + p.x, 0) / footprint.length;
        const cy = footprint.reduce((s, p) => s + p.y, 0) / footprint.length;
        return this.toWorld(cx, cy);
    }

    public size(footprint: Point2D[]): { width: number; depth: number } {
        const xs = footprint.map((p) => p.x);
        const ys = footprint.map((p) => p.y);
        return {
            width: Math.max(((Math.max(...xs) - Math.min(...xs)) / this.canvasW) * this.groundW, C.MIN_SIZE),
            depth: Math.max(((Math.max(...ys) - Math.min(...ys)) / this.canvasH) * this.groundH, C.MIN_SIZE),
        };
    }
}

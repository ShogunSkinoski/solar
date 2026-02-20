import { Vector3 } from "@babylonjs/core";
import { Point2D } from "@/types/rooftop";
import { PlanViewConstants as P } from "../Constants";

export class GeometryUtils {
    public static footprintBounds(footprint: Point2D[]): { cx: number; cz: number; w: number; d: number } {
        const xs = footprint.map((p) => p.x);
        const ys = footprint.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            cx: (minX + maxX) / 2,
            cz: (minY + maxY) / 2,
            w: Math.max(maxX - minX, 0.1),
            d: Math.max(maxY - minY, 0.1),
        };
    }

    public static resizeCornerAnchored(
        orig: Point2D[],
        cornerIndex: number,
        groundPick: Vector3,
        startWorld: Vector3,
        rot: number,
        toWorld: (px: number, py: number, cx: number, cz: number) => { x: number, z: number },
        toLocalDir: (dx: number, dz: number) => { x: number, z: number }
    ): Point2D[] {
        const bounds = this.footprintBounds(orig);
        const oppIndex = (cornerIndex + 2) % 4;

        const oppLocal = orig[oppIndex];
        const oppWorld = toWorld(oppLocal.x, oppLocal.y, bounds.cx, bounds.cz);

        const cornerLocal = orig[cornerIndex];
        const cornerWorldStart = toWorld(cornerLocal.x, cornerLocal.y, bounds.cx, bounds.cz);

        const deltaMouseX = groundPick.x - startWorld.x;
        const deltaMouseZ = groundPick.z - startWorld.z;

        const targetCornerWorldX = cornerWorldStart.x + deltaMouseX;
        const targetCornerWorldZ = cornerWorldStart.z + deltaMouseZ;

        let dxWorld = targetCornerWorldX - oppWorld.x;
        let dzWorld = targetCornerWorldZ - oppWorld.z;

        let localDir = toLocalDir(dxWorld, dzWorld);

        if (P.SNAP_INTERVAL > 0) {
            localDir.x = Math.round(localDir.x / P.SNAP_INTERVAL) * P.SNAP_INTERVAL;
            localDir.z = Math.round(localDir.z / P.SNAP_INTERVAL) * P.SNAP_INTERVAL;
        }

        const minSize = 0.5;
        if (Math.abs(localDir.x) < minSize) localDir.x = Math.sign(localDir.x || 1) * minSize;
        if (Math.abs(localDir.z) < minSize) localDir.z = Math.sign(localDir.z || 1) * minSize;

        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const newDragWorldX = oppWorld.x + (localDir.x * cos + localDir.z * sin);
        const newDragWorldZ = oppWorld.z + (-localDir.x * sin + localDir.z * cos);

        const newCx = (oppWorld.x + newDragWorldX) / 2;
        const newCz = (oppWorld.z + newDragWorldZ) / 2;

        const halfW = Math.abs(localDir.x) / 2;
        const halfD = Math.abs(localDir.z) / 2;

        const minX = newCx - halfW;
        const maxX = newCx + halfW;
        const minY = newCz - halfD;
        const maxY = newCz + halfD;

        return [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
        ];
    }

    public static resizeEdgeAnchored(
        orig: Point2D[],
        edgeIndex: number,
        groundPick: Vector3,
        startWorld: Vector3,
        rot: number,
        toWorld: (px: number, py: number, cx: number, cz: number) => { x: number, z: number },
        toLocalDir: (dx: number, dz: number) => { x: number, z: number }
    ): Point2D[] {
        const bounds = this.footprintBounds(orig);

        const oppEdgeIndex = (edgeIndex + 2) % 4;
        const p1 = orig[oppEdgeIndex];
        const p2 = orig[(oppEdgeIndex + 1) % 4];

        const oppLocalX = (p1.x + p2.x) / 2;
        const oppLocalZ = (p1.y + p2.y) / 2;
        const oppWorld = toWorld(oppLocalX, oppLocalZ, bounds.cx, bounds.cz);

        const m1 = orig[edgeIndex];
        const m2 = orig[(edgeIndex + 1) % 4];
        const midLocalX = (m1.x + m2.x) / 2;
        const midLocalZ = (m1.y + m2.y) / 2;
        const midWorldStart = toWorld(midLocalX, midLocalZ, bounds.cx, bounds.cz);

        const deltaMouseX = groundPick.x - startWorld.x;
        const deltaMouseZ = groundPick.z - startWorld.z;

        const targetMidWorldX = midWorldStart.x + deltaMouseX;
        const targetMidWorldZ = midWorldStart.z + deltaMouseZ;

        let dxWorld = targetMidWorldX - oppWorld.x;
        let dzWorld = targetMidWorldZ - oppWorld.z;

        let localDir = toLocalDir(dxWorld, dzWorld);

        if (P.SNAP_INTERVAL > 0) {
            localDir.x = Math.round(localDir.x / P.SNAP_INTERVAL) * P.SNAP_INTERVAL;
            localDir.z = Math.round(localDir.z / P.SNAP_INTERVAL) * P.SNAP_INTERVAL;
        }

        const minSize = 0.5;
        let newWidth = bounds.w;
        let newDepth = bounds.d;

        if (edgeIndex === 0 || edgeIndex === 2) {
            newDepth = Math.abs(localDir.z);
            if (newDepth < minSize) newDepth = minSize;
            localDir.x = 0;
            localDir.z = Math.sign(localDir.z || 1) * newDepth;
        } else {
            newWidth = Math.abs(localDir.x);
            if (newWidth < minSize) newWidth = minSize;
            localDir.z = 0;
            localDir.x = Math.sign(localDir.x || 1) * newWidth;
        }

        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const newDragWorldX = oppWorld.x + (localDir.x * cos + localDir.z * sin);
        const newDragWorldZ = oppWorld.z + (-localDir.x * sin + localDir.z * cos);

        const newCx = (oppWorld.x + newDragWorldX) / 2;
        const newCz = (oppWorld.z + newDragWorldZ) / 2;

        const halfW = newWidth / 2;
        const halfD = newDepth / 2;

        const minX = newCx - halfW;
        const maxX = newCx + halfW;
        const minY = newCz - halfD;
        const maxY = newCz + halfD;

        return [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
        ];
    }
}

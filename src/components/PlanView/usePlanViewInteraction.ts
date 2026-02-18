'use client';

import { useRef, useCallback } from 'react';
import { useRooftopStore } from '@/store/rooftopStore';
import { Building, ControlPoint, Point2D } from '@/types/rooftop';

const CORNER_HANDLE_SIZE = 8;
const MIDPOINT_HANDLE_SIZE = 6;
const HIT_RADIUS = 12;

export function getControlPoints(building: Building): ControlPoint[] {
    const pts = building.footprint;
    const n = pts.length;
    const cps: ControlPoint[] = [];

    for (let i = 0; i < n; i++) {
        cps.push({
            id: `${building.id}-corner-${i}`,
            x: pts[i].x,
            y: pts[i].y,
            type: 'corner',
            index: i,
        });
    }

    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        cps.push({
            id: `${building.id}-mid-${i}`,
            x: (pts[i].x + pts[next].x) / 2,
            y: (pts[i].y + pts[next].y) / 2,
            type: 'midpoint',
            index: i,
        });
    }

    return cps;
}

function hitTestControlPoint(cp: ControlPoint, x: number, y: number): boolean {
    const dx = cp.x - x;
    const dy = cp.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS;
}

function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect =
            yi > point.y !== yj > point.y &&
            point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Corner layout (index):
 *   0 (TL) --- 1 (TR)
 *   |               |
 *   3 (BL) --- 2 (BR)
 */
function resizeRectFootprint(
    orig: Point2D[],
    cornerIndex: number,
    newX: number,
    newY: number
): Point2D[] {
    const opposite = (cornerIndex + 2) % 4;
    const ox = orig[opposite].x;
    const oy = orig[opposite].y;

    const minX = Math.min(newX, ox);
    const maxX = Math.max(newX, ox);
    const minY = Math.min(newY, oy);
    const maxY = Math.max(newY, oy);

    return [
        { x: minX, y: minY }, // TL
        { x: maxX, y: minY }, // TR
        { x: maxX, y: maxY }, // BR
        { x: minX, y: maxY }, // BL
    ];
}

function moveEdgeFootprint(
    orig: Point2D[],
    edgeIndex: number,
    dx: number,
    dy: number
): Point2D[] {
    const fp = orig.map((p) => ({ ...p }));
    switch (edgeIndex) {
        case 0: fp[0].y += dy; fp[1].y += dy; break;
        case 1: fp[1].x += dx; fp[2].x += dx; break;
        case 2: fp[2].y += dy; fp[3].y += dy; break;
        case 3: fp[3].x += dx; fp[0].x += dx; break;
    }
    return fp;
}

interface DragState {
    type: 'corner' | 'midpoint' | 'building' | null;
    buildingId: string;
    controlPointIndex: number;
    startX: number;
    startY: number;
    originalFootprint: Point2D[];
}

export function usePlanViewInteraction(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    scale: number,
    offset: Point2D
) {
    const dragRef = useRef<DragState | null>(null);
    const { buildings, selectedBuildingId, addBuilding, updateBuildingFootprint, selectBuilding } =
        useRooftopStore();

    const canvasToWorld = useCallback(
        (cx: number, cy: number): Point2D => ({
            x: (cx - offset.x) / scale,
            y: (cy - offset.y) / scale,
        }),
        [scale, offset]
    );

    const getCanvasPos = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>): Point2D => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        },
        [canvasRef]
    );

    const onMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const pos = getCanvasPos(e);

            if (selectedBuildingId) {
                const selBuilding = buildings.find((b) => b.id === selectedBuildingId);
                if (selBuilding) {
                    const cps = getControlPoints(selBuilding);
                    for (const cp of cps) {
                        const cpCanvas = {
                            x: cp.x * scale + offset.x,
                            y: cp.y * scale + offset.y,
                        };
                        if (hitTestControlPoint({ ...cp, ...cpCanvas }, pos.x, pos.y)) {
                            dragRef.current = {
                                type: cp.type,
                                buildingId: selBuilding.id,
                                controlPointIndex: cp.index,
                                startX: pos.x,
                                startY: pos.y,
                                originalFootprint: selBuilding.footprint.map((p) => ({ ...p })),
                            };
                            return;
                        }
                    }
                }
            }

            const worldPos = canvasToWorld(pos.x, pos.y);
            for (let i = buildings.length - 1; i >= 0; i--) {
                const b = buildings[i];
                if (pointInPolygon(worldPos, b.footprint)) {
                    selectBuilding(b.id);
                    dragRef.current = {
                        type: 'building',
                        buildingId: b.id,
                        controlPointIndex: -1,
                        startX: pos.x,
                        startY: pos.y,
                        originalFootprint: b.footprint.map((p) => ({ ...p })),
                    };
                    return;
                }
            }

            selectBuilding(null);
            const DEFAULT_W = 120 / scale;
            const DEFAULT_H = 90 / scale;
            const cx = worldPos.x;
            const cy = worldPos.y;
            addBuilding([
                { x: cx - DEFAULT_W / 2, y: cy - DEFAULT_H / 2 }, // TL
                { x: cx + DEFAULT_W / 2, y: cy - DEFAULT_H / 2 }, // TR
                { x: cx + DEFAULT_W / 2, y: cy + DEFAULT_H / 2 }, // BR
                { x: cx - DEFAULT_W / 2, y: cy + DEFAULT_H / 2 }, // BL
            ]);
        },
        [buildings, selectedBuildingId, scale, offset, getCanvasPos, canvasToWorld, addBuilding, selectBuilding]
    );

    const onMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.type === null) return;

            const pos = getCanvasPos(e);
            const dx = (pos.x - drag.startX) / scale;
            const dy = (pos.y - drag.startY) / scale;

            const building = buildings.find((b) => b.id === drag.buildingId);
            if (!building) return;

            const orig = drag.originalFootprint;

            if (drag.type === 'corner') {
                const origCorner = orig[drag.controlPointIndex];
                const newX = origCorner.x + dx;
                const newY = origCorner.y + dy;
                const newFootprint = resizeRectFootprint(orig, drag.controlPointIndex, newX, newY);
                updateBuildingFootprint(drag.buildingId, newFootprint);
            } else if (drag.type === 'midpoint') {
                const newFootprint = moveEdgeFootprint(orig, drag.controlPointIndex, dx, dy);
                updateBuildingFootprint(drag.buildingId, newFootprint);
            } else if (drag.type === 'building') {
                const newFootprint = orig.map((p) => ({
                    x: p.x + dx,
                    y: p.y + dy,
                }));
                updateBuildingFootprint(drag.buildingId, newFootprint);
            }
        },
        [buildings, scale, getCanvasPos, updateBuildingFootprint]
    );

    const onMouseUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    return { onMouseDown, onMouseMove, onMouseUp };
}

export { CORNER_HANDLE_SIZE, MIDPOINT_HANDLE_SIZE };

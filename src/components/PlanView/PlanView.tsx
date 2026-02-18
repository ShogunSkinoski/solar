'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useRooftopStore } from '@/store/rooftopStore';
import { Building, Point2D } from '@/types/rooftop';
import {
    usePlanViewInteraction,
    getControlPoints,
    CORNER_HANDLE_SIZE,
    MIDPOINT_HANDLE_SIZE,
} from './usePlanViewInteraction';

const BUILDING_FILL = 'rgba(180, 100, 80, 0.65)';
const BUILDING_FILL_SELECTED = 'rgba(200, 120, 90, 0.75)';
const BUILDING_STROKE = 'rgba(220, 140, 100, 0.9)';
const RIDGE_DASH = [8, 6];
const GRID_COLOR = 'rgba(255,255,255,0.08)';
const GRID_SPACING = 50;
const AXIS_LENGTH = 48;
const AXIS_ARROW = 8;

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, offset: Point2D, scale: number) {
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const spacing = GRID_SPACING * scale;
    const startX = ((offset.x % spacing) + spacing) % spacing;
    const startY = ((offset.y % spacing) + spacing) % spacing;
    for (let x = startX; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = startY; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    ctx.restore();
}

function worldToCanvas(p: Point2D, scale: number, offset: Point2D): Point2D {
    return { x: p.x * scale + offset.x, y: p.y * scale + offset.y };
}

function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const pad = 20;
    const ox = pad;
    const oy = h - pad;

    const drawArrow = (color: string, tx: number, ty: number, label: string) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.85;

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + tx, oy + ty);
        ctx.stroke();

        const angle = Math.atan2(ty, tx);
        ctx.beginPath();
        ctx.moveTo(ox + tx, oy + ty);
        ctx.lineTo(
            ox + tx - AXIS_ARROW * Math.cos(angle - Math.PI / 6),
            oy + ty - AXIS_ARROW * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            ox + tx - AXIS_ARROW * Math.cos(angle + Math.PI / 6),
            oy + ty - AXIS_ARROW * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(label, ox + tx + 4, oy + ty + 4);
        ctx.restore();
    };

    drawArrow('rgba(255, 60, 60, 0.9)', AXIS_LENGTH, 0, 'X');
    drawArrow('rgba(60, 120, 255, 0.9)', 0, -AXIS_LENGTH, 'Z');
}

function drawBuilding(
    ctx: CanvasRenderingContext2D,
    building: Building,
    isSelected: boolean,
    scale: number,
    offset: Point2D
) {
    const pts = building.footprint.map((p) => worldToCanvas(p, scale, offset));
    if (pts.length < 3) return;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = isSelected ? BUILDING_FILL_SELECTED : BUILDING_FILL;
    ctx.fill();

    // Draw outline
    ctx.strokeStyle = BUILDING_STROKE;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.stroke();

    if (building.roofType === 'gable' && pts.length === 4) {
        const midTop = {
            x: (pts[0].x + pts[1].x) / 2,
            y: (pts[0].y + pts[1].y) / 2,
        };
        const midBottom = {
            x: (pts[2].x + pts[3].x) / 2,
            y: (pts[2].y + pts[3].y) / 2,
        };
        ctx.beginPath();
        ctx.setLineDash(RIDGE_DASH);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(midTop.x, midTop.y);
        ctx.lineTo(midBottom.x, midBottom.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (isSelected) {
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

function drawControlPoints(
    ctx: CanvasRenderingContext2D,
    building: Building,
    scale: number,
    offset: Point2D
) {
    const cps = getControlPoints(building);
    ctx.save();
    for (const cp of cps) {
        const canvas = worldToCanvas(cp, scale, offset);
        if (cp.type === 'corner') {
            const s = CORNER_HANDLE_SIZE;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            ctx.fillRect(canvas.x - s / 2, canvas.y - s / 2, s, s);
            ctx.strokeRect(canvas.x - s / 2, canvas.y - s / 2, s, s);
        } else {
            const r = MIDPOINT_HANDLE_SIZE;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(canvas.x, canvas.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
    ctx.restore();
}

export default function PlanView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const [scale] = useState(1);
    const [offset] = useState<Point2D>({ x: 0, y: 0 });

    const { buildings, selectedBuildingId } = useRooftopStore();
    const { onMouseDown, onMouseMove, onMouseUp } = usePlanViewInteraction(
        canvasRef,
        scale,
        offset
    );
    const setPlanViewSize = useRooftopStore((s) => s.setPlanViewSize);

    // Load background aerial image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/1280px-GoldenGateBridge-001.jpg';
        img.onload = () => {
            bgImageRef.current = img;
            redraw();
        };

    }, []);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (bgImageRef.current) {
            ctx.drawImage(bgImageRef.current, 0, 0, w, h);
        } else {
            ctx.fillStyle = '#3a4a3a';
            ctx.fillRect(0, 0, w, h);
        }

        drawGrid(ctx, w, h, offset, scale);
        drawAxes(ctx, w, h);

        for (const building of buildings) {
            const isSelected = building.id === selectedBuildingId;
            drawBuilding(ctx, building, isSelected, scale, offset);
            if (isSelected) {
                drawControlPoints(ctx, building, scale, offset);
            }
        }
    }, [buildings, selectedBuildingId, scale, offset]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            setPlanViewSize(container.clientWidth, container.clientHeight);
            redraw();
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        return () => ro.disconnect();
    }, [redraw]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    return (
        <div ref={containerRef} className="plan-view-canvas-container">
            <canvas
                ref={canvasRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                style={{ cursor: 'crosshair', display: 'block', width: '100%', height: '100%' }}
            />
        </div>
    );
}

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useRooftopStore } from '@/store/rooftopStore';
import { Building } from '@/types/rooftop';

type Direction = 'West' | 'North' | 'East' | 'South';
const DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];

function isRidgeView(dir: Direction) {
    return dir === 'West' || dir === 'East';
}

type DragType = 'wall' | 'ridge';

interface DragState {
    type: DragType;
    startY: number;
    startValue: number;
}

function drawElevation(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    building: Building,
    direction: Direction,
    footprintW: number,
    footprintD: number,
) {
    ctx.clearRect(0, 0, w, h);

    const wallH = building.roofHeight;
    const ridgeH = building.ridgeHeight;
    const totalH = wallH + ridgeH;
    const isGable = building.roofType === 'gable';

    const pad = { left: 64, right: 16, top: 20, bottom: 36 };
    const drawW = w - pad.left - pad.right;
    const drawH = h - pad.top - pad.bottom;

    const scale = drawH / Math.max(totalH, 0.1);
    const wallPx = wallH * scale;
    const ridgePx = ridgeH * scale;

    const bx = pad.left;
    const by = pad.top;
    const bw = drawW;
    const wallBot = by + drawH;
    const wallTop = isGable ? by + ridgePx : wallBot - wallPx;

    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(245,166,35,0.5)';
    ctx.lineWidth = 1;

    const topLine = isGable ? by : wallTop;
    ctx.beginPath();
    ctx.moveTo(0, topLine);
    ctx.lineTo(w, topLine);
    ctx.stroke();

    if (isGable) {
        ctx.beginPath();
        ctx.moveTo(0, wallTop);
        ctx.lineTo(w, wallTop);
        ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    const totalM = Math.round(totalH);
    const wallM = Math.round(wallH);

    if (isGable) {
        drawPill(ctx, 4, by - 8, `${totalM} m`);
        drawPill(ctx, 4, wallTop - 8, `${wallM} m`);
    } else {
        drawPill(ctx, 4, wallTop - 8, `${wallM} m`);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(80,90,110,0.85)';
    ctx.strokeStyle = 'rgba(140,155,180,0.9)';
    ctx.lineWidth = 1.5;

    if (isGable && ridgeH > 0) {
        if (isRidgeView(direction)) {
            ctx.beginPath();
            ctx.moveTo(bx, wallTop);
            ctx.lineTo(bx + bw / 2, by);
            ctx.lineTo(bx + bw, wallTop);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const halfSpanR = footprintD / 2;
            const pitchDegR = Math.round(Math.atan2(ridgeH, halfSpanR) * 180 / Math.PI);
            const spanMmR = Math.round(Math.sqrt(ridgeH ** 2 + halfSpanR ** 2) * 1000);
            drawBadge(ctx, bx + bw / 2, by / 2, `${pitchDegR}°  ${spanMmR}mm`);
        } else {
            ctx.beginPath();
            ctx.moveTo(bx, wallTop);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + bw, by);
            ctx.lineTo(bx + bw, wallTop);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const halfSpan = footprintD / 2;
            const pitchDeg = Math.round(Math.atan2(ridgeH, halfSpan) * 180 / Math.PI);
            const spanMm = Math.round(Math.sqrt(ridgeH ** 2 + halfSpan ** 2) * 1000);
            drawBadge(ctx, bx + bw / 2, (by + wallTop) / 2, `${pitchDeg}°  ${spanMm}mm`);
        }
    } else {
        ctx.beginPath();
        ctx.rect(bx, wallTop, bw, wallPx);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(55,65,80,0.9)';
    ctx.beginPath();
    ctx.rect(bx, wallTop, bw, wallPx);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(200,200,200,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, wallBot);
    ctx.lineTo(bx + bw, wallBot);
    ctx.stroke();

    const handleR = 5;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#f5a623';
    ctx.lineWidth = 2;

    const wallHandleX = bx + bw / 2;
    const wallHandleY = wallTop - (isGable ? 0 : 0);

    if (!isGable) {
        ctx.beginPath();
        ctx.arc(wallHandleX, wallHandleY, handleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else {
        const ridgeHandleX = bx + bw / 2;
        const ridgeHandleY = by;

        ctx.beginPath();
        ctx.arc(ridgeHandleX, ridgeHandleY, handleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isRidgeView(direction)) {
            const wallY = wallBot - wallPx;
            ctx.beginPath();
            ctx.arc(wallHandleX, wallY, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            const wallY = wallBot - wallPx;
            ctx.beginPath();
            ctx.arc(bx, wallY, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(bx + bw, wallY, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    const pad = 5;
    ctx.font = '10px sans-serif';
    const tw = ctx.measureText(text).width;
    const pw = tw + pad * 2;
    const ph = 16;
    ctx.fillStyle = '#f5a623';
    roundRect(ctx, x, y, pw, ph, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + pad, y + ph - 4);
}

function drawBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string) {
    ctx.font = 'bold 11px sans-serif';
    const tw = ctx.measureText(text).width;
    const pw = tw + 14;
    const ph = 20;
    ctx.fillStyle = 'rgba(40,44,55,0.92)';
    roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 6);
    ctx.fill();
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, cy + 4);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function SilhouetteIcon({ building, direction, active }: { building: Building; direction: Direction; active: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = active ? '#f5a623' : 'rgba(140,155,180,0.7)';
        const isGable = building.roofType === 'gable';
        const wallH = h * 0.45;
        const roofH = isGable ? h * 0.3 : 0;
        const bx = 4, bw = w - 8, by = h - wallH - roofH - 2;
        if (isGable && isRidgeView(direction)) {
            ctx.beginPath();
            ctx.moveTo(bx, by + roofH);
            ctx.lineTo(bx + bw / 2, by);
            ctx.lineTo(bx + bw, by + roofH);
            ctx.lineTo(bx + bw, by + roofH + wallH);
            ctx.lineTo(bx, by + roofH + wallH);
            ctx.closePath();
        } else {
            ctx.beginPath();
            ctx.rect(bx, by + roofH, bw, wallH);
        }
        ctx.fill();
    }, [building, direction, active]);
    return <canvas ref={canvasRef} width={36} height={28} style={{ display: 'block' }} />;
}

export default function ElevationsPanel() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeDir, setActiveDir] = useState<Direction>('North');

    const { buildings, selectedBuildingId, updateBuildingProps, deleteBuilding } = useRooftopStore();
    const building = buildings.find((b) => b.id === selectedBuildingId) ?? null;

    const handleDelete = () => {
        if (selectedBuildingId) {
            deleteBuilding(selectedBuildingId);
        }
    };

    const footprintW = building
        ? Math.max(...building.footprint.map(p => p.x)) - Math.min(...building.footprint.map(p => p.x))
        : 6;
    const footprintD = building
        ? Math.max(...building.footprint.map(p => p.y)) - Math.min(...building.footprint.map(p => p.y))
        : 6;

    const redrawRef = useRef<() => void>(() => { });

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (!building) {
            ctx.fillStyle = '#1a1a22';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Select a building to see elevations', canvas.width / 2, canvas.height / 2);
            return;
        }
        drawElevation(ctx, canvas.width, canvas.height, building, activeDir, footprintW, footprintD);
    }, [building, activeDir, footprintW, footprintD]);

    redrawRef.current = redraw;

    useEffect(() => {
        redraw();
    }, [redraw]);

    const [dragState, setDragState] = useState<DragState | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!building) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const w = canvas.width;
        const h = canvas.height;
        const pad = { left: 64, right: 16, top: 20, bottom: 36 };
        const drawH = h - pad.top - pad.bottom;
        const drawW = w - pad.left - pad.right;
        const totalH = building.roofHeight + building.ridgeHeight;
        const scale = drawH / Math.max(totalH, 0.1);

        const wallPx = building.roofHeight * scale;
        const ridgePx = building.ridgeHeight * scale;

        const bx = pad.left;
        const by = pad.top;
        const wallBot = by + drawH;

        const isGable = building.roofType === 'gable';

        if (isGable) {
            const ridgeHandleX = bx + drawW / 2;
            const ridgeHandleY = by;

            if (Math.hypot(x - ridgeHandleX, y - ridgeHandleY) < 15) {
                setDragState({
                    type: 'ridge',
                    startY: e.clientY,
                    startValue: building.ridgeHeight
                });
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                return;
            }

            const wallY = wallBot - wallPx;
            let hitWall = false;

            if (isRidgeView(activeDir)) {
                if (Math.hypot(x - (bx + drawW / 2), y - wallY) < 15) hitWall = true;
            } else {
                if (Math.hypot(x - bx, y - wallY) < 15) hitWall = true;
                if (Math.hypot(x - (bx + drawW), y - wallY) < 15) hitWall = true;
            }

            if (hitWall) {
                setDragState({
                    type: 'wall',
                    startY: e.clientY,
                    startValue: building.roofHeight
                });
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                return;
            }

        } else {
            const wallHandleX = bx + drawW / 2;
            const wallHandleY = wallBot - wallPx;

            if (Math.hypot(x - wallHandleX, y - wallHandleY) < 15) {
                setDragState({
                    type: 'wall',
                    startY: e.clientY,
                    startValue: building.roofHeight
                });
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                return;
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dragState || !building) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            return;
        }

        const dy = e.clientY - dragState.startY;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const h = canvas.height;
        const pad = { left: 64, right: 16, top: 20, bottom: 36 };
        const drawH = h - pad.top - pad.bottom;
        const totalH = building.roofHeight + building.ridgeHeight;

        const scale = drawH / Math.max(totalH, 0.1);
        const deltaM = -dy / scale;
        if (dragState.type === 'ridge') {
            const rawH = dragState.startValue + deltaM;
            const newH = Math.min(Math.max(0.1, rawH), 5.0);
            updateBuildingProps(building.id, { ridgeHeight: newH });
        } else {
            const rawH = dragState.startValue + deltaM;
            const newH = Math.min(Math.max(0.5, rawH), 15.0);
            updateBuildingProps(building.id, { roofHeight: newH });
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        setDragState(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => redrawRef.current());
        ro.observe(container);
        return () => ro.disconnect();
    }, []);


    const wallH = building?.roofHeight ?? 3;
    const ridgeH = building?.ridgeHeight ?? 0.5;

    return (
        <div className="elev-panel">
            <div className="panel-header">
                <span>Elevations</span>
                <div className="panel-header-actions">
                    {building && (
                        <button
                            className="panel-header-btn"
                            title="Delete Building"
                            onClick={handleDelete}
                            style={{ marginRight: '8px', color: '#ff4d4f' }}
                        >
                            🗑
                        </button>
                    )}
                    <button className="panel-header-btn" title="Expand">⤢</button>
                </div>
            </div>

            <div className="elev-body">
                <div className="elev-diagram" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: dragState ? 'ns-resize' : 'default' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    />
                </div>
            </div>

            <div className="elev-tabs">
                {DIRECTIONS.map((dir) => (
                    <button
                        key={dir}
                        className={`elev-tab${activeDir === dir ? ' active' : ''}`}
                        onClick={() => setActiveDir(dir)}
                    >
                        {building
                            ? <SilhouetteIcon building={building} direction={dir} active={activeDir === dir} />
                            : <div className="elev-tab-placeholder" />
                        }
                        <span>{dir}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

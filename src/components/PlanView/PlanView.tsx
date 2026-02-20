'use client';

import { useRef, useEffect } from 'react';
import { useRooftopStore } from '@/store/rooftopStore';
import { PlanSceneManager } from '@/babylon/core/Scene/PlanSceneManager';
import { PlanViewConstants as P } from '@/babylon/core/Constants';
import { Vector3 } from '@babylonjs/core';

export default function PlanView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const managerRef = useRef<PlanSceneManager | null>(null);

    const {
        buildings,
        selectedBuildingId,
        activeRoofType,
        isPlacing,
        addBuilding,
        selectBuilding,
        updateBuildingFootprint,
    } = useRooftopStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const mgr = new PlanSceneManager(canvas);
        managerRef.current = mgr;

        mgr.onGroundClick = (worldPos: Vector3) => {
            const { isPlacing } = useRooftopStore.getState();
            if (!isPlacing) return;

            const hw = P.DEFAULT_WIDTH / 2;
            const hd = P.DEFAULT_DEPTH / 2;
            const cx = worldPos.x;
            const cz = worldPos.z;

            addBuilding([
                { x: cx - hw, y: cz - hd },
                { x: cx + hw, y: cz - hd },
                { x: cx + hw, y: cz + hd },
                { x: cx - hw, y: cz + hd },
            ]);
        };

        mgr.onBuildingClick = (buildingId: string) => {
            selectBuilding(buildingId);
        };

        mgr.onFootprintUpdate = (buildingId: string, newFootprint) => {
            updateBuildingFootprint(buildingId, newFootprint);
        };

        mgr.onDragEnd = () => {
        };

        mgr.onRotationUpdate = (id, rotation) => {
            const { updateBuildingProps } = useRooftopStore.getState();
            updateBuildingProps(id, { rotation });
        };

        mgr.startRenderLoop();

        return () => {
            mgr.dispose();
            managerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        managerRef.current?.syncBuildings(buildings, selectedBuildingId);
    }, [buildings, selectedBuildingId]);

    useEffect(() => {
        managerRef.current?.setPlacementMode(isPlacing, activeRoofType);
    }, [isPlacing, activeRoofType]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            managerRef.current?.resize();
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="plan-view-canvas-container">
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%', outline: 'none' }}
            />
        </div>
    );
}

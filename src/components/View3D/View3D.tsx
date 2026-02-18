'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/babylon/core/Scene/SceneManager';
import { BuildingManager } from '@/babylon/core/Building/BuildingManager';
import { CoordinateMapper } from '@/babylon/core/Scene/CoordinateMapper';
import { useRooftopStore } from '@/store/rooftopStore';
import { Building } from '@/types/rooftop';

function syncBuildings(
    buildings: Building[],
    selectedBuildingId: string | null,
    bm: BuildingManager,
    mapper: CoordinateMapper
): void {
    const storeIds = new Set(buildings.map((b) => b.id));
    bm.getAll().forEach((b) => {
        if (!storeIds.has(b.id)) bm.remove(b.id);
    });

    buildings.forEach((storeBldg) => {
        if (storeBldg.footprint.length < 3) return;

        const size = mapper.size(storeBldg.footprint);
        const position = mapper.centroid(storeBldg.footprint);
        const wallHeight = storeBldg.roofHeight;
        const roofHeight = storeBldg.roofHeight + storeBldg.ridgeHeight;
        const existing = bm.get(storeBldg.id);

        if (existing) {
            existing.update({ size, wallHeight, roofHeight, position });
        } else {
            bm.create({
                id: storeBldg.id,
                type: storeBldg.roofType,
                position,
                size,
                wallHeight,
                roofHeight,
            });
        }
    });

    if (selectedBuildingId) {
        bm.select(selectedBuildingId);
    } else {
        bm.clearSelection();
    }
}

export default function View3D() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneManagerRef = useRef<SceneManager | null>(null);

    const { buildings, selectedBuildingId, planViewSize } = useRooftopStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const manager = new SceneManager(canvas, 'perspective', planViewSize);
        manager.initialize();
        sceneManagerRef.current = manager;

        manager.startRenderLoop();

        const handleResize = () => manager.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            manager.dispose();
            sceneManagerRef.current = null;
        };
    }, []);

    useEffect(() => {
        sceneManagerRef.current?.updateCanvasSize(planViewSize.width, planViewSize.height);
    }, [planViewSize]);

    useEffect(() => {
        const manager = sceneManagerRef.current;
        if (!manager) return;

        syncBuildings(
            buildings,
            selectedBuildingId,
            manager.getBuildingManager(),
            manager.getMapper()
        );
    }, [buildings, selectedBuildingId, planViewSize]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
        />
    );
}

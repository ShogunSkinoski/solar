'use client';

import { useEffect, useRef } from 'react';
import { SceneManager } from '@/babylon/core/Scene/SceneManager';
import { BuildingManager } from '@/babylon/core/Building/BuildingManager';
import { useRooftopStore } from '@/store/rooftopStore';
import { Building } from '@/types/rooftop';
import { Vector3 } from '@babylonjs/core';

function syncBuildings(
    buildings: Building[],
    selectedBuildingId: string | null,
    bm: BuildingManager
): void {
    const storeIds = new Set(buildings.map((b) => b.id));
    bm.getAll().forEach((b) => {
        if (!storeIds.has(b.id)) bm.remove(b.id);
    });

    buildings.forEach((storeBldg) => {
        if (storeBldg.footprint.length < 3) return;

        const xs = storeBldg.footprint.map((p) => p.x);
        const ys = storeBldg.footprint.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const size = {
            width: Math.max(maxX - minX, 0.1),
            depth: Math.max(maxY - minY, 0.1),
        };
        const position = new Vector3(
            (minX + maxX) / 2,
            0,
            (minY + maxY) / 2
        );
        const wallHeight = storeBldg.roofHeight;
        const roofHeight = storeBldg.roofHeight + storeBldg.ridgeHeight;
        const rotation = storeBldg.rotation;
        const existing = bm.get(storeBldg.id);

        if (existing) {
            existing.update({ size, wallHeight, roofHeight, position, rotation });
        } else {
            bm.create({
                id: storeBldg.id,
                type: storeBldg.roofType,
                position,
                size,
                wallHeight,
                roofHeight,
                rotation,
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

    const { buildings, selectedBuildingId } = useRooftopStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const manager = new SceneManager(canvas, 'perspective');
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
        const manager = sceneManagerRef.current;
        if (!manager) return;

        syncBuildings(
            buildings,
            selectedBuildingId,
            manager.getBuildingManager()
        );
    }, [buildings, selectedBuildingId]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
        />
    );
}

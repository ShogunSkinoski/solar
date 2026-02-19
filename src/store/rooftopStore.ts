import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Building, RoofType, Point2D } from '@/types/rooftop';

interface RooftopState {
    buildings: Building[];
    selectedBuildingId: string | null;
    activeRoofType: RoofType;
    isPlacing: boolean;
    planViewSize: { width: number; height: number };
}

interface RooftopActions {
    addBuilding: (footprint: Point2D[]) => void;
    updateBuildingFootprint: (id: string, footprint: Point2D[]) => void;
    updateBuildingProps: (id: string, patch: Partial<Pick<Building, 'roofHeight' | 'ridgeHeight' | 'roofType' | 'rotation'>>) => void;
    selectBuilding: (id: string | null) => void;
    setActiveRoofType: (type: RoofType) => void;
    setRoofTypeForBuilding: (id: string, type: RoofType) => void;
    deleteBuilding: (id: string) => void;
    setPlanViewSize: (width: number, height: number) => void;
}

type RooftopStore = RooftopState & RooftopActions;

let buildingCounter = 0;

export const useRooftopStore = create<RooftopStore>()(
    immer((set) => ({
        buildings: [],
        selectedBuildingId: null,
        activeRoofType: 'flat',
        isPlacing: false,
        planViewSize: { width: 800, height: 600 },

        addBuilding: (footprint) =>
            set((state) => {
                const id = `building-${++buildingCounter}`;
                state.buildings.push({
                    id,
                    footprint,
                    roofType: state.activeRoofType,
                    roofHeight: 3,
                    ridgeHeight: 0.5,
                    width: 0,
                    heigth: 0,
                    rotation: 0,
                });
                state.selectedBuildingId = id;
                state.isPlacing = false;
            }),

        updateBuildingFootprint: (id, footprint) =>
            set((state) => {
                const building = state.buildings.find((b) => b.id === id);
                if (building) {
                    building.footprint = footprint;
                }
            }),

        updateBuildingProps: (id, patch) =>
            set((state) => {
                const building = state.buildings.find((b) => b.id === id);
                if (building) Object.assign(building, patch);
            }),

        selectBuilding: (id) =>
            set((state) => {
                state.selectedBuildingId = id;
                if (id) {
                    const b = state.buildings.find((b) => b.id === id);
                    if (b) state.activeRoofType = b.roofType;
                }
            }),

        setActiveRoofType: (type) =>
            set((state) => {
                state.activeRoofType = type;
                state.isPlacing = true;
            }),

        setRoofTypeForBuilding: (id, type) =>
            set((state) => {
                const building = state.buildings.find((b) => b.id === id);
                if (building) {
                    building.roofType = type;
                }
            }),

        deleteBuilding: (id) =>
            set((state) => {
                state.buildings = state.buildings.filter((b) => b.id !== id);
                if (state.selectedBuildingId === id) {
                    state.selectedBuildingId = null;
                }
            }),

        setPlanViewSize: (width, height) =>
            set((state) => {
                state.planViewSize = { width, height };
            }),
    }))
);

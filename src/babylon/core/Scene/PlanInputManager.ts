import {
    ArcRotateCamera,
    PickingInfo,
    Scene,
    Vector3,
} from "@babylonjs/core";
import { Building as StoreBuilding, Point2D } from "@/types/rooftop";
import { GeometryUtils } from "../Math/GeometryUtils";
import { PlanMeshBuilder } from "./PlanMeshBuilder";

export type DragType = 'building' | 'corner' | 'midpoint' | 'rotate';

export interface DragState {
    type: DragType;
    buildingId: string;
    index: number;
    startWorld: Vector3;
    originalFootprint: Point2D[];
    startRotation?: number;
}

export class PlanInputManager {
    private scene: Scene;
    private camera: ArcRotateCamera;
    private meshBuilder: PlanMeshBuilder;

    private drag: DragState | null = null;
    private isPlacing: boolean = false;
    private storeBuildings: StoreBuilding[] = [];

    public onGroundClick: ((worldPos: Vector3) => void) | null = null;
    public onBuildingClick: ((buildingId: string) => void) | null = null;
    public onBuildingDrag: ((buildingId: string, worldPos: Vector3) => void) | null = null;
    public onFootprintUpdate: ((buildingId: string, footprint: Point2D[]) => void) | null = null;
    public onRotationUpdate: ((buildingId: string, rotation: number) => void) | null = null;
    public onDragEnd: (() => void) | null = null;

    constructor(scene: Scene, camera: ArcRotateCamera, meshBuilder: PlanMeshBuilder) {
        this.scene = scene;
        this.camera = camera;
        this.meshBuilder = meshBuilder;
        this.setupPointerEvents();
    }

    public setBuildings(buildings: StoreBuilding[]): void {
        this.storeBuildings = buildings;
    }

    public setPlacementMode(isPlacing: boolean): void {
        this.isPlacing = isPlacing;
    }

    private pickGround(): Vector3 | null {
        const groundMesh = this.meshBuilder.getGroundMesh();
        const pick: PickingInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (m) => m === groundMesh
        );
        return pick.hit ? pick.pickedPoint : null;
    }

    private setupPointerEvents(): void {
        this.scene.onPointerDown = (_evt, pickResult) => {
            if (!pickResult.hit || !pickResult.pickedPoint) return;

            const mesh = pickResult.pickedMesh;
            const worldPos = pickResult.pickedPoint;

            if (mesh && mesh.metadata?.handleType) {
                const md = mesh.metadata as { handleType: DragType; buildingId: string; index: number };
                const bldg = this.storeBuildings.find((b) => b.id === md.buildingId);

                if (bldg) {
                    if (md.handleType === 'rotate') {
                        const bounds = GeometryUtils.footprintBounds(bldg.footprint);
                        const angle = Math.atan2(worldPos.z - bounds.cz, worldPos.x - bounds.cx);

                        this.drag = {
                            type: 'rotate',
                            buildingId: md.buildingId,
                            index: -1,
                            startWorld: worldPos.clone(),
                            originalFootprint: [],
                            startRotation: bldg.rotation || 0,
                        };
                        (this.drag as any).center = { x: bounds.cx, y: bounds.cz };
                        (this.drag as any).startMouseAngle = angle;
                    } else {
                        this.drag = {
                            type: md.handleType,
                            buildingId: md.buildingId,
                            index: md.index,
                            startWorld: worldPos.clone(),
                            originalFootprint: bldg.footprint.map((p) => ({ ...p })),
                            startRotation: bldg.rotation || 0,
                        };
                    }
                    this.camera.detachControl();
                }
                return;
            }

            if (mesh && mesh.metadata?.buildingId) {
                this.onBuildingClick?.(mesh.metadata.buildingId);
                const bldg = this.storeBuildings.find((b) => b.id === mesh.metadata.buildingId);
                if (bldg) {
                    this.drag = {
                        type: 'building',
                        buildingId: bldg.id,
                        index: -1,
                        startWorld: worldPos.clone(),
                        originalFootprint: bldg.footprint.map((p) => ({ ...p })),
                        startRotation: bldg.rotation || 0,
                    };
                    this.camera.detachControl();
                }
                return;
            }

            if (mesh === this.meshBuilder.getGroundMesh()) {
                this.onGroundClick?.(worldPos);
            }
        };

        this.scene.onPointerMove = () => {
            const groundPick = this.pickGround();

            if (this.isPlacing) {
                const previewMesh = this.meshBuilder.getPreviewMesh();
                if (previewMesh) {
                    if (groundPick) {
                        previewMesh.position.x = groundPick.x;
                        previewMesh.position.z = groundPick.z;
                        previewMesh.position.y = 0.02;
                        previewMesh.isVisible = true;
                    } else {
                        previewMesh.isVisible = false;
                    }
                }
            }

            if (!this.drag) return;
            if (!groundPick) return;

            const orig = this.drag.originalFootprint;

            if (this.drag.type === 'building') {
                const dx = groundPick.x - this.drag.startWorld.x;
                const dz = groundPick.z - this.drag.startWorld.z;
                const newFootprint = orig.map(p => ({ x: p.x + dx, y: p.y + dz }));
                this.onFootprintUpdate?.(this.drag.buildingId, newFootprint);

            } else if (this.drag.type === 'rotate') {
                const center = (this.drag as any).center;
                const startMouseAngle = (this.drag as any).startMouseAngle;
                const startRot = this.drag.startRotation || 0;

                const currentMouseAngle = Math.atan2(groundPick.z - center.y, groundPick.x - center.x);
                const deltaAngle = currentMouseAngle - startMouseAngle;

                this.onRotationUpdate?.(this.drag.buildingId, startRot - deltaAngle);

            } else {
                const rot = this.drag.startRotation || 0;
                const cos = Math.cos(rot);
                const sin = Math.sin(rot);

                const toWorld = (px: number, py: number, cx: number, cz: number) => {
                    const ux = px - cx;
                    const uz = py - cz;
                    const rx = ux * cos + uz * sin;
                    const rz = -ux * sin + uz * cos;
                    return { x: cx + rx, z: cz + rz };
                };

                const toLocalDir = (dx: number, dz: number) => {
                    return {
                        x: dx * cos - dz * sin,
                        z: dx * sin + dz * cos
                    };
                };

                if (this.drag.type === 'corner') {
                    const newFootprint = GeometryUtils.resizeCornerAnchored(orig, this.drag.index, groundPick, this.drag.startWorld, rot, toWorld, toLocalDir);
                    this.onFootprintUpdate?.(this.drag.buildingId, newFootprint);
                } else if (this.drag.type === 'midpoint') {
                    const newFootprint = GeometryUtils.resizeEdgeAnchored(orig, this.drag.index, groundPick, this.drag.startWorld, rot, toWorld, toLocalDir);
                    this.onFootprintUpdate?.(this.drag.buildingId, newFootprint);
                }
            }
        };

        this.scene.onPointerUp = () => {
            if (this.drag) {
                this.drag = null;
                this.camera.attachControl(true);
                this.onDragEnd?.();
            }
        };
    }
}

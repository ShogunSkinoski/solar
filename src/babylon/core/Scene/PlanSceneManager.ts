import {
    ArcRotateCamera,
    Color3,
    Color4,
    Engine,
    MeshBuilder,
    Mesh,
    PickingInfo,
    Scene,
    StandardMaterial,
    Vector3,
    DynamicTexture,
} from "@babylonjs/core";
import { CameraManager } from "../Camera/CameraManager";
import { TextureManager } from "../Texture/TextureManager";
import { HemisphericLightStrategy } from "../Light/HemisphericLightStrategy";
import { PlanViewConstants as P } from "../Constants";
import { Building as StoreBuilding, Point2D } from "@/types/rooftop";

type DragType = 'building' | 'corner' | 'midpoint' | 'rotate';

interface DragState {
    type: DragType;
    buildingId: string;
    index: number;
    startWorld: Vector3;
    originalFootprint: Point2D[];
    startRotation?: number;
}

export class PlanSceneManager {
    private engine: Engine;
    private scene: Scene;
    private camera!: ArcRotateCamera;
    private cameraManager: CameraManager;
    private textureManager: TextureManager;

    private footprintMeshes: Map<string, Mesh> = new Map();
    private handleMeshes: Mesh[] = [];

    private matDefault!: StandardMaterial;
    private matSelected!: StandardMaterial;
    private matCornerHandle!: StandardMaterial;
    private matMidHandle!: StandardMaterial;
    private matRotationHandle!: StandardMaterial;

    private groundMesh!: Mesh;
    private drag: DragState | null = null;

    public onGroundClick: ((worldPos: Vector3) => void) | null = null;
    public onBuildingClick: ((buildingId: string) => void) | null = null;
    public onBuildingDrag: ((buildingId: string, worldPos: Vector3) => void) | null = null;
    public onFootprintUpdate: ((buildingId: string, footprint: Point2D[]) => void) | null = null;
    public onRotationUpdate: ((buildingId: string, rotation: number) => void) | null = null;
    public onDragEnd: (() => void) | null = null;

    private storeBuildings: StoreBuilding[] = [];
    private selectedId: string | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
        });

        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(P.CLEAR_R, P.CLEAR_G, P.CLEAR_B, 1);

        this.textureManager = new TextureManager(this.scene);
        this.cameraManager = new CameraManager(this.scene);

        this.createCamera();
        this.createMaterials();
        new HemisphericLightStrategy().createLight(this.scene);
        this.createGround();
        this.setupPointerEvents();
    }

    private createCamera(): void {
        const cam = this.cameraManager.setCamera('orthographic') as ArcRotateCamera;

        cam.inputs.removeByType("ArcRotateCameraMouseWheelInput");
        this.scene.onPointerObservable.add((ev) => {
            if (ev.type === 8) {
                const delta = (ev.event as WheelEvent).deltaY;
                const factor = delta > 0 ? 1.1 : 0.9;
                cam.orthoLeft! *= factor;
                cam.orthoRight! *= factor;
                cam.orthoTop! *= factor;
                cam.orthoBottom! *= factor;
            }
        });

        this.camera = cam;
    }


    private createMaterials(): void {
        this.matDefault = new StandardMaterial("planFpMat", this.scene);
        this.matDefault.diffuseColor = new Color3(P.FOOTPRINT_R, P.FOOTPRINT_G, P.FOOTPRINT_B);
        this.matDefault.specularColor = Color3.Black();
        this.matDefault.alpha = 0.55;

        this.matSelected = new StandardMaterial("planFpSelMat", this.scene);
        this.matSelected.diffuseColor = new Color3(P.SELECTED_R, P.SELECTED_G, P.SELECTED_B);
        this.matSelected.specularColor = Color3.Black();
        this.matSelected.alpha = 0.65;

        this.matCornerHandle = new StandardMaterial("planCornerH", this.scene);
        this.matCornerHandle.diffuseColor = Color3.White();
        this.matCornerHandle.specularColor = Color3.Black();

        this.matMidHandle = new StandardMaterial("planMidH", this.scene);
        this.matMidHandle.diffuseColor = Color3.White();
        this.matMidHandle.specularColor = Color3.Black();

        this.matRotationHandle = new StandardMaterial("planRotH", this.scene);
        this.matRotationHandle.diffuseColor = new Color3(0.96, 0.65, 0.14); // Orange
        this.matRotationHandle.specularColor = Color3.Black();
    }


    private createGround(): void {
        this.groundMesh = MeshBuilder.CreateGround("planGround", {
            width: P.GROUND_SIZE,
            height: P.GROUND_SIZE,
            subdivisions: 1,
        }, this.scene);

        this.groundMesh.position.y = 0;
        const mat = new StandardMaterial("planGroundMat", this.scene);
        mat.diffuseTexture = this.textureManager.getGridTexture("planGrid");
        mat.specularColor = Color3.Black();
        this.groundMesh.material = mat;
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
                        const bounds = this.footprintBounds(bldg.footprint);
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

            if (mesh === this.groundMesh) {
                this.onGroundClick?.(worldPos);
            }
        };

        this.scene.onPointerMove = () => {
            if (!this.drag) return;

            const groundPick = this.pickGround();
            if (!groundPick) return;

            const dx = groundPick.x - this.drag.startWorld.x;
            const dz = groundPick.z - this.drag.startWorld.z;
            const orig = this.drag.originalFootprint;

            if (this.drag.type === 'building') {
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

                let localDx = dx * cos - dz * sin;
                let localDz = dx * sin + dz * cos;

                // Apply Snapping
                if (P.SNAP_INTERVAL > 0) {
                    localDx = Math.round(localDx / P.SNAP_INTERVAL) * P.SNAP_INTERVAL;
                    localDz = Math.round(localDz / P.SNAP_INTERVAL) * P.SNAP_INTERVAL;
                }

                if (this.drag.type === 'corner') {
                    const newFootprint = this.resizeRectFootprint(orig, this.drag.index, localDx, localDz);
                    this.onFootprintUpdate?.(this.drag.buildingId, newFootprint);
                } else if (this.drag.type === 'midpoint') {
                    const newFootprint = this.moveEdgeFootprint(orig, this.drag.index, localDx, localDz);
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


    private resizeRectFootprint(orig: Point2D[], cornerIndex: number, dx: number, dz: number): Point2D[] {
        const opposite = (cornerIndex + 2) % 4;
        const ox = orig[opposite].x;
        const oy = orig[opposite].y;

        const newX = orig[cornerIndex].x + dx;
        const newY = orig[cornerIndex].y + dz;

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

    private moveEdgeFootprint(orig: Point2D[], edgeIndex: number, dx: number, dz: number): Point2D[] {
        const fp = orig.map((p) => ({ ...p }));
        switch (edgeIndex) {
            case 0: fp[0].y += dz; fp[1].y += dz; break; // top edge
            case 1: fp[1].x += dx; fp[2].x += dx; break; // right edge
            case 2: fp[2].y += dz; fp[3].y += dz; break; // bottom edge
            case 3: fp[3].x += dx; fp[0].x += dx; break; // left edge
        }
        return fp;
    }

    private pickGround(): Vector3 | null {
        const pick: PickingInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (m) => m === this.groundMesh
        );
        return pick.hit ? pick.pickedPoint : null;
    }


    private clearHandles(): void {
        for (const m of this.handleMeshes) m.dispose();
        this.handleMeshes = [];
    }

    private createHandles(building: StoreBuilding): void {
        this.clearHandles();
        const fp = building.footprint;
        if (fp.length < 3) return;

        const handleSize = Math.abs(this.camera.orthoRight! - this.camera.orthoLeft!) * 0.012;

        const bounds = this.footprintBounds(fp);
        const cx = bounds.cx;
        const cz = bounds.cz;
        const ang = building.rotation || 0;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);

        for (let i = 0; i < fp.length; i++) {
            const h = MeshBuilder.CreateBox(`handle-c-${i}`, {
                width: handleSize,
                height: 0.01,
                depth: handleSize,
            }, this.scene);

            const ux = fp[i].x - cx;
            const uz = fp[i].y - cz;

            const rx = ux * cos + uz * sin;
            const rz = -ux * sin + uz * cos;

            h.position = new Vector3(cx + rx, 0.05, cz + rz);
            h.rotation.y = -ang; // Rotate handle mesh itself if desired
            h.material = this.matCornerHandle;
            h.metadata = { handleType: 'corner', buildingId: building.id, index: i };
            this.handleMeshes.push(h);
        }

        for (let i = 0; i < fp.length; i++) {
            const next = (i + 1) % fp.length;
            const mx = (fp[i].x + fp[next].x) / 2;
            const my = (fp[i].y + fp[next].y) / 2;

            const ux = mx - cx;
            const uz = my - cz;

            const rx = ux * cos + uz * sin;
            const rz = -ux * sin + uz * cos;

            const h = MeshBuilder.CreateBox(`handle-m-${i}`, {
                width: handleSize * 0.85,
                height: 0.01,
                depth: handleSize * 0.85,
            }, this.scene);
            h.position = new Vector3(cx + rx, 0.05, cz + rz);
            h.rotation.y = -ang; // Rotate handle mesh
            h.material = this.matMidHandle;
            h.metadata = { handleType: 'midpoint', buildingId: building.id, index: i };
            this.handleMeshes.push(h);
        }

        const iconSize = 1.5;
        const h = MeshBuilder.CreatePlane(`handle-rot`, {
            size: iconSize,
        }, this.scene);

        const S = 256;
        const half = S / 2;
        const dt = new DynamicTexture("rotIconTex", { width: S, height: S }, this.scene, true);
        dt.hasAlpha = true;
        const ctx = dt.getContext() as unknown as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, S, S);

        // Yellow circle background
        ctx.beginPath();
        ctx.arc(half, half, half - 8, 0, Math.PI * 2);
        ctx.fillStyle = "#F0B800";
        ctx.fill();

        // Circular arrow arc (dark, clockwise, leaving gap for arrowhead)
        const arcRadius = 60;
        const startAngle = -Math.PI * 0.65;
        const endAngle = Math.PI * 0.85;
        ctx.beginPath();
        ctx.arc(half, half, arcRadius, startAngle, endAngle);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 26;
        ctx.lineCap = "round";
        ctx.stroke();

        // Arrowhead at the end of the arc
        const arrowTip = {
            x: half + arcRadius * Math.cos(endAngle),
            y: half + arcRadius * Math.sin(endAngle),
        };
        const tangentAngle = endAngle + Math.PI / 2;
        const arrowLen = 32;
        ctx.beginPath();
        ctx.moveTo(arrowTip.x, arrowTip.y);
        ctx.lineTo(
            arrowTip.x + arrowLen * Math.cos(tangentAngle - 0.5),
            arrowTip.y + arrowLen * Math.sin(tangentAngle - 0.5)
        );
        ctx.moveTo(arrowTip.x, arrowTip.y);
        ctx.lineTo(
            arrowTip.x + arrowLen * Math.cos(tangentAngle + 0.5),
            arrowTip.y + arrowLen * Math.sin(tangentAngle + 0.5)
        );
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 26;
        ctx.lineCap = "round";
        ctx.stroke();

        dt.update();

        const mat = new StandardMaterial("rotIconMat", this.scene);
        mat.diffuseTexture = dt;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor = Color3.White();
        mat.disableLighting = true;
        h.material = mat;
        h.rotation.x = Math.PI / 2;
        h.rotation.y = -ang + Math.PI;

        // Place handle on the negative Z side of the building (outside the footprint)
        const zOffset = bounds.d / 2 + 2;
        const rx = -zOffset * Math.sin(ang);
        const rz = -zOffset * Math.cos(ang);

        h.position = new Vector3(cx + rx, 0.05, cz + rz);
        h.metadata = { handleType: 'rotate', buildingId: building.id };

        this.handleMeshes.push(h);
    }


    public syncBuildings(buildings: StoreBuilding[], selectedId: string | null): void {
        this.storeBuildings = buildings;
        this.selectedId = selectedId;

        const storeIds = new Set(buildings.map((b) => b.id));

        for (const [id, mesh] of this.footprintMeshes) {
            if (!storeIds.has(id)) {
                mesh.dispose();
                this.footprintMeshes.delete(id);
            }
        }

        for (const b of buildings) {
            if (b.footprint.length < 3) continue;

            const bounds = this.footprintBounds(b.footprint);
            const isSelected = b.id === selectedId;

            let mesh = this.footprintMeshes.get(b.id);
            if (!mesh) {
                mesh = MeshBuilder.CreateGround(`plan-fp-${b.id}`, {
                    width: 1, height: 1,
                }, this.scene);
                mesh.metadata = { buildingId: b.id };
                this.footprintMeshes.set(b.id, mesh);
            }

            mesh.position.x = bounds.cx;
            mesh.position.z = bounds.cz;
            mesh.position.y = 0.01;
            mesh.scaling.x = bounds.w;
            mesh.scaling.z = bounds.d;

            const ang = b.rotation || 0;
            mesh.rotation.y = ang;

            mesh.material = isSelected ? this.matSelected : this.matDefault;
            mesh.renderOutline = false;


            mesh.getChildMeshes().forEach((c) => c.dispose());

            const fp = b.footprint;
            const y = 0.03;
            const borderPts = [
                ...fp.map((p) => new Vector3(p.x - bounds.cx, y, p.y - bounds.cz)),
            ];

            borderPts.push(borderPts[0].clone());
            const unscaledBorder = borderPts.map((p) => new Vector3(
                bounds.w > 0.01 ? p.x / bounds.w : 0,
                p.y,
                bounds.d > 0.01 ? p.z / bounds.d : 0
            ));

            const border = MeshBuilder.CreateLines(`border-${b.id}`, {
                points: unscaledBorder,
            }, this.scene);
            border.color = Color3.Black();
            border.isPickable = false;
            border.parent = mesh;

            if (b.roofType === 'gable') {
                const ridge = MeshBuilder.CreateLines(`ridge-${b.id}`, {
                    points: [new Vector3(-0.5, y, 0), new Vector3(0.5, y, 0)],
                }, this.scene);
                ridge.color = Color3.Black();
                ridge.isPickable = false;
                ridge.parent = mesh;

                const dashCount = 12;
                for (const side of [-1, 1]) {
                    const dashPts: Vector3[] = [];
                    for (let d = 0; d < dashCount; d++) {
                        const t0 = d / dashCount;
                        const t1 = (d + 0.5) / dashCount;
                        dashPts.push(
                            new Vector3(-0.5 + t0, y, side * 0.25),
                            new Vector3(-0.5 + t1, y, side * 0.25),
                        );
                    }
                    if (dashPts.length >= 2) {
                        const dash = MeshBuilder.CreateLineSystem(`dash-${b.id}-${side}`, {
                            lines: Array.from({ length: Math.floor(dashPts.length / 2) }, (_, i) => [
                                dashPts[i * 2], dashPts[i * 2 + 1]
                            ]),
                        }, this.scene);
                        dash.color = Color3.Black();
                        dash.alpha = 0.7;
                        dash.isPickable = false;
                        dash.parent = mesh;
                    }
                }
            }
        }

        const selBldg = buildings.find((b) => b.id === selectedId);
        if (selBldg) {
            this.createHandles(selBldg);
        } else {
            this.clearHandles();
        }
    }

    private footprintBounds(footprint: Point2D[]): { cx: number; cz: number; w: number; d: number } {
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


    public startRenderLoop(): void {
        this.engine.runRenderLoop(() => this.scene.render());
    }

    public resize(): void {
        this.engine.resize();
    }

    public getScene(): Scene {
        return this.scene;
    }

    public dispose(): void {
        this.clearHandles();
        this.footprintMeshes.forEach((m) => m.dispose());
        this.footprintMeshes.clear();
        this.cameraManager.dispose();
        this.textureManager.dispose();
        this.scene.dispose();
        this.engine.dispose();
    }
}

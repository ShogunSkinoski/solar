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
import { Building as StoreBuilding, Point2D, RoofType } from "@/types/rooftop";

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

    private previewMesh: Mesh | null = null;
    private isPlacing: boolean = false;
    private previewRoofType: RoofType = 'flat';

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
        mat.diffuseTexture = this.textureManager.getSatelliteTexture();
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
            const groundPick = this.pickGround();

            if (this.isPlacing && this.previewMesh) {
                if (groundPick) {
                    this.previewMesh.position.x = groundPick.x;
                    this.previewMesh.position.z = groundPick.z;
                    this.previewMesh.position.y = 0.02;
                    this.previewMesh.isVisible = true;
                } else {
                    this.previewMesh.isVisible = false;
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
                    const newFootprint = this.resizeCornerAnchored(orig, this.drag.index, groundPick, this.drag.startWorld, rot, toWorld, toLocalDir);
                    this.onFootprintUpdate?.(this.drag.buildingId, newFootprint);
                } else if (this.drag.type === 'midpoint') {
                    const newFootprint = this.resizeEdgeAnchored(orig, this.drag.index, groundPick, this.drag.startWorld, rot, toWorld, toLocalDir);
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

    private resizeCornerAnchored(
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

    private resizeEdgeAnchored(
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

    public setPlacementMode(isPlacing: boolean, roofType: RoofType): void {
        this.isPlacing = isPlacing;
        this.previewRoofType = roofType;

        if (this.isPlacing) {
            if (!this.previewMesh || this.previewMesh.metadata?.roofType !== roofType) {
                if (this.previewMesh) this.previewMesh.dispose();
                this.previewMesh = this.createPreviewMesh(roofType);
            }
            this.previewMesh.isVisible = false;
        } else {
            if (this.previewMesh) {
                this.previewMesh.dispose();
                this.previewMesh = null;
            }
        }
    }

    private createPreviewMesh(roofType: RoofType): Mesh {
        const mesh = MeshBuilder.CreateGround("preview-mesh", {
            width: 1, height: 1,
        }, this.scene);
        mesh.scaling.x = P.DEFAULT_WIDTH;
        mesh.scaling.z = P.DEFAULT_DEPTH;

        const mat = new StandardMaterial("previewMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.alpha = 0.5;
        mat.emissiveColor = new Color3(0.2, 0.2, 0.2);
        mesh.material = mat;
        mesh.metadata = { roofType };
        mesh.isPickable = false;

        const border = MeshBuilder.CreateLines("preview-border", {
            points: [
                new Vector3(-0.5, 0.05, -0.5),
                new Vector3(0.5, 0.05, -0.5),
                new Vector3(0.5, 0.05, 0.5),
                new Vector3(-0.5, 0.05, 0.5),
                new Vector3(-0.5, 0.05, -0.5),
            ]
        }, this.scene);
        border.color = Color3.Black();
        border.parent = mesh;
        border.isPickable = false;

        if (roofType === 'gable') {
            const ridge = MeshBuilder.CreateLines("preview-ridge", {
                points: [new Vector3(-0.5, 0.05, 0), new Vector3(0.5, 0.05, 0)],
            }, this.scene);
            ridge.color = Color3.Black();
            ridge.parent = mesh;
            ridge.isPickable = false;
        }

        return mesh;
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

import {
    ArcRotateCamera,
    Color3,
    MeshBuilder,
    Mesh,
    Scene,
    StandardMaterial,
    Vector3,
    DynamicTexture,
} from "@babylonjs/core";
import { PlanViewConstants as P } from "../Constants";
import { Building as StoreBuilding, RoofType } from "@/types/rooftop";
import { TextureManager } from "../Texture/TextureManager";
import { GeometryUtils } from "../Math/GeometryUtils";

export class PlanMeshBuilder {
    private scene: Scene;
    private textureManager: TextureManager;
    private camera: ArcRotateCamera;

    private matDefault!: StandardMaterial;
    private matSelected!: StandardMaterial;
    private matCornerHandle!: StandardMaterial;
    private matMidHandle!: StandardMaterial;
    private matRotationHandle!: StandardMaterial;

    private groundMesh!: Mesh;
    private previewMesh: Mesh | null = null;
    private footprintMeshes: Map<string, Mesh> = new Map();
    private handleMeshes: Mesh[] = [];

    constructor(scene: Scene, textureManager: TextureManager, camera: ArcRotateCamera) {
        this.scene = scene;
        this.textureManager = textureManager;
        this.camera = camera;
        this.createMaterials();
        this.createGround();
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

    public getGroundMesh(): Mesh {
        return this.groundMesh;
    }

    public getPreviewMesh(): Mesh | null {
        return this.previewMesh;
    }

    public clearHandles(): void {
        for (const m of this.handleMeshes) m.dispose();
        this.handleMeshes = [];
    }

    private createHandles(building: StoreBuilding): void {
        this.clearHandles();
        const fp = building.footprint;
        if (fp.length < 3) return;

        const handleSize = Math.abs(this.camera.orthoRight! - this.camera.orthoLeft!) * 0.012;

        const bounds = GeometryUtils.footprintBounds(fp);
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
            h.rotation.y = -ang;
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
            h.rotation.y = -ang;
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

        ctx.beginPath();
        ctx.arc(half, half, half - 8, 0, Math.PI * 2);
        ctx.fillStyle = "#F0B800";
        ctx.fill();

        const arcRadius = 60;
        const startAngle = -Math.PI * 0.65;
        const endAngle = Math.PI * 0.85;
        ctx.beginPath();
        ctx.arc(half, half, arcRadius, startAngle, endAngle);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 26;
        ctx.lineCap = "round";
        ctx.stroke();

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

        const zOffset = bounds.d / 2 + 2;
        const rx = -zOffset * Math.sin(ang);
        const rz = -zOffset * Math.cos(ang);

        h.position = new Vector3(cx + rx, 0.05, cz + rz);
        h.metadata = { handleType: 'rotate', buildingId: building.id };

        this.handleMeshes.push(h);
    }

    public syncBuildings(buildings: StoreBuilding[], selectedId: string | null): void {
        const storeIds = new Set(buildings.map((b) => b.id));

        for (const [id, mesh] of this.footprintMeshes) {
            if (!storeIds.has(id)) {
                mesh.dispose();
                this.footprintMeshes.delete(id);
            }
        }

        for (const b of buildings) {
            if (b.footprint.length < 3) continue;

            const bounds = GeometryUtils.footprintBounds(b.footprint);
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

    public setPlacementMode(isPlacing: boolean, roofType: RoofType): void {
        if (isPlacing) {
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

    public dispose(): void {
        this.clearHandles();
        this.footprintMeshes.forEach((m) => m.dispose());
        this.footprintMeshes.clear();
        if (this.previewMesh) {
            this.previewMesh.dispose();
            this.previewMesh = null;
        }
        if (this.groundMesh) {
            this.groundMesh.dispose();
        }
    }
}

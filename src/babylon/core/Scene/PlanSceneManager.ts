import {
    ArcRotateCamera,
    Color4,
    Engine,
    Scene,
    Vector3,
} from "@babylonjs/core";
import { CameraManager } from "../Camera/CameraManager";
import { TextureManager } from "../Texture/TextureManager";
import { HemisphericLightStrategy } from "../Light/HemisphericLightStrategy";
import { PlanViewConstants as P } from "../Constants";
import { Building as StoreBuilding, Point2D, RoofType } from "@/types/rooftop";
import { PlanMeshBuilder } from "../Building/PlanMeshBuilder";
import { PlanInputManager } from "./PlanInputManager";

export class PlanSceneManager {
    private engine: Engine;
    private scene: Scene;
    private camera!: ArcRotateCamera;
    private cameraManager: CameraManager;
    private textureManager: TextureManager;
    private meshBuilder: PlanMeshBuilder;
    private inputManager: PlanInputManager;

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

        this.meshBuilder = new PlanMeshBuilder(this.scene, this.textureManager, this.camera);
        this.inputManager = new PlanInputManager(this.scene, this.camera, this.meshBuilder);

        new HemisphericLightStrategy().createLight(this.scene);
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

    // Pass through event handlers
    public set onGroundClick(handler: ((worldPos: Vector3) => void) | null) {
        this.inputManager.onGroundClick = handler;
    }

    public set onBuildingClick(handler: ((buildingId: string) => void) | null) {
        this.inputManager.onBuildingClick = handler;
    }

    public set onBuildingDrag(handler: ((buildingId: string, worldPos: Vector3) => void) | null) {
        this.inputManager.onBuildingDrag = handler;
    }

    public set onFootprintUpdate(handler: ((buildingId: string, footprint: Point2D[]) => void) | null) {
        this.inputManager.onFootprintUpdate = handler;
    }

    public set onRotationUpdate(handler: ((buildingId: string, rotation: number) => void) | null) {
        this.inputManager.onRotationUpdate = handler;
    }

    public set onDragEnd(handler: (() => void) | null) {
        this.inputManager.onDragEnd = handler;
    }

    public syncBuildings(buildings: StoreBuilding[], selectedId: string | null): void {
        this.meshBuilder.syncBuildings(buildings, selectedId);
        this.inputManager.setBuildings(buildings);
    }

    public startRenderLoop(): void {
        this.engine.runRenderLoop(() => this.scene.render());
    }

    public resize(): void {
        this.engine.resize();
    }

    public setPlacementMode(isPlacing: boolean, roofType: RoofType): void {
        this.meshBuilder.setPlacementMode(isPlacing, roofType);
        this.inputManager.setPlacementMode(isPlacing);
    }

    public getScene(): Scene {
        return this.scene;
    }

    public dispose(): void {
        this.meshBuilder.dispose();
        this.cameraManager.dispose();
        this.textureManager.dispose();
        this.scene.dispose();
        this.engine.dispose();
    }
}

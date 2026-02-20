import { Color3, Color4, Engine, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { SceneConstants } from "../Constants";
import { TextureManager } from "../Texture/TextureManager";
import { CameraManager, CameraType } from "../Camera/CameraManager";
import { HemisphericLightStrategy } from "../Light/HemisphericLightStrategy";
import { BuildingManager } from "../Building/BuildingManager";
import { CoordinateMapper } from "./CoordinateMapper";
import { AxisHelper } from "./AxisHelper";

export class SceneManager {
    private scene: Scene;
    private engine: Engine;
    private textureManager: TextureManager;
    private cameraManager: CameraManager;
    private buildingManager: BuildingManager;
    private coordinateMapper: CoordinateMapper;
    private axisHelper: AxisHelper | null = null;

    constructor(
        canvas: HTMLCanvasElement,
        initialCamera: CameraType = 'perspective',
        canvasSize?: { width: number; height: number }
    ) {
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });

        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.9, 0.9, 0.9, 1);
        this.textureManager = new TextureManager(this.scene);
        this.cameraManager = new CameraManager(this.scene);
        this.cameraManager.setCamera(initialCamera);
        this.buildingManager = new BuildingManager(this.scene, this.textureManager);
        this.coordinateMapper = new CoordinateMapper(
            canvasSize?.width ?? SceneConstants.GROUND_WIDTH,
            canvasSize?.height ?? SceneConstants.GROUND_HEIGTH
        );
    }

    public initialize(): void {
        new HemisphericLightStrategy().createLight(this.scene);
        this.createGround();
        this.axisHelper = new AxisHelper(this.scene);
    }

    public setCamera(type: CameraType): void {
        this.cameraManager.setCamera(type);
    }

    public getCameraManager(): CameraManager {
        return this.cameraManager;
    }

    public getBuildingManager(): BuildingManager {
        return this.buildingManager;
    }

    public getMapper(): CoordinateMapper {
        return this.coordinateMapper;
    }

    public updateCanvasSize(width: number, height: number): void {
        this.coordinateMapper.setCanvasSize(width, height);
    }

    private createGround(): void {
        const ground = MeshBuilder.CreateGround("ground", {
            width: SceneConstants.GROUND_WIDTH,
            height: SceneConstants.GROUND_HEIGTH,
            subdivisions: SceneConstants.SUBDIVISIONS
        }, this.scene);

        ground.position.y = 0;
        const groundMat = new StandardMaterial('groundMat', this.scene);
        groundMat.diffuseTexture = this.textureManager.getSatelliteTexture();
        groundMat.specularColor = new Color3(0, 0, 0);
        ground.material = groundMat;
        ground.receiveShadows = true;
    }

    public startRenderLoop(): void {
        this.engine.runRenderLoop(() => this.scene.render());
    }

    public stopRenderLoop(): void {
        this.engine.stopRenderLoop();
    }

    public resize(): void {
        this.engine.resize();
    }

    public dispose(): void {
        this.axisHelper?.dispose();
        this.buildingManager.dispose();
        this.cameraManager.dispose();
        this.textureManager.dispose();
        this.scene.dispose();
        this.engine.dispose();
    }

    public render(): void {
        this.scene.render();
    }

    public getScene(): Scene {
        return this.scene;
    }
}
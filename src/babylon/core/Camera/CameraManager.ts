import { Camera, Scene } from "@babylonjs/core";
import { ICameraStrategy } from "./ICameraStrategy";
import { OrthographicCameraStrategy } from "./OrthographicCameraStrategy";
import { PerspectiveCameraStrategy } from "./PerspectiveCameraStrategy";

export type CameraType = 'perspective' | 'orthographic';

export class CameraManager {
    private scene: Scene;
    private activeCamera: Camera | null = null;
    private activeStrategy: ICameraStrategy | null = null;

    private readonly strategies: Record<CameraType, ICameraStrategy> = {
        perspective: new PerspectiveCameraStrategy(),
        orthographic: new OrthographicCameraStrategy(),
    };

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public setCamera(type: CameraType): Camera {
        if (this.activeCamera) {
            this.activeCamera.detachControl();
            this.activeCamera.dispose();
        }

        const strategy = this.strategies[type];
        const camera = strategy.createCamera(this.scene);
        strategy.configureControls(camera);

        this.scene.activeCamera = camera;
        this.activeCamera = camera;
        this.activeStrategy = strategy;

        return camera;
    }

    public getActiveCamera(): Camera | null {
        return this.activeCamera;
    }

    public getActiveCameraType(): CameraType | null {
        for (const [type, strategy] of Object.entries(this.strategies)) {
            if (strategy === this.activeStrategy) {
                return type as CameraType;
            }
        }
        return null;
    }

    public dispose(): void {
        if (this.activeCamera) {
            this.activeCamera.detachControl();
            this.activeCamera.dispose();
            this.activeCamera = null;
        }
    }
}

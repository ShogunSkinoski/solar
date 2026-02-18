import { ArcRotateCamera, Camera, Scene, Vector3 } from "@babylonjs/core";
import { ICameraStrategy } from "./ICameraStrategy";
import { CameraConstants } from "../Constants";

export class PerspectiveCameraStrategy implements ICameraStrategy {
    createCamera(scene: Scene): Camera {
        const camera = new ArcRotateCamera(
            "perspectiveCamera",
            CameraConstants.PERSPECTIVE_ALPHA,
            CameraConstants.PERSPECTIVE_BETA,
            CameraConstants.PERSPECTIVE_RADIUS,
            Vector3.Zero(),
            scene
        );

        camera.mode = Camera.PERSPECTIVE_CAMERA;
        return camera;
    }

    configureControls(camera: Camera): void {
        const arcCamera = camera as ArcRotateCamera;
        camera.attachControl(true);

        arcCamera.lowerBetaLimit = CameraConstants.PERSPECTIVE_LOWER_BETA_LIMIT;
        arcCamera.upperBetaLimit = CameraConstants.PERSPECTIVE_UPPER_BETA_LIMIT;

        arcCamera.lowerRadiusLimit = CameraConstants.PERSPECTIVE_LOWER_RADIUS_LIMIT;
        arcCamera.upperRadiusLimit = CameraConstants.PERSPECTIVE_UPPER_RADIUS_LIMIT;

        arcCamera.panningSensibility = CameraConstants.PERSPECTIVE_PANNING_SENSIBILITY;
        arcCamera.wheelPrecision = CameraConstants.PERSPECTIVE_WHEEL_PRECISION;
    }
}
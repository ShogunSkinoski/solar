import { Scene, Camera, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { ICameraStrategy } from "./ICameraStrategy";
import { CameraConstants } from "../Constants";

export class OrthographicCameraStrategy implements ICameraStrategy {
    createCamera(scene: Scene): Camera {
        const camera = new ArcRotateCamera(
            "orthoCamera",
            CameraConstants.ORTHO_ALPHA,
            CameraConstants.ORTHO_BETA,
            CameraConstants.ORTHO_RADIUS,
            Vector3.Zero(),
            scene
        );

        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

        camera.orthoLeft = -CameraConstants.ARC_ORTHO_SIZE;
        camera.orthoRight = CameraConstants.ARC_ORTHO_SIZE;
        camera.orthoTop = CameraConstants.ARC_ORTHO_SIZE;
        camera.orthoBottom = -CameraConstants.ARC_ORTHO_SIZE;

        return camera;
    }

    configureControls(camera: Camera): void {
        const arcCamera = camera as ArcRotateCamera;
        camera.attachControl(true);

        arcCamera.lowerBetaLimit = CameraConstants.ARC_LOWER_ALPHA_LIMIT;
        arcCamera.upperBetaLimit = CameraConstants.ARC_UPPER_ALPHA_LIMIT;
        arcCamera.lowerAlphaLimit = CameraConstants.ARC_LOWER_ALPHA_LIMIT;
        arcCamera.upperAlphaLimit = CameraConstants.ARC_UPPER_ALPHA_LIMIT;

        arcCamera.lowerRadiusLimit = CameraConstants.ARC_LOWER_RADIUS_LIMIT;
        arcCamera.upperRadiusLimit = CameraConstants.ARC_UPPER_RADIUS_LIMIT;
    }
}
import { Camera, Scene } from "@babylonjs/core";

export interface ICameraStrategy {
    createCamera(scene: Scene): Camera;
    configureControls(camera: Camera): void;
}
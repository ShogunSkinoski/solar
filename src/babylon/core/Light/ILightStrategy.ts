import { Light, Scene } from "@babylonjs/core";

export interface ILightStrategy {
    createLight(scene: Scene): Light;
}

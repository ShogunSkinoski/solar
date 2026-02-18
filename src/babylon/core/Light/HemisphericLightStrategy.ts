import { Color3, HemisphericLight, Light, Scene, Vector3 } from "@babylonjs/core";
import { ILightStrategy } from "./ILightStrategy";
import { LightConstants } from "../Constants";

export class HemisphericLightStrategy implements ILightStrategy {
    createLight(scene: Scene): Light {
        const light = new HemisphericLight(
            LightConstants.HEMISPHERIC_NAME,
            new Vector3(
                LightConstants.DIRECTION_X,
                LightConstants.DIRECTION_Y,
                LightConstants.DIRECTION_Z
            ),
            scene
        );
        light.intensity = LightConstants.INTENSITY;
        (light as HemisphericLight).diffuse = new Color3(
            LightConstants.DIFFUSE_R,
            LightConstants.DIFFUSE_G,
            LightConstants.DIFFUSE_B
        );
        (light as HemisphericLight).groundColor = new Color3(
            LightConstants.GROUND_R,
            LightConstants.GROUND_G,
            LightConstants.GROUND_B
        );
        return light;
    }
}

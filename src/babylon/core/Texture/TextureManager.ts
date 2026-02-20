import { Color3, DynamicTexture, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { GridTexture } from "./GridTexture";

export type MaterialKey = 'wall' | 'roof';

const MATERIAL_DEFS: Record<MaterialKey, { diffuse: [number, number, number]; specular: [number, number, number] }> = {
    wall: {
        diffuse: [0.38, 0.38, 0.44],
        specular: [0.10, 0.10, 0.10],
    },
    roof: {
        diffuse: [0.55, 0.35, 0.28],
        specular: [0.05, 0.05, 0.05],
    },
};

export class TextureManager {
    private scene: Scene;
    private textures: Map<string, GridTexture> = new Map();
    private babylonTextures: Map<string, Texture> = new Map();
    private materials: Map<MaterialKey, StandardMaterial> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
    }


    public getGridTexture(name: string = 'default', size: number = 512): DynamicTexture {
        if (!this.textures.has(name)) {
            this.textures.set(name, new GridTexture(this.scene, size));
        }
        return this.textures.get(name)!.getTexture();
    }

    public getSatelliteTexture(): Texture {
        if (!this.babylonTextures.has('satellite')) {
            const tex = new Texture("https://playground.babylonjs.com/textures/earth.jpg", this.scene);
            this.babylonTextures.set('satellite', tex);
        }
        return this.babylonTextures.get('satellite')!;
    }

    public getMaterial(key: MaterialKey): StandardMaterial {
        if (!this.materials.has(key)) {
            const def = MATERIAL_DEFS[key];
            const mat = new StandardMaterial(`mat-${key}`, this.scene);
            mat.diffuseColor = new Color3(...def.diffuse);
            mat.specularColor = new Color3(...def.specular);
            this.materials.set(key, mat);
        }
        return this.materials.get(key)!;
    }

    public dispose(): void {
        this.textures.forEach(t => t.dispose());
        this.textures.clear();

        this.babylonTextures.forEach(t => t.dispose());
        this.babylonTextures.clear();

        this.materials.forEach(m => m.dispose());
        this.materials.clear();
    }
}

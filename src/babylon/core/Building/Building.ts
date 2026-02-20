import { Color3, Mesh, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import { TextureManager } from "../Texture/TextureManager";

export type RoofType = 'flat' | 'gable';

export interface BuildingSize {
    width: number;
    depth: number;
}

export interface BuildingConfig {
    id: string;
    scene: Scene;
    position: Vector3;
    size: BuildingSize;
    wallHeight: number;
    roofHeight: number;
    rotation: number;
    overhang: number;
    textureManager?: TextureManager;
}

export abstract class Building {
    public readonly id: string;
    public abstract readonly roofType: RoofType;

    protected scene: Scene;
    protected config: BuildingConfig;
    protected textureManager: TextureManager | undefined;

    private rootNode: TransformNode;
    private mesh: Mesh;
    private _selected: boolean = false;

    constructor(config: BuildingConfig) {
        this.id = config.id;
        this.config = config;
        this.scene = config.scene;
        this.textureManager = config.textureManager;

        this.rootNode = new TransformNode(`building-${this.id}`, this.scene);
        this.rootNode.position = config.position;
        this.rootNode.rotation.y = config.rotation;

        this.mesh = this.rebuildMesh();
        this.updateRoofTextureMapping();
    }

    protected abstract buildMesh(): Mesh;


    protected getWallMaterial(): StandardMaterial {
        if (this.textureManager) {
            return this.textureManager.getMaterial('wall');
        }
        const mat = new StandardMaterial(`mat-wall-${this.id}`, this.scene);
        mat.diffuseColor = new Color3(0.38, 0.38, 0.44);
        mat.specularColor = new Color3(0.10, 0.10, 0.10);
        return mat;
    }


    protected getRoofMaterial(): StandardMaterial {
        const mat = new StandardMaterial(`mat-roof-${this.id}`, this.scene);
        if (this.textureManager) {
            mat.diffuseTexture = this.textureManager.getSatelliteTexture().clone();
            mat.specularColor = new Color3(0.05, 0.05, 0.05);
        } else {
            mat.diffuseColor = new Color3(0.55, 0.35, 0.28);
            mat.specularColor = new Color3(0.05, 0.05, 0.05);
        }
        return mat;
    }

    protected updateRoofTextureMapping(): void {
        const mesh = this.getMesh();
        if (!mesh) return;
        const roofMeshes = [mesh, ...mesh.getChildMeshes()];
        roofMeshes.forEach(m => {
            if (m.material instanceof StandardMaterial && m.material.diffuseTexture instanceof Texture) {
                const tex = m.material.diffuseTexture as Texture;
                const pos = this.config.position;
                const w = this.config.size.width;
                const d = this.config.size.depth;
                tex.uScale = w / 100;
                tex.vScale = d / 100;

                // Babylon Z is forward. Ground 100x100 is -50 to 50 on X and Z.
                tex.uOffset = (pos.x - w / 2 + 50) / 100;
                tex.vOffset = (pos.z - d / 2 + 50) / 100;
            }
        });
    }

    public update(data: Partial<Omit<BuildingConfig, 'id' | 'scene'>>): void {
        let needsRebuild = false;

        if (data.size !== undefined) { this.config.size = data.size; needsRebuild = true; }
        if (data.wallHeight !== undefined) { this.config.wallHeight = data.wallHeight; needsRebuild = true; }
        if (data.roofHeight !== undefined) { this.config.roofHeight = data.roofHeight; needsRebuild = true; }
        if (data.rotation !== undefined) {
            this.config.rotation = data.rotation;
            this.rootNode.rotation.y = data.rotation;
        }

        if (data.position !== undefined) {
            this.config.position = data.position;
            this.rootNode.position = data.position;
        }

        if (needsRebuild) {
            this.mesh.dispose();
            this.mesh = this.rebuildMesh();
        }

        this.updateRoofTextureMapping();
    }

    public setSelected(selected: boolean): void {
        this._selected = selected;
        this.mesh.renderOutline = selected;
        if (selected) {
            this.mesh.outlineColor = new Color3(0.3, 0.7, 1.0);
            this.mesh.outlineWidth = 0.05;
        }
    }

    public get isSelected(): boolean {
        return this._selected;
    }

    public get position(): Vector3 {
        return this.rootNode.position;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public getConfig(): Readonly<BuildingConfig> {
        return { ...this.config };
    }

    public dispose(): void {
        this.mesh.dispose();
        this.rootNode.dispose();
    }

    private rebuildMesh(): Mesh {
        const mesh = this.buildMesh();
        mesh.parent = this.rootNode;
        mesh.metadata = { buildingId: this.id };
        return mesh;
    }
}
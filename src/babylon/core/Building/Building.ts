import { Color3, Mesh, Scene, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
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

        this.mesh = this.rebuildMesh();
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
        if (this.textureManager) {
            return this.textureManager.getMaterial('roof');
        }
        const mat = new StandardMaterial(`mat-roof-${this.id}`, this.scene);
        mat.diffuseColor = new Color3(0.55, 0.35, 0.28);
        mat.specularColor = new Color3(0.05, 0.05, 0.05);
        return mat;
    }

    public update(data: Partial<Omit<BuildingConfig, 'id' | 'scene'>>): void {
        let needsRebuild = false;

        if (data.size !== undefined) { this.config.size = data.size; needsRebuild = true; }
        if (data.wallHeight !== undefined) { this.config.wallHeight = data.wallHeight; needsRebuild = true; }
        if (data.roofHeight !== undefined) { this.config.roofHeight = data.roofHeight; needsRebuild = true; }

        if (data.position !== undefined) {
            this.config.position = data.position;
            this.rootNode.position = data.position;
        }

        if (needsRebuild) {
            this.mesh.dispose();
            this.mesh = this.rebuildMesh();
        }
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
import { Scene, Vector3 } from "@babylonjs/core";
import { Building, BuildingConfig, BuildingSize, RoofType } from "./Building";
import { FlatRoofBuilding } from "./FlatRoofBuilding";
import { GableRoofBuilding } from "./GableRoofBuilding";
import { TextureManager } from "../Texture/TextureManager";

export interface CreateBuildingOptions {
    id?: string;
    type: RoofType;
    position?: Vector3;
    size: BuildingSize;
    wallHeight: number;
    roofHeight: number;
}

export class BuildingManager {
    private scene: Scene;
    private textureManager: TextureManager;
    private buildings: Map<string, Building> = new Map();

    constructor(scene: Scene, textureManager: TextureManager) {
        this.scene = scene;
        this.textureManager = textureManager;
    }

    public create(options: CreateBuildingOptions): Building {
        const id = options.id ?? this.generateId();
        const config: BuildingConfig = {
            id,
            scene: this.scene,
            position: options.position ?? Vector3.Zero(),
            size: options.size,
            wallHeight: options.wallHeight,
            roofHeight: options.roofHeight,
            textureManager: this.textureManager,
        };

        const building = options.type === 'flat'
            ? new FlatRoofBuilding(config)
            : new GableRoofBuilding(config);

        this.buildings.set(id, building);
        return building;
    }

    public get(id: string): Building | undefined {
        return this.buildings.get(id);
    }

    public getAll(): Building[] {
        return Array.from(this.buildings.values());
    }

    public update(id: string, data: Partial<Omit<BuildingConfig, 'id' | 'scene'>>): void {
        this.buildings.get(id)?.update(data);
    }

    public remove(id: string): void {
        const building = this.buildings.get(id);
        if (building) {
            building.dispose();
            this.buildings.delete(id);
        }
    }

    public select(id: string): void {
        this.buildings.forEach((b, bid) => b.setSelected(bid === id));
    }

    public clearSelection(): void {
        this.buildings.forEach(b => b.setSelected(false));
    }

    public get count(): number {
        return this.buildings.size;
    }

    public dispose(): void {
        this.buildings.forEach(b => b.dispose());
        this.buildings.clear();
    }

    private generateId(): string {
        return `building-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
}

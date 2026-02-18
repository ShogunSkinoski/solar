import { MeshBuilder, Mesh } from "@babylonjs/core";
import { Building, BuildingConfig, RoofType } from "./Building";

export class FlatRoofBuilding extends Building {
    public readonly roofType: RoofType = 'flat';

    constructor(config: BuildingConfig) {
        super(config);
    }

    protected buildMesh(): Mesh {
        const { size, wallHeight } = this.config;

        const box = MeshBuilder.CreateBox(
            `flat-roof-${this.id}`,
            {
                width: size.width,
                height: wallHeight,
                depth: size.depth,
            },
            this.scene
        );

        box.position.y = wallHeight / 2;
        box.material = this.getWallMaterial();
        return box;
    }
}

import { MeshBuilder, Mesh } from "@babylonjs/core";
import { Building, BuildingConfig, RoofType } from "./Building";

export class FlatRoofBuilding extends Building {
    public readonly roofType: RoofType = 'flat';

    constructor(config: BuildingConfig) {
        super(config);
    }

    protected buildMesh(): Mesh {
        const { size, wallHeight } = this.config;

        const group = new Mesh(`flat-roof-group-${this.id}`, this.scene);

        const box = MeshBuilder.CreateBox(
            `flat-roof-base-${this.id}`,
            {
                width: size.width,
                height: wallHeight,
                depth: size.depth,
            },
            this.scene
        );
        box.position.y = wallHeight / 2;
        box.material = this.getWallMaterial();
        box.parent = group;

        const roof = MeshBuilder.CreatePlane(`flat-roof-top-${this.id}`, {
            width: size.width,
            height: size.depth,
        }, this.scene);
        roof.rotation.x = Math.PI / 2;
        roof.position.y = wallHeight + 0.01;
        roof.material = this.getRoofMaterial();
        roof.parent = group;

        return group;
    }
}

import { Mesh, MeshBuilder, VertexData } from "@babylonjs/core";
import { Building, BuildingConfig, RoofType } from "./Building";

export class GableRoofBuilding extends Building {
    public readonly roofType: RoofType = 'gable';

    constructor(config: BuildingConfig) {
        super(config);
    }

    protected buildMesh(): Mesh {
        const { size, wallHeight, roofHeight } = this.config;
        const overhang = this.config.overhang ?? 0.5;

        const w = size.width;
        const d = size.depth;

        const base = MeshBuilder.CreateBox(
            `gable-base-${this.id}`,
            { width: w, height: wallHeight, depth: d },
            this.scene
        );
        base.position.y = wallHeight / 2;
        base.material = this.getWallMaterial();

        const hw = w / 2 + overhang;  // X overhang (gable ends)
        const hd = d / 2 + overhang;  // Z overhang (eaves)
        const roofBase = wallHeight / 2;

        const positions = [
            -hw, roofBase, -hd,  // 0 front-left
            hw, roofBase, -hd,  // 1 front-right
            hw, roofBase, hd,  // 2 back-right
            -hw, roofBase, hd,  // 3 back-left
            -hw, roofHeight, 0,  // 4 left ridge
            hw, roofHeight, 0,  // 5 right ridge
        ];

        const indices = [
            // Left gable (facing -X)
            0, 4, 3,
            // Right gable (facing +X)
            1, 5, 2,
            // Front slope (facing -Z)
            0, 5, 1,
            0, 4, 5,
            // Back slope (facing +Z)
            3, 4, 5,
            3, 5, 2,
        ];

        const uvs: number[] = [
            0, 0,   // 0
            1, 0,   // 1
            1, 1,   // 2
            0, 1,   // 3
            0, 0.5, // 4
            1, 0.5, // 5
        ];

        const normals: number[] = [];
        VertexData.ComputeNormals(positions, indices, normals);

        const vd = new VertexData();
        vd.positions = positions;
        vd.indices = indices;
        vd.normals = normals;
        vd.uvs = uvs;

        const prism = new Mesh(`gable-prism-${this.id}`, this.scene);
        vd.applyToMesh(prism);
        prism.parent = base;
        prism.material = this.getRoofMaterial();
        prism.material.backFaceCulling = false;

        base.name = `gable-roof-${this.id}`;
        return base;
    }
}
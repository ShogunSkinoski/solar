import { Mesh, MeshBuilder, VertexData } from "@babylonjs/core";
import { Building, BuildingConfig, RoofType } from "./Building";

export class GableRoofBuilding extends Building {
    public readonly roofType: RoofType = 'gable';

    constructor(config: BuildingConfig) {
        super(config);
    }

    protected buildMesh(): Mesh {
        const { size, wallHeight, roofHeight } = this.config;
        const w = size.width;
        const d = size.depth;

        const base = MeshBuilder.CreateBox(
            `gable-base-${this.id}`,
            { width: w, height: wallHeight, depth: d },
            this.scene
        );
        base.position.y = wallHeight / 2;
        base.material = this.getWallMaterial();

        const hw = w / 2;
        const hd = d / 2;

        const positions = [
            -hw, wallHeight / 2 + 0.1, -hd,  // 0 front-left  base
            hw, wallHeight / 2 + 0.1, -hd,  // 1 front-right base
            hw, wallHeight / 2 + 0.1, hd,  // 2 back-right  base
            -hw, wallHeight / 2 + 0.1, hd,  // 3 back-left   base
            0, roofHeight, -hd,  // 4 front ridge
            0, roofHeight, hd,  // 5 back ridge
        ];

        const indices = [
            // front gable face (outward normal = -Z)
            0, 1, 4,
            // back gable face (outward normal = +Z)
            3, 5, 2,
            // left slope (outward normal = -X)
            0, 5, 3,
            0, 4, 5,
            // right slope (outward normal = +X)
            1, 2, 5,
            1, 5, 4,
        ];

        const uvs: number[] = [];
        for (let i = 0; i < positions.length; i += 3) {
            uvs.push(
                (positions[i] + hw) / w,
                (positions[i + 2] + hd) / d
            );
        }

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

        base.name = `gable-roof-${this.id}`;
        return base;
    }
}

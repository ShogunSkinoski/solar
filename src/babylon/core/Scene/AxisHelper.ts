import {
    Scene,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    TransformNode,
} from '@babylonjs/core';
import { AxisHelperConstants as C } from '../Constants';

interface AxisOptions {
    length?: number;
    position?: Vector3;
}

export class AxisHelper {
    private root: TransformNode;
    private meshes: Mesh[] = [];

    constructor(scene: Scene, options: AxisOptions = {}) {
        const length = options.length ?? C.DEFAULT_LENGTH;
        const origin = options.position ?? new Vector3(0, C.ORIGIN_Y_OFFSET, 0);

        this.root = new TransformNode('axisHelper', scene);
        this.root.position = origin;

        this.meshes.push(
            ...this.buildAxis(scene, 'X', new Vector3(length, 0, 0), new Color3(C.X_COLOR.r, C.X_COLOR.g, C.X_COLOR.b)),
            ...this.buildAxis(scene, 'Y', new Vector3(0, length, 0), new Color3(C.Y_COLOR.r, C.Y_COLOR.g, C.Y_COLOR.b)),
            ...this.buildAxis(scene, 'Z', new Vector3(0, 0, length), new Color3(C.Z_COLOR.r, C.Z_COLOR.g, C.Z_COLOR.b)),
        );
    }

    private buildAxis(
        scene: Scene,
        label: string,
        direction: Vector3,
        color: Color3
    ): Mesh[] {
        const len = direction.length();
        const dir = direction.scale(1 / len);

        const mat = new StandardMaterial(`axisMat_${label}`, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color;
        mat.disableLighting = true;

        const shaft = MeshBuilder.CreateCylinder(
            `axis_${label}_shaft`,
            { height: len * C.SHAFT_RATIO, diameter: len * C.SHAFT_DIAMETER_RATIO, tessellation: C.TESSELLATION },
            scene
        );
        shaft.material = mat;
        shaft.parent = this.root;

        const head = MeshBuilder.CreateCylinder(
            `axis_${label}_head`,
            { height: len * C.HEAD_RATIO, diameterTop: 0, diameterBottom: len * C.HEAD_DIAMETER_RATIO, tessellation: C.TESSELLATION },
            scene
        );
        head.material = mat;
        head.parent = this.root;

        const up = new Vector3(0, 1, 0);
        const cross = Vector3.Cross(up, dir);
        const crossLen = cross.length();

        if (crossLen > C.CROSS_THRESHOLD) {
            const rotAxis = cross.scale(1 / crossLen);
            const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, dir))));
            shaft.rotate(rotAxis, angle);
            head.rotate(rotAxis, angle);
        } else if (Vector3.Dot(up, dir) < 0) {
            shaft.rotation.z = Math.PI;
            head.rotation.z = Math.PI;
        }

        shaft.position = dir.scale(len * C.SHAFT_RATIO / 2);
        head.position = dir.scale(len * C.SHAFT_RATIO + len * C.HEAD_RATIO / 2);

        return [shaft, head];
    }

    public dispose(): void {
        this.meshes.forEach((m) => m.dispose());
        this.root.dispose();
    }
}

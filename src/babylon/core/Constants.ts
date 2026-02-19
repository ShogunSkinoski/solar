export class CameraConstants {
    static ARC_ORTHO_SIZE = 50;
    static ARC_UPPER_BETA_LIMIT = 0;
    static ARC_LOWER_ALPHA_LIMIT = 0;
    static ARC_UPPER_ALPHA_LIMIT = 0;
    static ARC_LOWER_RADIUS_LIMIT = 10;
    static ARC_UPPER_RADIUS_LIMIT = 150;

    static ORTHO_ALPHA = 0;
    static ORTHO_BETA = 0;
    static ORTHO_RADIUS = 50;

    static PERSPECTIVE_ALPHA = 0;
    static PERSPECTIVE_BETA = Math.PI / 3;
    static PERSPECTIVE_RADIUS = 50;

    static PERSPECTIVE_LOWER_BETA_LIMIT = 0.1;
    static PERSPECTIVE_UPPER_BETA_LIMIT = Math.PI / 2;

    static PERSPECTIVE_LOWER_RADIUS_LIMIT = 10;
    static PERSPECTIVE_UPPER_RADIUS_LIMIT = 200;

    static PERSPECTIVE_PANNING_SENSIBILITY = 50;
    static PERSPECTIVE_WHEEL_PRECISION = 1;
}

export class SceneConstants {
    static GROUND_WIDTH = 100;
    static GROUND_HEIGTH = 100;
    static SUBDIVISIONS = 1;
}

export class GridTextureConstants {
    static SIZE = 512;
    static BACKGROUND_COLOR = '#1a1a22';
    static GRID_COLOR = 'rgba(100,100,140,0.5)';
    static LINE_WIDTH = 1;
    static GRID_DIVISIONS = 8;
}

export class LightConstants {
    static HEMISPHERIC_NAME = 'light';
    static DIRECTION_X = 0;
    static DIRECTION_Y = 1;
    static DIRECTION_Z = 0;
    static INTENSITY = 0.9;
    static DIFFUSE_R = 1;
    static DIFFUSE_G = 1;
    static DIFFUSE_B = 1;
    static GROUND_R = 0.3;
    static GROUND_G = 0.3;
    static GROUND_B = 0.35;
}

export class AxisHelperConstants {
    static DEFAULT_LENGTH = 5;
    static ORIGIN_Y_OFFSET = 0.01;
    static SHAFT_RATIO = 0.85;
    static HEAD_RATIO = 0.18;
    static SHAFT_DIAMETER_RATIO = 0.04;
    static HEAD_DIAMETER_RATIO = 0.1;
    static TESSELLATION = 8;
    static CROSS_THRESHOLD = 0.001;

    static X_COLOR = { r: 1, g: 0.15, b: 0.15 };
    static Y_COLOR = { r: 0.15, g: 1, b: 0.15 };
    static Z_COLOR = { r: 0.15, g: 0.45, b: 1 };
}

export class CoordinateMapperConstants {
    static MIN_SIZE = 0.1;
}

export class PlanViewConstants {
    static FOOTPRINT_R = 0.7;
    static FOOTPRINT_G = 0.4;
    static FOOTPRINT_B = 0.3;

    static SELECTED_R = 0.8;
    static SELECTED_G = 0.5;
    static SELECTED_B = 0.35;

    static OUTLINE_R = 0.3;
    static OUTLINE_G = 0.7;
    static OUTLINE_B = 1.0;

    static DEFAULT_WIDTH = 12;
    static DEFAULT_DEPTH = 9;

    static GROUND_SIZE = 100;
    static CLEAR_R = 0.12;
    static CLEAR_G = 0.12;
    static CLEAR_B = 0.16;
}

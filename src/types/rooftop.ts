export type RoofType = 'flat' | 'gable';

export interface Point2D {
    x: number;
    y: number;
}

export interface ControlPoint {
    id: string;
    x: number;
    y: number;
    type: 'corner' | 'midpoint';
    index: number;
}

export interface Building {
    id: string;
    footprint: Point2D[];
    width: number;
    heigth: number;
    roofType: RoofType;
    roofHeight: number;
    ridgeHeight: number;
}

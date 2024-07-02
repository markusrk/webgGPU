
export const isPointWithinRectangle = (point: [number,number], polygon: [number,number][]): boolean => {
    return point.x >= polygon[0].x && point.x <= polygon[2].x && point.y >= polygon[0].y && point.y <= polygon[2].y;
}
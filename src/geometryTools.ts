import * as ti from "taichi.js";

export const isPointWithinRectangle = (point: ti.Vector, polygon: ti.Vector[]): boolean => {
  return point.x >= polygon[0].x && point.x <= polygon[2].x && point.y >= polygon[0].y && point.y <= polygon[2].y;
};

const DEFAULT_OPTIONS = {
  windowSize: 50,
  windowSpacing: 200,
  windowHeight: 5,
};

export const generateWindowsAlongWall = (
  polygon: ti.Vector[],
  options: { windowSize?: number; windowSpacing?: number; windowHeight?: number }
): ti.Field => {
  const { windowSize, windowSpacing, windowHeight } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const windows = [] as [[number, number, number], [number, number, number]][];
  for (let i = 0; i < polygon.length - 1; i++) {
    const startPosition = polygon[i];
    const endPosition = polygon[i + 1];
    const relDir = sub(endPosition, startPosition);
    const dir = norm(relDir);
    const wallLength = Math.sqrt(
      Math.pow(endPosition[0] - startPosition[0], 2) + Math.pow(endPosition[1] - startPosition[1], 2)
    );
    let t = 0;
    while (t + windowSize < wallLength) {
      let t0 = t;
      t += windowSize;
      const windowStartPosition = add(startPosition, scalarMul(dir, t0)) as [number, number];
      const windowEndPosition = add(startPosition, scalarMul(dir, t)) as [number, number];
      windows.push([
        [...windowStartPosition, 0],
        [...windowEndPosition, windowHeight],
      ]);
      t += windowSpacing;
    }
  }
  return windows;
};

export type Point = [number, number, number];


export const sub = (a: Point, b: Point): Point => {
  return a.map((_, i) => a[i] - b[i]) as Point;
};

const norm = (a: Point): Point => {
  const mag = Math.sqrt(a.reduce((acc, cur) => acc + cur * cur, 0));
  return a.map((x) => x / mag) as Point;
};

export const add = (a: Point, b: Point): Point => {
  return a.map((_, i) => a[i] + b[i]) as Point;
};

const mul = (a: Point, b: Point): Point => {
  return a.map((_, i) => a[i] * b[i]) as Point;
};

export const scalarMul = (a: Point, b: number): Point => {
  return a.map((x) => x * b) as Point;
};

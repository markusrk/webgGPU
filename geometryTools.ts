import * as ti from "taichi.js";

export const isPointWithinRectangle = (
  point: ti.Vector,
  polygon: ti.Vector[]
): boolean => {
  return (
    point.x >= polygon[0].x &&
    point.x <= polygon[2].x &&
    point.y >= polygon[0].y &&
    point.y <= polygon[2].y
  );
};

export const generateWindowsAlongWall = (
  polygon: ti.Vector[],
  windowSize: number,
  windowSpacing: number
): ti.Field => {
  const windows = [] as [[number, number],[number, number]][];
  for (let i = 0; i < polygon.length-1; i++) {
    const startPosition = polygon[i];
    const endPosition = polygon[i + 1];
    const relDir = minus(endPosition, startPosition);
    const dir = norm(relDir);
    const wallLength = Math.sqrt(
      Math.pow(endPosition[0] - startPosition[0], 2) +
        Math.pow(endPosition[1] - startPosition[1], 2)
    );
    let t = 0;
    while (t + windowSize < wallLength) {
      let t0 = t;
      t += windowSize;
      const windowStartPosition = add(startPosition ,scalarMul(dir,t0)) as [number, number];
      const windowEndPosition = add(startPosition ,scalarMul(dir,t)) as [number, number];
      windows.push([windowStartPosition, windowEndPosition]);
      t += windowSpacing;
    }
  }
  return windows;
};

const minus = (a: number[], b: number[]): number[] => {
  return a.map((_, i) => a[i] - b[i]);
}

const norm = (a: number[]): number[] => {
  const mag = Math.sqrt(a.reduce((acc, cur) => acc + cur * cur, 0));
  return a.map((x) => x / mag);
}

const add = (a: number[], b: number[]): number[] => {
    return a.map((_, i) => a[i] + b[i]);
    }

const mul = (a: number[], b: number[]): number[] => {
    return a.map((_, i) => a[i] * b[i]);
    }

const scalarMul = (a: number[], b: number): number[] => {
    return a.map((x) => x * b);
    }
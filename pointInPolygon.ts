import * as ti from "taichi.js";

export function isPointInsidePolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  const numVertices = polygon.length - 1;
  let crossings = 0;

  for (let i = 0; i < numVertices; i++) {
    let [x1, y1] = polygon[i];
    let [x2, y2] = polygon[i + 1];
    if (y1 > y2) {
      [y1, y2] = [y2, y1];
    }

    if (y1 <= y && y < y2 && (x - x1) * (y2 - y1) < (x2 - x1) * (y - y1)) {
      crossings++;
    }
  }
  return crossings % 2 === 1;
}

export const initializeScoresMaskJS = (
  scoresMask: ti.Field,
  polygon: [number, number][]
): void => {
  const shape = scoresMask.dimensions;
  const tmpArray = [] as boolean[][];
  for (let i = 0; i < shape[0]; i++) {
    tmpArray.push([]);
    for (let j = 0; j < shape[1]; j++) {
      const x = i;
      const y = j;
      const point = [x, y] as [number, number];
      tmpArray[i].push(isPointInsidePolygon(point, polygon));
    }
  }
  scoresMask.fromArray(tmpArray);
};

const n = 100;
const polygon = [
  [n * 0.1, n * 0.1],
  [n * 0.1, n * 0.9],
  [n * 0.9, n * 0.9],
  [n * 0.9, n * 0.1],
  [n * 0.1, n * 0.1],
] as [number, number][];

const test = isPointInsidePolygon([50, 50], polygon);
console.log("test = ", test);
console.log("polygon = ", polygon);

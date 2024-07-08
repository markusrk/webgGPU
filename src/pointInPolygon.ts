import * as ti from "taichi.js";

export const isPointInsidePolygon= ti.func((point: ti.Vector, polygon: ti.field<ti.Vector>, polygonLength: number): boolean=> {
  const x = point[0];
  const y = point[1];
  const numVertices = polygonLength - 1;
  let crossings = 0;

  for (let i of ti.range(numVertices)) {
    let x1 = polygon[i][0];
    let y1 = polygon[i][1];
    let x2 = polygon[i + 1][0];
    let y2 = polygon[i + 1][1];

    if (y1 <= y && y < y2 && (x - x1) * (y2 - y1) < (x2 - x1) * (y - y1)){
    crossings += 1;
    }
    if (y1 >y && y >= y2 && (x - x1) * (y2 - y1) > (x2 - x1) * (y - y1)){
    crossings += 1;
    }
  }
  return crossings % 2 === 1;
})

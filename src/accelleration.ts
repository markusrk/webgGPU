import * as ti from "taichi.js";

// class Accellerator {
//     indicies: ti.Field<ti.Vector<ti.i32>>;
//     vertices:  ti.Field<ti.Vector<ti.f32>>;
//     constructor(vertices: ti.Field<ti.Vector<ti.f32>>, triangles: Triangle[]){ {
//     this.triangles= triangles;
//     }
// }

export const countTriangles = ti.func(
  (vertices: ti.Field<ti.Vector<ti.f32>>, verticesLength: number, split: number) => {
    let lCount = 0;
    let yCount = 0;

    for (let i of ti.range(verticesLength)) {
      if (vertices[i].x > split) {
        yCount += 1;
      } else {
        lCount += 1;
      }
    }
    return [lCount, yCount];
  }
);

export const sortTriangles = ti.func(
  (
    vertices: ti.Field<ti.Vector<ti.f32>>,
    verticesLength: number,
    splits: ti.Field,
    splitsLength: number,
    resultField: ti.Field<ti.Vector<ti.i32>>
  ) => {
    for (let i of (ti.range(splitsLength))) {
      let counter = 0;
      const iStart = splits[i].iStart;
      for (let j of ti.range(verticesLength)) {
        resultField[iStart + counter] = vertices[j];
        if (vertices[j].x > splits[i].xMin && vertices[j].x < splits[i].xMax) {
          counter += 1;
        }
      }
    }
    return resultField;
  }
);

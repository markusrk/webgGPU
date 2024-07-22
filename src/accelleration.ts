import * as ti from "taichi.js";

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
    for (let i of ti.range(splitsLength)) {
      let counter = 0;
      const iStart = splits[i].iStart;
      for (let j of ti.range(verticesLength)) {
        if (vertices[j].x > splits[i].xMin && vertices[j].x < splits[i].xMax) {
          resultField[iStart + counter] = vertices[j];
          counter += 1;
        }
      }
    }
    return resultField;
  }
);

const splitType = ti.types.struct({ xMin: ti.f32, xMax: ti.f32, iStart: ti.i32, iEnd: ti.i32 });


export class Accellerator {
  vertices: ti.Field<ti.Vector<ti.f32>>;
  verticesLength: ti.i32;
  indices: ti.Field<ti.Vector<ti.i32>>;
  indicesLength: ti.i32;

  indicesIndices: ti.Field<ti.i32>;
  splits: ti.Field<any>;

  sortTriangles: ti.func;
  countTriangles: ti.func;

  constructor(vertices: ti.Field<ti.Vector<ti.f32>>, indices: ti.Field<ti.Vector<ti.i32>>) {
    this.vertices = vertices;
    this.indices = indices;
    this.verticesLength = vertices.dimensions[0]/3;
    this.indicesLength = indices.dimensions[0];

    this.countTriangles = ti.classKernel(
      this,
      (split: number) => {
        let lCount = 0;
        let yCount = 0;

        for (let i of ti.range(this.verticesLength)) {
          if (this.vertices[i].x > split) {
            yCount += 1;
          } else {
            lCount += 1;
          }
        }
        return [lCount, yCount];
      }
    );
  }
   init = async () => {
    const splitCounts = await this.countTriangles(500);
    const splitPoints = splitCounts.map((_, i) =>  splitCounts.slice(0, i+1).reduce((a, b) => a + b, 0) );
    const splitsInJS = splitPoints.map((_, i) => {
      return { xMin: 500 * i, xMax: (i + 1) * 500, iStart: splitPoints[i - 1] || 0, iEnd: splitPoints[i] };
    });
    this.splits = ti.field(splitType, [splitCounts.length]) as ti.field;
    this.splits.fromArray(splitsInJS);
    this.splits.toArray().then(console.log);
   }
}



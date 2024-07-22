import * as ti from "taichi.js";
import { rayIntersectsTriangle } from "./intersect";

export const triangleTouchesBBox = ti.func((triangle, bbox) => {
    const triangleMin = [ti.f32(1000000), ti.f32(1000000), ti.f32(1000000)];
    const triangleMax = [ti.f32(-10000000), ti.f32(-10000000), ti.f32(-10000000)];
    for (let i of ti.static(ti.range(3))) {
        triangleMin[i] = ti.min(ti.min(triangle[0][i], triangle[1][i]), triangle[2][i]);
        triangleMax[i] = ti.max(ti.max(triangle[0][i], triangle[1][i]), triangle[2][i]);
    }
    return triangleMin[0] <= bbox.xMax && triangleMax[0] >= bbox.xMin && triangleMin[1] <= bbox.yMax && triangleMax[1] >= bbox.yMin;
})

export const countTriangles = ti.func(
  (
    vertices: ti.Field<ti.Vector<ti.f32>>,
    indices: ti.Field<ti.Vector<ti.i32>>,
    indicesLength: number,
    bins: { xMin: ti.f32; xMax: ti.f32, yMin: ti.f32, yMax: ti.f32 }[],
    binsLength: number,
    binsOutput: ti.Field<ti.Vector<ti.i32>>
  ) => {
    for (let j of ti.range(binsLength)) {
        for (let i of ti.range(indicesLength)) {
            const v1 = vertices[indices[i][0]];
            const v2 = vertices[indices[i][1]];
            const v3 = vertices[indices[i][2]];
            if (triangleTouchesBBox([v1, v2, v3], bins[j])) {
                binsOutput[j] += 1;
            } 
        }
  }}
);

export const sortTriangles = ti.func(
  (
    vertices: ti.Field<ti.Vector<ti.f32>>,
    indices: ti.Field<ti.Vector<ti.i32>>,
    indicesLength: number,
    indicesindices: ti.Field<ti.Vector<ti.i32>>,
    bins: ti.Field,
    splitsLength: number
  ) => {
    for (let i of ti.range(splitsLength)) {
      let counter = 0;
      const iStart = bins[i].iStart;
      for (let j of ti.range(indicesLength)) {
        const v1 = vertices[indices[j][0]];
        const v2 = vertices[indices[j][1]];
        const v3 = vertices[indices[j][2]];
        if (triangleTouchesBBox([v1, v2, v3], bins[i])) {
          indicesindices[iStart + counter] = j;
          counter += 1;
        }
      }
    }
  }
);

const splitType = ti.types.struct({ xMin: ti.f32, xMax: ti.f32, iStart: ti.i32, iEnd: ti.i32 });

export class Accellerator {
  vertices: ti.Field<ti.Vector<ti.f32>>;
  verticesLength: ti.i32;
  indices: ti.Field<ti.Vector<ti.i32>>;
  indicesLength: ti.i32;
  resultsField: ti.Field<ti.Vector<ti.f32>>;

  indicesIndices: ti.Field<ti.i32>;
  splits: ti.Field<any>;
  splitsLength: ti.i32;

  sortTriangles: ti.func;
  countTriangles: ti.func;
  intersectWithGeometry: ti.func;

  constructor(vertices: ti.Field<ti.Vector<ti.f32>>, indices: ti.Field<ti.Vector<ti.i32>>) {
    this.vertices = vertices;
    this.indices = indices;
    this.verticesLength = vertices.dimensions[0] / 3;
    this.indicesLength = indices.dimensions[0];
    this.resultsField = ti.Vector.field(3, ti.f32, [this.verticesLength * 3]) as ti.field;
    this.splitsLength = 2;
  }
  init = async () => {
    this.countTriangles = ti.classKernel(this, (split: number) => {
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
    });

    const splitCounts = await this.countTriangles(500);
    const splitPoints = splitCounts.map((_, i) => splitCounts.slice(0, i + 1).reduce((a, b) => a + b, 0));
    const splitsInJS = splitPoints.map((_, i) => {
      return { xMin: 500 * i, xMax: (i + 1) * 500, iStart: splitPoints[i - 1] || 0, iEnd: splitPoints[i] };
    });
    this.splits = ti.field(splitType, this.splitsLength) as ti.field;
    this.splits.fromArray(splitsInJS);

    this.sortTriangles = ti.classKernel(this, () => {
      for (let i of ti.range(this.splitsLength)) {
        let counter = 0;
        const iStart = this.splits[i].iStart;
        for (let j of ti.range(this.verticesLength)) {
          if (this.vertices[j].x > this.splits[i].xMin && this.vertices[j].x < this.splits[i].xMax) {
            this.resultsField[iStart + counter] = this.vertices[j];
            counter += 1;
          }
        }
      }
    });
    await this.sortTriangles();
    this.resultsField.toArray().then(console.log);

    this.intersectWithGeometry = ti.classKernel(this, { ray: ti.types.vector(ti.f32, 3) }, (ray: ti.Vector<ti.f32>) => {
      let selectedSplitIndex = 0;
      for (let i of ti.range(splitCounts.length)) {
        if (ray[0] > this.splits[i].xMin && ray[0] < this.splits[i].xMax) {
          selectedSplitIndex = i;
        }
      }

      const split = this.splits[selectedSplitIndex];

      let isHit = false;
      let intersectionPoint = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector;
      let t = ti.f32(1000000000);
      let triangleNormal = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector;
      for (let m of ti.range(split.iEnd - split.iStart)) {
        let m2 = m + split.iStart;
        const step = m2 * 3;
        const v1 = this.resultsField[step];
        const v2 = this.resultsField[step + 1];
        const v3 = this.resultsField[step + 2];
        const res = rayIntersectsTriangle(ray, [0, 0, -1], v1, v2, v3);
        if (res.intersects && res.t < t && res.t > 0.00001) {
          isHit = true;
          intersectionPoint = res.intersectionPoint;
          t = res.t;
          triangleNormal = res.triangleNormal;
        }
      }
      return { isHit, intersectionPoint, triangleNormal };
    });
  };
}

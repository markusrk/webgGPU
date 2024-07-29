import * as ti from "taichi.js";
import { Point } from "../geometryTools";

export type BinsTypeJS = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  iStart: number;
  iEnd: number;
};
export const binsType = ti.types.struct({
  xMin: ti.f32,
  xMax: ti.f32,
  yMin: ti.f32,
  yMax: ti.f32,
  zMin: ti.f32,
  zMax: ti.f32,
  iStart: ti.i32,
  iEnd: ti.i32,
});

const createBinsInJS = (binCount: number, min: Point, max: Point) => {
  const binSizeX = (max[0] - min[0]) / binCount;
  const binSizeY = (max[1] - min[1]) / binCount;
  const newBinsInJS = [];
  for (let i = 0; i < binCount; i += 1) {
    const binRow = [];
    for (let j = 0; j < binCount; j += 1) {
      binRow.push({
        xMin: i * binSizeX,
        xMax: (i + 1) * binSizeX,
        yMin: j * binSizeY,
        yMax: (j + 1) * binSizeY,
        zMin: 100000,
        zMax: -100000,
        iStart: 0,
        iEnd: 0,
      });
    }
    newBinsInJS.push(binRow);
  }
  return newBinsInJS;
};

export const createBins = (binCount: number, min, max) => {
  const binsInJS = createBinsInJS(binCount, min, max);
  const binsLength = [binsInJS.length,binsInJS[0].length];
  const bins = ti.field(binsType, binsLength) as ti.field;
  bins.fromArray(binsInJS);
  return { bins, binsLength };
};

export const updateBinsWithIndexes = async (bins, trianglesPerBin) => {
  const binsInJS = await bins.toArray();
  const binCount= binsInJS.length;
  const flatTrianglesPerBin = trianglesPerBin.flat();
  const flatSplitPoints = flatTrianglesPerBin.map((val,i) => flatTrianglesPerBin.slice(0,i+1).reduce((a,b) => a+b,0));
  const flatBinsWithIndexesInJS = flatSplitPoints.map((_, i) => {
    return { ...binsInJS.flat()[i], iStart: flatSplitPoints[i - 1] || 0, iEnd: flatSplitPoints[i] };
  });
  
  const binsWithIndexesInJS: number[][] = [];
  for (let i = 0; i < flatBinsWithIndexesInJS.length; i += binCount) {
    binsWithIndexesInJS.push(flatBinsWithIndexesInJS.slice(i, i + binCount));
  }
  bins.fromArray(binsWithIndexesInJS);
  return bins;
};
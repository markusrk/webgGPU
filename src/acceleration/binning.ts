import * as ti from "taichi.js";
import { Point } from "../geometryTools";

export const binsType = ti.types.struct({
  xMin: ti.f32,
  xMax: ti.f32,
  yMin: ti.f32,
  yMax: ti.f32,
  iStart: ti.i32,
  iEnd: ti.i32,
});

const createBinsInJS = (binCount: number, min: Point, max: Point) => {
  const binSizeX = (max[0] - min[0]) / binCount;
  const binSizeY = (max[1] - min[1]) / binCount;
  const newBinsInJS = [];
  for (let i = 0; i < binCount; i += 1) {
    for (let j = 0; j < binCount; j += 1) {
      newBinsInJS.push({ xMin: i*binSizeX, xMax: (i+1) * binSizeX, yMin: j*binSizeY, yMax: (j+1) * binSizeY, iStart: 0, iEnd: 0 });
    }
  }
  return newBinsInJS;
};

export const createBins = (binCount: number, min, max) => {
  const binsInJS = createBinsInJS(binCount, min, max);
  const binsLength = binsInJS.length;
  const bins = ti.field(binsType, [binsLength]) as ti.field;
  bins.fromArray(binsInJS);
  return { bins, binsLength };
};

export const updateBins = async (bins, trianglesPerBin) => {
    const binsInJS = await bins.toArray();
    console.log("trianglesPerBin", trianglesPerBin);
    const splitPoints = trianglesPerBin.map((_, i) => trianglesPerBin.slice(0, i + 1).reduce((a, b) => a + b, 0));
  
    const binsWithIndexesInJS = splitPoints.map((_, i) => {
      return { ...binsInJS[i], iStart: splitPoints[i - 1] || 0, iEnd: splitPoints[i] };
    });
  
    bins.fromArray(binsWithIndexesInJS);
    bins.toArray().then(console.log);

    return bins
}
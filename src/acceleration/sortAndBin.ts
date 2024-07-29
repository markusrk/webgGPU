import * as ti from "taichi.js";
import { createBins, updateBinsWithIndexes } from "./binning";
import { countTriangles, findMinMax, sortTriangles } from "./supportFunctions";

export const sortAndBin = async (vertices, indices, indicesLength) => {
  ti.addToKernelScope({ indicesLength });
  const minMaxKernel = ti.kernel(() => {
    return findMinMax(vertices, indicesLength);
  });
  const { min, max } = await minMaxKernel();
  const { bins, binsLength } = createBins(20, min, max);

  const countsPerBins = ti.field(ti.i32, binsLength) as ti.field;

  ti.addToKernelScope({ bins, binsLength, countsPerBins });
  const countKernel = ti.kernel(() => {
    countTriangles(vertices, indices, indicesLength, bins, binsLength, countsPerBins);
  });
  let start = performance.now();
  await countKernel();
  console.log("countKernel", performance.now() - start);
  const countsPerBinJS = await countsPerBins.toArray();

  await updateBinsWithIndexes(bins, countsPerBinJS);
  const indicesIndicesLength = countsPerBinJS.flat().reduce((a, b) => a + b, 0);
  const indicesindices = ti.field(ti.i32, [indicesIndicesLength]) as ti.field;

  ti.addToKernelScope({ indicesindices });

  const sortKernel = ti.kernel(() => {
    sortTriangles(vertices, indices, indicesLength, indicesindices, bins, binsLength);
  });

  start = performance.now();
  await sortKernel();
  console.log("sortKernel", performance.now() - start);

  return { bins, binsLength, indicesindices, indicesIndicesLength };
};

export const aggregatedBinsType = ti.types.struct({
  xMin: ti.f32,
  xMax: ti.f32,
  yMin: ti.f32,
  yMax: ti.f32,
  zMin: ti.f32,
  zMax: ti.f32,
  iStart: ti.i32,
  iEnd: ti.i32,
  jStart: ti.i32,
  jEnd: ti.i32,
});

export const aggregateBins = async (bins, binSize) => {
  const binsInJS = await bins.toArray();
  const binsLength = [binsInJS.length, binsInJS[0].length];
  const aggreGateBinsInJS = [];
  for (let i = 0; i < binsLength[0]; i = i + binSize) {
    const xSlice = binsInJS.slice(i, i + binSize);
    const ySlice = binsInJS.slice(i, i + binSize);
    const zSlice = binsInJS.slice(i, i + binSize);
    for (let j = 0; j < binsLength[1]; j = j + binSize) {
      const xMin = xSlice.flatMap((slice)=>slice.slice(j, j + binSize)).reduce((a, b) => Math.min(a, b.xMin), 100000);
      const xMax = xSlice.flatMap((slice)=>slice.slice(j, j + binSize)).reduce((a, b) => Math.max(a, b.xMax), -100000);
      const yMin = ySlice.flatMap((slice)=>slice.slice(j, j + binSize)).reduce((a, b) => Math.min(a, b.yMin), 100000);
      const yMax = ySlice.flatMap((slice)=>slice.slice(j, j + binSize)).reduce((a, b) => Math.max(a, b.yMax), -100000);
      const zMin = zSlice.flatMap((slice)=>slice.slice(j, j + binSize)).reduce((a, b) => Math.min(a, b.zMin), 100000);
      const zMax = zSlice.flatMap((slice)=>slice.slice(j, j + binSize)).reduce((a, b) => Math.max(a, b.zMax), -100000);
      const iStart = i;
      const iEnd = i + binSize;
      const jStart = j;
      const jEnd = j + binSize;
      aggreGateBinsInJS.push({
        xMin,
        xMax,
        yMin,
        yMax,
        zMin,
        zMax,
        iStart,
        iEnd,
        jStart,
        jEnd,
      });
    }
  }
  const tlBinsLength = aggreGateBinsInJS.length;
  const tlBins = ti.field(aggregatedBinsType, [tlBinsLength]) as ti.field;
  tlBins.fromArray(aggreGateBinsInJS);

  ti.addToKernelScope({ tlBins, tlBinsLength });
  return { tlBins, tlBinsLength };
};

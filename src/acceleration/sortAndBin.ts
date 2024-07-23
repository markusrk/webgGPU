import * as ti from "taichi.js";
import { countTriangles, sortTriangles } from "./supportFunctions";

export const sortAndBin = async (vertices, indices) => {
  const binSize = 100;
  const newBinsInJS = [];
  for (let i = 0; i < 1000; i += binSize) {
    for (let j = 0; j < 1000; j += binSize) {
      newBinsInJS.push({ xMin: i, xMax: i + binSize, yMin: j, yMax: j + binSize, iStart: 0, iEnd: 0 });
    }
  }
  const binsInJS = newBinsInJS;
  const binsLength = binsInJS.length;
  const binsType = ti.types.struct({
    xMin: ti.f32,
    xMax: ti.f32,
    yMin: ti.f32,
    yMax: ti.f32,
    iStart: ti.i32,
    iEnd: ti.i32,
  });
  const bins = ti.field(binsType, [binsLength]) as ti.field;
  bins.fromArray(binsInJS);

  const binsOutput = ti.field(ti.i32, [binsLength]) as ti.field;

  ti.addToKernelScope({ bins, binsLength, binsOutput });
  const countKernel = ti.kernel(() => {
    countTriangles(vertices, indices, M, bins, binsLength, binsOutput);
  });

  await countKernel();
  const trianglesPerBin = await binsOutput.toArray();
  console.log("trianglesPerBin", trianglesPerBin);
  const totalIndicesIndices = trianglesPerBin.reduce((a, b) => a + b, 0);
  const splitPoints = trianglesPerBin.map((_, i) => trianglesPerBin.slice(0, i + 1).reduce((a, b) => a + b, 0));

  const binsWithIndexesInJS = splitPoints.map((_, i) => {
    return { ...binsInJS[i], iStart: splitPoints[i - 1] || 0, iEnd: splitPoints[i] };
  });

  bins.fromArray(binsWithIndexesInJS);
  bins.toArray().then(console.log);

  const indicesindices = ti.field(ti.i32, [totalIndicesIndices]) as ti.field;

  ti.addToKernelScope({ indicesindices });

  const sortKernel = ti.kernel(() => {
    sortTriangles(vertices, indices, M, indicesindices, bins, binsLength);
  });

  await sortKernel().then(() => console.log("sortKernel done"));

  return { bins, binsLength, indicesindices };
};

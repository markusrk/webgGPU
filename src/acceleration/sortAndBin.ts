import * as ti from "taichi.js";
import { countTriangles, findMinMax, sortTriangles } from "./supportFunctions";
import { createBins, updateBinsWithIndexes } from "./binning";

export const sortAndBin = async (vertices, indices, indicesLength) => {
  ti.addToKernelScope({ indicesLength });
  const minMaxKernel = ti.kernel(() => {
    return findMinMax(vertices, indicesLength);
  });
  const { min, max } = await minMaxKernel();
  const { bins, binsLength } = createBins(10, min, max);

  const binsOutput = ti.field(ti.i32, [binsLength]) as ti.field;

  ti.addToKernelScope({ bins, binsLength, binsOutput });
  const countKernel = ti.kernel(() => {
    countTriangles(vertices, indices, indicesLength, bins, binsLength, binsOutput);
  });
  let start = performance.now();
  await countKernel();
  console.log("countKernel", performance.now() - start);
  const trianglesPerBin = await binsOutput.toArray();

  await updateBinsWithIndexes(bins, trianglesPerBin);
  const indicesIndicesLength = trianglesPerBin.reduce((a, b) => a + b, 0);
  const indicesindices = ti.field(ti.i32, [indicesIndicesLength]) as ti.field;

  ti.addToKernelScope({ indicesindices });

  const sortKernel = ti.kernel(() => {
    sortTriangles(vertices, indices, indicesLength, indicesindices, bins, binsLength);
  });

  start = performance.now();
  await sortKernel()
  console.log("sortKernel", performance.now() - start);
  
  return { bins, binsLength, indicesindices, indicesIndicesLength };
};

import * as ti from "taichi.js";
import { rayIntersectsTriangle } from "../intersect";
import { countTriangles, sortTriangles } from "../accelleration";

const N = 1000;

let htmlCanvas;
let canvas;

export const init = async (input_canvas) => {
  htmlCanvas = input_canvas;
  await ti.init();
  canvas = new ti.Canvas(htmlCanvas);
};

export const initialize = async () => {
  await ti.init();

  const pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.field;

  const M = 100000;
  const vertices = ti.Vector.field(3, ti.f32, [M * 3]) as ti.field;
  const indices = ti.Vector.field(3, ti.i32, [M]) as ti.field;
  const indicesindices = ti.field(ti.i32, [M]) as ti.field;

  ti.addToKernelScope({
    vertices,
    indices,
    M,
    N,
    pixels,
    rayIntersectsTriangle,
    countTriangles,
    sortTriangles,
    indicesindices,
  });

  const initVertices = ti.kernel(() => {
    const scale = 1000;
    const smallScale = 10;
    for (let i of ti.range(M)) {
      const step = i * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scale];
      vertices[step + 1] = vertices[step] + [ti.max(ti.random(), 0.1) * smallScale, 0, 0];
      vertices[step + 2] = vertices[step] + [0, ti.max(ti.random(), 0.1) * smallScale, 0];
      indices[i] = [step, step + 1, step + 2];
    }
    return true;
  });
  await initVertices().then(() => console.log("initVertices done"));

  const newBinsInJS = [];
  for (let i = 0; i < 1000; i += 100) {
    for (let j = 0; j < 1000; j += 100) {
      newBinsInJS.push({ xMin: i, xMax: i + 100,yMin: j, yMax: j+100, iStart: 0, iEnd: 0 });
    }
  }
  const binsInJS = newBinsInJS;
  const binsLength = binsInJS.length;
  const binsType = ti.types.struct({ xMin: ti.f32, xMax: ti.f32, yMin: ti.f32, yMax: ti.f32, iStart: ti.i32, iEnd: ti.i32 });
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
  const splitPoints = trianglesPerBin.map((_, i) => trianglesPerBin.slice(0, i + 1).reduce((a, b) => a + b, 0));

  const binsWithIndexesInJS = splitPoints.map((_, i) => {
    return { ...binsInJS[i], iStart: splitPoints[i - 1] || 0, iEnd: splitPoints[i] };
  });

  bins.fromArray(binsWithIndexesInJS);
  bins.toArray().then(console.log);

  const sortKernel = ti.kernel(() => {
    sortTriangles(vertices, indices, M, indicesindices, bins, binsLength);
  });

  await sortKernel().then(() => console.log("sortKernel done"));

  const acceleratedCalculatePixels = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      let color = [ti.f32(0), 0, 0];

      let selectedSplitIndex = 0;
      for (let i of ti.range(binsLength)) {
        if (I[0] > bins[i].xMin && I[0] < bins[i].xMax && I[1] > bins[i].yMin && I[1] < bins[i].yMax) {
          selectedSplitIndex = i;
        }
      }

      const split = bins[selectedSplitIndex];

      for (let m of ti.range(split.iEnd - split.iStart)) {
        let m2 = m + split.iStart;
        const indicesForTriangle = indices[indicesindices[m2]];
        const v1 = vertices[indicesForTriangle[0]];
        const v2 = vertices[indicesForTriangle[1]];
        const v3 = vertices[indicesForTriangle[2]];
        const res = rayIntersectsTriangle([I[0], I[1], 10000], [0, 0, -1], v1, v2, v3);
        color = color + res.intersects * (1 - res.t / 10000) * 255;
      }
      pixels[I] = color;
    }
    return true;
  });
  const calculatePixels = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      let color = [ti.f32(0), 0, 0];

      for (let m of ti.range(M + 1)) {
        const m2 = m * 3;
        const indicesForTriangle = indices[m];
        const v1 = vertices[indicesForTriangle[0]];
        const v2 = vertices[indicesForTriangle[1]];
        const v3 = vertices[indicesForTriangle[2]];
        // const v1 = vertices[m2 + 0];
        // const v2 = vertices[m2 + 1];
        // const v3 = vertices[m2 + 2];
        const res = rayIntersectsTriangle([I[0], I[1], 10000], [0, 0, -1], v1, v2, v3);
        color = color + res.intersects * 255;
      }
      pixels[I] = color;
    }
    return true;
  });

  const start = performance.now();
  await acceleratedCalculatePixels();
  console.log("time spent", performance.now() - start);
  await canvas.setImage(pixels).then(() => console.log("setImage done"));

  // requestAnimationFrame(frame);

  return;
};

import * as ti from "taichi.js";
import { rayIntersectsTriangle } from "../intersect";
import { countTriangles, sortTriangles, triangleTouchesBBox } from "../acceleration/supportFunctions";
import { sortAndBin } from "../acceleration/sortAndBin";

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

  ti.addToKernelScope({
    vertices,
    indices,
    M,
    N,
    pixels,
    rayIntersectsTriangle,
    countTriangles,
    sortTriangles,
    triangleTouchesBBox,
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
  const { bins, binsLength, indicesindices } = await sortAndBin(vertices, indices);

  const acceleratedCalculatePixels = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      let color = [ti.f32(0), 0, 0];

      let selectedSplitIndex = 0;
      for (let i of ti.range(binsLength)) {
        if (I[0] >= bins[i].xMin && I[0] < bins[i].xMax && I[1] >= bins[i].yMin && I[1] < bins[i].yMax) {
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

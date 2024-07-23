import * as ti from "taichi.js";
import { rayIntersectsTriangle } from "../intersect";
import { countTriangles, findMinMax, sortTriangles, triangleTouchesBBox } from "../acceleration/supportFunctions";
import { sortAndBin } from "../acceleration/sortAndBin";
import { initRandomVertices } from "./geometryInit";
import { intersectRayWithAcceleratedGeometry } from "../acceleration/intersect";

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
  // this line is meant to add all support functions to kernel scope. It is ugly, but i had trouble using add to kernel scope locally in each file.
  ti.addToKernelScope({
    rayIntersectsTriangle,
    countTriangles,
    sortTriangles,
    triangleTouchesBBox,
    intersectRayWithAcceleratedGeometry,
    findMinMax,
  });

  const pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.field;

  const M = 10000;

  ti.addToKernelScope({
    M,
    N,
    pixels,
  });

  const { vertices, indices } = await initRandomVertices(M);
  const { bins, binsLength, indicesindices } = await sortAndBin(vertices, indices, M);

  const acceleratedCalculatePixels = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      let color = [ti.f32(0), 0, 0];
      const res = intersectRayWithAcceleratedGeometry(
        [0, 0, 1],
        [I[0], I[1], 1],
        bins,
        binsLength,
        vertices,
        indices,
        indicesindices
      );
      color = color + res.isHit * (1 - res.t / 10000) * 255;

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
  // await calculatePixels()
  console.log("time spent", performance.now() - start);
  await canvas.setImage(pixels).then(() => console.log("setImage done"));

  // requestAnimationFrame(frame);

  return;
};

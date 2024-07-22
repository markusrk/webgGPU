import * as ti from "taichi.js";
import { rayIntersectsTriangle } from "../intersect";

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

  let triangleInJs = [
    [N * 0.1, N * 0.1, 0],
    [N * 0.4, N * 0.1, 0],
    [N * 0.1, N * 0.4, 0],
  ] as [number, number, number][];

  const triangle = ti.Vector.field(3, ti.f32, [3]) as ti.field;
  triangle.fromArray(triangleInJs);
  const pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.field;

  const M = 100000;
  const vertices = ti.Vector.field(3, ti.f32, [M * 3]) as ti.field;
  const indices = ti.Vector.field(3, ti.i32, [M * 3]) as ti.field;

  let testValue = ti.Vector.field(3, ti.f32, [4]) as ti.field;

  ti.addToKernelScope({
    vertices,
    indices,
    M,
    N,
    pixels,
    rayIntersectsTriangle,
    testValue,
    triangle,
  });

  const initVertices = ti.kernel(() => {
    const scale = 1000;
    const smallScale = 10;
    for (let i of ti.range(M)) {
      const step = i * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scale];
      vertices[step + 1] = vertices[step] + [ti.random() * smallScale, 0, 0];
      vertices[step + 2] = vertices[step] + [0, ti.random() * smallScale, 0];
      indices[step] = [step, step + 1, step + 2];
    }
    return true;
  });
  await initVertices().then(() => console.log("initVertices done"));

  const calculatePixels = ti.kernel({ start: ti.i32, stepSize2: ti.i32 }, (start, stepSize2) => {
    for (let I of ti.ndrange(N, N)) {
      let isInside = pixels[I][0] > 0;
      let color = [ti.f32(0), 0, 0];
      for (let m of ti.range(stepSize2)) {
        let m2 = m + start;
        const step = m2 * 3;
        const v1 = vertices[step];
        const v2 = vertices[step + 1];
        const v3 = vertices[step + 2];
        const res = rayIntersectsTriangle([I[0], I[1], 10000], [0, 0, -1], v1, v2, v3);
        isInside = isInside || res.intersects;
        color = color + isInside * ( 1- res.t/10000)*255;
      }
      pixels[I] = color
    }
    return true;
  });
  const stepSize = 50000;
  let i = 0;
  while (i < M) {
    const start = performance.now();
    await calculatePixels(i, stepSize);
    console.log("time spent", performance.now() - start);
    i += stepSize;
  }
  await canvas.setImage(pixels).then(() => console.log("setImage done"));

  // requestAnimationFrame(frame);
  testValue.toArray().then(console.log);

  return;
};

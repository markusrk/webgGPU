import { i as ie, E as Er, h as hr, g as gr, m as mr, c as cr, a as rayIntersectsTriangle, d as dr } from "./intersect-Dp00BRkN.mjs";
const N = 1e3;
let htmlCanvas$1;
let canvas;
const init = async (input_canvas) => {
  htmlCanvas$1 = input_canvas;
  await ie();
  canvas = new Er(htmlCanvas$1);
};
const initialize = async () => {
  await ie();
  let triangleInJs = [
    [N * 0.1, N * 0.1, 0],
    [N * 0.4, N * 0.1, 0],
    [N * 0.1, N * 0.4, 0]
  ];
  const triangle = hr.field(3, gr, [3]);
  triangle.fromArray(triangleInJs);
  const pixels = hr.field(3, gr, [N, N]);
  const M = 1e6;
  const vertices = hr.field(3, gr, [M * 3]);
  const indices = hr.field(3, mr, [M * 3]);
  let testValue = hr.field(3, gr, [4]);
  cr({
    vertices,
    indices,
    M,
    N,
    pixels,
    rayIntersectsTriangle,
    testValue,
    triangle
  });
  const initVertices = dr(`() => {
    const scale = 1e3;
    const smallScale = 10;
    for (let i2 of ti.range(M)) {
      const step = i2 * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scale];
      vertices[step + 1] = vertices[step] + [ti.random() * smallScale, 0, 0];
      vertices[step + 2] = vertices[step] + [0, ti.random() * smallScale, 0];
      indices[step] = [step, step + 1, step + 2];
    }
    return true;
  }`);
  await initVertices().then(() => console.log("initVertices done"));
  const calculatePixels = dr({ start: mr, stepSize2: mr }, `(start, stepSize2) => {
    for (let I of ti.ndrange(N, N)) {
      let isInside = pixels[I][0] > 0;
      for (let m of ti.range(stepSize2)) {
        let m2 = m + start;
        const step = m2 * 3;
        const v1 = vertices[step];
        const v2 = vertices[step + 1];
        const v3 = vertices[step + 2];
        const isInsideThisTriangle = rayIntersectsTriangle([I[0], I[1], 1e4], [0, 0, -1], v1, v2, v3);
        isInside = isInside || isInsideThisTriangle;
      }
      pixels[I] = [255 * isInside, 0, 0];
    }
    return true;
  }`);
  const stepSize = 5e4;
  let i = 0;
  while (i < M) {
    await calculatePixels(i, stepSize).then(() => console.log("calculatePixels done"));
    i += stepSize;
  }
  await canvas.setImage(pixels).then(() => console.log("setImage done"));
  testValue.toArray().then(console.log);
  return;
};
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = 1e3;
htmlCanvas.height = 1e3;
const main = async () => {
  await init(htmlCanvas);
  console.log("starting precomute");
  await initialize();
  console.log("precomute done");
};
main();

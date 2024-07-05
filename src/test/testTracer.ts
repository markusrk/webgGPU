import * as ti from "taichi.js";


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
    [N * 0.1, N * 0.4, 0],
    [N * 0.9, N * 0.9, 0],
  ] as [number, number, number][];

  const triangle = ti.Vector.field(3, ti.f32, [3]) as ti.field;
  triangle.fromArray(triangleInJs);
  const pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.field;

  const m = 1000000;
  const vertices = ti.Vector.field(3, ti.f32, [m]) as ti.field;
  const indices = ti.Vector.field(3, ti.i32, [m]) as ti.field;

  ti.addToKernelScope({
    vertices,
    indices,
    m,
    N,
    pixels
  });

  const initVertices = ti.kernel(() => {
    const scale = 100;
    for (let i of ti.range(m / 3)) {
      const step = i * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scale];
      vertices[step + 1] = vertices[step] + [1, 1, 0];
      vertices[step + 2] = vertices[step] + [0, 0, 1];
      indices[step] = [step, step + 1, step + 2];
    }
  });
  initVertices();

  const calculatePixels = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {

      pixels[I] = [255, 0, 0];
    }
  })
  calculatePixels()
  canvas.setImage(pixels);


  return;
};

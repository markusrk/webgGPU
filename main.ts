import * as ti from "taichi.js";
import { Vector, range } from "taichi.js/dist/taichi";

let main = async () => {
  await ti.init();

  console.log("initialising grid");
  const n = 2000;
  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const scores = ti.field(ti.f32, [n, n]) as ti.Field;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;

  console.log("initialising rectangles");

  const Rectangle = ti.types.struct({
    x0: ti.f32,
    x1: ti.f32,
    y0: ti.f32,
    y1: ti.f32,
  });
  const rectangleCount = 100;
  const rectangles = ti.field(Rectangle, [rectangleCount]);

  for (let i of range(rectangleCount)) {
    const x0 = Math.max(0, Math.random() * n - 5);
    const x1 = x0 + 5;
    const y0 = Math.max(0, Math.random() * n - 5);
    const y1 = y0 + 5;
    const struct = { x0, x1, y0, y1 };
    rectangles.set([i], struct);
  }

  type Window = { x0; number; x1: number; y0: number; y1: number };

  console.log("initialising analysis points");

  const analysisPointCount = 10;
  const analysisPoints = ti.Vector.field(2, ti.f32, [
    analysisPointCount,
  ]) as ti.Field;

  console.log("adding to kernel scope");

  ti.addToKernelScope({
    points,
    pixels,
    n,
    rectangles,
    rectangleCount,
    analysisPoints,
    analysisPointCount,
    scores,
  });

  console.log("creating kernel");

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(n, n)) {
      points[I] = [I[0], I[1], 0];
    }
  });

  const initilizeAnalysisPoints = ti.kernel(() => {
    for (let i of ti.range(analysisPointCount)) {
      analysisPoints[i] = [n * 2 * ti.sin(i / 50), n * 2 * ti.cos(i / 50)];
    }
  });

  const updateAnalysisPoint = ti.kernel((t: number) => {
    for (let i of ti.range(analysisPointCount)) {
      analysisPoints[i] = [
        n * 2 * ti.sin(t / 50 + i * 1),
        n * 2 * ti.cos(t / 50 + i * 1),
      ];
    }
  });

  const updateTexture = ti.kernel(() => {
    const adjustmentFactor = 10 / analysisPointCount / ti.sqrt(rectangleCount);
    for (let I of ti.ndrange(n, n)) {
      const color = adjustmentFactor * scores[I];
      pixels[I] = [color, color, color];
    }
  });

  const kernel = ti.kernel((time: number) => {
    const goesThroughWindowsCount = (position: ti.Vector) => {
      let count = 0;
      const pos = position.xy as ti.Vector;
      for (let k of ti.range(analysisPointCount)) {
        const analysisPoint = analysisPoints[k] as ti.Vector;
        for (let i of ti.range(rectangleCount)) {
          const rectangle = rectangles[i];
          const dir = (analysisPoint - pos) as ti.Vector;
          const t = (rectangle.y0 - pos.y) / dir.y;
          if (t > 0) {
            const intersection = pos + dir * t;
            if (
              intersection.x > rectangle.x0 &&
              intersection.x <= rectangle.x1
            ) {
              count += 1;
            }
          }
        }
      }
      return count;
    };

    for (let I of ti.ndrange(n, n)) {
      for (let i of ti.range(1)) {
        scores[I] = goesThroughWindowsCount(points[I]);
      }
    }
  });

  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  htmlCanvas.width = n;
  htmlCanvas.height = n;
  let canvas = new ti.Canvas(htmlCanvas);
  initilizeGrid();
  initilizeAnalysisPoints();

  let i = 0;
  async function frame() {
    i = i + 1;
    let startTime = performance.now();
    updateAnalysisPoint(i);
    const updateAnalysisPointTime = performance.now() - startTime;
    i <= 200 &&
      console.log(`updateAnalysisPoint time: ${updateAnalysisPointTime} ms`);

    startTime = performance.now();
    kernel(i);
    const kernelTime = performance.now() - startTime;
    i <= 200 && console.log(`kernel time: ${kernelTime} ms`);

    startTime = performance.now();
    updateTexture();
    const updateTextureTime = performance.now() - startTime;
    i <= 200 && console.log(`updateTexture time: ${updateTextureTime} ms`);

    startTime = performance.now();
    canvas.setImage(pixels);
    const setImageTime = performance.now() - startTime;
    i <= 200 && console.log(`setImage time: ${setImageTime} ms`);

    startTime = performance.now();
    requestAnimationFrame(frame);
    const requestAnimationFrameTime = performance.now() - startTime;
    i <= 200 &&
      console.log(
        `requestAnimationFrame time: ${requestAnimationFrameTime} ms`
      );
  }
  requestAnimationFrame(frame);
};
main();

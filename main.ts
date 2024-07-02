import * as ti from "taichi.js";
import { Vector, range } from "taichi.js/dist/taichi";

let main = async () => {
  await ti.init();
  
  const n = 2000;
  const rectangleCount = 100;
  const analysisPointCount = 10;

  console.log("initialising grid");
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
  const rectangles = ti.field(Rectangle, [rectangleCount]);

  for (let i of range(rectangleCount)) {
    const x0 = Math.max(0, Math.random() * n - 5);
    const x1 = x0 + 5;
    const y0 = Math.max(0, Math.random() * n - 5);
    const y1 = y0 + 5;
    const struct = { x0, x1, y0, y1 };
    rectangles.set([i], struct);
  }

  console.log("initialising analysis points");

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
    const goesThroughRectangleCount = (position: ti.Vector) => {
      let count = 0;
      const pos = position.xy as ti.Vector;
      for (let k of ti.range(analysisPointCount)) {
        const analysisPoint = analysisPoints[k] as ti.Vector;
        for (let i of ti.range(rectangleCount)) {
          const rectangle = rectangles[i];
          const startRec = [rectangle.x0, rectangle.y0] as ti.Vector;
          const endRec = [rectangle.x1, rectangle.y1] as ti.Vector;
          const planeTangentVec = (endRec - startRec) as ti.Vector;
          const planeNormVec = [
            planeTangentVec.y,
            -planeTangentVec.x,
          ] as ti.Vector;
          const rayDir = (analysisPoint - pos) as ti.Vector;
          const dot = ti.dot(planeNormVec, rayDir);
          if (dot <= 0.00001) {
            continue;
          }
          const t2 =
            ti.dot(startRec - pos, planeNormVec) / ti.dot(rayDir, planeNormVec);
          const pointInPlane = pos + rayDir * t2;
          const isInside =
            ti.dot(startRec - pointInPlane, endRec - pointInPlane) <= 0;

          if (isInside && t2 > 0) {
            count = count + 1;
          }
        }
      }
      return count;
    };

    for (let I of ti.ndrange(n, n)) {
      for (let i of ti.range(1)) {
        scores[I] = goesThroughRectangleCount(points[I]);
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

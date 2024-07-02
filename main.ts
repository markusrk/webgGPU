import * as ti from "taichi.js";
import { Vector, range } from "taichi.js/dist/taichi";
import {
  generateWindowsAlongWall,
  isPointWithinRectangle,
} from "./geometryTools";
import { initializeScoresMaskJS } from "./pointInPolygon";

let main = async () => {
  await ti.init();

  const n = 100;
  const analysisPointResolutionInDegrees = 1000;

  console.log("initialising grid");
  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const scoresMask = ti.field(ti.f32, [n, n]) as ti.Field;
  const scores = ti.field(ti.f32, [n, n]) as ti.Field;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;

  console.log("initialising rectangles");

  const Rectangle = ti.types.struct({
    x0: ti.f32,
    x1: ti.f32,
    y0: ti.f32,
    y1: ti.f32,
  });

  const polygon = [
    [n * 0.1, n * 0.1],
    [n * 0.1, n * 0.9],
    [n * 0.9, n * 0.9],
    [n * 0.9, n * 0.1],
    [n * 0.1, n * 0.1],
  ] as [number, number][];
  const windowsInJS = generateWindowsAlongWall(polygon, 5, 400);
  const rectangleCount = windowsInJS.length;
  const windows = ti.field(Rectangle, rectangleCount);

  for (let i of range(rectangleCount)) {
    const x0 = windowsInJS[i][0][0];
    const x1 = windowsInJS[i][1][0];
    const y0 = windowsInJS[i][0][1];
    const y1 = windowsInJS[i][1][1];
    const struct = { x0, x1, y0, y1 };
    windows.set([i], struct);
  }

  console.log("initialising analysis points");

  const analysisPoints = ti.Vector.field(2, ti.f32, [
    analysisPointResolutionInDegrees,
  ]) as ti.Field;

  console.log("adding to kernel scope");

  ti.addToKernelScope({
    points,
    pixels,
    n,
    windows,
    rectangleCount,
    analysisPoints,
    analysisPointResolutionInDegrees,
    scores,
    scoresMask,
    polygon,
    isPointWithinRectangle,
  });

  console.log("creating kernels");

  const initializeScoresMask = ti.kernel(() => {
    for (let I of ti.ndrange(n, n)) {
      scoresMask[I] = isPointWithinRectangle(points[I].xy, polygon);
    }
  });

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(n, n)) {
      points[I] = [I[0], I[1], 0];
    }
  });

  const initilizeAnalysisPoints = ti.kernel(() => {
    for (let i of ti.range(analysisPointResolutionInDegrees)) {
      analysisPoints[i] = [n * 2 * ti.sin(i / 50), n * 2 * ti.cos(i / 50)];
    }
  });

  const updateAnalysisPoint = ti.kernel((t: number) => {
    for (let i of ti.range(analysisPointResolutionInDegrees)) {
      analysisPoints[i] = [
        n * 2 * ti.sin(t / 50 + i * 1),
        n * 2 * ti.cos(t / 50 + i * 1),
      ];
    }
  });

  const updateTexture = ti.kernel(() => {
    const adjustmentFactor =
      10 / analysisPointResolutionInDegrees / ti.sqrt(rectangleCount);
    for (let I of ti.ndrange(n, n)) {
      if (scoresMask[I] > 0) {
        const color = adjustmentFactor * scores[I];
        pixels[I] = [color, color, color];
      } else {
        pixels[I] = [256, 0, 0];
      }
    }
  });

  const kernel = ti.kernel((time: number) => {
    const rayPassesThroughRectangle = (
      origin: ti.Vector,
      ray: ti.Vector,
      rectangle: ti.Vector
    ) => {
      let res = false;
      const startRec = [rectangle.x0, rectangle.y0] as ti.Vector;
      const endRec = [rectangle.x1, rectangle.y1] as ti.Vector;
      const planeTangentVec = (endRec - startRec) as ti.Vector;
      const planeNormVec = [planeTangentVec.y, -planeTangentVec.x] as ti.Vector;
      const dot = ti.dot(planeNormVec, ray);
      if (dot <= 0.00001) {
        const t2 =
          ti.dot(startRec - origin, planeNormVec) / ti.dot(ray, planeNormVec);
        const pointInPlane = origin + ray * t2;
        const isInside =
          ti.dot(startRec - pointInPlane, endRec - pointInPlane) <= 0;
        res = isInside && t2 > 0;
      }
      return res;
    };

    const goesThroughRectangleCount = (position: ti.Vector) => {
      let count = 0;
      const pos = position.xy as ti.Vector;
      for (let k of ti.range(analysisPointResolutionInDegrees)) {
        const analysisPoint = analysisPoints[k] as ti.Vector;
        const rayDir = (analysisPoint - pos) as ti.Vector;
        for (let i of ti.range(rectangleCount)) {
          const rectangle = windows[i];
          const isInside = rayPassesThroughRectangle(pos, rayDir, rectangle);
          if (isInside) {
            count = count + 1;
          }
        }
      }
      return count;
    };

    for (let I of ti.ndrange(n, n)) {
      for (let i of ti.range(1)) {
        if (scoresMask[I] > 0) {
          scores[I] = goesThroughRectangleCount(points[I]);
        }
      }
    }
  });

  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  htmlCanvas.width = n;
  htmlCanvas.height = n;
  let canvas = new ti.Canvas(htmlCanvas);
  initilizeGrid();
  initilizeAnalysisPoints();
  initializeScoresMask();
  initializeScoresMaskJS(scoresMask, polygon);

  let i = 0;
  async function frame() {
    i = i + 1;
    let startTime = performance.now();
    updateAnalysisPoint(i);
    const updateAnalysisPointTime = performance.now() - startTime;
    i <= 0 &&
      console.log(`updateAnalysisPoint time: ${updateAnalysisPointTime} ms`);

    startTime = performance.now();
    kernel(i);
    const kernelTime = performance.now() - startTime;
    i <= 0 && console.log(`kernel time: ${kernelTime} ms`);

    startTime = performance.now();
    updateTexture();
    const updateTextureTime = performance.now() - startTime;
    i <= 0 && console.log(`updateTexture time: ${updateTextureTime} ms`);

    startTime = performance.now();
    canvas.setImage(pixels);
    const setImageTime = performance.now() - startTime;
    i <= 0 && console.log(`setImage time: ${setImageTime} ms`);

    startTime = performance.now();
    requestAnimationFrame(frame);
    const requestAnimationFrameTime = performance.now() - startTime;
    i <= 0 &&
      console.log(
        `requestAnimationFrame time: ${requestAnimationFrameTime} ms`
      );
  }
  requestAnimationFrame(frame);
};
main();

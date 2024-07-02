import * as ti from "taichi.js";
import { range } from "taichi.js/dist/taichi";
import { generateWindowsAlongWall } from "./geometryTools";
import { isPointInsidePolygon } from "./pointInPolygon";
import { rayIntersectsRectangle } from "./intersect";

export const rayTrace = async (
  n: number,
  polygonInJS: [number, number][],
  windowOptions: { windowSize: number; windowSpacing: number },
  htmlCanvas: HTMLCanvasElement
) => {
  await ti.init();

  const analysisPointResolutionInDegrees = 1000;

  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const scoresMask = ti.field(ti.f32, [n, n]) as ti.Field;
  const scores = ti.field(ti.f32, [n, n]) as ti.Field;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;

  const Rectangle = ti.types.struct({
    x0: ti.f32,
    x1: ti.f32,
    y0: ti.f32,
    y1: ti.f32,
  });

  const polygonLength = polygonInJS.length;
  const polygon = ti.Vector.field(2, ti.f32, [polygonLength]) as ti.Field;
  polygon.fromArray(polygonInJS);

  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions);
  const rectangleCount = windowsInJS.length;
  const windows = ti.Vector.field(3, ti.f32, [rectangleCount, 2]);

  for (let i of range(rectangleCount)) {
    const x0 = windowsInJS[i][0][0];
    const x1 = windowsInJS[i][1][0];
    const y0 = windowsInJS[i][0][1];
    const y1 = windowsInJS[i][1][1];
    const z0 = windowsInJS[i][0][2];
    const z1 = windowsInJS[i][1][2];
    const vec1 = [x0, y0, z0];
    const vec2 = [x1, y1, z1];
    windows.set([i, 0], vec1);
    windows.set([i, 1], vec2);
  }

  const analysisPoints = ti.Vector.field(3, ti.f32, [
    analysisPointResolutionInDegrees,
  ]) as ti.Field;

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
    polygonLength,
    isPointInsidePolygon,
    rayIntersectsRectangle,
  });

  const initializeScoresMask = ti.kernel(() => {
    for (let I of ti.ndrange(n, n)) {
      scoresMask[I] = isPointInsidePolygon(
        points[I].xy,
        polygon,
        polygonLength
      );
    }
  });

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(n, n)) {
      points[I] = [I[0], I[1], 0];
    }
  });

  const initilizeAnalysisPoints = ti.kernel(() => {
    for (let i of ti.range(analysisPointResolutionInDegrees)) {
      analysisPoints[i] = [n * 2 * ti.sin(i / 50), n * 2 * ti.cos(i / 50),0];
    }
  });

  const updateAnalysisPoint = ti.kernel((t: number) => {
    for (let i of ti.range(analysisPointResolutionInDegrees)) {
      analysisPoints[i] = [
        n * 2000 * ti.sin(t / 50 + i * 1),
        n * 2000 * ti.cos(t / 50 + i * 1),
        0,
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

  const rayTrace = ti.kernel((time: number) => {
    const goesThroughRectangleCount = (position: ti.Vector) => {
      let count = 0;
      for (let k of ti.range(analysisPointResolutionInDegrees)) {
        const analysisPoint = analysisPoints[k] as ti.Vector;
        const rayDir = (analysisPoint - position) as ti.Vector;
        for (let i of ti.range(rectangleCount)) {
          const recStart = windows[(i, 0)];
          const recEnd = windows[(i, 1)];
          const isInside = rayIntersectsRectangle(
            position,
            rayDir,
            recStart,
            recEnd
          );
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

  let canvas = new ti.Canvas(htmlCanvas);
  initilizeGrid();
  initilizeAnalysisPoints();
  initializeScoresMask();

  let i = 0;
  async function frame() {
    i = i + 1;
    updateAnalysisPoint(i);
    rayTrace(i);
    updateTexture();
    canvas.setImage(pixels);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

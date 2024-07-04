import * as ti from "taichi.js";
import { range } from "taichi.js/dist/taichi";
import { generateWindowsAlongWall } from "./geometryTools";
import { isPointInsidePolygon } from "./pointInPolygon";
import { rayIntersectsRectangle } from "./intersect";
import { computeRayDirection, getRayForAngle } from "./rayGeneration";

export const rayTrace = async (
  n: number,
  polygonInJS: [number, number][],
  windowOptions: { windowSize: number; windowSpacing: number },
  htmlCanvas: HTMLCanvasElement
) => {
  await ti.init();

  const analysisPointResolutionInDegrees = 10000;

  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const scoresMask = ti.field(ti.f32, [n, n]) as ti.Field;
  const scores = ti.field(ti.f32, [n, n]) as ti.Field;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;

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


  const VERTICAL_RESOLUTION = 64;
  const HORISONTAL_RESOLUTION = 256;
  const VERTICAL_STEP = Math.PI / VERTICAL_RESOLUTION;
  const HORISONTAL_STEP = Math.PI / HORISONTAL_RESOLUTION;

  ti.addToKernelScope({
    points,
    pixels,
    n,
    windows,
    rectangleCount,
    scores,
    scoresMask,
    polygon,
    polygonLength,
    isPointInsidePolygon,
    rayIntersectsRectangle,
    getRayForAngle,
    computeRayDirection,
    VERTICAL_RESOLUTION,
    HORISONTAL_RESOLUTION,
    VERTICAL_STEP,
    HORISONTAL_STEP,
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

  const updateTexture = ti.kernel(() => {
    const adjustmentFactor =
      (1  /100/ ti.sqrt(rectangleCount));
    for (let I of ti.ndrange(n, n)) {
      if (scoresMask[I] > 0) {
        const color = adjustmentFactor * scores[I];
        pixels[I] = [color, color, color];
      } else {
        pixels[I] = [256, 0, 0];
      }
    }
  });

  const rayTrace = ti.kernel((stepSize: ti.i32, time: ti.i32) => {
    const goesThroughRectangleCount = (position: ti.Vector) => {
      let count = 0;
      for (let I of ti.ndrange(
        VERTICAL_RESOLUTION,
        HORISONTAL_RESOLUTION / stepSize
      )) {
        const I2 = [I.x, I.y * ti.i32(stepSize) + ti.i32(time)];
        const ray =
          getRayForAngle(
            VERTICAL_RESOLUTION,
            HORISONTAL_RESOLUTION,
            I2[0],
            I2[1]
          );
        for (let i of ti.range(rectangleCount)) {
          const recStart = windows[(i, 0)];
          const recEnd = windows[(i, 1)];
          const isInside = rayIntersectsRectangle(
            position,
            ray,
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
          scores[I] =
            (scores[I] * (time - 1)) / ti.max(time, 1) +
            (goesThroughRectangleCount(points[I]) * stepSize) / ti.max(time, 1);
        }
      }
    }
  });

  let canvas = new ti.Canvas(htmlCanvas);
  initilizeGrid();
  initializeScoresMask();

  let i = 0;
  const stepSize = 32;
  async function frame() {
    i = i + 1;
    rayTrace(stepSize, i);
    updateTexture();
    canvas.setImage(pixels);

    i < stepSize && requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

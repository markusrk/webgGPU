import * as ti from "taichi.js";
import { range } from "taichi.js/dist/taichi";
import { generateWindowsAlongWall } from "./geometryTools";
import { isPointInsidePolygon } from "./pointInPolygon";
import { rayIntersectsRectangle } from "./intersect";
import {
  computeRayDirection,
  getRayForAngle,
  getVscScoreAtAngle,
} from "./rayGeneration";

const VERTICAL_RESOLUTION = 64;
const HORISONTAL_RESOLUTION = 256;
const VERTICAL_STEP = Math.PI / VERTICAL_RESOLUTION;
const HORISONTAL_STEP = Math.PI / HORISONTAL_RESOLUTION;

let currentToken = Symbol(); // Step 1: Initialize a unique symbol as the cancellation token
const N = 1000;

const points = ti.Vector.field(3, ti.f32, [N, N]) as ti.Field;
const scoresMask = ti.field(ti.f32, [N, N]) as ti.Field;
const scores = ti.field(ti.f32, [N, N]) as ti.Field;
const pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.Field;

let isInitialized = false;

let htmlCanvas;
let canvas;

export const init = async (input_canvas) => {
  htmlCanvas = input_canvas;
  await ti.init();
  canvas = new ti.Canvas(htmlCanvas);

  ti.addToKernelScope({
    points,
    pixels,
    N,
    scores,
    scoresMask,
    isPointInsidePolygon,
    rayIntersectsRectangle,
    getRayForAngle,
    computeRayDirection,
    getVscScoreAtAngle,
    VERTICAL_RESOLUTION,
    HORISONTAL_RESOLUTION,
    VERTICAL_STEP,
    HORISONTAL_STEP,
  });

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      points[I] = [I[0], I[1], 0];
    }
  });
  initilizeGrid();

  isInitialized = true;
};

export const rayTrace = async (
  polygonInJS: [number, number][],
  windowOptions: { windowSize: number; windowSpacing: number }
) => {
  if (!isInitialized) {
    console.log("Triggered rayTrace before initialization was done!!!");
  }
  const thisToken = Symbol();
  currentToken = thisToken;

  const polygonLength = polygonInJS.length;
  const polygon = ti.Vector.field(2, ti.f32, [polygonLength]) as ti.Field;
  polygon.fromArray(polygonInJS);
  if (thisToken !== currentToken) return;

  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions);
  const windowCount = windowsInJS.length;
  const windows = ti.Vector.field(3, ti.f32, [windowCount, 2]);

  if (thisToken !== currentToken) return;
  for (let i of range(windowCount)) {
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

  if (thisToken !== currentToken) return;

  ti.addToKernelScope({
    windows,
    windowCount,
    polygon,
    polygonLength,
  });

  const updateScoresMask = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      scoresMask[I] = isPointInsidePolygon(
        points[I].xy,
        polygon,
        polygonLength
      );
    }
  });

  const updateTexture = ti.kernel(() => {
    const adjustmentFactor = 3 / ti.sqrt(windowCount);
    for (let I of ti.ndrange(N, N)) {
      if (scoresMask[I] > 0) {
        const color = adjustmentFactor * scores[I];
        pixels[I] = [color, color, color];
      } else {
        pixels[I] = [256, 0, 0];
      }
    }
  });

  const rayTrace = ti.kernel((stepSize: ti.i32, time: ti.i32) => {
    const computeScoreForPoint = (position: ti.Vector) => {
      let score = ti.f32(0);
      for (let I of ti.ndrange(
        VERTICAL_RESOLUTION,
        HORISONTAL_RESOLUTION / stepSize
      )) {
        const I2 = [
          I.x,
          (I.y * ti.i32(stepSize) +
            ti.i32(time) +
            (I.x * HORISONTAL_RESOLUTION) / stepSize / 1.5) %
            HORISONTAL_RESOLUTION,
        ];
        const ray = getRayForAngle(
          VERTICAL_RESOLUTION,
          HORISONTAL_RESOLUTION,
          I2[0],
          I2[1]
        );
        const scoreForAngle = getVscScoreAtAngle(
          ray,
          VERTICAL_STEP,
          HORISONTAL_STEP
        );
        for (let i of ti.range(windowCount)) {
          const recStart = windows[(i, 0)];
          const recEnd = windows[(i, 1)];
          const isInside = rayIntersectsRectangle(
            position,
            ray,
            recStart,
            recEnd
          );
          if (isInside) {
            score = score + scoreForAngle;
          }
        }
      }
      return score;
    };

    for (let I of ti.ndrange(N, N)) {
      for (let i of ti.range(1)) {
        if (scoresMask[I] > 0) {
          scores[I] =
            (scores[I] * (time - 1)) / ti.max(time, 1) +
            (computeScoreForPoint(points[I]) * stepSize) / ti.max(time, 1);
        }
      }
    }
  });
  if (thisToken !== currentToken) return;
  updateScoresMask();
  if (thisToken !== currentToken) return;
  let i = 0;
  const stepSize = 32;
  async function frame() {
    if (thisToken !== currentToken) return;
    i = i + 1;
    rayTrace(stepSize, i);
    if (thisToken !== currentToken) return;
    updateTexture();
    if (thisToken !== currentToken) return;
    canvas.setImage(pixels);

    i < stepSize && requestAnimationFrame(frame);
  }
  if (thisToken !== currentToken) return;
  requestAnimationFrame(frame);
};

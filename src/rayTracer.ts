import * as ti from "taichi.js";
import { range } from "taichi.js/dist/taichi";
import { generateWindowsAlongWall } from "./geometryTools";
import { isPointInsidePolygon } from "./pointInPolygon";
import { rayIntersectsRectangle } from "./intersect";
import { computeRayDirection, getRayForAngle, getVscScoreAtAngle } from "./rayGeneration";

const VERTICAL_RESOLUTION = 64;
const HORISONTAL_RESOLUTION = 256;
const VERTICAL_STEP = Math.PI / 2 / VERTICAL_RESOLUTION;
const HORISONTAL_STEP = (Math.PI * 2) / HORISONTAL_RESOLUTION;
const MAX_DAYLIGHT = 12.641899784120097;

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
    MAX_DAYLIGHT,
  });

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      points[I] = [I[0], I[1], 0];
    }
  });
  initilizeGrid();

  isInitialized = true;
};

export const preComputeSurroundings = async () => {
  if (!isInitialized) {
    console.log("Triggered preComputeSurroundings before initialization was done!!!");
  }
  const m = 1000000
  const vertices = ti.Vector.field(3,ti.f32, [m]) as ti.field;
  const indices = ti.Vector.field(3,ti.i32, [m]) as ti.field;
  // const precomputedRayIntersections = ti.field(ti.i32, [N,N,VERTICAL_RESOLUTION*HORISONTAL_RESOLUTION/32 ]) as ti.field;

  ti.addToKernelScope({
    vertices,
    indices,
    m
  })

  const initVertices = ti.kernel(() => {
    const scale = 100
    for (let i of ti.range(m/3)) {
      const step = i*3;
      vertices[step] = [ti.random()*scale, ti.random()*scale, ti.random()*scale];
      vertices[step+1] = vertices[step] +  [1.,1.,0.];
      vertices[step+2] = vertices[step] +  [0.,0.,1.];
      indices[step] = [step,step+1,step+2];
    }
  });
  initVertices();


  return initVertices()
}

export const rayTrace = async (
  polygonInJS: [number, number][],
  windowsInJS: [[number, number, number], [number, number, number]][]
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

  const windowCount = windowsInJS.length;
  const windows = ti.Vector.field(3, ti.f32, [windowCount, 2]);

  if (thisToken !== currentToken) return;
  windows.fromArray(windowsInJS);

  if (thisToken !== currentToken) return;

  ti.addToKernelScope({
    windows,
    windowCount,
    polygon,
    polygonLength,
  });

  const updateScoresMask = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      scoresMask[I] = isPointInsidePolygon(points[I].xy, polygon, polygonLength);
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
      for (let I of ti.ndrange(VERTICAL_RESOLUTION, HORISONTAL_RESOLUTION / stepSize)) {
        const I2 = [
          I.x,
          (I.y * ti.i32(stepSize) + ti.i32(time) + (I.x * HORISONTAL_RESOLUTION) / stepSize / 1.5) %
            HORISONTAL_RESOLUTION,
        ];
        const ray = getRayForAngle(VERTICAL_STEP, HORISONTAL_STEP, I2[0], I2[1]);
        const scoreForAngle = getVscScoreAtAngle(ray, VERTICAL_STEP, HORISONTAL_STEP);
        for (let i of ti.range(windowCount)) {
          // @ts-ignore
          const recStart = windows[(i, 0)];
          // @ts-ignore
          const recEnd = windows[(i, 1)];
          const isInside = rayIntersectsRectangle(position, ray, recStart, recEnd);
          if (isInside) {
            score = score + scoreForAngle;
          }
        }
      }
      return score / MAX_DAYLIGHT;
    };

    for (let I of ti.ndrange(N, N)) {
      for (let i of ti.range(1)) {
        if (scoresMask[I] > 0) {
          scores[I] =
            (scores[I] * (time - 1)) / ti.max(time, 1) + (computeScoreForPoint(points[I]) * stepSize) / ti.max(time, 1);
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

import * as ti from "taichi.js";
import { getColorForScore } from "./colors";
import { intersectRayWithGeometry, rayIntersectsTriangle } from "./intersect";
import { isPointInsidePolygon } from "./pointInPolygon";
import { generateRay, generateRayFromNormal } from "./randomRays";
import { getSpecificVCSScoreAtRay } from "./sky";

const MAX_DAYLIGHT = 12.641899784120097;

let currentToken = Symbol(); // Step 1: Initialize a unique symbol as the cancellation token

let N, points, scoresMask, scores, pixels;
let isInitialized = false;

let htmlCanvas;
let canvas;

const colorPalletJS = [
  [1, 0, 0, 0],
  [0, 0.2, 1, 0.1],
  [0, 0.6, 1, 0.3],
  [0, 1, 0.1, 1],
  [0, 1, 0.1, 1000000],
];
const colorPalletLength = colorPalletJS.length;
const colorPallet = ti.Vector.field(4, ti.f32, colorPalletLength) as ti.Field;

export const init = async (input_canvas, resolution) => {
  htmlCanvas = input_canvas;
  await ti.init();
  canvas = new ti.Canvas(htmlCanvas);
  N = resolution;

  points = ti.Vector.field(3, ti.f32, [N, N]) as ti.Field;
  scoresMask = ti.field(ti.f32, [N, N]) as ti.Field;
  scores = ti.field(ti.f32, [N, N]) as ti.Field;
  pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.Field;

  ti.addToKernelScope({
    points,
    pixels,
    N,
    scores,
    scoresMask,
    isPointInsidePolygon,
    rayIntersectsTriangle,
    MAX_DAYLIGHT,
    colorPallet,
    colorPalletLength,
    getColorForScore,
    generateRayFromNormal,
    generateRay,
    getSpecificVCSScoreAtRay,
    intersectRayWithGeometry,
  });

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      points[I] = [I[0], I[1], 10];
    }
  });
  initilizeGrid();

  colorPallet.fromArray(colorPalletJS);
  isInitialized = true;
};

export const preComputeSurroundings = async () => {
  if (!isInitialized) {
    console.log("Triggered preComputeSurroundings before initialization was done!!!");
  }
  const m = 1000000;
  const vertices = ti.Vector.field(3, ti.f32, [m]) as ti.field;
  const indices = ti.Vector.field(3, ti.i32, [m]) as ti.field;
  // const precomputedRayIntersections = ti.field(ti.i32, [N,N,VERTICAL_RESOLUTION*HORISONTAL_RESOLUTION/32 ]) as ti.field;

  ti.addToKernelScope({
    vertices,
    indices,
    m,
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

  return initVertices();
};

export const rayTrace = async (
  polygonInJS: [number, number][],
  wallsInJS: [[number, number, number], [number, number, number]][],
  options = {materialReflectivity: 0.7, maxBounces: 6}
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

  const wallCount = wallsInJS.length;
  const walls = ti.Vector.field(3, ti.f32, [wallCount, 3]);

  if (thisToken !== currentToken) return;
  walls.fromArray(wallsInJS);

  if (thisToken !== currentToken) return;

  ti.addToKernelScope({
    walls,
    wallCount,
    polygon,
    polygonLength,
    options,
  });

  const updateScoresMask = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      scoresMask[I] = isPointInsidePolygon(points[I].xy, polygon, polygonLength);
    }
  });

  const updateTexture = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      if (scoresMask[I] > 0) {
        let color = getColorForScore(scores[I], colorPallet, colorPalletLength);
        pixels[I] = color;
      } else {
        pixels[I] = [0, 0, 0];
      }
    }
  });

  const rayTrace = ti.kernel((stepSize: ti.i32, time: ti.i32) => {
    const computeScoreForPoint = (position: ti.Vector) => {
      let score = ti.f32(0);
      let tracedRays = 0;
      let bounces = 0;
      let remainingLightFactor = ti.f32(1.0);
      const maxBounces = options.maxBounces;
      const tracedRaysTarget = 20;
      let nextPosition = position;
      // Todo:  build a smarter logic here so we are not forced to run MaxBounce*tracedRaysTarget amount of times every time. Example run 1000 rays and just divide the score by the amount of finished traces for each point.
      for (let m of ti.range(maxBounces * tracedRaysTarget)) {
        if (tracedRaysTarget > tracedRays) {
          const ray = generateRayFromNormal([0.0, 0.0, 1.0]);
          let res = intersectRayWithGeometry(nextPosition, ray, walls, wallCount);
          if (!res.isHit) {
            const scoreForAngle = getSpecificVCSScoreAtRay(ray);
            score = score + scoreForAngle * remainingLightFactor;
            tracedRays = tracedRays + 1;
            bounces = 0;
            nextPosition = position;
            remainingLightFactor = 1.0;
          } else {
            if (bounces == maxBounces) {
              nextPosition = position;
              bounces = 0;
              remainingLightFactor = 1.0;
              tracedRays = tracedRays + 1;
            } else {
              // assign next position adjust for reflection factor and restart.
              nextPosition = res.intersectionPoint;
              remainingLightFactor = remainingLightFactor * options.materialReflectivity;
              bounces = bounces + 1;
            }
          }
        }
      }
      return score / MAX_DAYLIGHT;
    };

    for (let I of ti.ndrange(N, N)) {
      if (scoresMask[I] > 0) {
        scores[I] =
          (scores[I] * (time - 1)) / ti.max(time, 1) +
          ((computeScoreForPoint(points[I]) / stepSize) * 80) / ti.max(time, 1);
      }
    }
  });
  if (thisToken !== currentToken) return;
  updateScoresMask();
  if (thisToken !== currentToken) return;
  let i = 0;
  const stepSize = 320;
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

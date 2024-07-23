import * as ti from "taichi.js";
import { getColorForScore } from "./colors";
import { intersectRayWithGeometry, rayIntersectsTriangle } from "./intersect";
import { isPointInsidePolygon } from "./pointInPolygon";
import { generateRay, generateRayFromNormal } from "./randomRays";
import { getSpecificVCSScoreAtRay } from "./sky";
import { Triangle } from "./example/geometryBuilder";
import { initRandomVertices } from "./test/geometryInit";
import { sortAndBin } from "./acceleration/sortAndBin";
import { countTriangles, sortTriangles, triangleTouchesBBox } from "./acceleration/supportFunctions";
import { loadPolygon, loadTriangle } from "./polygonAndTriangleLoaders";

const MAX_DAYLIGHT = 12.641899784120097;

let currentToken = Symbol(); // Step 1: Initialize a unique symbol as the cancellation token

let N, points, scoresMask, scores, pixels, traceCount;
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
  traceCount = ti.field(ti.i32, [N, N]) as ti.Field;

  ti.addToKernelScope({
    points,
    pixels,
    N,
    scores,
    scoresMask,
    traceCount,
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
  // this line is meant to add all support functions to kernel scope. It is ugly, but i had trouble using add to kernel scope locally in each file.
  ti.addToKernelScope({ rayIntersectsTriangle, countTriangles, sortTriangles, triangleTouchesBBox });

  const M = 10000;
  const startTime = performance.now();
  const { vertices, indices } = await initRandomVertices(M);
  console.log("init vertices", performance.now() - startTime);

  const { bins, binsLength, indicesindices } = await sortAndBin(vertices, indices, M);


};

export const rayTrace = async (
  polygonInJS: [number, number][],
  trianglesInJS: Triangle[],
  options = { materialReflectivity: 0.7, maxBounces: 6 }
) => {
  if (!isInitialized) {
    console.log("Triggered rayTrace before initialization was done!!!");
  }
  const thisToken = Symbol();
  currentToken = thisToken;

  const {polygon, polygonLength} = loadPolygon(polygonInJS);
  if (thisToken !== currentToken) return;

  const {triangles, triangleLength} = loadTriangle(trianglesInJS);
  if (thisToken !== currentToken) return;

  ti.addToKernelScope({
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
// Test code to average pixel scores over areas
        // let scoresAgg = ti.f32(0);
        // let traceCountAgg = ti.i32(0);
        // for (let J of ti.ndrange(2, 2)) {
        //   const i = I + J;
        //   if (i[0] >= 0 && i[0] < N && i[1] >= 0 && i[1] < N) {
        //     scoresAgg = scoresAgg + scores[i];
        //     traceCountAgg = traceCountAgg + traceCount[i];
        //   }
        // }
        // let color = getColorForScore(scoresAgg / traceCountAgg, colorPallet, colorPalletLength);
        let color = getColorForScore(scores[I] / traceCount[I], colorPallet, colorPalletLength);
        pixels[I] = color;
      } else {
        pixels[I] = [0, 0, 0];
      }
    }
  });
  

  const rayTrace = ti.kernel((tracedRaysTarget: ti.i32, reset: Bool) => {
    const computeScoreForPoint = (position: ti.Vector) => {
      let score = ti.f32(0);
      let tracedRays = 0;
      let bounces = 0;
      let remainingLightFactor = ti.f32(1.0);
      const maxBounces = options.maxBounces;
      let nextPosition = position;
      let nextNormal = [ti.f32(0.0), ti.f32(0.0), ti.f32(1.0)];
      for (let _ of ti.range(tracedRaysTarget)) {
        const ray = generateRayFromNormal(nextNormal);
        let resBuilding = intersectRayWithGeometry(nextPosition, ray, triangles, triangleLength);
        if (!resBuilding.isHit) {
          const scoreForAngle = getSpecificVCSScoreAtRay(ray);
          score = score + scoreForAngle * remainingLightFactor;
          tracedRays = tracedRays + 1;
          bounces = 0;
          nextPosition = position;
          remainingLightFactor = 1.0;
        } else {
          if (bounces >= maxBounces) {
            nextPosition = position;
            nextNormal = [0.0, 0.0, 1.0];
            bounces = 0;
            remainingLightFactor = 1.0;
            tracedRays = tracedRays + 1;
          } else {
            // assign next position adjust for reflection factor and restart.
            nextPosition = resBuilding.intersectionPoint;
            nextNormal = resBuilding.triangleNormal;
            remainingLightFactor = remainingLightFactor * options.materialReflectivity;
            bounces = bounces + 1;
          }
        }
      }
      return { score, tracedRays };
    };

    for (let I of ti.ndrange(N, N)) {
      const res = computeScoreForPoint(points[I]);
      if (reset) {
        scores[I] = 0;
        traceCount[I] = 0;
      }
      if (scoresMask[I] > 0) {
        scores[I] = scores[I] + res.score;
        traceCount[I] = traceCount[I] + res.tracedRays;
      }
    }
  });
  if (thisToken !== currentToken) return;
  updateScoresMask();
  if (thisToken !== currentToken) return;
  let i = 0;
  const steps = 1000;
  const tracesPerStep = 60;
  async function frame() {
    if (thisToken !== currentToken) return;
    i = i + 1;
    rayTrace(tracesPerStep, false);
    if (thisToken !== currentToken) return;
    updateTexture();
    if (thisToken !== currentToken) return;
    canvas.setImage(pixels);

    i < steps && requestAnimationFrame(frame);
  }
  if (thisToken !== currentToken) return;
  rayTrace(tracesPerStep, true);
  requestAnimationFrame(frame);
};

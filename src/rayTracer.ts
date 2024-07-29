import * as ti from "taichi.js";
import { getColorForScore } from "./colors";
import { intersectRayWithBin, intersectRayWithGeometry, rayIntersectsTriangle } from "./intersect";
import { isPointInsidePolygon } from "./pointInPolygon";
import { generateRay, generateRayFromNormal } from "./randomRays";
import { getSpecificVCSScoreAtRay } from "./sky";
import { Triangle } from "./example/geometryBuilder";
import { initRandomVertices as initRandomTriangles } from "./test/geometryInit";
import { aggregateBins, sortAndBin } from "./acceleration/sortAndBin";
import { countTriangles, findMinMax, sortTriangles, triangleTouchesBBox } from "./acceleration/supportFunctions";
import { initPolygon, initTriangle, loadPolygon, loadTriangle } from "./polygonAndTriangleLoaders";
import { intersectRayWithAcceleratedGeometry } from "./acceleration/intersect";

const MAX_DAYLIGHT = 12.641899784120097;

let currentToken = undefined; // Step 1: Initialize a unique symbol as the cancellation token

export type Options = {
  materialReflectivity: number;
  maxBounces: number;
  resolution: number;
  samplesPerPoint: number;
  triangleCount: number;
  sizeInMeters: number;
};

let N,
  points,
  scoresMask,
  scores,
  pixels,
  traceCount,
  traceKernel,
  updateTexture,
  updateScoresMask,
  reflectivityAndBouncesParams;
let options = {} as Options;
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

const initializeReflectivityAndBounces = ({ reflectivity, bounces }) => {
  reflectivityAndBouncesParams = ti.field(ti.f32, [2]) as ti.Field;
  reflectivityAndBouncesParams.fromArray([0.7, 6]);
  ti.addToKernelScope({ reflectivityAndBouncesParams });
};
const setReflectivityAndBounces = ({ reflectivity, bounces }) => {
  reflectivityAndBouncesParams.fromArray([reflectivity, bounces]);
};

export const init = async (input_canvas, options: Options) => {
  htmlCanvas = input_canvas;
  await ti.init();
  canvas = new ti.Canvas(htmlCanvas);
  N = options.resolution;

  points = ti.Vector.field(3, ti.f32, [N, N]) as ti.Field;
  scoresMask = ti.field(ti.f32, [N, N]) as ti.Field;
  scores = ti.field(ti.f32, [N, N]) as ti.Field;
  pixels = ti.Vector.field(3, ti.f32, [N, N]) as ti.Field;
  traceCount = ti.field(ti.i32, [N, N]) as ti.Field;
  initializeReflectivityAndBounces({ reflectivity: 0.7, bounces: 6 });
  const gridIndexToMeter = options.sizeInMeters / options.resolution;

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
    intersectRayWithAcceleratedGeometry,
    findMinMax,
    gridIndexToMeter,
    aggregateBins,
    reflectivityAndBouncesParams,
    countTriangles,
    sortTriangles,
    triangleTouchesBBox,
    intersectRayWithBin,
  });

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(N, N)) {
      points[I] = [I[0], I[1], 1] * gridIndexToMeter;
    }
  });
  initilizeGrid();
  colorPallet.fromArray(colorPalletJS);

  await initPolygon();
  await initTriangle();

  isInitialized = true;
};

export const initializeSurroundings = async (options: Options) => {
  if (!isInitialized) {
    console.log("Triggered preComputeSurroundings before initialization was done!!!");
  }

  let startTime = performance.now();
  const { vertices, indices } = await initRandomTriangles(options.triangleCount, options.sizeInMeters);
  console.log("init vertices", performance.now() - startTime);

  startTime = performance.now();
  const { bins, binsLength, indicesindices } = await sortAndBin(vertices, indices, options.triangleCount);
  const { tlBins, tlBinsLength } = await aggregateBins(bins, 5);
  console.log("sort and bin", performance.now() - startTime);

  updateScoresMask = ti.kernel((polygonLengthArg) => {
    for (let I of ti.ndrange(N, N)) {
      scoresMask[I] = isPointInsidePolygon(points[I].xy, polygon, polygonLengthArg);
    }
  });

  updateTexture = ti.kernel({ step: ti.i32, fade: ti.f32 }, (step, fade) => {
    let fade2 = 1 - fade;
    let step2 = ti.i32(step / 2);
    for (let I of ti.ndrange(N / step, N / step)) {
      // Test code to average pixel scores over areas
      let scoresAgg = ti.f32(0);
      let traceCountAgg = ti.i32(0);
      for (let J of ti.ndrange(step, step)) {
        const i = I * step + J;
        if (scoresMask[i] > 0) {
          scoresAgg = scoresAgg + scores[i];
          traceCountAgg = traceCountAgg + traceCount[i];
        }
      }
      for (let J of ti.ndrange(step, step)) {
        const i = I * step + J;
        if (scoresMask[i] > 0) {
          let color = getColorForScore(scoresAgg / traceCountAgg, colorPallet, colorPalletLength);
          pixels[i] = color;
        } else {
          pixels[i] = [0, 0, 0];
        }
      }
    }
    for (let I of ti.ndrange(N / step2, N / step2)) {
      // Test code to average pixel scores over areas
      let scoresAgg = ti.f32(0);
      let traceCountAgg = ti.i32(0);
      for (let J of ti.ndrange(step2, step2)) {
        const i = I * step2 + J;
        if (scoresMask[i] > 0) {
          scoresAgg = scoresAgg + scores[i];
          traceCountAgg = traceCountAgg + traceCount[i];
        }
      }
      for (let J of ti.ndrange(step2, step2)) {
        const i = I * step2 + J;
        if (scoresMask[i] > 0) {
          let color = getColorForScore(scoresAgg / traceCountAgg, colorPallet, colorPalletLength);
          if (step2 > 1) {
            pixels[i] = fade2 * color + pixels[i] * fade;
          }
        } else {
          pixels[i] = [0, 0, 0];
        }
      }
    }
  });

  traceKernel = ti.kernel((tracedRaysTarget: ti.i32, reset: Bool, triangleLengthArg) => {
    const computeScoreForPoint = (position: ti.Vector) => {
      let score = ti.f32(0);
      let tracedRays = 1;
      let bounces = 0;
      let remainingLightFactor = ti.f32(1.0);
      const maxBounces = reflectivityAndBouncesParams[1];
      let nextPosition = position;
      let nextNormal = [ti.f32(0.0), ti.f32(0.0), ti.f32(1.0)];
      for (let _ of ti.range(tracedRaysTarget)) {
        const ray = generateRayFromNormal(nextNormal);
        let resBuilding = intersectRayWithGeometry(nextPosition, ray, triangles, triangleLengthArg);
        let resTheRest = intersectRayWithAcceleratedGeometry(
          // todo: insert nextPosition and ray here when testing is over. This is just to demonstrate the effect of triangles.
          [0, 0, 1],
          position,
          bins,
          binsLength,
          vertices,
          indices,
          indicesindices,
          tlBins,
          tlBinsLength
        );
        let resToUse = resBuilding;
        if (resTheRest.isHit && resTheRest.t < resBuilding.t) {
          resToUse = resTheRest;
        }
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
            remainingLightFactor = remainingLightFactor * resToUse.reflectivity;
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
};

export const rayTrace = async (polygonInJS: [number, number][], trianglesInJS: Triangle[], currentOptions: Options) => {
  if (!isInitialized) {
    console.log("Triggered rayTrace before initialization was done!!!");
  }
  const thisToken = Symbol();
  currentToken = thisToken;
  if (thisToken !== currentToken) {
    return;
  }

  // if (options.resolution != N) {
  //   console.log("Resolution changed, reinitializing");
  //   await init(htmlCanvas, options.resolution);
  //   await initializeSurroundings();
  // }
  setReflectivityAndBounces({ reflectivity: currentOptions.materialReflectivity, bounces: currentOptions.maxBounces });

  if (currentOptions.triangleCount && currentOptions.triangleCount !== options.triangleCount) {
    options.triangleCount = currentOptions.triangleCount;
    initializeSurroundings(currentOptions);
  }
  let start = performance.now();
  const polygonLengthPromise = loadPolygon(polygonInJS).then((_) => {
    console.log("loadPolygon", performance.now() - start);
    return _;
  });
  if (thisToken !== currentToken) {
    return;
  }

  start = performance.now();
  const triangleLengthPromise = loadTriangle(trianglesInJS).then((_) => {
    console.log("loadTriangle", performance.now() - start);
    return _;
  });
  if (thisToken !== currentToken) {
    return;
  }

  ti.addToKernelScope({
    options: currentOptions,
  });

  if (thisToken !== currentToken) {
    return;
  }
  start = performance.now();
  const polygonLength = await polygonLengthPromise;
  updateScoresMask(polygonLength);
  console.log("updateScoresMask", performance.now() - start);
  if (thisToken !== currentToken) {
    return;
  }

  let i = 0;
  const steps = 4000;
  const tracesPerStep = 30;
  async function frame() {
    if (thisToken !== currentToken) {
      return;
    }
    i = i + 1;
    const start = performance.now();
    await traceKernel(tracesPerStep, false, trianglesInJS.length);
    i % 10 === 1 && console.log("raytrace", i, " : ", performance.now() - start);
    if (thisToken !== currentToken) {
      return;
    }
    const sampleTarget = currentOptions.samplesPerPoint;
    const averageacross = Math.min(
      [2, 4, 8, 16, 32, 64, 128, 256].find((v) => sampleTarget <= v * v * i),
      32
    );
    const floatingVersion = Math.sqrt(sampleTarget / i);
    const fade = Math.min((floatingVersion - averageacross / 2) / (averageacross - averageacross / 2), 1);
    updateTexture(averageacross, fade);
    if (thisToken !== currentToken) {
      return;
    }
    canvas.setImage(pixels);
    i < steps && requestAnimationFrame(frame);
  }
  if (thisToken !== currentToken) {
    return;
  }
  const triangleLength = await triangleLengthPromise;
  traceKernel(tracesPerStep, true, triangleLength);
  requestAnimationFrame(frame);
};

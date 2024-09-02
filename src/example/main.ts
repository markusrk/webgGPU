import * as ti from "taichi.js";
import { init, initializeSurroundings, Options, rayTrace } from "../rayTracer";
import { inwardsBoxFromAABBWithwindow } from "./geometryBuilder";
const OFFSET = 0.01;

let options: Options = {
  materialReflectivity: 0.99,
  maxBounces: 4,
  triangleCount: 1000,
  resolution: 300,
  bbox: {minx:0, maxx:100, miny:0, maxy:100},
  samplesPerPoint: 1000,
  analysisPointHeight: 1,
};

const sizeInMeters = 100;
const resolutionParam = new URLSearchParams(window.location.search).get("resolution");
if (resolutionParam) {
  const resolution = parseInt(resolutionParam);
  options = { ...options, resolution };
}
let windowWidth = 0.1;
let windowHeight = 0.1;

let x = 0.9;
let y = 0.9;

let polygonInJS = [
  [sizeInMeters * 0.1, sizeInMeters * 0.1],
  [sizeInMeters * 0.1, sizeInMeters * 0.9],
  [sizeInMeters * 0.9, sizeInMeters * 0.9],
  [sizeInMeters * 0.9, sizeInMeters * 0.1],
  [sizeInMeters * 0.1, sizeInMeters * 0.1],
] as [number, number][];

const updatePolygon = (p: { x: number; y: number }) => {
  polygonInJS = [
    [sizeInMeters * 0.1, sizeInMeters * 0.1],
    [sizeInMeters * 0.1, (sizeInMeters * p.y) / options.resolution],
    [(sizeInMeters * p.x) / options.resolution, (sizeInMeters * p.y) / options.resolution],
    [(sizeInMeters * p.x) / options.resolution, sizeInMeters * 0.1],
    [sizeInMeters * 0.1, sizeInMeters * 0.1],
  ];
};

let wallsInJs = [
  // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow(
    [sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0],
    [sizeInMeters * (0.9 + OFFSET), sizeInMeters * (0.9 + OFFSET), 1000],
    windowWidth,
    windowHeight
  ),
];

const updateWalls = (p: { x: number; y: number }) => {
  wallsInJs = [
    ...inwardsBoxFromAABBWithwindow(
      [sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0],
      [
        sizeInMeters * (p.x / options.resolution + OFFSET),
        sizeInMeters * (p.y / options.resolution + OFFSET),
        1000,
      ],
      windowWidth,
      windowHeight
    ),
  ];
};

document.getElementById("windowSize")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  windowWidth = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow(
      [sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0],
      [sizeInMeters * (x + OFFSET), sizeInMeters * (y + OFFSET), 1000],
      windowWidth,
      windowHeight
    ),
  ];
  updateImage(polygonInJS, wallsInJs, options);
});
document.getElementById("windowHeight")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  windowHeight = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow(
      [sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0],
      [sizeInMeters * (x + OFFSET), sizeInMeters * (y + OFFSET), 1000],
      windowWidth,
      windowHeight
    ),
  ];
  updateImage(polygonInJS, wallsInJs, options);
});
document.getElementById("reflectivityInput")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  options = { ...options, materialReflectivity: parseFloat(v) };
  updateImage(polygonInJS, wallsInJs, options);
});
document.getElementById("maxBouncesInput")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  options = { ...options, maxBounces: parseInt(v) };

  updateImage(polygonInJS, wallsInJs, options);
});

document.getElementById("randomTriangleCountInput")?.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  const count = parseInt(v);
  options = { ...options, triangleCount: count };
  updateImage(polygonInJS, wallsInJs, options);
});

document.getElementById("minSamplesInput")?.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  const count = parseInt(v);
  options = { ...options, samplesPerPoint: count };
  updateImage(polygonInJS, wallsInJs, options);
});

const updateCoordinate = (newX, newY) => {
  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  x = (newX / htmlCanvas.width);
  y = (1 - newY / htmlCanvas.height) ;
  const scaledX = x * options.resolution
  const scaledY = y * options.resolution
  updateWalls({ x: scaledX, y: scaledY });
  updatePolygon({ x: scaledX, y: scaledY });
  updateImage(polygonInJS, wallsInJs, options);
};

const updateImage = (polygonInJS, wallsInJS, options) => {
  rayTrace(polygonInJS, wallsInJS, options);
};

// @ts-ignore
window.updateCoordinate = debounce(updateCoordinate, 10);

function debounce(func: Function, delay: number) {
  let timerId;
  return function (...args: any[]) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const fixDotPosition = () => {
  const dragElement = document.getElementById("dragElement")!;
  dragElement.style.left = options.resolution * 0.9 + "px";
  dragElement.style.top = options.resolution * 0.1 + "px";
};
fixDotPosition();

// This is bottom part is the code that matters. The rest is scaffolding.
const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
htmlCanvas.width = options.resolution;
htmlCanvas.height = options.resolution;

const main = async () => {
  await init(htmlCanvas, options);
  await initializeSurroundings(options);
  rayTrace(polygonInJS, wallsInJs, options);
};
main();

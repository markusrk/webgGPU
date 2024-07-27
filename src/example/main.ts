import * as ti from "taichi.js";
import { init, preComputeSurroundings, rayTrace } from "../rayTracer";
import { inwardsBoxFromAABBWithwindow } from "./geometryBuilder";
const OFFSET = 0.01;

const sizeInMeters = 100;
const resolution = 600;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let bounceOptions = { materialReflectivity: 0.9, maxBounces: 4 };
let windowWidth = 0.1;
let windowHeight = 0.1;

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
    [sizeInMeters * 0.1, sizeInMeters * p.y/resolution],
    [sizeInMeters * p.x/resolution, sizeInMeters * p.y/resolution],
    [sizeInMeters * p.x/resolution, sizeInMeters * 0.1],
    [sizeInMeters * 0.1, sizeInMeters * 0.1],
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
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

const updateWalls = (p: { x: number; y: number }, windowOptions?: any) => {
  wallsInJs = [
    ...inwardsBoxFromAABBWithwindow(
      [sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0],
      [sizeInMeters * (p.x/resolution + OFFSET), sizeInMeters * (p.y/resolution + OFFSET), 1000],
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
      [sizeInMeters * (0.9 + OFFSET), sizeInMeters * (0.9 + OFFSET), 1000],
      windowWidth,
      windowHeight
    ),
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("windowHeight")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  windowHeight = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow(
      [sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0],
      [sizeInMeters * (0.9 + OFFSET), sizeInMeters * (0.9 + OFFSET), 1000],
      windowWidth,
      windowHeight
    ),
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("reflectivityInput")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  bounceOptions = { ...bounceOptions, materialReflectivity: parseFloat(v) };
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("maxBouncesInput")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  bounceOptions = { ...bounceOptions, maxBounces: parseInt(v) };

  updateImage(polygonInJS, wallsInJs, bounceOptions);
});

const updateCoordinate = (x, y) => {
  updateWalls({ x, y: resolution - y });
  updatePolygon({ x, y: resolution - y });
  updateImage(polygonInJS, wallsInJs, bounceOptions);
};

const updateImage = (polygonInJS, wallsInJS, bounceOptions) => {
  rayTrace(polygonInJS, wallsInJS, bounceOptions);
  // worker.postMessage({type: "update", polygon: polygonInJS});
};

// @ts-ignore
window.updateCoordinate = debounce(updateCoordinate, 10);

function debounce(func: Function, delay: number) {
  let timerId: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const fixDotPosition = () => {
  const dragElement = document.getElementById("dragElement")!;
  dragElement.style.left = resolution * 0.9 + "px";
  dragElement.style.top = resolution * 0.1 + "px";
};
fixDotPosition();

// This is bottom part is the code that matters. The rest is scaffolding.
const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;

const main = async () => {
  await init(htmlCanvas, resolution);
  await preComputeSurroundings();
  rayTrace(polygonInJS, wallsInJs, bounceOptions);
};
main();

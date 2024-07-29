import * as ti from "taichi.js";
import { init, initializeSurroundings, rayTrace } from "../rayTracer";
import { inwardsBoxFromAABBWithwindow } from "./geometryBuilder";
const OFFSET = 0.01;

let options = { materialReflectivity: 0.99, maxBounces: 4, triangleCount: 1000, resolution: 300, sizeInMeters: 100 };
let windowWidth = 0.1;
let windowHeight = 0.1;

let polygonInJS = [
  [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1],
  [options.sizeInMeters * 0.1, options.sizeInMeters * 0.9],
  [options.sizeInMeters * 0.9, options.sizeInMeters * 0.9],
  [options.sizeInMeters * 0.9, options.sizeInMeters * 0.1],
  [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1],
] as [number, number][];

const updatePolygon = (p: { x: number; y: number }) => {
  polygonInJS = [
    [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1],
    [options.sizeInMeters * 0.1, (options.sizeInMeters * p.y) / options.resolution],
    [(options.sizeInMeters * p.x) / options.resolution, (options.sizeInMeters * p.y) / options.resolution],
    [(options.sizeInMeters * p.x) / options.resolution, options.sizeInMeters * 0.1],
    [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1],
  ];
};

let wallsInJs = [
  // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow(
    [options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0],
    [options.sizeInMeters * (0.9 + OFFSET), options.sizeInMeters * (0.9 + OFFSET), 1000],
    windowWidth,
    windowHeight
  ),
];

const updateWalls = (p: { x: number; y: number }) => {
  wallsInJs = [
    ...inwardsBoxFromAABBWithwindow(
      [options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0],
      [options.sizeInMeters * (p.x / options.resolution + OFFSET), options.sizeInMeters * (p.y / options.resolution + OFFSET), 1000],
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
      [options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0],
      [options.sizeInMeters * (0.9 + OFFSET), options.sizeInMeters * (0.9 + OFFSET), 1000],
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
      [options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0],
      [options.sizeInMeters * (0.9 + OFFSET), options.sizeInMeters * (0.9 + OFFSET), 1000],
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
  console.log("count = ", count)
  updateImage(polygonInJS, wallsInJs, {...options, triangleCount: count});
});

const updateCoordinate = (x, y) => {
  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  const scaledX = (x / htmlCanvas.width) * options.resolution;
  const scaledY = (y / htmlCanvas.height) * options.resolution;
  updateWalls({ x: scaledX, y: options.resolution - scaledY });
  updatePolygon({ x: scaledX, y: options.resolution - scaledY });
  updateImage(polygonInJS, wallsInJs, options);
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

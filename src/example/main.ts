import * as ti from "taichi.js";
import { init, preComputeSurroundings, rayTrace } from "../rayTracer";
import { inwardsBoxFromAABBWithwindow } from "./geometryBuilder";
const OFFSET = 0.01

const resolution = 100;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let bounceOptions = { materialReflectivity: 0.5, maxBounces: 4 };
let windowWidth = 0.1;
let windowHeight = 0.1;

let polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.9],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1],
] as [number, number][];

let wallsInJs = [
  // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow(
    [resolution * (0.1-OFFSET), resolution * (0.1-OFFSET), 0],
    [resolution * (0.9+OFFSET), resolution * (0.9+OFFSET), 1000],
    windowWidth,
    windowHeight
  ),
];

document.getElementById("windowSize")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  windowWidth = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow(
      [resolution * (0.1-OFFSET), resolution * (0.1-OFFSET), 0],
      [resolution * (0.9+OFFSET), resolution * (0.9+OFFSET), 1000],
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
      [resolution * (0.1-OFFSET), resolution * (0.1-OFFSET), 0],
      [resolution * (0.9+OFFSET), resolution * (0.9+OFFSET), 1000],
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
  polygonInJS = [
    [resolution * 0.1, resolution * 0.1],
    [x, resolution - y],
    [resolution * 0.9, resolution * 0.9],
    [resolution * 0.9, resolution * 0.1],
    [resolution * 0.1, resolution * 0.1],
  ] as [number, number][];
  updateImage(polygonInJS, defaultWindowOptions);
};

const updateImage = (polygonInJS, wallsInJS, bounceOptions) => {
  rayTrace(polygonInJS, wallsInJS, bounceOptions);
  // worker.postMessage({type: "update", polygon: polygonInJS});
};

// @ts-ignore
window.updateCoordinate = updateCoordinate;

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

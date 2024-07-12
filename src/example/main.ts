import * as ti from "taichi.js";
import { generateWindowsAlongWall } from "../geometryTools";
import { init, rayTrace } from "../rayTracer";
import { boxFromAABBWithHoleInTheTop, inwardsBoxFromAABBWithwindow } from "./geometryBuilder";

const resolution = 1000;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.9],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1],
] as [number, number][];

const wallsInJs = [
  ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow(
    [resolution * 0.1, resolution * 0.1, 0],
    [resolution * 0.9, resolution * 0.9, 400]
  ),
];


document.getElementById("windowSize")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  defaultWindowOptions = { ...defaultWindowOptions, windowSize: parseInt(v) };
  updateImage(polygonInJS, defaultWindowOptions);
});
document.getElementById("windowHeight")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  defaultWindowOptions = { ...defaultWindowOptions, windowHeight: parseInt(v) };
  updateImage(polygonInJS, defaultWindowOptions);
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

const updateImage = (polygonInJS, windowOptions) => {
  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions);
  rayTrace(polygonInJS, windowsInJS);
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
  const windowsInJS = generateWindowsAlongWall(polygonInJS, defaultWindowOptions);
  rayTrace(polygonInJS, wallsInJs);
};
main();

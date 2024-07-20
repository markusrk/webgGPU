import * as ti from "taichi.js";
import { generateWindowsAlongWall } from "../geometryTools";
import { init, rayTrace } from "../rayTracer";
import { boxFromAABBWithHoleInTheTop, inwardsBoxFromAABBWithwindow } from "./geometryBuilder";

const resolution = 1000;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let bounceOptions = {materialReflectivity: 0.5, maxBounces: 6}
let windowWidth = 0.2;
let windowHeight = 0.2;

let polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.9],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1],
] as [number, number][];

let wallsInJs = [
  ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow(
    [resolution * 0.1, resolution * 0.1, 0],
    [resolution * 0.9, resolution * 0.9, 400],windowWidth,windowHeight
  ),
];


document.getElementById("windowSize")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  windowWidth = parseFloat(v);
  wallsInJs = [
    ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow(
      [resolution * 0.1, resolution * 0.1, 0],
      [resolution * 0.9, resolution * 0.9, 400],windowWidth,windowHeight
    ),
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("windowHeight")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  windowHeight = parseFloat(v);
  wallsInJs = [
    ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow(
      [resolution * 0.1, resolution * 0.1, 0],
      [resolution * 0.9, resolution * 0.9, 400],windowWidth,windowHeight
    ),
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("reflectivityInput")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  bounceOptions = { ...bounceOptions, materialReflectivity: parseFloat(v) };
  updateImage(polygonInJS, defaultWindowOptions, bounceOptions);
});
document.getElementById("maxBouncesInput")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  bounceOptions = { ...bounceOptions, maxBounces: parseInt(v) };

  updateImage(polygonInJS, defaultWindowOptions, bounceOptions);
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

const updateImage = (polygonInJS, windowOptions, bounceOptions) => {
  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions, );
  rayTrace(polygonInJS, wallsInJs, bounceOptions);
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
  rayTrace(polygonInJS, wallsInJs, bounceOptions);
};
main();

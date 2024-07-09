import * as ti from "taichi.js";
import { init, preComputeSurroundings, rayTrace } from "./rayTracer";
import { generateWindowsAlongWall } from "./geometryTools";

const resolution = 1000;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.4],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1],
] as [number, number][];

document.getElementById("windowSize")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  defaultWindowOptions = {...defaultWindowOptions, windowSize: parseInt(v)}
  updateImage(polygonInJS,defaultWindowOptions);
});
document.getElementById("windowHeight")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  defaultWindowOptions = {...defaultWindowOptions, windowHeight: parseInt(v)}
  updateImage(polygonInJS,defaultWindowOptions);
});

const updateImage = (polygonInJS, windowOptions) => {
  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions);
  rayTrace(polygonInJS, windowsInJS);
  // worker.postMessage({type: "update", polygon: polygonInJS});
};

const updateCoordinate = (x, y) => {
  polygonInJS = [
    [resolution * 0.1, resolution * 0.1],
    [x, resolution - y],
    [resolution * 0.9, resolution * 0.9],
    [resolution * 0.9, resolution * 0.1],
    [resolution * 0.1, resolution * 0.1],
  ] as [number, number][];
  updateImage(polygonInJS, defaultWindowOptions);
}

// @ts-ignore
window.updateCoordinate = updateCoordinate;



const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;


const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const main = async () => {
  await init(htmlCanvas, resolution);
  const windowsInJS = generateWindowsAlongWall(polygonInJS, defaultWindowOptions);
  console.log("starting precomute")
  await preComputeSurroundings()
  console.log("precomute done")
  rayTrace(polygonInJS, windowsInJS);
  //   const offscreen = htmlCanvas.transferControlToOffscreen()
  //   worker.postMessage({type: "init", canvas: offscreen}, [offscreen]);
  //   await new Promise(resolve => setTimeout(resolve, 2000));
  //   worker.postMessage({type: "update", polygon: polygonInJS});
};
main();

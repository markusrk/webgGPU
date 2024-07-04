import * as ti from "taichi.js";
import { init, rayTrace } from "./rayTracer";
import { generateWindowsAlongWall } from "./geometryTools";

const resolution = 1000;

document.getElementById("inputElement")!.addEventListener("input", (e) => {
  const v = (e.target as HTMLInputElement).value;
  updateImage(100, 1000 * Number(v));
});

const updateImage = (x, y) => {
  const polygonInJS = [
    [resolution * 0.1, resolution * 0.1],
    [x, resolution - y],
    [resolution * 0.9, resolution * 0.9],
    [resolution * 0.9, resolution * 0.1],
    [resolution * 0.1, resolution * 0.1],
  ] as [number, number][];
  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions);
  rayTrace(polygonInJS, windowsInJS);
    // worker.postMessage({type: "update", polygon: polygonInJS});
};

window.updateImage = updateImage;

const polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.4],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1],
] as [number, number][];

const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;

const windowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const main = async () => {
  await init(htmlCanvas);
  const windowsInJS = generateWindowsAlongWall(polygonInJS, windowOptions);
  rayTrace(polygonInJS, windowsInJS);
//   const offscreen = htmlCanvas.transferControlToOffscreen()
//   worker.postMessage({type: "init", canvas: offscreen}, [offscreen]);
//   await new Promise(resolve => setTimeout(resolve, 2000));
//   worker.postMessage({type: "update", polygon: polygonInJS});
};
main();

import { rayTrace } from "./rayTracer";
import * as ti from "taichi.js";

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

  rayTrace(polygonInJS, windowOptions);
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

rayTrace(polygonInJS, windowOptions);

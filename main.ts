import { rayTrace } from "./rayTracer";

const resolution = 1000;

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

const windowOptions = { windowSize: 50, windowSpacing: 200 };

rayTrace(resolution, polygonInJS, windowOptions, htmlCanvas);
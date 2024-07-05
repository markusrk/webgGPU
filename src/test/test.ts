import * as ti from "taichi.js";
import { init, initialize, } from "./testTracer";


const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
htmlCanvas.width = 1000;
htmlCanvas.height = 1000;

const main = async () => {
  await init(htmlCanvas);
  console.log("starting precomute");
  await initialize();
  console.log("precomute done");
  //   const offscreen = htmlCanvas.transferControlToOffscreen()
  //   worker.postMessage({type: "init", canvas: offscreen}, [offscreen]);
  //   await new Promise(resolve => setTimeout(resolve, 2000));
  //   worker.postMessage({type: "update", polygon: polygonInJS});
};
main();

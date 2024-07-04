import { generateWindowsAlongWall } from "./geometryTools";
import { init, rayTrace } from "./rayTracer";

let canvas = null;
let ctxWorker = null;

type WorkerEvent =
  | {
      type: "init";
      data: {
        canvas: OffscreenCanvas;
      };
    }
  | {
      type: "update";
      data: {
        polygon: [number, number][];
      };
    };

// Waiting to receive the OffScreenCanvas
self.onmessage = async (event) => {
  if (event.data.type === "init") {
    canvas = event.data.canvas;
    // @ts-ignore
    canvas!.width = 1000;
    // @ts-ignore
    canvas!.height = 1000;
    await init(canvas);
  } else {
    const windowOptions = {
      windowSize: 50,
      windowSpacing: 200,
      windowHeight: 100,
    };
    const windowsInJS = generateWindowsAlongWall(event.data.polygon, windowOptions);
    rayTrace(event.data.polygon, windowsInJS);
  }
};

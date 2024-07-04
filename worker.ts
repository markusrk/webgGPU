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
    canvas!.width = 1000;
    canvas!.height = 1000;
    await init(canvas)

  } else {
    rayTrace(event.data.polygon, { windowSize: 50, windowSpacing: 200 });
  }
};

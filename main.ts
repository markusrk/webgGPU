import * as ti from "taichi.js";
import { Vector, range } from "taichi.js/dist/taichi";

let main = async () => {
  await ti.init();

  console.log("initialising grid");
  const n = 2000;
  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;


  console.log("initialising rectangles");
  
  const Rectangle = ti.types.struct({
    xMin: ti.f32,
    xMax: ti.f32,
    yMin: ti.f32,
    yMax: ti.f32,
  });
  const rectangleCount = 100;
  const rectangles = ti.field(Rectangle, [rectangleCount]);

  for (let i of range(rectangleCount)) {
    const xMin = Math.max(0, Math.random() * n - 5);
    const xMax = xMin + 5;
    const yMin = Math.max(0, Math.random() * n - 5);
    const yMax = yMin + 5;
    const struct = { xMin, xMax, yMin, yMax };
    rectangles.set([i], struct);
  }

  type Window = { x0; number; x1: number; y0: number; y1: number };

  console.log("initialising analysis points");
  
  const analysisPointCount = 1;
  const analysisPoints = ti.Vector.field(2, ti.f32, [
    analysisPointCount,
  ]) as ti.Field;

  for (let i of range(analysisPointCount)) {
    const x = n / 2;
    const y = n * 2;
    analysisPoints.set([i], [x, y]);
  }
  console.log("adding to kernel scope");

  ti.addToKernelScope({
    points,
    pixels,
    n,
    rectangles,
    rectangleCount,
    analysisPoints,
    analysisPointCount,
  });

  console.log("creating kernel");


  const kernel = ti.kernel((time: number) => {
    const goesThroughWindow = (position: ti.Vector) => {
      let bool = false;
      const pos = position.xy as ti.Vector;
      for (let k of ti.range(analysisPointCount)) {
        const analysisPoint = analysisPoints[k] as ti.Vector;
        for (let i of ti.range(rectangleCount)) {
          const rectangle = rectangles[i];
          const dir = (analysisPoint - pos) as ti.Vector;
          const t = (rectangle.yMin - pos.y) / dir.y;
          if (t > 0) {
            const intersection = pos + dir * t;
            if (
              intersection.x > rectangle.xMin &&
              intersection.x <= rectangle.xMax
            ) {
              bool = true;
            }
          }
        }
      }
      return bool;
    };

    for (let I of ti.ndrange(n, n)) {
      const bool = goesThroughWindow(points[I]);
      pixels[I][0] = bool;
      pixels[I][1] = bool;
      pixels[I][2] = bool;
    }
  });

  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  htmlCanvas.width = n;
  htmlCanvas.height = n;
  let canvas = new ti.Canvas(htmlCanvas);

  let i = 0;
  async function frame() {
    i = i + 1;
    analysisPoints.set([0],[n*2*Math.sin(i/50),n*2*Math.cos(i/50)] );
    kernel(i);
    canvas.setImage(pixels);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};
main();

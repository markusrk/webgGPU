import * as ti from "taichi.js";
import { range } from "taichi.js/dist/taichi";

let main = async () => {
  await ti.init();

  const n = 100;
  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;

  for (let i of ti.ndrange(n,n)) {
    points.set(i,[...i,0.] );
  }

  const rectangleCount = 100;
  const rectangles = ti.Vector.field(4,ti.i32, [rectangleCount]);

  for (let i of range(rectangleCount)) {
    const xMin = Math.max(0, Math.random() * n - 5);
    const xMax = xMin + 5;
    const yMin = Math.max(0, Math.random() * n - 5);
    const yMax = yMin + 5;
    const vector = [xMin, xMax, yMin, yMax];
    rectangles.set([i], vector);
  }

  const analysisPointCount = 1;
  const analysisPoints = ti.field(ti.f32, [analysisPointCount,2]) as ti.Field;

  for (let i of range(analysisPointCount)) {
    const x = n/2;
    const y = n*2;
    analysisPoints.set([i, 0], x);
    analysisPoints.set([i, 1], y);
  }

  ti.addToKernelScope({ points, pixels, n, rectangles, rectangleCount });

  const kernel = ti.kernel((time: number) => {
    // const goesThroughWindow = (i: number, j: number) => {
    //     let bool = false;
    //     for (let k of ti.range(rectangleCount)) {
    //         if (
    //         i > rectangles[(k, 0)] &&
    //         i <= rectangles[(k, 1)] &&
    //         j > rectangles[(k, 2)] &&
    //         j <= rectangles[(k, 3)]
    //         ) {
    //         bool = true;
    //         }
    //     }
    //     return bool;
    // }

    const isInside = (v: ti.Vector) => {
      let bool = false;
      for (let k of ti.range(rectangleCount)) {
        if (
          v.x > rectangles[k][0] &&
          v.x <= rectangles[k][1] &&
          v.y > rectangles[k][2] &&
          v.y <= rectangles[k][3]
        ) {
          bool = true;
        }
      }
      return bool;
    };
    for (let I of ti.ndrange(n, n)) {
      const bool = isInside(points[I]);
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
    kernel(i);
    canvas.setImage(pixels);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};
main();

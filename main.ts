import * as ti from "taichi.js";
import { range } from "taichi.js/dist/taichi";

let main = async () => {
  await ti.init();

  const n = 100;
  const pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  
  const rectangleCount = 10000
  const rectangles = ti.field(ti.i32, [rectangleCount, 4]);

  for (let i of range(rectangleCount)) {
    const xMin = Math.max(0,Math.random() * n - 5);
    const xMax = xMin + 5;
    const yMin = Math.max(0,Math.random() * n - 5)
    const yMax = yMin + 5;
    rectangles.set([i, 0], xMin);
    rectangles.set([i, 1], xMax);
    rectangles.set([i, 2], yMin);
    rectangles.set([i, 3], yMax);
  }
  console.log(rectangles);

  ti.addToKernelScope({ pixels, n, rectangles, rectangleCount });

  const kernel = ti.kernel((time: number) => {
    const isInside = (i: number,j: number) => {
      let bool = false;
      for (let k of ti.range(rectangleCount)) {
        if (i > rectangles[k,0] && i <= rectangles[k,1] && j >rectangles[k,2] && j <= rectangles[k,3]) {
          bool = true;
        }
      }
      return bool;
    };
    for (let i of ti.ndrange(n,n)) {
        const bool = isInside((i[0]+time*10)%n,i[1]);
      pixels[i][0] = bool;
      pixels[i][1] = bool;
      pixels[i][2] = bool;
    }
  });

  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  htmlCanvas.width =  n;
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

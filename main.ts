import * as ti from "taichi.js";
import { Vector, range } from "taichi.js/dist/taichi";

let main = async () => {
  await ti.init();

  console.log("initialising grid");
  const n = 2000;
  const points = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
  const scores = ti.field(ti.f32, [n, n]) as ti.Field;
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
  
  const analysisPointCount = 10;
  const analysisPoints = ti.Vector.field(2, ti.f32, [
    analysisPointCount,
  ]) as ti.Field;

  console.log("adding to kernel scope");

  ti.addToKernelScope({
    points,
    pixels,
    n,
    rectangles,
    rectangleCount,
    analysisPoints,
    analysisPointCount,
    scores,
  });

  console.log("creating kernel");

  const initilizeGrid = ti.kernel(() => {
    for (let I of ti.ndrange(n, n)) {
      points[I] = [I[0], I[1], 0];
    }
  });

  const initilizeAnalysisPoints = ti.kernel(() => {
    for (let i of ti.range(analysisPointCount)) {
      analysisPoints[i] = [n * 2 * ti.sin(i / 50), n * 2 * ti.cos(i / 50)];
    }
  });

  const updateAnalysisPoint = ti.kernel((t: number) => {
    for (let i of ti.range(analysisPointCount)) {
      analysisPoints[i] = [
        n * 2 * ti.sin(t / 50 + i * 1),
        n * 2 * ti.cos(t / 50 + i * 1),
      ];
    }
  });

  const updateTexture = ti.kernel(() => {
    const adjustmentFactor = 10 / analysisPointCount / ti.sqrt(rectangleCount);
    for (let I of ti.ndrange(n, n)) {
      const color = adjustmentFactor * scores[I];
      pixels[I] = [color, color, color];
    }
  });

  const kernel = ti.kernel((time: number) => {
    const goesThroughWindowsCount = (position: ti.Vector) => {
      let count = 0;
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
                count += 1;
            }
          }
        }
      }
      return count;
    };

    for (let I of ti.ndrange(n, n)) {
      scores[I] = goesThroughWindowsCount(points[I]);
    }
  });

  const htmlCanvas = document.getElementById("result_canvas")! as ti.Canvas;
  htmlCanvas.width = n;
  htmlCanvas.height = n;
  let canvas = new ti.Canvas(htmlCanvas);
  initilizeGrid();
  initilizeAnalysisPoints();

  let i = 0;
  async function frame() {
    i = i + 1;
    updateAnalysisPoint(i);
    kernel(i);
    updateTexture()
    canvas.setImage(pixels);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};
main();

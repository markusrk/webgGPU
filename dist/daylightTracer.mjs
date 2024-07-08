import { p as pr, h as hr, g as gr, y as yr, c as cr, d as dr, i as ie, E as Er, r as rayIntersectsRectangle, m as mr } from "./intersect-Dp00BRkN.mjs";
const getColorForScore = pr(`(score, colorPallet, colorPalletLength) => {
    let index = 0;
    for (let i of ti.range(colorPalletLength)) {
      if (score > colorPallet[i][3]) {
        index = i;
      }
    }
    const maxScore = colorPallet[index + 1][3];
    const minScore = colorPallet[index][3];
    const a = (score - minScore) / (maxScore - minScore);
    return colorPallet[index].rgb * (1 - a) + colorPallet[index + 1].rgb * a;
  }`);
const isPointInsidePolygon = pr(`(point, polygon, polygonLength) => {
  const x = point[0];
  const y = point[1];
  const numVertices = polygonLength - 1;
  let crossings = 0;
  for (let i of ti.range(numVertices)) {
    let x1 = polygon[i][0];
    let y1 = polygon[i][1];
    let x2 = polygon[i + 1][0];
    let y2 = polygon[i + 1][1];
    if (y1 <= y && y < y2 && (x - x1) * (y2 - y1) < (x2 - x1) * (y - y1)) {
      crossings += 1;
    }
    if (y1 > y && y >= y2 && (x - x1) * (y2 - y1) > (x2 - x1) * (y - y1)) {
      crossings += 1;
    }
  }
  return crossings % 2 === 1;
}`);
const computeRayDirection = pr(`(theta, alpha) => {
  const x = ti.cos(theta) * ti.cos(alpha);
  const y = ti.cos(theta) * ti.sin(alpha);
  const z = ti.sin(theta);
  return ti.normalized([x, y, z]);
}`);
const getRayForAngle = pr(`(verticalStep, horizontalStep, i, j) => {
  const theta = i * verticalStep;
  const alpha = j * horizontalStep;
  return computeRayDirection(theta, alpha);
}`);
const getVscScoreAtAngle = pr(`(rayDirection, verticalStep, horizontalStep) => {
  const vscAtAngle = 1 + 2 * rayDirection[2];
  const deltaOmega = ti.norm(rayDirection.xy) * verticalStep * horizontalStep;
  return vscAtAngle * deltaOmega;
}`);
const VERTICAL_RESOLUTION = 64;
const HORISONTAL_RESOLUTION = 256;
const VERTICAL_STEP = Math.PI / 2 / VERTICAL_RESOLUTION;
const HORISONTAL_STEP = Math.PI * 2 / HORISONTAL_RESOLUTION;
const MAX_DAYLIGHT = 12.641899784120097;
let currentToken = Symbol();
const N = 1e3;
const points = hr.field(3, gr, [N, N]);
const scoresMask = yr(gr, [N, N]);
const scores = yr(gr, [N, N]);
const pixels = hr.field(3, gr, [N, N]);
let isInitialized = false;
let htmlCanvas$1;
let canvas;
const colorPalletJS = [
  [1, 0, 0, 0],
  [0, 0.2, 1, 0.1],
  [0, 0.6, 1, 0.3],
  [0, 1, 0.1, 1]
];
const colorPalletLength = colorPalletJS.length;
const colorPallet = hr.field(4, gr, colorPalletLength);
const init = async (input_canvas) => {
  htmlCanvas$1 = input_canvas;
  await ie();
  canvas = new Er(htmlCanvas$1);
  cr({
    points,
    pixels,
    N,
    scores,
    scoresMask,
    isPointInsidePolygon,
    rayIntersectsRectangle,
    getRayForAngle,
    computeRayDirection,
    getVscScoreAtAngle,
    VERTICAL_RESOLUTION,
    HORISONTAL_RESOLUTION,
    VERTICAL_STEP,
    HORISONTAL_STEP,
    MAX_DAYLIGHT,
    colorPallet,
    colorPalletLength,
    getColorForScore
  });
  const initilizeGrid = dr(`() => {
    for (let I of ti.ndrange(N, N)) {
      points[I] = [I[0], I[1], 0];
    }
  }`);
  initilizeGrid();
  colorPallet.fromArray(colorPalletJS);
  isInitialized = true;
};
const preComputeSurroundings = async () => {
  if (!isInitialized) {
    console.log("Triggered preComputeSurroundings before initialization was done!!!");
  }
  const m = 1e6;
  const vertices = hr.field(3, gr, [m]);
  const indices = hr.field(3, mr, [m]);
  cr({
    vertices,
    indices,
    m
  });
  const initVertices = dr(`() => {
    const scale = 100;
    for (let i of ti.range(m / 3)) {
      const step = i * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scale];
      vertices[step + 1] = vertices[step] + [1, 1, 0];
      vertices[step + 2] = vertices[step] + [0, 0, 1];
      indices[step] = [step, step + 1, step + 2];
    }
  }`);
  initVertices();
  return initVertices();
};
const rayTrace = async (polygonInJS2, windowsInJS) => {
  if (!isInitialized) {
    console.log("Triggered rayTrace before initialization was done!!!");
  }
  const thisToken = Symbol();
  currentToken = thisToken;
  const polygonLength = polygonInJS2.length;
  const polygon = hr.field(2, gr, [polygonLength]);
  polygon.fromArray(polygonInJS2);
  if (thisToken !== currentToken)
    return;
  const windowCount = windowsInJS.length;
  const windows = hr.field(3, gr, [windowCount, 2]);
  if (thisToken !== currentToken)
    return;
  windows.fromArray(windowsInJS);
  if (thisToken !== currentToken)
    return;
  cr({
    windows,
    windowCount,
    polygon,
    polygonLength
  });
  const updateScoresMask = dr(`() => {
    for (let I of ti.ndrange(N, N)) {
      scoresMask[I] = isPointInsidePolygon(points[I].xy, polygon, polygonLength);
    }
  }`);
  const updateTexture = dr(`() => {
    for (let I of ti.ndrange(N, N)) {
      if (scoresMask[I] > 0) {
        let color = getColorForScore(scores[I], colorPallet, colorPalletLength);
        pixels[I] = color;
      } else {
        pixels[I] = [0, 0, 0];
      }
    }
  }`);
  const rayTrace2 = dr(`(stepSize2, time) => {
    const computeScoreForPoint = (position) => {
      let score = ti.f32(0);
      for (let I of ti.ndrange(VERTICAL_RESOLUTION, HORISONTAL_RESOLUTION / stepSize2)) {
        const I2 = [
          I.x,
          (I.y * ti.i32(stepSize2) + ti.i32(time) + I.x * HORISONTAL_RESOLUTION / stepSize2 / 1.5) % HORISONTAL_RESOLUTION
        ];
        const ray = getRayForAngle(VERTICAL_STEP, HORISONTAL_STEP, I2[0], I2[1]);
        const scoreForAngle = getVscScoreAtAngle(ray, VERTICAL_STEP, HORISONTAL_STEP);
        for (let i2 of ti.range(windowCount)) {
          const recStart = windows[i2, 0];
          const recEnd = windows[i2, 1];
          const isInside = rayIntersectsRectangle(position, ray, recStart, recEnd);
          if (isInside) {
            score = score + scoreForAngle;
          }
        }
      }
      return score / MAX_DAYLIGHT;
    };
    for (let I of ti.ndrange(N, N)) {
      for (let i2 of ti.range(1)) {
        if (scoresMask[I] > 0) {
          scores[I] = scores[I] * (time - 1) / ti.max(time, 1) + computeScoreForPoint(points[I]) * stepSize2 / ti.max(time, 1);
        }
      }
    }
  }`);
  if (thisToken !== currentToken)
    return;
  updateScoresMask();
  if (thisToken !== currentToken)
    return;
  let i = 0;
  const stepSize = 32;
  async function frame() {
    if (thisToken !== currentToken)
      return;
    i = i + 1;
    rayTrace2(stepSize, i);
    if (thisToken !== currentToken)
      return;
    updateTexture();
    if (thisToken !== currentToken)
      return;
    canvas.setImage(pixels);
    i < stepSize && requestAnimationFrame(frame);
  }
  if (thisToken !== currentToken)
    return;
  requestAnimationFrame(frame);
};
const getVscScoreAtAngleJS = (angle, verticalStep, horizontalStep) => {
  const vscAtAngle = 1 + 2 * Math.sin(angle);
  const deltaOmega = Math.cos(angle) * verticalStep * horizontalStep;
  return vscAtAngle * deltaOmega;
};
let daylightScore = 0;
for (let i = 0; i < VERTICAL_RESOLUTION; i++) {
  for (let j = 0; j < HORISONTAL_RESOLUTION; j++) {
    const angle = i * VERTICAL_STEP;
    const score = getVscScoreAtAngleJS(angle, VERTICAL_STEP, HORISONTAL_STEP);
    daylightScore += score;
  }
}
console.log("daylightScore = ", daylightScore);
const DEFAULT_OPTIONS = {
  windowSize: 50,
  windowSpacing: 200,
  windowHeight: 5
};
const generateWindowsAlongWall = (polygon, options) => {
  const { windowSize, windowSpacing, windowHeight } = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const windows = [];
  for (let i = 0; i < polygon.length - 1; i++) {
    const startPosition = polygon[i];
    const endPosition = polygon[i + 1];
    const relDir = minus(endPosition, startPosition);
    const dir = norm(relDir);
    const wallLength = Math.sqrt(Math.pow(endPosition[0] - startPosition[0], 2) + Math.pow(endPosition[1] - startPosition[1], 2));
    let t = 0;
    while (t + windowSize < wallLength) {
      let t0 = t;
      t += windowSize;
      const windowStartPosition = add(startPosition, scalarMul(dir, t0));
      const windowEndPosition = add(startPosition, scalarMul(dir, t));
      windows.push([
        [...windowStartPosition, 0],
        [...windowEndPosition, windowHeight]
      ]);
      t += windowSpacing;
    }
  }
  return windows;
};
const minus = (a, b) => {
  return a.map((_, i) => a[i] - b[i]);
};
const norm = (a) => {
  const mag = Math.sqrt(a.reduce((acc, cur) => acc + cur * cur, 0));
  return a.map((x) => x / mag);
};
const add = (a, b) => {
  return a.map((_, i) => a[i] + b[i]);
};
const scalarMul = (a, b) => {
  return a.map((x) => x * b);
};
const resolution = 1e3;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.4],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1]
];
document.getElementById("windowSize").addEventListener("input", (e) => {
  const v = e.target.value;
  defaultWindowOptions = { ...defaultWindowOptions, windowSize: parseInt(v) };
  updateImage(polygonInJS, defaultWindowOptions);
});
document.getElementById("windowHeight").addEventListener("input", (e) => {
  const v = e.target.value;
  defaultWindowOptions = { ...defaultWindowOptions, windowHeight: parseInt(v) };
  updateImage(polygonInJS, defaultWindowOptions);
});
const updateImage = (polygonInJS2, windowOptions) => {
  const windowsInJS = generateWindowsAlongWall(polygonInJS2, windowOptions);
  rayTrace(polygonInJS2, windowsInJS);
};
const updateCoordinate = (x, y) => {
  polygonInJS = [
    [resolution * 0.1, resolution * 0.1],
    [x, resolution - y],
    [resolution * 0.9, resolution * 0.9],
    [resolution * 0.9, resolution * 0.1],
    [resolution * 0.1, resolution * 0.1]
  ];
  updateImage(polygonInJS, defaultWindowOptions);
};
window.updateCoordinate = updateCoordinate;
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;
new Worker(new URL(
  /* @vite-ignore */
  "/webgGPU/dist/assets/worker-Dki88y74.js",
  import.meta.url
), {
  type: "module"
});
const main = async () => {
  await init(htmlCanvas);
  const windowsInJS = generateWindowsAlongWall(polygonInJS, defaultWindowOptions);
  console.log("starting precomute");
  await preComputeSurroundings();
  console.log("precomute done");
  rayTrace(polygonInJS, windowsInJS);
};
main();

var _a, _b;
import "./modulepreload-polyfill-BoyGcPDr.js";
import { rayTrace, init, initializeSurroundings } from "https://markusrk.github.io/webgGPU/dist/v2/tracer.mjs";
const sub = (a, b) => {
  return a.map((_, i) => a[i] - b[i]);
};
const add = (a, b) => {
  return a.map((_, i) => a[i] + b[i]);
};
const scalarMul = (a, b) => {
  return a.map((x2) => x2 * b);
};
const wallTrianglesFromPoints = (p1, p2) => {
  const c1 = [p1[0], p1[1], p2[2]];
  const c2 = [p2[0], p2[1], p1[2]];
  return [
    [p1, c2, p2],
    [p1, p2, c1]
  ];
};
const wallWithWindowFromPoints = (p1, p2, wp1, wp2) => {
  const wallSection1EndPoint = [wp1[0], wp1[1], p2[2]];
  const wallSection1 = wallTrianglesFromPoints(p1, wallSection1EndPoint);
  const wallUnderWindowStartPoint = [wp1[0], wp1[1], p1[2]];
  const wallUnderWindowEndPoint = [wp2[0], wp2[1], wp1[2]];
  const wallSectionUnderWindow = wallTrianglesFromPoints(wallUnderWindowStartPoint, wallUnderWindowEndPoint);
  const wallOverWindowStartPoint = [wp1[0], wp1[1], wp2[2]];
  const wallOverWindowEndPoint = [wp2[0], wp2[1], p2[2]];
  const wallSectionOverWindow = wallTrianglesFromPoints(wallOverWindowStartPoint, wallOverWindowEndPoint);
  const wallSection2StartPoint = [wp2[0], wp2[1], p1[2]];
  const wallSection2 = wallTrianglesFromPoints(wallSection2StartPoint, p2);
  return [...wallSection1, ...wallSectionUnderWindow, ...wallSectionOverWindow, ...wallSection2];
};
const downwardsFacingTrianglesFromPoints = (p1, p2) => {
  const c1 = [p2[0], p1[1], p2[2]];
  const c2 = [p1[0], p2[1], p2[2]];
  return [
    [p1, c2, p2],
    [p1, p2, c1]
  ];
};
const upwardsFacingTrianglesFromPoints = (p1, p2) => {
  const c1 = [p2[0], p1[1], p2[2]];
  const c2 = [p1[0], p2[1], p2[2]];
  return [
    [p1, p2, c2],
    [p1, c1, p2]
  ];
};
const inwardsBoxFromAABBWithwindow = (p1, p2, windowWidth2, windowHeight2) => {
  const x2 = [p2[0] - p1[0], 0, 0];
  const y2 = [0, p2[1] - p1[1], 0];
  const z = [0, 0, p2[2] - p1[2]];
  const front = wallTrianglesFromPoints(add(p1, x2), add(p1, z));
  const right = wallTrianglesFromPoints(sub(p2, z), sub(p2, y2));
  const wp1 = add(add(add(p1, y2), scalarMul(x2, 0.5 - windowWidth2 / 2)), scalarMul(z, 0));
  const wp2 = add(add(add(p1, y2), scalarMul(z, windowHeight2)), scalarMul(x2, 0.5 + windowWidth2 / 2));
  const back = wallWithWindowFromPoints(add(p1, y2), p2, wp1, wp2);
  const left = wallTrianglesFromPoints(p1, add(add(p1, z), y2));
  const top = downwardsFacingTrianglesFromPoints(add(p1, z), p2);
  const bottom = upwardsFacingTrianglesFromPoints(p1, sub(p2, z));
  return [...front, ...right, ...back, ...left, ...top, ...bottom];
};
const createBinsInJS = (binCount, min, max) => {
  const binSizeX = (max[0] - min[0]) / binCount;
  const binSizeY = (max[1] - min[1]) / binCount;
  const newBinsInJS = [];
  for (let i = 0; i < binCount; i += 1) {
    const binRow = [];
    for (let j = 0; j < binCount; j += 1) {
      binRow.push({
        aa: [i * binSizeX, j * binSizeY, 1e5],
        bb: [(i + 1) * binSizeX, (j + 1) * binSizeY, -1e5],
        iStart: 0,
        iEnd: 0
      });
    }
    newBinsInJS.push(binRow);
  }
  return newBinsInJS;
};
const main$1 = () => {
  const a = [0, 0, 0];
  const b = [100, 100, 100];
  const masterBins = createBinsInJS(10, a, b);
  masterBins.map((row) => row.map((bin) => bin.xMin));
  console.log("masterBins = ", masterBins);
};
main$1();
const OFFSET = 0.01;
let options = {
  materialReflectivity: 0.99,
  maxBounces: 4,
  triangleCount: 1e3,
  resolution: 300,
  sizeInMeters: 100,
  samplesPerPoint: 1e3
};
const resolutionParam = new URLSearchParams(window.location.search).get("resolution");
if (resolutionParam) {
  const resolution = parseInt(resolutionParam);
  options = { ...options, resolution };
}
let windowWidth = 0.1;
let windowHeight = 0.1;
let x = 0.9;
let y = 0.9;
let polygonInJS = [
  [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1],
  [options.sizeInMeters * 0.1, options.sizeInMeters * 0.9],
  [options.sizeInMeters * 0.9, options.sizeInMeters * 0.9],
  [options.sizeInMeters * 0.9, options.sizeInMeters * 0.1],
  [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1]
];
const updatePolygon = (p) => {
  polygonInJS = [
    [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1],
    [options.sizeInMeters * 0.1, options.sizeInMeters * p.y / options.resolution],
    [options.sizeInMeters * p.x / options.resolution, options.sizeInMeters * p.y / options.resolution],
    [options.sizeInMeters * p.x / options.resolution, options.sizeInMeters * 0.1],
    [options.sizeInMeters * 0.1, options.sizeInMeters * 0.1]
  ];
};
let wallsInJs = [
  // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow([options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0], [options.sizeInMeters * (0.9 + OFFSET), options.sizeInMeters * (0.9 + OFFSET), 1e3], windowWidth, windowHeight)
];
const updateWalls = (p) => {
  wallsInJs = [
    ...inwardsBoxFromAABBWithwindow([options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0], [
      options.sizeInMeters * (p.x / options.resolution + OFFSET),
      options.sizeInMeters * (p.y / options.resolution + OFFSET),
      1e3
    ], windowWidth, windowHeight)
  ];
};
document.getElementById("windowSize").addEventListener("input", (e) => {
  const v = e.target.value;
  windowWidth = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow([options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0], [options.sizeInMeters * (x + OFFSET), options.sizeInMeters * (y + OFFSET), 1e3], windowWidth, windowHeight)
  ];
  updateImage(polygonInJS, wallsInJs, options);
});
document.getElementById("windowHeight").addEventListener("input", (e) => {
  const v = e.target.value;
  windowHeight = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow([options.sizeInMeters * (0.1 - OFFSET), options.sizeInMeters * (0.1 - OFFSET), 0], [options.sizeInMeters * (x + OFFSET), options.sizeInMeters * (y + OFFSET), 1e3], windowWidth, windowHeight)
  ];
  updateImage(polygonInJS, wallsInJs, options);
});
document.getElementById("reflectivityInput").addEventListener("input", (e) => {
  const v = e.target.value;
  options = { ...options, materialReflectivity: parseFloat(v) };
  updateImage(polygonInJS, wallsInJs, options);
});
document.getElementById("maxBouncesInput").addEventListener("input", (e) => {
  const v = e.target.value;
  options = { ...options, maxBounces: parseInt(v) };
  updateImage(polygonInJS, wallsInJs, options);
});
(_a = document.getElementById("randomTriangleCountInput")) == null ? void 0 : _a.addEventListener("input", (e) => {
  const v = e.target.value;
  const count = parseInt(v);
  options = { ...options, triangleCount: count };
  updateImage(polygonInJS, wallsInJs, options);
});
(_b = document.getElementById("minSamplesInput")) == null ? void 0 : _b.addEventListener("input", (e) => {
  const v = e.target.value;
  const count = parseInt(v);
  options = { ...options, samplesPerPoint: count };
  updateImage(polygonInJS, wallsInJs, options);
});
const updateCoordinate = (newX, newY) => {
  const htmlCanvas2 = document.getElementById("result_canvas");
  x = newX / htmlCanvas2.width;
  y = 1 - newY / htmlCanvas2.height;
  const scaledX = x * options.resolution;
  const scaledY = y * options.resolution;
  updateWalls({ x: scaledX, y: scaledY });
  updatePolygon({ x: scaledX, y: scaledY });
  updateImage(polygonInJS, wallsInJs, options);
};
const updateImage = (polygonInJS2, wallsInJS, options2) => {
  rayTrace(polygonInJS2, wallsInJS, options2);
};
window.updateCoordinate = debounce(updateCoordinate, 10);
function debounce(func, delay) {
  let timerId;
  return function(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
const fixDotPosition = () => {
  const dragElement = document.getElementById("dragElement");
  dragElement.style.left = options.resolution * 0.9 + "px";
  dragElement.style.top = options.resolution * 0.1 + "px";
};
fixDotPosition();
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = options.resolution;
htmlCanvas.height = options.resolution;
const main = async () => {
  await init(htmlCanvas, options);
  await initializeSurroundings(options);
  rayTrace(polygonInJS, wallsInJs, options);
};
main();

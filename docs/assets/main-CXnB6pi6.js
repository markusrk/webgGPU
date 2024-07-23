import "./modulepreload-polyfill-BoyGcPDr.js";
import { rayTrace, init, preComputeSurroundings } from "https://markusrk.github.io/webgGPU/dist/v2/tracer.mjs";
const sub = (a, b) => {
  return a.map((_, i) => a[i] - b[i]);
};
const add = (a, b) => {
  return a.map((_, i) => a[i] + b[i]);
};
const scalarMul = (a, b) => {
  return a.map((x) => x * b);
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
  const x = [p2[0] - p1[0], 0, 0];
  const y = [0, p2[1] - p1[1], 0];
  const z = [0, 0, p2[2] - p1[2]];
  const front = wallTrianglesFromPoints(add(p1, x), add(p1, z));
  const right = wallTrianglesFromPoints(sub(p2, z), sub(p2, y));
  const wp1 = add(add(add(p1, y), scalarMul(x, 0.5 - windowWidth2 / 2)), scalarMul(z, 0));
  const wp2 = add(add(add(p1, y), scalarMul(z, windowHeight2)), scalarMul(x, 0.5 + windowWidth2 / 2));
  const back = wallWithWindowFromPoints(add(p1, y), p2, wp1, wp2);
  const left = wallTrianglesFromPoints(p1, add(add(p1, z), y));
  const top = downwardsFacingTrianglesFromPoints(add(p1, z), p2);
  const bottom = upwardsFacingTrianglesFromPoints(p1, sub(p2, z));
  return [...front, ...right, ...back, ...left, ...top, ...bottom];
};
const OFFSET = 0.01;
const sizeInMeters = 100;
const resolution = 200;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let bounceOptions = { materialReflectivity: 0.9, maxBounces: 4 };
let windowWidth = 0.1;
let windowHeight = 0.1;
let polygonInJS = [
  [sizeInMeters * 0.1, sizeInMeters * 0.1],
  [sizeInMeters * 0.1, sizeInMeters * 0.9],
  [sizeInMeters * 0.9, sizeInMeters * 0.9],
  [sizeInMeters * 0.9, sizeInMeters * 0.1],
  [sizeInMeters * 0.1, sizeInMeters * 0.1]
];
let wallsInJs = [
  // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow([sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0], [sizeInMeters * (0.9 + OFFSET), sizeInMeters * (0.9 + OFFSET), 1e3], windowWidth, windowHeight)
];
document.getElementById("windowSize").addEventListener("input", (e) => {
  const v = e.target.value;
  windowWidth = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow([sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0], [sizeInMeters * (0.9 + OFFSET), sizeInMeters * (0.9 + OFFSET), 1e3], windowWidth, windowHeight)
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("windowHeight").addEventListener("input", (e) => {
  const v = e.target.value;
  windowHeight = parseFloat(v);
  wallsInJs = [
    // ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow([sizeInMeters * (0.1 - OFFSET), sizeInMeters * (0.1 - OFFSET), 0], [sizeInMeters * (0.9 + OFFSET), sizeInMeters * (0.9 + OFFSET), 1e3], windowWidth, windowHeight)
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("reflectivityInput").addEventListener("input", (e) => {
  const v = e.target.value;
  bounceOptions = { ...bounceOptions, materialReflectivity: parseFloat(v) };
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("maxBouncesInput").addEventListener("input", (e) => {
  const v = e.target.value;
  bounceOptions = { ...bounceOptions, maxBounces: parseInt(v) };
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
const updateCoordinate = (x, y) => {
  polygonInJS = [
    [sizeInMeters * 0.1, sizeInMeters * 0.1],
    [x, sizeInMeters - y],
    [sizeInMeters * 0.9, sizeInMeters * 0.9],
    [sizeInMeters * 0.9, sizeInMeters * 0.1],
    [sizeInMeters * 0.1, sizeInMeters * 0.1]
  ];
  updateImage(polygonInJS, defaultWindowOptions);
};
const updateImage = (polygonInJS2, wallsInJS, bounceOptions2) => {
  rayTrace(polygonInJS2, wallsInJS, bounceOptions2);
};
window.updateCoordinate = updateCoordinate;
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;
const main = async () => {
  await init(htmlCanvas, resolution);
  await preComputeSurroundings();
  rayTrace(polygonInJS, wallsInJs, bounceOptions);
};
main();

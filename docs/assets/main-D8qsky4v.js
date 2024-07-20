import { rayTrace, init } from "https://markusrk.github.io/webgGPU/dist/v2/tracer.mjs";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const DEFAULT_OPTIONS = {
  windowSize: 50,
  windowSpacing: 200,
  windowHeight: 5
};
const generateWindowsAlongWall = (polygon, options) => {
  const { windowSize, windowSpacing, windowHeight: windowHeight2 } = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const windows = [];
  for (let i = 0; i < polygon.length - 1; i++) {
    const startPosition = polygon[i];
    const endPosition = polygon[i + 1];
    const relDir = sub(endPosition, startPosition);
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
        [...windowEndPosition, windowHeight2]
      ]);
      t += windowSpacing;
    }
  }
  return windows;
};
const sub = (a, b) => {
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
  return [...front, ...right, ...back, ...left, ...top];
};
const boxFromAABBWithHoleInTheTop = (p1, p2) => {
  const x = [p2[0] - p1[0], 0, 0];
  const y = [0, p2[1] - p1[1], 0];
  const z = [0, 0, p2[2] - p1[2]];
  const front = wallTrianglesFromPoints(p1, add(add(p1, x), z));
  const right = wallTrianglesFromPoints(add(p1, x), p2);
  const back = wallTrianglesFromPoints(sub(p2, z), sub(p2, x));
  const left = wallTrianglesFromPoints(add(p1, y), add(p1, z));
  const bottom = downwardsFacingTrianglesFromPoints(p1, sub(p2, z));
  return [...front, ...right, ...back, ...left, ...bottom];
};
const resolution = 1e3;
let defaultWindowOptions = { windowSize: 50, windowSpacing: 200, windowHeight: 100 };
let bounceOptions = { materialReflectivity: 0.5, maxBounces: 6 };
let windowWidth = 0.2;
let windowHeight = 0.2;
let polygonInJS = [
  [resolution * 0.1, resolution * 0.1],
  [resolution * 0.1, resolution * 0.9],
  [resolution * 0.9, resolution * 0.9],
  [resolution * 0.9, resolution * 0.1],
  [resolution * 0.1, resolution * 0.1]
];
let wallsInJs = [
  ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
  ...inwardsBoxFromAABBWithwindow([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400], windowWidth, windowHeight)
];
document.getElementById("windowSize").addEventListener("input", (e) => {
  const v = e.target.value;
  windowWidth = parseFloat(v);
  wallsInJs = [
    ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400], windowWidth, windowHeight)
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("windowHeight").addEventListener("input", (e) => {
  const v = e.target.value;
  windowHeight = parseFloat(v);
  wallsInJs = [
    ...boxFromAABBWithHoleInTheTop([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400]),
    ...inwardsBoxFromAABBWithwindow([resolution * 0.1, resolution * 0.1, 0], [resolution * 0.9, resolution * 0.9, 400], windowWidth, windowHeight)
  ];
  updateImage(polygonInJS, wallsInJs, bounceOptions);
});
document.getElementById("reflectivityInput").addEventListener("input", (e) => {
  const v = e.target.value;
  bounceOptions = { ...bounceOptions, materialReflectivity: parseFloat(v) };
  updateImage(polygonInJS, defaultWindowOptions, bounceOptions);
});
document.getElementById("maxBouncesInput").addEventListener("input", (e) => {
  const v = e.target.value;
  bounceOptions = { ...bounceOptions, maxBounces: parseInt(v) };
  updateImage(polygonInJS, defaultWindowOptions, bounceOptions);
});
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
const updateImage = (polygonInJS2, windowOptions, bounceOptions2) => {
  generateWindowsAlongWall(polygonInJS2, windowOptions);
  rayTrace(polygonInJS2, wallsInJs, bounceOptions2);
};
window.updateCoordinate = updateCoordinate;
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;
const main = async () => {
  await init(htmlCanvas, resolution);
  generateWindowsAlongWall(polygonInJS, defaultWindowOptions);
  rayTrace(polygonInJS, wallsInJs, bounceOptions);
};
main();

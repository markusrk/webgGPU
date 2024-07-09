import { rayTrace, init } from "https://markusrk.github.io/webgGPU/dist/v1/tracer.mjs";
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
const updateImage = (polygonInJS2, windowOptions) => {
  const windowsInJS = generateWindowsAlongWall(polygonInJS2, windowOptions);
  rayTrace(polygonInJS2, windowsInJS);
};
window.updateCoordinate = updateCoordinate;
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;
const main = async () => {
  await init(htmlCanvas, resolution);
  const windowsInJS = generateWindowsAlongWall(polygonInJS, defaultWindowOptions);
  rayTrace(polygonInJS, windowsInJS);
};
main();

(function(tracer_mjs2) {
  "use strict";
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
  let canvas = null;
  self.onmessage = async (event) => {
    if (event.data.type === "init") {
      canvas = event.data.canvas;
      canvas.width = 1e3;
      canvas.height = 1e3;
      await tracer_mjs2.init(canvas);
    } else {
      const windowOptions = {
        windowSize: 50,
        windowSpacing: 200,
        windowHeight: 100
      };
      const windowsInJS = generateWindowsAlongWall(event.data.polygon, windowOptions);
      tracer_mjs2.rayTrace(event.data.polygon, windowsInJS);
    }
  };
})(tracer_mjs);

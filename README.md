Simple daylight raytracer library.
To use it import `https://markusrk.github.io/webgGPU/dist/v1/tracer.mjs`

Example:

```JS
import { rayTrace, init } from "https://markusrk.github.io/webgGPU/dist/v1/tracer.mjs";

// Grid resolution of result. For now it is forced to be a square of (resolution x resolution). More than 1000px tends to give performance issues.
const resolution = 1e3;

// Format: [[x,y,z],[x,y,z]] first array is bottom-left corner of window, second array is top-right corner. "winding order" matters. Only the right hand side lets light through currently. 
const windowsInJS = [
    [resolution * 0.1, resolution * 0.1, 0],
    [resolution * 0.1, resolution * 0.2, 50],
];

// Closed polygon of the area you want analysis for. format: [[x,y],[x,y]]
const closedPolygon = [
    [resolution * 0.1, resolution * 0.1],
    [resolution * 0.1, resolution * 0.9],
    [resolution * 0.9, resolution * 0.9],
    [resolution * 0.9, resolution * 0.1],
    [resolution * 0.1, resolution * 0.1]
  ]

// The library draws directly to the canvas. I suggest using two canvas'es in your app. This one on the botton and your own canvas with all your drawing logic on the top. Just set transparency wherever you want the analysis results to show.
const htmlCanvas = document.getElementById("result_canvas");
htmlCanvas.width = resolution;
htmlCanvas.height = resolution;

const main = async () => {
  await init(htmlCanvas, resolution);
  rayTrace(closedPolygon, windowsInJS);
};
main();
```

## Major tasks
* Add support for surrounding buildings
  * Import and cull triangles
  * Create BVH logic
  * More performant intersection logic 
  * Test if precompute of surroundings are reasonable
* Bounce rays
  * Do research on material properties
  * Refraction/Reflection code
  * Performance testing 
* Validating results - nothing done here yet. This is just a proof of concept


## Minor tasks
* Change input interface to use triangle for wall instead of rectangles for windows. 

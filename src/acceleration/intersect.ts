import * as ti from "taichi.js";
import { rayIntersectsTriangle } from "../intersect";


export const intersectRayWithAcceleratedGeometry = ti.func((ray, origin, bins, binsLength, vertices, indices, indicesindices)=>{
    let selectedSplitIndex = 0;
    for (let i of ti.range(binsLength)) {
      if (origin[0] >= bins[i].xMin && origin[0] < bins[i].xMax && origin[1] >= bins[i].yMin && origin[1] < bins[i].yMax) {
        selectedSplitIndex = i;
      }
    }

    const split = bins[selectedSplitIndex];
    let isHit = false
    let intersectionPoint = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector
    let t = ti.f32(1000000000)
    let triangleNormal = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector
    for (let m of ti.range(split.iEnd - split.iStart)) {
      let m2 = m + split.iStart;
      const indicesForTriangle = indices[indicesindices[m2]];
      const v1 = vertices[indicesForTriangle[0]];
      const v2 = vertices[indicesForTriangle[1]];
      const v3 = vertices[indicesForTriangle[2]];
      const res = rayIntersectsTriangle([origin[0], origin[1], origin[2]], ray, v1, v2, v3);
      if (res.intersects && res.t < t && res.t > 0.00001) {
        isHit = true
        intersectionPoint = res.intersectionPoint
        t = res.t
        triangleNormal = res.triangleNormal
      }
    }
  return {isHit, intersectionPoint, triangleNormal, t ,reflectivity: ti.f32(0)}
})
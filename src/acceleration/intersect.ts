import * as ti from "taichi.js";
import { intersectRayWithBin, rayIntersectsTriangle } from "../intersect";


export const intersectRayWithAcceleratedGeometry = ti.func((ray, origin, bins, binsLength, vertices, indices, indicesindices)=>{
    
    let isHit = false
    let intersectionPoint = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector
    let t = ti.f32(1000000000)
    let triangleNormal = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector
    
    for (let i of ti.range(binsLength)) {
      if (intersectRayWithBin(origin, ray, bins[i])) {
        const bin = bins[i];
        for (let m of ti.range(bin.iEnd - bin.iStart)) {
          let m2 = m + bin.iStart;
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
      
      
      }
    }
    return {isHit, intersectionPoint, triangleNormal, t ,reflectivity: ti.f32(0)}
})